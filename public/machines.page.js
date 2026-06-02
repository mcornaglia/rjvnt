;(function(){

  // ============================================================
  // Machine catalogue
  // Boxes with mdFile set load their walkthrough from markdown.
  // Boxes without mdFile use the inline walk object.
  // ============================================================
  const machines = [
    // ===== Hack The Box =====
    { plat:'htb', name:'Active',      os:'windows', diff:'easy',                          mdFile:'/Boxes/HTB/Active - Writeup.md' },
    { plat:'htb', name:'Administrator',os:'windows',diff:'medium', mdFile:'/Boxes/HTB/Administrator.md' },
    { plat:'htb', name:'Aero',        os:'windows', diff:'medium',                                   mdFile:'/Boxes/HTB/Aero.md' },
    { plat:'htb', name:'Arctic',      os:'windows', diff:'easy',                          mdFile:'/Boxes/HTB/Arctic - Writeup.md' },
    { plat:'htb', name:'Bashed',      os:'linux',   diff:'easy',                                            mdFile:'/Boxes/HTB/Bashed - Writeup.md' },
    { plat:'htb', name:'Blackfield',  os:'windows', diff:'hard',      mdFile:'/Boxes/HTB/Blackfield.md' },
    { plat:'htb', name:'Blocky',      os:'linux',   diff:'easy',                                 mdFile:'/Boxes/HTB/Blocky - Writeup.md' },
    { plat:'htb', name:'Blue',        os:'windows', diff:'easy',                                          mdFile:'/Boxes/HTB/Blue - Writeup.md' },
    { plat:'htb', name:'Boardlight',  os:'linux',   diff:'easy',                                    mdFile:'/Boxes/HTB/Boardlight.md' },
    { plat:'htb', name:'Bounty',      os:'windows', diff:'easy',                      mdFile:'/Boxes/HTB/Bounty.md' },
    { plat:'htb', name:'Broker',      os:'linux',   diff:'easy',                            mdFile:'/Boxes/HTB/Broker - Writeup.md' },
    { plat:'htb', name:'Busqueda',    os:'linux',   diff:'easy',                         mdFile:'/Boxes/HTB/Busqueda - Writeup.md' },
    { plat:'htb', name:'CCTV',        os:'linux',   diff:'medium',                           mdFile:'/Boxes/HTB/CCTV.md' },
    { plat:'htb', name:'Chatterbox',  os:'windows', diff:'medium',                                  mdFile:'/Boxes/HTB/Chatterbox.md' },
    { plat:'htb', name:'Cicada',      os:'windows', diff:'easy',                                  mdFile:'/Boxes/HTB/Cicada - Writeup.md' },
    { plat:'htb', name:'CodeTwo',     os:'linux',   diff:'easy',                                              mdFile:'/Boxes/HTB/CodeTwo - Writeup.md' },
    { plat:'htb', name:'Codify',      os:'linux',   diff:'easy',                       mdFile:'/Boxes/HTB/Codify.md' },
    { plat:'htb', name:'Devel',       os:'windows', diff:'easy',                            mdFile:'/Boxes/HTB/Devel - Writeup.md' },
    { plat:'htb', name:'Editorial',   os:'linux',   diff:'easy',                                mdFile:'/Boxes/HTB/Editorial.md' },
    { plat:'htb', name:'Escape',      os:'windows', diff:'medium',                         mdFile:'/Boxes/HTB/Escape - Writeup.md' },
    { plat:'htb', name:'Expressway',  os:'linux',   diff:'easy',                                    mdFile:'/Boxes/HTB/Expressway - Writeup.md' },
    { plat:'htb', name:'Flight',      os:'windows', diff:'hard',                 mdFile:'/Boxes/HTB/Flight - Writeup.md' },
    { plat:'htb', name:'Fluffy',      os:'windows', diff:'medium',       mdFile:'/Boxes/HTB/Fluffy - Writeup.md' },
    { plat:'htb', name:'Forest',      os:'windows', diff:'easy',             mdFile:'/Boxes/HTB/Forest - Writeup.md' },
    { plat:'htb', name:'Heist',       os:'windows', diff:'easy',                     mdFile:'/Boxes/HTB/Heist.md' },
    { plat:'htb', name:'Intelligence',os:'windows', diff:'medium',            mdFile:'/Boxes/HTB/Intelligence.md' },
    { plat:'htb', name:'Irked',       os:'linux',   diff:'easy',                                           mdFile:'/Boxes/HTB/Irked.md' },
    { plat:'htb', name:'Jerry',       os:'windows', diff:'easy',                            mdFile:'/Boxes/HTB/Jerry - Writeup.md' },
    { plat:'htb', name:'Keeper',      os:'linux',   diff:'easy',                                  mdFile:'/Boxes/HTB/Keeper - Writeup.md' },
    { plat:'htb', name:'Knife',       os:'linux',   diff:'easy',                          mdFile:'/Boxes/HTB/Knife - Writeup.md' },
    { plat:'htb', name:'Legacy',      os:'windows', diff:'easy',                                mdFile:'/Boxes/HTB/Legacy - Writeup.md' },
    { plat:'htb', name:'Magic',       os:'linux',   diff:'medium',               mdFile:'/Boxes/HTB/Magic.md' },
    { plat:'htb', name:'Monteverde',  os:'windows', diff:'medium',                         mdFile:'/Boxes/HTB/Monteverde - Writeup.md' },
    { plat:'htb', name:'Netmon',      os:'windows', diff:'easy',                                        mdFile:'/Boxes/HTB/Netmon - Writeup.md' },
    { plat:'htb', name:'Pandora',     os:'linux',   diff:'easy',                        mdFile:'/Boxes/HTB/Pandora - Writeup.md' },
    { plat:'htb', name:'Pilgrimage',  os:'linux',   diff:'easy',                             mdFile:'/Boxes/HTB/Pilgrimage - Writeup.md' },
    { plat:'htb', name:'Planning',    os:'linux',   diff:'easy',                                     mdFile:'/Boxes/HTB/Planning - Writeup.md' },
    { plat:'htb', name:'Poison',      os:'linux',   diff:'medium',                                mdFile:'/Boxes/HTB/Poison.md' },
    { plat:'htb', name:'Popcorn',     os:'linux',   diff:'medium',                    mdFile:'/Boxes/HTB/Popcorn.md' },
    { plat:'htb', name:'Remote',      os:'windows', diff:'easy',                  mdFile:'/Boxes/HTB/Remote.md' },
    { plat:'htb', name:'Return',      os:'windows', diff:'easy',                 mdFile:'/Boxes/HTB/Return - Writeup.md' },
    { plat:'htb', name:'Sau',         os:'linux',   diff:'easy',                                      mdFile:'/Boxes/HTB/Sau - Writeup.md' },
    { plat:'htb', name:'Sauna',       os:'windows', diff:'easy',              mdFile:'/Boxes/HTB/Sauna - Writeup.md' },
    { plat:'htb', name:'Sea',         os:'linux',   diff:'easy',                      mdFile:'/Boxes/HTB/Sea - Writeup.md' },
    { plat:'htb', name:'Servmon',     os:'windows', diff:'easy',                                 mdFile:'/Boxes/HTB/Servmon - Writeup.md' },
    { plat:'htb', name:'Soccer',      os:'linux',   diff:'easy',                         mdFile:'/Boxes/HTB/Soccer.md' },
    { plat:'htb', name:'Solidstate',  os:'linux',   diff:'medium',                            mdFile:'/Boxes/HTB/Solidstate - Writeup.md' },
    { plat:'htb', name:'Support',     os:'windows', diff:'easy',                  mdFile:'/Boxes/HTB/Support - Writeup.md' },
    { plat:'htb', name:'Swagshop',    os:'linux',   diff:'easy',                                mdFile:'/Boxes/HTB/Swagshop - Writeup.md' },
    { plat:'htb', name:'Tabby',       os:'linux',   diff:'easy',                                  mdFile:'/Boxes/HTB/Tabby.md' },
    { plat:'htb', name:'Tartarsauce', os:'linux',   diff:'medium',                            mdFile:'/Boxes/HTB/Tartarsauce.md' },
    { plat:'htb', name:'Timelapse',   os:'windows', diff:'easy',                            mdFile:'/Boxes/HTB/Timelapse - Writeup.md' },
    { plat:'htb', name:'Titanic',     os:'linux',   diff:'easy',                mdFile:'/Boxes/HTB/Titanic.md' },
    { plat:'htb', name:'Tombwatcher', os:'windows', diff:'medium',                mdFile:'/Boxes/HTB/Tombwatcher.md' },
    { plat:'htb', name:'UpDown',      os:'linux',   diff:'medium',                   mdFile:'/Boxes/HTB/UpDown - Writeup.md' },
    { plat:'htb', name:'Usage',       os:'linux',   diff:'easy',                       mdFile:'/Boxes/HTB/Usage.md' },

    // ===== Proving Grounds =====
    { plat:'pg', name:'Access',       os:'windows', diff:'medium',               mdFile:'/Boxes/Proving Grounds/Access.md' },
    { plat:'pg', name:'Astronaut',    os:'linux',   diff:'easy',                                     mdFile:'/Boxes/Proving Grounds/Astronaut - Writeup.md' },
    { plat:'pg', name:'AuthBy',       os:'windows', diff:'easy',                                mdFile:'/Boxes/Proving Grounds/AuthBy.md' },
    { plat:'pg', name:'Billyboss',    os:'windows', diff:'medium',                       mdFile:'/Boxes/Proving Grounds/Billyboss.md' },
    { plat:'pg', name:'BitForge',     os:'linux',   diff:'easy',                   mdFile:'/Boxes/Proving Grounds/BitForge.md' },
    { plat:'pg', name:'Bullybox',     os:'linux',   diff:'easy',                                   mdFile:'/Boxes/Proving Grounds/Bullybox.md' },
    { plat:'pg', name:'ClamAV',       os:'linux',   diff:'easy',                                        mdFile:'/Boxes/Proving Grounds/ClamAV - Writeup.md' },
    { plat:'pg', name:'Compromised',  os:'windows', diff:'medium',                                      mdFile:'/Boxes/Proving Grounds/Compromised - Writeup.md' },
    { plat:'pg', name:'DVR4',         os:'windows', diff:'easy',                     mdFile:'/Boxes/Proving Grounds/DVR4.md' },
    { plat:'pg', name:'Exfiltrated',  os:'linux',   diff:'easy',                mdFile:'/Boxes/Proving Grounds/Exfiltrated.md' },
    { plat:'pg', name:'Fanatastic',   os:'linux',   diff:'easy',                   mdFile:'/Boxes/Proving Grounds/Fanatastic.md' },
    { plat:'pg', name:'Fired',        os:'linux',   diff:'easy',                                  mdFile:'/Boxes/Proving Grounds/Fired.md' },
    { plat:'pg', name:'Fish',         os:'linux',   diff:'easy',                 mdFile:'/Boxes/Proving Grounds/Fish.md' },
    { plat:'pg', name:'Flimsy',       os:'linux',   diff:'medium',                                mdFile:'/Boxes/Proving Grounds/Flimsy - Writeup.md' },
    { plat:'pg', name:'Flu',          os:'linux',   diff:'easy',                        mdFile:'/Boxes/Proving Grounds/Flu.md' },
    { plat:'pg', name:'Fractal',      os:'linux',   diff:'hard',                        mdFile:'/Boxes/Proving Grounds/Fractal - Writeup.md' },
    { plat:'pg', name:'Hepet',        os:'linux',   diff:'easy',                                mdFile:'/Boxes/Proving Grounds/Hepet.md' },
    { plat:'pg', name:'Hokkaido',     os:'windows', diff:'medium',           mdFile:'/Boxes/Proving Grounds/Hokkaido - Writeup.md' },
    { plat:'pg', name:'Hub',          os:'linux',   diff:'easy',                                            mdFile:'/Boxes/Proving Grounds/Hub - Writeup.md' },
    { plat:'pg', name:'Hunit',        os:'linux',   diff:'easy',                            mdFile:'/Boxes/Proving Grounds/Hunit.md' },
    { plat:'pg', name:'Hutch',        os:'windows', diff:'medium',                   mdFile:'/Boxes/Proving Grounds/Hutch - Writeup.md' },
    { plat:'pg', name:'Internal',     os:'windows', diff:'easy',                              mdFile:'/Boxes/Proving Grounds/Internal - Writeup.md' },
    { plat:'pg', name:'Jacko',        os:'windows', diff:'medium',                        mdFile:'/Boxes/Proving Grounds/Jacko - Writeup.md' },
    { plat:'pg', name:'LaVita',       os:'linux',   diff:'easy',                                      mdFile:'/Boxes/Proving Grounds/LaVita.md' },
    { plat:'pg', name:'Levram',       os:'linux',   diff:'easy',                          mdFile:'/Boxes/Proving Grounds/Levram.md' },
    { plat:'pg', name:'Mantis',       os:'linux',   diff:'easy',                                     mdFile:'/Boxes/Proving Grounds/Mantis.md' },
    { plat:'pg', name:'Marketing',    os:'linux',   diff:'easy',                                mdFile:'/Boxes/Proving Grounds/Marketing.md' },
    { plat:'pg', name:'Medjed',       os:'windows', diff:'easy',                         mdFile:'/Boxes/Proving Grounds/Medjed.md' },
    { plat:'pg', name:'Monster',      os:'linux',   diff:'easy',                                         mdFile:'/Boxes/Proving Grounds/Monster.md' },
    { plat:'pg', name:'MZEEAV',       os:'windows', diff:'easy',              mdFile:'/Boxes/Proving Grounds/MZEEAV.md' },
    { plat:'pg', name:'Nagoya',       os:'windows', diff:'hard',       mdFile:'/Boxes/Proving Grounds/Nagoya - Writeup.md' },
    { plat:'pg', name:'Nickel',       os:'windows', diff:'medium',                        mdFile:'/Boxes/Proving Grounds/Nickel.md' },
    { plat:'pg', name:'Ochima',       os:'linux',   diff:'easy',                                           mdFile:'/Boxes/Proving Grounds/Ochima.md' },
    { plat:'pg', name:'PayDay',       os:'linux',   diff:'easy',                                               mdFile:'/Boxes/Proving Grounds/PayDay - Writeup.md' },
    { plat:'pg', name:'Pebbles',      os:'linux',   diff:'easy',                            mdFile:'/Boxes/Proving Grounds/Pebbles - Writeup.md' },
    { plat:'pg', name:'Peppo',        os:'linux',   diff:'easy',                                   mdFile:'/Boxes/Proving Grounds/Peppo.md' },
    { plat:'pg', name:'Quackerjack',  os:'linux',   diff:'easy',                             mdFile:'/Boxes/Proving Grounds/Quackerjack.md' },
    { plat:'pg', name:'Readys',       os:'linux',   diff:'easy',               mdFile:'/Boxes/Proving Grounds/Readys.md' },
    { plat:'pg', name:'Resourced',    os:'windows', diff:'medium',                                     mdFile:'/Boxes/Proving Grounds/Resourced - Writeup.md' },
    { plat:'pg', name:'Roquefort',    os:'linux',   diff:'easy',                                        mdFile:'/Boxes/Proving Grounds/Roquefort.md' },
    { plat:'pg', name:'Scrutiny',     os:'windows', diff:'medium',                                 mdFile:'/Boxes/Proving Grounds/Scrutiny.md' },
    { plat:'pg', name:'Shenzi',       os:'windows', diff:'easy',                               mdFile:'/Boxes/Proving Grounds/Shenzi.md' },
    { plat:'pg', name:'Slort',        os:'windows', diff:'easy',                                    mdFile:'/Boxes/Proving Grounds/Slort.md' },
    { plat:'pg', name:'Snookums',     os:'linux',   diff:'easy',                               mdFile:'/Boxes/Proving Grounds/Snookums - Writeup.md' },
    { plat:'pg', name:'Sorcerer',     os:'linux',   diff:'easy',                                          mdFile:'/Boxes/Proving Grounds/Sorcerer.md' },
    { plat:'pg', name:'SPX',          os:'linux',   diff:'easy',                   mdFile:'/Boxes/Proving Grounds/SPX.md' },
    { plat:'pg', name:'SpiderSociety',os:'linux',   diff:'easy',                                      mdFile:'/Boxes/Proving Grounds/SpiderSociety.md' },
    { plat:'pg', name:'Squid',        os:'windows', diff:'easy',                                 mdFile:'/Boxes/Proving Grounds/Squid.md' },
    { plat:'pg', name:'Symbolic',     os:'windows', diff:'medium',                           mdFile:'/Boxes/Proving Grounds/Symbolic - Writeup.md' },
    { plat:'pg', name:'Sybaris',      os:'linux',   diff:'easy',                                                    mdFile:'/Boxes/Proving Grounds/Sybaris.md' },
    { plat:'pg', name:'Twiggy',       os:'linux',   diff:'easy',                            mdFile:'/Boxes/Proving Grounds/Twiggy - Writeup.md' },
    { plat:'pg', name:'Vault',        os:'windows', diff:'medium',                       mdFile:'/Boxes/Proving Grounds/Vault - Writeup.md' },
    { plat:'pg', name:'Vmdak',        os:'linux',   diff:'easy',                          mdFile:'/Boxes/Proving Grounds/Vmdak.md' },
    { plat:'pg', name:'WallpaperHub', os:'linux',   diff:'easy',                  mdFile:'/Boxes/Proving Grounds/WallpaperHub.md' },
    { plat:'pg', name:'Wombo',        os:'linux',   diff:'easy',                                              mdFile:'/Boxes/Proving Grounds/Wombo.md' },
    { plat:'pg', name:'XposedAPI',    os:'linux',   diff:'easy',                 mdFile:'/Boxes/Proving Grounds/XposedAPI.md' },
    { plat:'pg', name:'Zab',          os:'linux',   diff:'easy',                                            mdFile:'/Boxes/Proving Grounds/Zab.md' },
    { plat:'pg', name:'Zipper',       os:'linux',   diff:'easy',                              mdFile:'/Boxes/Proving Grounds/Zipper.md' },

    // ===== HackSmarter =====
    { plat:'hs', name:'Arasaka',     os:'windows', diff:'hard',  mdFile:'/Boxes/HackSmarter/Arasaka.md' },
    { plat:'hs', name:'BankSmarter', os:'linux',   diff:'medium',           mdFile:'/Boxes/HackSmarter/BankSmarter.md' },
    { plat:'hs', name:'Samurai',     os:'linux',   diff:'medium',                          mdFile:'/Boxes/HackSmarter/Samurai.md' },
  ];

  // ============================================================
  // Rendering
  // ============================================================
  const list = document.getElementById('machineList');
  const tabs = document.querySelectorAll('.tab[data-tab]');
  const totals = document.querySelectorAll('.total[data-tab]');
  const osFilter = document.getElementById('osFilter');
  const diffFilter = document.getElementById('diffFilter');
  const search = document.getElementById('search');
  const tagFilterChip = document.getElementById('tagFilterChip');

  const platformLabel = { pg:'Proving Grounds', htb:'Hack The Box', hs:'HackSmarter' };
  const platformOrder = ['htb','pg','hs'];

  let state = { tab: 'all', os: '', diff: '', q: '', tag: '' };

  function setTagFilter(tag){
    state.tag = tag;
    if (tag){
      tagFilterChip.style.display = '';
      tagFilterChip.innerHTML = `<span class="tag-filter-chip">#${tag.replace(/[<>"&]/g,c=>({'<':'&lt;','>':'&gt;','"':'&quot;','&':'&amp;'}[c]))} <span class="x">×</span></span>`;
      tagFilterChip.querySelector('.tag-filter-chip').addEventListener('click', () => setTagFilter(''));
    } else {
      tagFilterChip.style.display = 'none';
      tagFilterChip.innerHTML = '';
    }
    // sync active state on all visible row tags
    document.querySelectorAll('.row .vec .tag').forEach(el => {
      el.classList.toggle('tag-active', el.dataset.tag === tag);
    });
    render();
  }

  function setTab(t){
    state.tab = t;
    tabs.forEach(x => x.classList.toggle('active', x.dataset.tab === t));
    totals.forEach(x => x.classList.toggle('active', x.dataset.tab === t));
    render();
  }

  tabs.forEach(t => t.addEventListener('click', () => {
    history.replaceState(null,'','#'+t.dataset.tab);
    setTab(t.dataset.tab);
  }));
  totals.forEach(t => t.addEventListener('click', e => {
    e.preventDefault();
    history.replaceState(null,'','#'+t.dataset.tab);
    setTab(t.dataset.tab);
  }));
  osFilter.addEventListener('change', e => { state.os = e.target.value; render(); });
  diffFilter.addEventListener('change', e => { state.diff = e.target.value; render(); });
  search.addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); render(); });

  function matches(m){
    if (state.tab !== 'all' && m.plat !== state.tab) return false;
    if (state.os && m.os !== state.os) return false;
    if (state.diff && m.diff !== state.diff) return false;
    if (state.tag){
      const allTags = (m.mdTags||[]).map(t => t.toLowerCase());
      if (!allTags.includes(state.tag.toLowerCase())) return false;
    }
    if (state.q){
      const hay = [m.name, m.vec, ...(m.mdTags||[]), m.os, m.diff].join(' ').toLowerCase();
      if (!hay.includes(state.q)) return false;
    }
    return true;
  }

  function tagsHtml(tags){ return (tags||[]).map(t => { const s=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); return `<span class="tag${state.tag===t?' tag-active':''}" data-tag="${s}">${s}</span>`; }).join(''); }

  const hesc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  function rowHtml(m, idx){
    return `<div class="row" data-idx="${idx}">
      <span class="idx">${String(idx+1).padStart(3,'0')}</span>
      <div class="name">${hesc(m.name)}<small>${hesc(platformLabel[m.plat])}</small></div>
      <span class="os">${hesc(m.os)}</span>
      <span class="diff ${hesc(m.diff)}">${hesc(m.diff)}</span>
      <div class="vec"><div>${tagsHtml(m.mdTags)}</div></div>
      <span class="open">open →</span>
    </div>`;
  }

  function headRow(){
    return `<div class="row row-head">
      <span></span><span>name</span><span>os</span><span>difficulty</span><span>tags</span><span></span>
    </div>`;
  }

  function render(){
    if (!list) { console.error('[machines] #machineList not found in DOM'); return; }
    const visible = machines.map((m,i) => ({m, i})).filter(x => matches(x.m));
    if (visible.length === 0){
      list.innerHTML = `<div class="empty">no machines match these filters.</div>`;
      return;
    }
    if (state.tab === 'all'){
      // group by platform
      let html = '';
      platformOrder.forEach(plat => {
        const subset = visible.filter(x => x.m.plat === plat);
        if (subset.length === 0) return;
        html += `<div class="group-head"><h3>${platformLabel[plat]}</h3><div class="meta"><b>${subset.length}</b> machines · ${subset.filter(s=>s.m.os==='linux').length} linux · ${subset.filter(s=>s.m.os==='windows').length} windows</div></div>`;
        html += headRow();
        subset.forEach(x => { html += rowHtml(x.m, x.i); });
      });
      list.innerHTML = html;
    } else {
      let html = '';
      html += `<div class="group-head"><h3>${platformLabel[state.tab]}</h3><div class="meta"><b>${visible.length}</b> matches</div></div>`;
      html += headRow();
      visible.forEach(x => { html += rowHtml(x.m, x.i); });
      list.innerHTML = html;
    }
    list.querySelectorAll('.row[data-idx]').forEach(r => {
      r.addEventListener('click', e => {
        const tagEl = e.target.closest('.tag[data-tag]');
        if (tagEl) { e.stopPropagation(); setTagFilter(tagEl.dataset.tag === state.tag ? '' : tagEl.dataset.tag); return; }
        openDrawer(parseInt(r.dataset.idx));
      });
    });
  }

  // ============================================================
  // Drawer
  // ============================================================
  const drawer = document.getElementById('drawer');
  const drawerBg = document.getElementById('drawerBg');
  const dTitle = document.getElementById('drawerTitle');
  const dIp = document.getElementById('drawerIp');
  const dMeta = document.getElementById('drawerMeta');
  const dBody = document.getElementById('drawerBody');

  function stepsHtml(steps){
    if (!steps || steps.length === 0) return `<div style="color: var(--ink-3); font-family:'JetBrains Mono',monospace; font-size:12px;">(brief — no notes captured)</div>`;
    return `<div class="walk-steps">${steps.map(s => `
      <div class="walk-step">
        <div>
          <h4>${s.h}</h4>
          ${s.p ? `<p>${s.p}</p>` : ''}
          ${s.c ? `<div class="cmd"><span class="lbl">$</span> ${s.c.replace(/</g,'&lt;')}</div>` : ''}
        </div>
      </div>`).join('')}</div>`;
  }

  // ============================================================
  // Markdown → HTML renderer (lightweight, no deps)
  // ============================================================
  function mdToHtml(md, baseImagePath) {
    // strip YAML frontmatter
    md = md.replace(/^---[\s\S]*?---\n?/, '');

    // extract #tags from first non-empty line (Obsidian tag line like "#box #rce #sudo")
    let mdTags = [];
    md = md.replace(/^([^\n]*#\w[^\n]*)\n/, (_, line) => {
      const found = (line.match(/#([\w][\w-]*)/g) || []).map(t => t.slice(1)).filter(t => t !== 'box');
      if (found.length) { mdTags = found; return ''; }
      return line + '\n';
    });

    // collect tags from **Tags:** #foo #bar lines (PG format), then strip the #tags from those lines
    md = md.replace(/(\*\*Tags:\*\*)([^\n]+)/g, (_, label, rest) => {
      (rest.match(/#([\w][\w.-]*)/g)||[]).forEach(t => {
        const v = t.slice(1);
        if (v !== 'box' && !mdTags.includes(v)) mdTags.push(v);
      });
      return '';
    });

    // extract date from *Created: M/D/YYYY* or *Created: MM/DD/YYYY*
    let mdDate = '';
    const dateMatch = md.match(/\*Created:\s*(\d{1,2}\/\d{1,2}\/\d{4})\*/);
    if (dateMatch) mdDate = dateMatch[1];

    // replace *Asciinema Cast: [label](path.cast)* with player placeholder
    const castBlocks = [];
    md = md.replace(/\*Asciinema Cast:\s*\[([^\]]+)\]\(([^)]+\.cast)\)\*/g, (_, label, castPath) => {
      const idx = castBlocks.length;
      castBlocks.push({ label, path: castPath.replace(/[^a-zA-Z0-9._\-/]/g, '') });
      return `\x00CAST${idx}\x00`;
    });

    // strip BOM and zero-width chars
    md = md.replace(/[﻿​‌‍]/g, '');

    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
    // quote-escape for values already passed through esc() but placed in attributes
    const qesc = s => String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    // full attribute escape for RAW (not-yet-escaped) strings
    const escAttr = s => qesc(esc(s));
    // allow only safe URL schemes; neutralise javascript:, vbscript:, data:text/html, …
    const safeUrl = u => {
      const t = String(u).trim();
      if (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(t)) return t;
      if (/^data:image\//i.test(t)) return t;
      if (/^[a-z][a-z0-9+.\-]*:/i.test(t)) return '#';
      return t;
    };

    // Escape the whole document up-front so author/markdown-file text can never
    // inject markup. Only & and < are escaped, so markdown structural chars
    // (including blockquote '>') still parse; code blocks must NOT re-escape.
    md = esc(md);

    // process fenced code blocks first (preserve content verbatim)
    // lang can be any non-newline chars (sh, bash, powershell, python, etc.)
    const codeBlocks = [];

    // extract fenced code blocks inside blockquotes (lines prefixed with "> ")
    md = md.replace(/^(> ```([^\n`]*)\n)((?:>[ \t]?[^\n]*\n)*?)^> ```/gm, (_, open, lang, body) => {
      const idx = codeBlocks.length;
      const langClean = esc(lang.trim() || 'sh');
      const code = body.replace(/^>[ \t]?/gm, '');
      codeBlocks.push(`<div class="md-code"><span class="lbl">${langClean}</span><pre>${code.trimEnd()}</pre></div>`);
      return `> \x00CODE${idx}\x00`;
    });

    // extract top-level fenced code blocks
    md = md.replace(/^```([^\n`]*)\n([\s\S]*?)^```/gm, (_, lang, code) => {
      const idx = codeBlocks.length;
      const langClean = esc(lang.trim() || 'sh');
      codeBlocks.push(`<div class="md-code"><span class="lbl">${langClean}</span><pre>${code.trimEnd()}</pre></div>`);
      return `\x00CODE${idx}\x00`;
    });

    // inline code
    md = md.replace(/`([^`]+)`/g, (_, c) => `<code class="md-inline-code">${c}</code>`);

    // Obsidian wiki-link images: ![[attachments/file.ext]]
    md = md.replace(/!\[\[attachments\/([^\]]+)\]\]/g, (_, file) => {
      return `<img class="md-img" src="${qesc(safeUrl(baseImagePath + file))}" alt="${qesc(file)}" loading="lazy"/>`;
    });

    // Standard markdown images: ![alt](./attachments/file) or ![alt](attachments/file)
    md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
      if (src.startsWith('./attachments/')) {
        src = baseImagePath + src.slice('./attachments/'.length);
      } else if (src.startsWith('attachments/')) {
        src = baseImagePath + src.slice('attachments/'.length);
      }
      return `<img class="md-img" src="${qesc(safeUrl(src))}" alt="${qesc(alt)}" loading="lazy"/>`;
    });

    // bold
    md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // italic
    md = md.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

    // links
    md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) =>
      `<a class="md-link" href="${qesc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${text}</a>`);

    // process line by line
    const lines = md.split('\n');
    let html = '';
    let inList = false;

    let inBlockquote = false;
    let bqType = '';

    function closeBlockquote() {
      if (inBlockquote) { html += '</div>'; inBlockquote = false; bqType = ''; }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // restore cast players
      if (line.includes('\x00CAST')) {
        if (inList) { html += '</ul>'; inList = false; }
        closeBlockquote();
        html += line.replace(/\x00CAST(\d+)\x00/g, (_, n) => {
          const c = castBlocks[+n];
          return `<div class="cast-wrap"><div class="cast-label">▶ ${esc(c.label)}</div><div class="cast-player" data-cast="${escAttr(c.path)}"></div></div>`;
        });
        continue;
      }

      // restore code blocks
      if (line.includes('\x00CODE')) {
        if (inList) { html += '</ul>'; inList = false; }
        closeBlockquote();
        html += line.replace(/\x00CODE(\d+)\x00/g, (_, n) => codeBlocks[+n]);
        continue;
      }

      // blockquote / callout: lines starting with >
      if (/^>/.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        const content = line.replace(/^>\s?/, '');
        // callout title: >[!type] or >[!type text]
        const calloutMatch = content.match(/^!\[([^\]]*)\]\s*(.*)$/);
        if (calloutMatch) {
          closeBlockquote();
          const type = calloutMatch[1].toLowerCase();
          const extra = calloutMatch[2].trim();
          bqType = type;
          inBlockquote = true;
          html += `<div class="md-callout md-callout-${type}"><div class="md-callout-title">${calloutMatch[1]}${extra ? ' — ' + extra : ''}</div>`;
        } else {
          if (!inBlockquote) {
            inBlockquote = true;
            bqType = 'note';
            html += `<div class="md-callout md-callout-note">`;
          }
          if (content.includes('\x00CODE')) {
            html += content.replace(/\x00CODE(\d+)\x00/g, (_, n) => codeBlocks[+n]);
          } else if (content.trim()) {
            html += `<p class="md-callout-p">${content}</p>`;
          }
        }
        continue;
      }

      // non-> line closes any open blockquote
      closeBlockquote();

      if (/^---+$/.test(line.trim())) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<hr class="md-hr"/>';
        continue;
      }
      if (/^# /.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h2 class="md-h1">${line.slice(2)}</h2>`;
        continue;
      }
      if (/^## /.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3 class="md-h2">${line.slice(3)}</h3>`;
        continue;
      }
      if (/^#### /.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h5 class="md-h4">${line.slice(5)}</h5>`;
        continue;
      }
      if (/^### /.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h4 class="md-h3">${line.slice(4)}</h4>`;
        continue;
      }
      if (/^- /.test(line) || /^\* /.test(line) || /^\d+\. /.test(line)) {
        if (!inList) { html += '<ul class="md-list">'; inList = true; }
        html += `<li>${line.replace(/^[-*\d.]+\s+/,'')}</li>`;
        continue;
      }
      if (inList) { html += '</ul>'; inList = false; }
      if (line.trim() === '') {
        html += '<div class="md-spacer"></div>';
        continue;
      }
      html += `<p class="md-p">${line}</p>`;
    }
    if (inList) html += '</ul>';
    closeBlockquote();

    let tagsLine = '';
    if (mdTags.length){
      tagsLine = `<div class="md-tags-line">${mdTags.map(t => { const s=esc(t); const sa=s.replace(/"/g,'&quot;'); return `<span class="md-tag" data-tag="${sa}">#${s}</span>`; }).join('')}</div>`;
    }
    return { html: tagsLine + html, tags: mdTags, date: mdDate };
  }

  function renderDrawerMeta(m){
    dMeta.innerHTML = `
      <span class="chip">${m.os}</span>
      <span class="chip">${m.diff}</span>
    `;
  }

  function openDrawer(i){
    const m = machines[i];
    dTitle.textContent = m.name;
    dIp.textContent = [m.ip, platformLabel[m.plat], m.date ? 'rooted ' + m.date : ''].filter(Boolean).join(' · ');
    renderDrawerMeta(m, []);

    if (m.mdFile) {
      // Load from markdown file
      dBody.innerHTML = `<div class="md-loading">loading walkthrough…</div>`;
      drawer.classList.add('open');
      drawerBg.classList.add('open');
      document.body.style.overflow = 'hidden';
      drawer.scrollTop = 0;

      const baseImagePath = m.mdFile.replace(/\/[^/]+\.md$/, '/attachments/');
      fetch(m.mdFile + '?v=' + Date.now())
        .then(r => {
          if (!r.ok) throw new Error('not found');
          return r.text();
        })
        .then(md => {
          const result = mdToHtml(md, baseImagePath);
          dBody.innerHTML = `<div class="md-body">${result.html}</div>`;
          // merge md tags into machine record and re-render meta chips
          if (result.tags.length){ m.mdTags = result.tags; renderDrawerMeta(m); }
          if (result.date){ m.mdDate = result.date; render(); }
          // wire tag clicks inside the rendered markdown body
          dBody.querySelectorAll('.md-tag[data-tag]').forEach(el => {
            el.addEventListener('click', () => { closeDrawer(); setTagFilter(el.dataset.tag === state.tag ? '' : el.dataset.tag); });
          });
          // init asciinema players
          dBody.querySelectorAll('.cast-player[data-cast]').forEach(el => {
            const castPath = m.mdFile.replace(/\/[^/]+\.md$/, '/') + el.dataset.cast;
            AsciinemaPlayer.create(castPath, el, {
              cols: 120, rows: 28,
              theme: 'monokai',
              fit: 'width',
              autoPlay: false,
              controls: true,
            });
          });
        })
        .catch(() => {
          dBody.innerHTML = `<div class="empty">walkthrough file not found.<br><code>${m.mdFile.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</code></div>`;
        });
    } else {
      // Inline walk data
      dBody.innerHTML = `
        <h3 class="section-label">Reconnaissance</h3>
        ${stepsHtml(m.walk.recon)}
        <h3 class="section-label amber">Foothold</h3>
        ${stepsHtml(m.walk.foothold)}
        <h3 class="section-label">Privilege escalation</h3>
        ${stepsHtml(m.walk.privesc)}
        ${m.walk.keynote ? `<div class="keynote"><b>Lesson:</b> ${m.walk.keynote}</div>` : ''}
      `;
      drawer.classList.add('open');
      drawerBg.classList.add('open');
      document.body.style.overflow = 'hidden';
      drawer.scrollTop = 0;
    }
  }
  function closeDrawer(){
    drawer.classList.remove('open');
    drawerBg.classList.remove('open');
    document.body.style.overflow = '';
  }
  drawerBg.addEventListener('click', closeDrawer);
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  // initial state from hash
  const validTabs = ['all','pg','htb','hs'];
  const h = window.location.hash.slice(1);
  try {
    if (validTabs.includes(h)) setTab(h); else setTab('all');
  } catch(e) { console.error('[machines] render failed:', e); }

  // load pre-built index (1 fetch instead of 117)
  fetch('/machines-index.json?v=' + Date.now())
    .then(r => r.json())
    .then(index => {
      const byFile = {};
      index.forEach(e => { byFile['/' + e.mdFile] = e; });
      let changed = false;
      machines.forEach(m => {
        const e = byFile[m.mdFile];
        if (!e) return;
        if (e.tags && e.tags.length){ m.mdTags = e.tags; changed = true; }
        if (e.date){ m.mdDate = e.date; changed = true; }
      });
      if (changed) render();
    })
    .catch(() => {});


})();
