package com.tahanan.app;

import android.app.Activity;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.view.WindowManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "EmergencyAlarm")
public class EmergencyAlarmPlugin extends Plugin {

    static final String SOS_NOTIFICATION_CHANNEL_ID = "sos_alerts";
    private static final EmergencyAlarmState<ManagedMediaPlayer> alarmState = new EmergencyAlarmState<>();

    public static synchronized void triggerAlarmNatively(Context context) {
        try {
            Context appContext = context.getApplicationContext();
            AudioManager audioManager = (AudioManager) appContext.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager == null) {
                return;
            }

            alarmState.rememberOriginalVolume(audioManager.getStreamVolume(AudioManager.STREAM_ALARM));
            int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0);

            Uri alert = EmergencyAlarmSound.buildUri(appContext);
            MediaPlayer player = new MediaPlayer();
            try {
                player.setDataSource(appContext, alert);
                player.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build());
                player.setLooping(true);
                player.prepare();
                player.start();
                alarmState.replacePlayer(new ManagedMediaPlayer(player));
            } catch (Exception innerException) {
                player.release();
                throw innerException;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static synchronized void stopAlarmNatively(Context context) {
        alarmState.stopAndClearPlayer();

        AudioManager audioManager = (AudioManager) context.getApplicationContext().getSystemService(Context.AUDIO_SERVICE);
        int originalVolume = alarmState.consumeOriginalVolume();
        if (audioManager != null && originalVolume != -1) {
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, originalVolume, 0);
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
            triggerAlarmNatively(getContext());
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
            stopAlarmNatively(getContext());
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop alarm");
        }
    }

    private static final class ManagedMediaPlayer implements EmergencyAlarmState.ManagedAlarmPlayer {
        private final MediaPlayer mediaPlayer;

        private ManagedMediaPlayer(MediaPlayer mediaPlayer) {
            this.mediaPlayer = mediaPlayer;
        }

        @Override
        public boolean isPlaying() {
            try {
                return mediaPlayer.isPlaying();
            } catch (IllegalStateException ignored) {
                return false;
            }
        }

        @Override
        public void stop() {
            try {
                mediaPlayer.stop();
            } catch (IllegalStateException ignored) {
                // The player may already be stopped if Android reclaimed it.
            }
        }

        @Override
        public void release() {
            mediaPlayer.release();
        }
    }
}
