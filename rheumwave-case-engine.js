/* ============================================================================
   RheumWave — shared case engine
   ----------------------------------------------------------------------------
   Drives every case page. Nothing in here is specific to one case, so a fix
   made here reaches all of them at once.

   The case page must, before loading this file:
     1. set  window.RW_CASE_ID = <the id from rheumwave-cases.js>
     2. load rheumwave-config.js and rheumwave-cases.js

   The number, order and type of questions are read from the page itself:
     - each question is a  .question-block  inside a  .step
     - a question is multi-select if any of its options carries  .multi
     - question numbers, block ids and data-q attributes are stamped on
       automatically, so you never renumber anything by hand
   ========================================================================== */

(function () {
'use strict';

// ── CASE ID ────────────────────────────────────────────────────────────────
const CASE_ID = window.RW_CASE_ID;
if (CASE_ID === undefined) {
  console.error('RheumWave: this page did not set window.RW_CASE_ID before ' +
                'loading rheumwave-case-engine.js. Scores cannot be recorded.');
}

// ── AUTO-NUMBERING ─────────────────────────────────────────────────────────
// Walks the question blocks in the order they appear in the page and stamps
// the block id, the visible "Q1"/"Q2" label and the data-q on every option.
// This means you can insert, delete or reorder whole question blocks in a
// case file without touching a single number.
const QUESTIONS = [...document.querySelectorAll('.question-block')];

QUESTIONS.forEach((block, i) => {
  const n = i + 1;
  block.id = 'q' + n;
  const label = block.querySelector('.q-num');
  if (label) label.textContent = 'Q' + n;
  block.querySelectorAll('.option').forEach(o => {
    o.dataset.q = String(n);
    // wire the click handler by type, so the markup needs no onclick=""
    o.onclick = o.classList.contains('multi')
      ? function () { toggleMulti(this); }
      : function () { selectSingle(this); };
  });
});

const TOTAL_Q = QUESTIONS.length;
if (TOTAL_Q === 0) console.warn('RheumWave: no .question-block found on this page.');

// ══ SCORE SAVE (UI layer) ══════════════════════════════════════════════════
// The network work, the offline queue and the retry logic all live in
// rheumwave-sync.js so they can also run on the index and library pages.
// What stays here is only what belongs to a case page: telling the
// participant what happened.
// ---------------------------------------------------------------------------

// TODO — the address shown to a participant whose score would not save.
const STUDY_CONTACT = 'coordinator@rheumwave.org';

if (typeof RWSync === 'undefined') {
  console.error('RheumWave: rheumwave-sync.js did not load, so scores cannot be ' +
                'saved. It must be loaded before rheumwave-case-engine.js.');
}

let lastPayload = null;

async function saveScoreToSupabase(score) {
  if (typeof RWSync === 'undefined') return;
  if (!RWSync.isParticipant()) return;          // guests never write to Supabase

  const user = RWSync.currentUser();
  const payload = {
    participant_id: user.id,
    case_id: String(CASE_ID),
    score: score,
    attempt: (JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')?.[String(CASE_ID)]?.attempts || 1),
    timestamp: new Date().toISOString()
  };
  lastPayload = payload;

  RWSync.toast('Saving your score…', 0);
  const ok = await RWSync.post(payload);

  if (ok) {
    RWSync.unqueue(payload);
    setSaveState('ok');
    RWSync.toast('Score saved.');
  } else {
    RWSync.queue(payload);        // picked up next time any page loads
    setSaveState('error');
    RWSync.toast('');
  }
}

// Manual retry, from the button in the failure notice.
async function retrySave() {
  if (!lastPayload || typeof RWSync === 'undefined') return;
  const btn = document.getElementById('saveRetryBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Retrying…'; }
  const ok = await RWSync.post(lastPayload);
  if (btn) { btn.disabled = false; btn.textContent = 'Retry saving'; }
  if (ok) {
    RWSync.unqueue(lastPayload);
    setSaveState('ok');
    RWSync.toast('Score saved.');
  } else {
    setSaveState('error', true);
  }
}

// ── Status notice ─────────────────────────────────────────────────────────
// Injected rather than written into every case file, so no case markup
// needs to change.
function saveStatusEl() {
  let el = document.getElementById('saveStatus');
  if (el) return el;
  const panel = document.getElementById('finalResult');
  if (!panel) return null;
  el = document.createElement('div');
  el.id = 'saveStatus';
  const anchor = panel.querySelector('.final-explanation');
  panel.insertBefore(el, anchor || panel.firstChild);
  return el;
}

function setSaveState(state, retriedAndFailed) {
  const el = saveStatusEl();
  if (!el) return;
  el.className = '';
  if (state === 'ok') {
    el.classList.add('show', 'ok');
    el.innerHTML = '<strong>✓ Score recorded.</strong> Your result has been saved to the study record.';
  } else if (state === 'error') {
    el.classList.add('show', 'error');
    el.innerHTML =
      '<strong>⚠ Your score has not been saved.</strong> ' +
      (retriedAndFailed
        ? 'That still did not go through. Your result is being held on this device and will be sent automatically next time you open RheumWave — so please do not clear your browsing data.'
        : 'Your result is held on this device and will be sent automatically next time you open RheumWave.') +
      '<div class="save-actions">' +
        '<button class="save-retry-btn" id="saveRetryBtn" onclick="retrySave()">Retry saving</button>' +
      '</div>' +
      '<span class="save-contact">If this keeps happening, please contact the study coordinator at ' +
      `<a href="mailto:${STUDY_CONTACT}">${STUDY_CONTACT}</a>` +
      ` and quote case ${CASE_ID}.</span>`;
  }
}

// ── SELECTION ──────────────────────────────────────────────────────────────
function selectSingle(el) {
  if (el.classList.contains('locked')) return;
  const q = el.dataset.q;
  document.querySelectorAll(`[data-q="${q}"]`).forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  hideWarning();
}

function toggleMulti(el) {
  if (el.classList.contains('locked')) return;
  el.classList.toggle('selected');
  hideWarning();
}

function hideWarning() {
  document.getElementById('navWarning').style.display = 'none';
}

// ── STEP NAVIGATION ────────────────────────────────────────────────────────
// The ordered list of steps. A step normally holds one question; a step with
// no .question-block is treated as an interstitial (e.g. investigation
// results shown on their own before the next question) and is not scored.
const STEPS = [...document.querySelectorAll('.step')];
let stepIndex = 0;

function currentStep() { return STEPS[stepIndex]; }

function questionInStep(stepEl) {
  const block = stepEl.querySelector('.question-block');
  if (!block) return null;
  return block.id.replace('q', '');
}

function updateStepProgress() {
  const allAreQuestions = (STEPS.length === TOTAL_Q);
  document.getElementById('progressLabel').textContent = allAreQuestions
    ? `Question ${stepIndex + 1} of ${STEPS.length}`
    : `Step ${stepIndex + 1} of ${STEPS.length}`;
  document.getElementById('progressFill').style.width =
    `${((stepIndex + 1) / STEPS.length) * 100}%`;
}

function showStep(i) {
  STEPS.forEach((s, idx) => s.classList.toggle('active', idx === i));
  stepIndex = i;
  updateStepProgress();
  const isLast = (i === STEPS.length - 1);
  document.getElementById('nextBtn').textContent = isLast ? 'Submit & See Results' : 'Next →';
  // Vignette: fully visible on the first step, collapsed afterwards
  setVignetteCollapsed(i !== 0);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function lockStep(stepEl) {
  stepEl.querySelectorAll('.option').forEach(o => o.classList.add('locked'));
}

function nextStep() {
  const cur = currentStep();
  const q = questionInStep(cur);

  if (q !== null) {
    const selected = cur.querySelectorAll(`[data-q="${q}"].selected`);
    if (selected.length === 0) {
      document.getElementById('navWarning').style.display = 'inline';
      return;
    }
    lockStep(cur);
  }
  hideWarning();

  if (stepIndex < STEPS.length - 1) showStep(stepIndex + 1);
  else finishQuiz();
}

// ── FINISH: reveal everything on one page, score, report ───────────────────
function finishQuiz() {
  document.getElementById('nextBtn').disabled = true;

  let correct = 0;
  QUESTIONS.forEach(block => {
    const q = block.id.replace('q', '');
    const isMulti = !!block.querySelector('.option.multi');
    correct += isMulti ? evalMulti(q) : evalSingle(q);
  });

  // Show every explanation on the page, however many there are
  document.querySelectorAll('.explanation').forEach(e => e.classList.add('show'));

  // Switch to one-page review layout (all steps visible, nav hidden)
  document.body.classList.add('review-mode');

  const pct = TOTAL_Q ? Math.round((correct / TOTAL_Q) * 100) : 0;
  document.getElementById('scoreBig').textContent = `${pct}%`;
  document.getElementById('finalResult').classList.add('show');
  document.getElementById('finalResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
  reportScore(pct);
}

function evalSingle(q) {
  const opts = [...document.querySelectorAll(`[data-q="${q}"]`)];
  const chosen = opts.find(o => o.classList.contains('selected'));
  const isCorrect = !!chosen && chosen.dataset.correct === 'true';
  opts.forEach(o => {
    o.onclick = null;
    const marker = o.querySelector('.option-marker');
    if (o.dataset.correct === 'true') {
      o.classList.add('revealed');
      if (marker) marker.textContent = '✓';
    } else if (o.classList.contains('selected')) {
      o.classList.remove('selected');
      o.classList.add('incorrect');
      if (marker) marker.textContent = '✗';
    }
  });
  return isCorrect ? 1 : 0;
}

function evalMulti(q) {
  const opts = [...document.querySelectorAll(`[data-q="${q}"]`)];
  const selected = opts.filter(o => o.classList.contains('selected')).map(o => o.dataset.val);
  const correctVals = opts.filter(o => o.dataset.correct === 'true').map(o => o.dataset.val);
  // all-or-nothing: every correct option chosen and nothing else
  const isCorrect = selected.length === correctVals.length && correctVals.every(v => selected.includes(v));
  opts.forEach(o => {
    o.onclick = null;
    const marker = o.querySelector('.option-marker');
    if (o.dataset.correct === 'true') {
      o.classList.add('revealed');
      if (marker) marker.textContent = '✓';
    } else if (selected.includes(o.dataset.val)) {
      o.classList.remove('selected');
      o.classList.add('incorrect');
      if (marker) marker.textContent = '✗';
    }
  });
  return isCorrect ? 1 : 0;
}

// ── SCORE REPORTING ────────────────────────────────────────────────────────
function reportScore(pct) {
  try {
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    const key = String(CASE_ID);
    if (!progress[key]) progress[key] = { score: 0, attempts: 0, history: [] };
    progress[key].attempts++;
    progress[key].lastScore = pct;
    progress[key].score = Math.max(progress[key].score, pct);
    progress[key].history.push({ score: pct, ts: Date.now() });
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    saveScoreToSupabase(pct);
  } catch (e) {}
  try { window.opener.postMessage({ type: 'rheumwave-score', caseId: CASE_ID, score: pct }, '*'); } catch (e) {}
}

// ── RETRY / BACK ───────────────────────────────────────────────────────────
function retryCase() { location.reload(); }

function goBack() {
  if (window.opener && !window.opener.closed) { window.close(); return; }
  window.location.href = (window.RW_UP || '') + 'cases.html';
}

// ── THEME ──────────────────────────────────────────────────────────────────
// Handled by rheumwave-ui.js, which every case page now loads. This file used
// to wire the toggle itself; leaving both in place attached two click handlers
// to one button, so each press toggled twice and appeared to do nothing.

// ── CASE LABEL ─────────────────────────────────────────────────────────────
// Number, total, region and level all come from rheumwave-cases.js, looked up
// by CASE_ID, so this page and the library can never disagree. The values
// typed into the HTML are only a fallback for when the list hasn't loaded.
(function caseLabel() {
  if (typeof RHEUMWAVE_CASES === 'undefined') {
    console.warn('RheumWave: rheumwave-cases.js did not load, so the case header ' +
                 'is showing the fallback text typed in the HTML. Check that the ' +
                 'file sits next to index.html.');
    return;
  }
  const entry = RHEUMWAVE_CASES.find(c => c.id === CASE_ID);
  const total = RHEUMWAVE_CASES.length;
  const num   = entry ? entry.caseNo : CASE_ID;

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el && text) el.textContent = text;
  };
  set('caseNum',     `Case ${num} of ${total}`);
  set('caseHeading', `Case ${num}`);
  if (entry) {
    set('tagRegion', entry.region);
    set('tagLevel',  entry.level);
  } else {
    console.warn(`RheumWave: CASE_ID ${CASE_ID} is not in rheumwave-cases.js.`);
  }

  // Provenance line at the foot of the page. The <p> is hidden in the HTML and
  // only revealed when the case entry carries a `developed` value, so a case
  // without one shows nothing rather than placeholder text.
  const credit = document.getElementById('caseCredit');
  if (credit && entry && entry.developed) {
    credit.textContent = `Case developed ${entry.developed} · RheumWave`;
    credit.style.display = '';
  }
})();

// The footer year is stamped by rheumwave-ui.js.

// ── PINNED VIGNETTE TOGGLE ─────────────────────────────────────────────────
function setVignetteCollapsed(collapsed) {
  const v = document.getElementById('vignette');
  if (!v) return;
  v.classList.toggle('collapsed', collapsed);
  const t = document.getElementById('vignetteToggle');
  if (t) t.textContent = collapsed ? 'Expand' : 'Collapse';
}

function toggleVignette() {
  const v = document.getElementById('vignette');
  if (v) setVignetteCollapsed(!v.classList.contains('collapsed'));
}

// ── IMAGE / CINE LIGHTBOX ──────────────────────────────────────────────────
// The lightbox <video> is built here rather than in the markup, so a case page
// that has no cine loops needs no extra elements — and every case built before
// video existed gets this for free without being edited.
function ensureLightboxVideo() {
  let vid = document.getElementById('usLightboxVideo');
  if (vid) return vid;
  vid = document.createElement('video');
  vid.id = 'usLightboxVideo';
  vid.setAttribute('controls', '');
  vid.setAttribute('loop', '');
  vid.setAttribute('muted', '');
  vid.setAttribute('playsinline', '');
  vid.muted = true;
  const box = document.getElementById('usLightbox');
  box.insertBefore(vid, document.getElementById('usLightboxCaption'));
  return vid;
}

function openLightbox(el) {
  const box  = document.getElementById('usLightbox');
  const img  = document.getElementById('usLightboxImg');
  const text = el.getAttribute('alt') || el.dataset.caption || '';

  if (el.tagName === 'VIDEO') {
    // Full size, with controls, so a loop can be scrubbed and paused on a
    // frame — which is the whole point of showing dynamic scanning.
    const vid = ensureLightboxVideo();
    vid.src = el.currentSrc || el.src;
    vid.style.display = '';
    img.style.display = 'none';
    vid.play().catch(() => {});          // a blocked autoplay is not an error
  } else {
    const vid = document.getElementById('usLightboxVideo');
    if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); vid.style.display = 'none'; }
    img.style.display = '';
    img.src = el.src;
    img.alt = text;
  }

  document.getElementById('usLightboxCaption').textContent = text;
  box.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(e) {
  // clicking the enlarged image or the video controls should NOT close;
  // the overlay and the close button do
  if (e && e.target && (e.target.id === 'usLightboxImg' || e.target.id === 'usLightboxVideo')) return;
  const vid = document.getElementById('usLightboxVideo');
  if (vid) vid.pause();
  document.getElementById('usLightbox').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

// Any image given class="us-thumb" opens in the lightbox — no onclick needed
document.querySelectorAll('.us-thumb').forEach(img => {
  img.addEventListener('click', () => openLightbox(img));
});

// Cine loops. In the grid they play silently on repeat with no controls, so the
// panel reads as part of the scan; clicking opens the lightbox where they can be
// scrubbed and paused. Anyone who has asked their system to reduce motion gets a
// still first frame with controls instead of a loop that starts on its own.
(function initClips() {
  const clips = document.querySelectorAll('video.us-clip');
  if (!clips.length) return;
  const stillPlease = window.matchMedia &&
                      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  clips.forEach(clip => {
    clip.muted = true;                       // required for autoplay on iOS
    if (stillPlease) {
      clip.removeAttribute('autoplay');
      clip.pause();
      clip.setAttribute('controls', '');
    }
    clip.addEventListener('click', e => {
      // let the controls work when they are showing
      if (stillPlease && e.offsetY > clip.clientHeight - 40) return;
      openLightbox(clip);
    });
  });
})();

// ── EXPOSE the handlers the markup calls by name ───────────────────────────
Object.assign(window, {
  selectSingle, toggleMulti, nextStep, retryCase, goBack,
  toggleVignette, openLightbox, closeLightbox, retrySave
});

// Initialize the wizard at the first step
showStep(0);


})();
