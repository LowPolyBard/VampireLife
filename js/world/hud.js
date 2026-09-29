/* ==========================================================
   CRIMSON CENTURIES — the heads-up display
   Candles that burn in real time, the blood vial, a compass,
   whispers of the inner voice, and the '?' and '!' of mortals
   who have begun to notice you.
   ========================================================== */

const HUD = (() => {
  const el = document.getElementById('hud');
  el.innerHTML = `
    <div class="h-date"><div class="moon"></div><div><div class="h-moon"></div><div class="h-year"></div></div></div>
    <div class="h-time"><div class="candles"></div><div class="h-hours"></div><div class="compass"><div class="c-strip"></div><div class="c-mid"></div></div></div>
    <div class="h-alert"></div>
    <div class="h-district"><div class="hd-name"></div><div class="hd-desc"></div></div>
    <div class="h-cross"><i></i></div>
    <div class="h-prompt"></div>
    <div class="h-card"></div>
    <div class="h-act"></div>
    <div class="h-foe"></div>
    <div class="h-float"></div>
    <div class="h-marks"></div>
    <div class="h-vitals">
      <div class="vial-wrap"><div class="vial"><div class="vial-fill"></div><div class="vial-shine"></div></div><div class="vial-num"></div></div>
      <div class="h-bars">
        <div class="hb health"><span>Health</span><div class="hb-t"><i></i></div></div>
        <div class="hb humanity"><span>Humanity</span><div class="hb-t"><i></i></div></div>
        <div class="hb susp"><span>Suspicion</span><div class="hb-t"><i></i></div></div>
        <div class="h-flags"></div>
      </div>
    </div>
    <div class="h-eye" title="How visible you are"><span></span><b></b></div>
    <div class="h-keys"></div>
    <div class="h-whisper"></div>
    <div class="h-loc"></div>`;
  const $ = s => el.querySelector(s);
  const E = {
    moon: $('.moon'), moonName: $('.h-moon'), year: $('.h-year'), candles: $('.candles'), hours: $('.h-hours'), strip: $('.c-strip'),
    alert: $('.h-alert'), dist: $('.h-district'), dName: $('.hd-name'), dDesc: $('.hd-desc'), prompt: $('.h-prompt'), card: $('.h-card'),
    marks: $('.h-marks'), vial: $('.vial-fill'), vnum: $('.vial-num'), health: $('.hb.health i'), hum: $('.hb.humanity i'), susp: $('.hb.susp i'),
    flags: $('.h-flags'), act: $('.h-act'), foe: $('.h-foe'), float: $('.h-float'), eye: $('.h-eye'), keys: $('.h-keys'), whisper: $('.h-whisper'), loc: $('.h-loc'), cross: $('.h-cross'),
  };
  const cache = {};
  const set = (k, v, f) => { if (cache[k] !== v) { cache[k] = v; f(v); } };
  let alertT = 0, whisperT = 0, distT = 0;
  const whisperQ = [];

  // Compass strip: 4 cardinal letters + minor ticks, repeated for wrap-around
  (() => {
    let h = '';
    for (let r = -1; r <= 1; r++) for (let d = 0; d < 360; d += 15) {
      const x = (r * 360 + d) * 2;
      const lbl = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d];
      h += `<span class="${lbl ? 'card' : d % 45 === 0 ? 'mid' : 'tick'}" style="left:${x}px">${lbl || (d % 45 === 0 ? '·' : '')}</span>`;
    }
    E.strip.innerHTML = h + '<span class="mk haven" style="display:none">⚰</span><span class="mk wp" style="display:none">◆</span><span class="mk hunter" style="display:none">✠</span>';
  })();
  const mk = { haven: E.strip.querySelector('.mk.haven'), wp: E.strip.querySelector('.mk.wp'), hunter: E.strip.querySelector('.mk.hunter') };

  const marks = [];
  for (let i = 0; i < 14; i++) { const m = document.createElement('div'); m.className = 'mark'; E.marks.appendChild(m); marks.push(m); }

  function refresh() {
    const s = G.s; if (!s) return;
    set('moon', s.month % 4, v => { E.moon.className = 'moon p' + v; });
    set('mn', `The ${DATA.MOONS[s.month]}`, v => { E.moonName.textContent = v; });
    set('yr', `${DATA.MONTHS[s.month]} ${s.year} · Night ${s.turn + 1}`, v => { E.year.textContent = v; });
    const max = Math.max(G.maxHours(), s.hours);
    set('cand', `${s.hours}/${max}`, () => {
      E.candles.innerHTML = Array.from({ length: max }, (_, i) => `<span class="candle ${i < s.hours ? 'lit' : 'out'}"><i></i><b></b></span>`).join('');
    });
    set('hrs', s.hours, v => { E.hours.textContent = v <= 0 ? 'Dawn' : `${v} hour${v === 1 ? '' : 's'} until dawn`; E.hours.classList.toggle('danger', v <= 1); });
    set('blood', s.blood, v => { E.vial.style.height = v + '%'; E.vnum.textContent = v; el.classList.toggle('starving', v < 20); });
    set('hp', `${s.health}/${G.maxHealth()}`, () => { E.health.style.width = (s.health / G.maxHealth() * 100) + '%'; });
    set('hum', s.humanity, v => { E.hum.style.width = v + '%'; });
    set('susp', s.susp, v => { E.susp.style.width = v + '%'; });
    const fl = [];
    if (s.resonance) { const h = DATA.HUMOURS[s.resonance.h]; fl.push(`<span style="color:${h.color}">${h.name} · +${s.resonance.str} ${DATA.ATTRS[h.attr].name}</span>`); }
    if (s.hunter) fl.push(`<span class="bad">✠ ${s.hunter.name.split(',')[0]} · threat ${s.hunter.threat}</span>`);
    set('flags', fl.join(''), v => { E.flags.innerHTML = v; });
    const inside = World.inHaven();
    set('keys', inside + '|' + World.isTouch, () => {
      E.keys.innerHTML = World.isTouch ? '' : [['E', 'Act'], ['Q', 'Blood sense'], ['Shift', 'Run'], ['C', 'Skulk'], ['Tab', 'Grimoire'], ['M', 'Map'], ['R', 'Mend'], ...(G.power('nightwings') >= 3 ? [['H', 'Fly home']] : [])].map(([k, l]) => `<span><kbd>${k}</kbd>${l}</span>`).join('');
    });
    set('loc', inside ? 'haven' : s.loc, () => { E.loc.textContent = inside ? DATA.HAVENS[s.haven].name : G.distName(s.loc); });
  }

  function frame(dt, info) {
    const s = G.s; if (!s) return;
    refresh();
    // the current candle burns down with the minutes
    const frac = (s.night.min || 0) / 60;
    const cur = E.candles.children[s.hours - 1];
    if (cur) { cur.style.setProperty('--burn', (1 - frac).toFixed(3)); if (!cur.classList.contains('cur')) { for (const c of E.candles.children) c.classList.remove('cur'); cur.classList.add('cur'); } }
    // compass
    const yawDeg = ((-info.pl.yaw * 180 / Math.PI) % 360 + 360) % 360;
    E.strip.style.transform = `translateX(${-yawDeg * 2 - 0}px)`;
    const place = (m, tgt) => {
      if (!tgt) { m.style.display = 'none'; return; }
      const b = Math.atan2(tgt.x - info.pl.x, -(tgt.z - info.pl.z)) * 180 / Math.PI;
      const deg = (b % 360 + 360) % 360;
      let x = deg * 2; let rel = deg - yawDeg; while (rel > 180) rel -= 360; while (rel < -180) rel += 360;
      x = (yawDeg + rel) * 2;
      m.style.display = ''; m.style.left = x + 'px';
      m.classList.toggle('far', Math.abs(rel) > 60);
    };
    place(mk.haven, info.havenDir);
    place(mk.wp, info.wp);
    place(mk.hunter, s.hunter && s.hunter.known && !info.inside && World.town ? World.town.lodging : null);
    el.classList.toggle('dawn', s.hours <= 1 && !info.inside);
    el.classList.toggle('wanted', info.wanted > 0);
    el.classList.toggle('inside', info.inside);
    el.classList.toggle('sensing', info.sensing);
    // visibility eye
    const vis = info.pl.vis;
    set('vis', Math.round(vis * 10), () => { E.eye.style.setProperty('--v', vis.toFixed(2)); E.eye.querySelector('b').textContent = vis < 0.28 ? 'Hidden' : vis < 0.55 ? 'Shadowed' : 'Exposed'; E.eye.className = 'h-eye ' + (vis < 0.28 ? 'lo' : vis < 0.55 ? 'mid' : 'hi'); });
    // prompt: who or what is before you, and what you can do
    const tg = info.target, acts = info.actions || [];
    const key = (tg ? tg.title + '|' + tg.sub : '') + '|' + acts.map(a => a.key + a.label + (a.sub || '') + (a.off || '')).join(',') + (info.sensing ? 's' : '') + (tg && tg.vessel && tg.vessel.noticed ? 'n' : '');
    set('prompt', key, () => {
      E.cross.classList.toggle('on', !!tg);
      if (!tg && !acts.length) { E.prompt.innerHTML = ''; E.card.innerHTML = ''; return; }
      E.prompt.innerHTML = `${tg ? `<div class="p-l">${tg.title}</div>${tg.sub ? `<div class="p-s">${tg.sub}</div>` : ''}` : ''}
        <div class="p-acts">${acts.map(a => `<div class="p-a ${a.off ? 'off' : ''}" data-k="${a.key}"><kbd>${KL[a.key] || a.key}${a.hold ? '<i class="ring"></i>' : ''}</kbd><span>${a.hold ? 'Hold · ' : ''}${a.label}</span>${a.off ? `<em>${a.off}</em>` : a.sub ? `<em>${a.sub}</em>` : ''}</div>`).join('')}</div>`;
      E.card.innerHTML = '';
      if (tg && tg.vessel) {
        const v = tg.vessel.v, h = DATA.HUMOURS[v.humour];
        const sense = info.sensing || G.power('mesmerism') >= 1;
        E.prompt.insertAdjacentHTML('beforeend', `<div class="hc-tags">${sense ? `<span style="color:${h.color};border-color:${h.color}66">${h.name}</span><span>Vitae ${v.vit}</span><span>Wariness ${v.wary}</span>` : '<span class="dim">Hold Q to taste their blood</span>'}
          ${tg.vessel.state === 'charmed' ? '<span class="good">Charmed</span>' : tg.vessel.state === 'entranced' ? '<span class="good">Entranced</span>' : tg.vessel.noticed ? '<span class="bad">They have noticed you</span>' : '<span class="good">Unaware</span>'}</div>`);
      }
    });
    // feeding, arrest and frenzy
    const A = info.act;
    if (A && A.type === 'feed') {
      const life = 1 - A.frac, gain = Math.round(A.full * A.frac);
      const bind = G.canBind(A.v) ? `<span><kbd>F</kbd>Bind them with your blood · ${DATA.ROLES[A.v.role].name}</span>` : '';
      const html = `<div class="fa-name">${A.v.name}</div>
        <div class="fa-bar"><i style="width:${(life * 100).toFixed(1)}%"></i><b class="deep" style="left:38%"></b></div>
        <div class="fa-lbl"><span>${A.frac >= 0.62 ? (A.frac > 0.9 ? 'Their heart falters…' : 'Drinking deep') : 'Their heart races'}</span><span class="blood">+${gain} blood</span></div>
        <div class="fa-keys"><span><kbd>Hold E</kbd>Drink</span><span><kbd>Release</kbd>Let them go</span>${bind}</div>`;
      E.act.className = 'h-act on feed' + (A.frac > 0.9 ? ' dying' : ''); if (E.act.innerHTML !== html) E.act.innerHTML = html;
    } else if (A && A.type === 'arrest') {
      E.act.className = 'h-act on arrest';
      E.act.innerHTML = `<div class="fa-name">Seized by the watch</div><div class="fa-bar"><i style="width:${(A.t / 5 * 100).toFixed(1)}%"></i></div><div class="fa-lbl"><span>Act before they drag you off</span></div>`;
    } else if (A && A.type === 'frenzy') {
      E.act.className = 'h-act on frenzy';
      E.act.innerHTML = `<div class="fa-name">The Beast</div><div class="fa-bar"><i style="width:${(Math.min(1, A.got / A.need) * 100).toFixed(1)}%"></i></div><div class="fa-lbl"><span>Hammer <kbd>E</kbd> to chain it</span><span>${Math.max(0, A.t).toFixed(1)}s</span></div>`;
    } else if (E.act.className !== 'h-act') { E.act.className = 'h-act'; E.act.innerHTML = ''; }
    // the hunter's strength, when you fight
    const hn = info.hunter;
    if (hn && hn.state === 'chase' && hn.dP < 25 && hn.hp !== undefined) {
      E.foe.className = 'h-foe on';
      E.foe.innerHTML = `<div>${G.s.hunter ? G.s.hunter.name : hn.v.name}</div><div class="foe-bar"><i style="width:${Math.max(0, hn.hp)}%"></i></div>`;
    } else E.foe.className = 'h-foe';
    // awareness markers over heads
    let mi = 0;
    if (!info.inside) {
      const cam = info.camera, v3 = new THREE.Vector3();
      for (const n of info.people) {
        if (mi >= marks.length) break;
        if (n.state === 'dead' || n.dP > 26 || n.kind === 'encounter') continue;
        const st = n.state === 'chase' ? '!' : n.state === 'flee' ? '!' : n.aware > 0.25 ? (n.noticed ? '!' : '?') : '';
        if (!st && !(info.sensing && n.dP < 22)) continue;
        v3.set(n.x, 2.2, n.z).project(cam);
        if (v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1) continue;
        const m = marks[mi++];
        m.style.display = 'block';
        m.style.transform = `translate(${(v3.x * 0.5 + 0.5) * innerWidth}px, ${(-v3.y * 0.5 + 0.5) * innerHeight}px)`;
        const cls = n.kind === 'hunter' && st ? 'hunter' : st === '!' ? 'alarm' : st === '?' ? 'sus' : 'beat';
        if (m.dataset.c !== cls + st) { m.dataset.c = cls + st; m.className = 'mark ' + cls; m.textContent = st || '♥'; }
        m.style.setProperty('--a', Math.min(1, n.aware).toFixed(2));
        if (!st) m.style.color = DATA.HUMOURS[n.v.humour] ? DATA.HUMOURS[n.v.humour].color : '#c33';
        else m.style.color = '';
      }
    }
    for (; mi < marks.length; mi++) marks[mi].style.display = 'none';
    // timers
    if (alertT > 0) { alertT -= dt; if (alertT <= 0) E.alert.classList.remove('on'); }
    if (distT > 0) { distT -= dt; if (distT <= 0) E.dist.classList.remove('on'); }
    if (whisperT > 0) { whisperT -= dt; if (whisperT <= 0) { E.whisper.classList.remove('on'); } }
    else if (whisperQ.length) { const w = whisperQ.shift(); E.whisper.innerHTML = w.t; E.whisper.className = 'h-whisper on ' + (w.cls || ''); whisperT = Math.max(4, w.t.length / 14); }
    innerVoice(dt, info);
  }

  // Unbidden thoughts: hunger, dawn, guilt
  let voiceT = 25;
  function innerVoice(dt, info) {
    const s = G.s;
    voiceT -= dt; if (voiceT > 0) return;
    voiceT = 40 + Math.random() * 50;
    const lines = [];
    if (s.blood < 25) lines.push('The hunger is a hand around your throat.', 'Every heartbeat on this street is a dinner bell.', 'You can hear their pulses through the walls.');
    if (s.humanity < 35) lines.push('Why do you still pretend to be one of them?', 'The Beast purrs. It likes it here.');
    if (s.humanity >= 70 && s.kills > 0) lines.push(`You still remember ${s.victims[0].name}'s face.`);
    if (s.susp > 50) lines.push('Too many eyes. Too many questions.', 'Someone in this city is sharpening a stake with your name on it.');
    if (info.weather === 'fog') lines.push('The fog is a friend. It hides everything, even you.');
    if (info.weather === 'rain') lines.push('Rain on dead skin. You cannot feel the cold anymore. You miss it.');
    if (info.weather === 'blood') lines.push('A blood moon. The old ones say the Beast walks closer to the skin on such nights.');
    if (info.weather === 'snow') lines.push('Snow muffles every footstep. Theirs, and yours.');
    if (!lines.length) lines.push('Smoke, tallow and the river-stink. London never changes. Only the faces do.', 'Somewhere a baby is crying. Somewhere a bell is ringing. Somewhere someone is dying, and it is not your doing.', 'You were alive once. You are almost sure of it.');
    whisper(lines[(Math.random() * lines.length) | 0]);
  }

  let holdKey = null;
  function hold(k, f) {
    if (k !== holdKey) { E.prompt.querySelectorAll('.p-a').forEach(e => e.classList.remove('holding')); holdKey = k; }
    if (!k) return;
    const el = E.prompt.querySelector(`.p-a[data-k="${k}"]`);
    if (el) { el.classList.add('holding'); el.style.setProperty('--h', Math.min(1, f).toFixed(3)); }
  }
  function floatText(t, col) {
    const d = document.createElement('div'); d.className = 'fl'; d.textContent = t; if (col) d.style.color = col;
    d.style.left = (46 + Math.random() * 8) + '%';
    E.float.appendChild(d); setTimeout(() => d.remove(), 2200);
  }
  function floatChips(chips) {
    chips.forEach((c, i) => setTimeout(() => {
      const good = (c.v > 0 ? 1 : -1) * (DATA.POLARITY[c.k] || 1) > 0;
      floatText(c.k === 'gold' ? `${c.v > 0 ? '+' : '−'}£${Math.abs(c.v)}` : c.k === 'havenLoss' ? 'Haven lost' : `${c.v > 0 ? '+' : '−'}${Math.abs(c.v)} ${DATA.LABELS[c.k]}`, c.k === 'blood' && c.v > 0 ? '#ff4a5c' : good ? '#a8e090' : '#ff7a7a');
    }, i * 180));
  }
  function refreshPrompt() { delete cache.prompt; }
  function whisper(t, cls = '') { if (!t) return; if (whisperQ.length < 3) whisperQ.push({ t, cls }); }
  function alert(t) { E.alert.textContent = t; E.alert.classList.add('on'); alertT = 4.5; Snd.play('sting'); }
  function district(name, desc) { E.dName.textContent = name; E.dDesc.textContent = desc || ''; E.dist.classList.remove('on'); void E.dist.offsetWidth; E.dist.classList.add('on'); distT = 5; }
  function reset() { for (const k of Object.keys(cache)) delete cache[k]; whisperQ.length = 0; whisperT = 0; E.whisper.classList.remove('on'); E.alert.classList.remove('on'); voiceT = 30; }
  function show(v) { el.classList.toggle('hidden', !v); }

  const KL = { KeyE: 'E', KeyF: 'F', KeyG: 'G' };
  return { frame, refresh, whisper, alert, district, reset, show, hold, floatText, floatChips, refreshPrompt };
})();
