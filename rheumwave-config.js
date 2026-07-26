/* ─────────────────────────────────────────────────────────────────────────────
   RheumWave — SHARED CONFIG
   Change a key or an endpoint here once, not in every page.

   SUPABASE_ANON is a public anon key — it is meant to be readable in the
   browser. What actually protects the study data is Row Level Security on
   the study_participants and case_scores tables. Confirm RLS is enabled
   before enrolling real participants.

   VALID_IDS is only an offline fallback for when Supabase is unreachable.
   Anything listed here is visible to anyone who views source, so keep it to
   demo IDs and never put real participant IDs in it.
   ──────────────────────────────────────────────────────────────────────────── */

const SUPABASE_URL  = 'https://tbgtdmzkpprvjdhlpznr.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3RkbXprcHBydmpkaGxwem5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzIzMjYsImV4cCI6MjA5NjI0ODMyNn0.nWwBX-wnUe89jESCmfdsm266WOKcYXNJ5rmduELxWJ0';
const VALID_IDS     = ['RW-2026-001', 'RW-2026-002', 'RW-2026-003', 'RW-DEMO'];

// localStorage keys, shared across pages
const PROGRESS_KEY = 'rheumwave-progress';
const USER_KEY     = 'rheumwave-user';
const THEME_KEY    = 'rheumwave-theme';
