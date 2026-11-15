package com.garajim.app;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        attachNativeBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        attachNativeBridge();
    }

    private void attachNativeBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new GarajimNativeBridge(this), "GarajimNative");
            }
        } catch (Exception ignored) { }
    }
}
