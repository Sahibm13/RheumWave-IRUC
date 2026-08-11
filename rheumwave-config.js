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

/* ─────────────────────────────────────────────────────────────────────────────
   ACCESS SWITCHES
   Change true/false here and every page picks it up — no other file to edit.

   ALLOW_GUEST        false hides the "Continue as Guest" button on cases.html
                      and quizzes.html, so an ID is the only way in. Anyone
                      already holding a guest session is signed out and shown
                      the ID panel again, otherwise flipping this to false
                      would do nothing for people who visited before.

   ALLOW_SELF_REGISTER  true shows the "Create an ID" panel. Requires the
                      register_participant function to exist in Supabase —
                      see the SQL in the project notes. With it false, IDs
                      have to be added to study_participants by hand.
   ──────────────────────────────────────────────────────────────────────────── */

const ALLOW_GUEST          = true;    // ← flip to false to require an ID for entry
const ALLOW_SELF_REGISTER  = true;

/* ─────────────────────────────────────────────────────────────────────────────
   PARTICIPANT ID FORMAT
   One definition used by sign-in, sign-up and session restore, so an ID can
   never be stored one way and looked up another. 4–12 characters, letters,
   numbers and hyphens. Everything is upper-cased, so "rw-042" and "RW-042"
   are the same participant and cannot become two rows.

   Do not loosen this after enrolment starts without checking existing rows —
   changing what counts as valid does not retroactively fix data already saved.
   ──────────────────────────────────────────────────────────────────────────── */

const ID_PATTERN = /^[A-Z0-9-]{4,12}$/;

function normaliseID(raw) {
  return String(raw == null ? '' : raw).replace(/\s+/g, '').toUpperCase();
}

// localStorage keys, shared across pages
const PROGRESS_KEY = 'rheumwave-progress';
const USER_KEY     = 'rheumwave-user';
const THEME_KEY    = 'rheumwave-theme';
