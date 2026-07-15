import { registerPlugin } from '@capacitor/core';

export interface EmergencyAlarmPlugin {
  /**
   * Wakes up the screen, bypasses the lock screen, and plays a loud alarm
   * that interrupts Do Not Disturb.
   */
  startAlarm(): Promise<void>;

  /**
   * Stops the alarm and restores original volume and screen settings.
   */
  stopAlarm(): Promise<void>;
}

const EmergencyAlarm = registerPlugin<EmergencyAlarmPlugin>('EmergencyAlarm');
export default EmergencyAlarm;
