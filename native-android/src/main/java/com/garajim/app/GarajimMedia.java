package com.garajim.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Base64;
import android.view.KeyEvent;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.util.List;

/** Çalan müziği (Spotify dahil) okur ve kontrol eder. API anahtarı / hesap bağlantısı gerekmez. */
public class GarajimMedia {
    static final String SPOTIFY = "com.spotify.music";

    static boolean hasAccess(Context c) {
        String flat = Settings.Secure.getString(c.getContentResolver(), "enabled_notification_listeners");
        return flat != null && flat.contains(c.getPackageName());
    }

    static MediaController active(Context c) {
        try {
            MediaSessionManager m = (MediaSessionManager) c.getSystemService(Context.MEDIA_SESSION_SERVICE);
            if (m == null) return null;
            List<MediaController> list = m.getActiveSessions(new ComponentName(c, GarajimMediaListener.class));
            MediaController spot = null, first = null;
            for (MediaController mc : list) {
                PlaybackState ps = mc.getPlaybackState();
                if (ps != null && ps.getState() == PlaybackState.STATE_PLAYING) return mc;   // çalan öncelikli
                if (first == null) first = mc;
                if (SPOTIFY.equals(mc.getPackageName())) spot = mc;
            }
            return spot != null ? spot : first;
        } catch (Exception e) {           // izin yoksa SecurityException
            return null;
        }
    }

    static String label(Context c, String pkg) {
        try {
            PackageManager pm = c.getPackageManager();
            return String.valueOf(pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)));
        } catch (Exception e) { return pkg; }
    }

    /** JSON: access, session, app, pkg, title, artist, album, playing, pos, dur, key */
    static String state(Context c) {
        JSONObject o = new JSONObject();
        try {
            boolean access = hasAccess(c);
            o.put("access", access);
            MediaController mc = access ? active(c) : null;
            o.put("session", mc != null);
            if (mc != null) {
                MediaMetadata md = mc.getMetadata();
                PlaybackState ps = mc.getPlaybackState();
                String title = md == null ? null : md.getString(MediaMetadata.METADATA_KEY_TITLE);
                String artist = md == null ? null : md.getString(MediaMetadata.METADATA_KEY_ARTIST);
                if (artist == null && md != null) artist = md.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST);
                boolean playing = ps != null && ps.getState() == PlaybackState.STATE_PLAYING;
                long pos = 0;
                if (ps != null) {
                    pos = ps.getPosition();
                    if (playing) pos += (long) ((SystemClock.elapsedRealtime() - ps.getLastPositionUpdateTime()) * ps.getPlaybackSpeed());
                }
                o.put("pkg", mc.getPackageName());
                o.put("app", label(c, mc.getPackageName()));
                o.put("title", title == null ? "" : title);
                o.put("artist", artist == null ? "" : artist);
                o.put("album", md == null || md.getString(MediaMetadata.METADATA_KEY_ALBUM) == null ? "" : md.getString(MediaMetadata.METADATA_KEY_ALBUM));
                o.put("playing", playing);
                o.put("pos", Math.max(0, pos));
                o.put("dur", md == null ? 0 : md.getLong(MediaMetadata.METADATA_KEY_DURATION));
                o.put("key", (title == null ? "" : title) + "|" + (artist == null ? "" : artist));
            }
        } catch (Exception ignored) { }
        return o.toString();
    }

    /** Albüm kapağı: 160 px JPEG, base64 ("" = yok) */
    static String art(Context c) {
        try {
            MediaController mc = active(c);
            if (mc == null || mc.getMetadata() == null) return "";
            Bitmap b = mc.getMetadata().getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART);
            if (b == null) b = mc.getMetadata().getBitmap(MediaMetadata.METADATA_KEY_ART);
            if (b == null) return "";
            int w = b.getWidth(), h = b.getHeight(), m = Math.max(w, h);
            if (m > 160) { float k = 160f / m; b = Bitmap.createScaledBitmap(b, Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), true); }
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            b.compress(Bitmap.CompressFormat.JPEG, 72, bo);
            return Base64.encodeToString(bo.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) { return ""; }
    }

    static void keyEvent(Context c, int code) {
        AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        if (am == null) return;
        am.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, code));
        am.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, code));
    }

    /** toggle | play | pause | next | prev — izin varsa doğrudan oturuma, yoksa medya tuşu olarak gönderir. */
    static void command(Context c, String cmd) {
        MediaController mc = hasAccess(c) ? active(c) : null;
        try {
            if (mc != null) {
                MediaController.TransportControls t = mc.getTransportControls();
                PlaybackState ps = mc.getPlaybackState();
                boolean playing = ps != null && ps.getState() == PlaybackState.STATE_PLAYING;
                switch (cmd) {
                    case "next": t.skipToNext(); return;
                    case "prev": t.skipToPrevious(); return;
                    case "play": t.play(); return;
                    case "pause": t.pause(); return;
                    default: if (playing) t.pause(); else t.play(); return;
                }
            }
        } catch (Exception ignored) { }
        switch (cmd) {
            case "next": keyEvent(c, KeyEvent.KEYCODE_MEDIA_NEXT); break;
            case "prev": keyEvent(c, KeyEvent.KEYCODE_MEDIA_PREVIOUS); break;
            case "play": keyEvent(c, KeyEvent.KEYCODE_MEDIA_PLAY); break;
            case "pause": keyEvent(c, KeyEvent.KEYCODE_MEDIA_PAUSE); break;
            default: keyEvent(c, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE);
        }
    }
}
