package com.tahanan.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Render edge-to-edge: the WebView draws behind the status bar and
        // navigation bar. Safe-area insets are then exposed to CSS via
        // env(safe-area-inset-top/bottom/left/right).
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        registerPlugin(EmergencyAlarmPlugin.class);
    }
}

