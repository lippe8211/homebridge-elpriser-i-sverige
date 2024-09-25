import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { ExamplePlatformAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class ExampleHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }
  
  discoverDevices() {
    // Here you can define your virtual accessories or find devices dynamically
    const devices = [
      {
        uniqueId: 'elpris-motion-sensor-1',
        name: 'Elpris motion sensor',
        type: this.Service.MotionSensor,
      },
      {
        uniqueId: 'elpris-lampa-1',
        name: 'Elpris Lampa',
        type: this.Service.Lightbulb,
      }
    ];

    // Loop over the discovered devices and register them if they have not been registered yet
    for (const device of devices) {
          // Generate a unique identifier for the accessory
      const uuid = this.api.hap.uuid.generate('example-platform-' + device.uniqueId);

      // Check if the accessory already exists in the Homebridge cache
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // The accessory already exists, so restore and update it
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        
        // Update accessory information if necessary
        existingAccessory.context.device = device;
        
        // Create the accessory instance and configure it
        new ExamplePlatformAccessory(this, existingAccessory);
        
        // Optionally, update existingAccessory's service characteristics if needed
        // For example:
        // const service = existingAccessory.getService(this.Service.Lightbulb);
        // service?.updateCharacteristic(this.Characteristic.On, false); // Reset or update characteristics if needed

        // No need to register the accessory again, as it is already cached

      } else {
        // The accessory does not exist, so create a new one
        this.log.info('Adding new accessory:', device.name);

        // Create a new accessory with the unique UUID
        const accessory = new this.api.platformAccessory(device.name, uuid);

        // Store device information in the accessory context
        accessory.context.device = device;

        // Create the accessory instance and configure it
        new ExamplePlatformAccessory(this, accessory);

        // Register the newly created accessory
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
