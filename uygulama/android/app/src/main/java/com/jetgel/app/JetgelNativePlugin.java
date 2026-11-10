package com.jetgel.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.List;

/**
 * Web sayfasının (app/core.js) telefonla konuştuğu köprü.
 * JS tarafında: Capacitor.Plugins.JetgelNative
 */
@CapacitorPlugin(
    name = "JetgelNative",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
        @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" })
    }
)
public class JetgelNativePlugin extends Plugin {
    private static volatile JetgelNativePlugin ornek;
    private boolean hoparlor = false;

    @Override
    public void load() { ornek = this; }

    /** Servisten gelen konum JS'e iletilir. */
    static void konumGeldi(Location l) {
        JetgelNativePlugin p = ornek;
        if (p == null || l == null) return;
        JSObject o = new JSObject();
        o.put("lat", l.getLatitude());
        o.put("lng", l.getLongitude());
        o.put("acc", l.hasAccuracy() ? l.getAccuracy() : null);
        o.put("t", l.getTime());
        p.notifyListeners("location", o);
    }

    private Context ctx() { return getContext(); }

    @PluginMethod
    public void info(PluginCall call) {
        JSObject o = new JSObject();
        o.put("android", Build.VERSION.SDK_INT);
        o.put("servis", JetgelService.calisiyor);
        PowerManager pm = (PowerManager) ctx().getSystemService(Context.POWER_SERVICE);
        o.put("pilMuaf", pm != null && pm.isIgnoringBatteryOptimizations(ctx().getPackageName()));
        o.put("hoparlor", hoparlor);
        o.put("location", getPermissionState("location").toString());
        o.put("microphone", getPermissionState("microphone").toString());
        o.put("notifications", Build.VERSION.SDK_INT >= 33 ? getPermissionState("notifications").toString() : "granted");
        call.resolve(o);
    }

    /* ---------------- İzinler ---------------- */
    @PluginMethod
    public void izinIste(PluginCall call) {
        String tur = call.getString("tur", "notifications");
        if ("notifications".equals(tur) && Build.VERSION.SDK_INT < 33) { JSObject o = new JSObject(); o.put("sonuc", "granted"); call.resolve(o); return; }
        if (getPermissionState(tur) == PermissionState.GRANTED) { JSObject o = new JSObject(); o.put("sonuc", "granted"); call.resolve(o); return; }
        requestPermissionForAlias(tur, call, "izinSonucu");
    }

    @PermissionCallback
    private void izinSonucu(PluginCall call) {
        String tur = call.getString("tur", "notifications");
        JSObject o = new JSObject();
        o.put("sonuc", getPermissionState(tur) == PermissionState.GRANTED ? "granted" : "denied");
        call.resolve(o);
    }

    @PluginMethod
    public void pilAyari(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            i.setData(Uri.parse("package:" + ctx().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx().startActivity(i);
        } catch (Exception e) {
            try {
                Intent i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx().startActivity(i);
            } catch (Exception ignored) {}
        }
        call.resolve();
    }

    @PluginMethod
    public void uygulamaAyarlari(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx().startActivity(i);
        } catch (Exception ignored) {}
        call.resolve();
    }

    /* ---------------- Ön plan servisi (arka planda canlı kalma + GPS) ---------------- */
    @PluginMethod
    public void servisBaslat(PluginCall call) {
        String baslik = call.getString("baslik", "Jetgel çevrimiçi");
        String metin = call.getString("metin", "Siparişler ve aramalar için hazır");
        boolean konum = Boolean.TRUE.equals(call.getBoolean("konum", false));
        try {
            JetgelService.baslat(ctx(), baslik, metin, konum);
            call.resolve();
        } catch (Exception e) {
            call.reject("Servis başlatılamadı: " + e.getMessage());
        }
    }

    @PluginMethod
    public void servisDurdur(PluginCall call) {
        JetgelService.durdur(ctx());
        call.resolve();
    }

    /* ---------------- Bildirim ---------------- */
    @PluginMethod
    public void bildir(PluginCall call) {
        int id = call.getInt("id", (int) (System.currentTimeMillis() % 100000));
        Bildirim.goster(ctx(), id, call.getString("baslik", "Jetgel"), call.getString("metin", ""), call.getString("tur", "order"));
        call.resolve();
    }

    @PluginMethod
    public void bildirimIptal(PluginCall call) {
        Integer id = call.getInt("id");
        if (id != null) Bildirim.iptal(ctx(), id);
        call.resolve();
    }

    /* ---------------- Ahize / hoparlör ---------------- */
    private AudioManager am() { return (AudioManager) ctx().getSystemService(Context.AUDIO_SERVICE); }

    @PluginMethod
    public void aramaBasladi(PluginCall call) {
        AudioManager am = am();
        if (am != null) {
            am.setMode(AudioManager.MODE_IN_COMMUNICATION);
            yonlendir(am, Boolean.TRUE.equals(call.getBoolean("hoparlor", false)));
        }
        JSObject o = new JSObject(); o.put("hoparlor", hoparlor); call.resolve(o);
    }

    @PluginMethod
    public void hoparlor(PluginCall call) {
        AudioManager am = am();
        if (am != null) {
            if (am.getMode() != AudioManager.MODE_IN_COMMUNICATION) am.setMode(AudioManager.MODE_IN_COMMUNICATION);
            yonlendir(am, Boolean.TRUE.equals(call.getBoolean("acik", false)));
        }
        JSObject o = new JSObject(); o.put("hoparlor", hoparlor); call.resolve(o);
    }

    @PluginMethod
    public void aramaBitti(PluginCall call) {
        AudioManager am = am();
        if (am != null) {
            try {
                if (Build.VERSION.SDK_INT >= 31) am.clearCommunicationDevice();
                else am.setSpeakerphoneOn(false);
            } catch (Exception ignored) {}
            am.setMode(AudioManager.MODE_NORMAL);
        }
        hoparlor = false;
        call.resolve();
    }

    @SuppressWarnings("deprecation")
    private void yonlendir(AudioManager am, boolean acik) {
        hoparlor = acik;
        try {
            if (Build.VERSION.SDK_INT >= 31) {
                int istenen = acik ? AudioDeviceInfo.TYPE_BUILTIN_SPEAKER : AudioDeviceInfo.TYPE_BUILTIN_EARPIECE;
                List<AudioDeviceInfo> cihazlar = am.getAvailableCommunicationDevices();
                AudioDeviceInfo secilen = null;
                // Kulaklık bağlıysa ahize yerine kulaklığı tercih et
                if (!acik) {
                    for (AudioDeviceInfo d : cihazlar) {
                        int t = d.getType();
                        if (t == AudioDeviceInfo.TYPE_WIRED_HEADSET || t == AudioDeviceInfo.TYPE_WIRED_HEADPHONES
                                || t == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || t == AudioDeviceInfo.TYPE_USB_HEADSET
                                || (Build.VERSION.SDK_INT >= 31 && t == AudioDeviceInfo.TYPE_BLE_HEADSET)) { secilen = d; break; }
                    }
                }
                if (secilen == null) for (AudioDeviceInfo d : cihazlar) if (d.getType() == istenen) { secilen = d; break; }
                if (secilen != null) am.setCommunicationDevice(secilen);
                else am.setSpeakerphoneOn(acik);
            } else {
                am.setSpeakerphoneOn(acik);
            }
        } catch (Exception e) {
            try { am.setSpeakerphoneOn(acik); } catch (Exception ignored) {}
        }
    }
}
