-- ============================================================
-- HelpFix — 0049_ai_chat.sql
-- Faz BK: Konuşma Tabanlı AI Asistan (requester'lar için çok turlu
-- sohbet — "Ask Zia" benzeri). Mevcut tek seferlik ai-assist
-- fonksiyonundan (triyaj/özet/taslak) farklı olarak, burada geçmişi
-- korunan gerçek bir sohbet oturumu var.
--
-- Gizlilik: bir kullanıcının sohbetleri SADECE kendisine açık — agent/
-- admin dahil kimse başkasının sohbetini göremez (kişisel destek
-- sohbeti gizliliği).
-- ============================================================

create table chat_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references user_profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_chat_conversations_user on chat_conversations(user_id);

create trigger trg_chat_conversations_touch
  before update on chat_conversations
  for each row execute function touch_updated_at();

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_incident_id uuid references incidents(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_chat_messages_conversation on chat_messages(conversation_id, created_at);

alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;

create policy chat_conversations_select on chat_conversations
  for select using (tenant_id = current_tenant_id() and user_id = current_profile_id());
create policy chat_conversations_insert on chat_conversations
  for insert with check (tenant_id = current_tenant_id() and user_id = current_profile_id());
create policy chat_conversations_update on chat_conversations
  for update using (tenant_id = current_tenant_id() and user_id = current_profile_id());
create policy chat_conversations_delete on chat_conversations
  for delete using (tenant_id = current_tenant_id() and user_id = current_profile_id());

create policy chat_messages_select on chat_messages
  for select using (
    exists (
      select 1 from chat_conversations c
      where c.id = chat_messages.conversation_id and c.user_id = current_profile_id() and c.tenant_id = current_tenant_id()
    )
  );
create policy chat_messages_insert on chat_messages
  for insert with check (
    exists (
      select 1 from chat_conversations c
      where c.id = chat_messages.conversation_id and c.user_id = current_profile_id() and c.tenant_id = current_tenant_id()
    )
  );
