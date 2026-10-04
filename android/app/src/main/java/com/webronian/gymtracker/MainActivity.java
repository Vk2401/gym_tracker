package com.webronian.gymtracker;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hardenWebView();
    }

    /**
     * Device-independence (see .claude/skills/device-independence):
     * - textZoom 100: the system font size is not applied by the WebView; the web app reads it
     *   through @capacitor/text-zoom and applies its own clamped scale (0.85–1.35).
     * - no algorithmic darkening / force dark: the app owns its light and dark themes, so
     *   OEM "dark mode for apps" must not invert our colours.
     */
    private void hardenWebView() {
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            webView.setForceDarkAllowed(false);
        }
    }
}
