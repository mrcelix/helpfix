-- ============================================================
-- HelpFix — 0054_emergency_change_fasttrack.sql
-- Faz BQ: ServiceNow analizinden kalan ITIL uyum düzeltmesi —
-- ACİL DEĞİŞİKLİK (Emergency Change) hızlı yolu.
--
-- ITIL'de Acil Değişiklik, bir Büyük Olayı çözmek için HEMEN
-- uygulanması gereken değişikliktir; "expedited, often retroactive"
-- (hızlandırılmış, çoğunlukla geriye dönük) bir onay akışına sahiptir
-- — uygulama onay beklemez, onay uygulamadan SONRA/PARALEL alınır.
-- 0053'teki düzeltme sadece Standart Değişikliği ele almıştı; Acil
-- Değişiklik hâlâ Normal değişiklikle aynı (bloklayıcı) CAB akışına
-- giriyordu. Bu migration bunu düzeltiyor:
--   - change_type='emergency' → submit anında status DOĞRUDAN
--     'approved' olur (implementasyon hemen başlayabilir).
--   - Denetim/hesap verebilirlik için YİNE DE bir 'cab' onay satırı
--     oluşturulur — ama artık BLOKLAYICI değil, geriye dönük
--     incelemek isteyen CAB üyeleri için "Onayımı Bekleyenler"
--     görünümünde belirir.
-- ============================================================

create or replace function create_change_approvals()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'submitted' and old.status is distinct from 'submitted' then
    delete from change_approvals where change_id = new.id and status = 'pending';

    if new.change_type = 'standard' then
      new.status := 'approved';
    elsif new.change_type = 'emergency' then
      insert into change_approvals (change_id, approval_type) values (new.id, 'cab');
      new.status := 'approved';
    else
      if new.risk_score >= 60 then
        insert into change_approvals (change_id, approval_type) values (new.id, 'technical_review');
      end if;
      insert into change_approvals (change_id, approval_type) values (new.id, 'cab');
      new.status := case when new.risk_score >= 60 then 'technical_review' else 'cab_review' end;
    end if;
  end if;
  return new;
end;
$$;
