import { App } from 'homey';
import { Settings, SettingsDefault } from './lib/Settings';
import { HandleHttpError, ValidateUrl } from './lib/Helper';
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
		this.initializeFritzbox( 5000 );
	}

	async onUninit()
	{
		this.homey.log( 'stop Fritzbox Bridge' );

		this.fritzbox.StopPolling();

		if( this.validation )
		{
			this.homey.clearInterval( this.validation );
			this.validation = undefined;
		}
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

	private isLoginValid(): boolean
	{
		return this.homey.settings.get( Settings.VALIDATION ) === LoginValidation.Valid;
	}

	private setValidation( state: LoginValidation )
	{
		this.homey.settings.set( Settings.VALIDATION, state );
	}

	private isPollingEnabled(): boolean
	{
		return ( this.homey.settings.get( Settings.POLL_ACTIVE ) || SettingsDefault.POLL_ACTIVE ) == true;
	}

	private initializeFritzbox( delay: number | null = null )
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
		if( delay !== null )
		{
			this.validation = this.homey.setTimeout( this.ValidateLogin.bind( this ), delay );
		}
		else
		{
			this.StartLoginValidation();
		}
	}

	private StartLoginValidation()
	{
		// reset running timout
		if( this.validation )
		{
			this.homey.clearTimeout( this.validation );
		}

		// delay validation
		this.validation = this.homey.setTimeout( this.ValidateLogin.bind( this ), 100 );
	}

	private async ValidateLogin()
	{
		this.validation = undefined;

		try
		{
			await this.fritzbox.GetApi().getDeviceList();
			this.setValidation( LoginValidation.Valid );
			console.debug( 'validate login: success' );

			await this.updatePolling();
		} catch( error: any )
		{
			console.debug( `login failed` );
			const Info: string = HandleHttpError( error ) || 'Message.ErrorLogin';
			this.homey.error( Info );
			this.homey.settings.set( Settings.VALIDATION_INFO, Info );
			this.setValidation( LoginValidation.Invalid );
		}

		this.validation = undefined;
	}
}

module.exports = FritzboxBridge;
