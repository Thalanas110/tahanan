package com.tahanan.app;

import android.content.Context;
import android.net.Uri;

final class EmergencyAlarmSound {

    static final String RESOURCE_NAME = "military_alarm_sound_fx_copyright_free";

    private EmergencyAlarmSound() {}

    static Uri buildUri(Context context) {
        return Uri.parse(buildRawResourceUri(context.getPackageName(), RESOURCE_NAME));
    }

    static String buildRawResourceUri(String packageName, String resourceName) {
        return "android.resource://" + packageName + "/raw/" + resourceName;
    }
}
