# Gestorly (Next.js App Router) — R1

Multilingual (ES default, EN, CA), Supabase-backed, with API routes for clients, documents (signed uploads), threads, tasks, and filings.

## Setup
1. Copy `.env.example` to `.env.local` and fill:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY (server only)
2. Ensure your Supabase has the schema & RLS/policies installed.
3. `npm install`
4. `npm run dev`

## Auth
- Use Supabase email+password on `/es/login` (or `/en/login`, `/ca/login`).
- Client pages send `Authorization: Bearer <access_token>` to API routes.
- API routes determine `org_id` by active membership of `auth.uid()`.

## Document Upload
- `POST /api/clients/:id/documents` creates a DB row and returns a signed upload URL (bucket `gestorly-docs`).
- The frontend PUTs the file to Storage.

## i18n
- Locale segments: `/es` (default), `/en`, `/ca` with a language switcher in the navbar.
