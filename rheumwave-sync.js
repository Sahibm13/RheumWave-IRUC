/* ============================================================================
   RheumWave — score sync
   ----------------------------------------------------------------------------
   Everything to do with getting a score safely into Supabase, kept separate
   from the quiz engine so it can run on ANY page.

   Why it is its own file: a participant who finishes a case offline has their
   score parked in localStorage. It only gets re-sent when this code runs. If
   that lived inside the case engine it would only ever fire on a case page —
   so someone who comes back, glances at the library and leaves would never
   sync. Loading this on index.html and cases.html closes that gap.

   Load order on every page:
       rheumwave-config.js          (SUPABASE_URL, SUPABASE_ANON, USER_KEY, …)
       rheumwave-cases.js           (the case list — index and cases only)
       rheumwave-sync.js            (this file)
       rheumwave-ui.js              (header, theme, session display)
       rheumwave-case-engine.js     (case pages only)

   This file only needs rheumwave-config.js ahead of it. The rest of the order
   above is what the pages actually do, so the comment and the pages agree.

   It flushes the queue by itself on load. Nothing needs to call it.
   ========================================================================== */

window.RWSync = (function () {
'use strict';

const QUEUE_KEY  = 'rw_unsaved_scores';
const SAVE_TRIES = 3;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── WHO IS THIS ────────────────────────────────────────────────────────────
function currentUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || '{}'); }
  catch (e) { return {}; }
}

function isParticipant() {
  const u = currentUser();
  return !!u && u.type === 'participant';
}

// ── THE NETWORK CALL ───────────────────────────────────────────────────────
// Throws on anything that is not a clean write. Note that plain fetch resolves
// on 401/403/400 — a bad key, a blocking RLS policy or a wrong column name all
// come back as a normal response — so res.ok has to be checked explicitly or
// those failures pass as successes.
async function postScore(payload) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/case_scores`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    throw new Error('network unreachable: ' + e.message);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Supabase returned ${res.status}. ${detail}`.trim());
  }
  return true;
}

async function postScoreWithRetries(payload, tries = SAVE_TRIES) {
  for (let i = 0; i < tries; i++) {
    try {
      await postScore(payload);
      return true;
    } catch (e) {
      console.warn(`RheumWave: score save attempt ${i + 1} of ${tries} failed — ${e.message}`);
      if (i < tries - 1) await sleep(700 * Math.pow(2, i));   // 0.7s, 1.4s
    }
  }
  return false;
}

// ── THE UNSAVED QUEUE ──────────────────────────────────────────────────────
function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
  catch (e) { return []; }
}

function writeQueue(list) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(list)); } catch (e) {}
}

function queueScore(payload) {
  const list = readQueue();
  const dupe = list.some(p => p.case_id        === payload.case_id &&
                              p.attempt        === payload.attempt &&
                              p.participant_id === payload.participant_id);
  if (!dupe) { list.push(payload); writeQueue(list); }
}

function unqueueScore(payload) {
  writeQueue(readQueue().filter(p => p.timestamp !== payload.timestamp));
}

// ── THE FLUSH ──────────────────────────────────────────────────────────────
let flushing = false;

async function flushQueue(opts = {}) {
  if (flushing) return 0;                 // never run two at once
  if (!isParticipant()) return 0;         // guests have nothing to sync
  const list = readQueue();
  if (!list.length) return 0;

  flushing = true;
  const stillFailing = [];
  try {
    for (const payload of list) {
      // one try each — this is a background sweep, not the critical save
      const ok = await postScoreWithRetries(payload, 1);
      if (!ok) stillFailing.push(payload);
    }
    writeQueue(stillFailing);
  } finally {
    flushing = false;
  }

  const recovered = list.length - stillFailing.length;
  if (recovered > 0 && opts.quiet !== true) {
    toast(recovered === 1
      ? 'An earlier score has now been saved.'
      : `${recovered} earlier scores have now been saved.`);
  }
  return recovered;
}

// ── STORAGE EVICTION ───────────────────────────────────────────────────────
// Safari clears site storage after ~7 days without a visit, which would take a
// queued score with it. This asks the browser to exempt the site. Only asked
// for participants, so casual visitors never see a permission prompt.
async function requestPersistence() {
  try {
    if (!isParticipant()) return false;
    if (!navigator.storage || !navigator.storage.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (e) { return false; }
}

// ── TOAST ──────────────────────────────────────────────────────────────────
// Case pages already have #syncStatus styled by rheumwave-case.css. On the
// index and library the element does not exist, so make one and give it the
// minimum styling it needs — that way this file works anywhere on its own.
let toastTimer = null;

function ensureToastEl() {
  let el = document.getElementById('syncStatus');
  if (el) return el;
  if (!document.body) return null;

  if (!document.getElementById('rwSyncToastCSS')) {
    const style = document.createElement('style');
    style.id = 'rwSyncToastCSS';
    style.textContent =
      '#syncStatus{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
      'background:#1f2937;color:#fff;font-size:.8rem;font-family:Inter,system-ui,sans-serif;' +
      'padding:7px 18px;border-radius:20px;box-shadow:0 4px 16px rgba(0,0,0,.2);' +
      'opacity:0;transition:opacity .3s;pointer-events:none;z-index:300;white-space:nowrap;}' +
      '#syncStatus.show{opacity:1;}';
    document.head.appendChild(style);
  }
  el = document.createElement('div');
  el.id = 'syncStatus';
  document.body.appendChild(el);
  return el;
}

function toast(msg, hideAfter = 2600) {
  const el = ensureToastEl();
  if (!el) return;
  clearTimeout(toastTimer);
  if (!msg) { el.classList.remove('show'); return; }
  el.textContent = msg;
  el.classList.add('show');
  if (hideAfter) toastTimer = setTimeout(() => el.classList.remove('show'), hideAfter);
}

// ── AUTO-RUN ───────────────────────────────────────────────────────────────
function boot() {
  if (typeof SUPABASE_URL === 'undefined') {
    console.warn('RheumWave: rheumwave-sync.js loaded before rheumwave-config.js — ' +
                 'queued scores cannot be sent. Check the script order on this page.');
    return;
  }
  requestPersistence();
  flushQueue();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Also sweep when a device comes back online mid-visit
window.addEventListener('online', () => flushQueue());

return {
  currentUser, isParticipant,
  post: postScoreWithRetries,
  queue: queueScore,
  unqueue: unqueueScore,
  read: readQueue,
  flush: flushQueue,
  toast,
  requestPersistence
};

})();
