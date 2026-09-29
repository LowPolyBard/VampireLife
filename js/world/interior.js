/* ==========================================================
   CRIMSON CENTURIES — the haven
   A room you can stand in: the coffin, the writing desk, the
   mirror that shows nothing, and whoever waits for you.
   ========================================================== */

const HAVEN = (() => {
  const OX = -600, OZ = 0; // the haven sits far outside the city
  let group = null;
  const state = { items: [], lights: [], colliders: [], bounds: null, spawn: null, figures: [] };

  const LAYOUT = [
    { w: 8, d: 11, h: 3.4, wall: 'stone', floor: 'flag', vault: true, name: 'crypt' },
    { w: 9, d: 9, h: 3.2, wall: 'brick', floor: 'flag', vault: true, name: 'cellar' },
    { w: 9, d: 10, h: 3.6, wall: 'plaster', floor: 'wood', panel: true, name: 'townhouse' },
    { w: 12, d: 12, h: 4.6, wall: 'plaster', floor: 'wood', panel: true, name: 'manor' },
    { w: 16, d: 14, h: 7.5, wall: 'stone', floor: 'flag', gothic: true, name: 'hall' },
  ];

  function build(lvl, s, scene) {
    if (group) { scene.remove(group); }
    for (const f of state.figures) scene.remove(f);
    state.items = []; state.lights = []; state.colliders = []; state.figures = [];
    const L = LAYOUT[lvl];
    const b = new WU.Builder();
    const x0 = OX - L.w / 2, x1 = OX + L.w / 2, z0 = OZ - L.d / 2, z1 = OZ + L.d / 2, H = L.h;
    const R = WU.rng(lvl * 97 + (s ? s.turn : 0));
    const wc = [0.7, 0.68, 0.64];
    // floor & ceiling
    b.floor(L.floor, x0, z0, x1, z1, 0, [0.7, 0.66, 0.62], L.floor === 'wood' ? 2 : 3);
    if (L.floor === 'wood') b.floor('cloth', OX - 2.4, OZ - 3, OX + 2.4, OZ + 3, 0.01, [0.42, 0.08, 0.1], 2);
    // walls (facing inward)
    b.wall(L.wall, x0, z0, x1, z0, 0, H, wc, 4); // north wall faces +z
    b.wall(L.wall, x1, z1, x0, z1, 0, H, wc, 4);
    b.wall(L.wall, x1, z0, x1, z1, 0, H, wc, 4);
    b.wall(L.wall, x0, z1, x0, z0, 0, H, wc, 4);
    if (L.panel) {
      b.wall('wood', x0 + 0.02, z0 + 0.02, x1 - 0.02, z0 + 0.02, 0, 1.2, [0.55, 0.4, 0.32], 1.2);
      b.wall('wood', x1 - 0.02, z1 - 0.02, x0 + 0.02, z1 - 0.02, 0, 1.2, [0.55, 0.4, 0.32], 1.2);
      b.wall('wood', x1 - 0.02, z0 + 0.02, x1 - 0.02, z1 - 0.02, 0, 1.2, [0.55, 0.4, 0.32], 1.2);
      b.wall('wood', x0 + 0.02, z1 - 0.02, x0 + 0.02, z0 + 0.02, 0, 1.2, [0.55, 0.4, 0.32], 1.2);
    }
    if (L.vault) {
      // barrel vault
      const n = 8;
      for (let k = 0; k < n; k++) {
        const a0 = k / n * Math.PI, a1 = (k + 1) / n * Math.PI, r = L.w / 2;
        const p = (a, z) => [OX + Math.cos(a) * r, H + Math.sin(a) * 1.6, z];
        b.quadF(L.wall, p(a0, z0), p(a1, z0), p(a1, z1), p(a0, z1), [-Math.cos((a0 + a1) / 2), -1, 0], [0.55, 0.53, 0.5]);
      }
      for (let z = z0 + 2; z < z1; z += 3) for (let k = 0; k < 8; k++) {
        const a0 = k / 8 * Math.PI, a1 = (k + 1) / 8 * Math.PI, r = L.w / 2 - 0.05;
        b.beam('stone', [OX + Math.cos(a0) * r, H + Math.sin(a0) * 1.6, z], [OX + Math.cos(a1) * r, H + Math.sin(a1) * 1.6, z], 0, 1, 0.4, 0.12, [0.6, 0.58, 0.55]);
      }
      b.triF(L.wall, [x0, H, z0], [x1, H, z0], [OX, H + 1.6, z0], [0, 0, 1], wc, 4);
      b.triF(L.wall, [x1, H, z1], [x0, H, z1], [OX, H + 1.6, z1], [0, 0, -1], wc, 4);
    } else {
      b.floor(L.gothic ? 'wood' : 'plaster', x0, z0, x1, z1, H, [0.4, 0.36, 0.34], 3, true);
      for (let x = x0 + 2; x < x1; x += 3) b.box('timber', x - 0.15, H - 0.35, z0, x + 0.15, H, z1, [0.6, 0.6, 0.6], 1);
    }
    if (L.gothic) {
      for (const zz of [z0 + 3.5, z0 + 7, z0 + 10.5]) for (const xx of [x0 + 3, x1 - 3]) { b.prism('stone', xx, zz, 0.45, 0.4, 0, H, 8, [0.62, 0.6, 0.58], 2, false); state.colliders.push({ x: xx, z: zz, r: 0.6 }); }
      for (let z = z0 + 2; z < z1 - 1; z += 3.5) {
        b.quadF('glass', [x0 + 0.03, 2.5, z], [x0 + 0.03, 2.5, z + 1.4], [x0 + 0.03, 6.3, z + 1.4], [x0 + 0.03, 6.3, z], [1, 0, 0], [0.8, 0.8, 0.8], [[0, 0], [1, 0], [1, 2], [0, 2]]);
        b.quadF('glass', [x1 - 0.03, 2.5, z + 1.4], [x1 - 0.03, 2.5, z], [x1 - 0.03, 6.3, z], [x1 - 0.03, 6.3, z + 1.4], [-1, 0, 0], [0.8, 0.8, 0.8], [[0, 0], [1, 0], [1, 2], [0, 2]]);
      }
    }
    if (lvl === 0) {
      // bone niches
      for (let z = z0 + 1; z < z1 - 1; z += 1.4) for (const [xx, nx] of [[x0, 1], [x1, -1]]) for (let y = 0.4; y < 2.6; y += 0.8) {
        b.box('grave', nx > 0 ? xx : xx - 0.5, y, z, nx > 0 ? xx + 0.5 : xx, y + 0.08, z + 1.1, [0.5, 0.48, 0.44], 1);
        for (let k = 0; k < 3; k++) b.obox('cloth', xx + nx * 0.25, y + 0.14, z + 0.2 + k * 0.35, 0.09, 0.06, 0.09, R() * 3, [0.85, 0.8, 0.66], 0.3);
      }
    }

    // door (south wall), the way back out
    const dz = z1 - 0.05;
    b.quadF('door', [OX - 0.7, 0, dz], [OX + 0.7, 0, dz], [OX + 0.7, 2.4, dz], [OX - 0.7, 2.4, dz], [0, 0, -1], [0.8, 0.8, 0.8], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    if (s && s.upgrades.doors) for (const y of [0.4, 1.2, 2.0]) b.box('iron', OX - 0.72, y, dz - 0.06, OX + 0.72, y + 0.1, dz, [0.5, 0.5, 0.5]);
    state.items.push({ kind: 'exit', x: OX, z: dz - 0.6, name: 'Go out into the night' });

    // coffin / sarcophagus against the north wall
    const cz = z0 + 1.6;
    if (s && s.upgrades.sarcophagus) {
      b.box('stone', OX - 0.7, 0, cz - 1.2, OX + 0.7, 0.9, cz + 1.2, [0.62, 0.6, 0.58], 1);
      b.box('stone', OX - 0.8, 0.9, cz - 1.3, OX + 0.8, 1.05, cz + 1.3, [0.7, 0.68, 0.64], 1);
    } else {
      b.box('wood', OX - 0.5, 0.4, cz - 1.1, OX + 0.5, 0.95, cz + 1.1, [0.35, 0.22, 0.18], 1);
      b.box('wood', OX - 0.55, 0.95, cz - 1.15, OX + 0.55, 1.05, cz + 1.15, [0.3, 0.18, 0.14], 1);
      b.box('stone', OX - 0.7, 0, cz - 1.3, OX + 0.7, 0.4, cz + 1.3, [0.6, 0.58, 0.55], 1);
    }
    state.colliders.push({ x: OX, z: cz, r: 1.3 });
    state.items.push({ kind: 'coffin', x: OX, z: cz + 1.5, name: 'Your coffin' });
    // candelabra either side
    for (const dx of [-1.3, 1.3]) {
      b.prism('iron', OX + dx, cz, 0.04, 0.04, 0, 1.3, 5, [0.6, 0.55, 0.4]);
      b.prism('iron', OX + dx, cz, 0.22, 0.2, 0, 0.06, 6, [0.6, 0.55, 0.4]);
      for (const o of [-0.15, 0, 0.15]) b.prism('cloth', OX + dx + o, cz, 0.03, 0.03, 1.3, 1.45, 5, [0.95, 0.9, 0.8]);
      state.lights.push({ x: OX + dx, y: 1.6, z: cz, c: [1, 0.6, 0.3], p: 1.0, flick: 0.25 });
    }

    // writing desk (west wall)
    const kx = x0 + 1.0, kz = OZ + (L.d > 10 ? 1 : 0.5);
    b.box('wood', kx - 0.5, 0.75, kz - 0.9, kx + 0.5, 0.82, kz + 0.9, [0.5, 0.36, 0.26], 1);
    for (const [ox, oz] of [[-0.42, -0.8], [0.42, -0.8], [-0.42, 0.8], [0.42, 0.8]]) b.box('wood', kx + ox - 0.04, 0, kz + oz - 0.04, kx + ox + 0.04, 0.75, kz + oz + 0.04, [0.4, 0.28, 0.2], 1);
    b.obox('cloth', kx, 0.84, kz - 0.2, 0.22, 0.02, 0.3, 0.2, [0.85, 0.8, 0.66], 0.4);
    b.prism('cloth', kx + 0.2, kz + 0.5, 0.04, 0.04, 0.82, 1.0, 5, [0.95, 0.9, 0.8]);
    state.lights.push({ x: kx + 0.2, y: 1.15, z: kz + 0.5, c: [1, 0.62, 0.32], p: 0.8, flick: 0.3 });
    state.colliders.push({ x: kx, z: kz, r: 0.9 });
    state.items.push({ kind: 'desk', x: kx + 1.1, z: kz, name: 'Your writing desk' });

    // mirror (east wall) that reflects nothing
    const mx = x1 - 0.06, mz = OZ + 0.5;
    b.quadF('iron', [mx, 0.6, mz - 0.6], [mx, 0.6, mz + 0.6], [mx, 2.4, mz + 0.6], [mx, 2.4, mz - 0.6], [-1, 0, 0], [0.35, 0.3, 0.2]);
    b.quadF('puddle', [mx - 0.02, 0.7, mz - 0.5], [mx - 0.02, 0.7, mz + 0.5], [mx - 0.02, 2.3, mz + 0.5], [mx - 0.02, 2.3, mz - 0.5], [-1, 0, 0], [1, 1, 1]);
    state.items.push({ kind: 'mirror', x: mx - 1.0, z: mz, name: 'A tall mirror' });

    // upgrades made physical
    if (s) {
      if (s.upgrades.library) {
        for (let k = 0; k < 2; k++) {
          const bx = x0 + 0.25, bz = z1 - 2.5 - k * 1.4;
          b.box('wood', bx, 0, bz - 0.6, bx + 0.5, 2.4, bz + 0.6, [0.4, 0.28, 0.2], 1);
          for (let y = 0.3; y < 2.3; y += 0.45) for (let q = -0.5; q < 0.5; q += 0.12) b.box('cloth', bx + 0.05, y, bz + q, bx + 0.45, y + 0.3 + R() * 0.08, bz + q + 0.1, [[0.5, 0.1, 0.1], [0.2, 0.25, 0.4], [0.4, 0.34, 0.2], [0.15, 0.3, 0.2]][(R() * 4) | 0], 0.3);
        }
        state.colliders.push({ x: x0 + 0.5, z: z1 - 3.2, r: 1.4 });
        state.items.push({ kind: 'library', x: x0 + 1.4, z: z1 - 3.2, name: 'The occult library' });
      }
      if (s.upgrades.cellar) {
        for (let k = 0; k < 6; k++) { const jx = x1 - 0.4, jz = z1 - 1 - k * 0.45; b.prism('cloth', jx, jz, 0.16, 0.12, 0, 0.5, 6, [0.4, 0.08, 0.08], 0.3); }
        state.items.push({ kind: 'cellar', x: x1 - 1.3, z: z1 - 2.1, name: 'Stoppered jars of blood' });
      }
      if (s.upgrades.chapel) {
        const ax = x1 - 0.6, az = z0 + 1.2;
        b.box('stone', ax - 0.4, 0, az - 0.6, ax + 0.4, 1.0, az + 0.6, [0.7, 0.68, 0.64], 1);
        b.box('iron', ax - 0.03, 1.0, az - 0.03, ax + 0.03, 1.6, az + 0.03, [0.8, 0.7, 0.4]); b.box('iron', ax - 0.03, 1.35, az - 0.2, ax + 0.03, 1.42, az + 0.2, [0.8, 0.7, 0.4]);
        state.lights.push({ x: ax, y: 1.3, z: az, c: [1, 0.7, 0.4], p: 0.6, flick: 0.2 });
        state.items.push({ kind: 'chapel', x: ax - 1.1, z: az, name: 'The chapel of memory' });
      }
      if (s.upgrades.gallery) for (let k = 0; k < 3; k++) { const pz = z0 + 3 + k * 2.4; b.quadF('sign' + (k + 2), [x0 + 0.04, 1.4, pz], [x0 + 0.04, 1.4, pz + 1.2], [x0 + 0.04, 2.8, pz + 1.2], [x0 + 0.04, 2.8, pz], [1, 0, 0], [0.8, 0.8, 0.8], [[0, 0], [1, 0], [1, 1], [0, 1]]); }
    }
    // fireplace in the better houses
    if (lvl >= 2) {
      const fx = x1 - 0.4, fz = z0 + 3.4;
      b.box('stone', fx - 0.4, 0, fz - 1.1, fx + 0.4, 1.5, fz - 0.8, [0.6, 0.58, 0.55], 1);
      b.box('stone', fx - 0.4, 0, fz + 0.8, fx + 0.4, 1.5, fz + 1.1, [0.6, 0.58, 0.55], 1);
      b.box('stone', fx - 0.5, 1.5, fz - 1.2, fx + 0.4, 1.7, fz + 1.2, [0.62, 0.6, 0.56], 1);
      b.box('stone', fx - 0.4, 1.7, fz - 0.9, fx + 0.4, H, fz + 0.9, [0.56, 0.54, 0.5], 2);
      state.lights.push({ x: fx - 0.5, y: 0.6, z: fz, c: [1, 0.45, 0.15], p: 1.7, flick: 0.45, fire: true });
      state.colliders.push({ x: fx, z: fz, r: 1.1 });
    }
    // a chandelier in grand rooms
    if (lvl >= 3) {
      b.prism('iron', OX, OZ, 1.0, 1.0, H - 1.6, H - 1.5, 10, [0.6, 0.5, 0.3], 1, false);
      for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; b.prism('cloth', OX + Math.cos(a), OZ + Math.sin(a), 0.03, 0.03, H - 1.5, H - 1.35, 4, [0.95, 0.9, 0.8]); }
      b.beam('iron', [OX, H, OZ], [OX, H - 1.5, OZ], 1, 0, 0.03, 0, [0.4, 0.4, 0.4]);
      state.lights.push({ x: OX, y: H - 1.2, z: OZ, c: [1, 0.7, 0.4], p: 1.3, flick: 0.12 });
    }
    // ambient clutter
    for (let k = 0; k < 4 + lvl; k++) {
      const px = x0 + 0.6 + R() * (L.w - 1.2), pz = z0 + 3.5 + R() * (L.d - 5.5);
      if (Math.abs(px - OX) < 1.4) continue;
      if (lvl <= 1) { b.prism('wood', px, pz, 0.35, 0.35, 0, 0.9, 8, [0.6, 0.5, 0.4]); state.colliders.push({ x: px, z: pz, r: 0.4 }); }
      else { b.box('wood', px - 0.3, 0, pz - 0.3, px + 0.3, 0.5, pz + 0.3, [0.5, 0.35, 0.28], 1); b.box('wood', px - 0.3, 0.5, pz + 0.22, px + 0.3, 1.1, pz + 0.3, [0.5, 0.35, 0.28], 1); state.colliders.push({ x: px, z: pz, r: 0.4 }); }
    }

    group = b.build(TOWN_MATS());
    scene.add(group);

    // the people of your household
    if (s) {
      const people = [];
      const lv = s.circle.find(c => c.alive && c.kind === 'lover');
      if (lv) people.push({ kind: 'lover', c: lv, x: OX + 1.6, z: OZ + 1.8 });
      s.circle.filter(c => c.alive && c.kind === 'ghoul').forEach((g, i) => people.push({ kind: 'ghoul', c: g, x: OX + (i % 2 ? 1.5 : -1.5), z: z1 - 1.4 - Math.floor(i / 2) * 1.1 }));
      s.circle.filter(c => c.alive && c.kind === 'childe').forEach((g, i) => people.push({ kind: 'childe', c: g, x: OX - 2.4 + i * 0.9, z: OZ - 1.4 }));
      if (s.herd > 0) people.push({ kind: 'herd', x: x0 + 1.2, z: z1 - 1.3 });
      for (const p of people) {
        const vv = { oid: p.c && p.c.occ ? (Object.keys(DATA.OCC).find(k => DATA.OCC[k].n === p.c.occ) || 'merchant') : p.kind === 'herd' ? 'drunk' : 'lady', cls: p.kind === 'childe' ? 'high' : 'mid', g: R() < 0.5 ? 'f' : 'm' };
        const a = PEOPLE.appearance(vv, s.eraId, R);
        if (p.kind === 'childe') { a.skin = 0xd8d0d0; a.coat = 0x1a0c10; }
        if (p.kind === 'lover') { a.lantern = false; }
        a.lantern = false;
        const f = PEOPLE.figure(a);
        f.root.position.set(p.x, 0, p.z);
        f.root.rotation.y = Math.atan2(OX - p.x, OZ - p.z);
        if (p.kind === 'herd') { f.body.position.y = -0.45; f.legL.rotation.x = -1.5; f.legR.rotation.x = -1.5; f.body.rotation.x = 0.2; }
        scene.add(f.root); state.figures.push(f.root);
        state.colliders.push({ x: p.x, z: p.z, r: 0.4 });
        const nm = p.c ? p.c.name : 'Your herd';
        state.items.push({ kind: p.kind, x: p.x, z: p.z, name: p.kind === 'herd' ? `Your herd (${s.herd})` : p.kind === 'ghoul' ? `${nm}, your ${DATA.ROLES[p.c.role].name.toLowerCase()}` : p.kind === 'lover' ? nm : `${nm}, your childe`, c: p.c, fig: f });
      }
    }

    state.bounds = { x0: x0 + 0.35, x1: x1 - 0.35, z0: z0 + 0.35, z1: z1 - 0.35 };
    state.spawn = { x: OX, z: z1 - 1.6, yaw: 0 };
    return state;
  }

  let TOWN_MATS = () => ({});
  return { build, state, OX, OZ, setMats: f => { TOWN_MATS = f; } };
})();
