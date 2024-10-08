export class Settings
{
	public static readonly USERNAME: string = 'username';
	public static readonly PASSWORD: string = 'password';
	public static readonly FRITZBOX_URL: string = 'fritzboxip';
	public static readonly STRICT_SSL: string = 'strictssl';
	public static readonly POLL_INTERVAL: string = 'pollinginterval';
	public static readonly POLL_ACTIVE: string = 'pollingactive';
	public static readonly VALIDATION: string = 'validation';
	public static readonly VALIDATION_INFO: string = 'validationInfo';
	public static readonly SHOW_UNCONNECTED: string = 'showunconnected';
	public static readonly ALLOW_MULTIPLE_REFERENCES: string = 'allowmultiple';

	public static readonly POLL_MAX: number = 86400; // in seconds
	public static readonly POLL_MIN: number = 1; // in seconds
}

export class SettingsDefault
{
	public static readonly USERNAME: string = '';
	public static readonly PASSWORD: string = '';
	public static readonly FRITZBOX_URL: string = 'fritz.box';
	public static readonly STRICT_SSL: boolean = false;
	public static readonly POLL_ACTIVE: boolean = true;
}
