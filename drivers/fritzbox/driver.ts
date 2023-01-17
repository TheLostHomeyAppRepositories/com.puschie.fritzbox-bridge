import { BaseDriver } from "../../lib/BaseDriver";

class Driver extends BaseDriver
{
	protected async GetDeviceList(): Promise<Array<ParingDevice>>
	{
		console.debug( 'request device list for: fritzbox' );

		const data = await this.fritzbox.GetApi().getFritzboxOverview();

		if( data.length === 0 )
		{
			return [];
		}

		return [
			{
				name: 'Fritzbox',
				data: {
					id: 'fritzbox'
				},
				store: {},
				settings: {}
			}
		];
	}

	public GetFunctionMask(): number
	{
		return -1;
	}
}

module.exports = Driver;
