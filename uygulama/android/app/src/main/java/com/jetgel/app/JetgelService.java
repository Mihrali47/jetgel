package com.jetgel.app;

import android.Manifest;
import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

/**
 * Ön plan servisi: kurye/işletme çevrimiçiyken uygulamayı canlı tutar
 * (ekran kilitliyken sipariş, teklif ve arama gelmeye devam eder) ve
 * istenirse arka planda GPS konumu toplar.
 */
public class JetgelService extends Service {
    public static final int BILDIRIM_ID = 7001;
    static volatile boolean calisiyor = false;
    static volatile Location sonKonum = null;

    private PowerManager.WakeLock kilit;
    private LocationManager lm;
    private final LocationListener dinleyici = new LocationListener() {
        @Override public void onLocationChanged(Location l) { sonKonum = l; JetgelNativePlugin.konumGeldi(l); }
        @Override public void onProviderEnabled(String p) {}
        @Override public void onProviderDisabled(String p) {}
        @Override public void onStatusChanged(String p, int s, Bundle b) {}
    };

    public static void baslat(Context ctx, String baslik, String metin, boolean konum) {
        Intent i = new Intent(ctx, JetgelService.class);
        i.putExtra("baslik", baslik);
        i.putExtra("metin", metin);
        i.putExtra("konum", konum);
        ContextCompat.startForegroundService(ctx, i);
    }

    public static void durdur(Context ctx) {
        ctx.stopService(new Intent(ctx, JetgelService.class));
    }

    private boolean izinVar(String p) {
        return ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String baslik = intent != null && intent.getStringExtra("baslik") != null ? intent.getStringExtra("baslik") : "Jetgel çevrimiçi";
        String metin = intent != null && intent.getStringExtra("metin") != null ? intent.getStringExtra("metin") : "Siparişler ve aramalar için hazır";
        boolean konum = intent != null && intent.getBooleanExtra("konum", false)
                && (izinVar(Manifest.permission.ACCESS_FINE_LOCATION) || izinVar(Manifest.permission.ACCESS_COARSE_LOCATION));

        Bildirim.kanallariOlustur(this);
        Notification n = new NotificationCompat.Builder(this, Bildirim.KANAL_SERVIS)
                .setSmallIcon(R.drawable.ic_stat_jetgel)
                .setContentTitle(baslik)
                .setContentText(metin)
                .setOngoing(true)
                .setColor(0xFFE8590C)
                .setContentIntent(Bildirim.uygulamayiAc(this, BILDIRIM_ID))
                .build();

        int tur = 0;
        if (Build.VERSION.SDK_INT >= 34) {
            tur = ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE;
            if (konum) tur |= ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
            if (izinVar(Manifest.permission.RECORD_AUDIO)) tur |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
        } else if (Build.VERSION.SDK_INT >= 29) {
            if (konum) tur |= ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
            if (Build.VERSION.SDK_INT >= 30 && izinVar(Manifest.permission.RECORD_AUDIO)) tur |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
        }
        try {
            ServiceCompat.startForeground(this, BILDIRIM_ID, n, tur);
        } catch (Exception e) {
            // Tür kabul edilmezse en temel haliyle dene
            try { ServiceCompat.startForeground(this, BILDIRIM_ID, n, Build.VERSION.SDK_INT >= 34 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0); } catch (Exception ignored) {}
        }
        calisiyor = true;

        if (kilit == null) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null) {
                kilit = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "jetgel:cevrimici");
                kilit.setReferenceCounted(false);
                kilit.acquire(12 * 60 * 60 * 1000L);
            }
        }

        konumuDurdur();
        if (konum) konumuBaslat();
        return START_STICKY;
    }

    private void konumuBaslat() {
        try {
            lm = (LocationManager) getSystemService(LOCATION_SERVICE);
            if (lm == null) return;
            if (izinVar(Manifest.permission.ACCESS_FINE_LOCATION) && lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2000, 3, dinleyici, Looper.getMainLooper());
            }
            if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 5000, 10, dinleyici, Looper.getMainLooper());
            }
        } catch (SecurityException ignored) {}
    }

    private void konumuDurdur() {
        try { if (lm != null) lm.removeUpdates(dinleyici); } catch (Exception ignored) {}
    }

    @Override
    public void onDestroy() {
        calisiyor = false;
        konumuDurdur();
        try { if (kilit != null && kilit.isHeld()) kilit.release(); } catch (Exception ignored) {}
        kilit = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
