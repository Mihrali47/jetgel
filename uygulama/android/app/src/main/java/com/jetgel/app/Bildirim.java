package com.jetgel.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** Bildirim kanalları ve bildirim gösterme. */
public class Bildirim {
    public static final String KANAL_ARAMA = "arama";
    public static final String KANAL_SIPARIS = "siparis";
    public static final String KANAL_SERVIS = "servis";

    public static void kanallariOlustur(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel arama = new NotificationChannel(KANAL_ARAMA, "Gelen aramalar", NotificationManager.IMPORTANCE_HIGH);
        arama.setDescription("Uygulama içi sesli aramalar");
        Uri zil = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        arama.setSound(zil, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        arama.enableVibration(true);
        arama.setVibrationPattern(new long[]{0, 600, 400, 600, 400, 600});
        arama.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(arama);

        NotificationChannel siparis = new NotificationChannel(KANAL_SIPARIS, "Siparişler ve teklifler", NotificationManager.IMPORTANCE_HIGH);
        siparis.setDescription("Yeni sipariş, kurye teklifi, kurye kapıda");
        siparis.enableVibration(true);
        siparis.setVibrationPattern(new long[]{0, 400, 200, 400});
        siparis.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(siparis);

        NotificationChannel servis = new NotificationChannel(KANAL_SERVIS, "Çevrimiçi durumu", NotificationManager.IMPORTANCE_LOW);
        servis.setDescription("Uygulama sipariş beklerken gösterilen kalıcı bildirim");
        servis.setShowBadge(false);
        nm.createNotificationChannel(servis);
    }

    static PendingIntent uygulamayiAc(Context ctx, int kod) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        return PendingIntent.getActivity(ctx, kod, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** kind: "call" (çalan arama, kilit ekranında tam ekran) veya "order" (sipariş/teklif). */
    public static void goster(Context ctx, int id, String baslik, String metin, String kind) {
        kanallariOlustur(ctx);
        boolean arama = "call".equals(kind);
        PendingIntent ac = uygulamayiAc(ctx, id);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, arama ? KANAL_ARAMA : KANAL_SIPARIS)
                .setSmallIcon(R.drawable.ic_stat_jetgel)
                .setContentTitle(baslik)
                .setContentText(metin)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(metin))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setContentIntent(ac)
                .setAutoCancel(true)
                .setColor(0xFFE8590C);
        if (arama) {
            b.setCategory(NotificationCompat.CATEGORY_CALL)
             .setFullScreenIntent(ac, true)
             .setOngoing(true)
             .setTimeoutAfter(35000);
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                b.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE));
                b.setVibrate(new long[]{0, 600, 400, 600});
            }
        } else {
            b.setCategory(NotificationCompat.CATEGORY_MESSAGE);
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) b.setDefaults(NotificationCompat.DEFAULT_ALL);
        }
        try { NotificationManagerCompat.from(ctx).notify(id, b.build()); } catch (SecurityException ignored) {}
    }

    public static void iptal(Context ctx, int id) {
        NotificationManagerCompat.from(ctx).cancel(id);
    }
}
