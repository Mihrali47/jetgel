/* Jetgel çekirdek: veri katmanı, iş kuralları, rota/navigasyon, sesli arama, uyarılar, harita.
   Tüm rol sayfaları (musteri, isletme, kurye, yonetim) bu dosyayı kullanır.
   İş kuralları README.md ve AGENTS.md'de yazılıdır; burada sahibin onayı olmadan değiştirilmez. */
(function(){
'use strict';
const CFG = window.JETGEL_CONFIG || {};
const J = window.J = window.J || {};

/* ===================== AYARLAR (iş kuralları) ===================== */
J.FEE = {custDel:50, custPlat:5, bizDel:50, bizPlat:5, courier:100, platform:10};
J.PENALTY_RATE = 0.15;          // ikazda müşteriye iade
J.COMMISSION_RATE = 0.35;       // karşılaştırma için
J.RADIUS_M = 3000;              // kurye arama yarıçapı
J.OFFER_MS = 30000;             // kurye teklif süresi
J.RING_MS = 30000;              // arama çalma süresi
J.CALLBACK_MS = 5*60000;        // işletmenin geri arama süresi
J.WAIT_MS = 10*60000;           // müşteriye ulaşılamazsa bekleme
J.PIN_RADIUS_M = 100;           // teslimat kodu bu mesafede geçerli
J.ARRIVE_M = 60;                // bu mesafede "vardı" sayılır
J.ONLINE_MS = 2*60000;          // kurye/işletme bu süredir sinyal vermediyse çevrimdışı sayılır
J.M_PER_MIN = 416;              // motorlu kurye ~25 km/sa
J.BOX = {minLat:40.9790, maxLat:40.9935, minLng:29.0205, maxLng:29.0395}; // Moda / Kadıköy
J.DEFAULT_POS = {lat:40.98400, lng:29.03350};
const ROUTER = 'https://router.project-osrm.org/route/v1/driving/';
const TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

/* ===================== YARDIMCILAR ===================== */
J.now = () => Date.now();
J.uid = (p) => (p||'') + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
J.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
J.tl = n => { const v = Math.round((n||0)*100)/100; return v.toLocaleString('tr-TR', {minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2}) + ' TL'; };
J.dist = function(a,b){
  if(!a || !b || a.lat == null || b.lat == null) return Infinity;
  const R=6371000, r=Math.PI/180, dLat=(b.lat-a.lat)*r, dLng=(b.lng-a.lng)*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
};
J.fmtDist = m => !isFinite(m) ? '—' : m >= 1000 ? (m/1000).toFixed(1).replace('.',',')+' km' : Math.round(m/10)*10+' m';
J.clock = t => new Date(t).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
J.secs = ms => Math.max(0, Math.ceil(ms/1000));
J.mmss = ms => { const s = J.secs(ms); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
J.gmaps = p => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;
J.store = {
  get(k, d){ try{ const v = localStorage.getItem('jetgel_'+k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('jetgel_'+k, JSON.stringify(v)); }catch(e){} }
};

/* ===================== VERİ KATMANI =====================
   Demo modu: localStorage + BroadcastChannel (aynı cihazdaki sekmeler).
   Canlı mod: Supabase "kayitlar" tablosu + realtime (tüm cihazlar). */
const TABLES = ['businesses','couriers','customers','orders','calls','events','settings'];
const DB = J.DB = {mode:'demo', status:'baglaniyor', cache:{}, listeners:[]};
TABLES.forEach(t => DB.cache[t] = new Map());
DB.rows = t => Array.from(DB.cache[t].values());
DB.get = (t,id) => DB.cache[t].get(id);
DB.on = cb => DB.listeners.push(cb);
function emit(info){ DB.listeners.forEach(cb => { try{ cb(info); }catch(e){ console.error(e); } }); }
function setLocal(t, id, data){ if(!DB.cache[t]) return; if(data == null) DB.cache[t].delete(id); else DB.cache[t].set(id, Object.assign({id}, data)); }

// ---- Demo adaptörü ----
const LS = 'jetgel_db_v1';
const demo = {
  load(){ try{ return JSON.parse(localStorage.getItem(LS)) || {}; }catch(e){ return {}; } },
  save(db){
    const evKeys = Object.keys(db).filter(k => k.startsWith('events|'));
    if(evKeys.length > 300) evKeys.sort((a,b) => (db[a].t||0)-(db[b].t||0)).slice(0, evKeys.length-300).forEach(k => delete db[k]);
    try{ localStorage.setItem(LS, JSON.stringify(db)); }catch(e){ console.warn(e); }
  },
  bc: null,
  async init(){
    this.reload();
    try{ this.bc = new BroadcastChannel('jetgel'); this.bc.onmessage = () => { this.reload(); emit({}); }; }catch(e){}
    window.addEventListener('storage', e => { if(e.key === LS){ this.reload(); emit({}); } });
    DB.status = 'bagli';
  },
  reload(){ TABLES.forEach(t => DB.cache[t].clear()); const db = this.load(); Object.keys(db).forEach(k => { const [t,id] = k.split('|'); setLocal(t, id, db[k]); }); },
  notify(){ try{ this.bc && this.bc.postMessage(1); }catch(e){} },
  async put(t,id,data){ const db = this.load(); db[t+'|'+id] = data; this.save(db); this.notify(); },
  async patch(t,id,p){ const db = this.load(); const k = t+'|'+id; if(!db[k]) return; db[k] = Object.assign(db[k], p); this.save(db); this.notify(); setLocal(t,id,db[k]); },
  async claim(t,id,f){ const db = this.load(); const k = t+'|'+id; if(!db[k] || db[k][f] !== undefined) return false; db[k][f] = true; this.save(db); this.notify(); setLocal(t,id,db[k]); return true; },
  async remove(t,id){ const db = this.load(); delete db[t+'|'+id]; this.save(db); this.notify(); },
  async clearAll(){ try{ localStorage.removeItem(LS); }catch(e){} this.notify(); },
  async refresh(){ this.reload(); }
};

// ---- Canlı (Supabase) adaptörü ----
const live = {
  sb: null, ch: null,
  async init(){
    this.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {auth:{persistSession:false}});
    await this.refresh();
    this.ch = this.sb.channel('kayitlar-'+Math.random().toString(36).slice(2))
      .on('postgres_changes', {event:'*', schema:'public', table:'kayitlar'}, p => {
        if(p.eventType === 'DELETE'){ const o = p.old || {}; if(o.tbl) setLocal(o.tbl, o.id, null); }
        else if(p.new && p.new.tbl) setLocal(p.new.tbl, p.new.id, p.new.data);
        emit({});
      })
      .subscribe(s => { DB.status = s === 'SUBSCRIBED' ? 'bagli' : (s === 'CLOSED' || s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') ? 'kopuk' : 'baglaniyor'; emit({status:true}); });
    document.addEventListener('visibilitychange', () => { if(!document.hidden) this.refresh().then(() => emit({})); });
    setInterval(() => this.refresh().then(() => emit({})), 30000);
  },
  async refresh(){
    const a = await this.sb.from('kayitlar').select('tbl,id,data').neq('tbl','events').limit(5000);
    const b = await this.sb.from('kayitlar').select('tbl,id,data').eq('tbl','events').order('updated_at',{ascending:false}).limit(150);
    if(a.error){ DB.status = 'hata'; DB.lastError = a.error.message; throw a.error; }
    TABLES.forEach(t => DB.cache[t].clear());
    (a.data||[]).concat(b.data||[]).forEach(r => setLocal(r.tbl, r.id, r.data));
  },
  async put(t,id,data){ const r = await this.sb.from('kayitlar').upsert({tbl:t, id, data}); if(r.error) throw r.error; },
  async patch(t,id,p){ const r = await this.sb.rpc('jg_patch', {p_tbl:t, p_id:id, p_patch:p}); if(r.error) throw r.error; },
  async claim(t,id,f){ const r = await this.sb.rpc('jg_claim', {p_tbl:t, p_id:id, p_field:f}); if(r.error) throw r.error; return !!r.data; },
  async remove(t,id){ const r = await this.sb.from('kayitlar').delete().eq('tbl',t).eq('id',id); if(r.error) throw r.error; },
  async clearAll(){ const r = await this.sb.from('kayitlar').delete().neq('tbl','__yok__'); if(r.error) throw r.error; }
};

let ADP = demo;
DB.init = async function(){
  const wantLive = CFG.supabaseUrl && CFG.supabaseKey && !J.store.get('force_demo', false);
  if(wantLive && window.supabase){
    DB.mode = 'canli'; ADP = live;
    try{ await live.init(); }
    catch(e){ console.error(e); DB.status = 'hata'; DB.lastError = e.message || String(e); }
  } else {
    DB.mode = 'demo'; ADP = demo; await demo.init();
  }
  if(DB.status !== 'hata') J.ensureTestAccounts(false);
  await J.refreshNative();
  emit({status:true});
};
function fail(e){ console.error(e); J.toast('Kaydedilemedi: ' + (e.message || e)); }
DB.put = (t,id,data) => { setLocal(t,id,data); emit({}); return ADP.put(t,id,data).catch(fail); };
DB.patch = (t,id,p) => { const cur = DB.get(t,id); if(cur) setLocal(t,id,Object.assign({},cur,p)); emit({}); return ADP.patch(t,id,p).catch(fail); };
DB.claim = (t,id,f) => ADP.claim(t,id,f).catch(e => { fail(e); return false; });
DB.remove = (t,id) => { setLocal(t,id,null); emit({}); return ADP.remove(t,id).catch(fail); };
DB.clearAll = async () => { await ADP.clearAll().catch(fail); TABLES.forEach(t => DB.cache[t].clear()); emit({}); };
DB.refresh = () => ADP.refresh();

/* ===================== AYAR: HIZLI TEST MODU ===================== */
J.settings = () => DB.get('settings','ayar') || {fast:true};
J.D = ms => J.settings().fast ? Math.max(1000, Math.round(ms/10)) : ms;   // hızlı test modunda süreler 10'da 1
J.minMs = () => J.D(60000);  // "1 dakika" kaç ms

/* ===================== OLAY GÜNLÜĞÜ ===================== */
J.log = function(txt, kind, orderId){ const id = J.uid('e'); DB.put('events', id, {t:J.now(), txt, kind:kind||'', order_id:orderId||null}); };

/* ===================== SORGULAR ===================== */
J.businesses = () => DB.rows('businesses').sort((a,b) => (a.name||'').localeCompare(b.name||'','tr'));
J.couriers = () => DB.rows('couriers');
J.orders = () => DB.rows('orders').sort((a,b) => (b.created_at||0)-(a.created_at||0));
J.calls = () => DB.rows('calls').sort((a,b) => (b.start||0)-(a.start||0));
J.events = () => DB.rows('events').sort((a,b) => (b.t||0)-(a.t||0));
J.isAlive = x => x && x.seen_at && J.now() - x.seen_at < J.ONLINE_MS;
J.activeStrikes = b => (b.strikes||[]).filter(s => !s.removed);
J.partyName = function(p){
  if(!p) return '';
  if(p.type==='musteri') return (p.name || 'Müşteri') + ' (müşteri)';
  if(p.type==='isletme'){ const b = DB.get('businesses', p.id); return (b ? b.name : 'İşletme') + ' (işletme)'; }
  const c = DB.get('couriers', p.id); return (c ? c.name : 'Kurye') + ' (kurye)';
};

/* ===================== ÖDEME (simülasyon) =====================
   Para platformun hesabına uğramaz (alt üye işyeri modeli varsayımı).
   blokaj → işletme onayında çekim (bekletiliyor) → teslimde dağıtım. Red → blokaj kalkar. */
J.PAY_TXT = {blokaj:'Kartta bloke (çekilmedi)', bekletiliyor:'Çekildi · teslimata kadar bekletiliyor', dagitildi:'Dağıtıldı', kalkti:'Blokaj kaldırıldı · para çekilmedi'};
J.payPill = o => `<span class="pill ${o.pay==='dagitildi'?'ok':o.pay==='kalkti'?'bad':o.pay==='bekletiliyor'?'blue':'warn'}">${J.ic('credit-card',12)} ${J.PAY_TXT[o.pay]||o.pay}</span>`;
function payout(o){
  const shares = {business: o.subtotal - o.fees.biz - (o.refund||0), courier: J.FEE.courier, platform: J.FEE.platform, refund: o.refund||0};
  DB.patch('orders', o.id, {pay:'dagitildi', shares});
  J.log(`#${o.no} ödeme dağıtıldı: işletme ${J.tl(shares.business)}, kurye ${J.tl(shares.courier)}, platform ${J.tl(shares.platform)}${shares.refund?`, iade ${J.tl(shares.refund)}`:''}.`, 'pay', o.id);
}

/* ===================== SİPARİŞ ===================== */
J.placeOrder = function(b, cart, cust, extra){
  const items = (b.menu||[]).filter(m => cart[m.id]).map(m => ({name:m.name, price:m.price, qty:cart[m.id]}));
  if(!items.length) return null;
  const subtotal = items.reduce((s,i) => s + i.price*i.qty, 0);
  const F = J.FEE;
  const fees = b.free_delivery ? {cust:0, biz:F.custDel+F.custPlat+F.bizDel+F.bizPlat} : {cust:F.custDel+F.custPlat, biz:F.bizDel+F.bizPlat};
  const id = J.uid('o');
  const o = {
    id, no: String(Date.now()).slice(-5), rid:b.id, rname:b.name, items, subtotal, fees,
    state:'aktif', prep:'bekliyor', del:'yok', pay:'blokaj', refund:0,
    customer:{id:cust.id, name:cust.name, lat:cust.lat, lng:cust.lng, note:cust.note||''},
    note: String((extra && extra.note) || '').slice(0, 200),
    pin: String(Math.floor(1000+Math.random()*9000)), courier_id:null, offer:null, tried:[],
    created_at: J.now()
  };
  DB.put('orders', id, o);
  J.log(`#${o.no} ${b.name} için sipariş (${J.tl(subtotal)}). Kartta ${J.tl(subtotal+fees.cust)} bloke.`, 'order', id);
  return o;
};
J.acceptOrder = function(o, prepMin){
  DB.patch('orders', o.id, {prep:'hazirlaniyor', prep_until: J.now() + prepMin*J.minMs(), prep_min:prepMin, pay:'bekletiliyor', del:'araniyor', accepted_at:J.now()});
  J.log(`#${o.no} işletme onayladı (${prepMin} dk). Ödeme çekildi, teslimata kadar bekletiliyor.`, 'order', o.id);
};
J.rejectOrder = function(o){
  DB.patch('orders', o.id, {state:'red', pay:'kalkti'});
  J.log(`#${o.no} işletme reddetti. Blokaj kaldırıldı.`, 'bad', o.id);
};
J.markReady = function(o){ DB.patch('orders', o.id, {prep:'hazir'}); J.log(`#${o.no} hazır.`, '', o.id); };

/* ===================== KURYE ATAMA =====================
   İşletmenin cihazı kendi siparişleri için çalıştırır:
   en yakın, çevrimiçi, bildirimi açık, boşta, teklifi olmayan kuryeye 30 sn'lik teklif. */
J.courierHasOffer = cid => J.orders().some(o => o.state==='aktif' && o.offer && o.offer.cid===cid && o.offer.exp > J.now());
J.candidates = function(o){
  const b = DB.get('businesses', o.rid); if(!b) return [];
  return J.couriers()
    .filter(c => c.online && c.notif_ok && J.isAlive(c) && !c.busy && !(o.tried||[]).includes(c.id) && !J.courierHasOffer(c.id) && J.dist(c,b) <= J.RADIUS_M)
    .sort((a,b2) => J.dist(a,b) - J.dist(b2,b));
};
J.dispatchTick = function(o){
  if(o.state!=='aktif' || o.courier_id || o.prep==='bekliyor') return;
  const t = J.now();
  if(o.offer && o.offer.exp > t) return;
  if(o.offer && o.offer.exp <= t){
    const tried = (o.tried||[]).concat([o.offer.cid]);
    const c = DB.get('couriers', o.offer.cid);
    J.log(`#${o.no} ${c?c.name:'kurye'} 30 sn içinde yanıt vermedi, sıradakine geçiliyor.`, 'warn', o.id);
    DB.patch('orders', o.id, {offer:null, tried}); return;
  }
  if(o.retry_at && o.retry_at > t) return;
  const cands = J.candidates(o);
  if(!cands.length){
    // Herkes denendiyse listeyi sıfırla ki reddedenlere de tekrar sorulsun
    const patch = {retry_at: t + 5000, no_cand_logged:true};
    if((o.tried||[]).length) patch.tried = [];
    DB.patch('orders', o.id, patch);
    if(!o.no_cand_logged) J.log(`#${o.no} için yakında boşta kurye yok, aranmaya devam ediliyor.`, 'warn', o.id);
    return;
  }
  const c = cands[0];
  DB.patch('orders', o.id, {offer:{cid:c.id, exp: t + J.OFFER_MS}, del:'araniyor', no_cand_logged:false});
  J.log(`#${o.no} teklifi → ${c.name} (işletmeye ${J.fmtDist(J.dist(c, DB.get('businesses',o.rid)))}).`, 'dispatch', o.id);
};
J.courierAccept = async function(c, o){
  if(!o.offer || o.offer.cid !== c.id || o.offer.exp < J.now()) { J.toast('Teklifin süresi doldu.'); return; }
  const ok = await DB.claim('orders', o.id, 'kabul_edildi');
  if(!ok){ J.toast('Bu sipariş başka bir kuryeye geçti.'); return; }
  DB.patch('orders', o.id, {courier_id:c.id, cname:c.name, offer:null, del:'isletmeye'});
  DB.patch('couriers', c.id, {busy:o.id});
  J.log(`#${o.no} ${c.name} kabul etti, işletmeye gidiyor.`, 'ok', o.id);
};
J.courierDecline = function(c, o, why){
  DB.patch('orders', o.id, {offer:null, tried:(o.tried||[]).concat([c.id])});
  J.log(`#${o.no} ${c.name} ${why||'teklifi reddetti'}.`, 'warn', o.id);
};
J.arriveBusiness = o => { DB.patch('orders', o.id, {del:'isletmede'}); J.log(`#${o.no} kurye işletmede.`, '', o.id); };
J.pickup = o => { DB.patch('orders', o.id, {del:'yolda', picked_at:J.now()}); J.log(`#${o.no} paket alındı (fiş QR), müşteriye gidiyor.`, '', o.id); };
J.arriveCustomer = o => { DB.patch('orders', o.id, {del:'kapida', arrived_at:J.now()}); J.log(`#${o.no} kurye müşterinin kapısında.`, '', o.id); };
function finishCourier(c, o){
  const jobs = [{id:o.id, no:o.no, t:J.now(), amount:J.FEE.courier, rname:o.rname}].concat(c.jobs||[]).slice(0,50);
  DB.patch('couriers', c.id, {busy:null, earnings:(c.earnings||0)+J.FEE.courier, jobs});
}
J.complete = function(c, o, how){
  DB.patch('orders', o.id, {state:'teslim', del:'teslim', delivered_at:J.now(), how});
  finishCourier(c, o);
  J.log(`#${o.no} teslim edildi (${how})${o.photo?', fotoğraflı':''}.`, 'ok', o.id);
  payout(Object.assign({}, o, {state:'teslim'}));
};
J.unreachable = function(c, o){
  DB.patch('orders', o.id, {state:'ulasilamadi', del:'ulasilamadi'});
  finishCourier(c, o);
  J.log(`#${o.no} müşteriye ulaşılamadı (kurye bekledi ve aradı). Kurallar gereği iade yok.`, 'bad', o.id);
  payout(o);
};

/* ===================== İKAZ =====================
   Müşteri işletmeyi arar, işletme açmaz/reddeder ve süre içinde geri aramazsa:
   müşteriye %15 iade (işletme payından), 3 ikazda askıya alma. Herhangi bir cihaz uygulayabilir, claim ile tek sefer. */
J.pendingCallbacks = rid => J.calls().filter(k => k.to && k.to.type==='isletme' && (!rid || k.to.id===rid) && k.from.type==='musteri' && (k.state==='cevapsiz'||k.state==='reddedildi') && !k.cb_done && !k.cezalandi);
J.strikeTick = async function(){
  const t = J.now();
  for(const k of J.pendingCallbacks()){
    const back = J.calls().some(x => x.order_id===k.order_id && x.from.type==='isletme' && x.from.id===k.to.id && x.to.type==='musteri' && x.start >= k.start);
    if(back){ DB.patch('calls', k.id, {cb_done:true}); J.log(`${J.partyName(k.to)} müşteriyi geri aradı, ikaz yok.`, 'ok', k.order_id); continue; }
    if(t < (k.cb_deadline||Infinity)) continue;
    const o = DB.get('orders', k.order_id), b = DB.get('businesses', k.to.id);
    if(!o || !b){ DB.patch('calls', k.id, {cb_done:true}); continue; }
    if(!(await DB.claim('calls', k.id, 'cezalandi'))) continue;
    const refund = Math.round(o.subtotal * J.PENALTY_RATE);
    DB.patch('orders', o.id, {refund:(o.refund||0)+refund});
    const strikes = (b.strikes||[]).concat([{id:J.uid('i'), t, order_id:o.id, no:o.no, refund, appeal:null, removed:false}]);
    const n = strikes.filter(s => !s.removed).length;
    const patch = {strikes};
    if(n >= 3){ patch.suspended = true; patch.open = false; }
    DB.patch('businesses', b.id, patch);
    J.log(`${b.name} ${n}. ikazı aldı. Müşteriye ${J.tl(refund)} iade.${n>=3?' 3. ikaz: askıya alındı.':''}`, 'bad', o.id);
  }
};

/* ===================== ROTA VE NAVİGASYON ===================== */
function cumul(pts){ const c=[0]; for(let i=1;i<pts.length;i++) c.push(c[i-1]+J.dist(pts[i-1],pts[i])); return c; }
function nearestIdx(pts, p){ let bi=0, bd=Infinity; for(let i=0;i<pts.length;i++){ const d=J.dist(pts[i],p); if(d<bd){bd=d;bi=i;} } return bi; }
J.nearestIdx = nearestIdx;
const MOD_TR = {left:'sola', right:'sağa', 'slight left':'hafif sola', 'slight right':'hafif sağa', 'sharp left':'keskin sola', 'sharp right':'keskin sağa', straight:'düz', uturn:'U dönüşü'};
// Dönüş oklarının ikon adları (app/ikon.js)
const ARROW = {left:'corner-up-left', right:'corner-up-right', 'slight left':'arrow-up-left', 'slight right':'arrow-up-right', 'sharp left':'corner-up-left', 'sharp right':'corner-up-right', straight:'arrow-up', uturn:'rotate-ccw'};
const cap = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
function maneuverText(s){
  const m = s.maneuver || {}, mod = m.modifier, name = s.name ? ` · ${s.name}` : '', yon = MOD_TR[mod] || '';
  switch(m.type){
    case 'depart': return `Yola çık${name}`;
    case 'arrive': return 'Varış noktası';
    case 'roundabout': case 'rotary': case 'roundabout turn': return `Göbekten ${m.exit ? m.exit+'. çıkıştan ' : ''}çık${name}`;
    case 'fork': return `Çatalda ${yon || 'devam'} yönüne geç${name}`;
    case 'end of road': return `Yolun sonunda ${yon} dön${name}`;
    case 'new name': case 'continue': return mod && mod!=='straight' ? `${cap(yon)} devam et${name}` : `Düz devam et${name}`;
    default:
      if(mod==='straight') return `Düz devam et${name}`;
      if(mod==='uturn') return `U dönüşü yap${name}`;
      return `${cap(yon)} dön${name}`;
  }
}
J.fetchRoute = async function(a, b){
  const url = `${ROUTER}${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson&steps=true`;
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 8000);
  try{
    const res = await fetch(url, {signal:ctl.signal}); clearTimeout(tm);
    if(!res.ok) throw 0;
    const j = await res.json();
    if(j.code !== 'Ok' || !j.routes || !j.routes.length) throw 0;
    const rt = j.routes[0];
    const pts = rt.geometry.coordinates.map(([lng,lat]) => ({lat,lng}));
    pts.unshift({lat:a.lat,lng:a.lng}); pts.push({lat:b.lat,lng:b.lng});
    const cum = cumul(pts), steps = [];
    (rt.legs||[]).forEach(leg => (leg.steps||[]).forEach(s => {
      const loc = {lat:s.maneuver.location[1], lng:s.maneuver.location[0]};
      steps.push({text:maneuverText(s), arrow: s.maneuver.type==='arrive' ? 'flag' : (ARROW[s.maneuver.modifier]||'arrow-up'), at:cum[nearestIdx(pts,loc)], type:s.maneuver.type});
    }));
    steps.sort((x,y) => x.at-y.at);
    return {pts, cum, total:cum[cum.length-1], steps, source:'osrm', dest:{lat:b.lat,lng:b.lng}};
  }catch(e){
    clearTimeout(tm);
    const pts = [{lat:a.lat,lng:a.lng},{lat:b.lat,lng:b.lng}], cum = cumul(pts);
    return {pts, cum, total:cum[1], source:'duz', dest:{lat:b.lat,lng:b.lng}, steps:[
      {text:'Hedefe doğru ilerle (yol rotası alınamadı)', arrow:'arrow-up', at:0, type:'depart'},
      {text:'Varış noktası', arrow:'flag', at:cum[1], type:'arrive'}]};
  }
};
// Mevcut konuma göre rota üzerindeki ilerleme ve sıradaki manevra
J.navState = function(route, pos, prog){
  if(!route) return null;
  let p = prog;
  if(p == null){ const i = nearestIdx(route.pts, pos); p = route.cum[i]; }
  const step = route.steps.find(s => s.at > p + 5) || route.steps[route.steps.length-1];
  const off = prog == null ? J.dist(route.pts[nearestIdx(route.pts,pos)], pos) : 0;
  const remain = Math.max(0, route.total - p);
  return {prog:p, step, inM:Math.max(0, step.at - p), remain, off, etaMin: Math.max(1, Math.round(remain / J.M_PER_MIN))};
};
J.pointAt = function(route, prog){
  const cum = route.cum, pts = route.pts;
  if(prog >= route.total) return Object.assign({}, pts[pts.length-1]);
  let i = 0; while(i < cum.length-2 && cum[i+1] <= prog) i++;
  const f = (prog-cum[i]) / ((cum[i+1]-cum[i]) || 1);
  return {lat: pts[i].lat + (pts[i+1].lat-pts[i].lat)*f, lng: pts[i].lng + (pts[i+1].lng-pts[i].lng)*f};
};

/* ===================== UYARILAR: ses, titreşim, bildirim, ekranı açık tutma ===================== */
let actx = null;
function audio(){ if(!actx){ try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(actx && actx.state==='suspended') actx.resume().catch(()=>{}); return actx; }
document.addEventListener('pointerdown', () => audio(), {passive:true});
J.beep = function(kind){
  const a = audio(); if(!a) return;
  const seq = kind==='ring' ? [[880,.18],[0,.08],[880,.18]] : kind==='ok' ? [[660,.12],[990,.16]] : [[740,.15],[0,.07],[740,.15],[0,.07],[988,.22]];
  let t = a.currentTime;
  seq.forEach(([f,d]) => { if(f){ const o = a.createOscillator(), g = a.createGain(); o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.25,t+.02); g.gain.exponentialRampToValueAtTime(.0001,t+d); o.connect(g).connect(a.destination); o.start(t); o.stop(t+d+.02); } t += d; });
  try{ navigator.vibrate && navigator.vibrate(kind==='ring'?[300,150,300]:[200,100,200]); }catch(e){}
};
const alarms = {};
J.alarm = function(key, on, kind, every){
  if(on && !alarms[key]){ J.beep(kind); alarms[key] = setInterval(() => J.beep(kind), every||2500); }
  if(!on && alarms[key]){ clearInterval(alarms[key]); delete alarms[key]; }
};
/* ----- Android uygulaması (Capacitor) köprüsü: site uygulamanın içinde açıldıysa yerel özellikler ----- */
J.native = null;
try{ if(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && Capacitor.Plugins && Capacitor.Plugins.JetgelNative) J.native = Capacitor.Plugins.JetgelNative; }catch(e){}
J.nativeInfo = {};
J.refreshNative = async function(){ if(!J.native) return; try{ J.nativeInfo = await J.native.info(); emit({}); }catch(e){} };
const permMap = s => s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'default';
const nid = key => { let h = 7; for(const ch of String(key)) h = (h*31 + ch.charCodeAt(0)) | 0; return Math.abs(h) % 2000000000; };
J.nativeService = async function(on, opts){
  if(!J.native) return;
  try{
    if(on){
      if(opts && opts.konum && permMap(J.nativeInfo.location) !== 'granted') await J.native.izinIste({tur:'location'});
      await J.native.servisBaslat(Object.assign({baslik:'Jetgel çevrimiçi', metin:'Siparişler ve aramalar için hazır', konum:false}, opts||{}));
    } else await J.native.servisDurdur();
  }catch(e){ console.warn(e); }
  J.refreshNative();
};
J.batteryCard = function(){
  if(!J.native || J.nativeInfo.pilMuaf !== false) return '';
  return `<div class="card warn small"><b>${J.ic('battery-medium',15)} Pil kısıtlamasını kaldır</b><div class="muted">Telefon pil tasarrufu için uygulamayı arka planda durdurabilir; sipariş, teklif ve aramaları kaçırırsın. "İzin ver"e bas ve açılan pencerede onayla.</div><div class="btns"><button class="sm brand" data-native="pil">İzin ver</button></div></div>`;
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-native]'); if(!b || !J.native) return;
  if(b.dataset.native === 'pil') J.native.pilAyari().then(() => setTimeout(J.refreshNative, 1500));
  if(b.dataset.native === 'ayarlar') J.native.uygulamaAyarlari();
});
document.addEventListener('visibilitychange', () => { if(!document.hidden) J.refreshNative(); });

J.notifSupported = () => !!J.native || 'Notification' in window;
J.notifPermission = () => J.native ? permMap(J.nativeInfo.notifications) : ('Notification' in window ? Notification.permission : 'unsupported');
J.askNotif = async function(){
  if(J.native){ try{ const r = await J.native.izinIste({tur:'notifications'}); await J.refreshNative(); return r.sonuc; }catch(e){ return 'denied'; } }
  if(!('Notification' in window)) return 'unsupported';
  try{ return await Notification.requestPermission(); }catch(e){ return Notification.permission; }
};
const notified = new Set();
J.cancelNotify = key => { if(J.native) J.native.bildirimIptal({id:nid(key)}).catch(()=>{}); };
J.notify = function(key, title, body){
  if(notified.has(key)) return;
  if(J.native){
    notified.add(key);
    // Uygulama ekrandaysa kullanıcı zaten görüyor; arka plandaysa/ekran kilitliyse yerel bildirim (aramada çalan, tam ekran)
    if(document.hidden) J.native.bildir({id:nid(key), baslik:title, metin:body, tur: String(key).startsWith('call-') ? 'call' : 'order'}).catch(()=>{});
    return;
  }
  notified.add(key);
  if(!document.hidden || J.notifPermission() !== 'granted') return;
  const opts = {body, icon:'ikonlar/ikon-192.png', badge:'ikonlar/ikon-192.png', tag:key, renotify:true, vibrate:[200,100,200]};
  if(navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification(title, opts)).catch(()=>{});
  else { try{ new Notification(title, opts); }catch(e){} }
};
let wakeLock = null;
J.keepAwake = async function(on){
  try{
    if(on && !wakeLock && navigator.wakeLock){ wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    if(!on && wakeLock){ await wakeLock.release(); wakeLock = null; }
  }catch(e){}
};
document.addEventListener('visibilitychange', () => { if(!document.hidden && J._wantAwake) J.keepAwake(true); });

/* ===================== TOAST ===================== */
J.toast = function(txt){
  let el = document.getElementById('jg-toast');
  if(!el){ el = document.createElement('div'); el.id = 'jg-toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = txt; el.style.display = 'block';
  clearTimeout(J._tt); J._tt = setTimeout(() => { el.style.display = 'none'; }, 3500);
};

/* ===================== HARİTA (Leaflet) ===================== */
J.Map = function(el, opts){
  opts = opts || {};
  const api = {ok:false, markers:{}, lines:{}, set(){}, remove(){}, line(){}, clearLine(){}, fit(){}, center(){}, invalidate(){}, onClick(){}};
  if(!window.L){ el.innerHTML = '<div class="nomap">Harita yüklenemedi</div>'; return api; }
  const map = L.map(el, {zoomControl:true, attributionControl:true, scrollWheelZoom:!!opts.wheel});
  map.fitBounds(J.homeBox ? J.homeBox() : [[J.BOX.minLat,J.BOX.minLng],[J.BOX.maxLat,J.BOX.maxLng]]);
  L.tileLayer(TILES, {maxZoom:19, subdomains:'abcd', attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>'}).addTo(map);
  const icon = (html, cls, label) => L.divIcon({className:'', html:`<div class="pin-ic ${cls||''}">${html}</div>${label?`<div class="pin-lbl">${J.esc(label)}</div>`:''}`, iconSize:[30,30], iconAnchor:[15,15]});
  api.ok = true; api.map = map;
  api.set = function(key, p, html, cls, label){
    if(!p || p.lat == null) return api.remove(key);
    const sig = html+'|'+cls+'|'+label;
    let m = api.markers[key];
    if(!m){ m = L.marker([p.lat,p.lng], {icon:icon(html,cls,label), zIndexOffset: cls && cls.includes('cour') ? 1000 : 0}).addTo(map); m._sig = sig; api.markers[key] = m; }
    else { m.setLatLng([p.lat,p.lng]); if(m._sig !== sig){ m.setIcon(icon(html,cls,label)); m._sig = sig; } }
  };
  api.remove = key => { if(api.markers[key]){ map.removeLayer(api.markers[key]); delete api.markers[key]; } };
  api.keep = keys => Object.keys(api.markers).forEach(k => { if(!keys.includes(k)) api.remove(k); });
  api.line = function(key, pts, color, dashed){
    const sig = pts.length + ':' + (pts[0]&&pts[0].lat) + ':' + (pts[pts.length-1]&&pts[pts.length-1].lat);
    if(api.lines[key] && api.lines[key]._sig === sig) return;
    api.clearLine(key);
    api.lines[key] = L.polyline(pts.map(p => [p.lat,p.lng]), {color, weight:5, opacity:.8, dashArray: dashed ? '6 6' : null}).addTo(map);
    api.lines[key]._sig = sig;
  };
  api.clearLine = key => { if(api.lines[key]){ map.removeLayer(api.lines[key]); delete api.lines[key]; } };
  api.fit = function(points, maxZoom){ const ps = points.filter(p => p && p.lat != null); if(!ps.length) return; if(ps.length===1) map.setView([ps[0].lat,ps[0].lng], maxZoom||16); else map.fitBounds(ps.map(p => [p.lat,p.lng]), {padding:[30,30], maxZoom:maxZoom||17}); };
  api.center = (p, z) => { if(p && p.lat != null) map.setView([p.lat,p.lng], z || map.getZoom(), {animate:false}); };
  api.invalidate = () => map.invalidateSize(false);
  api.onClick = cb => map.on('click', e => cb({lat:e.latlng.lat, lng:e.latlng.lng}));
  return api;
};

/* ===================== GERÇEK SESLİ ARAMA (WebRTC) =====================
   Ses doğrudan iki cihaz arasında akar. Bağlantı bilgisi (SDP) arama kaydı üzerinden değiş tokuş edilir.
   Bağlanamazsa çalma, kayıt ve ikaz kuralları yine çalışır. */
const RTC = J.RTC = {pc:null, stream:null, callId:null, role:null, audioEl:null, state:'', applied:false, needTap:false, path:'', speaker:false, nativeAudio:false};
function rtcAudio(){
  if(!RTC.audioEl){ RTC.audioEl = document.createElement('audio'); RTC.audioEl.autoplay = true; RTC.audioEl.setAttribute('playsinline',''); RTC.audioEl.setAttribute('webkit-playsinline',''); document.body.appendChild(RTC.audioEl); }
  return RTC.audioEl;
}
// Kullanıcı dokunuşu sırasında çağrılır: telefonun ses çalma kilidini açar
function unlockAudio(){ const a = rtcAudio(); a.muted = false; a.volume = 1; try{ const p = a.play(); if(p) p.catch(()=>{}); }catch(e){} audio(); }
function playRemote(){
  const a = rtcAudio(); a.muted = false; a.volume = 1;
  const p = a.play();
  if(p) p.then(() => { RTC.needTap = false; emit({}); }).catch(() => { RTC.needTap = true; emit({}); });
}
J.tapAudio = () => playRemote();
// Aktarma (TURN) sunucuları: config.js + yönetim panelinden girilenler
J.parseIce = function(txt){
  txt = String(txt||'').trim(); if(!txt) return [];
  try{ const j = JSON.parse(txt); return (Array.isArray(j) ? j : (j.iceServers ? [].concat(j.iceServers) : [j])).filter(x => x && x.urls); }catch(e){}
  const out = [];
  (txt.match(/\{[^{}]*\}/g) || []).forEach(b => {
    const u = b.match(/urls\s*:\s*(\[[^\]]*\]|"[^"]*"|'[^']*')/), un = b.match(/username\s*:\s*["']([^"']*)["']/), cr = b.match(/credential\s*:\s*["']([^"']*)["']/);
    if(!u) return;
    const urls = u[1].startsWith('[') ? (u[1].match(/["']([^"']+)["']/g)||[]).map(x => x.slice(1,-1)) : u[1].slice(1,-1);
    const o = {urls}; if(un) o.username = un[1]; if(cr) o.credential = cr[1];
    out.push(o);
  });
  return out;
};
J.iceServers = function(){
  const base = CFG.iceServers || [{urls:'stun:stun.l.google.com:19302'}];
  const extra = (J.settings().turn || []);
  return base.concat(extra);
};
J.hasTurn = () => J.iceServers().some(s => [].concat(s.urls).some(u => /^turns?:/.test(u)));
function candTypes(sdp){ const t = {}; (String(sdp||'').match(/ typ (host|srflx|prflx|relay)/g) || []).forEach(m => { const k = m.slice(5); t[k] = (t[k]||0)+1; }); return t; }
async function reportPath(){
  const pc = RTC.pc, id = RTC.callId; if(!pc || !id) return;
  try{
    const stats = await pc.getStats(); let pair = null; const byId = {};
    stats.forEach(r => { byId[r.id] = r; if(r.type==='transport' && r.selectedCandidatePairId) pair = r.selectedCandidatePairId; });
    if(!pair) stats.forEach(r => { if(r.type==='candidate-pair' && (r.selected || r.nominated) && r.state==='succeeded') pair = r.id; });
    const p = pair && byId[pair], lc = p && byId[p.localCandidateId], rc = p && byId[p.remoteCandidateId];
    const types = [lc && lc.candidateType, rc && rc.candidateType];
    RTC.path = types.includes('relay') ? 'aktarma' : types.includes('srflx') || types.includes('prflx') ? 'internet üzerinden doğrudan' : types[0] ? 'aynı ağ' : '';
  }catch(e){}
  const field = RTC.role === 'caller' ? 'diag_arayan' : 'diag_aranan';
  DB.patch('calls', id, {[field]: {state: RTC.state, path: RTC.path, cands: candTypes(pc.localDescription && pc.localDescription.sdp), turn: J.hasTurn(), ua: navigator.userAgent.slice(0,80)}});
}
function waitIce(pc, ms){ return new Promise(res => { if(pc.iceGatheringState === 'complete') return res(); const t = setTimeout(res, ms); pc.addEventListener('icegatheringstatechange', () => { if(pc.iceGatheringState === 'complete'){ clearTimeout(t); res(); } }); }); }
async function rtcSetup(callId, role){
  rtcClose();
  RTC.callId = callId; RTC.role = role; RTC.applied = false; RTC.state = 'mikrofon';
  if(!window.RTCPeerConnection || !navigator.mediaDevices){ RTC.state = 'desteklenmiyor'; return false; }
  try{ RTC.stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}, video:false}); }
  catch(e){ RTC.state = 'mikrofon-yok'; emit({}); return false; }
  if(J.native){ try{ const r = await J.native.aramaBasladi({hoparlor:false}); RTC.speaker = !!(r && r.hoparlor); RTC.nativeAudio = true; }catch(e){} }
  const pc = RTC.pc = new RTCPeerConnection({iceServers: J.iceServers()});
  RTC.stream.getTracks().forEach(t => pc.addTrack(t, RTC.stream));
  pc.ontrack = e => { const a = rtcAudio(); a.srcObject = e.streams[0] || new MediaStream([e.track]); playRemote(); };
  pc.onconnectionstatechange = () => {
    RTC.state = pc.connectionState; emit({});
    if(pc.connectionState === 'connected'){ playRemote(); reportPath(); }
    if(pc.connectionState === 'failed') reportPath();
  };
  pc.oniceconnectionstatechange = () => { if(pc.iceConnectionState === 'failed' && RTC.state !== 'failed'){ RTC.state = 'failed'; emit({}); reportPath(); } };
  RTC.state = 'hazirlaniyor';
  return true;
}
function rtcClose(){
  try{ RTC.pc && RTC.pc.close(); }catch(e){}
  try{ RTC.stream && RTC.stream.getTracks().forEach(t => t.stop()); }catch(e){}
  try{ if(RTC.audioEl){ RTC.audioEl.pause(); RTC.audioEl.srcObject = null; } }catch(e){}
  if(RTC.nativeAudio && J.native){ J.native.aramaBitti().catch(()=>{}); }
  if(RTC.callId) J.cancelNotify('call-'+RTC.callId);
  RTC.pc = null; RTC.stream = null; RTC.callId = null; RTC.state = ''; RTC.applied = false; RTC.needTap = false; RTC.path = ''; RTC.speaker = false; RTC.nativeAudio = false;
}
J.toggleSpeaker = async function(){
  if(!J.native) return;
  try{ const r = await J.native.hoparlor({acik: !RTC.speaker}); RTC.speaker = !!r.hoparlor; }catch(e){}
  emit({});
};
J.rtcStateText = function(){
  return ({mikrofon:'Mikrofon izni bekleniyor…', 'mikrofon-yok':'Mikrofon izni verilmedi · sadece arama kaydı', desteklenmiyor:'Bu tarayıcı sesli aramayı desteklemiyor', hazirlaniyor:'Ses bağlantısı hazırlanıyor…', new:'Ses bağlanıyor…', connecting:'Ses bağlanıyor…', connected:'🔊 Ses bağlı' + (RTC.path ? ' · ' + RTC.path : ''), disconnected:'Ses koptu, yeniden deneniyor…', failed: J.hasTurn() ? 'Ses bağlanamadı · arama kaydı tutuluyor' : 'Ses bağlanamadı: ağ doğrudan bağlantıya izin vermiyor (aktarma sunucusu gerekli) · arama kaydı tutuluyor', closed:''})[RTC.state] || '';
};
J.startCall = async function(from, to, orderId){
  unlockAudio();
  const o = DB.get('orders', orderId);
  if(!o || o.state !== 'aktif'){ J.toast('Arama sadece aktif sipariş varken yapılabilir.'); return; }
  if(J.calls().some(k => (k.state==='caliyor'||k.state==='gorusme') && J.now()-k.start < 15*60000 && [k.from,k.to].some(p => p.type===from.type && p.id===from.id))) return;
  const id = J.uid('k');
  const call = {id, order_id:orderId, no:o.no, from, to, start:J.now(), state:'caliyor'};
  if(from.type==='isletme' && to.type==='musteri') J.pendingCallbacks(from.id).filter(k => k.order_id===orderId).forEach(k => DB.patch('calls', k.id, {cb_done:true}));
  DB.put('calls', id, call);
  J.log(`${J.partyName(from)} → ${J.partyName(to)} arıyor (#${o.no}).`, 'call', orderId);
  if(await rtcSetup(id, 'caller')){
    const pc = RTC.pc;
    await pc.setLocalDescription(await pc.createOffer());
    await waitIce(pc, J.hasTurn() ? 5000 : 3500);
    if(RTC.callId === id) DB.patch('calls', id, {offer_sdp: pc.localDescription.sdp});
  }
};
J.answerCall = async function(call){
  unlockAudio(); J.cancelNotify('call-'+call.id);
  DB.patch('calls', call.id, {state:'gorusme', answered_at:J.now()});
  J.log(`${J.partyName(call.to)} aramayı açtı.`, 'call', call.order_id);
  if(await rtcSetup(call.id, 'callee')) J.rtcTick();
};
J.declineCall = call => { J.cancelNotify('call-'+call.id); DB.patch('calls', call.id, {state:'reddedildi', end:J.now()}); afterMiss(Object.assign({}, call, {state:'reddedildi'})); rtcClose(); };
J.endCall = call => {
  const st = call.state === 'caliyor' ? 'iptal' : 'bitti';
  DB.patch('calls', call.id, {state:st, end:J.now()});
  J.log(st==='iptal' ? 'Arayan aramayı iptal etti.' : 'Görüşme bitti.', 'call', call.order_id);
  rtcClose();
};
function afterMiss(call){
  J.log(`${J.partyName(call.to)} aramayı ${call.state==='cevapsiz'?'açmadı':'reddetti'}.`, 'bad', call.order_id);
  if(call.to.type==='isletme' && call.from.type==='musteri'){
    DB.patch('calls', call.id, {cb_deadline: J.now() + J.D(J.CALLBACK_MS)});
    J.log(`${J.partyName(call.to)}: süre içinde müşteriyi geri aramazsa ikaz alacak.`, 'warn', call.order_id);
  }
}
// Arayan cihaz: çalma süresi dolunca cevapsız; her iki taraf: SDP değişimini tamamla, kapanınca temizle
J.callTick = function(me){
  const t = J.now();
  J.calls().forEach(k => {
    if(k.state==='caliyor' && isMe(k.from, me) && t - k.start > J.RING_MS){ DB.patch('calls', k.id, {state:'cevapsiz', end:t}); afterMiss(Object.assign({}, k, {state:'cevapsiz'})); if(RTC.callId===k.id) rtcClose(); }
  });
  if(RTC.callId){ const k = DB.get('calls', RTC.callId); if(!k || ['bitti','iptal','cevapsiz','reddedildi'].includes(k.state)) rtcClose(); }
  J.rtcTick();
};
J.rtcTick = async function(){
  const k = RTC.callId && DB.get('calls', RTC.callId); if(!k || !RTC.pc || RTC.applied) return;
  const pc = RTC.pc;
  try{
    if(RTC.role==='caller' && k.answer_sdp && !pc.currentRemoteDescription){ RTC.applied = true; await pc.setRemoteDescription({type:'answer', sdp:k.answer_sdp}); }
    if(RTC.role==='callee' && k.offer_sdp && !pc.currentRemoteDescription){
      RTC.applied = true;
      await pc.setRemoteDescription({type:'offer', sdp:k.offer_sdp});
      await pc.setLocalDescription(await pc.createAnswer());
      await waitIce(pc, J.hasTurn() ? 5000 : 3500);
      if(RTC.callId === k.id) DB.patch('calls', k.id, {answer_sdp: pc.localDescription.sdp});
    }
  }catch(e){ console.warn('RTC', e); RTC.state = 'failed'; emit({}); }
};
function isMe(p, me){ return p && me && p.type===me.type && p.id===me.id; }
J.isMe = isMe;
// Arama arayüzü: me = {type, id}
J.callOverlay = function(me){
  const t = J.now();
  const inc = J.calls().find(k => k.state==='caliyor' && isMe(k.to, me) && t - k.start < J.RING_MS);
  if(inc){
    J.alarm('ring', true, 'ring', 2000);
    J.notify('call-'+inc.id, 'Gelen arama', J.partyName(inc.from));
    return `<div class="overlay"><div class="callbox"><div class="ring call-ic">${J.ic('phone-call',30)}</div><div class="small dim">Uygulama içi sesli arama · Sipariş #${J.esc(inc.no)}</div><div class="who">${J.esc(J.partyName(inc.from))}</div><div class="small dim">Çalıyor · <span data-live="down" data-end="${inc.start+J.RING_MS}">${J.secs(inc.start+J.RING_MS-t)}</span> sn</div><div class="btns center"><button class="bad" data-call="decline" data-id="${inc.id}">Reddet</button><button class="ok" data-call="answer" data-id="${inc.id}">Aç</button></div></div></div>`;
  }
  J.alarm('ring', false);
  J.calls().forEach(k => { if(k.state !== 'caliyor' && isMe(k.to, me) && notified.has('call-'+k.id) && !k._iptalEdildi){ k._iptalEdildi = true; J.cancelNotify('call-'+k.id); } });
  const act = J.calls().find(k => ((k.state==='gorusme') && (isMe(k.from,me)||isMe(k.to,me))) || (k.state==='caliyor' && isMe(k.from,me) && t-k.start < J.RING_MS+5000));
  if(act){
    const other = isMe(act.from, me) ? act.to : act.from;
    const txt = act.state==='caliyor' ? `Aranıyor… <span data-live="up" data-start="${act.start}">0</span> sn` : `Görüşmede · <span data-live="up" data-start="${act.answered_at}">0</span> sn`;
    return `<div class="overlay"><div class="callbox"><div class="call-ic">${J.ic('headphones',28)}</div><div class="small dim">İnternet üzerinden · numaralar gizli</div><div class="who">${J.esc(J.partyName(other))}</div><div class="small">${txt}</div><div class="small dim" style="margin-top:4px">${J.esc(J.rtcStateText())}</div><div class="btns center">${RTC.needTap?`<button class="ok" data-call="unmute" data-id="${act.id}">${J.ic('volume-2',16)} Sesi aç</button>`:''}${J.native && RTC.nativeAudio?`<button class="sec" data-call="speaker" data-id="${act.id}">${RTC.speaker?J.ic('smartphone',16)+' Ahizeye al':J.ic('volume-2',16)+' Hoparlör'}</button>`:''}<button class="bad" data-call="end" data-id="${act.id}">Kapat</button></div></div></div>`;
  }
  return '';
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-call]'); if(!b) return;
  const k = DB.get('calls', b.dataset.id); if(!k) return;
  if(b.dataset.call==='answer') J.answerCall(k);
  if(b.dataset.call==='decline') J.declineCall(k);
  if(b.dataset.call==='end') J.endCall(k);
  if(b.dataset.call==='unmute') J.tapAudio();
  if(b.dataset.call==='speaker') J.toggleSpeaker();
});

/* ===================== HESAPLAR VE TEST VERİSİ =====================
   PROTOTİP GİRİŞİ: kullanıcı adı ve şifre kayıtta düz metin durur ve veritabanı herkese açıktır.
   Bu gerçek bir güvenlik DEĞİLDİR; sadece test hesaplarını ayırmak içindir. Gerçek şifre kullanmayın.
   Gerçek kullanımdan önce Supabase Auth + satır güvenlik kuralları ile değiştirilmelidir. */
J.norm = u => String(u||'').trim().toLocaleLowerCase('tr');
J.findLogin = (tbl, user) => DB.rows(tbl).find(r => r.login && J.norm(r.login.user) === J.norm(user));
J.userTaken = user => ['businesses','couriers','customers'].some(t => J.findLogin(t, user));
J.login = function(tbl, user, pass){
  const r = J.findLogin(tbl, user);
  if(!r) return {error:'Bu kullanıcı adı bulunamadı.'};
  if(String(r.login.pass) !== String(pass||'')) return {error:'Şifre yanlış.'};
  return {id:r.id};
};
// [tür, simge, ücretsiz teslimat, [[ürün, fiyat, açıklama, kategori], ...]]
const TEST_SHOPS = [
  ['Pideci','🫓',false,[['Kıymalı Pide',280,'Dana kıyma, soğan, biber, maydanoz','Pideler'],['Kaşarlı Pide',250,'Bol kaşar, tereyağı','Pideler'],['Kuşbaşılı Pide',340,'Dana kuşbaşı, domates, biber','Pideler'],['Lahmacun',110,'İnce hamur, acılı kıyma, yeşillik ile','Lahmacun'],['Ayran',45,'300 ml','İçecekler']]],
  ['Kebapçı','🍢',false,[['Adana Dürüm',320,'Acılı Adana, lavaş, soğan, sumak','Dürümler'],['Urfa Porsiyon',380,'Acısız kebap, közlenmiş domates ve biber, pilav','Porsiyonlar'],['Tavuk Şiş',300,'Marine tavuk göğsü, pilav, salata','Porsiyonlar'],['Şalgam',50,'Acılı veya acısız','İçecekler']]],
  ['Çorbacı','🍲',true,[['Mercimek Çorbası',150,'Limon ve kıtır ekmek ile','Çorbalar'],['İşkembe Çorbası',190,'Sarımsak ve sirke ayrı','Çorbalar'],['Ezogelin',150,'Bulgur, mercimek, nane','Çorbalar'],['Ekmek',15,'Günlük taze','Ekstralar']]],
  ['Market','🛒',false,[['Süt 1 L',42.5,'Tam yağlı','Süt ve kahvaltılık'],['Yumurta 10\'lu',79,'Büyük boy','Süt ve kahvaltılık'],['Beyaz Peynir 500 g',189.9,'Tam yağlı inek peyniri','Süt ve kahvaltılık'],['Ekmek',15,'Somun','Fırın'],['Su 1,5 L',14.5,'Doğal kaynak suyu','İçecek']]],
  ['Burgerci','🍔',false,[['Klasik Burger',290,'120 g dana köfte, marul, domates, turşu','Burgerler'],['Cheeseburger',320,'120 g dana köfte, cheddar, karamelize soğan','Burgerler'],['Patates Kızartması',90,'Orta boy','Yanlar'],['Kola',60,'330 ml','İçecekler']]],
  ['Kahveci','☕',true,[['Türk Kahvesi',80,'Lokum ile','Sıcak kahveler'],['Filtre Kahve',95,'Günün çekirdeği','Sıcak kahveler'],['Latte',120,'Çift shot espresso, süt','Sıcak kahveler'],['Kurabiye',60,'Çikolata parçacıklı','Atıştırmalık']]],
  ['Tatlıcı','🍰',false,[['Sütlaç',120,'Fırında, fındıklı','Sütlü tatlılar'],['Kazandibi',130,'Geleneksel tarif','Sütlü tatlılar'],['Baklava (porsiyon)',220,'Antep fıstıklı, 4 dilim','Şerbetli tatlılar'],['Çay',25,'İnce belli bardak','İçecekler']]],
  ['Dönerci','🌯',false,[['Tavuk Döner Dürüm',190,'Lavaş, patates, turşu, özel sos','Dürümler'],['Et Döner Dürüm',260,'Yaprak et döner, domates, soğan','Dürümler'],['İskender',380,'Tereyağı, yoğurt, domates sosu','Porsiyonlar'],['Ayran',45,'300 ml','İçecekler']]],
  ['Manav','🥬',false,[['Domates 1 kg',39.9,'Mevsim domatesi','Sebze'],['Salatalık 1 kg',34.9,'Çengelköy','Sebze'],['Elma 1 kg',44.9,'Amasya','Meyve'],['Muz 1 kg',89.9,'Yerli','Meyve']]],
];
const testMenu = (id, menu, old) => menu.map((m,k) => {
  const prev = (old||[]).find(x => x.name === m[0]);
  return {id: prev ? prev.id : id+'m'+k, name:m[0], price:m[1], desc:m[2]||'', cat:m[3]||'', available: prev ? prev.available !== false : true};
});
// Tür → kategori grubu (müşteri uygulamasındaki filtreler)
J.KIND_GROUP = {Pideci:'Yemek', 'Kebapçı':'Yemek', 'Çorbacı':'Yemek', Burgerci:'Yemek', 'Dönerci':'Yemek', Market:'Market', Manav:'Market', Kahveci:'Kahve & Tatlı', 'Tatlıcı':'Kahve & Tatlı'};
J.KIND_COLOR = {Pideci:'#f4a261', 'Kebapçı':'#e76f51', 'Çorbacı':'#e9b949', Market:'#2a9d8f', Burgerci:'#f77f00', Kahveci:'#8d6e63', 'Tatlıcı':'#e88aa3', 'Dönerci':'#c8553d', Manav:'#52b788'};
J.KIND_ICON = {Pideci:'pizza', 'Kebapçı':'beef', 'Çorbacı':'soup', Market:'shopping-cart', Burgerci:'sandwich', Kahveci:'coffee', 'Tatlıcı':'cake-slice', 'Dönerci':'drumstick', Manav:'carrot'};
J.GROUP_ICON = {Yemek:'utensils', Market:'shopping-cart', 'Kahve & Tatlı':'coffee'};
J.bizIcon = (b, size) => J.ic(J.KIND_ICON[b && b.kind] || J.GROUP_ICON[J.bizGroup(b||{})] || 'store', size);
J.bizGroup = b => J.KIND_GROUP[b.kind] || 'Yemek';
J.bizColor = b => J.KIND_COLOR[b.kind] || '#e8590c';
// Tahmini teslim süresi (dk): ortalama hazırlık + yol
J.etaRange = function(b, to){
  const ride = isFinite(J.dist(b,to)) ? J.dist(b,to)*1.3/J.M_PER_MIN : 10;
  const lo = Math.max(15, Math.round((12 + ride)/5)*5);
  return [lo, lo+10];
};
const GRID = [[40.9830,29.0265],[40.9830,29.0305],[40.9830,29.0345],[40.9868,29.0265],[40.9868,29.0305],[40.9868,29.0345],[40.9903,29.0265],[40.9903,29.0305],[40.9903,29.0345]];
// Eksik test hesaplarını oluşturur; var olanların durumuna dokunmaz (reset=true ise baştan kurar).
J.ensureTestAccounts = function(reset){
  let made = 0;
  TEST_SHOPS.forEach(([kind, emoji, free, menu], i) => {
    const n = i+1, id = 'b_test'+n;
    const cur = DB.get('businesses', id);
    if(!reset && cur){
      // Eski kayıtları yeni menü (açıklama, kategori) ve tür bilgisiyle güncelle
      if(!cur.kind || !(cur.menu||[]).some(m => m.cat)) DB.patch('businesses', id, {kind, menu: testMenu(id, menu, cur.menu)});
      return;
    }
    DB.put('businesses', id, {name:`Test${n} · ${kind}`, kind, emoji, lat:GRID[i][0], lng:GRID[i][1], open:false, free_delivery:free, suspended:false, notif_ok:false, strikes:[],
      login:{user:'test'+n, pass:'test'}, menu: testMenu(id, menu, null)});
    made++;
  });
  for(let n=1; n<=9; n++){
    const id = 'c_'+n+'test';
    if(!reset && DB.get('couriers', id)) continue;
    const g = GRID[(n+3)%9];
    DB.put('couriers', id, {name:`Kurye ${n}`, online:false, notif_ok:false, lat:g[0]+0.0012, lng:g[1]-0.0010, busy:null, earnings:0, jobs:[], login:{user:n+'test', pass:'test'}});
    made++;
  }
  if(reset || !DB.get('customers','m_test')){ DB.put('customers', 'm_test', {name:'Test Müşteri', note:'Test adresi', lat:J.DEFAULT_POS.lat, lng:J.DEFAULT_POS.lng, login:{user:'test', pass:'test'}}); made++; }
  if(!DB.get('settings','ayar')) DB.put('settings', 'ayar', {fast:true});
  if(made) J.log(reset ? 'Test hesapları sıfırlandı.' : `Test hesapları oluşturuldu (${made} kayıt).`, 'ok');
};
J.seedDemo = () => J.ensureTestAccounts(false);
// Test dükkânlarını, kuryelerini ve müşterisini verilen noktanın çevresine taşır (aynı yerleşim düzeniyle)
J.relocateTests = function(center){
  const c0 = {lat:40.9868, lng:29.0305};
  const dLat = center.lat - c0.lat, dLng = center.lng - c0.lng;
  let n = 0;
  DB.rows('businesses').filter(b => /^b_test\d$/.test(b.id)).forEach(b => {
    const i = +b.id.slice(6) - 1; DB.patch('businesses', b.id, {lat:GRID[i][0]+dLat, lng:GRID[i][1]+dLng}); n++;
  });
  DB.rows('couriers').filter(c => /^c_\dtest$/.test(c.id)).forEach(c => {
    const k = +c.id.slice(2,3); const g = GRID[(k+3)%9];
    if(!c.busy) DB.patch('couriers', c.id, {lat:g[0]+0.0012+dLat, lng:g[1]-0.0010+dLng}); n++;
  });
  const mt = DB.get('customers','m_test');
  if(mt && mt.loc_src !== 'gps' && mt.loc_src !== 'harita') DB.patch('customers', 'm_test', {lat:40.9840+dLat, lng:29.0335+dLng});
  if(mt && /Moda Cd\./.test(mt.note||'')) DB.patch('customers', 'm_test', {note:'Test adresi'});
  if(DB.get('settings','ayar')) DB.patch('settings','ayar',{center}); else DB.put('settings','ayar',{fast:true, center});
  J.log(`Test hesapları yeni konuma taşındı (${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}).`, 'ok');
  return n;
};
// Gerçek konum test dükkânlarından 5 km'den uzaksa test hesaplarını otomatik olarak o çevreye taşır
J.autoRelocate = function(pos){
  if(!pos || pos.lat == null || J._autoRel) return false;
  const tests = DB.rows('businesses').filter(b => /^b_test\d$/.test(b.id));
  if(!tests.length || tests.some(b => J.dist(b, pos) < 5000)) return false;
  J._autoRel = true;
  J.relocateTests({lat:pos.lat, lng:pos.lng});
  J.toast('Test dükkânları senin çevrene taşındı.');
  return true;
};
// Haritanın ilk açılışta göstereceği bölge: test hesapları taşındıysa orası, değilse Moda
J.homeBox = function(){
  const c = (J.settings() || {}).center;
  if(!c) return [[J.BOX.minLat,J.BOX.minLng],[J.BOX.maxLat,J.BOX.maxLng]];
  return [[c.lat-0.0078, c.lng-0.0100],[c.lat+0.0067, c.lng+0.0090]];
};
document.addEventListener('keydown', e => { if(e.key==='Enter' && (e.target.id==='l-pass' || e.target.id==='l-user')){ const b = document.querySelector('[data-a="login"]'); if(b) b.click(); } });
// Ortak giriş formu
J.loginForm = function(o){
  return `<div class="card"><h3>${o.title}</h3><div class="small muted">${o.sub||''}</div>
    <label class="f" for="l-user">Kullanıcı adı</label><input id="l-user" autocomplete="username" autocapitalize="none" placeholder="${J.esc(o.ph||'')}">
    <label class="f" for="l-pass">Şifre</label><input id="l-pass" type="password" autocomplete="current-password">
    ${o.err?`<div class="small" style="color:var(--bad);margin-top:8px">${J.esc(o.err)}</div>`:''}
    <button class="brand wide" style="margin-top:12px" data-a="login">Giriş yap</button>
    <div class="note">Test hesapları: ${o.hint} · şifre: <b>test</b></div></div>`;
};

/* ===================== ORTAK SAYFA İSKELETİ ===================== */
J.modeBadge = function(){
  return (J.native ? '<span class="pill blue" title="Android uygulaması: ahize, kilitli ekranda bildirim, arka plan GPS">' + J.ic('smartphone',12) + ' Uygulama</span> ' : '') + modeBadge2();
};
function modeBadge2(){
  if(DB.mode === 'demo') return `<span class="pill warn" title="Veriler sadece bu cihazda">Demo modu · bu cihaz</span>`;
  const s = DB.status;
  return s === 'bagli' ? `<span class="pill ok">● Canlı · bağlı</span>` : s === 'hata' ? `<span class="pill bad" title="${J.esc(DB.lastError||'')}">Canlı · bağlantı hatası</span>` : `<span class="pill warn">Canlı · bağlanıyor…</span>`;
}
J.live = function(){
  const t = J.now();
  document.querySelectorAll('[data-live]').forEach(el => {
    const k = el.dataset.live;
    if(k==='down') el.textContent = J.secs(+el.dataset.end - t);
    if(k==='mmss') el.textContent = J.mmss(+el.dataset.end - t);
    if(k==='mdown') el.textContent = Math.max(0, Math.ceil((+el.dataset.end - t) / J.minMs()));
    if(k==='up') el.textContent = J.secs(t - +el.dataset.start);
  });
};
// Yeniden çizimde odak ve kaydırma korunur
J.render = function(el, html){
  const act = document.activeElement, id = act && act.id, sel = act && act.selectionStart, sc = el.scrollTop;
  el.innerHTML = html; el.scrollTop = sc;
  J.live();
  if(id){ const n = document.getElementById(id); if(n){ n.focus(); try{ n.setSelectionRange(sel,sel); }catch(e){} } }
};
J.registerSW = function(){
  if('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
};
J.qr = function(seed){
  let h = 0; for(const ch of String(seed)+'jetgel') h = (h*31 + ch.charCodeAt(0)) >>> 0;
  let s = '<rect width="21" height="21" fill="#fff"/>';
  const f = (x,y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#1d1b18"/><rect x="${x+1}" y="${y+1}" width="5" height="5" fill="#fff"/><rect x="${x+2}" y="${y+2}" width="3" height="3" fill="#1d1b18"/>`;
  s += f(0,0)+f(14,0)+f(0,14);
  for(let y=0;y<21;y++) for(let x=0;x<21;x++){ if((x<8&&y<8)||(x>12&&y<8)||(x<8&&y>12)) continue; h = (h*1103515245+12345)>>>0; if(h & 0x10000) s += `<rect x="${x}" y="${y}" width="1" height="1" fill="#1d1b18"/>`; }
  return `<svg class="qr" viewBox="0 0 21 21">${s}</svg>`;
};
})();
