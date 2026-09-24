/* ==========================================================
   CRIMSON CENTURIES — interface
   ========================================================== */

const UI = (() => {
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');
  const overlayRoot = document.getElementById('overlay-root');
  const toasts = document.getElementById('toasts');

  let tab = 'city';
  let selDist = null;
  let chronTab = 'journal';
  let current = null;
  const queue = [];

  const pct = p => `${Math.round(p * 100)}%`;
  const roman = n => ['', 'I', 'II', 'III'][n] || '';
  const signed = v => (v > 0 ? '+' : '') + v;

  /* ---------------- scenes (modal) ---------------- */
  function scene(sc) {
    if (current) { queue.push(sc); return; }
    show(sc);
  }

  function chipHtml(c) {
    const good = (c.v > 0 ? 1 : -1) * (DATA.POLARITY[c.k] || 1) > 0;
    const label = c.k === 'gold' ? `${c.v > 0 ? '+' : '−'}£${Math.abs(c.v)}` : c.k === 'havenLoss' ? 'Haven lost' : `${c.v > 0 ? '+' : '−'}${Math.abs(c.v)} ${DATA.LABELS[c.k]}`;
    return `<span class="chip ${good ? 'good' : 'bad'} k-${c.k}">${label}</span>`;
  }

  function show(sc) {
    current = sc;
    if (!sc.choices || !sc.choices.length) sc.choices = [{ label: 'Continue' }];
    const paras = String(sc.text || '').split(/<br\s*\/?><br\s*\/?>/).filter(Boolean);
    let delay = 0;
    const pHtml = paras.map(p => { const h = `<p style="animation-delay:${delay}s">${p}</p>`; delay += 0.35; return h; }).join('');
    const outcome = sc.outcome === true ? '<div class="outcome win">Success</div>' : sc.outcome === false ? '<div class="outcome lose">Failure</div>' : '';
    const chips = sc.chips && sc.chips.length ? `<div class="chips" style="animation-delay:${delay}s">${sc.chips.map(chipHtml).join('')}</div>` : '';
    const ledger = sc.ledger && sc.ledger.length ? `<ul class="ledger" style="animation-delay:${delay}s">${sc.ledger.map(l => `<li class="${l.cls || ''}">${l.t}</li>`).join('')}</ul>` : '';
    const choices = sc.choices.map((c, i) => `
      <button class="choice ${c.cls || ''} ${c.disabled ? 'disabled' : ''}" data-choice="${i}" ${c.disabled ? 'disabled' : ''} style="animation-delay:${delay + 0.15 + i * 0.07}s">
        <span class="c-key">${i + 1}</span>
        <span class="c-main"><span class="c-label">${c.label}</span>${c.sub ? `<span class="c-sub">${c.sub}</span>` : ''}
        ${c.tags ? `<span class="c-tags">${c.tags.map(t => `<span class="tag" ${t.c ? `style="color:${t.c};border-color:${t.c}55"` : ''}>${t.t}</span>`).join('')}</span>` : ''}</span>
        ${c.chance != null ? `<span class="c-chance ${c.chance >= 0.66 ? 'hi' : c.chance >= 0.4 ? 'mid' : 'lo'}">${pct(c.chance)}</span>` : ''}
      </button>`).join('');
    modalRoot.innerHTML = `
      <div class="modal-back">
        <div class="modal ${sc.cls || ''}">
          <div class="m-orn top"></div>
          ${sc.glyph ? `<div class="m-glyph">${sc.glyph}</div>` : ''}
          ${sc.eyebrow ? `<div class="eyebrow">${sc.eyebrow}</div>` : ''}
          <h2 class="m-title">${sc.title || ''}</h2>
          ${outcome}
          <div class="m-text">${pHtml}</div>
          ${chips}${ledger}
          <div class="choices">${choices}</div>
          <div class="m-orn bottom"></div>
        </div>
      </div>`;
    const modal = modalRoot.querySelector('.modal');
    modal.addEventListener('click', e => {
      const b = e.target.closest('[data-choice]');
      if (b) { pick(+b.dataset.choice); return; }
      modal.classList.add('revealed');
    });
    Snd.play('page');
  }

  function pick(i) {
    if (!current) return;
    const c = current.choices[i];
    if (!c || c.disabled) return;
    const modal = modalRoot.querySelector('.modal');
    if (modal && !modal.classList.contains('revealed')) { modal.classList.add('revealed'); }
    current = null;
    modalRoot.innerHTML = '';
    Snd.play('click');
    if (c.onPick) c.onPick();
    if (!current && queue.length) show(queue.shift());
    if (!current && G.s && !G.s.ending) render();
  }

  document.addEventListener('keydown', e => {
    if (!current) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) pick(n - 1);
    if (e.key === 'Enter' && current.choices.length === 1) pick(0);
  });

  /* ---------------- toasts & overlays ---------------- */
  function toast(msg, cls = '') {
    const t = document.createElement('div');
    t.className = `toast ${cls}`;
    t.innerHTML = msg;
    toasts.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3400);
    setTimeout(() => t.remove(), 4200);
  }

  function duskCard(cb) {
    const s = G.s;
    overlayRoot.innerHTML = `
      <div class="dusk-card">
        <div class="dc-moon"></div>
        <div class="dc-eyebrow">Night ${s.turn + 1} · ${G.era().short} London</div>
        <div class="dc-title">The ${DATA.MOONS[s.month]}</div>
        <div class="dc-date">${DATA.MONTHS[s.month]}, in the year ${s.year}</div>
        <div class="dc-hours">${s.hours} hours until dawn</div>
      </div>`;
    Snd.play('dusk');
    let done = false;
    const finish = () => { if (done) return; done = true; const el = overlayRoot.firstElementChild; if (el) el.classList.add('out'); setTimeout(() => { overlayRoot.innerHTML = ''; cb(); }, 500); };
    overlayRoot.firstElementChild.addEventListener('click', finish);
    setTimeout(finish, 2300);
  }

  function torporCard(years, cb) {
    const end = G.s.year, start = end - years;
    overlayRoot.innerHTML = `
      <div class="dusk-card torpor">
        <div class="dc-eyebrow">Torpor</div>
        <div class="dc-title">The Long Sleep</div>
        <div class="dc-year" id="torpor-year">${start}</div>
        <div class="dc-date">Dust gathers. Candles burn out. Kings die.</div>
      </div>`;
    const el = document.getElementById('torpor-year');
    const t0 = performance.now(), dur = 2600 + years * 12;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(start + (end - start) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
      else setTimeout(() => { overlayRoot.firstElementChild.classList.add('out'); setTimeout(() => { overlayRoot.innerHTML = ''; cb(); }, 500); }, 600);
    };
    requestAnimationFrame(step);
  }

  /* ==================================================================
     Title screen
     ================================================================== */
  function renderTitle() {
    document.body.className = 'on-title';
    const has = G.hasSave();
    app.innerHTML = `
      <div class="title-screen">
        <div class="t-sigil">✠</div>
        <div class="t-eyebrow">A Vampire's Chronicle · London 1347 – 1901</div>
        <h1 class="t-title"><span>Crimson</span><span>Centuries</span></h1>
        <div class="t-rule"></div>
        <div class="t-menu">
          ${has ? `<button class="btn big" data-t="continue">Continue<small>${G.savedSummary()}</small></button>` : ''}
          <button class="btn big ${has ? 'ghost' : ''}" data-t="new">Begin a New Chronicle</button>
          <button class="btn ghost" data-t="codex">The Codex · How to Play</button>
        </div>
        <blockquote class="t-quote">“For the blood is the life.”<cite>— Deuteronomy 12:23</cite></blockquote>
      </div>`;
    app.querySelector('.t-menu').addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      Snd.init(); Snd.play('click');
      if (b.dataset.t === 'continue') { if (G.load()) { tab = 'city'; selDist = null; render(); } }
      if (b.dataset.t === 'new') { if (has && !confirm('Begin anew? Your current chronicle will be lost.')) return; startCreation(); }
      if (b.dataset.t === 'codex') codex();
    });
  }

  function codex() {
    scene({ title: 'The Codex', glyph: '☥', cls: 'codex', text: `
      <b>You are a vampire in London, from the Black Death of 1348 to the turn of the twentieth century.</b> Each turn is one significant night in a passing moon. Winter nights are long; summer nights are cruelly short. Every deed costs hours — and when the candles burn out, you had better be home.
      <br><br><b>Blood</b> is life. The day's sleep burns it away, and a starving vampire frenzies. <b>Hunt</b> in the districts of the city: choose your vessel, your approach, and how deeply to drink. Each vessel's blood carries a <i>humour</i> — Sanguine, Choleric, Melancholic, Phlegmatic — that strengthens you for two nights.
      <br><br><b>Humanity</b> is your soul. Killing, cruelty and dark deeds erode it; mercy, love and prayer restore it. At zero, the Beast takes you forever. <b>Suspicion</b> is the city's memory of you. Let it grow and hunters will come — and at 100 threat, they raid your haven by day.
      <br><br><b>Essence</b> is the wisdom of the blood. Spend it on your attributes and on <b>Disciplines</b>. Your <b>Blood Potency</b> deepens as you age — every forty years.
      <br><br>Build a <b>Circle</b> of blood-bound ghouls, a mortal lover, childer of your own. Buy <b>Holdings</b> that pay by the moon, and a greater <b>Haven</b>. Win favour at <b>Elysium</b> and climb from Fledgling to Primogen — and then, perhaps, challenge the Prince.
      <br><br>When the world grows too hot, sink into <b>Torpor</b> for decades. Your wealth grows, the hunters forget, and your blood thickens — but the mortals you love will not be there when you wake.
      <br><br>Survive to 1901. Or find the road to <b>Golconda</b>. Keys <b>1–9</b> pick choices.` });
  }

  /* ==================================================================
     Character creation
     ================================================================== */
  const cr = { step: 0, name: '', origin: null, clan: null, pts: { might: 0, guile: 0, allure: 0, lore: 0 } };
  const FREE = 4;
  function startCreation() { Object.assign(cr, { step: 0, name: G_randomName(), origin: null, clan: null, pts: { might: 0, guile: 0, allure: 0, lore: 0 } }); renderCreation(); }
  function G_randomName() { const n = DATA.NAMES.medieval; return `${n[Math.random() < 0.5 ? 'f' : 'm'][Math.floor(Math.random() * 13)] || 'Alys'} ${DATA.NAMES.sur[Math.floor(Math.random() * DATA.NAMES.sur.length)]}`; }
  function baseAttr(k) {
    const o = DATA.ORIGINS.find(x => x.id === cr.origin), c = DATA.CLANS.find(x => x.id === cr.clan);
    return 1 + ((o && o.bonus[k]) || 0) + ((c && c.bonus[k]) || 0);
  }
  const spent = () => Object.values(cr.pts).reduce((a, b) => a + b, 0);

  function renderCreation() {
    document.body.className = 'on-create';
    const steps = ['Mortal Life', 'The Blood', 'Nature', 'The Embrace'];
    let body = '';
    if (cr.step === 0) {
      body = `
        <h2 class="cr-h">Who were you, before?</h2>
        <div class="name-row">
          <label>Your name<input id="cr-name" maxlength="28" value="${cr.name.replace(/"/g, '&quot;')}"></label>
          <button class="btn ghost small" data-cr="reroll">⟲ Another name</button>
        </div>
        <div class="card-grid">${DATA.ORIGINS.map(o => `
          <button class="pick-card ${cr.origin === o.id ? 'sel' : ''}" data-origin="${o.id}">
            <div class="pc-title">${o.name}</div>
            <div class="pc-desc">${o.desc}</div>
            <div class="pc-meta">${Object.entries(o.bonus).map(([k, v]) => `+${v} ${DATA.ATTRS[k].name}`).join(' · ')} · £${o.gold} · Humanity ${o.humanity}</div>
            <div class="pc-meta dim">${Object.entries(o.inf).map(([k, v]) => `+${v} ${DATA.FACTIONS[k].name}`).join(' · ')}</div>
          </button>`).join('')}</div>`;
    } else if (cr.step === 1) {
      body = `
        <h2 class="cr-h">Whose blood made you?</h2>
        <div class="card-grid clans">${DATA.CLANS.map(c => `
          <button class="pick-card clan ${cr.clan === c.id ? 'sel' : ''}" data-clan="${c.id}">
            <div class="pc-sigil">${c.sigil}</div>
            <div class="pc-title">${c.name}</div>
            <div class="pc-epithet">${c.epithet}</div>
            <div class="pc-desc">${c.desc}</div>
            <div class="pc-meta">${Object.entries(c.bonus).map(([k, v]) => `+${v} ${DATA.ATTRS[k].name}`).join(' · ')}</div>
            ${c.affinity.length ? `<div class="pc-meta">Affinity: ${c.affinity.map(a => DATA.POWERS[a].name).join(', ')}</div>` : ''}
            <div class="pc-flaw">${c.flaw}</div>
          </button>`).join('')}</div>`;
    } else if (cr.step === 2) {
      body = `
        <h2 class="cr-h">What is your nature?</h2>
        <p class="cr-sub">Distribute <b>${FREE - spent()}</b> remaining points. No attribute may exceed 5 at your Embrace.</p>
        <div class="attr-alloc">${Object.entries(DATA.ATTRS).map(([k, a]) => {
          const v = baseAttr(k) + cr.pts[k];
          return `<div class="alloc-row">
            <div class="al-glyph">${a.glyph}</div>
            <div class="al-info"><div class="al-name">${a.name}</div><div class="al-desc">${a.desc}</div></div>
            <button class="round" data-dec="${k}" ${cr.pts[k] <= 0 ? 'disabled' : ''}>−</button>
            <div class="al-pips">${Array.from({ length: 5 }, (_, i) => `<span class="pip ${i < v ? (i < baseAttr(k) ? 'on base' : 'on') : ''}"></span>`).join('')}</div>
            <button class="round" data-inc="${k}" ${spent() >= FREE || v >= 5 ? 'disabled' : ''}>+</button>
          </div>`;
        }).join('')}</div>`;
    } else {
      const o = DATA.ORIGINS.find(x => x.id === cr.origin), c = DATA.CLANS.find(x => x.id === cr.clan);
      const how = {
        morvayne: 'at a feast in a merchant\'s hall, where a lady in grey silk asked you to dance and never let go of your hand',
        vargr: 'on the road through the Weald, when something that was not a wolf came out of the trees and dragged you down into the bracken',
        hollow: 'in the crypt beneath St Mary-le-Bow, where something with no face whispered your name from the dark',
        ashen: 'in a scriptorium at midnight, where a scholar with ink-black eyes offered you the answer to every question you had ever asked',
        unclaimed: 'in an alley behind the Tabard Inn, where a stranger drank you nearly dry, bled into your mouth, and walked away without a word',
      }[c.id];
      body = `
        <div class="prologue">
          <div class="pro-sigil">${c.sigil}</div>
          <p>London, in the autumn of the year of Our Lord <b>1347</b>.</p>
          <p>You were ${cr.name}, ${o.name.toLowerCase()}. ${o.desc}</p>
          <p>On the night of the Hunter's Moon, ${c.sire} found you ${how}.</p>
          <p>You died there. Your heart stopped, and your blood went cold, and they buried you in a pauper's crypt beneath St Bartholomew's with the plague-dead monks.</p>
          <p>Three nights later, you woke — with grave-dirt in your mouth, and a <span class="blood-word">hunger</span> that has no bottom.</p>
          <p class="pro-last">Across the sea, in the ports of Genoa and Marseille, a great mortality is stirring. It will reach London within the year. You, however, have all the time in the world.</p>
        </div>`;
    }
    const canNext = cr.step === 0 ? cr.origin && cr.name.trim() : cr.step === 1 ? !!cr.clan : cr.step === 2 ? spent() === FREE : true;
    app.innerHTML = `
      <div class="creation">
        <div class="cr-steps">${steps.map((t, i) => `<span class="${i === cr.step ? 'on' : i < cr.step ? 'done' : ''}">${roman(i + 1) || 'IV'} · ${t}</span>`).join('')}</div>
        <div class="cr-body">${body}</div>
        <div class="cr-nav">
          <button class="btn ghost" data-cr="back">${cr.step === 0 ? 'Return' : 'Back'}</button>
          <button class="btn ${canNext ? '' : 'disabled'}" data-cr="next" ${canNext ? '' : 'disabled'}>${cr.step === 3 ? 'Rise' : 'Continue'}</button>
        </div>
      </div>`;
    const nameIn = document.getElementById('cr-name');
    if (nameIn) nameIn.addEventListener('input', () => { cr.name = nameIn.value; const nb = app.querySelector('[data-cr="next"]'); const ok = cr.origin && cr.name.trim(); nb.disabled = !ok; nb.classList.toggle('disabled', !ok); });
  }

  app.addEventListener('click', e => {
    if (!document.body.classList.contains('on-create')) return;
    const t = e.target.closest('button'); if (!t) return;
    Snd.play('click');
    if (t.dataset.origin) cr.origin = t.dataset.origin;
    else if (t.dataset.clan) cr.clan = t.dataset.clan;
    else if (t.dataset.inc) cr.pts[t.dataset.inc]++;
    else if (t.dataset.dec) cr.pts[t.dataset.dec]--;
    else if (t.dataset.cr === 'reroll') cr.name = G_randomName();
    else if (t.dataset.cr === 'back') { if (cr.step === 0) return renderTitle(); cr.step--; if (cr.step < 2) cr.pts = { might: 0, guile: 0, allure: 0, lore: 0 }; }
    else if (t.dataset.cr === 'next') {
      if (cr.step < 3) cr.step++;
      else {
        const attrs = {}; for (const k of Object.keys(DATA.ATTRS)) attrs[k] = baseAttr(k) + cr.pts[k];
        G.newGame({ name: cr.name.trim(), origin: cr.origin, clan: cr.clan, attrs });
        tab = 'city'; selDist = null;
        render();
        duskCard(() => { G.checkAchievements(); render(); });
        return;
      }
    } else return;
    renderCreation();
  });

  /* ==================================================================
     Main game
     ================================================================== */
  function bar(val, max, cls, label, sub) {
    return `<div class="bar ${cls}"><div class="bar-top"><span>${label}</span><span>${sub}</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, Math.min(100, val / max * 100))}%"></div></div></div>`;
  }

  function sheet() {
    const s = G.s, c = G.clan();
    const res = s.resonance ? DATA.HUMOURS[s.resonance.h] : null;
    return `
      <div class="sheet-head">
        <div class="sigil">${c.sigil}</div>
        <div>
          <div class="pname">${s.name}</div>
          <div class="pclan">${c.name}</div>
          <div class="prank">${DATA.RANKS[s.rank].name} · undead ${G.ageYears()} yrs</div>
        </div>
      </div>
      <div class="vital-row">
        <div class="vial-wrap" title="Blood">
          <div class="vial"><div class="vial-fill" style="height:${s.blood}%"></div><div class="vial-shine"></div></div>
          <div class="vial-num">${s.blood}</div><div class="vial-lbl">Blood</div>
          ${s.cellar ? `<div class="vial-cellar">+${s.cellar} cellar</div>` : ''}
        </div>
        <div class="vital-bars">
          ${bar(s.health, G.maxHealth(), 'health', 'Health', `${s.health}/${G.maxHealth()}`)}
          ${bar(s.humanity, 100, 'humanity', 'Humanity', `${s.humanity} · ${G.humanityLabel(s.humanity)}`)}
          ${bar(s.susp, 100, 'susp', 'Suspicion', `${s.susp} · ${G.suspLabel(s.susp)}`)}
          <div class="hunger-note">Hunger: −${G.hunger()} blood each day</div>
        </div>
      </div>
      <div class="attrs">${Object.entries(DATA.ATTRS).map(([k, a]) => {
        const v = G.attr(k), b = s.attrs[k];
        return `<div class="attr ${v > b ? 'buffed' : ''}" title="${a.desc}"><span class="a-g">${a.glyph}</span><span class="a-n">${a.name}</span><span class="a-v">${v}</span></div>`;
      }).join('')}</div>
      ${res ? `<div class="resonance" style="--rc:${res.color}">${res.name} resonance · +${s.resonance.str} ${DATA.ATTRS[res.attr].name} <span>(${s.resonance.n} night${s.resonance.n > 1 ? 's' : ''})</span></div>` : ''}
      <div class="stat-row">
        <div class="stat"><span class="st-v">${s.potency}</span><span class="st-l">Potency</span></div>
        <div class="stat"><span class="st-v">${s.essence}</span><span class="st-l">Essence</span></div>
        <div class="stat"><span class="st-v">£${s.gold.toLocaleString()}</span><span class="st-l">Wealth</span></div>
        <div class="stat"><span class="st-v">${s.prestige}</span><span class="st-l">Prestige</span></div>
      </div>
      <div class="infl">${Object.entries(DATA.FACTIONS).map(([k, f]) => `
        <div class="inf-row" title="${f.desc}"><span class="inf-g">${f.glyph}</span><span class="inf-n">${f.name}</span><div class="inf-track"><div style="width:${s.inf[k]}%"></div></div><span class="inf-v">${s.inf[k]}</span></div>`).join('')}
      </div>`;
  }

  function topbar() {
    const s = G.s, max = G.maxHours();
    const candles = Array.from({ length: Math.max(max, s.hours) }, (_, i) => `<span class="candle ${i < s.hours ? 'lit' : 'out'}"><i></i></span>`).join('');
    const phase = s.month % 4;
    return `
      <div class="tb-date">
        <div class="moon p${phase}"></div>
        <div><div class="tb-moon">The ${DATA.MOONS[s.month]}</div><div class="tb-year">${DATA.MONTHS[s.month]} ${s.year} · ${G.era().short}</div></div>
      </div>
      <div class="tb-candles" title="Hours of darkness remaining">
        <div class="candles">${candles}</div>
        <div class="tb-hours">${s.hours} hour${s.hours === 1 ? '' : 's'} until dawn</div>
      </div>
      <div class="tb-loc">⌖ ${G.distName(s.loc)}</div>
      <div class="tb-btns">
        <button class="icon-btn" data-ui="codex" title="The Codex">?</button>
        <button class="icon-btn" data-ui="sound" title="Sound">${Snd.enabled() ? '♪' : '♩̸'}</button>
        <button class="icon-btn" data-ui="menu" title="Menu">☰</button>
      </div>`;
  }

  const TABS = [['city', 'The City', '⌂'], ['haven', 'Haven', '⚰'], ['court', 'Court', '♛'], ['circle', 'Circle', '☍'], ['blood', 'Blood', '♥'], ['holdings', 'Holdings', '⚖'], ['chronicle', 'Chronicle', '✒']];

  function actionCard(a, kind, where) {
    const chance = a.chance != null ? `<span class="ac-chance ${a.chance >= 0.66 ? 'hi' : a.chance >= 0.4 ? 'mid' : 'lo'}">${pct(a.chance)}</span>` : '';
    return `
      <button class="action ${a.avail ? '' : 'disabled'} ${a.strands ? 'strands' : ''}" data-act="${kind}" data-id="${a.id}" ${where ? `data-where="${where}"` : ''} ${a.avail ? '' : 'disabled'}>
        <span class="ac-glyph">${a.glyph || '•'}</span>
        <span class="ac-body">
          <span class="ac-name">${a.name}</span>
          <span class="ac-desc">${a.desc || ''}</span>
          <span class="ac-foot">
            <span class="ac-hours">⧗ ${a.hours}h${a.travel ? ` <em>(incl. travel)</em>` : ''}</span>
            ${a.cost ? `<span class="ac-cost">£${a.cost}</span>` : ''}
            ${a.stat ? `<span class="ac-stat">${DATA.ATTRS[a.stat].name}</span>` : ''}
            ${!a.avail && a.reason ? `<span class="ac-reason">${a.reason}</span>` : ''}
            ${a.strands ? `<span class="ac-warn">☀ Dawn will catch you</span>` : ''}
          </span>
        </span>
        ${chance}
      </button>`;
  }

  function cityTab() {
    const s = G.s;
    const d = selDist || (s.loc !== 'haven' && s.loc !== 'elysium' ? s.loc : null);
    const e = G.era().id;
    const list = DATA.DISTRICTS.map(x => `
      <button class="district ${x.id === d ? 'sel' : ''} ${x.id === s.loc ? 'here' : ''}" data-dist="${x.id}">
        <span class="d-glyph">${x.glyph}</span>
        <span class="d-name">${x.names[e]}</span>
        <span class="d-meta"><span title="How watchful the district is">${x.heat >= 1.3 ? 'Watchful' : x.heat <= 0.7 ? 'Lawless' : 'Wary'}</span> · <span title="Danger if a hunt goes wrong">${'†'.repeat(x.danger)}</span></span>
        ${x.id === s.loc ? '<span class="d-here">you are here</span>' : ''}
      </button>`).join('');
    let detail;
    if (d) {
      const x = G.dist(d);
      detail = `
        <div class="dist-detail">
          <div class="dd-head"><span class="dd-glyph">${x.glyph}</span><div><h3>${x.names[e]}</h3><p>${x.desc[e]}</p></div></div>
          <div class="action-list">${G.districtActions(d).map(a => actionCard(a, 'district', d)).join('')}</div>
        </div>`;
    } else {
      detail = `<div class="dist-detail empty"><div class="dd-empty-glyph">☾</div><p>The city lies before you, lamplit and unaware.<br>Choose where to prowl tonight.</p><p class="dim">Travel between districts costs an hour. Keep enough night to return home before dawn.</p></div>`;
    }
    return `
      <div class="city-wrap">
        <div class="district-list">${list}</div>
        ${detail}
      </div>
      ${retireBar()}`;
  }

  function retireBar() {
    const s = G.s, c = G.travelCost('haven');
    const danger = s.loc !== 'haven' && s.hours <= c;
    return `<div class="retire-bar ${danger ? 'danger' : ''}">
      <span>${s.loc === 'haven' ? 'You are safe in your haven.' : `Returning home takes ${c} hour${c === 1 ? '' : 's'}.`} ${danger ? '<b>Dawn is almost upon you!</b>' : ''}</span>
      <button class="btn" data-ui="retire">⚰ Retire for the Day</button>
    </div>`;
  }

  function havenTab() {
    const s = G.s, h = DATA.HAVENS[s.haven], nextH = DATA.HAVENS[s.haven + 1];
    const items = Object.entries(s.items);
    return `
      <div class="haven-head panel">
        <div class="hh-title"><span class="hh-lvl">${roman(Math.min(3, s.haven + 1)) || 'IV'}</span><div><h3>${h.name}</h3><p>${h.desc}</p></div></div>
        <div class="hh-stats">
          <span>Defence <b>${G.havenDef()}</b></span><span>Herd <b>${s.herd}/${G.herdCap()}</b></span>
          <span>Ghouls <b>${G.ghouls().length}/${G.ghoulCap()}</b></span>${G.cellarCap() ? `<span>Cellar <b>${s.cellar}/${G.cellarCap()}</b></span>` : ''}
        </div>
      </div>
      <h4 class="sec">Deeds of the Night</h4>
      <div class="action-list">${G.deeds().map(a => actionCard(a, 'deed')).join('')}</div>
      ${retireBar()}
      <div class="torpor-box panel">
        <div><h4>Torpor</h4><p>Sink into the death-sleep for decades. Suspicion, hunters and debts are forgotten; your fortune grows; your blood thickens. Mortals you love will age — or die.</p></div>
        <button class="btn ghost" data-ui="torpor" ${G.torporOptions().length ? '' : 'disabled'}>⚰ Enter Torpor…</button>
      </div>
      ${G.canSeekGolconda() ? `<div class="golconda-box panel"><div><h4>✦ The Road to Golconda</h4><p>The three leaves of the Codex are yours, and your soul is clear. You could walk the road beyond the Beast — and end your chronicle in peace.</p></div><button class="btn" data-ui="golconda">Seek Golconda</button></div>` : ''}
      <h4 class="sec">Improve Your Haven</h4>
      <div class="shop">
        ${nextH ? `<div class="shop-item big"><div><div class="si-name">${nextH.name}</div><div class="si-desc">${nextH.desc}</div><div class="si-meta">Defence ${nextH.def} · Ghouls ${nextH.ghouls} · Herd ${nextH.herd}</div></div><button class="btn small" data-buy-haven ${s.gold >= G.havenCost(s.haven + 1) ? '' : 'disabled'}>Acquire · £${G.havenCost(s.haven + 1)}</button></div>` : ''}
        ${Object.entries(DATA.UPGRADES).map(([id, u]) => {
          const owned = s.upgrades[id], c = G.upgradeCost(id), locked = s.haven < u.lvl;
          return `<div class="shop-item ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}"><div><div class="si-name">${u.name}</div><div class="si-desc">${u.desc}</div>${locked ? `<div class="si-meta">Requires a greater haven</div>` : ''}</div>
            ${owned ? '<span class="owned-tag">Owned</span>' : `<button class="btn small" data-buy-up="${id}" ${!locked && s.gold >= c ? '' : 'disabled'}>£${c}</button>`}</div>`;
        }).join('')}
      </div>
      <h4 class="sec">Curiosities</h4>
      ${items.length ? `<div class="items">${items.map(([id, n]) => { const it = DATA.ITEMS[id]; return `<div class="item"><span class="it-g">${it.glyph}</span><div><div class="it-n">${it.name}${n > 1 ? ` ×${n}` : ''}</div><div class="it-d">${it.desc}</div></div>${it.use || it.sell ? `<button class="btn small ghost" data-use="${id}">${it.sell ? `Sell £${G.money(it.sell)}` : 'Use'}</button>` : ''}</div>`; }).join('')}</div>` : '<p class="dim">Nothing yet. Graves, archives and the dead sometimes yield strange things.</p>'}`;
  }

  function courtTab() {
    const s = G.s;
    const r = DATA.RANKS[s.rank], nr = DATA.RANKS[s.rank + 1];
    const prog = nr && s.rank < 4 ? Math.min(100, (s.prestige - r.prestige) / (nr.prestige - r.prestige) * 100) : 100;
    return `
      <div class="court-head panel">
        <div class="ch-throne">♛</div>
        <div class="ch-body">
          <div class="eyebrow">The Court of the Night</div>
          <h3>${s.princeName}</h3>
          <p>You are <b>${r.name}</b> with <b>${s.prestige}</b> prestige.</p>
          ${s.rank < 4 ? `<div class="rank-prog"><div style="width:${Math.max(0, prog)}%"></div></div><p class="dim">Next: <b>${nr.name}</b> at ${nr.prestige} prestige${nr.potency > 1 ? ` and Blood Potency ${nr.potency}` : ''}.</p>` : s.rank === 4 ? '<p class="dim">Only the throne remains above you.</p>' : '<p class="gold-txt">London\'s night is yours.</p>'}
        </div>
      </div>
      <div class="action-list">${G.courtActions().map(a => actionCard(a, 'court')).join('')}</div>
      <h4 class="sec">Your Petitions</h4>
      ${s.tasks.length ? `<div class="tasks">${s.tasks.map((t, i) => { const tpl = G.taskTpl(t), done = G.taskDone(t); return `
        <div class="task ${done ? 'ready' : ''}"><div><div class="t-name">${tpl.title}</div><div class="t-desc">${tpl.desc(t)}</div><div class="t-meta">Reward: ${rewardStr(t.reward)} · <span class="${t.left <= 2 ? 'bad-txt' : ''}">${t.left} moon${t.left > 1 ? 's' : ''} left</span></div></div>
        <button class="btn small" data-fulfil="${i}" ${done ? '' : 'disabled'}>${done ? 'Fulfil' : 'In progress'}</button></div>`; }).join('')}</div>` : '<p class="dim">You serve no petitions. Attend Elysium to be offered some.</p>'}
      ${s.offers.length ? `<h4 class="sec">Offered at Elysium</h4><div class="tasks">${s.offers.map((t, i) => { const tpl = G.taskTpl(t); return `
        <div class="task offer"><div><div class="t-name">${tpl.title}</div><div class="t-desc">${tpl.desc(t)}</div><div class="t-meta">Reward: ${rewardStr(t.reward)} · 8 moons to complete</div></div>
        <button class="btn small ghost" data-accept="${i}" ${s.tasks.length >= 3 ? 'disabled' : ''}>Accept</button></div>`; }).join('')}</div>` : ''}
      ${s.rival ? `<h4 class="sec">Your Rival</h4><div class="npc rival"><div class="npc-g">♠</div><div class="npc-b"><div class="npc-n">${s.rival.name}</div><div class="npc-d">An ambitious Kindred who would see you fall.</div>${bar(s.rival.standing, 100, 'rival-bar', 'Standing at court', s.rival.standing)}</div></div>` : ''}`;
  }
  const rewardStr = r => Object.entries(r).map(([k, v]) => k === 'gold' ? `£${G.money(v)}` : `${v} ${DATA.LABELS[k]}`).join(', ');

  function circleTab() {
    const s = G.s;
    const alive = s.circle.filter(c => c.alive);
    const dead = s.circle.filter(c => !c.alive);
    const h = s.hunter;
    const npc = (c) => {
      if (c.kind === 'ghoul') {
        const r = DATA.ROLES[c.role];
        return `<div class="npc ghoul"><div class="npc-g">${r.glyph}</div><div class="npc-b"><div class="npc-n">${c.name}</div><div class="npc-d">${c.occ ? `Once ${G.an(c.occ)}. ` : ''}Ghoul · <b>${r.name}</b> — ${r.desc}</div>${bar(c.loyalty, 100, 'loyal', 'Devotion', c.loyalty)}<div class="npc-meta">Age ${c.age} (ageless while fed) · 2 blood each day</div></div><button class="btn small ghost" data-release="${c.id}">Release</button></div>`;
      }
      if (c.kind === 'lover') return `<div class="npc lover"><div class="npc-g">♡</div><div class="npc-b"><div class="npc-n">${c.name}</div><div class="npc-d">${c.desc}</div>${bar(c.loyalty, 100, 'loyal', 'Affection', c.loyalty)}<div class="npc-meta">Age ${c.age} · mortal · visit them from your haven, or lose them</div></div><button class="btn small ghost" data-embrace ${s.blood >= 30 ? '' : 'disabled'}>Embrace…</button></div>`;
      return `<div class="npc childe"><div class="npc-g">✧</div><div class="npc-b"><div class="npc-n">${c.name}</div><div class="npc-d">${c.desc || 'Your childe.'}</div><div class="npc-meta">Childe · guards your haven (+10) and brings you 4 blood each day</div></div></div>`;
    };
    return `
      <div class="npc sire"><div class="npc-g">${G.clan().sigil}</div><div class="npc-b"><div class="npc-n">${G.clan().sire}</div><div class="npc-d">Your sire. Gone these many years, but never truly absent.</div></div></div>
      <h4 class="sec">The Hunter</h4>
      ${h ? `<div class="npc hunter"><div class="npc-g">✠</div><div class="npc-b"><div class="npc-n">${h.name}</div><div class="npc-d">A mortal who knows what you are. Level ${h.level}. At 100 threat, they will raid your haven by day.</div>
          ${bar(h.threat, 100, 'threat', 'Threat', h.threat)}
          ${bar(h.progress, 100, 'track', 'Your tracking', h.known ? 'Lair known' : `${h.progress}%`)}
          <div class="npc-actions">${G.hunterActions().map(a => `<button class="btn small ${a.avail ? '' : 'disabled'}" data-hunter="${a.id}" ${a.avail ? '' : 'disabled'} title="${a.avail ? (a.desc || '') : a.reason}">${a.name} · ${a.hours}h</button>`).join('')}</div>
          ${h.known ? '' : '<div class="npc-meta">Track them in Whitechapel, or listen for rumours in Cheapside.</div>'}
        </div></div>` : '<p class="dim">No hunter stalks you. Keep Suspicion low and it will stay that way.</p>'}
      <h4 class="sec">Your Circle <span class="dim">· Herd of ${s.herd} willing vessels</span></h4>
      ${alive.length ? `<div class="npcs">${alive.map(npc).join('')}</div>` : '<p class="dim">You are alone. Bind mortals with your blood when you feed, win a lover at the revels, or take in a lost fledgling.</p>'}
      ${dead.length ? `<h4 class="sec">The Departed</h4><ul class="departed">${dead.map(c => `<li><b>${c.name}</b> — ${c.fate || 'gone'}.</li>`).join('')}</ul>` : ''}`;
  }

  function bloodTab() {
    const s = G.s, c = G.clan();
    return `
      <div class="essence-head panel"><div class="eh-v">${s.essence}</div><div><h3>Essence</h3><p>The wisdom of the blood. Earned by feeding, killing, study and age. Spend it to grow stronger.</p></div></div>
      <h4 class="sec">Attributes</h4>
      <div class="attr-train">${Object.entries(DATA.ATTRS).map(([k, a]) => {
        const cost = G.attrCost(k), max = s.attrs[k] >= 10;
        return `<div class="train-row"><span class="tr-g">${a.glyph}</span><div class="tr-b"><div class="tr-n">${a.name} <b>${s.attrs[k]}</b>${G.attr(k) > s.attrs[k] ? ` <span class="gold-txt">(${G.attr(k)})</span>` : ''}</div><div class="tr-d">${a.desc}</div>
          <div class="tr-pips">${Array.from({ length: 10 }, (_, i) => `<span class="pip ${i < s.attrs[k] ? 'on' : ''}"></span>`).join('')}</div></div>
          <button class="btn small" data-attr="${k}" ${!max && s.essence >= cost ? '' : 'disabled'}>${max ? 'Mastered' : `✦ ${cost}`}</button></div>`;
      }).join('')}</div>
      <h4 class="sec">Disciplines</h4>
      <div class="powers">${Object.entries(DATA.POWERS).map(([id, p]) => {
        const r = G.power(id), cost = G.powerCost(id), aff = c.affinity.includes(id);
        return `<div class="power ${r ? 'has' : ''} ${aff ? 'aff' : ''}">
          <div class="pw-head"><span class="pw-g">${p.glyph}</span><div><div class="pw-n">${p.name}${aff ? ' <span class="aff-tag">Affinity</span>' : ''}</div><div class="pw-d">${p.desc}</div></div></div>
          <ol class="pw-ranks">${p.ranks.map((t, i) => `<li class="${i < r ? 'on' : ''}"><span>${roman(i + 1)}</span>${t}</li>`).join('')}</ol>
          <button class="btn small" data-power="${id}" ${r < 3 && s.essence >= cost ? '' : 'disabled'}>${r >= 3 ? 'Mastered' : `Awaken ${roman(r + 1)} · ✦ ${cost}`}</button>
        </div>`;
      }).join('')}</div>`;
  }

  function holdingsTab() {
    const s = G.s;
    const own = DATA.HOLDINGS.filter(h => s.holdings[h.id]);
    const avail = DATA.HOLDINGS.filter(h => !s.holdings[h.id] && G.holdingAvail(h));
    const future = DATA.HOLDINGS.filter(h => !s.holdings[h.id] && s.year < h.from);
    const row = (h, mode) => `<div class="shop-item holding ${mode}"><div><div class="si-name">${h.name}</div><div class="si-desc">${h.desc}</div><div class="si-meta">${h.inc ? `£${h.inc} each moon` : 'No income'}${mode === 'future' ? ` · available from ${h.from}` : ''}</div></div>
      ${mode === 'own' ? `<button class="btn small ghost" data-sell="${h.id}">Sell · £${Math.round(h.cost * 0.6)}</button>` : mode === 'avail' ? `<button class="btn small" data-buy-hold="${h.id}" ${s.gold >= h.cost ? '' : 'disabled'}>Buy · £${h.cost}</button>` : '<span class="owned-tag dim">Not yet</span>'}</div>`;
    return `
      <div class="essence-head panel"><div class="eh-v">£${G.income()}</div><div><h3>Monthly Income</h3><p>Paid each dawn. Guilds influence (${s.inf.guilds}) and stewards among your ghouls (${G.roleCount('steward')}) increase it. In torpor, a steward keeps your fortune growing.</p></div></div>
      ${own.length ? `<h4 class="sec">Your Holdings</h4><div class="shop">${own.map(h => row(h, 'own')).join('')}</div>` : ''}
      <h4 class="sec">For Sale</h4><div class="shop">${avail.length ? avail.map(h => row(h, 'avail')).join('') : '<p class="dim">Nothing for sale in this age that you do not already own.</p>'}</div>
      ${future.length ? `<h4 class="sec">Ventures of Ages to Come</h4><div class="shop">${future.map(h => row(h, 'future')).join('')}</div>` : ''}`;
  }

  function chronicleTab() {
    const s = G.s;
    const sub = [['journal', 'Journal'], ['ledger', `The Red Ledger (${s.kills})`], ['ach', `Achievements (${Object.keys(s.ach).length}/${DATA.ACH.length})`], ['stats', 'Legacy']];
    let body = '';
    if (chronTab === 'journal') body = `<ul class="journal">${s.log.map(l => `<li class="${l.cls}"><span class="j-d">${l.d}</span>${l.text}</li>`).join('')}</ul>`;
    else if (chronTab === 'ledger') body = s.victims.length ? `<p class="dim">Every soul you have drained, in the order you took them. Newest first.</p><ul class="victims">${s.victims.map(v => `<li><span class="v-cross">†</span><b>${v.name}</b>, ${v.occ}<span class="v-d">${v.date}${v.where ? ' · ' + v.where : ''}</span></li>`).join('')}</ul>` : '<p class="dim">The ledger is empty. For now, your hands are clean — or as clean as a vampire\'s can be.</p>';
    else if (chronTab === 'ach') body = `<div class="achs">${DATA.ACH.map(a => `<div class="ach ${s.ach[a.id] ? 'on' : ''}"><span class="ach-g">${s.ach[a.id] ? '✦' : '✧'}</span><div><div class="ach-n">${a.name}</div><div class="ach-d">${a.desc}</div></div></div>`).join('')}</div>`;
    else body = `<div class="legacy">
      <div class="lg-score"><span>${G.legacy()}</span>Legacy</div>
      <dl>
        <dt>Mortal origin</dt><dd>${G.origin().name}</dd>
        <dt>Embraced</dt><dd>October 1347</dd>
        <dt>Years undead</dt><dd>${G.ageYears()}</dd>
        <dt>Years in torpor</dt><dd>${s.stats.torpor}</dd>
        <dt>Times fed</dt><dd>${s.feeds}</dd>
        <dt>Mortals drained</dt><dd>${s.kills}</dd>
        <dt>Hunters destroyed</dt><dd>${s.stats.huntersSlain}</dd>
        <dt>Greatest fortune</dt><dd>£${Math.max(s.stats.maxGold, s.gold).toLocaleString()}</dd>
      </dl></div>`;
    return `<div class="subtabs">${sub.map(([id, n]) => `<button class="${chronTab === id ? 'on' : ''}" data-chron="${id}">${n}</button>`).join('')}</div>${body}`;
  }

  function render() {
    const s = G.s;
    if (!s) return renderTitle();
    if (s.ending) return renderEnding();
    document.body.className = 'in-game' + (s.blood < 20 ? ' starving' : '') + (s.hours <= 2 && s.loc !== 'haven' ? ' dawn-near' : '') + (s.humanity < 25 ? ' beastly' : '');
    const body = { city: cityTab, haven: havenTab, court: courtTab, circle: circleTab, blood: bloodTab, holdings: holdingsTab, chronicle: chronicleTab }[tab]();
    const scrollEl = app.querySelector('.tab-body');
    const sameTab = scrollEl && scrollEl.dataset.tab === tab;
    const keep = sameTab ? scrollEl.scrollTop : 0;
    const entering = !app.querySelector('.game');
    const essenceAlert = s.essence >= Math.min(...Object.keys(DATA.ATTRS).map(G.attrCost), ...Object.keys(DATA.POWERS).filter(p => G.power(p) < 3).map(G.powerCost));
    app.innerHTML = `
      <div class="game ${entering ? 'enter' : ''}">
        <header class="topbar">${topbar()}</header>
        <aside class="sheet panel">${sheet()}</aside>
        <section class="main">
          <nav class="tabs">${TABS.map(([id, n, g]) => `<button class="${tab === id ? 'on' : ''}" data-tab="${id}"><span class="tg">${g}</span><span class="tn">${n}</span>${id === 'blood' && essenceAlert ? '<i class="dot"></i>' : ''}${id === 'court' && s.tasks.some(G.taskDone) ? '<i class="dot"></i>' : ''}</button>`).join('')}</nav>
          <div class="tab-body ${sameTab ? '' : 'fresh'}" data-tab="${tab}">${body}</div>
        </section>
        <aside class="chronicle panel">
          <h3>Chronicle</h3>
          <ul class="log">${s.log.slice(0, 40).map(l => `<li class="${l.cls}"><span class="j-d">${l.d}</span>${l.text}</li>`).join('')}</ul>
        </aside>
      </div>`;
    const nb = app.querySelector('.tab-body');
    if (nb) nb.scrollTop = keep;
  }

  app.addEventListener('click', e => {
    if (!document.body.classList.contains('in-game') && !document.body.className.startsWith('in-game')) return;
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.tab) { tab = d.tab; Snd.play('tab'); if (tab !== 'city') selDist = null; return render(); }
    if (d.dist) { selDist = d.dist; Snd.play('tab'); return render(); }
    if (d.chron) { chronTab = d.chron; return render(); }
    if (d.act === 'district') return G.doAction(d.id, d.where);
    if (d.act === 'deed') return G.doDeed(d.id);
    if (d.act === 'court') return G.doCourt(d.id);
    if (d.attr) return G.raiseAttr(d.attr);
    if (d.power) return G.learnPower(d.power);
    if (d.buyHold) return G.buyHolding(d.buyHold);
    if (d.sell) { if (confirm('Sell this holding for 60% of its price?')) G.sellHolding(d.sell); return; }
    if ('buyHaven' in d) return G.buyHaven();
    if (d.buyUp) return G.buyUpgrade(d.buyUp);
    if (d.use) return G.useItem(d.use);
    if (d.accept) return G.acceptOffer(+d.accept);
    if (d.fulfil) return G.fulfil(+d.fulfil);
    if (d.release) { if (confirm('Release this ghoul from the blood bond?')) G.releaseGhoul(+d.release); return; }
    if ('embrace' in d) return G.embraceLover();
    if (d.hunter) return G.hunterAct(d.hunter);
    if (d.ui === 'retire') {
      const s = G.s;
      if (s.hours > 2 && !confirm(`${s.hours} hours of darkness remain. Retire for the day anyway?`)) return;
      return G.retire();
    }
    if (d.ui === 'torpor') return torporPrompt();
    if (d.ui === 'golconda') return G.seekGolconda();
    if (d.ui === 'codex') return codex();
    if (d.ui === 'sound') { Snd.toggle(); return render(); }
    if (d.ui === 'menu') return menu();
  });

  function torporPrompt() {
    const opts = G.torporOptions();
    scene({ title: 'Torpor', glyph: '⚰', cls: 'era', text: 'You lie down in the dark and let your heart go still as a stone. How long will you sleep?<br><br>Everything you know will change. Your ghouls will age without your blood; the living will die; the Court will forget you. But your enemies will forget you too.',
      choices: opts.map(y => ({ label: `Sleep for ${y} years`, sub: `Wake in ${G.s.year + y}${G.s.year + y >= 1901 ? ' — the end of the chronicle' : ''}`, onPick: () => G.torpor(y) }))
        .concat([{ label: 'Not yet', onPick: () => {} }]) });
  }

  function menu() {
    scene({ title: 'Chronicle Paused', glyph: '☰', text: 'Your progress is saved automatically at every dusk and after every deed.',
      choices: [
        { label: 'Return to the night' },
        { label: 'Save and return to the title', onPick: () => { G.save(); renderTitle(); } },
        { label: 'Abandon this chronicle', sub: 'Your save will be erased', cls: 'dark', onPick: () => { if (confirm('Erase this chronicle forever?')) { G.wipe(); renderTitle(); } } },
      ] });
  }

  /* ==================================================================
     Ending
     ================================================================== */
  function renderEnding() {
    const s = G.s, e = s.ending;
    document.body.className = 'on-ending ending-' + e.type;
    app.innerHTML = `
      <div class="ending">
        <div class="en-glyph">${e.glyph}</div>
        <div class="eyebrow">The Chronicle of ${s.name} · 1347 – ${s.year}</div>
        <h1>${e.title}</h1>
        <div class="en-text"><p>${e.text}</p></div>
        <div class="en-stats">
          <div><b>${G.ageYears()}</b>years undead</div>
          <div><b>${s.kills}</b>drained</div>
          <div><b>${s.humanity}</b>humanity</div>
          <div><b>£${s.gold.toLocaleString()}</b>wealth</div>
          <div><b>${DATA.RANKS[s.rank].name}</b>rank</div>
          <div><b>${Object.keys(s.ach).length}</b>achievements</div>
        </div>
        <div class="en-legacy">Legacy <span>${G.legacy()}</span></div>
        ${s.victims.length ? `<div class="en-victims"><div class="eyebrow">In Memoriam</div>${s.victims.slice(0, 18).map(v => v.name).join(' · ')}${s.victims.length > 18 ? ` · and ${s.victims.length - 18} more` : ''}</div>` : ''}
        <button class="btn big" id="en-again">Begin a New Chronicle</button>
      </div>`;
    document.getElementById('en-again').addEventListener('click', () => { Snd.play('click'); startCreation(); });
  }

  return { scene, toast, render, renderTitle, renderEnding, duskCard, torporCard, codex };
})();
