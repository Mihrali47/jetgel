-- Jetgel prototip veritabanı kurulumu
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını yapıştır > Run
-- Birden fazla kez çalıştırmak güvenlidir.

-- Tüm kayıtlar (işletmeler, kuryeler, siparişler, aramalar, olaylar, ayarlar) tek tabloda tutulur.
create table if not exists public.kayitlar (
  tbl        text        not null,
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tbl, id)
);

alter table public.kayitlar enable row level security;
alter table public.kayitlar replica identity full;

-- PROTOTİP POLİTİKASI: herkes okuyup yazabilir. Gerçek kullanıma geçmeden önce
-- kullanıcı girişi ve rol bazlı kurallarla değiştirilmelidir.
drop policy if exists "prototip_herkes" on public.kayitlar;
create policy "prototip_herkes" on public.kayitlar
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.kayitlar to anon, authenticated;

-- Bir kaydın sadece verilen alanlarını günceller (aynı anda farklı cihazların
-- farklı alanları değiştirmesi birbirini ezmesin diye).
create or replace function public.jg_patch(p_tbl text, p_id text, p_patch jsonb)
returns jsonb language sql security invoker as $$
  update public.kayitlar
     set data = data || p_patch, updated_at = now()
   where tbl = p_tbl and id = p_id
  returning data;
$$;

-- Bir işi yalnızca bir cihazın yapmasını sağlar (ör. ikazın iki kez uygulanmaması).
create or replace function public.jg_claim(p_tbl text, p_id text, p_field text)
returns boolean language plpgsql security invoker as $$
declare n int;
begin
  update public.kayitlar
     set data = data || jsonb_build_object(p_field, true), updated_at = now()
   where tbl = p_tbl and id = p_id and not (data ? p_field);
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

grant execute on function public.jg_patch(text, text, jsonb) to anon, authenticated;
grant execute on function public.jg_claim(text, text, text) to anon, authenticated;

-- Canlı güncellemeler (realtime) için tabloyu yayına ekle.
do $$
begin
  alter publication supabase_realtime add table public.kayitlar;
exception when duplicate_object then null;
end $$;
