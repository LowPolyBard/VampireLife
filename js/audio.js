/* ==========================================================
   CRIMSON CENTURIES — procedural sound (Web Audio, no assets)
   A low drone, wind, a slow harpsichord-like lament in D minor,
   distant bells, and small interface sounds.
   ========================================================== */

const Snd = (() => {
  let ctx = null, master = null, musicBus = null, sfxBus = null, verb = null;
  let on = true;
  try { on = localStorage.getItem('cc-sound') !== 'off'; } catch (e) { /* ignore */ }
  let musicTimer = null;

  function impulse(seconds, decay) {
    const rate = ctx.sampleRate, len = rate * seconds;
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = on ? 0.7 : 0; master.connect(ctx.destination);
    verb = ctx.createConvolver(); verb.buffer = impulse(3.5, 2.5);
    const verbGain = ctx.createGain(); verbGain.gain.value = 0.55; verb.connect(verbGain).connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master); musicBus.connect(verb);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master); sfxBus.connect(verb);
    drone(); wind(); music();
  }

  function drone() {
    const g = ctx.createGain(); g.gain.value = 0.05;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 3;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    const lg = ctx.createGain(); lg.gain.value = 120; lfo.connect(lg).connect(f.frequency); lfo.start();
    [36.7, 36.95, 55.0, 73.4].forEach((fr, i) => {
      const o = ctx.createOscillator(); o.type = i < 2 ? 'sawtooth' : 'triangle'; o.frequency.value = fr;
      o.connect(f); o.start();
    });
    f.connect(g).connect(musicBus);
  }

  function wind() {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0.12;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lg = ctx.createGain(); lg.gain.value = 0.08; lfo.connect(lg).connect(g.gain); lfo.start();
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.03;
    const lg2 = ctx.createGain(); lg2.gain.value = 250; lfo2.connect(lg2).connect(bp.frequency); lfo2.start();
    src.connect(bp).connect(g).connect(musicBus); src.start();
  }

  // Plucked, harpsichord-ish note
  function pluck(freq, t, vol = 0.08, dur = 1.6, bus = musicBus) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    o.type = 'triangle'; o2.type = 'square';
    o.frequency.value = freq; o2.frequency.value = freq * 2.001;
    const g = ctx.createGain(), g2 = ctx.createGain();
    g2.gain.value = 0.18;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 8, t); f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); o2.connect(g2).connect(f); f.connect(g).connect(bus);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  // D minor lament: Dm – Bb – Gm – A
  const PROG = [[50, 53, 57, 62], [46, 50, 53, 58], [43, 50, 55, 58], [45, 49, 52, 57]];
  const MELO = [62, 65, 69, 67, 65, 64, 62, 61, 69, 70, 67, 65];
  function music() {
    let bar = 0;
    const playBar = () => {
      if (!ctx) return;
      const t = ctx.currentTime + 0.05, beat = 0.62;
      const ch = PROG[bar % PROG.length];
      pluck(N(ch[0] - 12), t, 0.07, 3.5);
      const pattern = [0, 1, 2, 3, 2, 1];
      pattern.forEach((idx, i) => { if (Math.random() < 0.85) pluck(N(ch[idx] + 12), t + i * beat * 0.66, 0.035, 1.4); });
      if (Math.random() < 0.55) {
        const m = MELO[Math.floor(Math.random() * MELO.length)];
        pluck(N(m + 12), t + beat * (Math.random() < 0.5 ? 1 : 2.5), 0.03, 2.4);
      }
      bar++;
      if (Math.random() < 0.08) bell(ctx.currentTime + 2, 98, 0.05);
    };
    playBar();
    musicTimer = setInterval(playBar, 4000);
  }

  function bell(t, base = 196, vol = 0.12) {
    [1, 2.4, 3.0, 4.2, 5.4, 6.8].forEach((k, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = base * k;
      const g = ctx.createGain();
      const v = vol / (i + 1);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 5 - i * 0.5);
      o.connect(g).connect(sfxBus); o.start(t); o.stop(t + 5.2);
    });
  }

  function tone(freq, t, dur, type = 'sine', vol = 0.1, slide = null) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol, freq = 1200, type = 'lowpass') {
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(sfxBus); src.start(t);
  }

  const SFX = {
    click: t => tone(880, t, 0.06, 'triangle', 0.03),
    tab: t => tone(660, t, 0.08, 'triangle', 0.025),
    page: t => noise(t, 0.25, 0.04, 3000, 'bandpass'),
    heart: t => { for (let i = 0; i < 3; i++) { tone(55, t + i * 0.8, 0.18, 'sine', 0.35, 40); tone(50, t + i * 0.8 + 0.22, 0.2, 'sine', 0.25, 38); } },
    bite: t => { noise(t, 0.15, 0.2, 900); tone(90, t, 0.4, 'sine', 0.2, 50); },
    drain: t => { tone(110, t, 2.5, 'sawtooth', 0.04, 55); pluck(N(50), t + 0.3, 0.08, 3, sfxBus); pluck(N(53), t + 0.5, 0.06, 3, sfxBus); pluck(N(56), t + 0.7, 0.06, 3, sfxBus); },
    fail: t => { tone(220, t, 0.5, 'sawtooth', 0.05, 110); },
    coin: t => { tone(1760, t, 0.2, 'triangle', 0.05); tone(2349, t + 0.07, 0.3, 'triangle', 0.04); },
    power: t => { [62, 65, 69, 74].forEach((n, i) => pluck(N(n), t + i * 0.09, 0.07, 2.2, sfxBus)); },
    ach: t => { [69, 74, 78, 81].forEach((n, i) => pluck(N(n), t + i * 0.07, 0.05, 2, sfxBus)); },
    bell: t => bell(t, 146.8, 0.13),
    dusk: t => { bell(t, 110, 0.1); tone(55, t, 3, 'sine', 0.12); },
    organ: t => { [38, 50, 53, 57, 62].forEach(n => { tone(N(n), t, 4.5, 'sawtooth', 0.018); tone(N(n) * 1.003, t, 4.5, 'square', 0.008); }); },
    frenzy: t => { for (let i = 0; i < 6; i++) tone(60, t + i * 0.35, 0.15, 'sine', 0.4, 40); noise(t, 1.5, 0.15, 400); },
    burn: t => { noise(t, 2.5, 0.3, 2500, 'highpass'); tone(300, t, 2, 'sawtooth', 0.04, 80); },
    death: t => { [38, 41, 44].forEach(n => tone(N(n), t, 6, 'sawtooth', 0.03)); bell(t, 73, 0.2); },
  };

  function play(name) {
    if (!ctx || !on) return;
    if (ctx.state === 'suspended') ctx.resume();
    const f = SFX[name]; if (f) f(ctx.currentTime + 0.01);
  }

  function toggle() {
    on = !on;
    try { localStorage.setItem('cc-sound', on ? 'on' : 'off'); } catch (e) { /* ignore */ }
    init();
    if (master) master.gain.setTargetAtTime(on ? 0.7 : 0, ctx.currentTime, 0.2);
  }

  return { init, play, toggle, enabled: () => on };
})();

// Browsers require a gesture before audio can start.
document.addEventListener('pointerdown', () => Snd.init(), { once: true });
