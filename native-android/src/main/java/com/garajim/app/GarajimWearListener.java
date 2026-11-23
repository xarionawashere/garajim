package com.garajim.app;

import android.content.Intent;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.WearableListenerService;
import java.nio.charset.StandardCharsets;

/** Saatten gelen start/pause/stop/next/prev komutları. */
public class GarajimWearListener extends WearableListenerService {
    @Override
    public void onMessageReceived(MessageEvent event) {
        if (event == null || event.getPath() == null) return;
        if (!GarajimWearSync.PATH_CMD.equals(event.getPath())) return;
        String cmd = new String(event.getData() == null ? new byte[0] : event.getData(), StandardCharsets.UTF_8).trim();
        if (cmd.isEmpty()) return;
        // Widget ile aynı kanal: MainActivity pendingAction
        MainActivity.pendingAction = mapCmd(cmd);
        MainActivity.pendingVehicle = null;
        try {
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            i.putExtra(GarajimWidgetProvider.EXTRA_ACTION, MainActivity.pendingAction);
            startActivity(i);
        } catch (Exception ignored) { }
    }

    private static String mapCmd(String cmd) {
        switch (cmd.toLowerCase()) {
            case "start":
            case "toggle": return "ride_toggle";
            case "pause": return "ride_pause";
            case "stop":
            case "finish": return "ride_stop";
            case "next": return "music_next";
            case "prev": return "music_prev";
            case "playpause": return "music_playpause";
            default: return cmd;
        }
    }
}
