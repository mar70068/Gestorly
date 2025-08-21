-- Quick verify (run after post-setup)
-- 1) Is member function OK?
select public.is_member(o.id) as i_am_member, o.id
from public.organizations o
limit 3;

-- 2) RLS sanity check (should only return rows for orgs you're a member of)
select 'clients' as t, count(*) from public.clients;
select 'documents' as t, count(*) from public.documents;
select 'threads' as t, count(*) from public.threads;
select 'tasks' as t, count(*) from public.tasks;
select 'filings' as t, count(*) from public.filings;

-- 3) Storage: ensure bucket exists
select id, name, public from storage.buckets where id='gestorly-docs';
