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
    flags: $('.h-flags'), eye: $('.h-eye'), keys: $('.h-keys'), whisper: $('.h-whisper'), loc: $('.h-loc'), cross: $('.h-cross'),
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
    // prompt & card
    const tg = info.target;
    const key = tg ? tg.label + tg.kind + (tg.o && tg.o.noticed ? 'n' : '') + (info.sensing ? 's' : '') : '';
    set('prompt', key, () => {
      if (!tg) { E.prompt.innerHTML = ''; E.card.innerHTML = ''; E.cross.classList.remove('on'); return; }
      E.cross.classList.add('on');
      E.prompt.innerHTML = `<kbd>${World.isTouch ? '✋' : 'E'}</kbd><span class="p-l">${tg.label}</span>${tg.sub ? `<span class="p-s">${tg.sub}</span>` : ''}`;
      if (tg.kind === 'vessel') {
        const v = tg.o.v, h = DATA.HUMOURS[v.humour];
        const sense = info.sensing || G.power('mesmerism') >= 1;
        E.card.innerHTML = `<div class="hc-name">${v.name}</div><div class="hc-occ">${G.an(v.occ)}, perhaps ${v.age}</div>
          <div class="hc-tags">${sense ? `<span style="color:${h.color};border-color:${h.color}66">${h.name}</span><span>Vitae ${v.vit}</span><span>Wariness ${v.wary}</span>` : '<span class="dim">Hold Q to taste their blood on the air</span>'}
          ${tg.o.noticed ? '<span class="bad">They have noticed you</span>' : '<span class="good">Unaware</span>'}</div>`;
      } else E.card.innerHTML = '';
    });
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

  function whisper(t, cls = '') { if (!t) return; if (whisperQ.length < 3) whisperQ.push({ t, cls }); }
  function alert(t) { E.alert.textContent = t; E.alert.classList.add('on'); alertT = 4.5; Snd.play('sting'); }
  function district(name, desc) { E.dName.textContent = name; E.dDesc.textContent = desc || ''; E.dist.classList.remove('on'); void E.dist.offsetWidth; E.dist.classList.add('on'); distT = 5; }
  function reset() { for (const k of Object.keys(cache)) delete cache[k]; whisperQ.length = 0; whisperT = 0; E.whisper.classList.remove('on'); E.alert.classList.remove('on'); voiceT = 30; }
  function show(v) { el.classList.toggle('hidden', !v); }

  return { frame, refresh, whisper, alert, district, reset, show };
})();
