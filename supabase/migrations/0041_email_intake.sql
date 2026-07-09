-- ============================================================
-- HelpFix — 0041_email_intake.sql
-- Faz AZ: Gerçek Omnichannel — e-posta → otomatik talep.
--
--   1) Her tenant'a benzersiz bir "gelen kutusu" adresi atanır
--      (ör. acme@tickets.helpfix.app). E-posta sağlayıcısı (Postmark/
--      Resend/Mailgun inbound parse) bu adrese gelen e-postaları
--      inbound-email Edge Function'ına webhook olarak iletir.
--   2) Bir talebin ilk e-postasının Message-ID'si saklanır
--      (email_message_id) — sonraki yanıtlar (In-Reply-To/References
--      eşleşirse) yeni talep açmak yerine mevcut talebe yorum olarak
--      eklenir (thread takibi).
--
-- NOT: Bu migration sadece veritabanı tarafını hazırlar. Gerçek
-- e-posta akışının çalışması için ayrıca (a) bir e-posta sağlayıcısında
-- inbound parse/webhook kurulumu ve (b) o sağlayıcının domain/DNS (MX)
-- ayarlarının yapılması gerekir — bunlar Supabase dışı, sağlayıcı
-- panelinden yapılan adımlardır.
-- ============================================================

alter table tenants add column inbound_email text unique;

-- Mevcut tüm tenant'lara slug bazlı varsayılan adres ata.
-- NOT: 'tickets.helpfix.app' yer tutucu bir alan adıdır — gerçek
-- kullanım için kendi alan adınızı e-posta sağlayıcınızda tanımlayıp
-- burayı ona göre güncelleyebilirsiniz (bkz. ai_quota/business_hours
-- gibi tek satırlık update ile).
update tenants set inbound_email = slug || '@tickets.helpfix.app' where inbound_email is null;

alter table tenants alter column inbound_email set not null;

-- Yeni tenant oluşturulduğunda otomatik adres ata.
create or replace function seed_inbound_email()
returns trigger
language plpgsql
as $$
begin
  if new.inbound_email is null then
    new.inbound_email := new.slug || '@tickets.helpfix.app';
  end if;
  return new;
end;
$$;

create trigger trg_seed_inbound_email
  before insert on tenants
  for each row execute function seed_inbound_email();

-- ------------------------------------------------------------
-- E-posta thread takibi — yanıtları mevcut talebe yorum olarak
-- eklemek için orijinal e-postanın Message-ID'sini saklıyoruz.
-- ------------------------------------------------------------
alter table incidents add column email_message_id text;

create unique index idx_incidents_email_message_id
  on incidents(email_message_id)
  where email_message_id is not null;
