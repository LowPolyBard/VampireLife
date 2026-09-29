/* ==========================================================
   CRIMSON CENTURIES — world utilities
   Seeded randomness, value noise and a small geometry builder
   that batches every quad of the town into one buffer per
   material (and per chunk), so the whole city draws cheaply.
   ========================================================== */

const WU = (() => {
  // mulberry32: small, fast, seedable
  function rng(seed) {
    let a = seed >>> 0;
    const f = () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
    f.range = (lo, hi) => lo + f() * (hi - lo);
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    f.chance = p => f() < p;
    return f;
  }

  function hash2(x, y, s = 0) {
    let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const smooth = t => t * t * (3 - 2 * t);
  function noise2(x, y, s = 0) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    const u = smooth(xf), v = smooth(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s = 0, oct = 4) {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += noise2(x * f, y * f, s + i * 17) * amp; f *= 2; amp *= 0.5; }
    return v;
  }

  /* ---------------- geometry builder ----------------
     Accumulates triangles per material key. Each vertex carries
     position, normal, uv and colour. build() returns a Group of meshes. */
  class Builder {
    constructor() { this.bins = {}; }
    bin(key) {
      let b = this.bins[key];
      if (!b) b = this.bins[key] = { p: [], n: [], u: [], c: [] };
      return b;
    }
    // Quad from 4 corners (counter-clockwise when seen from the front)
    quad(key, a, b, c, d, uvs, col = [1, 1, 1]) {
      const B = this.bin(key);
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const U = uvs || [[0, 0], [1, 0], [1, 1], [0, 1]];
      const cA = col.length === 4 ? col : null;
      const put = (p, uv, cc) => { B.p.push(p[0], p[1], p[2]); B.n.push(nx, ny, nz); B.u.push(uv[0], uv[1]); B.c.push(cc[0], cc[1], cc[2]); };
      const cc = i => (cA ? cA[i] : col);
      put(a, U[0], cc(0)); put(b, U[1], cc(1)); put(c, U[2], cc(2));
      put(a, U[0], cc(0)); put(c, U[2], cc(2)); put(d, U[3], cc(3));
    }
    tri(key, a, b, c, uvs, col = [1, 1, 1]) {
      const B = this.bin(key);
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const U = uvs || [[0, 0], [1, 0], [0.5, 1]];
      [a, b, c].forEach((p, i) => { B.p.push(p[0], p[1], p[2]); B.n.push(nx, ny, nz); B.u.push(U[i][0], U[i][1]); B.c.push(col[0], col[1], col[2]); });
    }
    // Planar UVs projected on the plane most facing `n`
    static puv(p, n, ts) {
      const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
      if (ay >= ax && ay >= az) return [p[0] / ts, p[2] / ts];
      if (ax >= az) return [p[2] / ts, p[1] / ts];
      return [p[0] / ts, p[1] / ts];
    }
    // Quad that flips its winding, if needed, so that it faces `want`
    quadF(key, a, b, c, d, want, col = [1, 1, 1], uvs = null, ts = 3) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const U = uvs || [a, b, c, d].map(p => Builder.puv(p, want, ts));
      if (n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0) this.quad(key, a, d, c, b, [U[0], U[3], U[2], U[1]], col);
      else this.quad(key, a, b, c, d, U, col);
    }
    triF(key, a, b, c, want, col = [1, 1, 1], ts = 3) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const U = [a, b, c].map(p => Builder.puv(p, want, ts));
      if (n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0) this.tri(key, a, c, b, [U[0], U[2], U[1]], col);
      else this.tri(key, a, b, c, U, col);
    }
    // Vertical wall quad from (x0,z0) to (x1,z1), y0..y1. Normal points to the left of the direction of travel.
    // UVs are world-scaled by `ts` metres per texture repeat.
    wall(key, x0, z0, x1, z1, y0, y1, col, ts = 4, uOff = 0) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const u0 = uOff / ts, u1 = (uOff + len) / ts, v0 = y0 / ts, v1 = y1 / ts;
      this.quad(key, [x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], col);
    }
    // Horizontal quad (floor facing up, or ceiling facing down)
    floor(key, x0, z0, x1, z1, y, col, ts = 4, down = false) {
      const U = [[x0 / ts, z0 / ts], [x1 / ts, z0 / ts], [x1 / ts, z1 / ts], [x0 / ts, z1 / ts]];
      if (!down) this.quad(key, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [U[3], U[2], U[1], U[0]], col);
      else this.quad(key, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], U, col);
    }
    // Axis-aligned box (min/max), all 6 faces unless skipped
    box(key, x0, y0, z0, x1, y1, z1, col, ts = 1, skip = '') {
      if (!skip.includes('s')) this.wall(key, x0, z1, x1, z1, y0, y1, col, ts);          // +z face
      if (!skip.includes('n')) this.wall(key, x1, z0, x0, z0, y0, y1, col, ts);          // -z face
      if (!skip.includes('e')) this.wall(key, x1, z1, x1, z0, y0, y1, col, ts);          // +x face
      if (!skip.includes('w')) this.wall(key, x0, z0, x0, z1, y0, y1, col, ts);          // -x face
      if (!skip.includes('t')) this.floor(key, x0, z0, x1, z1, y1, col, ts);
      if (!skip.includes('b')) this.floor(key, x0, z0, x1, z1, y0, col, ts, true);
    }
    // Oriented box: centre, half-sizes, yaw
    obox(key, cx, cy, cz, hx, hy, hz, yaw, col, ts = 1) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const P = (x, y, z) => [cx + x * c + z * s, cy + y, cz - x * s + z * c];
      const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz), P(-hx, hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), P(-hx, hy, hz)];
      const uvW = (a, b) => [[0, 0], [a / ts, 0], [a / ts, b / ts], [0, b / ts]];
      this.quad(key, v[3], v[2], v[6], v[7], uvW(hx * 2, hy * 2), col);
      this.quad(key, v[1], v[0], v[4], v[5], uvW(hx * 2, hy * 2), col);
      this.quad(key, v[2], v[1], v[5], v[6], uvW(hz * 2, hy * 2), col);
      this.quad(key, v[0], v[3], v[7], v[4], uvW(hz * 2, hy * 2), col);
      this.quad(key, v[7], v[6], v[5], v[4], uvW(hx * 2, hz * 2), col);
      this.quad(key, v[0], v[1], v[2], v[3], uvW(hx * 2, hz * 2), col);
    }
    // A beam between two points lying on a plane with outward normal (nx,nz); w = width, d = depth off the wall
    beam(key, p0, p1, nx, nz, w, d, col) {
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
      const L = Math.hypot(dx, dy, dz) || 1;
      // in-plane perpendicular = n × dir, with n = (nx, 0, nz)
      let px = -nz * dy, py = nz * dx - nx * dz, pz = nx * dy;
      const pl = Math.hypot(px, py, pz) || 1; px *= w / 2 / pl; py *= w / 2 / pl; pz *= w / 2 / pl;
      const ox = nx * d, oz = nz * d;
      const A = [p0[0] - px + ox, p0[1] - py, p0[2] - pz + oz], Bv = [p1[0] - px + ox, p1[1] - py, p1[2] - pz + oz];
      const C = [p1[0] + px + ox, p1[1] + py, p1[2] + pz + oz], D = [p0[0] + px + ox, p0[1] + py, p0[2] + pz + oz];
      const A0 = [p0[0] - px, p0[1] - py, p0[2] - pz], B0 = [p1[0] - px, p1[1] - py, p1[2] - pz];
      const C0 = [p1[0] + px, p1[1] + py, p1[2] + pz], D0 = [p0[0] + px, p0[1] + py, p0[2] + pz];
      const uv = [[0, 0], [L, 0], [L, 0.25], [0, 0.25]];
      this.quad(key, A, Bv, C, D, uv, col);
      this.quad(key, B0, Bv, A, A0, uv, col);
      this.quad(key, D0, D, C, C0, uv, col);
    }
    // Cylinder-ish prism (n sides) standing on y0
    prism(key, cx, cz, r0, r1, y0, y1, n, col, ts = 1, cap = true, rot = 0) {
      for (let i = 0; i < n; i++) {
        const a0 = rot + (i / n) * Math.PI * 2, a1 = rot + ((i + 1) / n) * Math.PI * 2;
        const p = (a, r, y) => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
        const u0 = i / n * (2 * Math.PI * r0) / ts, u1 = (i + 1) / n * (2 * Math.PI * r0) / ts;
        this.quad(key, p(a1, r0, y0), p(a0, r0, y0), p(a0, r1, y1), p(a1, r1, y1), [[u1, y0 / ts], [u0, y0 / ts], [u0, y1 / ts], [u1, y1 / ts]], col);
        if (cap && r1 > 0.001) this.tri(key, [cx, y1, cz], p(a1, r1, y1), p(a0, r1, y1), [[0.5, 0.5], [0.5 + Math.cos(a1) / 2, 0.5 + Math.sin(a1) / 2], [0.5 + Math.cos(a0) / 2, 0.5 + Math.sin(a0) / 2]], col);
      }
    }
    // Emit meshes; `mats` maps key -> material
    build(mats, group = new THREE.Group()) {
      for (const key of Object.keys(this.bins)) {
        const B = this.bins[key];
        if (!B.p.length || !mats[key]) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, mats[key]);
        m.matrixAutoUpdate = false;
        m.name = key;
        group.add(m);
      }
      return group;
    }
  }

  return { rng, hash2, noise2, fbm, Builder, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, t) => a + (b - a) * t };
})();
