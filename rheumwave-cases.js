/* ─────────────────────────────────────────────────────────────────────────────
   RheumWave — CASE LIBRARY
   This is the only file you edit to add, remove, or reorder a case.
   Both the homepage and the case library read from it.

   To add a case, copy a line and change the values:
     id        unique number — also the key progress/scores are stored under.
               NEVER reuse or renumber an existing id; it would silently
               reassign someone's saved score to a different case.
     caseNo    what the learner sees ("Case 7"). Can differ from id.
     title     internal label for your own reference.
     region    joint group. A new value here creates a new filter option.
     pathology finding category. Same — new values become filter options.
     level     Intro | Core | Advanced
     url       path to the case page, relative to the site root.
     ready     true once the case page actually exists. false shows the card
               greyed out as "Coming soon" and leaves it out of the homepage
               counts. Omit the field entirely and it counts as ready.
     developed optional. Year the case content was written or last reviewed.
               Prints as a small line at the foot of the case page. Omit it
               and that line stays hidden, so add it as each case is built.
               Keep it quoted — it is display text and is never compared, so
               '2026, revised 2027' is equally valid.

   Cases appear in the order listed below.
   ──────────────────────────────────────────────────────────────────────────── */

const RHEUMWAVE_CASES = [
      {id:1,caseNo:1,title:'Normal',                                   region:'Hand/Wrist',    pathology:'Normal',                    level:'Intro',        url:'cases/case01.html', ready:true,  developed:'2026'},
      {id:2,caseNo:2,title:'Effusion in Feet (Normal)',                region:'Foot/Ankle',    pathology:'Normal',                    level:'Intro',        url:'cases/case02.html', ready:true,  developed:'2026'},
      {id:3,caseNo:3,title:'IA Synovitis - Hands & Wrist',             region:'Hand/Wrist',    pathology:'Inflammatory Arthritis',    level:'Core',         url:'cases/case03.html', ready:false},
      {id:4,caseNo:4,title:'IA Synovitis - Hands & Wrist (II)',        region:'Hand/Wrist',    pathology:'Inflammatory Arthritis',    level:'Core',         url:'cases/case04.html', ready:false},
      {id:5,caseNo:5,title:'IA Synovitis - Feet',                      region:'Foot/Ankle',    pathology:'Inflammatory Arthritis',    level:'Core',         url:'cases/case05.html', ready:false},
      {id:6,caseNo:6,title:'IA Tenosynovitis (Hands)',                 region:'Hand/Wrist',    pathology:'Tenosynovitis',             level:'Core',         url:'cases/case06.html', ready:false},
      {id:7,caseNo:7,title:'Tenosynovitis (Ankles)',                   region:'Foot/Ankle',    pathology:'Tenosynovitis',             level:'Core',         url:'cases/case07.html', ready:false},
      {id:8,caseNo:8,title:'PsA Enthesitis',                           region:'Foot/Ankle',    pathology:'Enthesitis',                level:'Core',         url:'cases/case08.html', ready:false},
      {id:9,caseNo:9,title:'PsA Enthesitis (II)',                      region:'Hand/Wrist',    pathology:'Enthesitis',                level:'Advanced',     url:'cases/case09.html', ready:true,  developed:'2026'},
      {id:10,caseNo:10,title:'Peritenonitis',                          region:'Foot/Ankle',    pathology:'Soft Tissue/Tendon',        level:'Advanced',     url:'cases/case10.html', ready:false},
      {id:11,caseNo:11,title:'Gout - Classic Double Contour',          region:'Knee',          pathology:'Crystal Arthropathy',       level:'Intro',        url:'cases/case11.html', ready:true,  developed:'2026'},
      {id:12,caseNo:12,title:'Gout - Deposits vs PsA',                 region:'Hand/Wrist',    pathology:'Crystal Arthropathy',       level:'Advanced',     url:'cases/case12.html', ready:false},
      {id:13,caseNo:13,title:'CPPD',                                   region:'Knee',          pathology:'Crystal Arthropathy',       level:'Core',         url:'cases/case13.html', ready:false},
      {id:14,caseNo:14,title:'Erosive OA - Hands with Doppler',        region:'Hand/Wrist',    pathology:'Osteoarthritis',            level:'Advanced',     url:'cases/case14.html', ready:false},
      {id:15,caseNo:15,title:'OA Hands - Not all Doppler is IA',       region:'Hand/Wrist',    pathology:'Osteoarthritis',            level:'Advanced',     url:'cases/case15.html', ready:false},
      {id:16,caseNo:16,title:'OA MTP - vs Gout vs Both',               region:'Foot/Ankle',    pathology:'Osteoarthritis',            level:'Advanced',     url:'cases/case16.html', ready:false},
      {id:17,caseNo:17,title:'Ethesopathy (Mechanical)',               region:'Foot/Ankle',    pathology:'Enthesitis',                level:'Core',         url:'cases/case17.html', ready:false},
      {id:18,caseNo:18,title:'Carpal Tunnel - MN vs Tenosynovitis',    region:'Hand/Wrist',    pathology:'Nerve Entrapment',          level:'Advanced',     url:'cases/case18.html', ready:false},
      {id:19,caseNo:19,title:'Rotator Cuff Pathology',                 region:'Shoulder',      pathology:'Soft Tissue/Tendon',        level:'Core',         url:'cases/case19.html', ready:true,  developed:'2026'},
      {id:20,caseNo:20,title:'Baker\'s Cyst',                          region:'Knee',          pathology:'Soft Tissue/Tendon',        level:'Intro',        url:'cases/case20.html', ready:false},
];


/* ─────────────────────────────────────────────────────────────────────────────
   DISPLAY ORDER for the filter dropdowns and the homepage chips.
   Categories appear in the order listed here. Anything used by a case but not
   listed below still shows up, alphabetically, at the end — so you can forget
   to update this list and nothing breaks.
   ──────────────────────────────────────────────────────────────────────────── */

const RHEUMWAVE_ORDER = {
  region: [
    'Hand/Wrist', 'Knee', 'Foot/Ankle', 'Shoulder', 'Elbow'
  ],
  pathology: [
    'Normal', 'Inflammatory Arthritis', 'Enthesitis', 'Tenosynovitis',
    'Crystal Arthropathy', 'Osteoarthritis', 'Nerve Entrapment',
    'Soft Tissue/Tendon', 'Regional Pain Syndrome'
  ],
  level: ['Intro', 'Core', 'Advanced']
};

/* Show categories that no case uses yet?
   false — filters only offer categories that will return results (recommended)
   true  — every category above is always shown, even if it matches nothing   */
const RHEUMWAVE_SHOW_EMPTY_FILTERS = false;

/* Cases that are actually built. A missing `ready` field counts as ready. */
function rheumwaveReady() {
  return RHEUMWAVE_CASES.filter(c => c.ready !== false);
}

/* Used by both cases.html and index.html. You shouldn't need to touch this.
   Pass a list to scope it; defaults to built cases only. */
function rheumwaveCategories(key, list) {
  const source = list || rheumwaveReady();
  const order = RHEUMWAVE_ORDER[key] || [];
  const used  = new Set(source.map(c => c[key]));
  const values = RHEUMWAVE_SHOW_EMPTY_FILTERS
    ? [...new Set([...order, ...used])]
    : [...used];
  return values.sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
