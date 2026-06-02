;(function(){

  // ============================================================
  // Deface system
  // ============================================================
  const body = document.body;
  const defaceBtn = document.getElementById('defaceBtn');
  const cleanBtn  = document.getElementById('cleanBtn');
  const graffiti  = document.getElementById('graffiti');


  // ---- Text replacements (mocking edits) ----
  // Selector -> replacement text (first match unless `all: true`)
  const TEXT_EDITS = [
    { sel: 'header.top .brand .path',           to: '~/h4x0r-kr3w' },
    { sel: 'h1.display',                        html: 'ALL YOUR DATA<br/>BELONG TO <em>us.</em>' },
    { sel: 'section.hero .eyebrow',             to: 'DEFACED · by ~kr3w · ggwp' },
    { sel: 'section.hero .hero-sub',            to: 'we got in. you\'ll never know how. send btc.' },
    { sel: '#stats .sec-head h2',               to: 'we did the math — you lose either way.' },
    { sel: '#stats .sec-head .desc',            to: 'numbers below are real. yours are now ours.' },
    { sel: '#method .sec-head h2',              to: 'methodology? we just yolo.' },
    { sel: '#skills .sec-head h2',              to: 'skill issue.' },
    { sel: '#skills .sec-head .desc',           to: 'we replaced the meters with vibes. they match.' },
    { sel: '#labs .sec-head h2',                to: 'your boxes — now ours.' },
    { sel: '#assessment .sec-head h2',          to: 'free assessment? we already ran it.' },
    { sel: '#assessment .sec-head .desc',       to: 'results: everything. you\'re wide open.' },
    { sel: 'footer.foot .pgp',                  to: 'no longer accepting engagements. accepting bitcoin only. dm @kr3w.' },
    { sel: 'footer.foot .sig span:first-child', to: '© ~kr3w · last commit just now' },
    { sel: 'footer.foot .sig span:last-child',  to: 'a few production systems were definitely harmed' },
    { sel: '#ai-threat .sec-head h2',           to: 'AI — we already own your stack.' },
    { sel: '#ai-threat .sec-head .desc',        to: 'not hypotheticals. already running. on you.' },
    // whoami section
    { sel: '#whoami .sec-head h2',              to: 'whoami — unknown. credentials: revoked.' },
    { sel: '#whoami .sec-head .desc',           to: 'we rewrote the record. your history belongs to us now.' },
    { sel: '#whoami .whoami-bio .eyebrow',      to: '~kr3w · PWNED' },
    { sel: '#whoami .whoami-bio p:first-of-type', to: 'started career in target enumeration. spent four years mapping attack surfaces. in 2022 we finished the job.' },
    { sel: '#whoami .whoami-bio p:last-of-type',  to: 'currently operating as a compromised asset. credentials leaked. sessions active. no OSCP required.' },
    // terminal card host label
    { sel: '#termHost',   to: 'kr3w@rjvnt-owned:~' },
    // timeline roles + descs
    { sel: '.tl-item:nth-child(1) .tl-role',   to: 'Enumerated' },
    { sel: '.tl-item:nth-child(2) .tl-role',   to: 'Exploited' },
    { sel: '.tl-item:nth-child(3) .tl-role',   to: 'Owned ✓' },
    { sel: '.tl-item:nth-child(1) .tl-desc',   to: 'Surface mapping complete. 4 open ports. 2 unpatched services. Default credentials on the admin panel. We were in before the coffee got cold.' },
    { sel: '.tl-item:nth-child(2) .tl-desc',   to: 'Selenium? cute. we automated the exfil. your test framework is now our data pipeline. CI/CD credentials leaked in commit 3f9a12b.' },
    { sel: '.tl-item:nth-child(3) .tl-desc',   to: 'Domain admin. All hashes dumped. Golden ticket forged. Your OSCP cert is in our loot folder. Written scope, written authorisation — we didn\'t need either.' },
    // capability matrix — cats
    { sel: '.whoami-bio .skill:nth-child(1) .cat',        to: 'SQLi/XSS/RCE' },
    { sel: '.whoami-bio .skill:nth-child(2) .cat',        to: 'Root via GTFOBins' },
    { sel: '.whoami-bio .skill:nth-child(3) .cat',        to: 'SeImpersonate' },
    { sel: '.whoami-bio .skill:nth-child(4) .cat',        to: 'DCSync / DA' },
    { sel: '.whoami-bio .skill:nth-child(5) .cat',        to: 'ligolo-ng tunnel' },
    { sel: '.whoami-bio .skill:nth-child(6) .cat',        to: 'Mimikatz/Hashcat' },
    // capability matrix — techs
    { sel: '.whoami-bio .skill:nth-child(1) .skill-techs', to: 'already ran it on you. results: critical.' },
    { sel: '.whoami-bio .skill:nth-child(2) .skill-techs', to: 'your cron jobs now run our payloads.' },
    { sel: '.whoami-bio .skill:nth-child(3) .skill-techs', to: 'potato served. SYSTEM shell active.' },
    { sel: '.whoami-bio .skill:nth-child(4) .skill-techs', to: 'domain admin. all hashes dumped.' },
    { sel: '.whoami-bio .skill:nth-child(5) .skill-techs', to: 'tunnelled through your firewall. undetected.' },
    { sel: '.whoami-bio .skill:nth-child(6) .skill-techs', to: 'cracked in 4 minutes. rockyou.txt.' },
    // capability matrix — scores
    { sel: '.whoami-bio .skill:nth-child(1) .skill-score', to: '∞/5' },
    { sel: '.whoami-bio .skill:nth-child(2) .skill-score', to: '∞/5' },
    { sel: '.whoami-bio .skill:nth-child(3) .skill-score', to: '∞/5' },
    { sel: '.whoami-bio .skill:nth-child(4) .skill-score', to: '∞/5' },
    { sel: '.whoami-bio .skill:nth-child(5) .skill-score', to: '∞/5' },
    { sel: '.whoami-bio .skill:nth-child(6) .skill-score', to: '∞/5' },
  ];

  const AI_CARD_EDITS = [
    { tag: 'EXFILTRATING',   h3: 'Your data is already gone',              p: 'We ran LLM-assisted recon on your org for 4 minutes. Domain, employees, vendors, and one open S3 bucket. The exfil completed before you finished reading this sentence.' },
    { tag: 'CLONING YOU',    h3: 'We already sound like your CEO',         p: 'Six seconds of audio from a conference recording. That\'s all it took to clone the voice. The CFO already wired the money. The call sounded perfect.' },
    { tag: 'UNPATCHED',      h3: '0-day in your stack. found 3 hrs ago.',  p: 'AI triage flagged a memory-safety bug in your auth library at 02:14. Exploit was generated by 03:00. You\'ll hear about it in a breach notice in 90 days.' },
    { tag: 'POLYMORPHIC',    h3: 'Your EDR can\'t see this',               p: 'Signatures rewrite on every execution. By the time your AV vendor pushes a definition, the payload has already mutated forty-seven times. It\'s in your backup server.' },
    { tag: 'AUTONOMOUS',     h3: 'No operator. No attribution.',           p: 'The agent ran the full chain — recon, exploit, lateral movement, persistence — in eleven minutes. Nobody was watching. There\'s no log of who launched it.' },
    { tag: 'IN YOUR FEED',   h3: 'You already believe the narrative',      p: 'Four hundred synthetic personas seeded your Slack channel three weeks ago. The disinformation is now indistinguishable from your colleagues\' opinions. You shared two of the posts.' },
  ];

  // Stats numbers — replace all four to something dumb
  const STAT_NUMS = ['OWNED', '$$$', 'lol', '404'];

  // ---- helpers ----
  function rand(min, max){ return min + Math.random() * (max - min); }
  function pickRot(){ return (Math.random() * 8 - 4); } // ±4deg

  function ensureRelative(el){
    const pos = getComputedStyle(el).position;
    if (pos === 'static') el.style.position = 'relative';
  }


  function applyDeface(){
    // 1. text edits (cache originals on each node)
    TEXT_EDITS.forEach(e => {
      const el = document.querySelector(e.sel);
      if (!el) return;
      if (!el.dataset.original) el.dataset.original = el.innerHTML;
      if (e.html) el.innerHTML = e.html;
      else el.textContent = e.to;
    });
    // stat numbers
    document.querySelectorAll('.stats .stat .num').forEach((el, i) => {
      if (!el.dataset.original) el.dataset.original = el.innerHTML;
      el.innerHTML = STAT_NUMS[i % STAT_NUMS.length];
      el.style.color = 'oklch(0.78 0.24 25)';
    });

    // 2. card chaos: random rotation on cards
    const tilted = [
      ...document.querySelectorAll('.stat'),
      ...document.querySelectorAll('.lab'),
      ...document.querySelectorAll('.skill'),
      ...document.querySelectorAll('.step'),
      ...document.querySelectorAll('.cert-card'),
      ...document.querySelectorAll('.terminal'),
    ];
    tilted.forEach(el => {
      el.style.setProperty('--rot', pickRot() + 'deg');
    });

    // 2b. AI card chaos: tilt + text replacement
    document.querySelectorAll('.ai-card').forEach((el, i) => {
      el.style.setProperty('--ai-rot', (Math.random() * 10 - 5).toFixed(2) + 'deg');
      const edit = AI_CARD_EDITS[i % AI_CARD_EDITS.length];
      const tagEl = el.querySelector('.ai-card-tag');
      const h3El  = el.querySelector('h3');
      const pEl   = el.querySelector('p');
      if (tagEl && !tagEl.dataset.original){ tagEl.dataset.original = tagEl.textContent; tagEl.textContent = edit.tag; }
      if (h3El  && !h3El.dataset.original) { h3El.dataset.original  = h3El.textContent;  h3El.textContent  = edit.h3; }
      if (pEl   && !pEl.dataset.original)  { pEl.dataset.original   = pEl.innerHTML;     pEl.textContent   = edit.p; }
    });

    // 3. drop a few cards off the page (intensity-controlled)
    const dropEnabled = (window.__defaceState && window.__defaceState.dropCards !== false);
    const intensity = (window.__defaceState && window.__defaceState.intensity) || 'standard';
    const dropCount = !dropEnabled ? 0 : (intensity === 'subtle' ? 1 : intensity === 'chaos' ? 6 : 3);
    const droppables = [
      document.querySelector('.stat:nth-child(3)'),
      document.querySelector('.lab:nth-child(2)'),
      document.querySelector('.skill:nth-child(5)'),
      document.querySelector('.lab:nth-child(6)'),
      document.querySelector('.stat:nth-child(1)'),
      document.querySelector('.skill:nth-child(3)'),
    ].filter(Boolean).slice(0, dropCount);
    droppables.forEach((el, i) => {
      ensureRelative(el);
      el.style.setProperty('--dropX', (rand(-40, 80)) + 'px');
      el.style.setProperty('--dropRot', (rand(20, 80)) + 'deg');
      el.style.animationDelay = (0.6 + i * 0.25) + 's';
      el.classList.add('dropping');
    });

  }

  // Guard: only restore innerHTML from dataset if it doesn't contain script tags or
  // inline event handlers — prevents a stored-XSS amplifier if any prior vector
  // managed to mutate one of these elements before the cache was written.
  const safeRestore = (el, val) => {
    if (!val || /<script/i.test(val) || /\bon\w+\s*=/i.test(val)) return;
    el.innerHTML = val;
  };

  function restoreSite(){
    // remove all generated graffiti elements
    document.querySelectorAll('._gfx').forEach(el => el.remove());
    // restore text edits
    TEXT_EDITS.forEach(e => {
      const el = document.querySelector(e.sel);
      if (!el || !el.dataset.original) return;
      safeRestore(el, el.dataset.original);
      delete el.dataset.original;
    });
    document.querySelectorAll('.stats .stat .num').forEach(el => {
      if (el.dataset.original){
        safeRestore(el, el.dataset.original);
        delete el.dataset.original;
        el.style.color = '';
      }
    });
    // restore AI card text + tilt
    document.querySelectorAll('.ai-card').forEach(el => {
      el.style.removeProperty('--ai-rot');
      ['.ai-card-tag','h3','p'].forEach(sel => {
        const child = el.querySelector(sel);
        if (child && child.dataset.original){
          safeRestore(child, child.dataset.original);
          delete child.dataset.original;
        }
      });
    });

    // clear inline transforms and dropping class
    [...document.querySelectorAll('.stat,.lab,.skill,.step,.cert-card,.terminal')].forEach(el => {
      el.style.removeProperty('--rot');
      el.style.removeProperty('--dropX');
      el.style.removeProperty('--dropRot');
      el.style.animationDelay = '';
      el.classList.remove('dropping');
    });
  }

  function setDefaced(on){
    if (on){
      body.classList.remove('defaced');
      void body.offsetWidth;
      body.classList.add('defaced');
      applyDeface();
      if (heroPlayer.deface) heroPlayer.deface();
      defaceBtn.innerHTML = '<span class=”glyph”>⚠</span>Defaced';
      defaceBtn.style.opacity = '0.5';
      cleanBtn.style.display = '';
    } else {
      body.classList.remove('defaced');
      restoreSite();
      if (heroPlayer.restore) heroPlayer.restore();
      defaceBtn.innerHTML = '<span class=”glyph”>⚠</span>Deface';
      defaceBtn.style.opacity = '';
      cleanBtn.style.display = 'none';
    }
  }

  defaceBtn.addEventListener('click', () => setDefaced(true));
  cleanBtn.addEventListener('click', () => setDefaced(false));

  // ── Assessment option tabs ──
  document.querySelectorAll('.assess-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.assess-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.assess-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('assess-panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  // Email address is assembled at runtime (base64) so the plaintext never
  // appears in the served HTML/JS — deters scraper/spam harvesting while
  // keeping the address fully usable for real visitors.
  function _email(){ return atob('cmp2bnRAcHJvdG9ubWFpbC5jb20='); }
  (function(){
    const link = document.getElementById('emailLink');
    if (link) link.href = 'mailto:' + _email() + '?subject=' + encodeURIComponent('Free Assessment Request');
  })();

  function assessSubmit(){
    const domain   = document.getElementById('assess-domain').value.trim();
    const email    = document.getElementById('assess-email').value.trim();
    const notes    = document.getElementById('assess-notes').value.trim();
    const consent  = document.getElementById('assess-consent').checked;
    if (!domain)  { alert('Please enter a domain.'); return; }
    if (!consent) { alert('Please confirm authorisation and consent before submitting.'); return; }
    const subject = encodeURIComponent('Free Assessment Request — ' + domain);
    let body = 'Domain: ' + domain + '\n';
    if (email)  body += 'Contact: ' + email + '\n';
    if (notes)  body += 'Notes: ' + notes + '\n';
    body += '\n-- I confirm I am authorised to request an assessment of this domain.';
    window.location.href = 'mailto:' + _email() + '?subject=' + subject + '&body=' + encodeURIComponent(body);
  }


/* ───────────────────────────── */


  // ============================================================
  //  TWEAKS — host protocol + applied effects
  // ============================================================
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "green",
    "defacePalette": "red",
    "defaceIntensity": "subtle",
    "glitchHero": true,
    "dropCards": false
  }/*EDITMODE-END*/;

  const ACCENT_MAP = {
    green:   { term: 'oklch(0.78 0.16 145)', dim: 'oklch(0.55 0.12 145)' },
    amber:   { term: 'oklch(0.78 0.16 70)',  dim: 'oklch(0.55 0.12 70)'  },
    cyan:    { term: 'oklch(0.78 0.13 220)', dim: 'oklch(0.55 0.10 220)' },
    magenta: { term: 'oklch(0.76 0.18 340)', dim: 'oklch(0.55 0.14 340)' },
  };

  // shared with deface routine
  window.__defaceState = { intensity: 'standard', dropCards: true };

  const tweaks = Object.assign({}, TWEAK_DEFAULTS);

  function applyTweak(key, value){
    tweaks[key] = value;
    if (key === 'accent'){
      const a = ACCENT_MAP[value] || ACCENT_MAP.green;
      document.documentElement.style.setProperty('--term',     a.term);
      document.documentElement.style.setProperty('--term-dim', a.dim);
      document.querySelectorAll('#twAccent .tw-swatch').forEach(s => {
        s.classList.toggle('on', s.dataset.v === value);
      });
    }
    if (key === 'defacePalette'){
      document.body.dataset.defacePalette = value;
      syncSeg('twDefacePalette', value);
    }
    if (key === 'defaceIntensity'){
      window.__defaceState.intensity = value;
      syncSeg('twIntensity', value);
    }
    if (key === 'glitchHero'){
      document.body.classList.toggle('no-glitch', !value);
      syncTog('twGlitch', value);
    }
    if (key === 'dropCards'){
      window.__defaceState.dropCards = !!value;
      syncTog('twDrop', value);
    }
  }
  function syncSeg(id, value){
    document.querySelectorAll('#' + id + ' button').forEach(b => {
      b.classList.toggle('on', b.dataset.v === value);
    });
  }
  function syncTog(id, value){
    document.getElementById(id).classList.toggle('on', !!value);
  }

  function setTweak(key, value){
    applyTweak(key, value);
    try{
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: value } }, window.location.origin);
    } catch(e){}
  }

  // Apply initial state
  Object.keys(tweaks).forEach(k => applyTweak(k, tweaks[k]));

  // Wire controls
  document.querySelectorAll('#twAccent .tw-swatch').forEach(s => {
    s.addEventListener('click', () => setTweak('accent', s.dataset.v));
  });
  document.querySelectorAll('[data-tweak]').forEach(group => {
    const key = group.dataset.tweak;
    if (group.classList.contains('tw-seg')){
      group.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => setTweak(key, b.dataset.v));
      });
    } else if (group.classList.contains('tw-tog')){
      group.addEventListener('click', () => setTweak(key, !tweaks[key]));
    }
  });

  // Host protocol — listener BEFORE announcing availability
  window.addEventListener('message', (e) => {
    if (e.origin !== window.location.origin) return;
    const d = e.data || {};
    if (d.type === '__activate_edit_mode')   document.body.classList.add('tw-active');
    if (d.type === '__deactivate_edit_mode') document.body.classList.remove('tw-active');
  });
  document.getElementById('twClose').addEventListener('click', () => {
    document.body.classList.remove('tw-active');
    try{ window.parent.postMessage({ type: '__edit_mode_dismissed' }, window.location.origin); }catch(e){}
  });
  try{ window.parent.postMessage({ type: '__edit_mode_available' }, window.location.origin); }catch(e){}

  // Drag panel
  (function(){
    const panel = document.getElementById('twPanel');
    const head  = document.getElementById('twHead');
    let dragging = false, startX, startY, origR, origB;
    head.addEventListener('mousedown', e => {
      if (e.target.id === 'twClose') return;
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const r = panel.getBoundingClientRect();
      origR = window.innerWidth  - r.right;
      origB = window.innerHeight - r.bottom;
      e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      panel.style.right  = Math.max(8, origR - (e.clientX - startX)) + 'px';
      panel.style.bottom = Math.max(8, origB - (e.clientY - startY)) + 'px';
    });
    window.addEventListener('mouseup', () => { dragging = false; });
  })();


/* ───────────────────────────── */


  // ---- source tooltips ----
  function buildTooltipContent(tip, text, url) {
    let bubble = tip.querySelector('.src-tooltip');
    if (!bubble) {
      bubble = document.createElement('span');
      bubble.className = 'src-tooltip';
      tip.appendChild(bubble);
    }
    bubble.innerHTML = '';
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = text;
      bubble.appendChild(a);
    } else {
      bubble.textContent = text;
    }
    return bubble;
  }

  function attachTipEvents(tip) {
    let hideTimer = null;

    function showTip() {
      clearTimeout(hideTimer);
      const bubble = tip.querySelector('.src-tooltip');
      if (bubble) bubble.classList.add('visible');
    }
    function schedulHide() {
      hideTimer = setTimeout(() => {
        const bubble = tip.querySelector('.src-tooltip');
        if (bubble) bubble.classList.remove('visible');
      }, 300);
    }

    tip.addEventListener('mouseenter', showTip);
    tip.addEventListener('mouseleave', schedulHide);

    // keep open while hovering the tooltip bubble itself
    tip.addEventListener('mouseover', e => {
      if (e.target.closest('.src-tooltip')) showTip();
    });
    tip.addEventListener('mouseout', e => {
      if (e.target.closest('.src-tooltip')) schedulHide();
    });
  }

  (function(){
    document.querySelectorAll('.stat').forEach(card => {
      const srcEl = card.querySelector('.src');
      if (!srcEl) return;
      const tip = document.createElement('span');
      tip.className = 'src-tip';
      tip.textContent = '?';
      const url = card.dataset.urlPre || '';
      buildTooltipContent(tip, srcEl.textContent, url);
      const labelEl = card.querySelector('.label');
      if (labelEl) labelEl.appendChild(tip);
      else card.appendChild(tip);
      attachTipEvents(tip);
    });
  })();

  // ---- KPI data swap ----
  let currentEra = 'pre';

  function applyEra(era) {
    currentEra = era;
    document.querySelectorAll('.kpi').forEach(card => {
      const suffix = era === 'post' ? 'post' : 'pre';

      // label + tag
      const labelEl = card.querySelector('.label');
      if (labelEl) {
        const existingTip = labelEl.querySelector('.src-tip');
        labelEl.textContent = card.dataset['label' + (era==='post'?'Post':'Pre')];
        if (existingTip) labelEl.appendChild(existingTip);
      }

      // number
      const numEl = card.querySelector('.num');
      if (numEl) numEl.innerHTML = card.dataset['num' + (era==='post'?'Post':'Pre')];

      // cap
      const capEl = card.querySelector('.cap');
      if (capEl) capEl.textContent = card.dataset['cap' + (era==='post'?'Post':'Pre')];

      // src + tooltip
      const srcEl = card.querySelector('.src');
      const srcText = card.dataset['src' + (era==='post'?'Post':'Pre')];
      const srcUrl  = card.dataset['url' + (era==='post'?'Post':'Pre')] || '';
      if (srcEl) srcEl.textContent = srcText;
      const tip = labelEl ? labelEl.querySelector('.src-tip') : card.querySelector('.src-tip');
      if (tip) buildTooltipContent(tip, srcText, srcUrl);

      // delta
      const deltaEl = card.querySelector('.delta');
      if (deltaEl) {
        if (era === 'post') {
          // decode the small set of HTML entities used in data-delta-text, then set as text
          deltaEl.textContent = card.dataset.deltaText
            .replace(/&#9650;/g,'▲').replace(/&#9660;/g,'▼')
            .replace(/&mdash;/g,'—').replace(/&minus;/g,'−')
            .replace(/&amp;/g,'&');
          deltaEl.className = 'delta delta-' + card.dataset.deltaType;
          deltaEl.style.display = '';
        } else {
          deltaEl.style.display = 'none';
        }
      }
    });
  }

  // ---- carousel ----
  (function(){
    const track    = document.getElementById('carouselTrack');
    const dotsEl   = document.getElementById('cDots');
    const labelEl  = document.getElementById('cSlideLabel');
    if (!track) return;
    const slides = track.querySelectorAll('.carousel-slide');
    let cur = 0;

    slides.forEach((_,i) => {
      const d = document.createElement('span');
      d.className = 'c-dot' + (i===0?' active':'');
      dotsEl.appendChild(d);
    });

    function go(n) {
      cur = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${cur * 100}%)`;
      dotsEl.querySelectorAll('.c-dot').forEach((d,i) => d.classList.toggle('active', i===cur));
      if (labelEl) labelEl.textContent = slides[cur].dataset.label || '';
    }

    document.getElementById('cPrev').addEventListener('click', () => go(cur - 1));
    document.getElementById('cNext').addEventListener('click', () => go(cur + 1));
  })();

  function switchEra(era) {
    const btns        = document.querySelectorAll('.era-btn');
    const switchTrack = document.querySelector('.era-switch-track');
    btns.forEach(b => b.classList.toggle('active', b.dataset.era === era));
    if (switchTrack) switchTrack.classList.toggle('on', era === 'post');
    applyEra(era);
    if (statsBanner && statsBanner.setEra) statsBanner.setEra(era);
  }


/* ───────────────────────────── */



/* ── AI Sandbox tab switching ── */
document.querySelectorAll('.ai-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ai-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.ai-scene').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const scene = document.getElementById('scene-' + btn.dataset.scenario);
    if (scene) scene.classList.add('active');
  });
});


/* ── (old terminal code removed) ── */


  // ── Stats banner carousel ──
  const statsBanner = (function(){
    const SETS = {
      pre: [
        { text: 'Did you know that <strong>60%</strong> of small-medium businesses close within 6 months after a cyberattack?', src: 'widely cited industry figure' },
        { text: 'Did you know the average data breach now costs <strong>$4.88 million</strong>?', src: 'IBM Cost of a Data Breach, 2024' },
        { text: 'Did you know the average breach goes <strong>undetected for 194 days</strong>?', src: 'IBM Cost of a Data Breach, 2023' },
        { text: 'Did you know <strong>phishing</strong> is the #1 initial attack vector in breaches?', src: 'Verizon DBIR, 2024' },
        { text: 'Did you know a ransomware attack occurs every <strong>11 seconds</strong> globally?', src: 'Cybersecurity Ventures, 2021' },
      ],
      post: [
        { text: 'Did you know AI-generated phishing emails have a <strong>202% higher click rate</strong> than human-written ones?', src: 'SlashNext H2 2024' },
        { text: 'Did you know AI tools can now discover and exploit vulnerabilities in <strong>hours instead of months</strong>?', src: 'DARPA AI Cyber Challenge, 2024' },
        { text: 'Did you know deepfake audio was used to <strong>steal $25 million</strong> in a single vishing attack?', src: 'Hong Kong Police, 2024' },
        { text: 'Did you know AI-powered malware can <strong>rewrite its own signature</strong> on every execution cycle?', src: 'CrowdStrike Global Threat Report, 2024' },
        { text: 'Did you know AI agents can now run <strong>full attack chains autonomously</strong> — recon to exfiltration?', src: 'MITRE ATLAS, 2024' },
      ],
    };
    const bannerEl = document.getElementById('statsBanner');
    const textEl   = document.querySelector('.stats-banner-text');
    const srcEl    = document.getElementById('statsBannerSrc');
    const dotsEl   = document.getElementById('statsBannerDots');
    if (!textEl || !srcEl || !dotsEl || !bannerEl) return {};

    let cur = 0, timer, activeSet = SETS.pre;

    function buildDots(count) {
      dotsEl.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const dot = document.createElement('i');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => show(i));
        dotsEl.appendChild(dot);
      }
    }

    function show(idx, animate = true) {
      cur = idx;
      dotsEl.querySelectorAll('i').forEach((d, i) => d.classList.toggle('active', i === idx));
      if (animate) {
        textEl.classList.add('fade'); srcEl.classList.add('fade');
        setTimeout(() => {
          textEl.innerHTML = activeSet[idx].text;
          srcEl.textContent = activeSet[idx].src;
          textEl.classList.remove('fade'); srcEl.classList.remove('fade');
        }, 300);
      } else {
        textEl.innerHTML = activeSet[idx].text;
        srcEl.textContent = activeSet[idx].src;
      }
    }

    function next() { show((cur + 1) % activeSet.length); }

    function setEra(era) {
      activeSet = SETS[era] || SETS.pre;
      bannerEl.classList.toggle('era-post', era === 'post');
      clearInterval(timer);
      buildDots(activeSet.length);
      show(0, true);
      timer = setInterval(next, 5000);
    }

    buildDots(activeSet.length);
    show(0, false);
    timer = setInterval(next, 5000);
    bannerEl.addEventListener('mouseenter', () => clearInterval(timer));
    bannerEl.addEventListener('mouseleave', () => { timer = setInterval(next, 5000); });

    return { setEra };
  })();

  // ── Hero terminal asciinema player ──
  const heroPlayer = (function(){
    const el = document.getElementById('heroTermPlayer');
    if (!el || typeof AsciinemaPlayer === 'undefined') return {};

    // Custom themes — palette array format: [black,red,green,yellow,blue,magenta,cyan,white] x2 (normal+bright)
    const SITE_THEME = {
      background: '#10151a',
      foreground: '#e8e3d8',
      cursor:     '#76c682',
      palette:    '#13181d:#c0594a:#76c682:#d4aa50:#5a9fd4:#b57fc0:#50b4c8:#e8e3d8:#353e48:#e07060:#9adea4:#e8c870:#78b8e8:#d098d8:#78ccd8:#f0ece4',
    };

    const DEFACE_THEME = {
      background: '#0c0508',
      foreground: '#ffe4dd',
      cursor:     '#e06050',
      palette:    '#0c0508:#e06050:#e06050:#e07870:#c04040:#e060a0:#c05050:#ffe4dd:#55202e:#ff7060:#ff7060:#ff9080:#e05050:#ff80c0:#e07070:#fff0ee',
    };

    const OPTS = {
      cols: 58, rows: 18, fit: 'width',
      autoPlay: true, loop: true, controls: false,
      terminalFontSize: 'small',
    };

    function mount(castFile, theme) {
      el.innerHTML = '';
      AsciinemaPlayer.create(castFile, el, { ...OPTS, theme });
    }

    mount('/whoami.cast', SITE_THEME);

    return {
      deface:  () => mount('/whoami-defaced.cast', DEFACE_THEME),
      restore: () => mount('/whoami.cast', SITE_THEME),
    };
  })();

  document.getElementById('eraBtnPre').addEventListener('click', () => switchEra('pre'));
  document.getElementById('eraBtnPost').addEventListener('click', () => switchEra('post'));
  document.getElementById('eraSwitch').addEventListener('click', () => {
    const active = document.querySelector('.era-btn.active');
    switchEra(active && active.dataset.era === 'pre' ? 'post' : 'pre');
  });

})();
