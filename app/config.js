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
  // Sesli arama sunucuları. STUN: telefonların internetteki adresini bulur.
  // TURN (Metered Open Relay, ücretsiz deneme planı): telefonlar doğrudan bağlanamazsa sesi aktarır.
  // Not: TURN bilgisi tarayıcıda görünür; kötüye kullanılırsa Metered panelinden silinip yenisi oluşturulur.
  iceServers: [
    {urls: 'stun:stun.l.google.com:19302'},
    {urls: 'stun:stun.relay.metered.ca:80'},
    {urls: 'turn:global.relay.metered.ca:80', username: '2cb61bad8330b143bdbdd272', credential: 'd9Q7zdK0ijYZjOjM'},
    {urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: '2cb61bad8330b143bdbdd272', credential: 'd9Q7zdK0ijYZjOjM'},
    {urls: 'turn:global.relay.metered.ca:443', username: '2cb61bad8330b143bdbdd272', credential: 'd9Q7zdK0ijYZjOjM'},
    {urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: '2cb61bad8330b143bdbdd272', credential: 'd9Q7zdK0ijYZjOjM'}
  ]
};
