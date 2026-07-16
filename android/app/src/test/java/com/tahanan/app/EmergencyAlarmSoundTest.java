package com.tahanan.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class EmergencyAlarmSoundTest {

    @Test
    public void buildRawResourceUri_usesTheBundledRawAssetPath() {
        String uri = EmergencyAlarmSound.buildRawResourceUri(
                "com.tahanan.app",
                EmergencyAlarmSound.RESOURCE_NAME
        );

        assertEquals(
                "android.resource://com.tahanan.app/raw/military_alarm_sound_fx_copyright_free",
                uri
        );
    }
}
