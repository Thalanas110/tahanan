import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const registerPush = async () => {
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

    registerPush();

    // Listeners
    const registrationListener = PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      // Save token to Supabase profiles
      const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: token.value })
        .eq('id', user.id);
        
      if (error) {
        console.error('Failed to save FCM token to Supabase:', error);
      }
    });

    const errorListener = PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on push registration: ' + JSON.stringify(error));
    });

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
    };
  }, [user]);
}
