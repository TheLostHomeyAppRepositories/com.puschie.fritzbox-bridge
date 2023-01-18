"use strict";

let Helper = null;
const ButtonLoadingClass = 'is-loading';

class SettingHelper
{
	#homey;
	#saveButton;
	#loginInfo;
	#debugButton;

	constructor( homey, saveId, infoId, debugId )
	{
		this.#homey = homey;
		this.#saveButton = document.getElementById( saveId );
		this.#loginInfo = document.getElementById( infoId );
		this.#debugButton = document.getElementById( debugId );
	}

	Configure( settingConfigs )
	{
		this.#InitInfo();
		this.#InitSettings( settingConfigs );
		this.#InitDebug();
	}

	#InitDebug()
	{
		// TODO: implement with sent to sentry
		/*this.#debugButton.addEventListener( 'click', function()
		{
			this.#homey.api( 'GET', '/devices', {}, function( err, result )
			{
				this.#homey.alert( )
				if( err )
				{

					this.#homey.alert( err );
				}
				else
				{
					this.#homey.alert( result );
				}
			}.bind( this ) )
		}.bind( this ) );*/
	}

	#InitInfo()
	{
		// init login status
		this.#homey.get( 'validation', function( err, value )
		{
			if( !(err || Number.parseInt( value ) !== 1) )
			{
				this.#SetLocalizedInfo( 'Message.ValidLogin' );
			}
		}.bind( this ) );
	}

	#InitSettings( settingConfigs )
	{
		// load setting values
		for( const settingConfig of settingConfigs )
		{
			this.#Load( settingConfig.id, settingConfig.type, settingConfig.default );
		}

		// register save
		this.#saveButton.addEventListener( 'click', function()
		{
			this.#DisableSave();

			for( const settingConfig of settingConfigs )
			{
				this.#Save( settingConfig.id, settingConfig.type );
			}
		}.bind( this ) );

		// callback for settings
		this.#homey.on( 'settings.set', function( name )
		{
			if( name !== 'validation' )
			{
				// no validation for bridge settings
				if( [
					'showunconnected',
					'pollinginterval',
					'pollingactive',
					'statuspollinginterval',
					'statuspollingactive'
				].includes( name ) )
				{
					this.#ResetSave();
				}
				return;
			}
			this.#Validate();
		}.bind( this ) );
	}

	#DisableSave()
	{
		this.#saveButton.disabled = true;
		this.#saveButton.classList.add( ButtonLoadingClass );
	}

	#ResetSave()
	{
		this.#saveButton.disabled = false;
		this.#saveButton.classList.remove( ButtonLoadingClass );
	}

	#SetInfo( info )
	{
		this.#loginInfo.innerText = info;
	}

	#SetLocalizedInfo( key )
	{
		this.#loginInfo.innerText = this.#homey.__( key );
	}

	#Load( id, type, defaultValue )
	{
		this.#homey.get( id, function( err, value )
		{
			if( err ) return this.#homey.alert( err );
			const Target = document.getElementById( id );
			if( ( value === null || value === undefined ) && defaultValue !== undefined )
			{
				value = defaultValue;
			}
			if( type === 'checkbox' )
			{
				Target.checked = Boolean( value );
			}
			else
			{
				Target.value = value;
			}
		}.bind( this ) );
	}

	#Save( id, type )
	{
		const Target = document.getElementById( id );
		const Value = ( type === 'checkbox' ) ? Target.checked : Target.value;
		this.#homey.get( id, function( err, value )
		{
			if( err ) return this.#homey.alert( err );
			if( value === Value ) return;
			this.#homey.set( id, Value, function( err )
			{
				if( err ) return this.#homey.alert( err );
			}.bind( this ) );
		}.bind( this ) );
	}

	#Validate()
	{
		this.#homey.get( 'validation', function( err, value )
		{
			if( err )
			{
				// loop end
				this.#ResetSave();
				this.#SetLocalizedInfo( 'Message.ErrorLogin' );
				console.log( 'error: ' + err );
				return;
			}

			const Value = Number.parseInt( value );

			// check for wait state -> back to begin
			if( Value === 2 )
			{
				// add delay to save performance
				setTimeout( this.#Validate.bind( this ), 500 );
				return;
			}

			// make sure we re-enable button
			this.#ResetSave();

			// show result to user
			if( Value === 1 )
			{
				this.#SetLocalizedInfo( 'Message.ValidLogin' );
			}
			else
			{
				this.#homey.get( 'validationInfo', function( err, value )
				{
					console.log( 'validation info: ' + value );
					if( err )
					{
						console.log( 'error: ' + err );
						this.#SetLocalizedInfo( 'Message.InvalidLogin' );
					}
					else
					{
						this.#SetInfo( value );
					}
				}.bind( this ) );
			}
		}.bind( this ) );
	}

	static AutoConfig( Homey, SaveId, StatusId, DebugId, ValueIDArray )
	{
		Helper = new SettingHelper( Homey, SaveId, StatusId, DebugId );

		Helper.Configure( ValueIDArray );
	};
}
