package com.tahanan.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class SosMessagingService extends FirebaseMessagingService {

    private static final String TAG = "SosMessagingService";
    private static final int SOS_NOTIFICATION_ID = 911;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Log.d(TAG, "From: " + remoteMessage.getFrom());
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);

        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());

            Map<String, String> data = remoteMessage.getData();
            String type = data.get("type");

            if ("sos".equals(type)) {
                Log.d(TAG, "SOS Triggered from background data message!");
                showSosNotification(data);
                EmergencyAlarmPlugin.triggerAlarmNatively(getApplicationContext());
            }
        }
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "Refreshed token: " + token);
        PushNotificationsPlugin.onNewToken(token);
    }

    private void showSosNotification(Map<String, String> data) {
        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        if (notificationManager == null) {
            return;
        }

        ensureSosChannel(notificationManager);

        String notificationId = data.getOrDefault("emergencyId", "sos-alert");
        Intent tapIntent = new Intent(this, MainActivity.class);
        tapIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        tapIntent.putExtra("google.message_id", notificationId);
        for (Map.Entry<String, String> entry : data.entrySet()) {
            tapIntent.putExtra(entry.getKey(), entry.getValue());
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                notificationId.hashCode(),
                tapIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String title = data.getOrDefault("title", getString(R.string.sos_notification_title));
        String body = data.getOrDefault("body", getString(R.string.sos_notification_body));

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, EmergencyAlarmPlugin.SOS_NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent);

        notificationManager.notify(SOS_NOTIFICATION_ID, builder.build());
    }

    private void ensureSosChannel(NotificationManager notificationManager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
                EmergencyAlarmPlugin.SOS_NOTIFICATION_CHANNEL_ID,
                getString(R.string.sos_notification_channel_name),
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(getString(R.string.sos_notification_channel_description));
        channel.enableLights(true);
        channel.enableVibration(true);
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        notificationManager.createNotificationChannel(channel);
    }
}
