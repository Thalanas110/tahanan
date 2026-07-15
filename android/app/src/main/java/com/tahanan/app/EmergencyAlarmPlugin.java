package com.tahanan.app;

import android.app.Activity;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "EmergencyAlarm")
public class EmergencyAlarmPlugin extends Plugin {

    private MediaPlayer mediaPlayer;
    private int originalVolume = -1;

    public static void triggerAlarmNatively(Context context) {
        try {
            AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);

            int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0);

            android.net.Uri alert = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM);
            if (alert == null) {
                alert = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_RINGTONE);
            }
            MediaPlayer player = new MediaPlayer();
            player.setDataSource(context, alert);
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @PluginMethod
    public void startAlarm(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                // Wake up screen and show on lock screen
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                    activity.setShowWhenLocked(true);
                    activity.setTurnScreenOn(true);
                }
                activity.getWindow().addFlags(
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                );
            });
        }

        // Play alarm
        try {
            Context context = getContext();
            AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);

            // Maximize alarm volume
            if (originalVolume == -1) {
                originalVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
            }
            
            triggerAlarmNatively(context);

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start alarm", e);
        }
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                    activity.setShowWhenLocked(false);
                    activity.setTurnScreenOn(false);
                }
                activity.getWindow().clearFlags(
                        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                        WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                        WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                );
            });
        }

        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
                mediaPlayer = null;
            }

            // Restore volume
            if (originalVolume != -1) {
                Context context = getContext();
                AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, originalVolume, 0);
                originalVolume = -1;
            }

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop alarm");
        }
    }
}
