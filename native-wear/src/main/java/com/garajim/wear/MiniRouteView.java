package com.garajim.wear;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;

import org.json.JSONArray;

import java.util.ArrayList;
import java.util.List;

/**
 * Hafif, çevrimdışı Wear OS rota önizlemesi.
 * Arka plan sokakları yalnızca görsel bağlamdır; rota gerçek telefon GPS noktalarından çizilir.
 */
public final class MiniRouteView extends View {
    private static final class GeoPoint {
        final double lat;
        final double lng;
        GeoPoint(double lat, double lng) { this.lat = lat; this.lng = lng; }
    }

    private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF rect = new RectF();
    private final Path path = new Path();
    private final Path clipPath = new Path();
    private final List<GeoPoint> points = new ArrayList<>();
    private boolean gpsReady;
    private boolean active;
    private boolean paused;
    private boolean navigation;
    private final float density;

    public MiniRouteView(Context context) { this(context, null); }
    public MiniRouteView(Context context, AttributeSet attrs) { this(context, attrs, 0); }
    public MiniRouteView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        density = getResources().getDisplayMetrics().density;
        setContentDescription("Garajım sürüş rotası mini haritası");
        setWillNotDraw(false);
    }

    public void setRouteJson(String json, boolean gpsReady, boolean active, boolean paused) {
        List<GeoPoint> parsed = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(json == null || json.trim().isEmpty() ? "[]" : json);
            for (int i = 0; i < arr.length() && i < 32; i++) {
                JSONArray p = arr.optJSONArray(i);
                if (p == null || p.length() < 2) continue;
                double lat = p.optDouble(0, Double.NaN);
                double lng = p.optDouble(1, Double.NaN);
                if (!Double.isFinite(lat) || !Double.isFinite(lng)) continue;
                if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
                parsed.add(new GeoPoint(lat, lng));
            }
        } catch (Exception ignored) { }
        points.clear();
        points.addAll(parsed);
        this.gpsReady = gpsReady;
        this.active = active;
        this.paused = paused;
        invalidate();
    }

    public void setNavigationActive(boolean navigation) {
        this.navigation = navigation;
        invalidate();
    }

    private float dp(float value) { return value * density; }

    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float w = getWidth(), h = getHeight();
        if (w <= 0 || h <= 0) return;
        rect.set(0, 0, w, h);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(Color.rgb(8, 18, 30));
        canvas.drawRoundRect(rect, dp(12), dp(12), paint);

        int save = canvas.save();
        clipPath.reset();
        clipPath.addRoundRect(rect, dp(12), dp(12), Path.Direction.CW);
        canvas.clipPath(clipPath);
        drawNeighborhood(canvas, w, h);
        if (points.size() >= 2) drawRoute(canvas, w, h);
        else if (points.size() == 1) drawSingleFix(canvas, w, h);
        else drawWaiting(canvas, w, h);
        canvas.restoreToCount(save);

        // İnce iç çerçeve, karta harita yüzeyi hissi verir.
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(dp(1));
        paint.setColor(0x334A657C);
        canvas.drawRoundRect(rect, dp(12), dp(12), paint);
    }

    private void drawNeighborhood(Canvas c, float w, float h) {
        // Subtle building blocks, fixed so they do not flicker or cost battery.
        paint.setStyle(Paint.Style.FILL);
        int[][] blocks = {
            {5, 7, 17, 19}, {22, 5, 33, 17}, {68, 6, 80, 18}, {84, 19, 96, 31},
            {4, 49, 16, 63}, {22, 65, 35, 78}, {63, 69, 76, 83}, {83, 53, 96, 66},
            {43, 4, 53, 12}, {48, 83, 60, 93}
        };
        for (int[] b : blocks) {
            rect.set(w * b[0] / 100f, h * b[1] / 100f, w * b[2] / 100f, h * b[3] / 100f);
            paint.setColor(0xFF111F2D);
            c.drawRoundRect(rect, dp(3), dp(3), paint);
            paint.setColor(0x26384D60);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(dp(0.6f));
            c.drawRoundRect(rect, dp(3), dp(3), paint);
            paint.setStyle(Paint.Style.FILL);
        }

        // Şematik yol ağı. Gerçek rota çizgisi bunun üzerinde GPS verisiyle çizilir.
        drawRoad(c, w, h, new float[]{-0.08f, .72f, .18f, .63f, .27f, .32f, .49f, .24f, .69f, .34f, .84f, .12f, 1.08f, .18f}, dp(8));
        drawRoad(c, w, h, new float[]{.08f, -.12f, .19f, .18f, .44f, .37f, .57f, .63f, .88f, .72f, 1.08f, .91f}, dp(6));
        drawRoad(c, w, h, new float[]{-.06f, .38f, .18f, .44f, .37f, .54f, .59f, .48f, .82f, .55f, 1.04f, .43f}, dp(4));
        drawRoad(c, w, h, new float[]{.39f, -.05f, .38f, .18f, .34f, .44f, .27f, .72f, .29f, 1.05f}, dp(4));
        drawRoad(c, w, h, new float[]{.75f, -.05f, .71f, .16f, .75f, .37f, .67f, .57f, .68f, .82f, .76f, 1.05f}, dp(4));
    }

    private void drawRoad(Canvas c, float w, float h, float[] p, float stroke) {
        path.reset();
        if (p.length < 4) return;
        path.moveTo(p[0] * w, p[1] * h);
        for (int i = 2; i + 1 < p.length; i += 2) path.lineTo(p[i] * w, p[i + 1] * h);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeCap(Paint.Cap.ROUND);
        paint.setStrokeJoin(Paint.Join.ROUND);
        paint.setStrokeWidth(stroke + dp(2));
        paint.setColor(0xFF0A1420);
        c.drawPath(path, paint);
        paint.setStrokeWidth(stroke);
        paint.setColor(0xFF263647);
        c.drawPath(path, paint);
        paint.setStrokeWidth(Math.max(dp(1), stroke * .18f));
        paint.setColor(0x55394E61);
        c.drawPath(path, paint);
        paint.setStyle(Paint.Style.FILL);
    }

    private void drawRoute(Canvas c, float w, float h) {
        int count = points.size();
        double meanLat = 0;
        for (GeoPoint p : points) meanLat += p.lat;
        meanLat /= count;
        double cos = Math.max(.15, Math.cos(Math.toRadians(meanLat)));
        double[] xs = new double[count], ys = new double[count];
        double minX = Double.POSITIVE_INFINITY, maxX = Double.NEGATIVE_INFINITY;
        double minY = Double.POSITIVE_INFINITY, maxY = Double.NEGATIVE_INFINITY;
        for (int i = 0; i < count; i++) {
            GeoPoint p = points.get(i);
            xs[i] = p.lng * cos;
            ys[i] = p.lat;
            minX = Math.min(minX, xs[i]); maxX = Math.max(maxX, xs[i]);
            minY = Math.min(minY, ys[i]); maxY = Math.max(maxY, ys[i]);
        }
        double spanX = Math.max(maxX - minX, 0.000015);
        double spanY = Math.max(maxY - minY, 0.000015);
        float pad = dp(15);
        float innerW = Math.max(dp(20), w - 2 * pad);
        float innerH = Math.max(dp(20), h - 2 * pad);
        double scale = Math.min(innerW / spanX, innerH / spanY);
        float drawnW = (float)(spanX * scale), drawnH = (float)(spanY * scale);
        float left = (w - drawnW) / 2f, top = (h - drawnH) / 2f;
        float[] sx = new float[count], sy = new float[count];
        for (int i = 0; i < count; i++) {
            sx[i] = left + (float)((xs[i] - minX) * scale);
            sy[i] = top + (float)((maxY - ys[i]) * scale);
        }

        path.reset();
        path.moveTo(sx[0], sy[0]);
        for (int i = 1; i < count; i++) path.lineTo(sx[i], sy[i]);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeCap(Paint.Cap.ROUND);
        paint.setStrokeJoin(Paint.Join.ROUND);
        paint.setStrokeWidth(dp(7));
        paint.setColor(0x6638BDF8);
        c.drawPath(path, paint);
        paint.setStrokeWidth(dp(3));
        paint.setColor(active && !paused ? 0xFF67E8F9 : 0xFF93C5FD);
        c.drawPath(path, paint);
        paint.setStyle(Paint.Style.FILL);

        float sx0 = sx[0], sy0 = sy[0], ex = sx[count - 1], ey = sy[count - 1];
        if (navigation) {
            // Active directions run from the current position toward the destination.
            paint.setColor(0xFF07111B);
            c.drawCircle(sx0, sy0, dp(7), paint);
            paint.setColor(0xFF67E8F9);
            c.drawCircle(sx0, sy0, dp(4), paint);
            paint.setColor(0xFFFFB86B);
            c.drawCircle(ex, ey, dp(5), paint);
            paint.setColor(0xFF07111B);
            c.drawCircle(ex, ey, dp(2.5f), paint);
            if (count >= 2) {
                float dx = sx[1] - sx0, dy = sy[1] - sy0;
                float len = (float)Math.sqrt(dx * dx + dy * dy);
                if (len > dp(2)) {
                    paint.setColor(0xFF67E8F9);
                    c.drawLine(sx0, sy0, sx0 + dx / len * dp(13), sy0 + dy / len * dp(13), paint);
                }
            }
        } else {
            // Start marker and current-position marker for a recorded ride.
            paint.setColor(0xFF07111B);
            c.drawCircle(sx0, sy0, dp(5), paint);
            paint.setColor(0xFF4ADE80);
            c.drawCircle(sx0, sy0, dp(3), paint);
            paint.setColor(0x4438E7FF);
            c.drawCircle(ex, ey, dp(9), paint);
            paint.setColor(0xFF07111B);
            c.drawCircle(ex, ey, dp(5.8f), paint);
            paint.setColor(active && !paused ? 0xFF67E8F9 : 0xFFE2E8F0);
            c.drawCircle(ex, ey, dp(3.6f), paint);
        }
    }

    private void drawSingleFix(Canvas c, float w, float h) {
        float x = w * .5f, y = h * .45f;
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(dp(1.5f));
        paint.setColor(0x8867E8F9);
        c.drawCircle(x, y, dp(10), paint);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(0xFF67E8F9);
        c.drawCircle(x, y, dp(3.5f), paint);
        drawLabel(c, "KONUM ALINDI · ROTA OLUŞUYOR", w, h, 0xFFBAE6FD);
    }

    private void drawWaiting(Canvas c, float w, float h) {
        float x = w * .5f, y = h * .43f;
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(dp(1.3f));
        paint.setColor(gpsReady ? 0x8870A4C2 : 0x665B7185);
        c.drawCircle(x, y, dp(9), paint);
        c.drawLine(x - dp(14), y, x + dp(14), y, paint);
        c.drawLine(x, y - dp(14), x, y + dp(14), paint);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(gpsReady ? 0xFF67E8F9 : 0xFF94A3B8);
        c.drawCircle(x, y, dp(2.5f), paint);
        drawLabel(c, navigation ? "ROTA TELEFONDAN AKTARILIYOR" : (gpsReady ? "SÜRÜŞ NOKTASI BEKLENİYOR" : "GPS KONUMU BEKLENİYOR"), w, h, 0xFFCBD5E1);
    }

    private void drawLabel(Canvas c, String text, float w, float h, int color) {
        paint.setStyle(Paint.Style.FILL);
        paint.setTypeface(android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL));
        paint.setTextSize(dp(8.5f));
        paint.setTextAlign(Paint.Align.CENTER);
        paint.setColor(0xCC07111B);
        float baseline = h - dp(7);
        float tw = paint.measureText(text);
        rect.set(Math.max(dp(4), (w - tw) / 2f - dp(7)), baseline - dp(12),
                Math.min(w - dp(4), (w + tw) / 2f + dp(7)), baseline + dp(3));
        c.drawRoundRect(rect, dp(7), dp(7), paint);
        paint.setColor(color);
        c.drawText(text, w / 2f, baseline, paint);
        paint.setTextAlign(Paint.Align.LEFT);
    }
}
