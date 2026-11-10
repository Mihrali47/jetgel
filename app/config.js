// Jetgel bağlantı ayarları.
// Supabase bilgileri boşsa uygulama DEMO modunda çalışır: veriler sadece bu cihazda (bu tarayıcıda) tutulur,
// aynı cihazdaki farklı sekmeler birbirini görür.
// Bilgiler doluysa CANLI modda çalışır: tüm telefonlar aynı veritabanına bağlanır.
//
// Buraya YALNIZCA "Project URL" ve "Publishable key" (sb_publishable_ ile başlar) yazılır.
// Publishable key tarayıcıda görünmek üzere tasarlanmıştır.
// "Secret" anahtarı (sb_secret_) veya veritabanı şifresini ASLA buraya yazmayın.
window.JETGEL_CONFIG = {
  supabaseUrl: 'https://bohzusavzqvszwblcpka.supabase.co',
  supabaseKey: 'sb_publishable_nqaYSUirCylhagBeEUVgiA_OWHpnKlF',
  // Mobil veride sesli arama bağlanmazsa buraya bir TURN sunucusu eklenecek.
  iceServers: [
    {urls: 'stun:stun.l.google.com:19302'},
    {urls: 'stun:stun1.l.google.com:19302'}
  ]
};
