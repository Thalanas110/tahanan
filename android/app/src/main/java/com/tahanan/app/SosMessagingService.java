package com.tahanan.app;

import android.util.Log;
import androidx.annotation.NonNull;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class SosMessagingService extends FirebaseMessagingService {

    private static final String TAG = "SosMessagingService";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Log.d(TAG, "From: " + remoteMessage.getFrom());

        // Check if message contains a data payload.
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());
            
            Map<String, String> data = remoteMessage.getData();
            String type = data.get("type");
            
            // If the data payload indicates an SOS, trigger the alarm directly
            if ("sos".equals(type)) {
                Log.d(TAG, "SOS Triggered from background data message!");
                
                // We create a dummy PluginCall or just extract the logic to a static method
                // Let's use the static method we will add to EmergencyAlarmPlugin
                EmergencyAlarmPlugin.triggerAlarmNatively(getApplicationContext());
            }
        }
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "Refreshed token: " + token);
        // Capacitor Push Notifications plugin also handles this, but we can log it
    }
}
