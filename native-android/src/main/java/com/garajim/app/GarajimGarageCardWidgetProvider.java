package com.garajim.app;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
public final class GarajimGarageCardWidgetProvider extends AppWidgetProvider {
    @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) GarajimWidgetProvider.updateTyped(c, m, id, GarajimWidgetProvider.TYPE_GARAGE);
    }
}