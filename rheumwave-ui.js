/* ============================================================================
   RheumWave — SHARED HEADER BEHAVIOUR
   ----------------------------------------------------------------------------
   The menu button, the light/dark toggle, the signed-in display and the year
   stamp in the footer. One copy, used by index.html, cases.html and every
   case page.

   Every element it touches is optional. A page with no header, or no footer,
   or no theme button, loads this file safely and simply gets nothing — which
   is why quizzes.html can load it for the theme alone.

   Load order:
       rheumwave-config.js      (THEME_KEY, USER_KEY)
       rheumwave-ui.js          (this file)

   Pages that own a session — cases.html, quizzes.html — should call
   RWUI.setSession(user) whenever that session changes, and RWUI.onSignOut(fn)
   to say what their Sign out should do. Pages that only display a session,
   like index.html, need neither: this file reads USER_KEY on load.
   ========================================================================== */

window.RWUI = (function () {
'use strict';

// ── SAFE STORAGE ───────────────────────────────────────────────────────────
// localStorage can throw outright rather than return null: Safari on a file://
// URL, private windows, storage blocked in an embedded frame. An uncaught
// throw here would abandon the rest of the script — menu included — so every
// access goes through these.
const store = {
  get(k)    { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  remove(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

// If rheumwave-config.js failed to load, the key names are missing. Say so in
// the console and carry on with fallbacks, rather than throwing and leaving
// the page with a dead header.
if (typeof THEME_KEY === 'undefined' || typeof USER_KEY === 'undefined') {
  console.warn('RheumWave: rheumwave-ui.js loaded before rheumwave-config.js — ' +
               'check the script order on this page.');
}
const TKEY = (typeof THEME_KEY !== 'undefined') ? THEME_KEY : 'rheumwave-theme';
const UKEY = (typeof USER_KEY  !== 'undefined') ? USER_KEY  : 'rheumwave-user';

const $ = id => document.getElementById(id);

// ── MENU ───────────────────────────────────────────────────────────────────
// Wired first, on purpose: navigation is the one thing that has to work even
// if everything else on the page fails.
function initMenu() {
  const btn = $('navToggle');
  const nav = $('siteNav');
  if (!btn || !nav) return;

  const close = () => { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };

  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Tapping a tab navigates away, but close it anyway so the panel isn't
  // still open if the browser restores this page from the back/forward cache.
  nav.addEventListener('click', e => { if (e.target.tagName === 'A') close(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { close(); btn.focus(); }
  });
}

// ── THEME ──────────────────────────────────────────────────────────────────
// The stored preference is applied whether or not this page has a button, so
// quizzes.html stays in whatever theme the learner picked elsewhere.
let dark = store.get(TKEY) === 'dark';

function applyTheme() {
  document.documentElement.dataset.theme = dark ? 'dark' : '';
  const icon  = $('themeIcon');
  const label = $('themeLabel');
  const btn   = $('themeToggle');
  if (icon)  icon.textContent  = dark ? '☀️' : '🌙';
  if (label) label.textContent = dark ? 'Light' : 'Dark';
  // Falls back to writing the whole button for any page still using the
  // single-text-node version of the toggle.
  if (btn && !icon && !label) btn.textContent = dark ? '☀️ Light' : '🌙 Dark';
  if (btn) btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
}

function initTheme() {
  const btn = $('themeToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      dark = !dark;
      store.set(TKEY, dark ? 'dark' : 'light');
      applyTheme();
    });
  }
  applyTheme();
}

// ── SESSION DISPLAY ────────────────────────────────────────────────────────
// Signed in as a participant: the ID pill and Sign out.
// Anything else — signed out, or browsing as a guest — shows Sign in, because
// a guest has no ID to show and nothing saving to the study record.
let signOutHandler = null;

function setSession(user) {
  const signIn = $('signInBtn');
  const box    = $('sessionBox');
  if (!signIn || !box) return;

  const participant = user && user.type === 'participant' && user.id;
  if (participant) {
    const idEl = $('sessionId');
    if (idEl) idEl.textContent = user.id;
    box.classList.add('visible');
    signIn.style.display = 'none';
  } else {
    box.classList.remove('visible');
    signIn.style.display = '';
  }
}

function readSession() {
  try { return JSON.parse(store.get(UKEY)); } catch (e) { return null; }
}

function initSession() {
  setSession(readSession());

  const btn = $('signOutBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    // A page that owns its session says what signing out means there — on the
    // case library it reopens the ID overlay without a reload. Everywhere else
    // the default is: clear the session, reload where you are.
    if (typeof signOutHandler === 'function') { signOutHandler(); return; }
    store.remove(UKEY);
    window.location.reload();
  });
}

function onSignOut(fn) { signOutHandler = fn; }

// ── FOOTER YEAR ────────────────────────────────────────────────────────────
function initYear() {
  const el = $('year');
  if (el) el.textContent = new Date().getFullYear();
}

// ── BOOT ───────────────────────────────────────────────────────────────────
function boot() {
  initMenu();
  initTheme();
  initSession();
  initYear();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

return { store, setSession, onSignOut, readSession, applyTheme };

})();
