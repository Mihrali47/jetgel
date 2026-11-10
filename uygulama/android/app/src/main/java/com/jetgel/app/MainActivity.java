package com.jetgel.app;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * Jetgel ana ekranı. Siteyi (GitHub Pages) içeriden açar.
 * JetgelNative eklentisi: ahize/hoparlör, arka planda canlı kalma, GPS, bildirimler.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(JetgelNativePlugin.class);
        super.onCreate(savedInstanceState);
        Bildirim.kanallariOlustur(this);
        // Uygulama arka plandayken de sayfanın önemli sayılması (sistem öldürmesin)
        try {
            WebView wv = getBridge().getWebView();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                wv.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
            }
        } catch (Exception ignored) {}
    }

    @Override
    public void onPause() {
        super.onPause();
        // Ekran kapansa da sayfa (sipariş, teklif, arama dinleme) çalışmaya devam etsin
        try {
            WebView wv = getBridge().getWebView();
            wv.onResume();
            wv.resumeTimers();
        } catch (Exception ignored) {}
    }
}
