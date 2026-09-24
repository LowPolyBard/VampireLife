/* ==========================================================
   CRIMSON CENTURIES — atmospheric background
   Drifting fog, falling ash, and the occasional bat.
   ========================================================== */

(() => {
  const cv = document.getElementById('fx');
  const cx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const fog = [], ash = [], bats = [];
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  }
  addEventListener('resize', resize); resize();

  for (let i = 0; i < 9; i++) fog.push({ x: Math.random(), y: 0.35 + Math.random() * 0.7, r: 0.25 + Math.random() * 0.35, v: (Math.random() * 0.5 + 0.2) * 0.00012 * (Math.random() < 0.5 ? -1 : 1), a: 0.03 + Math.random() * 0.04 });
  for (let i = 0; i < 70; i++) ash.push(newAsh(true));
  function newAsh(any) {
    return { x: Math.random(), y: any ? Math.random() : -0.02, s: 0.5 + Math.random() * 1.6, vy: 0.00015 + Math.random() * 0.0004, vx: (Math.random() - 0.5) * 0.0002, ph: Math.random() * 6.28, red: Math.random() < 0.18 };
  }
  function spawnBat() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    bats.push({ x: dir > 0 ? -0.05 : 1.05, y: 0.08 + Math.random() * 0.35, vx: dir * (0.0012 + Math.random() * 0.001), ph: 0, s: 6 + Math.random() * 8, wob: Math.random() * 6 });
  }

  function drawBat(b) {
    const x = b.x * W, y = (b.y + Math.sin(b.ph * 0.3 + b.wob) * 0.01) * H, s = b.s * dpr;
    const flap = Math.sin(b.ph) * 0.8;
    cx.save(); cx.translate(x, y); cx.fillStyle = 'rgba(5,2,3,0.85)';
    cx.beginPath();
    cx.moveTo(0, 0);
    cx.quadraticCurveTo(-s * 0.6, -s * flap, -s * 1.6, -s * flap * 0.6);
    cx.quadraticCurveTo(-s * 1.0, s * 0.1, -s * 0.9, s * 0.35);
    cx.quadraticCurveTo(-s * 0.4, s * 0.1, 0, s * 0.3);
    cx.quadraticCurveTo(s * 0.4, s * 0.1, s * 0.9, s * 0.35);
    cx.quadraticCurveTo(s * 1.0, s * 0.1, s * 1.6, -s * flap * 0.6);
    cx.quadraticCurveTo(s * 0.6, -s * flap, 0, 0);
    cx.fill(); cx.restore();
  }

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(50, t - last); last = t;
    cx.clearRect(0, 0, W, H);
    const starving = document.body.classList.contains('starving');
    for (const f of fog) {
      f.x += f.v * dt; if (f.x > 1.4) f.x = -0.4; if (f.x < -0.4) f.x = 1.4;
      const g = cx.createRadialGradient(f.x * W, f.y * H, 0, f.x * W, f.y * H, f.r * W);
      const col = starving ? '120,20,30' : '150,130,140';
      g.addColorStop(0, `rgba(${col},${f.a})`); g.addColorStop(1, `rgba(${col},0)`);
      cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    }
    for (const a of ash) {
      a.y += a.vy * dt; a.ph += dt * 0.002; a.x += a.vx * dt + Math.sin(a.ph) * 0.0002;
      if (a.y > 1.02) Object.assign(a, newAsh(false));
      cx.fillStyle = a.red ? 'rgba(200,60,50,0.55)' : 'rgba(210,195,180,0.35)';
      cx.beginPath(); cx.arc(a.x * W, a.y * H, a.s * dpr, 0, 6.283); cx.fill();
    }
    if (Math.random() < 0.0012 * dt / 16 && bats.length < 4) spawnBat();
    for (let i = bats.length - 1; i >= 0; i--) {
      const b = bats[i]; b.x += b.vx * dt / 16 * 4; b.ph += dt * 0.03;
      drawBat(b);
      if (b.x < -0.1 || b.x > 1.1) bats.splice(i, 1);
    }
    requestAnimationFrame(frame);
  }
  if (!reduce) requestAnimationFrame(frame);
})();
