/* ==========================================================
   CRIMSON CENTURIES — the procedural city
   generate(seed): a street plan for one chronicle — river,
     districts, winding roads, alleys, plazas, landmarks, lots.
   build(town, era): raises that plan in the architecture of an
     age — timber and thatch, brick and slate, soot and gaslight.
   ========================================================== */

const TOWN = (() => {
  const N = 64, CS = 4;
  const T = { BUILT: 0, STREET: 1, PLAZA: 2, WATER: 3, OPEN: 4, QUAY: 5, BRIDGE: 6, WALL: 7, LAND: 8, YARD: 9 };
  const WALKABLE = [false, true, true, false, true, true, true, false, false, true];
  const DIDS = ['cheapside', 'southwark', 'stpauls', 'westminster', 'docks', 'whitechapel', 'graveyard'];
  const DI = Object.fromEntries(DIDS.map((d, i) => [d, i]));
  const idx = (i, j) => j * N + i;
  const inb = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N E S W (side index)

  /* ---------------- places that matter ---------------- */
  // Sites host the non-hunting deeds of each district.
  const SITES = [
    { id: 'goldsmiths', d: 'cheapside', acts: ['swindle'], glyph: '⚖', names: { medieval: 'Goldsmiths\' Row', tudor: 'Goldsmiths\' Row', georgian: 'A Banker\'s Counting-house', victorian: 'Hatton & Sons, Jewellers' } },
    { id: 'guildhall', d: 'cheapside', acts: ['guildhall'], glyph: '⚜', names: { medieval: 'The Guildhall', tudor: 'The Mercers\' Hall', georgian: 'The Guildhall', victorian: 'The Guildhall' } },
    { id: 'tavern_c', d: 'cheapside', acts: ['rumours'], glyph: '♪', names: { medieval: 'The Swan on the Hoop', tudor: 'The Mermaid Tavern', georgian: 'Jonathan\'s Coffee-House', victorian: 'The Blackfriar' } },
    { id: 'tavern_s', d: 'southwark', acts: ['gamble', 'carouse'], glyph: '♣', names: { medieval: 'The Tabard Inn', tudor: 'The Anchor', georgian: 'The George Inn', victorian: 'The Ship & Shovel' } },
    { id: 'stews', d: 'southwark', acts: ['cultivate'], glyph: '❦', names: { medieval: 'The Cardinal\'s Hat', tudor: 'Holland\'s Leaguer', georgian: 'Mother Needham\'s', victorian: 'The Alhambra Rooms' } },
    { id: 'cathedral', d: 'stpauls', acts: ['confess', 'archives', 'tithe'], glyph: '✝', landmark: true, names: { medieval: 'St Paul\'s', tudor: 'St Paul\'s', georgian: 'St Paul\'s Cathedral', victorian: 'St Paul\'s Cathedral' } },
    { id: 'revels', d: 'westminster', acts: ['ball'], glyph: '♛', landmark: true, names: { medieval: 'Westminster Hall', tudor: 'The Banqueting House', georgian: 'Almack\'s Assembly Rooms', victorian: 'Lady Ashcombe\'s Ballroom' } },
    { id: 'noble', d: 'westminster', acts: ['blackmail'], glyph: '✉', names: { medieval: 'The Earl\'s Inn', tudor: 'A Courtier\'s House', georgian: 'Lord Fenwick\'s Townhouse', victorian: 'The Carlton Club' } },
    { id: 'warehouse', d: 'docks', acts: ['smuggle'], glyph: '⚓', names: { medieval: 'The Steelyard', tudor: 'The Custom House Stairs', georgian: 'The Bonded Warehouse', victorian: 'The Bonded Warehouse' } },
    { id: 'watchhouse', d: 'docks', acts: ['bribewatch'], glyph: '⚿', names: { medieval: 'The Watch-house', tudor: 'The Watch-house', georgian: 'The River Police Office', victorian: 'Thames Police Station' } },
    { id: 'almshouse', d: 'whitechapel', acts: ['charity'], glyph: '☗', names: { medieval: 'The Hospital of St Mary Spital', tudor: 'The Almshouse', georgian: 'The Charity School', victorian: 'The Salvation Mission' } },
    { id: 'tavern_w', d: 'whitechapel', acts: ['track'], glyph: '⌖', names: { medieval: 'The Bell-Founders\' Alehouse', tudor: 'The Blind Beggar', georgian: 'The Blind Beggar', victorian: 'The Ten Bells' } },
    { id: 'charnel', d: 'graveyard', acts: ['commune', 'rats'], glyph: '☠', landmark: true, names: { medieval: 'The Charnel Chapel', tudor: 'The Charnel House', georgian: 'The Dissenters\' Chapel', victorian: 'The Catacomb Chapel' } },
    { id: 'graves', d: 'graveyard', acts: ['dig'], glyph: '⚒', open: true, names: { medieval: 'The Plague Trenches', tudor: 'Fresh Graves', georgian: 'Fresh Graves', victorian: 'The Paupers\' Plot' } },
  ];

  /* ==================================================================
     Layout
     ================================================================== */
  function generate(seed) {
    const R = WU.rng(seed);
    const S = seed % 1000;
    const type = new Uint8Array(N * N);
    const dist = new Uint8Array(N * N);
    const lotOf = new Int32Array(N * N).fill(-1);
    const land = {};           // idx -> landmark id
    const ph1 = R() * 6, ph2 = R() * 6;
    const rc = i => 44 + 2.2 * Math.sin(i * 0.08 + ph1) + 1.1 * Math.sin(i * 0.21 + ph2);

    const jit = (a, b) => [a + R.int(-2, 2), b + R.int(-1, 1)];
    const C = {
      cheapside: jit(33, 22), stpauls: jit(19, 21), westminster: jit(9, 31), docks: jit(50, 35),
      whitechapel: jit(51, 13), graveyard: jit(31, 8), southwark: jit(32, 55),
    };
    C.docks[1] = Math.min(C.docks[1], Math.floor(rc(C.docks[0])) - 6);
    C.westminster[1] = Math.min(C.westminster[1], Math.floor(rc(C.westminster[0])) - 8);

    // Districts & river
    const weight = { cheapside: 1, stpauls: 1, westminster: 1.1, docks: 0.95, whitechapel: 1, graveyard: 0.85 };
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = idx(i, j), r = rc(i);
      if (Math.abs(j - r) <= 2.6) type[k] = T.WATER;
      if (j > r) { dist[k] = DI.southwark; continue; }
      let best = 1e9, bd = 0;
      for (const d of Object.keys(weight)) {
        const [cx, cz] = C[d];
        const n = WU.fbm(i * 0.11 + DI[d] * 3, j * 0.11, S, 3);
        const v = Math.hypot(i - cx, j - cz) * (1 + 0.45 * (n - 0.5)) / weight[d];
        if (v < best) { best = v; bd = DI[d]; }
      }
      dist[k] = bd;
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if (i <= 1 || j <= 1 || i >= N - 2 || j >= N - 2) type[idx(i, j)] = T.WALL;
    }

    const set = (i, j, t) => { if (inb(i, j) && type[idx(i, j)] !== T.WALL && type[idx(i, j)] !== T.WATER && type[idx(i, j)] !== T.LAND) type[idx(i, j)] = t; };
    const rect = (i0, j0, i1, j1, t) => { for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) set(i, j, t); };
    const blob = (cx, cz, r, t, s2) => {
      for (let j = cz - r - 2; j <= cz + r + 2; j++) for (let i = cx - r - 2; i <= cx + r + 2; i++) {
        const n = WU.noise2(i * 0.5, j * 0.5, S + s2);
        if (Math.hypot(i - cx, j - cz) < r * (0.75 + 0.5 * n)) set(i, j, t);
      }
    };
    const markLand = (i0, j0, i1, j1, id) => {
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (inb(i, j)) { type[idx(i, j)] = T.LAND; land[idx(i, j)] = id; }
    };

    // Plazas and landmarks
    const L = {};
    { const [cx, cz] = C.stpauls; rect(cx - 6, cz - 3, cx + 6, cz + 3, T.PLAZA); blob(cx, cz, 6, T.PLAZA, 1); markLand(cx - 4, cz - 1, cx + 3, cz + 1, 'cathedral'); L.cathedral = { i0: cx - 4, j0: cz - 1, i1: cx + 3, j1: cz + 1 }; }
    { const [cx, cz] = C.westminster; rect(cx - 4, cz - 1, cx + 4, cz + 3, T.PLAZA); blob(cx, cz + 1, 4, T.PLAZA, 2); markLand(cx - 3, cz - 4, cx + 3, cz - 2, 'palace'); L.palace = { i0: cx - 3, j0: cz - 4, i1: cx + 3, j1: cz - 2 }; }
    { const [cx, cz] = C.cheapside; blob(cx, cz, 4.5, T.PLAZA, 3); rect(cx - 2, cz - 1, cx + 2, cz + 1, T.PLAZA); }
    { const [cx, cz] = C.southwark; blob(cx, cz, 4, T.PLAZA, 4); rect(cx + 2, cz - 3, cx + 7, cz + 2, T.PLAZA); markLand(cx + 3, cz - 2, cx + 5, cz, 'playhouse'); L.playhouse = { i0: cx + 3, j0: cz - 2, i1: cx + 5, j1: cz }; }
    { const [cx, cz] = C.docks; blob(cx, cz, 2.8, T.PLAZA, 5); }
    { const [cx, cz] = C.whitechapel; blob(cx, cz, 2.6, T.PLAZA, 6); }
    { const [cx, cz] = C.graveyard; blob(cx, cz, 7.5, T.OPEN, 7); rect(cx - 5, cz - 2, cx + 5, cz + 3, T.OPEN);
      markLand(cx - 1, cz - 1, cx, cz, 'chapel'); L.chapel = { i0: cx - 1, j0: cz - 1, i1: cx, j1: cz };
      markLand(cx + 3, cz + 2, cx + 3, cz + 2, 'crypt'); L.crypt = { i0: cx + 3, j0: cz + 2, i1: cx + 3, j1: cz + 2 }; }

    // A* roads
    function astar(a, b, allowWater = false) {
      const start = idx(a[0], a[1]), goal = idx(b[0], b[1]);
      const g = new Float32Array(N * N).fill(1e9), from = new Int32Array(N * N).fill(-1), closed = new Uint8Array(N * N);
      const heap = [];
      const push = (k, f) => { heap.push([f, k]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
      g[start] = 0; push(start, 0);
      while (heap.length) {
        const [, k] = pop(); if (closed[k]) continue; closed[k] = 1;
        if (k === goal) break;
        const i = k % N, j = (k / N) | 0;
        for (const [dx, dz] of DIRS) {
          const ni = i + dx, nj = j + dz; if (!inb(ni, nj)) continue;
          const nk = idx(ni, nj), t = type[nk];
          if (t === T.WALL || t === T.LAND || (t === T.WATER && !allowWater)) continue;
          const c = (t === T.WATER ? 30 : 1) + 2.6 * WU.noise2(ni * 0.35, nj * 0.35, S + 9) + (WALKABLE[t] ? -0.55 : 0);
          const ng = g[k] + Math.max(0.25, c);
          if (ng < g[nk]) { g[nk] = ng; from[nk] = k; push(nk, ng + Math.hypot(ni - b[0], nj - b[1]) * 0.8); }
        }
      }
      const path = []; let k = goal; if (from[k] === -1 && k !== start) return path;
      while (k !== -1) { path.push(k); k = from[k]; }
      return path.reverse();
    }
    function carve(path, wide) {
      for (let n = 0; n < path.length; n++) {
        const k = path[n], i = k % N, j = (k / N) | 0;
        if (type[k] === T.OPEN) continue;
        set(i, j, type[k] === T.PLAZA ? T.PLAZA : T.STREET);
        if (wide) {
          const nk = path[Math.min(path.length - 1, n + 1)], pk = path[Math.max(0, n - 1)];
          const dx = (nk % N) - (pk % N), dz = ((nk / N) | 0) - ((pk / N) | 0);
          const px = dz !== 0 ? 1 : 0, pz = dx !== 0 ? 1 : 0;
          if (type[idx(i + px, j + pz)] !== T.OPEN && type[idx(i + px, j + pz)] !== T.PLAZA) set(i + px, j + pz, T.STREET);
        }
      }
    }
    const north = ['cheapside', 'stpauls', 'westminster', 'docks', 'whitechapel', 'graveyard'];
    // Prim's MST over the northern districts, plus a couple of extra links for loops
    const inTree = ['cheapside'], edges = [];
    while (inTree.length < north.length) {
      let best = null;
      for (const a of inTree) for (const b of north) if (!inTree.includes(b)) {
        const d = Math.hypot(C[a][0] - C[b][0], C[a][1] - C[b][1]);
        if (!best || d < best[2]) best = [a, b, d];
      }
      inTree.push(best[1]); edges.push(best);
    }
    edges.push(['cheapside', 'docks'], ['stpauls', 'graveyard'], ['whitechapel', 'docks']);
    for (const [a, b] of edges) carve(astar(C[a], C[b]), a === 'cheapside' || b === 'cheapside' || a === 'westminster');

    // Bridges
    const bridges = [];
    const makeBridge = bx => {
      let top = -1, bot = -1;
      for (let j = 20; j < N - 2; j++) { const w = type[idx(bx, j)] === T.WATER || type[idx(bx + 1, j)] === T.WATER; if (w && top < 0) top = j; if (w) bot = j; }
      if (top < 0) return;
      for (let j = top; j <= bot; j++) for (const i of [bx, bx + 1]) type[idx(i, j)] = T.BRIDGE;
      bridges.push({ i0: bx, i1: bx + 1, j0: top, j1: bot });
      return { n: [bx, top - 1], s: [bx, bot + 1] };
    };
    const b1 = makeBridge(C.cheapside[0] + R.int(-2, 1));
    const b2 = makeBridge(Math.max(6, C.westminster[0] + R.int(4, 8)));
    for (const [b, from] of [[b1, 'cheapside'], [b2, 'westminster']]) if (b) {
      set(b.n[0], b.n[1], T.STREET); set(b.n[0] + 1, b.n[1], T.STREET); set(b.s[0], b.s[1], T.STREET); set(b.s[0] + 1, b.s[1], T.STREET);
      carve(astar(C[from], b.n), true); carve(astar(b.s, C.southwark), true);
    }

    // Lanes: keep cutting winding alleys through any block that is too deep,
    // until every house is within a stone's throw of a street.
    const depthLimit = { cheapside: 2, southwark: 2, stpauls: 2, westminster: 3, docks: 2, whitechapel: 2, graveyard: 3 };
    const depth = new Int16Array(N * N);
    const computeDepth = () => {
      depth.fill(-1); const q = [];
      for (let k = 0; k < N * N; k++) if (WALKABLE[type[k]]) { depth[k] = 0; q.push(k); }
      for (let h = 0; h < q.length; h++) {
        const k = q[h], i = k % N, j = (k / N) | 0;
        for (const [dx, dz] of DIRS) { const ni = i + dx, nj = j + dz; if (!inb(ni, nj)) continue; const nk = idx(ni, nj); if (depth[nk] < 0 && type[nk] === T.BUILT) { depth[nk] = depth[k] + 1; q.push(nk); } }
      }
    };
    const laneFrom = (i, j) => {
      set(i, j, T.STREET);
      const d0 = R.int(0, 3);
      for (const start of [d0, (d0 + 2) % 4]) {
        let ci = i, cj = j, dir = start;
        for (let s = 0; s < 24; s++) {
          if (s > 0 && R() < 0.22) dir = (dir + (R() < 0.5 ? 1 : 3)) % 4;
          const ni = ci + DIRS[dir][0], nj = cj + DIRS[dir][1];
          if (!inb(ni, nj)) break;
          const t = type[idx(ni, nj)];
          if (WALKABLE[t]) break;
          if (t !== T.BUILT) break;
          if (wouldOpenBlock(ni, nj)) { dir = (dir + (R() < 0.5 ? 1 : 3)) % 4; continue; }
          ci = ni; cj = nj; set(ci, cj, T.STREET);
        }
      }
    };
    for (let it = 0; it < 600; it++) {
      computeDepth();
      const deep = [];
      for (let k = 0; k < N * N; k++) if (type[k] === T.BUILT && depth[k] > depthLimit[DIDS[dist[k]]]) deep.push(k);
      if (!deep.length) break;
      const k = R.pick(deep);
      laneFrom(k % N, (k / N) | 0);
    }
    function wouldOpenBlock(i, j) {
      const w = (a, b) => inb(a, b) && WALKABLE[type[idx(a, b)]] && type[idx(a, b)] !== T.PLAZA;
      for (const [ox, oz] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
        let c = 0;
        for (const [ax, az] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const a = i + ox + ax, b = j + oz + az; if ((a === i && b === j) || w(a, b)) c++; }
        if (c === 4) return true;
      }
      return false;
    }

    // Quays along the river banks
    for (let i = 2; i < N - 2; i++) {
      let top = -1, bot = -1;
      for (let j = 20; j < N - 2; j++) if (type[idx(i, j)] === T.WATER || type[idx(i, j)] === T.BRIDGE) { if (top < 0) top = j; bot = j; }
      if (top < 0) continue;
      const nq = WU.fbm(i * 0.18, 0, S + 11, 2);
      const kN = idx(i, top - 1);
      if (type[kN] === T.BUILT && (DIDS[dist[kN]] === 'docks' || nq > 0.42)) type[kN] = T.QUAY;
      if (DIDS[dist[kN]] === 'docks' && type[idx(i, top - 2)] === T.BUILT && nq > 0.35) type[idx(i, top - 2)] = T.QUAY;
      const kS = idx(i, bot + 1);
      if (type[kS] === T.BUILT && nq > 0.5) type[kS] = T.QUAY;
    }
    // Border water becomes the city wall's water-gates
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if ((i <= 1 || i >= N - 2) && type[idx(i, j)] === T.WATER) type[idx(i, j)] = T.WALL;

    // Keep only what can be reached on foot
    const reach = new Uint8Array(N * N);
    { const q = [idx(C.cheapside[0], C.cheapside[1])]; reach[q[0]] = 1;
      while (q.length) { const k = q.pop(), i = k % N, j = (k / N) | 0;
        for (const [dx, dz] of DIRS) { const ni = i + dx, nj = j + dz; if (!inb(ni, nj)) continue; const nk = idx(ni, nj); if (!reach[nk] && WALKABLE[type[nk]]) { reach[nk] = 1; q.push(nk); } } } }
    for (let k = 0; k < N * N; k++) if (WALKABLE[type[k]] && !reach[k]) type[k] = T.BUILT;

    // Building lots
    const lots = [];
    const maxLot = { westminster: [3, 3], cheapside: [2, 3], stpauls: [2, 2], docks: [3, 2], whitechapel: [1, 2], southwark: [2, 2], graveyard: [2, 2] };
    const order = []; for (let k = 0; k < N * N; k++) if (type[k] === T.BUILT) order.push(k);
    for (let n = order.length - 1; n > 0; n--) { const m = Math.floor(R() * (n + 1)); [order[n], order[m]] = [order[m], order[n]]; }
    for (const k of order) {
      if (lotOf[k] >= 0) continue;
      const i0 = k % N, j0 = (k / N) | 0, d = dist[k];
      const [mw, md] = maxLot[DIDS[d]];
      let w = R.int(1, mw), h = R.int(1, md); if (R() < 0.5) [w, h] = [h, w];
      const ok = (i, j) => inb(i, j) && type[idx(i, j)] === T.BUILT && lotOf[idx(i, j)] < 0 && dist[idx(i, j)] === d;
      let i1 = i0, j1 = j0;
      while (i1 - i0 + 1 < w) { let good = true; for (let j = j0; j <= j1; j++) if (!ok(i1 + 1, j)) good = false; if (!good) break; i1++; }
      while (j1 - j0 + 1 < h) { let good = true; for (let i = i0; i <= i1; i++) if (!ok(i, j1 + 1)) good = false; if (!good) break; j1++; }
      const id = lots.length;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) lotOf[idx(i, j)] = id;
      lots.push({ id, i0, j0, i1, j1, did: DIDS[d], seed: (R() * 1e9) | 0 });
    }

    const town = { seed, N, CS, T, type, dist, lotOf, lots, land, L, C, bridges, rc, sites: [], havens: [], doors: {}, props: [], DIDS };

    // Doors: sites, havens, Elysium, a hunter's lodging
    const used = new Set();
    function findDoor(did, near, maxR = 12, preferPlaza = true, lotFilter) {
      let best = null;
      for (let j = 2; j < N - 2; j++) for (let i = 2; i < N - 2; i++) {
        const k = idx(i, j); if (type[k] !== T.BUILT || DIDS[dist[k]] !== did || used.has(lotOf[k])) continue;
        const dd = Math.hypot(i - near[0], j - near[1]); if (dd > maxR) continue;
        if (lotFilter && !lotFilter(lots[lotOf[k]])) continue;
        for (let side = 0; side < 4; side++) {
          const ni = i + DIRS[side][0], nj = j + DIRS[side][1], nt = type[idx(ni, nj)];
          if (nt !== T.STREET && nt !== T.PLAZA && nt !== T.QUAY) continue;
          const sc = dd + R() * 4 - (preferPlaza && nt === T.PLAZA ? 3 : 0);
          if (!best || sc < best.sc) best = { sc, i, j, side };
        }
      }
      if (!best) return null;
      used.add(lotOf[idx(best.i, best.j)]);
      return doorAt(best.i, best.j, best.side);
    }
    function doorAt(i, j, side) {
      const [dx, dz] = DIRS[side];
      const x = (i + 0.5) * CS + dx * CS / 2, z = (j + 0.5) * CS + dz * CS / 2;
      const key = `${i},${j},${side}`;
      return { i, j, side, key, x, z, nx: dx, nz: dz };
    }
    for (const sd of SITES) {
      let door = null;
      if (sd.id === 'cathedral') { const c = L.cathedral; door = doorAt(c.i0, (c.j0 + c.j1) >> 1, 3); }
      else if (sd.id === 'revels') { const c = L.palace; door = doorAt((c.i0 + c.i1) >> 1, c.j1, 2); }
      else if (sd.id === 'charnel') { const c = L.chapel; door = doorAt(c.i0, c.j1, 2); }
      else if (sd.id === 'graves') { const [cx, cz] = C.graveyard; door = { i: cx - 3, j: cz + 3, x: (cx - 3 + 0.5) * CS, z: (cz + 3 + 0.5) * CS, nx: 0, nz: 1, open: true, key: 'graves' }; }
      else door = findDoor(sd.d, C[sd.d], sd.d === 'docks' ? 14 : 11);
      if (!door) door = findDoor(sd.d, C[sd.d], 40, false);
      if (door) { town.sites.push({ ...sd, door }); town.doors[door.key] = { kind: 'site', id: sd.id }; }
    }
    // Havens, from a crypt to a gothic pile
    const hv = [
      () => { const c = L.crypt; return doorAt(c.i0, c.j0, 2); },
      () => findDoor('cheapside', [C.cheapside[0] + 5, C.cheapside[1] - 3], 14, false),
      () => findDoor('westminster', [C.westminster[0] + 6, C.westminster[1] + 2], 14, false),
      () => findDoor('graveyard', [C.graveyard[0] - 9, C.graveyard[1] + 2], 16, false, l => (l.i1 - l.i0 + 1) * (l.j1 - l.j0 + 1) >= 2),
      () => findDoor('westminster', [C.westminster[0] - 3, C.westminster[1] + 6], 16, false, l => (l.i1 - l.i0 + 1) * (l.j1 - l.j0 + 1) >= 4) || findDoor('westminster', C.westminster, 30, false),
    ];
    hv.forEach((f, lvl) => { const d = f() || findDoor('cheapside', C.cheapside, 40, false); town.havens.push(d); town.doors[d.key] = { kind: 'haven', lvl }; });
    town.elysium = findDoor('westminster', [C.westminster[0] + 4, C.westminster[1] - 4], 12, false) || findDoor('stpauls', C.stpauls, 30, false);
    town.doors[town.elysium.key] = { kind: 'elysium' };
    const ld = R.pick(['whitechapel', 'southwark', 'docks']);
    town.lodging = findDoor(ld, C[ld], 16, false) || findDoor('whitechapel', C.whitechapel, 40, false);
    town.doors[town.lodging.key] = { kind: 'lodging' };

    genProps(town, R);
    return town;
  }

  /* ---------------- clutter, trees, graves ---------------- */
  function genProps(town, R) {
    const { type, dist } = town;
    const P = town.props;
    const blocked = town.blocked = new Uint8Array(N * N);
    const isB = (i, j) => inb(i, j) && (type[idx(i, j)] === T.BUILT || type[idx(i, j)] === T.LAND || type[idx(i, j)] === T.WALL);
    const doorCells = new Set(Object.keys(town.doors).map(k => k.split(',').slice(0, 2).join(',')));
    for (let j = 2; j < N - 2; j++) for (let i = 2; i < N - 2; i++) {
      const k = idx(i, j), t = type[k], did = DIDS[dist[k]];
      const cx = (i + 0.5) * CS, cz = (j + 0.5) * CS;
      if (t === T.STREET || t === T.PLAZA || t === T.QUAY) {
        // Clutter against a wall
        for (let side = 0; side < 4; side++) {
          const [dx, dz] = DIRS[side];
          if (!isB(i + dx, j + dz)) continue;
          const pr = did === 'docks' || t === T.QUAY ? 0.16 : did === 'westminster' ? 0.04 : 0.09;
          if (R() > pr) continue;
          // do not block doors
          const along = R.range(-1.3, 1.3);
          const x = cx + dx * (CS / 2 - 0.75) + (dz !== 0 ? along : 0), z = cz + dz * (CS / 2 - 0.75) + (dx !== 0 ? along : 0);
          const kind = R.pick(did === 'docks' || t === T.QUAY ? ['barrel', 'barrels', 'crate', 'crates', 'sacks', 'barrel'] : ['barrel', 'barrels', 'crate', 'wheel', 'sacks', 'hay', 'wheel', 'barrel']);
          P.push({ kind, x, z, yaw: R() * 6.28, r: kind === 'barrels' || kind === 'crates' ? 0.9 : 0.55, side });
        }
        if (t === T.STREET && R() < 0.18) P.push({ kind: 'puddle', x: cx + R.range(-1.2, 1.2), z: cz + R.range(-1.2, 1.2), s: R.range(0.8, 1.8), r: 0 });
        // Laundry lines across narrow lanes
        if (t === T.STREET && R() < 0.14) {
          if (isB(i - 1, j) && isB(i + 1, j)) P.push({ kind: 'laundry', x: cx, z: cz, axis: 'x', r: 0 });
          else if (isB(i, j - 1) && isB(i, j + 1)) P.push({ kind: 'laundry', x: cx, z: cz, axis: 'z', r: 0 });
        }
      }
      if (t === T.OPEN) {
        if (doorCells.has(`${i},${j}`)) continue;
        const nearPath = [0, 1, 2, 3].some(s => { const a = i + DIRS[s][0], b = j + DIRS[s][1]; return inb(a, b) && (type[idx(a, b)] === T.STREET || type[idx(a, b)] === T.PLAZA); });
        const n = R.int(1, nearPath ? 2 : 4);
        for (let g = 0; g < n; g++) {
          const kind = R() < 0.14 ? 'tomb' : R() < 0.35 ? 'cross' : 'headstone';
          P.push({ kind, x: cx + R.range(-1.5, 1.5), z: cz + R.range(-1.5, 1.5), yaw: R.range(-0.25, 0.25) + (R() < 0.1 ? R.range(-0.4, 0.4) : 0), tilt: R.range(-0.18, 0.18), r: kind === 'tomb' ? 1.1 : 0.4 });
        }
        if (R() < 0.16) P.push({ kind: 'tree', x: cx + R.range(-1, 1), z: cz + R.range(-1, 1), s: R.range(0.8, 1.4), dead: R() < 0.5, r: 0.45 });
      }
    }
    // Plazas: wells, stalls, trees, crosses
    const C = town.C;
    const plazaCells = d => { const a = []; for (let j = 2; j < N - 2; j++) for (let i = 2; i < N - 2; i++) { const k = idx(i, j); if (type[k] === T.PLAZA && DIDS[dist[k]] === d) a.push([i, j]); } return a; };
    const freeCell = (d, near, minR = 0) => {
      const cells = plazaCells(d).filter(([i, j]) => !blocked[idx(i, j)] && !doorAdj(i, j) && Math.hypot(i - near[0], j - near[1]) >= minR);
      cells.sort((a, b) => Math.hypot(a[0] - near[0], a[1] - near[1]) - Math.hypot(b[0] - near[0], b[1] - near[1]) + (R() - 0.5) * 3);
      return cells[0];
    };
    const doorAdj = (i, j) => [0, 1, 2, 3].some(s => doorCells.has(`${i + DIRS[s][0]},${j + DIRS[s][1]}`));
    const put = (kind, cell, extra = {}) => { if (!cell) return; const [i, j] = cell; blocked[idx(i, j)] = 1; P.push({ kind, x: (i + 0.5) * CS, z: (j + 0.5) * CS, yaw: R.int(0, 3) * Math.PI / 2, ...extra }); };
    put('cross', freeCell('cheapside', C.cheapside), { r: 1.3, big: true });
    for (const d of ['cheapside', 'southwark', 'westminster', 'docks', 'whitechapel']) put('well', freeCell(d, C[d], d === 'cheapside' ? 2 : 1), { r: 1.2 });
    for (let n = 0; n < 6; n++) put('stall', freeCell('cheapside', C.cheapside, 1), { r: 1.4 });
    for (let n = 0; n < 2; n++) put('stall', freeCell('southwark', C.southwark, 1), { r: 1.4 });
    for (const d of ['stpauls', 'westminster', 'southwark', 'whitechapel']) for (let n = 0; n < (d === 'stpauls' ? 4 : 2); n++) put('tree', freeCell(d, C[d], 2), { r: 0.45, s: R.range(1, 1.5), dead: R() < 0.4 });
    for (let n = 0; n < 2; n++) put('cart', freeCell('docks', C.docks, 1), { r: 1.2 });
    put('cart', freeCell('southwark', C.southwark, 2), { r: 1.2 });
    // Ships moored at the docks
    for (let i = 3; i < N - 3; i++) {
      if (R() > 0.22) continue;
      let top = -1; for (let j = 20; j < N - 2; j++) if (type[idx(i, j)] === T.WATER) { top = j; break; }
      if (top < 0 || DIDS[dist[idx(i, top - 1)]] !== 'docks' || type[idx(i, top - 1)] !== T.QUAY) continue;
      if (P.some(p => p.kind === 'ship' && Math.abs(p.i - i) < 5)) continue;
      P.push({ kind: 'ship', i, x: (i + 1) * CS, z: (top + 1.1) * CS, r: 0 });
    }
    town.propGrid = {};
    for (const p of P) if (p.r > 0) { const k = idx(Math.floor(p.x / CS), Math.floor(p.z / CS)); (town.propGrid[k] = town.propGrid[k] || []).push(p); }
  }

  /* ==================================================================
     Build: raise the plan in the style of an age
     ================================================================== */
  let matCache = null;
  function materials() {
    if (matCache) return matCache;
    const lam = (t, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ map: TEX.get(t), vertexColors: true }, o));
    const bas = (t, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ map: TEX.get(t), vertexColors: true }, o));
    const M = {
      cobble: lam('cobble'), flag: lam('flag'), mud: lam('mud'), grass: lam('grass'), quay: lam('quay'),
      plaster: lam('plaster'), timber: lam('timber', { side: THREE.DoubleSide }), stone: lam('stone'), brick: lam('brick'), soot: lam('sootbrick'),
      roof: lam('roof', { side: THREE.DoubleSide }), thatch: lam('thatch', { side: THREE.DoubleSide }), slate: lam('slate', { side: THREE.DoubleSide }),
      win: lam('window'), winLit: bas('windowLit'), sash: lam('sash'), sashLit: bas('sashLit'),
      door: lam('door', { side: THREE.DoubleSide }), wood: lam('planks', { side: THREE.DoubleSide }), iron: lam('iron'),
      ivy: lam('ivy', { alphaTest: 0.5, side: THREE.DoubleSide }), leaves: lam('leaves', { alphaTest: 0.45, side: THREE.DoubleSide }), bark: lam('bark'),
      water: new THREE.MeshPhongMaterial({ map: TEX.get('water'), color: 0x9aa4b0, shininess: 90, specular: 0x554433 }),
      grave: lam('grave'), cloth: lam('cloth', { side: THREE.DoubleSide }),
      puddle: new THREE.MeshPhongMaterial({ color: 0x06080a, shininess: 120, specular: 0x886655, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      lampglass: new THREE.MeshBasicMaterial({ color: 0xffc070 }),
      glass: new THREE.MeshBasicMaterial({ map: stained(), vertexColors: true }),
    };
    for (let s = 0; s < SIGNS.length; s++) M['sign' + s] = new THREE.MeshLambertMaterial({ map: TEX.sign(SIGNS[s]), side: THREE.DoubleSide });
    matCache = M;
    return M;
  }
  const SIGNS = ['⚒', '♨', '⚱', '✂', '☕', '⚓', '♞', '☙'];
  function stained() {
    const c = TEX.canvas(16, 32), x = c.getContext('2d');
    x.fillStyle = '#100808'; x.fillRect(0, 0, 16, 32);
    const cols = ['#7a1420', '#1d2c6a', '#6a5a14', '#18502a', '#5a1a4a'];
    const R = WU.rng(77);
    for (let j = 1; j < 31; j += 3) for (let i = 1; i < 15; i += 3) { x.fillStyle = cols[(R() * cols.length) | 0]; x.fillRect(i, j, 2, 2); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }

  function lotStyle(lot, era, town) {
    const R = WU.rng(lot.seed + era.length * 101);
    const d = lot.did, area = (lot.i1 - lot.i0 + 1) * (lot.j1 - lot.j0 + 1);
    const poor = d === 'whitechapel' || d === 'southwark' || d === 'docks';
    const rich = d === 'westminster' || d === 'cheapside';
    const st = { did: d };
    let stories = { westminster: 3, cheapside: 3, stpauls: 2, docks: 2, whitechapel: 2, southwark: 2, graveyard: 1 }[d] + R.int(0, 1);
    if (era === 'victorian') stories += R.int(0, 1) + (rich ? 1 : 0);
    if (era === 'georgian' && rich) stories += 1;
    if (era === 'medieval') stories = Math.max(1, stories - (R() < 0.4 ? 1 : 0));
    st.warehouse = d === 'docks' && area >= 3 && R() < 0.7;
    st.frame = false; st.jetty = false; st.parapet = false;
    st.brace = R.int(0, 3);
    st.winTex = 'win';
    const r = R();
    if (era === 'medieval') {
      if (rich && r < 0.2) { st.wall = 'stone'; st.roof = 'roof'; }
      else { st.wall = 'plaster'; st.frame = true; st.jetty = R() < 0.6; st.roof = poor || d === 'graveyard' || R() < 0.35 ? 'thatch' : 'roof'; }
      st.pitch = R.range(0.95, 1.35); st.storyH = 3.0;
    } else if (era === 'tudor') {
      if (r < 0.14) { st.wall = 'brick'; st.roof = 'roof'; }
      else if (rich && r < 0.24) { st.wall = 'stone'; st.roof = 'slate'; }
      else { st.wall = 'plaster'; st.frame = true; st.jetty = R() < 0.85; st.roof = poor && R() < 0.3 ? 'thatch' : 'roof'; st.brace = R.int(1, 3); }
      st.pitch = R.range(0.9, 1.25); st.storyH = 3.1;
    } else if (era === 'georgian') {
      if (poor && r < 0.3) { st.wall = 'plaster'; st.frame = true; st.jetty = R() < 0.5; st.roof = 'roof'; st.pitch = 0.9; }
      else if (rich && r < 0.22) { st.wall = 'stone'; st.roof = 'slate'; st.parapet = true; st.winTex = 'sash'; }
      else { st.wall = 'brick'; st.roof = R() < 0.5 ? 'slate' : 'roof'; st.parapet = R() < 0.6; st.winTex = 'sash'; }
      st.pitch = st.pitch || R.range(0.45, 0.7); st.storyH = 3.4;
    } else {
      if (rich && r < 0.2) { st.wall = 'stone'; st.parapet = true; }
      else if (r < 0.2) { st.wall = 'brick'; st.parapet = R() < 0.4; }
      else { st.wall = 'soot'; st.parapet = R() < 0.45; }
      st.roof = 'slate'; st.winTex = 'sash'; st.pitch = R.range(0.6, 1.0); st.storyH = 3.5;
    }
    if (st.warehouse) { st.wall = era === 'medieval' || era === 'tudor' ? 'wood' : era === 'victorian' ? 'soot' : 'brick'; st.frame = false; st.jetty = false; st.parapet = false; stories = 3; st.pitch = 0.6; st.roof = era === 'medieval' ? 'roof' : 'slate'; }
    st.stories = Math.max(1, stories);
    st.groundH = st.storyH + 0.3;
    st.H = st.groundH + (st.stories - 1) * st.storyH;
    st.tint = [0.82 + R() * 0.26, 0.8 + R() * 0.24, 0.78 + R() * 0.22];
    if (st.wall === 'plaster') { const tt = R(); st.tint = tt < 0.3 ? [1.05, 0.95, 0.78] : tt < 0.5 ? [0.85, 0.8, 0.76] : tt < 0.6 ? [0.95, 0.75, 0.66] : st.tint; }
    st.lit = { medieval: 0.1, tudor: 0.14, georgian: 0.18, victorian: 0.22 }[era] + (rich ? 0.05 : 0);
    st.R = R;
    return st;
  }

  function build(town, era) {
    const M = materials();
    const chunks = {};
    const CH = 16;
    const B = (x, z) => { const k = Math.floor(x / (CH * CS)) + ',' + Math.floor(z / (CH * CS)); return chunks[k] || (chunks[k] = new WU.Builder()); };
    const { type, dist, lots } = town;
    const R = WU.rng(town.seed * 7 + era.length);
    const lights = [];
    const glows = [];
    const colliders = [];
    const styles = lots.map(l => lotStyle(l, era, town));
    const lotH = id => (id >= 0 ? styles[id].H : 0);
    const tAt = (i, j) => (inb(i, j) ? type[idx(i, j)] : T.WALL);
    const walk = (i, j) => WALKABLE[tAt(i, j)];

    /* ---- ground ---- */
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const t = tAt(i, j); if (!WALKABLE[t] && t !== T.WATER) continue;
      const did = DIDS[dist[idx(i, j)]];
      const x0 = i * CS, z0 = j * CS, x1 = x0 + CS, z1 = z0 + CS;
      const b = B(x0 + 2, z0 + 2);
      if (t === T.WATER) {
        b.floor('water', x0, z0, x1, z1, -1.0, [0.8, 0.85, 0.9], 6);
        continue;
      }
      let key = 'cobble';
      if (t === T.PLAZA) key = did === 'graveyard' ? 'grass' : 'flag';
      if (t === T.OPEN) key = 'grass';
      if (t === T.QUAY) key = 'quay';
      if (t === T.YARD) key = 'mud';
      if (t === T.BRIDGE) key = era === 'medieval' || era === 'tudor' ? 'wood' : 'quay';
      if (t === T.STREET && (era === 'medieval' && (did === 'whitechapel' || did === 'southwark' || did === 'graveyard' || did === 'docks'))) key = 'mud';
      if (t === T.STREET && era === 'tudor' && did === 'whitechapel') key = 'mud';
      // corner ambient occlusion from adjacent buildings
      const ao = (ci, cj) => { let c = 0; for (const [a, bb] of [[ci - 1, cj - 1], [ci, cj - 1], [ci - 1, cj], [ci, cj]]) if (!walk(a, bb) && tAt(a, bb) !== T.WATER) c++; return Math.max(0.42, 1 - c * 0.2); };
      const v = 0.9 + WU.hash2(i, j, 3) * 0.2;
      const cA = [ao(i, j + 1) * v, ao(i + 1, j + 1) * v, ao(i + 1, j) * v, ao(i, j) * v].map(q => [q, q * 0.97, q * 0.95]);
      const ts = key === 'cobble' ? 3 : key === 'flag' || key === 'quay' ? 4 : key === 'wood' ? 3 : 4;
      const U = [[x0 / ts, z1 / ts], [x1 / ts, z1 / ts], [x1 / ts, z0 / ts], [x0 / ts, z0 / ts]];
      if (t === T.BRIDGE) {
        b.quad(key, [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], U, cA);
        b.floor('stone', x0, z0, x1, z1, -0.6, [0.5, 0.5, 0.5], 4, true);
        for (let s = 0; s < 4; s++) {
          const [dx, dz] = DIRS[s]; if (tAt(i + dx, j + dz) !== T.WATER) continue;
          const px0 = dx === 1 ? x1 - 0.35 : x0, px1 = dx === -1 ? x0 + 0.35 : x1, pz0 = dz === 1 ? z1 - 0.35 : z0, pz1 = dz === -1 ? z0 + 0.35 : z1;
          b.box(key === 'wood' ? 'wood' : 'stone', dx ? px0 : x0, 0, dz ? pz0 : z0, dx ? px1 : x1, 1.05, dz ? pz1 : z1, [0.8, 0.78, 0.74], 2, 'b');
          b.wall('stone', ...(dx === 1 ? [x1, z1, x1, z0] : dx === -1 ? [x0, z0, x0, z1] : dz === 1 ? [x0, z1, x1, z1] : [x1, z0, x0, z0]), -1.2, 0, [0.55, 0.55, 0.5], 4);
        }
        if (j % 3 === 0 && (i === town.bridges[0].i0 || true)) b.box('stone', x0 + 1.2, -1.2, z0 + 1.2, x1 - 1.2, -0.6, z1 - 1.2, [0.5, 0.5, 0.48], 2);
        continue;
      }
      b.quad(key, [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], U, cA);
      // quay walls and embankments where the ground meets water
      for (let s = 0; s < 4; s++) {
        const [dx, dz] = DIRS[s]; if (tAt(i + dx, j + dz) !== T.WATER) continue;
        const e = dx === 1 ? [x1, z1, x1, z0] : dx === -1 ? [x0, z0, x0, z1] : dz === 1 ? [x0, z1, x1, z1] : [x1, z0, x0, z0];
        b.wall('stone', ...e, -1.3, 0, [0.6, 0.62, 0.58], 4);
        // bollards and mooring posts
        if (t === T.QUAY && R() < 0.35) { const tt = R.range(0.2, 0.8); const bx = e[0] + (e[2] - e[0]) * tt - dx * 0.35, bz = e[1] + (e[3] - e[1]) * tt - dz * 0.35; b.prism('iron', bx, bz, 0.16, 0.13, 0, 0.7, 6, [0.6, 0.6, 0.6]); colliders.push({ x: bx, z: bz, r: 0.2 }); }
      }
    }
    // Built cells that touch water get a stone footing
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const t = tAt(i, j); if (t !== T.BUILT && t !== T.LAND) continue;
      for (let s = 0; s < 4; s++) {
        const [dx, dz] = DIRS[s]; if (tAt(i + dx, j + dz) !== T.WATER) continue;
        const x0 = i * CS, z0 = j * CS, x1 = x0 + CS, z1 = z0 + CS;
        const e = dx === 1 ? [x1, z1, x1, z0] : dx === -1 ? [x0, z0, x0, z1] : dz === 1 ? [x0, z1, x1, z1] : [x1, z0, x0, z0];
        B(x0, z0).wall('stone', ...e, -1.3, 0.4, [0.5, 0.52, 0.48], 4);
      }
    }

    /* ---- city wall ---- */
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if (tAt(i, j) !== T.WALL) continue;
      const x0 = i * CS, z0 = j * CS, x1 = x0 + CS, z1 = z0 + CS, H = 11;
      const b = B(x0, z0);
      let any = false;
      for (let s = 0; s < 4; s++) {
        const [dx, dz] = DIRS[s]; const ni = i + dx, nj = j + dz;
        if (!inb(ni, nj) || tAt(ni, nj) === T.WALL) continue;
        any = true;
        const e = dx === 1 ? [x1, z1, x1, z0] : dx === -1 ? [x0, z0, x0, z1] : dz === 1 ? [x0, z1, x1, z1] : [x1, z0, x0, z0];
        b.wall('stone', ...e, tAt(ni, nj) === T.WATER ? -1.3 : 0, H, [0.62, 0.64, 0.6], 4);
        for (let m = 0; m < 2; m++) {
          const mx = e[0] + (e[2] - e[0]) * (0.18 + m * 0.5), mz = e[1] + (e[3] - e[1]) * (0.18 + m * 0.5);
          b.obox('stone', mx - dx * 0.3 + (e[2] - e[0]) * 0.08, H + 0.6, mz - dz * 0.3 + (e[3] - e[1]) * 0.08, dz ? 0.6 : 0.3, 0.6, dx ? 0.6 : 0.3, 0, [0.6, 0.62, 0.58], 2);
        }
      }
      if (any) b.floor('stone', x0, z0, x1, z1, H, [0.5, 0.5, 0.5], 4);
    }

    /* ---- buildings ---- */
    const facing = (i, j) => { const t = tAt(i, j); return WALKABLE[t] || t === T.WATER; };
    for (const lot of lots) {
      const st = styles[lot.id], Rl = st.R;
      const x0 = lot.i0 * CS, z0 = lot.j0 * CS, x1 = (lot.i1 + 1) * CS, z1 = (lot.j1 + 1) * CS;
      const b = B((x0 + x1) / 2, (z0 + z1) / 2);
      const H = st.H, wallKey = st.wall;
      const tint = st.tint;
      const maxOff = st.jetty ? Math.min(2, st.stories - 1) * 0.35 : 0;
      const offOf = k => (st.jetty && k > 0 ? Math.min(k, 2) * 0.35 : 0);
      const storyY = k => (k === 0 ? 0 : st.groundH + (k - 1) * st.storyH);
      const storyTop = k => storyY(k) + (k === 0 ? st.groundH : st.storyH);
      // gather facade segments per side
      const segs = [];
      for (let side = 0; side < 4; side++) {
        const [dx, dz] = DIRS[side];
        const cells = [];
        if (side === 0) for (let i = lot.i1; i >= lot.i0; i--) cells.push([i, lot.j0]);
        if (side === 1) for (let j = lot.j1; j >= lot.j0; j--) cells.push([lot.i1, j]);
        if (side === 2) for (let i = lot.i0; i <= lot.i1; i++) cells.push([i, lot.j1]);
        if (side === 3) for (let j = lot.j0; j <= lot.j1; j++) cells.push([lot.i0, j]);
        cells.forEach(([ci, cj], n) => {
          const ox = ci * CS, oz = cj * CS;
          // travel direction for outward normal (dx,dz): a -> b
          let a, bb;
          if (side === 0) { a = [ox + CS, oz]; bb = [ox, oz]; }
          if (side === 1) { a = [ox + CS, oz + CS]; bb = [ox + CS, oz]; }
          if (side === 2) { a = [ox, oz + CS]; bb = [ox + CS, oz + CS]; }
          if (side === 3) { a = [ox, oz]; bb = [ox, oz + CS]; }
          const ni = ci + dx, nj = cj + dz;
          segs.push({ side, n, cells: cells.length, ci, cj, a, b: bb, nx: dx, nz: dz, face: facing(ni, nj), nH: lotH(inb(ni, nj) ? town.lotOf[idx(ni, nj)] : -1), nT: tAt(ni, nj) });
        });
      }
      const sideFace = [0, 1, 2, 3].map(s => segs.filter(q => q.side === s && q.face).length);
      for (const sg of segs) {
        const { a, nx, nz } = sg;
        const bpt = sg.b;
        const P = (t, off, y) => [a[0] + (bpt[0] - a[0]) * t + nx * off, y, a[1] + (bpt[1] - a[1]) * t + nz * off];
        if (!sg.face) {
          if (sg.nT === T.LAND || sg.nT === T.WALL) continue;
          if (sg.nH < H) b.wall(wallKey, a[0], a[1], bpt[0], bpt[1], Math.max(0, sg.nH - 0.2), H + (st.parapet ? 0.9 : 0), tint, wallKey === 'plaster' ? 5 : 4);
          continue;
        }
        const doorInfo = town.doors[`${sg.ci},${sg.cj},${sg.side}`];
        const segIdxNext = segs.find(q => q.side === sg.side && q.n === sg.n + 1);
        const segIdxPrev = segs.find(q => q.side === sg.side && q.n === sg.n - 1);
        for (let k = 0; k < st.stories; k++) {
          const y0 = storyY(k), y1 = storyTop(k) + (k === st.stories - 1 && st.parapet ? 0.9 : 0);
          const off = offOf(k), offP = offOf(k - 1);
          // extend jettied walls around corners that also face the street
          let ta = 0, tb = 1;
          if (off > 0) {
            if (sg.n === 0 && sideFace[(sg.side + 3) % 4] > 0 && segs.find(q => q.side === (sg.side + 3) % 4 && q.n === q.cells - 1 && q.face)) ta = -off / CS;
            if (sg.n === sg.cells - 1 && sideFace[(sg.side + 1) % 4] > 0 && segs.find(q => q.side === (sg.side + 1) % 4 && q.n === 0 && q.face)) tb = 1 + off / CS;
          }
          const pa = P(ta, off, 0), pb = P(tb, off, 0);
          const len = CS * (tb - ta);
          if (k === 0 && st.frame) {
            b.wall('stone', pa[0], pa[2], pb[0], pb[2], 0, 0.75, [0.8, 0.8, 0.76], 4);
            b.wall(wallKey, pa[0], pa[2], pb[0], pb[2], 0.75, y1, tint, 5);
          } else b.wall(wallKey, pa[0], pa[2], pb[0], pb[2], y0, y1, tint, wallKey === 'plaster' ? 5 : 4);
          if (k === 0 && !st.frame && wallKey !== 'wood') b.wall('stone', pa[0] + nx * 0.06, pa[2] + nz * 0.06, pb[0] + nx * 0.06, pb[2] + nz * 0.06, 0, 0.55, [0.7, 0.7, 0.66], 4);
          // soffit & end caps under a jetty
          if (off > offP) {
            const s0 = P(ta, offP, y0), s1 = P(tb, offP, y0), s2 = P(tb, off, y0), s3 = P(ta, off, y0);
            b.quadF('timber', s0, s1, s2, s3, [0, -1, 0], [0.7, 0.7, 0.7]);
            // joist ends
            for (let q = 0.08; q < 1; q += 0.14) { const p = P(q, off - 0.05, y0 - 0.12); b.box('timber', p[0] - 0.08, p[1] - 0.1, p[2] - 0.08, p[0] + 0.08, p[1] + 0.1, p[2] + 0.08, [0.8, 0.8, 0.8], 1); }
          }
          if (off > 0) {
            if (ta === 0 && !(segIdxPrev && segIdxPrev.face)) b.quadF(wallKey, P(0, 0, y0), P(0, off, y0), P(0, off, y1), P(0, 0, y1), [a[0] - bpt[0], 0, a[1] - bpt[1]], tint);
            if (tb === 1 && !(segIdxNext && segIdxNext.face)) b.quadF(wallKey, P(1, off, y0), P(1, 0, y0), P(1, 0, y1), P(1, off, y1), [bpt[0] - a[0], 0, bpt[1] - a[1]], tint);
          }
          // timber framing
          if (st.frame) {
            const tc = [0.85, 0.85, 0.85], w = 0.2, d = 0.05;
            const yb = k === 0 ? 0.75 : y0;
            b.beam('timber', P(ta, off, yb + 0.1), P(tb, off, yb + 0.1), nx, nz, w, d, tc);
            b.beam('timber', P(ta, off, y1 - 0.1), P(tb, off, y1 - 0.1), nx, nz, w, d, tc);
            const posts = st.brace === 3 && k > 0 ? [0.04, 0.2, 0.36, 0.5, 0.64, 0.8, 0.96] : [0.04, 0.5, 0.96];
            for (const t of posts) b.beam('timber', P(t, off, yb), P(t, off, y1), nx, nz, w, d, tc);
            if (k > 0 || st.brace === 2) {
              if (st.brace === 1) { b.beam('timber', P(0.04, off, yb + 0.1), P(0.5, off, y1 - 0.1), nx, nz, w, d, tc); b.beam('timber', P(0.5, off, yb + 0.1), P(0.04, off, y1 - 0.1), nx, nz, w, d, tc); b.beam('timber', P(0.5, off, yb + 0.1), P(0.96, off, y1 - 0.1), nx, nz, w, d, tc); b.beam('timber', P(0.96, off, yb + 0.1), P(0.5, off, y1 - 0.1), nx, nz, w, d, tc); }
              else if (st.brace === 2) { b.beam('timber', P(0.04, off, yb + 0.1), P(0.3, off, y1 - 0.1), nx, nz, w, d, tc); b.beam('timber', P(0.96, off, yb + 0.1), P(0.7, off, y1 - 0.1), nx, nz, w, d, tc); }
              else if (st.brace === 0) { b.beam('timber', P(0.04, off, (yb + y1) / 2), P(0.96, off, (yb + y1) / 2), nx, nz, w * 0.8, d, tc); }
            }
          } else if (k > 0 && (wallKey === 'brick' || wallKey === 'soot' || wallKey === 'stone')) {
            // string course between floors
            const p0 = P(ta, off, y0), p1 = P(tb, off, y0);
            b.beam('stone', [p0[0], y0, p0[2]], [p1[0], y0, p1[2]], nx, nz, 0.18, 0.08, [0.75, 0.74, 0.7]);
          }
          // openings
          const litP = st.lit;
          const winW = st.winTex === 'sash' ? 0.95 : 0.8, winH = st.winTex === 'sash' ? 1.75 : 1.05;
          const openings = [];
          if (k === 0) {
            if (doorInfo) openings.push({ t: 0.5, door: true, big: true });
            else if (sg.nT !== T.WATER && Rl() < (st.warehouse ? 0.5 : 0.32)) { const dt = Rl.range(0.25, 0.75); openings.push({ t: dt, door: true }); if (Rl() < 0.6) openings.push({ t: dt < 0.5 ? dt + 0.35 : dt - 0.35 }); }
            else openings.push({ t: Rl.range(0.3, 0.7), shop: st.did === 'cheapside' && era !== 'medieval' && Rl() < 0.5 });
          } else {
            const nW = st.winTex === 'sash' ? 2 : Rl() < 0.45 ? 2 : 1;
            if (st.warehouse) { if (k === st.stories - 1) openings.push({ t: 0.5, hoist: true }); else if (Rl() < 0.5) openings.push({ t: 0.5 }); }
            else if (nW === 1) openings.push({ t: Rl.range(0.35, 0.65) });
            else openings.push({ t: 0.28 }, { t: 0.72 });
          }
          for (const o of openings) {
            const o2 = off + 0.035;
            if (o.door) {
              const dw = o.big ? 1.5 : 1.05, dh = o.big ? 2.5 : 2.15;
              const t0 = o.t - dw / 2 / CS, t1 = o.t + dw / 2 / CS;
              b.quadF('door', P(t0, o2, 0), P(t1, o2, 0), P(t1, o2, dh), P(t0, o2, dh), [nx, 0, nz], [0.85, 0.85, 0.85], [[0, 0], [1, 0], [1, 1], [0, 1]]);
              const fk = st.frame ? 'timber' : 'stone';
              b.beam(fk, P(t0 - 0.02, off, 0), P(t0 - 0.02, off, dh + 0.1), nx, nz, 0.18, 0.08, [0.8, 0.8, 0.8]);
              b.beam(fk, P(t1 + 0.02, off, 0), P(t1 + 0.02, off, dh + 0.1), nx, nz, 0.18, 0.08, [0.8, 0.8, 0.8]);
              b.beam(fk, P(t0 - 0.05, off, dh + 0.12), P(t1 + 0.05, off, dh + 0.12), nx, nz, 0.24, 0.1, [0.8, 0.8, 0.8]);
              if (Rl() < 0.4 && !o.big) { const st0 = P(o.t, 0, 0); b.obox('stone', st0[0] + nx * 0.35, 0.09, st0[2] + nz * 0.35, nz ? 0.75 : 0.3, 0.09, nx ? 0.75 : 0.3, 0, [0.7, 0.7, 0.66], 2); }
              if (o.big) {
                const doorKind = doorInfo && doorInfo.kind;
                // lantern beside important doors
                const lp = P(t1 + 0.14, off + 0.35, dh + 0.3);
                const col = doorKind === 'elysium' ? [1.0, 0.18, 0.12] : doorKind === 'haven' ? [0.75, 0.5, 1.0] : doorKind === 'lodging' ? [0.9, 0.9, 0.7] : [1.0, 0.62, 0.3];
                lanternMesh(b, lp, nx, nz);
                lights.push({ x: lp[0], y: lp[1], z: lp[2], c: col, p: 1.1, flick: 0.12, kind: 'lantern', door: doorInfo });
                glows.push({ x: lp[0], y: lp[1], z: lp[2], c: col, s: 1.1 });
                // hanging sign
                if (doorKind === 'site') {
                  const sp = P(t0 - 0.35, off, dh + 0.6);
                  const e = P(t0 - 0.35, off + 1.2, dh + 0.6);
                  b.beam('iron', sp, e, nx, nz, 0.05, 0, [1, 1, 1]);
                  const cx = (sp[0] + e[0]) / 2 + nx * 0.1, cz = (sp[2] + e[2]) / 2 + nz * 0.1;
                  const site = town.sites.find(s2 => s2.door.key === doorInfo.key || s2.id === doorInfo.id);
                  const si = site ? SIGN_OF(site.glyph) : 0;
                  signBoard(b, 'sign' + si, cx, dh + 0.1, cz, nx, nz, 0.55);
                }
              }
            } else if (o.hoist) {
              const t0 = o.t - 0.7 / CS, t1 = o.t + 0.7 / CS;
              b.quadF('wood', P(t0, o2, y0 + 0.3), P(t1, o2, y0 + 0.3), P(t1, o2, y0 + 2.3), P(t0, o2, y0 + 2.3), [nx, 0, nz], [0.6, 0.6, 0.6], [[0, 0], [1, 0], [1, 1], [0, 1]]);
              const hp = P(o.t, off, y1 - 0.2); b.beam('timber', hp, [hp[0] + nx * 1.2, hp[1], hp[2] + nz * 1.2], nx, nz, 0.2, 0, [0.8, 0.8, 0.8]);
            } else {
              const lit = Rl() < litP;
              const shop = o.shop;
              const ww = shop ? 2.2 : winW, wh = shop ? 1.6 : winH;
              const t0 = o.t - ww / 2 / CS, t1 = o.t + ww / 2 / CS;
              const wy = y0 + (k === 0 ? (shop ? 0.7 : 1.05) : st.winTex === 'sash' ? 0.8 : 1.05);
              const key = (st.winTex === 'sash' ? 'sash' : 'win') + (lit || (shop && Rl() < 0.5) ? 'Lit' : '');
              b.quadF(key, P(t0, o2, wy), P(t1, o2, wy), P(t1, o2, wy + wh), P(t0, o2, wy + wh), [nx, 0, nz], lit ? [1, 0.9, 0.8] : [0.8, 0.8, 0.8], [[0, 0], [shop ? 2 : 1, 0], [shop ? 2 : 1, 1], [0, 1]]);
              const sk = st.frame ? 'timber' : 'stone';
              b.beam(sk, P(t0 - 0.02, off, wy - 0.05), P(t1 + 0.02, off, wy - 0.05), nx, nz, 0.14, st.frame ? 0.07 : 0.12, [0.8, 0.8, 0.8]);
              if (!st.frame && st.winTex === 'sash') b.beam('stone', P(t0 - 0.03, off, wy + wh + 0.08), P(t1 + 0.03, off, wy + wh + 0.08), nx, nz, 0.18, 0.08, [0.8, 0.8, 0.78]);
              if (!lit && (era === 'medieval' || era === 'tudor') && Rl() < 0.3) {
                // open shutters
                const sw = 0.4;
                const ang = Rl.range(0.4, 1.3);
                for (const [tt, sgn] of [[t0, -1], [t1, 1]]) {
                  const base = P(tt, o2, wy), top = P(tt, o2, wy + wh);
                  const dirx = (bpt[0] - a[0]) / CS * sgn, dirz = (bpt[1] - a[1]) / CS * sgn;
                  const ex = base[0] + (dirx * Math.cos(ang) + nx * Math.sin(ang)) * sw, ez = base[2] + (dirz * Math.cos(ang) + nz * Math.sin(ang)) * sw;
                  b.quadF('wood', base, [ex, base[1], ez], [ex, top[1], ez], top, [nx, 0, nz], [0.7, 0.62, 0.55]);
                }
              }
              if (lit && k > 0 && Rl() < 0.15) glows.push({ ...xyz(P(o.t, o2 + 0.1, wy + wh / 2)), c: [1, 0.6, 0.3], s: 0.9 });
            }
          }
          // occasional hanging trade sign on the ground floor
          if (k === 0 && !doorInfo && sg.nT !== T.WATER && Rl() < 0.1) {
            const sp = P(0.1, off, 3.1), e = P(0.1, off + 1.1, 3.1);
            b.beam('iron', sp, e, nx, nz, 0.05, 0, [1, 1, 1]);
            signBoard(b, 'sign' + Rl.int(0, SIGNS.length - 1), (sp[0] + e[0]) / 2 + nx * 0.1, 2.6, (sp[2] + e[2]) / 2 + nz * 0.1, nx, nz, 0.5);
          }
          // ivy creeping up the lower walls
          if (k === 0 && Rl() < (era === 'medieval' ? 0.12 : 0.18) && sg.nT !== T.WATER) {
            const iv0 = Rl.range(0, 0.4), iv1 = iv0 + Rl.range(0.35, 0.6), top = Math.min(H, Rl.range(3, 8.5));
            const q0 = P(iv0, offOf(0) + 0.05, 0), q1 = P(Math.min(1, iv1), offOf(0) + 0.05, 0);
            b.quadF('ivy', [q0[0], top, q0[2]], [q1[0], top, q1[2]], [q1[0], 0, q1[2]], [q0[0], 0, q0[2]], [nx, 0, nz], [0.8, 0.85, 0.8], [[0, 1], [1.5, 1], [1.5, 1 - top / 4], [0, 1 - top / 4]]);
          }
          // torches & lanterns on the walls
          if (k === 0 && !doorInfo && sg.nT !== T.WATER) {
            const plaza = sg.nT === T.PLAZA;
            const pr = { medieval: plaza ? 0.07 : 0.028, tudor: plaza ? 0.08 : 0.04, georgian: 0.012, victorian: 0 }[era];
            if (Rl() < pr) {
              const lp = P(Rl.range(0.2, 0.8), off + 0.3, 2.8);
              if (era === 'medieval') {
                b.beam('timber', [lp[0] - nx * 0.28, lp[1] - 0.4, lp[2] - nz * 0.28], lp, nx, nz, 0.08, 0, [0.7, 0.7, 0.7]);
                lights.push({ x: lp[0], y: lp[1] + 0.2, z: lp[2], c: [1.0, 0.5, 0.18], p: 1.25, flick: 0.35, kind: 'torch' });
                glows.push({ x: lp[0], y: lp[1] + 0.2, z: lp[2], c: [1, 0.5, 0.2], s: 1.5, fire: true });
              } else {
                lanternMesh(b, lp, nx, nz);
                lights.push({ x: lp[0], y: lp[1], z: lp[2], c: [1.0, 0.62, 0.3], p: 1.05, flick: 0.12, kind: 'lantern' });
                glows.push({ x: lp[0], y: lp[1], z: lp[2], c: [1, 0.6, 0.3], s: 1.1 });
              }
            }
          }
        }
        if (st.parapet) {
          // cornice
          const p0 = P(0, 0, H), p1 = P(1, 0, H);
          b.beam('stone', [p0[0], H, p0[2]], [p1[0], H, p1[2]], nx, nz, 0.3, 0.2, [0.8, 0.78, 0.74]);
        }
      }
      // parapet inner faces and caps
      const o = st.parapet ? 0 : maxOff + 0.35;
      if (st.parapet) {
        const t = 0.25;
        b.box('stone', x0, H + 0.9, z0, x1, H + 1.0, z0 + t, [0.7, 0.7, 0.66], 2, 'b');
        b.box('stone', x0, H + 0.9, z1 - t, x1, H + 1.0, z1, [0.7, 0.7, 0.66], 2, 'b');
        b.box('stone', x0, H + 0.9, z0, x0 + t, H + 1.0, z1, [0.7, 0.7, 0.66], 2, 'b');
        b.box('stone', x1 - t, H + 0.9, z0, x1, H + 1.0, z1, [0.7, 0.7, 0.66], 2, 'b');
      }
      roof(b, st, x0, z0, x1, z1, H, o, lot, sideFace);
    }

    /* ---- landmarks ---- */
    landmarks(town, era, B, lights, glows, R);

    /* ---- props ---- */
    for (const p of town.props) {
      const b = B(p.x, p.z);
      propMesh(b, p, era, R, lights, glows);
      if (p.r > 0) colliders.push({ x: p.x, z: p.z, r: p.r });
    }

    /* ---- street lamps of later ages ---- */
    if (era === 'georgian' || era === 'victorian') {
      const gas = era === 'victorian';
      for (let j = 2; j < N - 2; j++) for (let i = 2; i < N - 2; i++) {
        const t = tAt(i, j); if (t !== T.STREET && t !== T.PLAZA && t !== T.QUAY && t !== T.BRIDGE) continue;
        const did = DIDS[dist[idx(i, j)]];
        let pr = gas ? (t === T.PLAZA ? 0.2 : 0.13) : (t === T.PLAZA ? 0.1 : 0.05);
        if (did === 'westminster' || did === 'cheapside') pr *= 1.5;
        if (did === 'whitechapel' || did === 'docks') pr *= 0.55;
        if (t === T.BRIDGE) pr = (j % 2 === 0 && i === town.bridges[0].i0) || (j % 2 === 0 && town.bridges[1] && i === town.bridges[1].i0) ? 1 : 0;
        if (WU.hash2(i, j, 91) > pr) continue;
        // against a wall where possible
        let x = (i + 0.5) * CS, z = (j + 0.5) * CS;
        for (let s = 0; s < 4; s++) { const [dx, dz] = DIRS[s]; const nt = tAt(i + dx, j + dz); if (!WALKABLE[nt]) { x += dx * (CS / 2 - 0.5); z += dz * (CS / 2 - 0.5); break; } }
        if (t === T.BRIDGE) { x = i * CS + 0.3; z = (j + 0.5) * CS; }
        if ((town.propGrid[idx(i, j)] || []).some(q => Math.hypot(q.x - x, q.z - z) < 1.2)) continue;
        const b = B(x, z), hgt = gas ? 3.7 : 3.2;
        b.prism('iron', x, z, 0.09, 0.06, 0, hgt, 6, [0.5, 0.5, 0.5]);
        b.prism('iron', x, z, 0.2, 0.12, 0, 0.35, 6, [0.5, 0.5, 0.5]);
        b.box('iron', x - 0.22, hgt, z - 0.22, x + 0.22, hgt + 0.08, z + 0.22, [0.6, 0.6, 0.6]);
        b.bin('lampglass'); b.box('lampglass', x - 0.17, hgt + 0.08, z - 0.17, x + 0.17, hgt + 0.55, z + 0.17, [1, 1, 1]);
        b.prism('iron', x, z, 0.28, 0.02, hgt + 0.55, hgt + 0.85, 4, [0.6, 0.6, 0.6], 1, true, Math.PI / 4);
        const c = gas ? [1.0, 0.86, 0.6] : [1.0, 0.66, 0.34];
        lights.push({ x, y: hgt + 0.3, z, c, p: gas ? 1.45 : 1.1, flick: gas ? 0.03 : 0.1, kind: gas ? 'gas' : 'lamp' });
        glows.push({ x, y: hgt + 0.3, z, c, s: gas ? 1.6 : 1.2 });
        colliders.push({ x, z, r: 0.18 });
      }
    }

    // assemble
    const group = new THREE.Group();
    for (const k of Object.keys(chunks)) {
      const g = chunks[k].build(M);
      group.add(g);
    }
    return { group, lights, glows, colliders, styles };
  }
  const SIGN_OF = g => ({ '♪': 4, '♣': 6, '❦': 7, '⚖': 2, '⚜': 7, '✉': 3, '⚓': 5, '⚿': 0, '☗': 1, '⌖': 6 }[g] || 0);
  const xyz = p => ({ x: p[0], y: p[1], z: p[2] });

  function lanternMesh(b, p, nx, nz) {
    b.beam('iron', [p[0] - nx * 0.35, p[1] + 0.35, p[2] - nz * 0.35], [p[0], p[1] + 0.35, p[2]], nx, nz, 0.05, 0, [1, 1, 1]);
    b.box('iron', p[0] - 0.13, p[1] + 0.22, p[2] - 0.13, p[0] + 0.13, p[1] + 0.28, p[2] + 0.13, [0.7, 0.7, 0.7]);
    b.box('lampglass', p[0] - 0.1, p[1] - 0.18, p[2] - 0.1, p[0] + 0.1, p[1] + 0.22, p[2] + 0.1, [1, 1, 1]);
    b.box('iron', p[0] - 0.13, p[1] - 0.24, p[2] - 0.13, p[0] + 0.13, p[1] - 0.18, p[2] + 0.13, [0.7, 0.7, 0.7]);
  }
  function signBoard(b, key, cx, y, cz, nx, nz, s) {
    // board hangs perpendicular to the wall
    const ax = nx, az = nz; // along the bracket
    b.quad(key, [cx - ax * s, y - s * 0.9, cz - az * s], [cx + ax * s, y - s * 0.9, cz + az * s], [cx + ax * s, y + s * 0.9, cz + az * s], [cx - ax * s, y + s * 0.9, cz - az * s], [[0, 0], [1, 0], [1, 1], [0, 1]], [0.9, 0.9, 0.9]);
  }

  function roof(b, st, x0, z0, x1, z1, H, o, lot, sideFace) {
    const R = st.R, rk = st.roof;
    const wx = x1 - x0, wz = z1 - z0;
    // ridge orientation: gable toward the street for narrow fronts
    const nsFace = sideFace[0] + sideFace[2], ewFace = sideFace[1] + sideFace[3];
    let alongX;
    if (nsFace >= ewFace) alongX = !(wx <= CS * 1.01 && R() < 0.75);
    else alongX = wx <= CS * 1.01 && R() < 0.75 ? true : wz > wx;
    if (Math.abs(wx - wz) < 0.1 && nsFace === ewFace) alongX = R() < 0.5;
    const pitch = st.parapet ? 0.32 : st.pitch;
    const X0 = x0 - o, X1 = x1 + o, Z0 = z0 - o, Z1 = z1 + o;
    const col = [0.8 + R() * 0.2, 0.8 + R() * 0.15, 0.8 + R() * 0.15];
    const wallKey = st.wall, tint = st.tint;
    const ts = 2.2;
    if (alongX) {
      const half = (Z1 - Z0) / 2, zm = (Z0 + Z1) / 2, Rh = H + pitch * half;
      const sl = Math.hypot(half, Rh - H);
      b.quadF(rk, [X0, H, Z1], [X1, H, Z1], [X1, Rh, zm], [X0, Rh, zm], [0, 1, 1], col, [[X0 / ts, 0], [X1 / ts, 0], [X1 / ts, sl / ts], [X0 / ts, sl / ts]]);
      b.quadF(rk, [X1, H, Z0], [X0, H, Z0], [X0, Rh, zm], [X1, Rh, zm], [0, 1, -1], col, [[X1 / ts, 0], [X0 / ts, 0], [X0 / ts, sl / ts], [X1 / ts, sl / ts]]);
      const gx0 = x0 - (st.parapet ? 0 : o * 0.35), gx1 = x1 + (st.parapet ? 0 : o * 0.35);
      b.triF(wallKey, [gx0, H, Z0], [gx0, H, Z1], [gx0, Rh, zm], [-1, 0, 0], tint, 5);
      b.triF(wallKey, [gx1, H, Z1], [gx1, H, Z0], [gx1, Rh, zm], [1, 0, 0], tint, 5);
      if (st.frame) { b.beam('timber', [gx0, H, Z0 + 0.1], [gx0, Rh, zm], -1, 0, 0.18, 0.05, [0.8, 0.8, 0.8]); b.beam('timber', [gx0, Rh, zm], [gx0, H, Z1 - 0.1], -1, 0, 0.18, 0.05, [0.8, 0.8, 0.8]); b.beam('timber', [gx1, H, Z0 + 0.1], [gx1, Rh, zm], 1, 0, 0.18, 0.05, [0.8, 0.8, 0.8]); b.beam('timber', [gx1, Rh, zm], [gx1, H, Z1 - 0.1], 1, 0, 0.18, 0.05, [0.8, 0.8, 0.8]); }
      chimneys(b, st, x0, x1, zm, Rh, true);
    } else {
      const half = (X1 - X0) / 2, xm = (X0 + X1) / 2, Rh = H + pitch * half;
      const sl = Math.hypot(half, Rh - H);
      b.quadF(rk, [X1, H, Z1], [X1, H, Z0], [xm, Rh, Z0], [xm, Rh, Z1], [1, 1, 0], col, [[Z1 / ts, 0], [Z0 / ts, 0], [Z0 / ts, sl / ts], [Z1 / ts, sl / ts]]);
      b.quadF(rk, [X0, H, Z0], [X0, H, Z1], [xm, Rh, Z1], [xm, Rh, Z0], [-1, 1, 0], col, [[Z0 / ts, 0], [Z1 / ts, 0], [Z1 / ts, sl / ts], [Z0 / ts, sl / ts]]);
      const gz0 = z0 - (st.parapet ? 0 : o * 0.35), gz1 = z1 + (st.parapet ? 0 : o * 0.35);
      b.triF(wallKey, [X1, H, gz0], [X0, H, gz0], [xm, Rh, gz0], [0, 0, -1], tint, 5);
      b.triF(wallKey, [X0, H, gz1], [X1, H, gz1], [xm, Rh, gz1], [0, 0, 1], tint, 5);
      if (st.frame) { b.beam('timber', [X0 + 0.1, H, gz0], [xm, Rh, gz0], 0, -1, 0.18, 0.05, [0.8, 0.8, 0.8]); b.beam('timber', [xm, Rh, gz0], [X1 - 0.1, H, gz0], 0, -1, 0.18, 0.05, [0.8, 0.8, 0.8]); b.beam('timber', [X0 + 0.1, H, gz1], [xm, Rh, gz1], 0, 1, 0.18, 0.05, [0.8, 0.8, 0.8]); b.beam('timber', [xm, Rh, gz1], [X1 - 0.1, H, gz1], 0, 1, 0.18, 0.05, [0.8, 0.8, 0.8]); }
      chimneys(b, st, z0, z1, xm, Rh, false);
    }
    // eave soffits
    if (o > 0.01) {
      const c = [0.45, 0.42, 0.4];
      b.quadF('timber', [X0, H, Z0], [X1, H, Z0], [x1, H, z0], [x0, H, z0], [0, -1, 0], c);
      b.quadF('timber', [x0, H, z1], [x1, H, z1], [X1, H, Z1], [X0, H, Z1], [0, -1, 0], c);
      b.quadF('timber', [X0, H, Z0], [x0, H, z0], [x0, H, z1], [X0, H, Z1], [0, -1, 0], c);
      b.quadF('timber', [x1, H, z0], [X1, H, Z0], [X1, H, Z1], [x1, H, z1], [0, -1, 0], c);
    }
  }
  function chimneys(b, st, a0, a1, m, Rh, alongX) {
    const R = st.R, n = st.stories >= 3 ? R.int(1, 3) : R.int(0, 2);
    const ck = st.wall === 'soot' || st.wall === 'brick' || R() < 0.5 ? 'brick' : 'stone';
    for (let c = 0; c < n; c++) {
      const t = a0 + 0.8 + R() * (a1 - a0 - 1.6), off = (R() - 0.5) * 1.2;
      const cx = alongX ? t : m + off, cz = alongX ? m + off : t;
      const y0 = Rh - 1.8, y1 = Rh + R.range(0.6, 1.6);
      b.box(ck, cx - 0.35, y0, cz - 0.35, cx + 0.35, y1, cz + 0.35, [0.7, 0.66, 0.62], 1.5);
      b.box('stone', cx - 0.42, y1, cz - 0.42, cx + 0.42, y1 + 0.12, cz + 0.42, [0.6, 0.6, 0.58], 1);
      if (st.wall === 'soot' || st.wall === 'brick') for (let p = 0; p < R.int(1, 3); p++) b.prism('roof', cx - 0.18 + p * 0.18, cz, 0.07, 0.06, y1 + 0.12, y1 + 0.45, 5, [0.8, 0.6, 0.5]);
    }
  }

  /* ---------------- landmarks ---------------- */
  function landmarks(town, era, B, lights, glows, R) {
    const L = town.L;
    const late = era === 'georgian' || era === 'victorian';
    // St Paul's
    { const c = L.cathedral; const x0 = c.i0 * CS, z0 = c.j0 * CS, x1 = (c.i1 + 1) * CS, z1 = (c.j1 + 1) * CS, b = B((x0 + x1) / 2, (z0 + z1) / 2);
      const col = late ? [0.95, 0.93, 0.88] : [0.78, 0.8, 0.74];
      const H = late ? 18 : 16, zm = (z0 + z1) / 2;
      // aisles
      b.box('stone', x0 + 1.5, 0, z0, x1, 8, z0 + 2.4, col, 4, 'b');
      b.box('stone', x0 + 1.5, 0, z1 - 2.4, x1, 8, z1, col, 4, 'b');
      // nave
      b.box('stone', x0 + 1.5, 0, z0 + 2.2, x1 - 1, H, z1 - 2.2, col, 4, 'b');
      b.quadF('slate', [x0 + 1.5, H, z0 + 2.2], [x1 - 1, H, z0 + 2.2], [x1 - 1, H + 4, zm], [x0 + 1.5, H + 4, zm], [0, 1, -1], [0.6, 0.66, 0.7]);
      b.quadF('slate', [x1 - 1, H, z1 - 2.2], [x0 + 1.5, H, z1 - 2.2], [x0 + 1.5, H + 4, zm], [x1 - 1, H + 4, zm], [0, 1, 1], [0.6, 0.66, 0.7]);
      b.triF('stone', [x1 - 1, H, z1 - 2.2], [x1 - 1, H, z0 + 2.2], [x1 - 1, H + 4, zm], [1, 0, 0], col, 4);
      // buttresses and tall windows
      for (let x = x0 + 3; x < x1 - 1; x += 3.2) {
        for (const [zz, nz] of [[z0, -1], [z1, 1]]) {
          b.box('stone', x - 0.35, 0, nz < 0 ? zz - 0.8 : zz, x + 0.35, 7.5, nz < 0 ? zz : zz + 0.8, col, 2, 'b');
          b.quadF('glass', [x + 0.7, 2.2, zz + nz * 0.04], [x + 2.1, 2.2, zz + nz * 0.04], [x + 2.1, 6.4, zz + nz * 0.04], [x + 0.7, 6.4, zz + nz * 0.04], [0, 0, nz], [0.75, 0.75, 0.75], [[0, 0], [1, 0], [1, 1], [0, 1]]);
          const zc = nz < 0 ? z0 + 2.2 : z1 - 2.2;
          b.quadF('glass', [x + 0.9, 10, zc + nz * 0.04], [x + 2, 10, zc + nz * 0.04], [x + 2, 14.5, zc + nz * 0.04], [x + 0.9, 14.5, zc + nz * 0.04], [0, 0, nz], [0.6, 0.6, 0.6], [[0, 0], [1, 0], [1, 1], [0, 1]]);
        }
      }
      // west front
      b.box('stone', x0, 0, z0 + 1.2, x0 + 2.2, H + 2, z1 - 1.2, col, 4, 'b');
      b.quadF('door', [x0 - 0.04, 0, zm + 1], [x0 - 0.04, 0, zm - 1], [x0 - 0.04, 3.4, zm - 1], [x0 - 0.04, 3.4, zm + 1], [-1, 0, 0], [0.8, 0.8, 0.8], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      b.quadF('glass', [x0 - 0.04, 6, zm + 1.6], [x0 - 0.04, 6, zm - 1.6], [x0 - 0.04, 12, zm - 1.6], [x0 - 0.04, 12, zm + 1.6], [-1, 0, 0], [0.9, 0.9, 0.9], [[0, 0], [2, 0], [2, 2], [0, 2]]);
      if (!late) {
        // the great Gothic spire
        const tx = x1 - 6, tz = zm;
        b.box('stone', tx - 3, 0, tz - 3, tx + 3, H + 12, tz + 3, col, 4, 'b');
        for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.prism('stone', tx + dx * 2.7, tz + dz * 2.7, 0.5, 0.05, H + 12, H + 17, 4, col, 2, true, Math.PI / 4);
        if (era === 'medieval') b.prism('slate', tx, tz, 3.1, 0.05, H + 12, H + 58, 8, [0.55, 0.6, 0.62], 3, true, Math.PI / 8);
        else b.prism('stone', tx, tz, 2.4, 2.4, H + 12, H + 13, 8, col, 3, true, Math.PI / 8); // the spire fell to lightning in 1561
        glows.push({ x: tx, y: H + 8, z: tz - 3.1, c: [1, 0.6, 0.3], s: 1.3 });
      } else {
        // Wren's dome
        const tx = x1 - 7, tz = zm;
        b.prism('stone', tx, tz, 6.5, 6.5, H - 2, H + 6, 16, col, 4, false);
        for (let x = 0; x < 16; x += 2) { const a = x / 16 * Math.PI * 2; b.box('stone', tx + Math.cos(a) * 6.5 - 0.3, H - 2, tz + Math.sin(a) * 6.5 - 0.3, tx + Math.cos(a) * 6.5 + 0.3, H + 6, tz + Math.sin(a) * 6.5 + 0.3, col, 2, 'b'); }
        let r0 = 6.2, y = H + 6;
        for (let k = 1; k <= 6; k++) { const a = k / 6 * Math.PI / 2; const r1 = Math.cos(a) * 6.2, y1 = H + 6 + Math.sin(a) * 7.5; b.prism('slate', tx, tz, r0, r1, y, y1, 16, [0.5, 0.56, 0.52], 3, false); r0 = r1; y = y1; }
        b.prism('stone', tx, tz, 1.2, 1.1, y, y + 3.5, 8, col, 2, true);
        b.prism('iron', tx, tz, 0.35, 0.05, y + 3.5, y + 6, 6, [0.9, 0.8, 0.5]);
        // twin west towers
        for (const dz of [-1, 1]) { b.box('stone', x0, 0, zm + dz * 3.4 - 1.4, x0 + 2.8, H + 7, zm + dz * 3.4 + 1.4, col, 4, 'b'); b.prism('stone', x0 + 1.4, zm + dz * 3.4, 1.2, 0.2, H + 7, H + 11, 8, col, 2, true); }
      }
      lights.push({ x: x0 - 1, y: 3.6, z: zm + 1.6, c: [1, 0.6, 0.3], p: 1.2, flick: 0.2, kind: 'torch' });
      glows.push({ x: x0 - 0.4, y: 3.9, z: zm + 1.6, c: [1, 0.55, 0.25], s: 1.3, fire: true });
      glows.push({ x: x0 - 0.4, y: 3.9, z: zm - 1.6, c: [1, 0.55, 0.25], s: 1.3, fire: true });
    }
    // The palace / Westminster Hall
    { const c = L.palace; const x0 = c.i0 * CS, z0 = c.j0 * CS, x1 = (c.i1 + 1) * CS, z1 = (c.j1 + 1) * CS, b = B((x0 + x1) / 2, (z0 + z1) / 2);
      const col = era === 'victorian' ? [0.85, 0.8, 0.66] : [0.8, 0.8, 0.74];
      const H = 13, xm = (x0 + x1) / 2;
      b.box('stone', x0 + 2, 0, z0, x1 - 2, H, z1, col, 4, 'b');
      b.quadF('slate', [x0 + 2, H, z1], [x1 - 2, H, z1], [x1 - 2, H + 5, (z0 + z1) / 2], [x0 + 2, H + 5, (z0 + z1) / 2], [0, 1, 1], [0.5, 0.52, 0.55]);
      b.quadF('slate', [x1 - 2, H, z0], [x0 + 2, H, z0], [x0 + 2, H + 5, (z0 + z1) / 2], [x1 - 2, H + 5, (z0 + z1) / 2], [0, 1, -1], [0.5, 0.52, 0.55]);
      for (const tx of [x0 + 2, x1 - 2]) {
        b.box('stone', tx - 2, 0, z0 - 0.5, tx + 2, H + 8, z1 + 0.5, col, 4, 'b');
        for (let m = 0; m < 4; m++) for (const zz of [z0 - 0.5, z1 + 0.5 - 0.6]) b.box('stone', tx - 2 + m * 1.1, H + 8, zz, tx - 1.4 + m * 1.1, H + 9, zz + 0.6, col, 1);
        if (era === 'victorian') b.prism('slate', tx, (z0 + z1) / 2, 2.6, 0.2, H + 8, H + 16, 4, [0.45, 0.5, 0.5], 2, true, Math.PI / 4);
      }
      for (let x = x0 + 3; x < x1 - 3; x += 2.4) {
        b.quadF('glass', [x, 3, z1 + 0.04], [x + 1.2, 3, z1 + 0.04], [x + 1.2, 9, z1 + 0.04], [x, 9, z1 + 0.04], [0, 0, 1], [0.8, 0.8, 0.8], [[0, 0], [1, 0], [1, 2], [0, 2]]);
      }
      b.quadF('door', [xm - 1, 0, z1 + 0.05], [xm + 1, 0, z1 + 0.05], [xm + 1, 3.6, z1 + 0.05], [xm - 1, 3.6, z1 + 0.05], [0, 0, 1], [0.8, 0.8, 0.8], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      for (const dx of [-1.6, 1.6]) { lights.push({ x: xm + dx, y: 3.4, z: z1 + 0.5, c: [1, 0.62, 0.3], p: 1.2, flick: 0.15, kind: 'lantern' }); glows.push({ x: xm + dx, y: 3.4, z: z1 + 0.5, c: [1, 0.62, 0.3], s: 1.2 }); }
    }
    // Southwark: bear-pit or playhouse
    { const c = L.playhouse; const x0 = c.i0 * CS, z0 = c.j0 * CS, x1 = (c.i1 + 1) * CS, z1 = (c.j1 + 1) * CS, b = B((x0 + x1) / 2, (z0 + z1) / 2);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, r = 5.6;
      if (era === 'medieval') {
        b.prism('wood', cx, cz, r, r, 0, 2.2, 16, [0.7, 0.65, 0.6], 2, false);
        for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; b.prism('timber', cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0.15, 0.12, 0, 3, 5, [0.8, 0.8, 0.8]); }
        b.floor('mud', x0, z0, x1, z1, 0.02, [0.6, 0.5, 0.5], 3);
        b.prism('timber', cx, cz, 0.2, 0.18, 0, 2.6, 6, [0.8, 0.8, 0.8]);
      } else {
        const H = 9;
        b.prism(era === 'tudor' ? 'plaster' : 'brick', cx, cz, r, r, 0, H, 16, [1, 0.94, 0.82], 3, false);
        for (let k = 0; k < 16; k++) { const a = (k + 0.5) / 16 * Math.PI * 2; if (era === 'tudor') b.prism('timber', cx + Math.cos(a) * (r + 0.02), cz + Math.sin(a) * (r + 0.02), 0.13, 0.13, 0, H, 4, [0.8, 0.8, 0.8]); }
        b.prism(era === 'tudor' ? 'thatch' : 'slate', cx, cz, r + 0.8, r - 2.5, H, H + 2.5, 16, [0.9, 0.85, 0.8], 2, false);
        b.prism('wood', cx, cz, 0.12, 0.1, H + 2, H + 6, 4, [0.8, 0.8, 0.8]);
        b.quadF('cloth', [cx, H + 5.8, cz], [cx + 1.6, H + 5.4, cz], [cx + 1.6, H + 4.6, cz], [cx, H + 5, cz], [0, 0, 1], [0.9, 0.25, 0.2]);
      }
    }
    // Graveyard chapel and the crypt
    { const c = L.chapel; const x0 = c.i0 * CS + 0.4, z0 = c.j0 * CS + 0.4, x1 = (c.i1 + 1) * CS - 0.4, z1 = (c.j1 + 1) * CS, b = B((x0 + x1) / 2, (z0 + z1) / 2);
      const col = [0.66, 0.68, 0.62], H = 6.5, xm = (x0 + x1) / 2;
      b.box('stone', x0, 0, z0, x1, H, z1, col, 4, 'b');
      b.quadF('slate', [x1, H, z1], [x1, H, z0], [xm, H + 4, z0], [xm, H + 4, z1], [1, 1, 0], [0.5, 0.55, 0.52]);
      b.quadF('slate', [x0, H, z0], [x0, H, z1], [xm, H + 4, z1], [xm, H + 4, z0], [-1, 1, 0], [0.5, 0.55, 0.52]);
      b.triF('stone', [x0, H, z1], [x1, H, z1], [xm, H + 4, z1], [0, 0, 1], col, 4);
      b.triF('stone', [x1, H, z0], [x0, H, z0], [xm, H + 4, z0], [0, 0, -1], col, 4);
      b.box('stone', xm - 0.7, H + 3, z1 - 1.2, xm + 0.7, H + 6.5, z1 - 0.2, col, 2);
      b.prism('stone', xm, z1 - 0.7, 1.0, 0.05, H + 6.5, H + 8.5, 4, col, 2, true, Math.PI / 4);
      b.quadF('glass', [xm - 0.6, 2.6, z1 + 0.04], [xm + 0.6, 2.6, z1 + 0.04], [xm + 0.6, 5, z1 + 0.04], [xm - 0.6, 5, z1 + 0.04], [0, 0, 1], [0.7, 0.7, 0.7], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      b.quadF('door', [x0 + 1.2, 0, z1 + 0.04], [x0 + 2.6, 0, z1 + 0.04], [x0 + 2.6, 2.4, z1 + 0.04], [x0 + 1.2, 2.4, z1 + 0.04], [0, 0, 1], [0.8, 0.8, 0.8], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      lights.push({ x: x0 + 1.9, y: 2.9, z: z1 + 0.4, c: [0.6, 0.8, 1.0], p: 0.9, flick: 0.3, kind: 'lantern' }); glows.push({ x: x0 + 3, y: 2.8, z: z1 + 0.4, c: [0.5, 0.7, 1], s: 1 });
    }
    { const c = L.crypt; const x0 = c.i0 * CS + 0.7, z0 = c.j0 * CS + 0.7, x1 = (c.i1 + 1) * CS - 0.7, z1 = (c.j1 + 1) * CS, b = B(x0, z0);
      const col = [0.6, 0.62, 0.58], xm = (x0 + x1) / 2;
      b.box('stone', x0, 0, z0, x1, 3.2, z1 - 0.2, col, 3, 'b');
      b.box('stone', x0 - 0.2, 3.2, z0 - 0.2, x1 + 0.2, 3.5, z1, col, 2);
      b.triF('stone', [x0 - 0.2, 3.5, z1], [x1 + 0.2, 3.5, z1], [xm, 4.8, z1], [0, 0, 1], col, 3);
      b.quadF('stone', [x1 + 0.2, 3.5, z1], [x1 + 0.2, 3.5, z0 - 0.2], [xm, 4.8, z0 - 0.2], [xm, 4.8, z1], [1, 1, 0], col);
      b.quadF('stone', [x0 - 0.2, 3.5, z0 - 0.2], [x0 - 0.2, 3.5, z1], [xm, 4.8, z1], [xm, 4.8, z0 - 0.2], [-1, 1, 0], col);
      for (const dx of [-1, 1]) b.prism('stone', xm + dx * 1.1, z1 - 0.1, 0.22, 0.22, 0, 3.2, 8, [0.75, 0.75, 0.72], 2);
      b.quadF('iron', [xm - 0.7, 0, z1 - 0.18], [xm + 0.7, 0, z1 - 0.18], [xm + 0.7, 2.4, z1 - 0.18], [xm - 0.7, 2.4, z1 - 0.18], [0, 0, 1], [0.35, 0.35, 0.35]);
    }
  }

  /* ---------------- props ---------------- */
  function propMesh(b, p, era, R, lights, glows) {
    const { x, z } = p, yaw = p.yaw || 0;
    const w = [0.8, 0.72, 0.64];
    switch (p.kind) {
      case 'barrel': barrel(b, x, z, 0); break;
      case 'barrels': barrel(b, x - 0.35, z, 0); barrel(b, x + 0.4, z + 0.2, 0); barrel(b, x, z - 0.1, 0.95); break;
      case 'crate': b.obox('wood', x, 0.4, z, 0.4, 0.4, 0.4, yaw, w, 0.8); break;
      case 'crates': b.obox('wood', x - 0.3, 0.4, z, 0.4, 0.4, 0.4, yaw, w, 0.8); b.obox('wood', x + 0.45, 0.35, z + 0.2, 0.35, 0.35, 0.35, yaw + 0.4, w, 0.8); b.obox('wood', x - 0.2, 1.1, z + 0.05, 0.3, 0.3, 0.3, yaw + 0.2, w, 0.8); break;
      case 'sacks': for (let k = 0; k < 3; k++) b.obox('cloth', x + (k - 1) * 0.42, 0.25, z + (k % 2) * 0.1, 0.22, 0.25, 0.3, yaw + k * 0.3, [0.55, 0.45, 0.32], 0.5); break;
      case 'hay': b.obox('thatch', x, 0.45, z, 0.7, 0.45, 0.45, yaw, [0.9, 0.85, 0.7], 1); break;
      case 'wheel': {
        // leaning cart-wheel, as in any London lane
        const sd = p.side || 0, nx = [0, 1, 0, -1][sd], nz = [-1, 0, 1, 0][sd];
        const cx = x + nx * 0.45, cz = z + nz * 0.45;
        const ax = -nz, az = nx; const r = 0.62;
        for (let k = 0; k < 12; k++) {
          const a0 = k / 12 * 6.283, a1 = (k + 1) / 12 * 6.283;
          const P = a => [cx + ax * Math.cos(a) * r - nx * Math.sin(a) * r * 0.25 * 0 - nx * (Math.sin(a) * r + r) * 0.22, 0.02 + r + Math.sin(a) * r, cz + az * Math.cos(a) * r - nz * (Math.sin(a) * r + r) * 0.22];
          b.beam('wood', P(a0), P(a1), nx, nz, 0.09, 0.06, [0.7, 0.55, 0.4]);
          if (k % 2 === 0) b.beam('wood', P(a0), [cx - nx * r * 0.22, r, cz - nz * r * 0.22], nx, nz, 0.05, 0.04, [0.65, 0.5, 0.36]);
        }
        break;
      }
      case 'well': {
        b.prism('stone', x, z, 1.0, 1.0, 0, 0.9, 10, [0.75, 0.75, 0.7], 2);
        b.prism('water', x, z, 0.8, 0.8, 0.5, 0.52, 10, [0.4, 0.4, 0.4]);
        for (const dx of [-0.95, 0.95]) b.box('timber', x + dx - 0.08, 0, z - 0.08, x + dx + 0.08, 2.5, z + 0.08, [0.8, 0.8, 0.8]);
        b.box('timber', x - 1.05, 2.1, z - 0.06, x + 1.05, 2.22, z + 0.06, [0.8, 0.8, 0.8]);
        b.quadF(era === 'medieval' ? 'thatch' : 'roof', [x - 1.3, 2.2, z + 0.9], [x + 1.3, 2.2, z + 0.9], [x + 1.3, 3.1, z], [x - 1.3, 3.1, z], [0, 1, 1], [0.9, 0.8, 0.8]);
        b.quadF(era === 'medieval' ? 'thatch' : 'roof', [x + 1.3, 2.2, z - 0.9], [x - 1.3, 2.2, z - 0.9], [x - 1.3, 3.1, z], [x + 1.3, 3.1, z], [0, 1, -1], [0.9, 0.8, 0.8]);
        b.prism('wood', x + 0.2, z, 0.14, 0.14, 1.3, 1.6, 6, [0.6, 0.5, 0.4]);
        break;
      }
      case 'stall': {
        const c = [[0.8, 0.2, 0.18], [0.3, 0.35, 0.6], [0.7, 0.6, 0.3], [0.3, 0.5, 0.3], [0.6, 0.3, 0.5]][Math.floor(WU.hash2(x | 0, z | 0) * 5)];
        const cs = Math.cos(yaw), sn = Math.sin(yaw);
        const P = (u, y, v) => [x + u * cs + v * sn, y, z - u * sn + v * cs];
        b.obox('wood', x, 0.45, z, 1.2, 0.45, 0.5, yaw, [0.7, 0.6, 0.5], 1);
        for (const [u, v] of [[-1.2, -0.6], [1.2, -0.6], [-1.2, 0.8], [1.2, 0.8]]) { const q = P(u, 0, v); b.box('timber', q[0] - 0.06, 0, q[2] - 0.06, q[0] + 0.06, v > 0 ? 2.1 : 2.5, q[2] + 0.06, [0.8, 0.8, 0.8]); }
        b.quadF('cloth', P(-1.35, 2.5, -0.75), P(1.35, 2.5, -0.75), P(1.35, 2.05, 0.95), P(-1.35, 2.05, 0.95), [0, 1, 0], c);
        for (let k = 0; k < 5; k++) { const q = P(-0.9 + k * 0.45, 0.95, 0); b.obox(k % 2 ? 'cloth' : 'wood', q[0], q[1], q[2], 0.16, 0.08, 0.16, yaw + k, k % 2 ? [0.7, 0.5, 0.3] : [0.6, 0.4, 0.3], 0.3); }
        break;
      }
      case 'cross': {
        const col = [0.8, 0.8, 0.74];
        b.prism('stone', x, z, 1.3, 1.3, 0, 0.5, 8, col, 2, true, Math.PI / 8);
        b.prism('stone', x, z, 0.9, 0.9, 0.5, 1.0, 8, col, 2, true, Math.PI / 8);
        b.prism('stone', x, z, 0.55, 0.45, 1, 5.5, 8, col, 2, false, Math.PI / 8);
        b.prism('stone', x, z, 0.7, 0.7, 5.5, 6, 8, col, 2, true, Math.PI / 8);
        for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + Math.PI / 8; b.prism('stone', x + Math.cos(a) * 0.5, z + Math.sin(a) * 0.5, 0.1, 0.02, 6, 7.3, 4, col, 1); }
        b.prism('stone', x, z, 0.4, 0.05, 6, 9, 8, col, 2, true, Math.PI / 8);
        b.box('stone', x - 0.06, 9, z - 0.06, x + 0.06, 9.9, z + 0.06, col); b.box('stone', x - 0.3, 9.45, z - 0.06, x + 0.3, 9.58, z + 0.06, col);
        break;
      }
      case 'cart': {
        b.obox('wood', x, 0.9, z, 1.2, 0.1, 0.75, yaw, [0.7, 0.6, 0.5], 1);
        b.obox('wood', x, 1.2, z + Math.cos(yaw) * 0.72, 1.2, 0.3, 0.04, yaw, [0.65, 0.55, 0.45], 1);
        b.obox('wood', x, 1.2, z - Math.cos(yaw) * 0.72, 1.2, 0.3, 0.04, yaw, [0.65, 0.55, 0.45], 1);
        for (const s of [-1, 1]) { const wx = x + Math.sin(yaw) * 0.85 * s, wz = z + Math.cos(yaw) * 0.85 * s; b.prism('wood', wx, wz, 0.5, 0.5, 0.3, 0.4, 10, [0.55, 0.45, 0.35]); }
        const hx = x + Math.cos(yaw) * 2.2, hz = z - Math.sin(yaw) * 2.2;
        b.beam('wood', [x + Math.cos(yaw) * 1.1, 0.9, z - Math.sin(yaw) * 1.1], [hx, 0.2, hz], 0, 1, 0.1, 0.05, [0.6, 0.5, 0.4]);
        b.obox('thatch', x, 1.3, z, 0.9, 0.3, 0.55, yaw, [0.9, 0.85, 0.7], 1);
        break;
      }
      case 'puddle': {
        const s = p.s; const n = 9;
        for (let k = 0; k < n; k++) {
          const a0 = k / n * 6.283, a1 = (k + 1) / n * 6.283;
          const r0 = s * (0.7 + WU.hash2(k, x | 0, 5) * 0.4), r1 = s * (0.7 + WU.hash2(k + 1 === n ? 0 : k + 1, x | 0, 5) * 0.4);
          b.tri('puddle', [x, 0.02, z], [x + Math.cos(a1) * r1, 0.02, z + Math.sin(a1) * r1], [x + Math.cos(a0) * r0, 0.02, z + Math.sin(a0) * r0], null, [1, 1, 1]);
        }
        break;
      }
      case 'laundry': {
        const h = 5.2 + WU.hash2(x | 0, z | 0) * 1.5;
        const ax = p.axis === 'x';
        const e0 = ax ? [x - 2, h, z] : [x, h, z - 2], e1 = ax ? [x + 2, h, z] : [x, h, z + 2];
        b.beam('iron', e0, [(e0[0] + e1[0]) / 2, h - 0.35, (e0[2] + e1[2]) / 2], ax ? 0 : 1, ax ? 1 : 0, 0.03, 0, [0.4, 0.4, 0.4]);
        b.beam('iron', [(e0[0] + e1[0]) / 2, h - 0.35, (e0[2] + e1[2]) / 2], e1, ax ? 0 : 1, ax ? 1 : 0, 0.03, 0, [0.4, 0.4, 0.4]);
        for (let k = 0; k < 4; k++) {
          const t = 0.15 + k * 0.2 + WU.hash2(k, x | 0, 9) * 0.05, sag = 0.35 * (1 - Math.abs(t - 0.5) * 2);
          const cx = e0[0] + (e1[0] - e0[0]) * t, cz = e0[2] + (e1[2] - e0[2]) * t, cy = h - sag - 0.02;
          const ww = 0.3 + WU.hash2(k, z | 0, 4) * 0.3, hh = 0.5 + WU.hash2(k, x | 0, 3) * 0.6;
          const c = [[0.8, 0.78, 0.7], [0.6, 0.2, 0.18], [0.5, 0.5, 0.55], [0.7, 0.65, 0.5]][k];
          if (ax) b.quad('cloth', [cx - ww, cy - hh, cz], [cx + ww, cy - hh, cz], [cx + ww, cy, cz], [cx - ww, cy, cz], null, c);
          else b.quad('cloth', [cx, cy - hh, cz - ww], [cx, cy - hh, cz + ww], [cx, cy, cz + ww], [cx, cy, cz - ww], null, c);
        }
        break;
      }
      case 'headstone': {
        const c = [0.62 + WU.hash2(x | 0, z | 0) * 0.2, 0.64, 0.6];
        const h = 0.7 + WU.hash2(z | 0, x | 0) * 0.5;
        b.obox('grave', x, h / 2 - 0.05, z, 0.32, h / 2, 0.08, yaw + (p.tilt || 0), c, 0.8);
        b.prism('grave', x, z, 0.32, 0.3, h - 0.05, h + 0.12, 6, c, 1, true);
        b.obox('grass', x, 0.04, z + 0.9, 0.35, 0.06, 0.8, yaw, [0.8, 0.7, 0.6], 1);
        break;
      }
      case 'cross_': break;
      case 'tomb': {
        const c = [0.62, 0.64, 0.6];
        b.obox('grave', x, 0.45, z, 0.6, 0.45, 1.1, yaw, c, 1);
        b.obox('grave', x, 0.95, z, 0.7, 0.06, 1.2, yaw, c, 1);
        break;
      }
      case 'tree': {
        const s = p.s || 1;
        b.prism('bark', x, z, 0.32 * s, 0.14 * s, 0, 4.5 * s, 6, [0.8, 0.75, 0.7], 1.2, false);
        const Rt = WU.rng((x * 100 + z) | 0);
        const branches = [];
        for (let k = 0; k < 6; k++) {
          const a = Rt() * 6.283, h0 = (2.2 + Rt() * 2.2) * s, L = (1.6 + Rt() * 1.8) * s;
          const e = [x + Math.cos(a) * L, h0 + (0.6 + Rt()) * s, z + Math.sin(a) * L];
          b.beam('bark', [x, h0, z], e, Math.cos(a + 1.57), Math.sin(a + 1.57), 0.16 * s, 0.1, [0.75, 0.7, 0.65]);
          const e2 = [e[0] + Math.cos(a + 0.6) * L * 0.5, e[1] + 0.5 * s, e[2] + Math.sin(a + 0.6) * L * 0.5];
          b.beam('bark', e, e2, Math.cos(a + 1.57), Math.sin(a + 1.57), 0.08 * s, 0.05, [0.75, 0.7, 0.65]);
          branches.push(e, e2);
        }
        if (!p.dead) {
          for (const e of branches) {
            const r = (0.9 + Rt() * 0.8) * s;
            const tint = [0.75 + Rt() * 0.4, 0.7 + Rt() * 0.3, 0.7];
            b.quad('leaves', [e[0] - r, e[1] - r, e[2]], [e[0] + r, e[1] - r, e[2]], [e[0] + r, e[1] + r, e[2]], [e[0] - r, e[1] + r, e[2]], null, tint);
            b.quad('leaves', [e[0], e[1] - r, e[2] - r], [e[0], e[1] - r, e[2] + r], [e[0], e[1] + r, e[2] + r], [e[0], e[1] + r, e[2] - r], null, tint);
            b.quad('leaves', [e[0] - r, e[1] + r * 0.2, e[2] - r], [e[0] + r, e[1] + r * 0.2, e[2] - r], [e[0] + r, e[1] + r * 0.2, e[2] + r], [e[0] - r, e[1] + r * 0.2, e[2] + r], null, tint);
          }
        }
        break;
      }
      case 'ship': {
        const cx = x, cz = z + 1.5;
        b.obox('wood', cx, -0.2, cz, 6.5, 1.2, 1.9, 0, [0.5, 0.4, 0.32], 1.5);
        b.obox('wood', cx, 1.15, cz, 6.2, 0.15, 1.7, 0, [0.62, 0.5, 0.4], 1.5);
        b.obox('wood', cx - 5.5, 1.9, cz, 1.2, 0.8, 1.7, 0, [0.5, 0.4, 0.32], 1.5);
        b.beam('wood', [cx + 6.3, 1.0, cz], [cx + 9.3, 2.4, cz], 0, 1, 0.16, 0.08, [0.5, 0.4, 0.3]);
        for (const mx of [-2.2, 1.8]) {
          b.prism('timber', cx + mx, cz, 0.18, 0.1, 1.2, 14, 6, [0.9, 0.9, 0.9]);
          b.beam('timber', [cx + mx, 10, cz - 3], [cx + mx, 10, cz + 3], 1, 0, 0.14, 0.06, [0.9, 0.9, 0.9]);
          b.beam('timber', [cx + mx, 6, cz - 3.4], [cx + mx, 6, cz + 3.4], 1, 0, 0.16, 0.06, [0.9, 0.9, 0.9]);
          b.quad('cloth', [cx + mx + 0.2, 6.2, cz - 3], [cx + mx + 0.2, 6.2, cz + 3], [cx + mx + 0.2, 9.8, cz + 2.7], [cx + mx + 0.2, 9.8, cz - 2.7], null, [0.55, 0.5, 0.42]);
          b.beam('iron', [cx + mx, 14, cz], [cx + 6.3, 1.3, cz], 0, 1, 0.03, 0, [0.3, 0.3, 0.3]);
          b.beam('iron', [cx + mx, 14, cz], [cx - 6.3, 1.3, cz], 0, 1, 0.03, 0, [0.3, 0.3, 0.3]);
        }
        lights.push({ x: cx - 5.8, y: 3.2, z: cz, c: [1, 0.6, 0.3], p: 0.9, flick: 0.2, kind: 'lantern' }); glows.push({ x: cx - 5.8, y: 3.2, z: cz, c: [1, 0.6, 0.3], s: 1 });
        break;
      }
    }
    if (p.kind === 'cross' && !p.big) {
      const c = [0.6, 0.62, 0.58];
      b.obox('grave', x, 0.6, z, 0.07, 0.62, 0.07, yaw + (p.tilt || 0), c, 1);
      b.obox('grave', x, 0.9, z, 0.3, 0.07, 0.07, yaw + (p.tilt || 0), c, 1);
    }
  }
  function barrel(b, x, z, y) {
    b.prism('wood', x, z, 0.36, 0.36, y, y + 0.9, 8, [0.72, 0.6, 0.48], 0.9, true);
    b.prism('iron', x, z, 0.375, 0.375, y + 0.18, y + 0.24, 8, [0.5, 0.5, 0.5], 1, false);
    b.prism('iron', x, z, 0.375, 0.375, y + 0.66, y + 0.72, 8, [0.5, 0.5, 0.5], 1, false);
  }

  /* ---------------- queries ---------------- */
  const cellOf = (x, z) => [Math.floor(x / CS), Math.floor(z / CS)];
  function walkableAt(town, x, z) { const [i, j] = cellOf(x, z); return inb(i, j) && WALKABLE[town.type[idx(i, j)]]; }
  function districtAt(town, x, z) { const [i, j] = cellOf(x, z); if (!inb(i, j)) return 'cheapside'; return DIDS[town.dist[idx(i, j)]]; }

  return { N, CS, T, WALKABLE, DIRS, DIDS, SITES, idx, inb, generate, build, cellOf, walkableAt, districtAt, materials };
})();
