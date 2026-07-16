import { useEffect } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const SOS_NOTIFICATION_CHANNEL = {
  id: 'sos_alerts',
  name: 'SOS Alerts',
  description: 'Urgent emergency alerts from your active Tahanan space.',
  importance: 5 as const,
  visibility: 1 as const,
  vibration: true,
};

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;
    const isAndroid = Capacitor.getPlatform() === 'android';

    const listeners: PluginListenerHandle[] = [];

    const registerPush = async () => {
      listeners.push(
        await PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token: ' + token.value);
          const { error } = await supabase
            .from('profiles')
            .update({ fcm_token: token.value })
            .eq('id', user.id);

          if (error) {
            console.error('Failed to save FCM token to Supabase:', error);
          }
        }),
      );

      listeners.push(
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on push registration: ' + JSON.stringify(error));
        }),
      );

      listeners.push(
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
        }),
      );

      listeners.push(
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed:', notification);
        }),
      );

      if (isAndroid) {
        await PushNotifications.createChannel(SOS_NOTIFICATION_CHANNEL);
      }

      // Check if we have permission
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('User denied push notification permissions');
        return;
      }

      // Register with Apple / Google to receive push via APNS/FCM
      await PushNotifications.register();
    };

    registerPush().catch((error) => {
      console.error('Failed to initialize push notifications:', error);
    });

    return () => {
      void Promise.all(listeners.map((listener) => listener.remove()));
    };
  }, [user?.id]);
}
