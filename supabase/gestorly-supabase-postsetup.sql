-- Gestorly — Supabase Post-Setup (RLS, policies, triggers, storage)
-- This script is idempotent and tailored to the schema you pasted.
-- It assumes the helper function public.is_member(uuid) already exists.

-- 0) Extensions
create extension if not exists pgcrypto;

-- 1) Enable RLS on all business tables
alter table if exists public.organizations  enable row level security;
alter table if exists public.org_members    enable row level security;
alter table if exists public.users_profile  enable row level security;
alter table if exists public.clients        enable row level security;
alter table if exists public.documents      enable row level security;
alter table if exists public.threads        enable row level security;
alter table if exists public.messages       enable row level security;
alter table if exists public.task_templates enable row level security;
alter table if exists public.tasks          enable row level security;
alter table if exists public.reminders      enable row level security;
alter table if exists public.filing_types   enable row level security;
alter table if exists public.filings        enable row level security;
alter table if exists public.notifications  enable row level security;
alter table if exists public.audit_logs     enable row level security;

-- 2) Policies (drop/create to be deterministic)

-- organizations: readable by members
drop policy if exists org_read on public.organizations;
create policy org_read on public.organizations
for select using (
  exists (
    select 1 from public.org_members m
    where m.org_id = organizations.id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

-- org_members: RW for members of their own orgs
drop policy if exists org_members_rw on public.org_members;
create policy org_members_rw on public.org_members
for all using (
  org_id in (select org_id from public.org_members where user_id = auth.uid())
)
with check (
  org_id in (select org_id from public.org_members where user_id = auth.uid())
);

-- users_profile: self + colleagues in same org
drop policy if exists users_profile_self on public.users_profile;
create policy users_profile_self on public.users_profile
for select using (id = auth.uid());

drop policy if exists users_profile_colleagues on public.users_profile;
create policy users_profile_colleagues on public.users_profile
for select using (
  exists (
    select 1
    from public.org_members m1
    join public.org_members m2 on m1.org_id = m2.org_id
    where m1.user_id = users_profile.id
      and m2.user_id = auth.uid()
      and m1.status = 'active' and m2.status = 'active'
  )
);

-- clients
drop policy if exists clients_rw on public.clients;
create policy clients_rw on public.clients
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- documents
drop policy if exists documents_rw on public.documents;
create policy documents_rw on public.documents
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- threads
drop policy if exists threads_rw on public.threads;
create policy threads_rw on public.threads
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- messages
drop policy if exists messages_rw on public.messages;
create policy messages_rw on public.messages
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- task_templates
drop policy if exists task_templates_rw on public.task_templates;
create policy task_templates_rw on public.task_templates
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- tasks
drop policy if exists tasks_rw on public.tasks;
create policy tasks_rw on public.tasks
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- reminders: check via the related task's org
drop policy if exists reminders_rw on public.reminders;
create policy reminders_rw on public.reminders
for all using (
  exists (
    select 1 from public.tasks t
    where t.id = reminders.task_id
      and public.is_member(t.org_id)
  )
)
with check (
  exists (
    select 1 from public.tasks t
    where t.id = reminders.task_id
      and public.is_member(t.org_id)
  )
);

-- filing_types: public reference (read), open write (adjust if needed)
drop policy if exists filing_types_r on public.filing_types;
create policy filing_types_r on public.filing_types
for select using ( true );

drop policy if exists filing_types_w on public.filing_types;
create policy filing_types_w on public.filing_types
for insert with check ( true );

-- filings
drop policy if exists filings_rw on public.filings;
create policy filings_rw on public.filings
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- notifications
drop policy if exists notifications_rw on public.notifications;
create policy notifications_rw on public.notifications
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- audit_logs: read-only for members
drop policy if exists audit_logs_r on public.audit_logs;
create policy audit_logs_r on public.audit_logs
for select using ( public.is_member(org_id) );

-- 3) Useful indexes (no-ops if already exist)
create index if not exists idx_clients_org          on public.clients(org_id);
create index if not exists idx_documents_org        on public.documents(org_id);
create index if not exists idx_threads_org          on public.threads(org_id);
create index if not exists idx_messages_thread      on public.messages(thread_id);
create index if not exists idx_tasks_org            on public.tasks(org_id);
create index if not exists idx_filings_org          on public.filings(org_id);
create index if not exists idx_notifications_org    on public.notifications(org_id);

-- Partial unique for client tax_id within org (skip when NULL)
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='uniq_clients_org_tax_id_partial'
  ) then
    execute 'create unique index uniq_clients_org_tax_id_partial
              on public.clients(org_id, tax_id)
              where tax_id is not null';
  end if;
end$$;

-- 4) updated_at trigger for tables that have updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='clients' and column_name='updated_at') then
    drop trigger if exists trg_clients_touch on public.clients;
    create trigger trg_clients_touch before update on public.clients
      for each row execute function public.touch_updated_at();
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='documents' and column_name='updated_at') then
    drop trigger if exists trg_documents_touch on public.documents;
    create trigger trg_documents_touch before update on public.documents
      for each row execute function public.touch_updated_at();
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='threads' and column_name='updated_at') then
    drop trigger if exists trg_threads_touch on public.threads;
    create trigger trg_threads_touch before update on public.threads
      for each row execute function public.touch_updated_at();
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='messages' and column_name='updated_at') then
    drop trigger if exists trg_messages_touch on public.messages;
    create trigger trg_messages_touch before update on public.messages
      for each row execute function public.touch_updated_at();
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='task_templates' and column_name='updated_at') then
    drop trigger if exists trg_task_templates_touch on public.task_templates;
    create trigger trg_task_templates_touch before update on public.task_templates
      for each row execute function public.touch_updated_at();
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='tasks' and column_name='updated_at') then
    drop trigger if exists trg_tasks_touch on public.tasks;
    create trigger trg_tasks_touch before update on public.tasks
      for each row execute function public.touch_updated_at();
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='filings' and column_name='updated_at') then
    drop trigger if exists trg_filings_touch on public.filings;
    create trigger trg_filings_touch before update on public.filings
      for each row execute function public.touch_updated_at();
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='notifications' and column_name='updated_at') then
    drop trigger if exists trg_notifications_touch on public.notifications;
    create trigger trg_notifications_touch before update on public.notifications
      for each row execute function public.touch_updated_at();
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='updated_at') then
    drop trigger if exists trg_reminders_touch on public.reminders;
    create trigger trg_reminders_touch before update on public.reminders
      for each row execute function public.touch_updated_at();
  end if;
end$$;

-- 5) Storage bucket + policies (private)
insert into storage.buckets (id, name, public)
values ('gestorly-docs','gestorly-docs', false)
on conflict (id) do nothing;

drop policy if exists "gestorly-docs read" on storage.objects;
create policy "gestorly-docs read" on storage.objects
for select using (
  bucket_id = 'gestorly-docs' and exists (
    select 1
    from public.documents d
    where d.path = storage.objects.name
      and public.is_member(d.org_id)
  )
);

drop policy if exists "gestorly-docs insert" on storage.objects;
create policy "gestorly-docs insert" on storage.objects
for insert to authenticated
with check ( bucket_id = 'gestorly-docs' );

drop policy if exists "gestorly-docs delete" on storage.objects;
create policy "gestorly-docs delete" on storage.objects
for delete using (
  bucket_id = 'gestorly-docs' and exists (
    select 1
    from public.documents d
    where d.path = storage.objects.name
      and public.is_member(d.org_id)
  )
);
