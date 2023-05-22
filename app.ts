import { App } from 'homey';
import { Settings, SettingsDefault } from './lib/Settings';
import { Validate, ValidateUrl } from './lib/Helper';
import { LoginValidation } from './types/LoginValidation';
import { FritzboxManager } from './lib/FritzboxManager';

class FritzboxBridge extends App
{
	// @ts-ignore
	private fritzbox: FritzboxManager;
	private validation?: NodeJS.Timeout;

	async onInit()
	{
		this.homey.log( 'start Fritzbox Bridge' );
		this.homey.on( 'unload', this.onUninit );

		this.fritzbox = new FritzboxManager( this.homey );

		// settings hooks
		this.homey.settings.on( 'set', this.applySettings.bind( this ) );

		// configure api
		this.initializeFritzbox();
	}

	async onUninit()
	{
		this.homey.log( 'stop Fritzbox Bridge' );

		this.fritzbox.StopPolling();
		this.fritzbox.StopStatusPolling();
	}

	private async applySettings( name: string )
	{
		switch( name )
		{
			case Settings.USERNAME:
			case Settings.PASSWORD:
			case Settings.FRITZBOX_URL:
			case Settings.STRICT_SSL:
				this.initializeFritzbox();
				break;

			case Settings.POLL_ACTIVE:
			case Settings.POLL_INTERVAL:
				await this.updatePolling();
				break;

			case Settings.STATUS_ACTIVE:
			case Settings.STATUS_INTERVAL:
				await this.updateStatusPolling();
				break;
		}
	}

	private async updatePolling()
	{
		if( !this.isLoginValid() || !this.isPollingEnabled() )
		{
			this.fritzbox.StopPolling();
			return;
		}

		const interval = this.homey.settings.get( Settings.POLL_INTERVAL );
		await this.fritzbox.StartPolling( interval * 1000 );
	}

	private async updateStatusPolling()
	{
		if( !this.isLoginValid() || !this.isStatusPollingEnabled() )
		{
			this.fritzbox.StopStatusPolling();
			return;
		}

		const interval = this.homey.settings.get( Settings.STATUS_INTERVAL );
		await this.fritzbox.StartStatusPolling( interval * 1000 );
	}

	private isLoginValid(): boolean
	{
		return this.homey.settings.get( Settings.VALIDATION ) === LoginValidation.Valid;
	}

	private setValidation( state: LoginValidation )
	{
		this.homey.settings.set( Settings.VALIDATION, state );
	}

	private isErrorCode( error: any ): boolean
	{
		return Validate( error ) && Validate( error.error ) && Validate( error.error.code );
	}

	private isErrorResponse( error: any ): boolean
	{
		return Validate( error ) && Validate( error.response ) && Validate( error.response.statusCode );
	}

	private isErrorMessage( error: any ): boolean
	{
		return Validate( error ) && Validate( error.error ) && Validate( error.error.data ) && Validate( error.error.data.code );
	}

	private isPollingEnabled(): boolean
	{
		return ( this.homey.settings.get( Settings.POLL_ACTIVE ) || SettingsDefault.POLL_ACTIVE ) == true;
	}

	private isStatusPollingEnabled(): boolean
	{
		return ( this.homey.settings.get( Settings.STATUS_ACTIVE ) || SettingsDefault.STATUS_ACTIVE ) == true;
	}

	private initializeFritzbox()
	{
		this.setValidation( LoginValidation.Progress );

		const url = this.homey.settings.get( Settings.FRITZBOX_URL ) ?? SettingsDefault.FRITZBOX_URL;
		const username = this.homey.settings.get( Settings.USERNAME ) ?? SettingsDefault.USERNAME;
		const password = this.homey.settings.get( Settings.PASSWORD ) ?? SettingsDefault.PASSWORD;
		const strictSSL = this.homey.settings.get( Settings.STRICT_SSL ) ?? SettingsDefault.STRICT_SSL;

		// convert provided url / ip to valid url
		const validUrl = ValidateUrl( url );

		// use browser login to get sid
		this.fritzbox.Connect( username, password, validUrl, strictSSL );

		// (lazy) validate login
		this.StartLoginValidation();
	}

	private StartLoginValidation()
	{
		// reset running timout
		if( this.validation !== undefined )
		{
			this.homey.clearTimeout( this.validation );
		}

		// delay validation
		this.validation = this.homey.setTimeout( this.ValidateLogin.bind( this ), 100 );
	}

	private async ValidateLogin()
	{
		try
		{
			await this.fritzbox.GetApi().getDeviceList();
			this.setValidation( LoginValidation.Valid );
			console.debug( 'validate login: success' );

			await this.updatePolling();
			await this.updateStatusPolling();
		} catch( error: any )
		{
			console.debug( `login failed: ${ JSON.stringify( error ) }` );
			const Info: string = this.ParseError( error );
			this.homey.error( Info );
			this.homey.settings.set( Settings.VALIDATION_INFO, Info );
			this.setValidation( LoginValidation.Invalid );
		}

		this.validation = undefined;
	}

	private ParseError( error: any ): string
	{
		if( this.isErrorCode( error ) )
		{
			return this.CheckErrorCode( error.error.code );
		}
		else if( this.isErrorMessage( error ) )
		{
			return this.CheckErrorCode( error.error.data.code );
		}
		else if( this.isErrorResponse( error ) )
		{
			return this.CheckErrorResponse( error.response );
		}
		else if( error === '0000000000000000' )
		{
			return this.homey.__( 'Message.InvalidLogin' );
		}

		console.debug( 'unknown error: ' + JSON.stringify( error ) );
		return this.homey.__( 'Message.ErrorLogin' );
	}

	private CheckErrorCode( errorCode: string ): string
	{
		if( errorCode === 'ETIMEDOUT' )
		{
			return this.homey.__( 'Message.Timeout' );
		}
		else if( errorCode === 'ENOTFOUND' )
		{
			return this.homey.__( 'Message.NotFound' );
		}
		else if( errorCode === 'DEPTH_ZERO_SELF_SIGNED_CERT' )
		{
			return this.homey.__( 'Message.InvalidSSL' );
		}

		console.debug( 'unknown error code: ' + errorCode );
		return this.homey.__( 'Message.ErrorLogin' );
	}

	private CheckErrorResponse( errorResponse: any ): string
	{
		if( errorResponse.statusCode === 503 )
		{
			return this.homey.__( 'Message.ServerCrashed' );
		}

		console.debug( 'unknown error response: ' + JSON.stringify( errorResponse ) );
		return this.homey.__( 'Message.ErrorLogin' );
	}
}

module.exports = FritzboxBridge;
