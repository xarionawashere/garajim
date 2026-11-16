package com.garajim.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** Widget düğmesinden gelen, henüz uygulamaya (JS) iletilmemiş eylem. */
    static volatile String pendingAction = null;
    static volatile String pendingVehicle = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        capture(getIntent());
        attachNativeBridge();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        capture(intent);
        notifyJs();            // uygulama zaten açıksa hemen ilet
    }

    @Override
    public void onResume() {
        super.onResume();
        attachNativeBridge();
    }

    private void capture(Intent i) {
        if (i == null) return;
        String a = i.getStringExtra(GarajimWidgetProvider.EXTRA_ACTION);
        if (a == null) return;
        String vid = i.getStringExtra(GarajimWidgetProvider.EXTRA_VEHICLE);
        i.removeExtra(GarajimWidgetProvider.EXTRA_ACTION);     // yeniden oluşturmada tekrar tetiklenmesin
        i.removeExtra(GarajimWidgetProvider.EXTRA_VEHICLE);
        switch (a) {
            case "fuel": case "km": case "service": case "ride": case "park": case "alerts": case "open":
                pendingAction = a;
                pendingVehicle = vid;
                break;
            default: break;
        }
    }

    private void notifyJs() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(() -> {
                    try { getBridge().getWebView().evaluateJavascript("window.garajimCheckAction&&window.garajimCheckAction()", null); }
                    catch (Exception ignored) { }
                });
            }
        } catch (Exception ignored) { }
    }

    private void attachNativeBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new GarajimNativeBridge(this), "GarajimNative");
            }
        } catch (Exception ignored) { }
    }
}
