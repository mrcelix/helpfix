-- ============================================================
-- HelpFix — 0058_update_inbound_email_domain.sql
-- Alan adı artık kesinleşti: helpfix.io. 0041'de yer tutucu olarak
-- kullanılan 'tickets.helpfix.app' yerine 'tickets.helpfix.io'
-- kullanılacak şekilde güncelleniyor — hem mevcut tenant kayıtları
-- hem de yeni tenant oluşturulduğunda çalışan tetikleyici.
--
-- NOT: Bu hâlâ bir yer tutucu — gerçek e-posta akışının çalışması
-- için Postmark/Resend/Mailgun gibi bir sağlayıcıda inbound parse
-- kurulumu ve tickets.helpfix.io için DNS (MX) ayarları hâlâ ayrıca
-- yapılması gereken, Supabase dışı adımlardır.
-- ============================================================

update tenants set inbound_email = slug || '@tickets.helpfix.io' where inbound_email like '%@tickets.helpfix.app';

create or replace function seed_inbound_email()
returns trigger
language plpgsql
as $$
begin
  if new.inbound_email is null then
    new.inbound_email := new.slug || '@tickets.helpfix.io';
  end if;
  return new;
end;
$$;
