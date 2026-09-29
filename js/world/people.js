/* ==========================================================
   CRIMSON CENTURIES — the living
   Every mortal in the streets is a vessel with a name, a trade,
   a humour and a heartbeat. They walk home, gossip, notice you,
   scream, flee, find bodies — and bleed.
   ========================================================== */

const PEOPLE = (() => {
  const { CS } = TOWN;
  let scene, town, W;             // W: world hooks
  const list = [];
  let nextId = 1;
  const cellKey = (x, z) => TOWN.idx(Math.floor(x / CS), Math.floor(z / CS));

  /* ---------------- figures ---------------- */
  const G = {};
  function geos() {
    if (G.leg) return G;
    const shift = (g, y) => { g.translate(0, y, 0); return g; };
    G.leg = shift(new THREE.BoxGeometry(0.12, 0.84, 0.14), -0.42);
    G.arm = shift(new THREE.BoxGeometry(0.1, 0.62, 0.11), -0.31);
    G.hand = new THREE.BoxGeometry(0.08, 0.1, 0.08);
    G.torso = new THREE.CylinderGeometry(0.17, 0.21, 0.52, 7);
    G.head = new THREE.SphereGeometry(0.12, 8, 6);
    G.robe = new THREE.CylinderGeometry(0.2, 0.36, 1, 8, 1, true);
    G.coat = new THREE.CylinderGeometry(0.21, 0.3, 0.62, 8, 1, true);
    G.hood = new THREE.SphereGeometry(0.155, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62);
    G.hoodBack = new THREE.ConeGeometry(0.13, 0.36, 6);
    G.brim = new THREE.CylinderGeometry(0.26, 0.26, 0.025, 10);
    G.crown = new THREE.CylinderGeometry(0.12, 0.13, 0.26, 8);
    G.cap = new THREE.SphereGeometry(0.13, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
    G.tri = new THREE.CylinderGeometry(0.24, 0.22, 0.09, 3);
    G.helm = new THREE.ConeGeometry(0.19, 0.16, 8);
    G.bobby = new THREE.CylinderGeometry(0.1, 0.13, 0.3, 8);
    G.shoulder = new THREE.CylinderGeometry(0.28, 0.24, 0.1, 8);
    G.pole = new THREE.CylinderGeometry(0.02, 0.02, 2.3, 4);
    G.blade = new THREE.BoxGeometry(0.03, 0.34, 0.16);
    G.lantern = new THREE.BoxGeometry(0.12, 0.18, 0.12);
    G.eye = new THREE.BoxGeometry(0.025, 0.018, 0.01);
    G.pool = new THREE.CircleGeometry(1, 10); G.pool.rotateX(-Math.PI / 2);
    G.stick = new THREE.CylinderGeometry(0.025, 0.03, 0.55, 4);
    return G;
  }
  const matCache = {};
  const mat = hex => matCache[hex] || (matCache[hex] = new THREE.MeshLambertMaterial({ color: hex }));
  const glowMat = hex => matCache['g' + hex] || (matCache['g' + hex] = new THREE.MeshBasicMaterial({ color: hex }));
  const senseMats = {};
  function senseMat(hex) {
    if (senseMats[hex]) return senseMats[hex];
    const m = new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color(hex) }, t: { value: 0 } },
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: 'uniform vec3 c; uniform float t; varying vec3 vN; void main(){ float rim = 1.0-abs(vN.z); gl_FragColor = vec4(c*(0.55+rim*0.9)*(0.85+0.15*sin(t*6.0)), 0.0);} ',
      depthTest: false, depthWrite: false,
    });
    senseMats[hex] = m;
    return m;
  }

  const SKIN = [0xc9a58a, 0xb88b6e, 0xd8b89c, 0x9c6e52, 0xe0c4ae, 0x7a543e];
  const P = {
    low: [0x4a3a2c, 0x3a3228, 0x55463a, 0x3d3b30, 0x5a4030, 0x2f2a26, 0x4c4636],
    mid: [0x2e3c52, 0x4a2c24, 0x3a4a34, 0x5a4a30, 0x3c3044, 0x2a2e36],
    high: [0x6a1420, 0x24204a, 0x4a1a4a, 0x1a3a30, 0x5a3a14, 0x101014],
    holy: [0x141214, 0x2a2622, 0x1a1a1e],
  };
  function appearance(v, era, R) {
    const oid = v.oid, cls = v.cls;
    const a = { skin: R.pick(SKIN), coat: R.pick(P[cls] || P.low), under: R.pick(P.low), g: v.g || 'm', robe: false, hat: null, hatCol: 0x1a1614, scale: 1, hunch: 0, lantern: false, trim: null };
    if (a.g === 'f') a.robe = true;
    const pick = R.pick;
    switch (oid) {
      case 'priest': case 'curate': a.robe = true; a.coat = 0x121012; a.hat = era === 'medieval' ? 'hood' : era === 'tudor' ? 'cap' : 'brim'; a.trim = 0xd8d0c0; break;
      case 'friar': case 'pilgrim': a.robe = true; a.coat = oid === 'friar' ? pick([0x3a2a1c, 0x2c2a28]) : 0x4a3e30; a.hat = 'hood'; a.hatCol = a.coat; break;
      case 'nun': a.robe = true; a.coat = 0x0e0e10; a.hat = 'wimple'; a.g = 'f'; break;
      case 'beggar': case 'opium': a.hunch = 0.25; a.coat = pick([0x3a3228, 0x2e2a24]); a.hat = R() < 0.5 ? 'hood' : null; a.hatCol = 0x2e2820; break;
      case 'urchin': a.scale = 0.72; a.hat = R() < 0.4 ? 'cap' : null; a.hatCol = 0x3a3028; break;
      case 'drunk': a.hunch = 0.12; break;
      case 'watchman': a.coat = era === 'victorian' ? 0x10141e : era === 'georgian' ? 0x2a2a2e : 0x3a3024; a.hat = era === 'victorian' ? 'bobby' : era === 'georgian' ? 'tri' : 'helm'; a.hatCol = era === 'victorian' ? 0x10141e : 0x3a3a3c; a.lantern = true; a.halberd = era !== 'victorian'; a.g = 'm'; a.robe = false; break;
      case 'knight': case 'officer': a.coat = oid === 'officer' ? 0x7a1010 : 0x3a3a40; a.trim = 0xb89a50; a.hat = oid === 'officer' ? 'tri' : null; a.g = 'm'; a.robe = false; break;
      case 'lady': a.g = 'f'; a.robe = true; a.coat = pick(P.high); a.trim = 0xc8b070; a.hat = era === 'victorian' ? 'bonnet' : era === 'georgian' ? 'bonnet' : 'veil'; a.hatCol = pick([0x1a1418, 0xd0c8b8, a.coat]); break;
      case 'harlot': a.g = 'f'; a.robe = true; a.coat = pick([0x7a1a24, 0x5a1a3a, 0x8a3a2a]); a.hat = null; break;
      case 'fishwife': case 'washer': case 'factorygirl': a.g = 'f'; a.robe = true; a.coat = pick(P.low); a.hat = 'coif'; a.hatCol = 0xb8b0a0; break;
      case 'sailor': case 'docker': a.coat = pick([0x1e2a3e, 0x3a3a3a, 0x4a3a2a]); a.hat = R() < 0.6 ? 'cap' : null; a.hatCol = 0x1e2430; break;
      case 'gravedigger': case 'resurrection': a.coat = 0x2a2620; a.hat = 'brim'; a.hunch = 0.12; break;
      case 'medium': a.g = 'f'; a.robe = true; a.coat = 0x2a1030; a.hat = 'veil'; a.hatCol = 0x0e0a10; break;
      case 'actor': a.coat = pick([0x7a1a24, 0x2a5a2a, 0x6a5a14]); a.trim = 0xd0c090; a.hat = 'brim'; break;
      default:
        if (cls === 'high') { a.hat = era === 'victorian' ? 'top' : era === 'georgian' ? 'tri' : era === 'tudor' ? 'cap' : 'hood'; a.trim = R() < 0.6 ? 0xb89a50 : null; }
        else if (cls === 'mid') a.hat = era === 'victorian' ? pick(['top', 'bowler', null]) : era === 'georgian' ? pick(['tri', null]) : pick(['cap', 'hood', null]);
        else a.hat = era === 'victorian' ? pick(['cap', 'bowler', null]) : pick(['hood', 'cap', null]);
        a.hatCol = pick([0x1a1614, 0x2a2420, a.coat]);
        if (a.g === 'f' && (a.hat === 'top' || a.hat === 'tri' || a.hat === 'bowler')) a.hat = era === 'victorian' || era === 'georgian' ? 'bonnet' : 'coif';
    }
    if (a.g === 'f' && a.hat === 'hood' && era === 'medieval' && oid !== 'friar' && oid !== 'pilgrim') a.hat = R() < 0.5 ? 'coif' : 'hood';
    if (!a.lantern && (cls === 'high' || cls === 'mid') && R() < 0.14) a.lantern = true;
    return a;
  }

  function figure(a) {
    geos();
    const root = new THREE.Group();
    const body = new THREE.Group(); root.add(body);
    const skinM = mat(a.skin), coatM = mat(a.coat), underM = mat(a.under), hatM = mat(a.hatCol);
    const meshes = [];
    const add = (geo, m, x, y, z, parent = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); meshes.push(o); return o; };
    const legL = new THREE.Group(), legR = new THREE.Group();
    legL.position.set(-0.08, 0.86, 0); legR.position.set(0.08, 0.86, 0); body.add(legL, legR);
    add(G.leg, mat(0x1c1714), 0, 0, 0, legL); add(G.leg, mat(0x1c1714), 0, 0, 0, legR);
    if (a.robe) { const r = add(G.robe, coatM, 0, 0.5, 0); r.scale.set(1, 0.98, 1); }
    else { const c = add(G.coat, coatM, 0, 0.78, 0); }
    add(G.torso, a.robe ? coatM : coatM, 0, 1.2, 0);
    if (a.trim) add(G.shoulder, mat(a.trim), 0, 1.42, 0);
    const armL = new THREE.Group(), armR = new THREE.Group();
    armL.position.set(-0.24, 1.42, 0); armR.position.set(0.24, 1.42, 0); body.add(armL, armR);
    add(G.arm, coatM, 0, 0, 0, armL); add(G.arm, coatM, 0, 0, 0, armR);
    add(G.hand, skinM, 0, -0.64, 0, armL); add(G.hand, skinM, 0, -0.64, 0, armR);
    const head = new THREE.Group(); head.position.set(0, 1.58, 0); body.add(head);
    add(G.head, skinM, 0, 0, 0, head);
    const eyeM = mat(0x0a0606);
    add(G.eye, eyeM, -0.045, 0.02, 0.112, head); add(G.eye, eyeM, 0.045, 0.02, 0.112, head);
    switch (a.hat) {
      case 'hood': add(G.hood, hatM, 0, -0.01, -0.01, head).scale.set(1, 1.15, 1.1); add(G.hoodBack, hatM, 0, -0.08, -0.12, head).rotation.x = -2.2; break;
      case 'cap': add(G.cap, hatM, 0, 0.03, 0, head).scale.set(1.05, 0.8, 1.05); break;
      case 'coif': add(G.cap, hatM, 0, 0.0, -0.01, head).scale.set(1.1, 1.1, 1.15); break;
      case 'brim': add(G.brim, hatM, 0, 0.09, 0, head); add(G.crown, hatM, 0, 0.16, 0, head).scale.set(1, 0.5, 1); break;
      case 'top': add(G.brim, hatM, 0, 0.1, 0, head).scale.set(0.75, 1, 0.75); add(G.crown, hatM, 0, 0.24, 0, head); break;
      case 'bowler': add(G.brim, hatM, 0, 0.08, 0, head).scale.set(0.7, 1, 0.7); add(G.cap, hatM, 0, 0.07, 0, head).scale.set(1.02, 1.1, 1.02); break;
      case 'tri': add(G.tri, hatM, 0, 0.12, 0, head); break;
      case 'helm': add(G.helm, mat(0x4a4a50), 0, 0.12, 0, head); add(G.brim, mat(0x4a4a50), 0, 0.06, 0, head).scale.set(0.9, 1, 0.9); break;
      case 'bobby': add(G.bobby, hatM, 0, 0.17, 0, head); add(G.brim, hatM, 0, 0.05, 0, head).scale.set(0.62, 1, 0.62); break;
      case 'bonnet': add(G.cap, hatM, 0, 0.03, -0.02, head).scale.set(1.25, 1.2, 1.3); break;
      case 'veil': add(G.hood, hatM, 0, 0.0, -0.01, head).scale.set(1.08, 1.2, 1.1); break;
      case 'wimple': add(G.hood, mat(0xd8d4c8), 0, 0, 0, head).scale.set(1.05, 1.25, 1.1); add(G.hoodBack, mat(0x0a0a0c), 0, -0.12, -0.1, head).rotation.x = -2.6; break;
    }
    let lamp = null;
    if (a.lantern) {
      lamp = add(G.lantern, glowMat(0xffb060), 0, -0.78, 0.06, armL);
      armL.rotation.x = -0.25;
    }
    if (a.halberd) { const pole = add(G.pole, mat(0x3a2a1c), 0, -0.2, 0.08, armR); add(G.blade, mat(0x8a8a90), 0, 0.95, 0.12, pole); }
    if (a.torch) { const s = add(G.stick, mat(0x3a2a1c), 0, -0.7, 0.12, armR); s.rotation.x = 0.6; lamp = s; }
    root.scale.setScalar(a.scale);
    body.rotation.x = a.hunch;
    return { root, body, legL, legR, armL, armR, head, lamp, meshes };
  }

  /* ---------------- life ---------------- */
  let R = WU.rng(1);
  let era = 'medieval';

  function bfs(fromK, toK) {
    const N = TOWN.N;
    if (fromK === toK) return [toK];
    const prev = new Int32Array(N * N).fill(-1); prev[fromK] = fromK;
    const q = [fromK];
    for (let h = 0; h < q.length; h++) {
      const k = q[h]; if (k === toK) break;
      const i = k % N, j = (k / N) | 0;
      for (const [dx, dz] of TOWN.DIRS) {
        const ni = i + dx, nj = j + dz; if (!TOWN.inb(ni, nj)) continue;
        const nk = TOWN.idx(ni, nj);
        if (prev[nk] !== -1 || !TOWN.WALKABLE[town.type[nk]] || town.blocked[nk]) continue;
        prev[nk] = k; q.push(nk);
      }
    }
    if (prev[toK] === -1) return null;
    const path = []; let k = toK;
    while (k !== fromK) { path.push(k); k = prev[k]; }
    return path.reverse();
  }
  const centre = k => [((k % TOWN.N) + 0.5) * CS, (((k / TOWN.N) | 0) + 0.5) * CS];

  // A random walkable destination near (x,z); crowds favour taverns, plazas and sites
  function destination(x, z, wide = 16) {
    const N = TOWN.N, ci = Math.floor(x / CS), cj = Math.floor(z / CS);
    if (R() < 0.35 && town.sites.length) {
      const s = R.pick(town.sites);
      const dx = s.door.x + s.door.nx * 2, dz = s.door.z + s.door.nz * 2;
      if (Math.hypot(dx - x, dz - z) < wide * CS) { const k = cellKey(dx, dz); if (TOWN.WALKABLE[town.type[k]]) return k; }
    }
    for (let t = 0; t < 30; t++) {
      const i = ci + R.int(-wide, wide), j = cj + R.int(-wide, wide);
      if (!TOWN.inb(i, j)) continue;
      const k = TOWN.idx(i, j);
      if (TOWN.WALKABLE[town.type[k]] && !town.blocked[k]) return k;
    }
    return cellKey(x, z);
  }

  function los(x0, z0, x1, z1) {
    // march through the grid; buildings block sight
    const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 1.2);
    for (let s = 1; s < n; s++) {
      const t = s / n, k = cellKey(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
      const ty = town.type[k];
      if (!TOWN.WALKABLE[ty] && ty !== TOWN.T.WATER) return false;
    }
    return true;
  }

  function spawn(opts = {}) {
    const x = opts.x, z = opts.z;
    const did = TOWN.districtAt(town, x, z);
    let v = opts.v;
    if (!v) v = W.vessel(did) || fakeVessel(did);
    const a = appearance(v, era, R);
    if (opts.hunter) { Object.assign(a, { coat: 0x141010, hat: 'brim', hatCol: 0x0e0c0a, lantern: false, torch: true, robe: false, g: 'm', trim: null }); }
    if (opts.encounter) { a.lantern = R() < 0.5; }
    const f = figure(a);
    f.root.position.set(x, 0, z);
    scene.add(f.root);
    const n = {
      id: nextId++, v, a, f, did, x, z, yaw: R() * 6.28, state: opts.state || 'walk', path: null, pi: 0,
      speed: 1.0 + R() * 0.5, phase: R() * 6, aware: 0, noticed: false, think: R() * 0.3, alarmT: 0,
      kind: opts.hunter ? 'hunter' : opts.encounter ? 'encounter' : v.oid === 'watchman' ? 'watch' : 'citizen',
      lane: (R() - 0.5) * 1.6, idleT: 0, ev: opts.ev || null, persistent: !!(opts.hunter || opts.encounter), fed: false,
    };
    if (v.oid === 'drunk' || v.oid === 'opium') n.speed *= 0.7;
    if (n.kind === 'encounter') { n.state = 'idle'; n.yaw = opts.yaw || 0; }
    if (n.kind === 'hunter') n.speed = 1.4;
    list.push(n);
    return n;
  }
  function fakeVessel(did) {
    const d = DATA.DISTRICTS.find(x => x.id === did) || DATA.DISTRICTS[0];
    const occs = d.occ.filter(o => !DATA.OCC[o].eras || DATA.OCC[o].eras.includes(era));
    const oid = R.pick(occs), o = DATA.OCC[oid];
    return { name: 'a stranger', oid, occ: o.n, cls: o.cls, humour: R.pick(Object.keys(DATA.HUMOURS)), g: R() < 0.5 ? 'f' : 'm', vit: 15, wary: 3, trait: '' };
  }

  function remove(n) {
    scene.remove(n.f.root);
    if (n.pool) scene.remove(n.pool);
    const i = list.indexOf(n); if (i >= 0) list.splice(i, 1);
  }

  function setPathTo(n, k) {
    const p = bfs(cellKey(n.x, n.z), k);
    n.path = p; n.pi = 0;
    if (!p || !p.length) { n.path = null; n.idleT = 1 + R() * 3; n.state = n.state === 'walk' ? 'idle' : n.state; }
  }

  function steer(n, tx, tz, speed, dt) {
    const dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return d;
    const want = Math.atan2(dx, dz);
    let da = want - n.yaw; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
    n.yaw += da * Math.min(1, dt * 7);
    const step = Math.min(d, speed * dt);
    const nx = n.x + dx / d * step, nz = n.z + dz / d * step;
    if (TOWN.walkableAt(town, nx, nz)) { n.x = nx; n.z = nz; }
    else if (TOWN.walkableAt(town, nx, n.z)) n.x = nx;
    else if (TOWN.walkableAt(town, n.x, nz)) n.z = nz;
    return d;
  }

  function followPath(n, speed, dt) {
    if (!n.path) return false;
    const k = n.path[n.pi];
    if (k === undefined) { n.path = null; return false; }
    const [cx, cz] = centre(k);
    // offset from the centre line so crowds do not walk single-file
    const nk = n.path[n.pi + 1];
    let ox = 0, oz = 0;
    if (nk !== undefined) { const [nx2, nz2] = centre(nk); const dx = nx2 - cx, dz = nz2 - cz, L = Math.hypot(dx, dz) || 1; ox = -dz / L * n.lane; oz = dx / L * n.lane; }
    const d = steer(n, cx + ox, cz + oz, speed, dt);
    if (d < 0.6) n.pi++;
    return true;
  }

  function scream(n, loud = 1) {
    if (n.alarmT > 0) return;
    n.alarmT = 6;
    W.onScream && W.onScream(n, loud);
    for (const o of list) {
      if (o === n || o.state === 'dead' || o.kind === 'hunter' || o.kind === 'encounter') continue;
      const d = Math.hypot(o.x - n.x, o.z - n.z);
      if (d < 20 * loud && (d < 8 || los(o.x, o.z, n.x, n.z))) {
        if (o.kind === 'watch') { o.state = 'chase'; o.aware = 1; }
        else if (o.state !== 'dazed') { o.state = 'flee'; o.fleeT = 8 + R() * 6; }
      }
    }
  }

  /* ---------------- per-frame ---------------- */
  function update(dt, pl, t) {
    for (const n of [...list]) {
      const f = n.f;
      const dx = pl.x - n.x, dz = pl.z - n.z, dP = Math.hypot(dx, dz);
      n.dP = dP;
      if (n.alarmT > 0) n.alarmT -= dt;
      let speed = 0;
      // think: perception
      n.think -= dt;
      if (n.think <= 0 && n.state !== 'dead') {
        n.think = 0.15;
        perceive(n, pl, dP);
      }
      switch (n.state) {
        case 'walk':
          if (!n.path) setPathTo(n, destination(n.x, n.z, n.kind === 'watch' ? 10 : 14));
          if (n.path) { speed = n.speed; if (!followPath(n, speed, dt)) { n.state = 'idle'; n.idleT = 2 + R() * 6; } }
          break;
        case 'idle':
          n.idleT -= dt;
          if (n.kind !== 'encounter' && n.idleT <= 0) { n.state = 'walk'; n.path = null; }
          break;
        case 'noticed':
          // stop and stare, then walk off briskly
          n.idleT -= dt;
          { const want = Math.atan2(dx, dz); let da = want - n.yaw; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; n.yaw += da * Math.min(1, dt * 4); }
          if (n.idleT <= 0) { n.state = 'walk'; n.path = null; n.speed = Math.min(2.2, n.speed * 1.3); }
          break;
        case 'flee': {
          n.fleeT -= dt;
          if (!n.path || n.pi >= n.path.length) {
            // run away from the player
            let best = null;
            for (let t2 = 0; t2 < 8; t2++) { const k = destination(n.x, n.z, 10); const [cx, cz] = centre(k); const sc = Math.hypot(cx - pl.x, cz - pl.z); if (!best || sc > best[1]) best = [k, sc]; }
            setPathTo(n, best[0]); n.state = 'flee';
          }
          speed = 4.2; followPath(n, speed, dt);
          if (n.fleeT <= 0 || dP > 45) { n.state = 'walk'; n.path = null; n.speed = 1.6; }
          break;
        }
        case 'dazed':
          n.dazeT -= dt;
          if (!n.path) setPathTo(n, destination(n.x, n.z, 8));
          speed = 0.55; followPath(n, speed, dt);
          f.body.rotation.z = Math.sin(t * 1.7 + n.phase) * 0.12;
          if (n.dazeT <= 0 && dP > 25) { remove(n); continue; }
          break;
        case 'leave':
          if (!n.path) setPathTo(n, destination(n.x, n.z, 16));
          speed = 1.6; followPath(n, speed, dt);
          if (dP > 30 && !los(pl.x, pl.z, n.x, n.z)) { remove(n); continue; }
          break;
        case 'chase': {
          // the watch or the hunter closes in on your last known position
          const tx = n.seenX !== undefined ? n.seenX : pl.x, tz = n.seenZ !== undefined ? n.seenZ : pl.z;
          if (!n.path || n.pathT <= 0) { n.pathT = 0.6; setPathTo(n, cellKey(tx, tz)); n.state = 'chase'; }
          n.pathT -= dt;
          speed = n.kind === 'hunter' ? 3.6 : 3.3;
          if (dP < 6 && n.canSee) { steer(n, pl.x, pl.z, speed, dt); }
          else followPath(n, speed, dt);
          if (dP < 1.9 && n.canSee) { n.state = 'idle'; n.idleT = 3; W.onCaught && W.onCaught(n); }
          if (n.lostT > 12) { n.state = 'walk'; n.path = null; n.aware = 0; }
          break;
        }
        case 'dead':
          break;
      }
      // pose
      if (n.state !== 'dead') {
        f.root.position.set(n.x, 0, n.z);
        f.root.rotation.y = n.yaw;
        if (speed > 0) {
          n.phase += dt * speed * 4.2;
          const s = Math.sin(n.phase), amp = Math.min(0.75, 0.35 + speed * 0.12);
          f.legL.rotation.x = s * amp; f.legR.rotation.x = -s * amp;
          f.armR.rotation.x = s * amp * 0.8; if (!n.a.lantern) f.armL.rotation.x = -s * amp * 0.8;
          f.body.position.y = Math.abs(Math.cos(n.phase)) * 0.04;
        } else {
          f.legL.rotation.x *= 0.85; f.legR.rotation.x *= 0.85; f.armR.rotation.x *= 0.9; if (!n.a.lantern) f.armL.rotation.x *= 0.9;
          f.body.position.y = Math.sin(t * 1.3 + n.phase) * 0.008;
          if (n.kind === 'encounter' && n.ev && n.ev.pose === 'kneel') { f.body.position.y = -0.35; f.legL.rotation.x = -1.4; f.legR.rotation.x = -1.4; }
        }
        // head turns to look at a nearby vampire who has been noticed
        const look = n.noticed && dP < 12 ? Math.atan2(dx, dz) - n.yaw : 0;
        let la = look; while (la > Math.PI) la -= 6.283; while (la < -Math.PI) la += 6.283;
        f.head.rotation.y += (WU.clamp(la, -1.1, 1.1) - f.head.rotation.y) * Math.min(1, dt * 5);
      }
      // lanterns light the street
      if (f.lamp && n.state !== 'dead') {
        const p = new THREE.Vector3(); f.lamp.getWorldPosition(p);
        W.dyn(p.x, p.y + (n.kind === 'hunter' ? 0.35 : 0), p.z, n.kind === 'hunter' ? [1, 0.55, 0.2] : [1, 0.7, 0.35], n.kind === 'hunter' ? 1.4 : 0.8, n);
      }
    }
  }

  function perceive(n, pl, dP) {
    if (n.kind === 'encounter' || n.state === 'dazed' || n.state === 'leave') return;
    const range = n.kind === 'hunter' ? 30 : n.kind === 'watch' ? 22 : 18;
    n.canSee = false;
    if (pl.inside) { n.aware = Math.max(0, n.aware - 0.1); return; }
    if (dP < range) {
      const ang = Math.atan2(pl.x - n.x, pl.z - n.z);
      let da = ang - n.yaw; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
      const inCone = Math.abs(da) < (n.kind === 'hunter' ? 1.2 : 1.0) || dP < 2.2;
      if (inCone && los(n.x, n.z, pl.x, pl.z)) {
        n.canSee = true; n.lostT = 0; n.seenX = pl.x; n.seenZ = pl.z;
        const rate = pl.vis * (1 - dP / range) * (n.kind === 'hunter' ? 5 : n.kind === 'watch' ? 3 : 2.2) * (1 + (n.v.wary || 3) * 0.08);
        n.aware = Math.min(2, n.aware + rate * 0.15);
      } else n.aware = Math.max(0, n.aware - 0.04);
    } else n.aware = Math.max(0, n.aware - 0.05);
    if (!n.canSee) n.lostT = (n.lostT || 0) + 0.15;
    // bodies in the street
    if (n.kind !== 'hunter') for (const c of list) {
      if (c.state !== 'dead' || c.found || c === n) continue;
      const d = Math.hypot(c.x - n.x, c.z - n.z);
      if (d < 11 && los(n.x, n.z, c.x, c.z)) { c.found = true; scream(n, 1.2); W.onBodyFound && W.onBodyFound(c, n); if (n.kind !== 'watch') { n.state = 'flee'; n.fleeT = 10; } break; }
    }
    // wanted: the watch give chase on sight
    if (n.kind === 'watch' && W.wanted() && n.canSee && n.state !== 'chase') { n.state = 'chase'; n.path = null; n.pathT = 0; W.onChase && W.onChase(n); }
    if (n.kind === 'hunter') {
      if (n.aware >= 1 && n.state !== 'chase' && n.state !== 'idle') { n.state = 'chase'; n.path = null; n.pathT = 0; W.onHunterSees && W.onHunterSees(n); }
      return;
    }
    const was = n.noticed;
    n.noticed = n.aware >= 1;
    if (n.noticed && !was && (n.state === 'walk' || n.state === 'idle') && dP < 10) { n.state = 'noticed'; n.idleT = 1.2 + R() * 1.5; }
    // someone who has noticed you and whom you crowd may cry out
    if (n.noticed && dP < 1.6 && pl.speed > 3.5 && R() < 0.2 && n.kind === 'citizen') { n.state = 'flee'; n.fleeT = 6; scream(n, 0.6); }
  }

  /* ---------------- population ---------------- */
  const DENS = { cheapside: 14, southwark: 15, stpauls: 9, westminster: 11, docks: 10, whitechapel: 13, graveyard: 3 };
  let spawnT = 0;
  function populate(dt, pl, density) {
    spawnT -= dt; if (spawnT > 0) return; spawnT = 0.25;
    // despawn distant strangers
    for (const n of [...list]) {
      if (n.persistent) continue;
      if (n.state === 'dead') { if (n.dP > 90) remove(n); continue; }
      if (n.dP > 78) remove(n);
    }
    if (pl.inside) return;
    const did = TOWN.districtAt(town, pl.x, pl.z);
    const want = Math.round((DENS[did] || 10) * density);
    const near = list.filter(n => n.dP < 70 && n.state !== 'dead' && n.kind !== 'hunter').length;
    if (near >= want) return;
    for (let t = 0; t < 12; t++) {
      const a = R() * 6.283, r = 18 + R() * 42;
      const x = pl.x + Math.sin(a) * r, z = pl.z + Math.cos(a) * r;
      if (!TOWN.walkableAt(town, x, z)) continue;
      const k = cellKey(x, z); if (town.blocked[k] || town.type[k] === TOWN.T.OPEN && R() < 0.6) continue;
      // appear out of sight where possible
      const facing = Math.sin(a) * Math.sin(pl.yaw) + Math.cos(a) * Math.cos(pl.yaw);
      if (r < 30 && facing > 0.3 && los(pl.x, pl.z, x, z)) continue;
      const [cx, cz] = centre(k);
      spawn({ x: cx + (R() - 0.5) * 1.5, z: cz + (R() - 0.5) * 1.5 });
      return;
    }
  }

  /* ---------------- blood sense ---------------- */
  let sensing = false;
  function setSense(on, t) {
    for (const n of list) {
      const wantSense = on && n.state !== 'dead';
      if (!!n.sensed === wantSense) { if (wantSense) n.senseM.uniforms.t.value = t; continue; }
      n.sensed = wantSense;
      if (wantSense) {
        const hex = n.kind === 'hunter' ? 0xfff0c0 : n.kind === 'encounter' ? 0xb0a0ff : DATA.HUMOURS[n.v.humour] ? new THREE.Color(DATA.HUMOURS[n.v.humour].color).getHex() : 0xff3030;
        n.senseM = senseMat(hex);
        for (const m of n.f.meshes) { m.userData.m = m.material; m.material = n.senseM; m.renderOrder = 10; }
      } else for (const m of n.f.meshes) { if (m.userData.m) m.material = m.userData.m; m.renderOrder = 0; }
    }
    sensing = on;
  }

  /* ---------------- interaction helpers ---------------- */
  function witnesses(target, pl) {
    const out = [];
    for (const n of list) {
      if (n === target || n.state === 'dead' || n.state === 'dazed' || n.kind === 'encounter') continue;
      const d = Math.hypot(n.x - pl.x, n.z - pl.z);
      if (d > 22) continue;
      const ang = Math.atan2(pl.x - n.x, pl.z - n.z);
      let da = ang - n.yaw; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
      if ((Math.abs(da) < 1.3 || d < 5) && los(n.x, n.z, pl.x, pl.z) && pl.vis * (1 - d / 24) > 0.12) out.push(n);
    }
    return out;
  }
  function kill(n) {
    n.state = 'dead';
    const f = n.f;
    f.root.rotation.set(0, n.yaw, 0);
    f.body.rotation.set(-Math.PI / 2 + 0.05, 0, (R() - 0.5) * 0.4);
    f.body.position.set(0, 0.16, -0.7);
    f.legL.rotation.x = 0.2; f.legR.rotation.x = -0.1; f.armL.rotation.x = -2.6; f.armR.rotation.x = -0.4;
    const pool = new THREE.Mesh(G.pool, new THREE.MeshPhongMaterial({ color: 0x2a0204, shininess: 90, specular: 0x552222, transparent: true, opacity: 0.85, depthWrite: false }));
    pool.position.set(n.x + Math.sin(n.yaw) * -1.4, 0.03, n.z + Math.cos(n.yaw) * -1.4); pool.scale.setScalar(0.1);
    n.pool = pool; scene.add(pool);
    n.poolGrow = 0;
  }
  function tickPools(dt) { for (const n of list) if (n.pool && n.poolGrow < 1) { n.poolGrow = Math.min(1, n.poolGrow + dt * 0.08); n.pool.scale.setScalar(0.1 + n.poolGrow * 0.9); } }

  function clear() { for (const n of [...list]) remove(n); }
  function init(sc, tw, hooks, eraId, seed) { scene = sc; town = tw; W = hooks; era = eraId; R = WU.rng(seed || 7); geos(); }
  function setEra(e) { era = e; }

  return { init, setEra, clear, update, populate, spawn, remove, list, witnesses, kill, scream, setSense, los, tickPools, figure, appearance, fakeVessel, bfs, centre, cellKey };
})();
