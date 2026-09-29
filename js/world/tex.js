/* ==========================================================
   CRIMSON CENTURIES — procedural textures
   Every surface of the city is painted here on small canvases
   and sampled with nearest-neighbour filtering: grimy, low-res,
   hand-made. No image files.
   ========================================================== */

const TEX = (() => {
  const cache = {};
  let R = WU.rng(1234);

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const rgb = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  const jit = (c, j) => c.map(v => WU.clamp(v + (R() - 0.5) * j, 0, 255));

  function toTex(c, repeat = true, nearest = true) {
    const t = new THREE.CanvasTexture(c);
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
    t.minFilter = nearest ? THREE.NearestMipmapLinearFilter : THREE.LinearMipmapLinearFilter;
    t.anisotropy = 1;
    return t;
  }

  // Fill with speckled noise around a base colour
  function speckle(x, w, h, base, amt, size = 1) {
    x.fillStyle = rgb(...base); x.fillRect(0, 0, w, h);
    for (let i = 0; i < (w * h) / (size * size) * 0.6; i++) {
      const c = jit(base, amt);
      x.fillStyle = rgb(...c, 0.5 + R() * 0.5);
      x.fillRect((R() * w) | 0, (R() * h) | 0, size, size);
    }
  }
  function grime(x, w, h, n, col = [10, 8, 6], alpha = 0.18) {
    for (let i = 0; i < n; i++) {
      const gx = R() * w, gy = R() * h, r = 3 + R() * w * 0.2;
      const g = x.createRadialGradient(gx, gy, 0, gx, gy, r);
      g.addColorStop(0, rgb(...col, alpha)); g.addColorStop(1, rgb(...col, 0));
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
  }
  function streaks(x, w, h, n, col, alpha) {
    for (let i = 0; i < n; i++) {
      const sx = R() * w, len = h * (0.2 + R() * 0.8), sy = R() * h * 0.5;
      x.fillStyle = rgb(...col, alpha * (0.4 + R() * 0.6));
      x.fillRect(sx | 0, sy | 0, 1 + (R() < 0.3 ? 1 : 0), len | 0);
    }
  }
  function moss(x, w, h, n) {
    for (let i = 0; i < n; i++) {
      x.fillStyle = rgb(40 + R() * 25, 58 + R() * 30, 28 + R() * 15, 0.55 + R() * 0.4);
      const mx = R() * w, my = R() * h;
      for (let k = 0; k < 8; k++) x.fillRect((mx + (R() - 0.5) * 6) | 0, (my + (R() - 0.5) * 4) | 0, 1 + (R() * 2 | 0), 1);
    }
  }

  const P = {
    cobble() {
      const w = 128, h = 128, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [22, 20, 19], 10);
      const rows = 9;
      for (let r = 0; r < rows; r++) {
        const y = r * h / rows; let cx = (r % 2) * 6 - 6;
        while (cx < w + 8) {
          const sw = 10 + R() * 9, sh = h / rows - 2;
          const base = jit([74, 70, 64], 26); if (R() < 0.2) { base[1] += 8; base[0] -= 4; }
          x.fillStyle = rgb(...base);
          x.beginPath(); x.ellipse(cx + sw / 2, y + sh / 2 + 1, sw / 2 - 0.5, sh / 2, (R() - 0.5) * 0.3, 0, 7); x.fill();
          x.fillStyle = rgb(base[0] + 22, base[1] + 20, base[2] + 18, 0.5);
          x.fillRect((cx + 3) | 0, (y + 2) | 0, (sw * 0.45) | 0, 2);
          x.fillStyle = rgb(0, 0, 0, 0.35);
          x.fillRect((cx + 2) | 0, (y + sh - 1) | 0, (sw - 3) | 0, 2);
          cx += sw + 1;
        }
      }
      moss(x, w, h, 22); grime(x, w, h, 10, [5, 4, 3], 0.3);
      return c;
    },
    flag() {
      const w = 128, h = 128, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [30, 28, 26], 8);
      let y = 0;
      while (y < h) {
        const rh = 20 + R() * 22; let cx = -R() * 30;
        while (cx < w) {
          const sw = 24 + R() * 30, base = jit([78, 74, 68], 18);
          x.fillStyle = rgb(...base); x.fillRect(cx | 0, y | 0, (sw - 2) | 0, (rh - 2) | 0);
          speckleRect(x, cx, y, sw - 2, rh - 2, base, 14);
          if (R() < 0.3) { x.strokeStyle = rgb(20, 18, 16, 0.7); x.beginPath(); x.moveTo(cx + R() * sw, y); x.lineTo(cx + R() * sw, y + rh); x.stroke(); }
          cx += sw;
        }
        y += rh;
      }
      moss(x, w, h, 14); grime(x, w, h, 12, [6, 5, 4], 0.28);
      return c;
    },
    mud() {
      const w = 64, h = 64, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [38, 30, 22], 16);
      grime(x, w, h, 8, [14, 10, 8], 0.5);
      for (let i = 0; i < 40; i++) { x.fillStyle = rgb(90, 76, 40, 0.5); const sx = R() * w, sy = R() * h; x.fillRect(sx | 0, sy | 0, 3 + R() * 4 | 0, 1); }
      for (let i = 0; i < 8; i++) { x.fillStyle = rgb(60, 58, 54, 0.8); x.fillRect(R() * w | 0, R() * h | 0, 2, 2); }
      return c;
    },
    grass() {
      const w = 64, h = 64, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [30, 32, 20], 14);
      for (let i = 0; i < 260; i++) {
        x.fillStyle = rgb(40 + R() * 35, 44 + R() * 30, 22 + R() * 12, 0.8);
        const sx = R() * w, sy = R() * h; x.fillRect(sx | 0, sy | 0, 1, 2 + (R() * 3 | 0));
      }
      grime(x, w, h, 6, [8, 6, 4], 0.35);
      return c;
    },
    quay() {
      const w = 128, h = 128, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [26, 24, 22], 6);
      for (let y = 0; y < h; y += 16) for (let cx = (y / 16 % 2) * 20 - 20; cx < w; cx += 40) {
        const base = jit([60, 58, 54], 14); x.fillStyle = rgb(...base); x.fillRect(cx + 1, y + 1, 38, 14);
        speckleRect(x, cx + 1, y + 1, 38, 14, base, 12);
      }
      grime(x, w, h, 14, [4, 4, 4], 0.3); moss(x, w, h, 10);
      return c;
    },
    planks() {
      const w = 64, h = 64, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [40, 28, 20], 8);
      for (let i = 0; i < 8; i++) {
        const base = jit([62, 44, 30], 16); x.fillStyle = rgb(...base); x.fillRect(0, i * 8, w, 7);
        for (let k = 0; k < 6; k++) { x.fillStyle = rgb(base[0] - 16, base[1] - 12, base[2] - 8, 0.6); x.fillRect(R() * w | 0, i * 8 + (R() * 6 | 0), 6 + R() * 16 | 0, 1); }
        x.fillStyle = rgb(0, 0, 0, 0.5); x.fillRect(R() * w | 0, i * 8, 1, 7);
      }
      grime(x, w, h, 5, [5, 3, 2], 0.3);
      return c;
    },
    timber() {
      const w = 16, h = 64, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [34, 24, 18], 10);
      for (let i = 0; i < 18; i++) { x.fillStyle = rgb(18, 12, 9, 0.8); x.fillRect(R() * w | 0, R() * h | 0, 1, 4 + R() * 12 | 0); }
      return c;
    },
    plaster() {
      const w = 128, h = 128, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [150, 138, 112], 16);
      grime(x, w, h, 18, [60, 50, 34], 0.22);
      streaks(x, w, h, 40, [50, 44, 32], 0.25);
      for (let i = 0; i < 6; i++) { // cracked-off patches showing wattle
        const px = R() * w, py = R() * h, pw = 5 + R() * 10, ph = 4 + R() * 7;
        x.fillStyle = rgb(80, 64, 44, 0.8); x.fillRect(px | 0, py | 0, pw | 0, ph | 0);
        for (let k = 0; k < pw; k += 2) { x.fillStyle = rgb(56, 42, 28, 0.8); x.fillRect((px + k) | 0, py | 0, 1, ph | 0); }
      }
      moss(x, w, h, 8);
      return c;
    },
    stone() {
      const w = 128, h = 128, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [34, 36, 32], 8);
      let y = 0;
      while (y < h) {
        const rh = 12 + (R() * 8 | 0); let cx = -R() * 20;
        while (cx < w) {
          const sw = 18 + R() * 26, base = jit([84, 86, 76], 18);
          x.fillStyle = rgb(...base); x.fillRect(cx | 0, y | 0, (sw - 2) | 0, rh - 2);
          speckleRect(x, cx, y, sw - 2, rh - 2, base, 16);
          x.fillStyle = rgb(255, 255, 240, 0.06); x.fillRect(cx | 0, y | 0, (sw - 2) | 0, 1);
          cx += sw;
        }
        y += rh;
      }
      grime(x, w, h, 16, [10, 14, 8], 0.28); streaks(x, w, h, 30, [14, 16, 10], 0.3); moss(x, w, h, 30);
      return c;
    },
    brick() {
      const w = 128, h = 128, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [48, 40, 36], 8);
      for (let r = 0; r < 16; r++) for (let k = -1; k < 8; k++) {
        const base = jit([104, 52, 38], 30);
        const bx = k * 16 + (r % 2) * 8, by = r * 8;
        x.fillStyle = rgb(...base); x.fillRect(bx + 1, by + 1, 14, 6);
        x.fillStyle = rgb(0, 0, 0, 0.15); x.fillRect(bx + 1, by + 6, 14, 1);
      }
      grime(x, w, h, 22, [8, 6, 6], 0.32); streaks(x, w, h, 50, [10, 8, 8], 0.3);
      return c;
    },
    sootbrick() {
      const w = 128, h = 128, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [30, 28, 28], 6);
      for (let r = 0; r < 16; r++) for (let k = -1; k < 8; k++) {
        const base = jit([66, 48, 42], 22);
        const bx = k * 16 + (r % 2) * 8, by = r * 8;
        x.fillStyle = rgb(...base); x.fillRect(bx + 1, by + 1, 14, 6);
      }
      grime(x, w, h, 30, [4, 4, 4], 0.4); streaks(x, w, h, 70, [6, 6, 6], 0.4);
      return c;
    },
    roof() {
      const w = 64, h = 64, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [30, 20, 16], 8);
      for (let r = 0; r < 8; r++) for (let k = -1; k < 9; k++) {
        const base = jit([86, 46, 34], 26); const bx = k * 8 + (r % 2) * 4, by = r * 8;
        x.fillStyle = rgb(...base); x.fillRect(bx, by, 7, 7);
        x.fillStyle = rgb(0, 0, 0, 0.4); x.fillRect(bx, by + 6, 7, 1);
      }
      moss(x, w, h, 12); grime(x, w, h, 10, [5, 5, 3], 0.35);
      return c;
    },
    thatch() {
      const w = 64, h = 64, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [60, 48, 26], 14);
      for (let i = 0; i < 500; i++) { x.fillStyle = rgb(90 + R() * 50, 70 + R() * 40, 30 + R() * 20, 0.6); x.fillRect(R() * w | 0, R() * h | 0, 1, 3 + R() * 5 | 0); }
      for (let r = 0; r < 4; r++) { x.fillStyle = rgb(20, 14, 8, 0.5); x.fillRect(0, r * 16 + 14, w, 2); }
      grime(x, w, h, 10, [20, 26, 10], 0.35);
      return c;
    },
    slate() {
      const w = 64, h = 64, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [24, 26, 30], 6);
      for (let r = 0; r < 8; r++) for (let k = -1; k < 6; k++) {
        const base = jit([52, 56, 64], 14); const bx = k * 12 + (r % 2) * 6, by = r * 8;
        x.fillStyle = rgb(...base); x.fillRect(bx, by, 11, 7);
      }
      grime(x, w, h, 10, [4, 4, 4], 0.4);
      return c;
    },
    window() {
      const w = 32, h = 48, c = canvas(w, h), x = c.getContext('2d');
      x.fillStyle = rgb(30, 22, 16); x.fillRect(0, 0, w, h);
      x.fillStyle = rgb(8, 10, 14); x.fillRect(3, 3, w - 6, h - 6);
      x.strokeStyle = rgb(40, 38, 36); x.lineWidth = 1;
      for (let i = -8; i < 16; i++) { x.beginPath(); x.moveTo(3 + i * 4, 3); x.lineTo(3 + i * 4 + 40, 43); x.stroke(); x.beginPath(); x.moveTo(3 + i * 4 + 40, 3); x.lineTo(3 + i * 4, 43); x.stroke(); }
      x.fillStyle = rgb(120, 130, 150, 0.12); x.fillRect(5, 5, 6, 14);
      return c;
    },
    windowLit() {
      const w = 32, h = 48, c = canvas(w, h), x = c.getContext('2d');
      x.fillStyle = rgb(40, 26, 14); x.fillRect(0, 0, w, h);
      const g = x.createRadialGradient(16, 28, 2, 16, 28, 26);
      g.addColorStop(0, rgb(255, 196, 110)); g.addColorStop(1, rgb(170, 70, 24));
      x.fillStyle = g; x.fillRect(3, 3, w - 6, h - 6);
      x.strokeStyle = rgb(50, 24, 10, 0.9); x.lineWidth = 1;
      for (let i = -8; i < 16; i++) { x.beginPath(); x.moveTo(3 + i * 4, 3); x.lineTo(3 + i * 4 + 40, 43); x.stroke(); x.beginPath(); x.moveTo(3 + i * 4 + 40, 3); x.lineTo(3 + i * 4, 43); x.stroke(); }
      if (R() < 2) { x.fillStyle = rgb(30, 14, 8, 0.7); x.fillRect(18, 16, 6, 24); }
      return c;
    },
    sash() {
      const w = 32, h = 56, c = canvas(w, h), x = c.getContext('2d');
      x.fillStyle = rgb(170, 160, 140); x.fillRect(0, 0, w, h);
      x.fillStyle = rgb(8, 10, 14); x.fillRect(3, 3, w - 6, h - 6);
      x.fillStyle = rgb(150, 140, 124);
      for (let i = 1; i < 3; i++) x.fillRect(3 + i * (w - 6) / 3 - 1, 3, 2, h - 6);
      for (let i = 1; i < 4; i++) x.fillRect(3, 3 + i * (h - 6) / 4 - 1, w - 6, 2);
      x.fillStyle = rgb(120, 130, 150, 0.1); x.fillRect(5, 5, 6, 10);
      grime(x, w, h, 4, [10, 8, 6], 0.4);
      return c;
    },
    sashLit() {
      const w = 32, h = 56, c = canvas(w, h), x = c.getContext('2d');
      x.fillStyle = rgb(140, 120, 90); x.fillRect(0, 0, w, h);
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, rgb(250, 190, 100)); g.addColorStop(1, rgb(180, 80, 30));
      x.fillStyle = g; x.fillRect(3, 3, w - 6, h - 6);
      x.fillStyle = rgb(90, 60, 30);
      for (let i = 1; i < 3; i++) x.fillRect(3 + i * (w - 6) / 3 - 1, 3, 2, h - 6);
      for (let i = 1; i < 4; i++) x.fillRect(3, 3 + i * (h - 6) / 4 - 1, w - 6, 2);
      x.fillStyle = rgb(80, 20, 20, 0.5); x.fillRect(3, 3, 7, h - 6); x.fillRect(w - 10, 3, 7, h - 6); // curtains
      return c;
    },
    door() {
      const w = 32, h = 64, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [44, 30, 20], 10);
      for (let i = 0; i < 4; i++) { x.fillStyle = rgb(0, 0, 0, 0.5); x.fillRect(i * 8, 0, 1, h); }
      x.fillStyle = rgb(20, 18, 18); x.fillRect(0, 12, w, 3); x.fillRect(0, 46, w, 3);
      for (let i = 0; i < 5; i++) { x.fillStyle = rgb(70, 66, 60); x.fillRect(3 + i * 6, 13, 1, 1); x.fillRect(3 + i * 6, 47, 1, 1); }
      x.fillStyle = rgb(90, 80, 60); x.fillRect(24, 32, 3, 3);
      grime(x, w, h, 4, [4, 3, 2], 0.4);
      return c;
    },
    iron() {
      const w = 16, h = 16, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [26, 24, 24], 10);
      return c;
    },
    ivy() {
      const w = 64, h = 64, c = canvas(w, h), x = c.getContext('2d');
      x.clearRect(0, 0, w, h);
      // hanging strands with leaf clusters, denser near the top
      for (let s = 0; s < 9; s++) {
        let px = R() * w, py = 0;
        const len = h * (0.4 + R() * 0.6);
        while (py < len) {
          px += (R() - 0.5) * 3; py += 1 + R() * 2;
          const leaf = [28 + R() * 30, 48 + R() * 40, 20 + R() * 16];
          x.fillStyle = rgb(...leaf); x.fillRect(px | 0, py | 0, 2 + (R() * 3 | 0), 2 + (R() * 2 | 0));
          if (R() < 0.4) { x.fillStyle = rgb(leaf[0] * 0.6, leaf[1] * 0.6, leaf[2] * 0.6); x.fillRect((px + 2) | 0, (py + 1) | 0, 2, 2); }
        }
      }
      for (let i = 0; i < 120; i++) { x.fillStyle = rgb(24 + R() * 30, 40 + R() * 40, 18 + R() * 14); x.fillRect(R() * w | 0, R() * h * 0.35 | 0, 2 + (R() * 2 | 0), 2); }
      return c;
    },
    leaves() {
      const w = 64, h = 64, c = canvas(w, h), x = c.getContext('2d');
      x.clearRect(0, 0, w, h);
      for (let i = 0; i < 700; i++) {
        const cx = w / 2 + (R() - 0.5) * w * 0.95, cy = h / 2 + (R() - 0.5) * h * 0.95;
        if (Math.hypot(cx - w / 2, cy - h / 2) > w * 0.48 * (0.7 + R() * 0.3)) continue;
        const t = R();
        x.fillStyle = t < 0.5 ? rgb(90 + R() * 70, 18 + R() * 20, 14 + R() * 10) : t < 0.8 ? rgb(50 + R() * 30, 12, 10) : rgb(160 + R() * 60, 60 + R() * 40, 20);
        x.fillRect(cx | 0, cy | 0, 2 + (R() * 2 | 0), 2 + (R() * 2 | 0));
      }
      return c;
    },
    bark() {
      const w = 32, h = 64, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [30, 24, 20], 10);
      for (let i = 0; i < 30; i++) { x.fillStyle = rgb(12, 9, 8, 0.8); x.fillRect(R() * w | 0, R() * h | 0, 1, 6 + R() * 20 | 0); }
      moss(x, w, h, 6);
      return c;
    },
    water() {
      const w = 64, h = 64, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [8, 12, 14], 4);
      for (let i = 0; i < 70; i++) { x.fillStyle = rgb(40, 50, 60, 0.35); x.fillRect(R() * w | 0, R() * h | 0, 3 + R() * 8 | 0, 1); }
      return c;
    },
    grave() {
      const w = 32, h = 32, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [70, 72, 66], 20);
      moss(x, w, h, 10); grime(x, w, h, 5, [10, 12, 8], 0.35);
      x.fillStyle = rgb(30, 30, 28, 0.7); for (let i = 0; i < 4; i++) x.fillRect(8, 8 + i * 4, 16 - (R() * 6 | 0), 1);
      return c;
    },
    cloth() {
      const w = 32, h = 32, c = canvas(w, h), x = c.getContext('2d');
      speckle(x, w, h, [150, 140, 120], 30);
      for (let i = 0; i < w; i += 2) { x.fillStyle = rgb(0, 0, 0, 0.08); x.fillRect(i, 0, 1, h); }
      return c;
    },
    glow() {
      const w = 64, h = 64, c = canvas(w, h), x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,230,180,1)'); g.addColorStop(0.2, 'rgba(255,160,70,0.55)'); g.addColorStop(0.55, 'rgba(200,70,20,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      return c;
    },
    dot() {
      const w = 16, h = 16, c = canvas(w, h), x = c.getContext('2d');
      const g = x.createRadialGradient(8, 8, 0, 8, 8, 8);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      return c;
    },
    blood() {
      const w = 64, h = 64, c = canvas(w, h), x = c.getContext('2d');
      x.clearRect(0, 0, w, h);
      for (let i = 0; i < 18; i++) {
        const r = 4 + R() * 14, cx = 32 + (R() - 0.5) * 30, cy = 32 + (R() - 0.5) * 30;
        x.fillStyle = rgb(70 + R() * 30, 4, 6, 0.8); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
      }
      return c;
    },
  };
  function speckleRect(x, x0, y0, w, h, base, amt) {
    for (let i = 0; i < w * h * 0.15; i++) { x.fillStyle = rgb(...jit(base, amt), 0.6); x.fillRect((x0 + R() * w) | 0, (y0 + R() * h) | 0, 1, 1); }
  }

  function get(name) {
    if (!cache[name]) { R = WU.rng(name.length * 7919 + name.charCodeAt(0) * 31); cache[name] = toTex(P[name](), true, name !== 'glow' && name !== 'dot'); }
    return cache[name];
  }

  // Painted hanging sign with a glyph
  function sign(glyph, bg = [60, 36, 22], fg = [210, 170, 90]) {
    const key = 'sign:' + glyph + bg.join();
    if (cache[key]) return cache[key];
    const c = canvas(32, 32), x = c.getContext('2d');
    R = WU.rng(glyph.charCodeAt(0));
    speckle(x, 32, 32, bg, 12);
    x.strokeStyle = rgb(...fg, 0.8); x.lineWidth = 2; x.strokeRect(2, 2, 28, 28);
    x.fillStyle = rgb(...fg); x.font = '20px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(glyph, 16, 17);
    cache[key] = toTex(c, false);
    return cache[key];
  }

  return { get, sign, canvas };
})();
