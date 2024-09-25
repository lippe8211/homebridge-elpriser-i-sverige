import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';

import type { ExampleHomebridgePlatform } from './platform.js';

import axios from 'axios';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ExamplePlatformAccessory {
  private elprisMotionSensorService: Service;
  private elprisLampaService: Service;

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
        // your accessory must have an AccessoryInformation service
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, "Salenius Code AB")
      .setCharacteristic(this.platform.Characteristic.Model, "Homebridge Elpris Sverige");
    
    this.elprisMotionSensorService = this.accessory.getService(this.platform.Service.MotionSensor)
    || this.accessory.addService(this.platform.Service.MotionSensor, 'Elpris switch', 'elpris-motion-sensor-1');
    this.elprisMotionSensorService.setCharacteristic(this.platform.Characteristic.Name, "Elpris sensor");

    this.elprisLampaService = this.accessory.getService(this.platform.Service.Lightbulb)
      || this.accessory.addService(this.platform.Service.Lightbulb, 'ElprisLampa', 'elpris-lampa-1');
    this.elprisMotionSensorService.setCharacteristic(this.platform.Characteristic.Name, "Elpris lampa");
    
    setInterval(() => {
      this.fetchAndCheckElectricityPrice().then(result => {
        this.elprisMotionSensorService.updateCharacteristic(this.platform.Characteristic.MotionDetected, result.isCheap);
        this.platform.log.debug('Prisvärd el: ', result.isCheap);
        this.platform.log.debug('Pris per timme: ', result.currentPrice);
        this.elprisMotionSensorService.updateCharacteristic(this.platform.Characteristic.MotionDetected, false);

        this.elprisLampaService.updateCharacteristic(this.platform.Characteristic.On, result.isCheap);
        this.elprisLampaService.updateCharacteristic(this.platform.Characteristic.Brightness, result.currentPrice * 100);
      }).catch(error => {
        console.error('Failed to fetch or check prices:', error);
      });
    }, this.platform.config.updateInterval * 1000 ); // 10 min
  }

  /**
   * REQUIRED - This must return an array of the services you want to expose.
   * This method must be named "getServices".
   */
  getServices() {
    return [
      this.elprisLampaService,
      this.elprisMotionSensorService,
    ];
  }

  async fetchAndCheckElectricityPrice() {
    // Get the current date
    const currentDate = new Date();
    
    // Extract year, month, and day
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(currentDate.getDate()).padStart(2, '0');
    
    // Construct the dynamic URL
    const url = `https://www.elprisetjustnu.se/api/v1/prices/${year}/${month}-${day}_${this.platform.config.elOmrade}.json`;

    try {
      // Make the network request using axios
      const response = await axios.get(url);
      const prices = response.data;
      
      // Get the current time
      const now = new Date();
      
      // Find the price data that matches the current time interval
      const currentPriceObject = prices.find((price: { time_start: string | number | Date; time_end: string | number | Date; }) => {
        const startTime = new Date(price.time_start);
        const endTime = new Date(price.time_end);
        return now >= startTime && now < endTime;
      });
      
      // Check if a matching time interval was found
      if (currentPriceObject) {
        const currentSEKPerKWh = currentPriceObject.SEK_per_kWh;
        const prisGrans = (this.platform.config.prisGrans / 100).toFixed(2);
        const isCheap = currentSEKPerKWh < prisGrans;
  
        // Log the result
        console.log(`[INFO] Config Prisgräns: ${this.platform.config.prisGrans} SEK/kWh`);
        console.log(`[INFO] Prisgräns: ${prisGrans} SEK/kWh`);
        console.log(`[INFO] Aktuellt pris: ${currentSEKPerKWh} SEK/kWh`);
        console.log(`[INFO] Prisvärd: ${isCheap}`);
        
        // Return the result
        return {
          isCheap,
          currentPrice: currentSEKPerKWh
        };
      } else {
        console.error('No price data available for the current time.');
        return {
          isCheap: false,
          currentPrice: null
        };
      }
    } catch (error) {
      console.error('Error fetching electricity prices:', error);
      throw error;
    }
  }
}
