/* Jetgel · Excel (.xlsx) ve CSV okuyucu
   Dış kütüphane yok: .xlsx bir zip dosyasıdır; tarayıcının kendi açıcısıyla (DecompressionStream) açılır,
   içindeki XML'den sayfalar ve hücreler okunur. Sonuç: {sayfaAdı: [[hücre, ...], ...]} */
(function(){
'use strict';
const J = window.J;

async function inflate(bytes){
  const ds = new DecompressionStream('deflate-raw');
  const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}
// Zip içindeki dosyaları {ad: Uint8Array} olarak döndürür (sadece istenenler açılır)
async function unzip(buf, want){
  const dv = new DataView(buf), u8 = new Uint8Array(buf);
  let eocd = -1;
  for(let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--){ if(dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; } }
  if(eocd < 0) throw new Error('Dosya bir Excel (.xlsx) dosyası değil.');
  const n = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const files = {};
  for(let k = 0; k < n; k++){
    if(dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const off = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if(!want(name)) continue;
    const ln = dv.getUint16(off + 26, true), lx = dv.getUint16(off + 28, true);
    const data = u8.subarray(off + 30 + ln + lx, off + 30 + ln + lx + csize);
    files[name] = method === 0 ? data : method === 8 ? await inflate(data) : null;
  }
  return files;
}
const xml = bytes => new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
const byTag = (node, tag) => Array.from(node.getElementsByTagNameNS('*', tag));
const textOf = node => byTag(node, 't').map(t => t.textContent).join('');
function colIdx(ref){ let n = 0; for(const ch of ref.replace(/\d+/g,'')) n = n*26 + (ch.charCodeAt(0) - 64); return n - 1; }

async function readXlsx(buf){
  const files = await unzip(buf, n => n === 'xl/workbook.xml' || n === 'xl/_rels/workbook.xml.rels' || n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/[^/]+\.xml$/.test(n));
  if(!files['xl/workbook.xml']) throw new Error('Excel dosyası okunamadı.');
  const shared = files['xl/sharedStrings.xml'] ? byTag(xml(files['xl/sharedStrings.xml']), 'si').map(textOf) : [];
  const rels = {};
  if(files['xl/_rels/workbook.xml.rels']) byTag(xml(files['xl/_rels/workbook.xml.rels']), 'Relationship').forEach(r => { rels[r.getAttribute('Id')] = r.getAttribute('Target'); });
  const out = {};
  byTag(xml(files['xl/workbook.xml']), 'sheet').forEach(s => {
    const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    let target = rels[rid] || ''; target = target.replace(/^\/?xl\//, '').replace(/^\//, '');
    const f = files['xl/' + target]; if(!f) return;
    const rows = [];
    byTag(xml(f), 'row').forEach(r => {
      const ri = (+r.getAttribute('r') || rows.length + 1) - 1;
      const row = rows[ri] = rows[ri] || [];
      byTag(r, 'c').forEach((c, i) => {
        const ref = c.getAttribute('r'), ci = ref ? colIdx(ref) : i, t = c.getAttribute('t');
        const v = byTag(c, 'v')[0];
        let val = null;
        if(t === 's') val = v ? shared[+v.textContent] : '';
        else if(t === 'inlineStr') val = textOf(c);
        else if(t === 'str' || t === 'e') val = v ? v.textContent : '';
        else if(t === 'b') val = v ? v.textContent === '1' : null;
        else if(v) val = Number(v.textContent);
        row[ci] = val;
      });
    });
    out[s.getAttribute('name')] = Array.from(rows, r => r || []);
  });
  return out;
}
// Basit CSV (; veya , ayraçlı, tırnaklı alanlar)
function readCsv(text){
  text = text.replace(/^﻿/, '');
  const first = text.split('\n')[0], sep = (first.match(/;/g)||[]).length >= (first.match(/,/g)||[]).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for(let i = 0; i < text.length; i++){
    const ch = text[i];
    if(q){ if(ch === '"'){ if(text[i+1] === '"'){ cur += '"'; i++; } else q = false; } else cur += ch; }
    else if(ch === '"') q = true;
    else if(ch === sep){ row.push(cur); cur = ''; }
    else if(ch === '\n' || ch === '\r'){ if(ch === '\r' && text[i+1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if(cur !== '' || row.length){ row.push(cur); rows.push(row); }
  return {'CSV': rows};
}
J.readSheetFile = async function(file){
  if(/\.csv$/i.test(file.name) || file.type === 'text/csv') return readCsv(await file.text());
  if(!('DecompressionStream' in window)) throw new Error('Bu tarayıcı Excel okuyamıyor. Dosyayı CSV olarak kaydedip yükleyin ya da Chrome kullanın.');
  return readXlsx(await file.arrayBuffer());
};

/* Şablondaki sütunlardan ürün listesi çıkarır.
   Desteklenen başlıklar: Ürün Adı, Kategori, Fiyat (TL) / Satış Fiyatı (TL), Açıklama, Birim / Gramaj, Durum, Barkod */
const norm = s => String(s == null ? '' : s).trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');
J.parsePrice = function(v){
  if(typeof v === 'number') return v;
  let s = String(v == null ? '' : v).replace(/[^\d.,]/g, '');
  if(s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g,'').replace(',', '.') : s.replace(/,/g,'');
  else s = s.replace(',', '.');
  return parseFloat(s);
};
J.productsFromSheets = function(sheets){
  const items = [], errors = [];
  let used = 0;
  Object.entries(sheets).forEach(([sname, rows]) => {
    const hi = rows.findIndex(r => (r||[]).some(c => norm(c) === 'ürün adı'));
    if(hi < 0) return;
    used++;
    const H = rows[hi].map(norm);
    const col = (...names) => H.findIndex(h => names.some(n => h === n || h.startsWith(n)));
    const cName = col('ürün adı'), cCat = col('kategori'), cPrice = col('fiyat (tl)', 'satış fiyatı', 'fiyat'), cDesc = col('açıklama'), cUnit = col('birim'), cStat = col('durum'), cBar = col('barkod'), cOpt = col('seçenekler');
    rows.slice(hi + 1).forEach((r, k) => {
      r = r || [];
      const name = String(r[cName] == null ? '' : r[cName]).trim();
      const rawPrice = cPrice >= 0 ? r[cPrice] : null;
      if(!name && (rawPrice == null || rawPrice === '')) return;   // boş satır
      const line = `${sname} · satır ${hi + k + 2}`;
      if(!name){ errors.push(`${line}: ürün adı boş`); return; }
      const price = J.parsePrice(rawPrice);
      if(!(price > 0)){ errors.push(`${line}: "${name}" için fiyat geçersiz`); return; }
      const unit = cUnit >= 0 && r[cUnit] != null ? String(r[cUnit]).trim() : '';
      const desc = [unit, cDesc >= 0 && r[cDesc] != null ? String(r[cDesc]).trim() : ''].filter(Boolean).join(' · ');
      const st = norm(cStat >= 0 ? r[cStat] : '');
      items.push({name: name.slice(0, 80), price: Math.round(price*100)/100, cat: cCat >= 0 && r[cCat] != null ? String(r[cCat]).trim().slice(0, 40) : '', desc: desc.slice(0, 160),
        available: !(st === 'tükendi' || st === 'tukendi' || st === 'hayır' || st === 'yok'), barcode: cBar >= 0 && r[cBar] != null ? String(r[cBar]).trim() : '',
        opts: cOpt >= 0 && r[cOpt] != null && J.parseOpts ? J.parseOpts(String(r[cOpt])) : []});
    });
  });
  if(!used) errors.unshift('Dosyada "Ürün Adı" başlıklı bir sütun bulunamadı. Lütfen Jetgel şablonunu kullanın.');
  return {items, errors};
};
// Şablondaki gri örnek satırların ürün adları (silinmeden yüklenirse uyarmak için)
J.TEMPLATE_EXAMPLES = new Set([["Tam Yağlı Süt", 42.5], ["Beyaz Peynir", 189.9], ["Yumurta", 79.0], ["Somun Ekmek", 15.0], ["Doğal Kaynak Suyu", 14.5], ["Domates", 39.9], ["Bulaşık Deterjanı", 64.9], ["Kâğıt Havlu", 119.0], ["Kıymalı Pide", 280.0], ["Kaşarlı Pide", 250.0], ["Lahmacun", 110.0], ["Mercimek Çorbası", 150.0], ["İşkembe Çorbası", 190.0], ["Sütlaç", 120.0], ["Ayran", 45.0], ["Şalgam", 50.0]].map(([n,p]) => norm(n) + "|" + p));
J.isTemplateExample = it => J.TEMPLATE_EXAMPLES.has(norm(it.name) + "|" + it.price) || /^86900000000\d\d$/.test(it.barcode||"");
// Yüklenen ürünleri mevcut menüyle birleştirir: aynı isimli ürün güncellenir, yenisi eklenir
J.mergeMenu = function(menu, items){
  const out = (menu||[]).map(m => Object.assign({}, m));
  let added = 0, updated = 0;
  items.forEach(it => {
    const m = out.find(x => norm(x.name) === norm(it.name));
    const clean = Object.assign({}, it); if(!(clean.opts||[]).length) delete clean.opts; if(!clean.barcode) delete clean.barcode;
    if(m){ Object.assign(m, {price:it.price, cat:it.cat || m.cat || '', desc:it.desc || m.desc || '', available:it.available}, it.barcode ? {barcode:it.barcode} : {}, (it.opts||[]).length ? {opts:it.opts} : {}); updated++; }
    else { out.push(Object.assign({id: J.uid('u')}, clean)); added++; }
  });
  return {menu: out, added, updated};
};
})();
