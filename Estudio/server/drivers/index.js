import { MockDriver } from './mock.js';
import { Gphoto2Driver } from './gphoto2.js';
import { SonyWifiDriver } from './sony-wifi.js';
import { DjiOsmoDriver } from './dji-osmo.js';

export const DRIVERS = {
  mock: MockDriver,
  gphoto2: Gphoto2Driver,
  'sony-usb': Gphoto2Driver,
  'sony-wifi': SonyWifiDriver,
  'dji-osmo': DjiOsmoDriver,
};

export function createDriver(config) {
  const Driver = DRIVERS[config.driver];
  if (!Driver) throw new Error(`Driver desconocido: ${config.driver} (usa: ${Object.keys(DRIVERS).join(', ')})`);
  return new Driver(config);
}
