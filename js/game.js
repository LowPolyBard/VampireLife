/* ==========================================================
   CRIMSON CENTURIES — game engine
   Exposes the global `G` used by data.js events and ui.js.
   ========================================================== */

const G = (() => {
  const SAVE_KEY = 'crimson-centuries-save-v1';
  let s = null;
  const api = {};

  const R = Math.random;
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = a => a[Math.floor(R() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  Object.assign(api, { ri, pick, clamp });
  Object.defineProperty(api, 's', { get: () => s });

  /* ---------------- basic lookups ---------------- */
  const era = () => { let e = DATA.ERAS[0]; for (const x of DATA.ERAS) if (s.year >= x.start) e = x; return e; };
  const eraIdx = () => DATA.ERAS.indexOf(era());
  const m = () => era().money;
  const money = n => Math.round(n * m());
  const dist = id => DATA.DISTRICTS.find(d => d.id === id);
  const distName = id => id === 'haven' ? 'your haven' : id === 'elysium' ? 'Elysium' : dist(id).names[era().id];
  Object.assign(api, { era, eraIdx, m, money, dist, distName });
  api.clan = () => DATA.CLANS.find(c => c.id === s.clan);
  api.origin = () => DATA.ORIGINS.find(o => o.id === s.origin);
  api.rankIdx = () => s.rank;
  api.fname = f => DATA.FACTIONS[f].name;
  api.power = id => s.powers[id] || 0;
  const power = api.power;
  api.an = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
  api.dateStr = () => `${DATA.MONTHS[s.month]} ${s.year}`;
  api.ageYears = () => Math.floor(s.undeadMonths / 12);

  api.attr = k => {
    let v = s.attrs[k];
    if (s.resonance && DATA.HUMOURS[s.resonance.h].attr === k) v += s.resonance.str;
    if (k === 'guile') { if (power('shadowcraft') >= 3) v++; if (power('nightwings') >= 2) v++; }
    if (k === 'might') { if (power('quickening') >= 3) v++; if (power('ironflesh') >= 3) v++; }
    if (k === 'allure') { if (power('majesty') >= 1) v++; if (power('majesty') >= 3) v++; if (s.upgrades.gallery) v++; }
    return v;
  };
  const attr = api.attr;

  api.chance = (stat, diff, extra = 0) => {
    let p = 0.55 + (attr(stat) - diff) * 0.09 + s.potency * 0.015 + extra;
    if (power('mesmerism') >= 3 && stat !== 'might') p += 0.1;
    return clamp(p, 0.05, 0.97);
  };
  api.roll = p => R() < p;

  api.maxHealth = () => 100 + (s.potency - 1) * 10;
  api.maxHours = () => Math.max(4, 8 + DATA.SEASON_HOURS[s.month] + power('quickening'));
  api.dmgRed = () => [0, 0.25, 0.4, 0.55][power('ironflesh')];
  api.hunger = () => 8 + s.potency * 2 + (s.clan === 'vargr' ? 3 : 0);
  api.herdCap = () => DATA.HAVENS[s.haven].herd + holdingFx('herdCap');
  api.ghoulCap = () => DATA.HAVENS[s.haven].ghouls;
  api.cellarCap = () => s.upgrades.cellar ? (power('sanguimancy') >= 2 ? 80 : 40) : 0;
  api.ghouls = () => s.circle.filter(c => c.alive && c.kind === 'ghoul');
  api.ghoulRoom = () => api.ghouls().length < api.ghoulCap();
  api.roleCount = r => api.ghouls().filter(g => g.role === r).length;
  api.childer = () => s.circle.filter(c => c.alive && c.kind === 'childe');
  api.lover = () => s.circle.find(c => c.alive && c.kind === 'lover');
  const holdingFx = k => Object.keys(s.holdings).reduce((a, id) => a + (DATA.HOLDINGS.find(h => h.id === id).fx[k] || 0), 0);
  api.holdingFx = holdingFx;
  api.income = () => {
    const base = Object.keys(s.holdings).reduce((a, id) => a + DATA.HOLDINGS.find(h => h.id === id).inc, 0);
    return Math.round(base * (1 + s.inf.guilds / 200 + Math.min(2, api.roleCount('steward')) * 0.2));
  };
  api.havenDef = () => {
    let d = DATA.HAVENS[s.haven].def * 6;
    if (s.upgrades.doors) d += 12;
    if (s.upgrades.kennels) d += 12;
    if (power('beastcall') >= 3) d += 18;
    d += api.roleCount('guard') * 8 + api.childer().length * 10 + attr('might') * 2;
    return d;
  };
  api.travelCost = target => {
    if (target === s.loc) return 0;
    if (target === 'haven') return power('nightwings') >= 3 ? 0 : 1;
    return power('nightwings') >= 1 ? 0 : 1;
  };
  api.humanityLabel = h => h >= 80 ? 'Humane' : h >= 60 ? 'Haunted' : h >= 40 ? 'Distant' : h >= 20 ? 'Monstrous' : 'The Beast Rises';
  api.suspLabel = v => v < 15 ? 'Unseen' : v < 35 ? 'Whispers' : v < 55 ? 'Rumours' : v < 75 ? 'Outcry' : 'Inquisition';
  api.susFactor = () => (s.flags.gas ? 1.2 : 1) * (s.year <= (s.flags.plagueUntil || 0) ? 0.5 : 1) * (s.flags.fog ? 0.6 : 1);

  /* ---------------- log & helpers for events ---------------- */
  api.log = (text, cls = '') => {
    s.log.unshift({ d: `${DATA.MONTHS[s.month].slice(0, 3)} ${s.year}`, text, cls });
    if (s.log.length > 160) s.log.length = 160;
  };
  api.count = k => { s.counters[k] = (s.counters[k] || 0) + 1; };
  api.giveItem = id => { s.items[id] = (s.items[id] || 0) + 1; api.log(`Acquired: ${DATA.ITEMS[id].name}.`, 'gold'); };
  api.genName = (g) => {
    const n = DATA.NAMES[era().id];
    const gg = g || (R() < 0.5 ? 'f' : 'm');
    return `${pick(n[gg])} ${pick(DATA.NAMES.sur)}`;
  };
  api.genPerson = g => ({ name: api.genName(g), age: ri(19, 34) });
  api.addVictim = v => {
    s.victims.unshift({ name: v.name, occ: v.occ, date: api.dateStr(), where: v.where || '' });
    s.kills++; s.flags.recentKill = s.turn;
  };
  api.victimNames = n => {
    const named = s.victims.filter(v => !v.name.startsWith('a ')).slice(0, n).map(v => v.name);
    if (!named.length) return 'the ones you killed';
    if (named.length === 1) return named[0];
    return named.slice(0, -1).join(', ') + ' and ' + named[named.length - 1];
  };
  api.addCircle = c => {
    const npc = Object.assign({ id: s.nextId++, alive: true, loyalty: 60, since: s.year, lifespan: ri(58, 78), lastSeen: s.turn }, c);
    s.circle.push(npc);
    api.log(`${npc.name} joins your circle${npc.kind === 'ghoul' ? ` as your ${DATA.ROLES[npc.role].name.toLowerCase()}` : npc.kind === 'childe' ? ' as your childe' : ''}.`, 'gold');
    return npc;
  };
  api.addLover = p => api.addCircle({ kind: 'lover', name: p.name, age: p.age, loyalty: 70, desc: 'A mortal who has somehow found their way into your cold heart.' });
  api.recalcPotency = () => {
    const before = s.potency;
    s.potency = clamp(1 + Math.floor(api.ageYears() / 40) + s.potencyBonus, 1, 10);
    return s.potency - before;
  };
  api.spawnHunter = name => {
    s.hunter = { name: name || pick(DATA.HUNTERS[era().id]), level: 1 + eraIdx() + ri(0, 1) + Math.floor(s.potency / 3), threat: 10, progress: 0, known: false };
    api.log(`A hunter has come to London: ${s.hunter.name}.`, 'blood');
    return s.hunter;
  };

  /* ---------------- applying change ---------------- */
  function addBlood(v) {
    if (v <= 0) { s.blood = Math.max(0, s.blood + v); return v; }
    const room = 100 - s.blood, take = Math.min(v, room);
    s.blood += take;
    const over = v - take;
    if (over > 0 && api.cellarCap()) s.cellar = Math.min(api.cellarCap(), s.cellar + over);
    return take;
  }
  api.fx = d => {
    const chips = [];
    if (!d) return chips;
    for (const k of Object.keys(d)) {
      let v = Math.round(d[k]);
      if (!v) continue;
      let real = v;
      switch (k) {
        case 'blood': real = addBlood(v); break;
        case 'health':
          if (v < 0) v = -Math.max(1, Math.round(-v * (1 - api.dmgRed())));
          real = clamp(s.health + v, 0, api.maxHealth()) - s.health; s.health += real; break;
        case 'humanity': real = clamp(s.humanity + v, 0, 100) - s.humanity; s.humanity += real; break;
        case 'gold': real = Math.max(0, s.gold + v) - s.gold; s.gold += real; break;
        case 'susp': real = clamp(s.susp + v, 0, 100) - s.susp; s.susp += real; break;
        case 'essence': real = Math.max(0, s.essence + v) - s.essence; s.essence += real; break;
        case 'prestige':
          if (v > 0) { if (s.clan === 'unclaimed') v = Math.max(1, Math.round(v * 0.67)); if (power('majesty') >= 2) v = Math.round(v * 1.25); }
          real = Math.max(0, s.prestige + v) - s.prestige; s.prestige += real; break;
        case 'herd': real = clamp(s.herd + v, 0, api.herdCap()) - s.herd; s.herd += real; break;
        case 'church': case 'crown': case 'guilds': case 'underworld':
          if (v > 0 && power('majesty') >= 1) v = Math.round(v * 1.25);
          real = clamp(s.inf[k] + v, 0, 100) - s.inf[k]; s.inf[k] += real; break;
        case 'hours': real = clamp(s.hours + v, 0, 24) - s.hours; s.hours += real; break;
        case 'threat': if (!s.hunter) { real = 0; break; } real = Math.max(0, s.hunter.threat + v) - s.hunter.threat; s.hunter.threat += real; break;
        case 'havenLoss':
          real = 0;
          if (s.haven > 0) { s.haven--; real = 1; delete s.upgrades.doors; api.log('Your haven is lost. You retreat to a meaner refuge.', 'blood'); }
          while (api.ghouls().length > api.ghoulCap()) { const g = api.ghouls().pop(); g.alive = false; g.fate = 'dismissed when the haven was lost'; }
          s.herd = Math.min(s.herd, api.herdCap());
          break;
      }
      if (real) chips.push({ k, v: real });
    }
    return chips;
  };

  /* ---------------- new game / save ---------------- */
  api.newGame = o => {
    const clan = DATA.CLANS.find(c => c.id === o.clan), origin = DATA.ORIGINS.find(x => x.id === o.origin);
    s = {
      v: 1, name: o.name, clan: o.clan, origin: o.origin,
      attrs: { ...o.attrs },
      year: 1347, month: 9, turn: 0, undeadMonths: 0,
      hours: 0, loc: 'haven',
      blood: 45, cellar: 0, health: 100, humanity: origin.humanity, essence: 4, gold: origin.gold,
      potency: 1, potencyBonus: 0, susp: 5,
      inf: Object.assign({ church: 5, crown: 5, guilds: 5, underworld: 5 }, {}),
      prestige: 0, rank: 0,
      powers: {}, haven: 0, upgrades: {}, herd: 0, holdings: {},
      circle: [], nextId: 1, hunter: null,
      princeName: DATA.PRINCES.medieval, rival: { name: pick(DATA.RIVALS), standing: 50, power: 5 }, rivalReturn: 0,
      tasks: [], offers: [], counters: {}, items: {}, resonance: null,
      flags: {}, night: {}, histDone: {}, eventsDone: {},
      log: [], victims: [], kills: 0, feeds: 0, ach: {},
      stats: { torpor: 0, huntersSlain: 0, maxGold: 0 },
      eraId: 'medieval', ending: null,
    };
    for (const f of Object.keys(origin.inf)) s.inf[f] += origin.inf[f];
    s.hours = api.maxHours();
    api.log(`${s.name} rises for the first time, ${clan.name}, in the ${DATA.MOONS[s.month]} of 1347.`, 'blood');
    api.save();
    return s;
  };
  api.save = () => { try { if (s && !s.ending) localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ } };
  api.hasSave = () => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };
  api.load = () => { try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); return !!s; } catch (e) { return false; } };
  api.wipe = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } };
  api.savedSummary = () => {
    try { const x = JSON.parse(localStorage.getItem(SAVE_KEY)); return x ? `${x.name} · ${DATA.MONTHS[x.month]} ${x.year}` : ''; } catch (e) { return ''; }
  };

  /* ==================================================================
     Scenes & flow
     ================================================================== */
  // Present an event-style definition ({title, glyph, text, choices[{label, sub, req, chance, cls, run}]})
  function present(def, then, extraCls = '') {
    const text = typeof def.text === 'function' ? def.text(s) : def.text;
    const choices = (def.choices || []).map(c => {
      const ok = !c.req || c.req(s);
      const p = c.chance ? c.chance(s) : null;
      return {
        label: c.label, sub: c.sub, cls: c.cls, chance: p, disabled: !ok,
        onPick: () => {
          const success = p === null ? true : api.roll(p);
          const res = c.run(s, success) || {};
          const chips = api.fx(res.d);
          const after = () => { if (res.next) present(res.next, then, extraCls); else then(); };
          UI.scene({ title: def.title, glyph: def.glyph, text: res.text || '', chips, cls: extraCls,
            outcome: p === null ? null : success, choices: [{ label: 'Continue', onPick: after }] });
        },
      };
    });
    if (!choices.some(c => !c.disabled)) choices.push({ label: 'Continue', onPick: then });
    UI.scene({ title: def.title, glyph: def.glyph, text, choices, cls: extraCls });
  }
  api.present = present;

  function result(r, then) {
    const chips = api.fx(r.d);
    UI.scene({ title: r.title, glyph: r.glyph, text: r.text, chips, outcome: r.ok, cls: r.cls,
      choices: [{ label: 'Continue', onPick: then || (() => postAction(true)) }] });
  }

  function checkFatal() {
    if (s.ending) return true;
    if (s.health <= 0) { ending('slain'); return true; }
    if (s.humanity <= 0) { ending('beast'); return true; }
    return false;
  }

  function postAction(allowEvent) {
    checkAchievements();
    if (checkFatal()) return;
    if (s.blood <= 4 && !s.night.frenzied) { frenzy(() => postAction(false)); return; }
    if (allowEvent && s.loc !== 'haven' && s.loc !== 'elysium' && R() < 0.2) {
      const ev = pickEvent(s.loc);
      if (ev) { present(ev, () => postAction(false)); return; }
    }
    if (s.hours <= 0) {
      if (s.loc === 'haven') endNight();
      else dawnCatches();
      return;
    }
    UI.render();
    api.save();
  }
  api.postAction = postAction;

  function pickEvent(where) {
    const e = era().id;
    const pool = DATA.EVENTS.filter(ev => {
      if (ev.eras && !ev.eras.includes(e)) return false;
      if (ev.once && s.eventsDone[ev.id]) return false;
      if (ev.cond && !ev.cond(s)) return false;
      if (where === 'dusk') return ev.where === 'dusk';
      if (ev.where === 'dusk') return false;
      return ev.where === 'any' || ev.where.includes(where);
    });
    if (!pool.length) return null;
    const total = pool.reduce((a, ev) => a + (ev.weight || 1), 0);
    let r = R() * total;
    for (const ev of pool) { r -= ev.weight || 1; if (r <= 0) { s.eventsDone[ev.id] = true; return ev; } }
    return pool[0];
  }

  /* ==================================================================
     Actions
     ================================================================== */
  const ACT = {
    hunt: { name: 'Hunt', glyph: '☾', hours: 2, desc: 'Stalk the streets for a vessel.' },
    rats: { name: 'Feed on Vermin', glyph: '⁂', hours: 1, desc: 'Rats, strays and crows. Thin blood, but no sin.' },
    swindle: { name: 'Swindle the Merchants', glyph: '⚖', hours: 2, stat: 'guile', diff: 4, desc: 'Clipped coin, loaded scales, a forged bill of exchange.',
      ok: () => ({ text: 'A lord\'s steward buys a "Venetian" ring of painted brass. A money-changer miscounts, and does not notice. Your purse grows heavy.', d: { gold: money(ri(15, 32)), susp: 2 } }),
      fail: () => ({ text: 'The goldsmith bites your coin, then shouts for the watch. You leave at a run, with a cudgel-blow to remember him by.', d: { susp: 6, health: -8 } }) },
    guildhall: { name: 'Court the Guildmasters', glyph: '⚜', hours: 2, stat: 'allure', diff: 4, cost: 10, desc: 'Fine wine and finer flattery for the masters of the livery companies.',
      ok: () => ({ text: 'Over a late supper you listen to the Master of the Mercers complain about his rivals. By the third bottle, he calls you friend.', d: { guilds: ri(6, 10) } }),
      fail: () => ({ text: 'They drink your wine and forget your name.', d: { guilds: 1 } }) },
    rumours: { name: 'Listen for Rumours', glyph: '♪', hours: 1, desc: 'Taverns, fish-stalls and shop doorways. London never stops talking.' },
    gamble: { name: 'Dice in the Stews', glyph: '⚀', hours: 1, desc: 'Wager coin against your Guile. The house always wins — unless the house is you.' },
    cultivate: { name: 'Cultivate a Herd', glyph: '❦', hours: 2, stat: 'allure', diff: 5, desc: 'Seduce mortals into willing, returning vessels.',
      req: () => s.herd < api.herdCap(), reqText: 'Your haven cannot hold a larger herd',
      ok: () => ({ text: 'A lonely widow. A player who has never been adored. They will come to your door again and again, and bare their throats, and thank you.', d: { herd: 1, blood: 6 } }),
      fail: () => ({ text: 'Your hunger shows through the mask. They make excuses and leave quickly.', d: { susp: 2 } }) },
    carouse: { name: 'Carouse with Cutthroats', glyph: '♠', hours: 2, stat: 'might', diff: 3, desc: 'Drink (or pretend to), arm-wrestle and trade favours with the underworld.',
      ok: () => ({ text: 'You break a thief-taker\'s wrist in an arm-wrestle and pay for the next round. The Upright Men of Southwark raise their cups to you.', d: { underworld: ri(6, 9) } }),
      fail: () => ({ text: 'A brawl. Knives. You walk away, but not unmarked.', d: { health: -10, underworld: 2 } }) },
    confess: { name: 'Kneel in the Nave', glyph: '✝', hours: 1, desc: 'Pray among the candles, if you can bear it.' },
    archives: { name: 'Study the Archives', glyph: '☥', hours: 2, stat: 'lore', diff: 3, desc: 'Grimoires, bestiaries and heresies locked away by the clergy.',
      ok: () => { const frag = s.attrs.lore >= 5 && R() < 0.05; if (frag) api.giveItem('golconda');
        return { text: frag ? 'Behind a false shelf, in a book of hours, you find a leaf of vellum in a hand you know from dreams: a fragment of the Golconda Codex.' : 'By a stolen candle, you read of Lilith, of Caine, of the blood that remembers. The knowledge settles into you like sediment.', d: { essence: ri(2, 4) } }; },
      fail: () => ({ text: 'A sacristan catches you among the forbidden books. He will remember your face.', d: { susp: 5, essence: 1 } }) },
    tithe: { name: 'Grease the Clergy\'s Palms', glyph: '✠', hours: 1, cost: 20, desc: 'Donations for a new window, a chantry, a bishop\'s mistress.',
      run: () => ({ text: 'The canons are grateful. Sermons against "night-walkers" are quietly dropped from the lectionary.', d: { church: 6, susp: -8 } }) },
    ball: { name: 'Attend the Revels', glyph: '♛', hours: 3, stat: 'allure', diff: 5, cost: 15, desc: 'Silks, candlelight and a hundred ambitions. The Crown\'s favour is won here.' },
    blackmail: { name: 'Trade in Secrets', glyph: '✉', hours: 2, stat: 'guile', diff: 6, desc: 'Letters, affairs and debts. Every noble has something to hide.',
      ok: () => ({ text: 'A marquess\'s love letters, delivered to the right hands at the right price.', d: { gold: money(ri(40, 85)), crown: -2, underworld: 3 } }),
      fail: () => ({ text: 'Your mark had friends in high places. Doors close to you.', d: { crown: -6, susp: 5 } }) },
    smuggle: { name: 'Run Contraband', glyph: '⚓', hours: 3, stat: 'might', diff: 5, desc: 'Brandy, lace and worse, unloaded under the quays at midnight.',
      ok: () => ({ text: 'The customs cutter never saw you. The casks are ashore by two bells.', d: { gold: money(ri(30, 65)), underworld: 4 } }),
      fail: () => ({ text: 'Revenue men, lanterns and muskets. A ball tears through your shoulder.', d: { health: -16, susp: 5 } }) },
    bribewatch: { name: 'Bribe the Watch', glyph: '⚿', hours: 1, cost: 10, desc: 'The watch sees nothing it is paid not to see.',
      run: () => ({ text: 'A heavy purse. A heavier silence.', d: { susp: -7, underworld: 1 } }) },
    charity: { name: 'Alms for the Wretched', glyph: '☗', hours: 1, cost: 10, desc: 'Bread, blankets and coin for those the city forgot.',
      run: () => ({ text: 'A child eats tonight who would not have. A woman calls you "blessed". The word stings, and heals.', d: { humanity: s.humanity < 60 ? 3 : s.humanity < 80 ? 1 : 0, herd: R() < 0.3 ? 1 : 0 } }) },
    track: { name: 'Hunt the Hunter', glyph: '⌖', hours: 2, stat: 'guile', desc: 'Turn the tables. Find where they sleep.',
      req: () => s.hunter && !s.hunter.known, reqText: 'No unknown hunter to track' },
    commune: { name: 'Commune with the Dead', glyph: '☠', hours: 2, stat: 'lore', diff: 4, desc: 'Sit among the graves and listen to what the dead remember.',
      ok: () => { const frag = s.humanity >= 70 && R() < 0.04; if (frag) api.giveItem('golconda');
        return { text: frag ? 'A voice speaks from beneath a nameless stone — not a ghost, but something older and kinder — and a leaf of vellum rises from the soil: a fragment of the Golconda Codex.' : 'The dead whisper of where they hid their coins, whom they hated and what they saw. You listen, and learn.', d: { essence: ri(3, 5) } }; },
      fail: () => ({ text: 'Something in the grave-dark whispers back, and what it says leaves a mark on your soul.', d: { humanity: -1, essence: 1 } }) },
    dig: { name: 'Rob the Graves', glyph: '⚒', hours: 2, desc: 'Rings, teeth and the odd gold crucifix. The dead do not need them.' },
  };
  api.ACT = ACT;

  function actName(id) {
    if (id === 'ball') return { medieval: 'Feast in the Great Hall', tudor: 'Dance at a Court Masque', georgian: 'Attend a Masquerade', victorian: 'Attend a Society Ball' }[era().id];
    return ACT[id].name;
  }
  api.actName = actName;

  function actionInfo(id, where) {
    const a = ACT[id];
    const travel = api.travelCost(where);
    const hours = a.hours + travel;
    const cost = a.cost ? money(a.cost) : 0;
    let avail = true, reason = '';
    if (s.hours < hours) { avail = false; reason = 'Not enough night left'; }
    else if (cost && s.gold < cost) { avail = false; reason = `Requires £${cost}`; }
    else if (a.req && !a.req()) { avail = false; reason = a.reqText; }
    let chance = null;
    if (id === 'track' && s.hunter) chance = trackChance();
    else if (a.stat && a.diff) chance = api.chance(a.stat, a.diff, id === 'ball' && power('majesty') >= 3 ? 1 : 0);
    const homeCost = power('nightwings') >= 3 ? 0 : 1;
    const strands = avail && where !== 'haven' && s.hours - hours < homeCost;
    return { id, name: actName(id), glyph: a.glyph, desc: a.desc, hours, travel, cost, avail, reason, chance, stat: a.stat, strands };
  }
  api.districtActions = did => dist(did).actions.map(id => actionInfo(id, did));

  function trackChance() {
    return clamp(0.5 + (attr('guile') - (s.hunter.level + 2)) * 0.09 + api.roleCount('spy') * 0.08 + s.inf.underworld / 300, 0.05, 0.95);
  }

  api.doAction = (id, where) => {
    const info = actionInfo(id, where);
    if (!info.avail) return;
    s.hours -= info.hours;
    s.loc = where;
    if (info.cost) s.gold -= info.cost;
    const a = ACT[id];
    const title = info.name, glyph = a.glyph;
    Snd.play('click');
    switch (id) {
      case 'hunt': return startHunt(where);
      case 'rats': {
        const b = ri(6, 10) * (power('beastcall') >= 3 ? 2 : 1);
        s.feeds++;
        return result({ title, glyph, text: 'You crouch in the dark and call softly. They come — rats, a mangy dog, a crow with a broken wing. Their blood is thin and hot and carries no sin.', d: { blood: b } });
      }
      case 'rumours': return rumours(title, glyph);
      case 'gamble': return gamble(title, glyph);
      case 'confess': {
        if (s.humanity < 30) return result({ title, glyph, ok: false, text: 'The moment you cross the threshold, the holy ground rejects you. Your skin blisters. The candles gutter as you flee.', d: { health: -12, susp: 3 } });
        return result({ title, glyph, text: 'Among the guttering candles, you kneel, and try to remember how to pray. The saints look down from the glass with dead, painted eyes. Something in you eases.', d: { humanity: s.humanity < 70 ? 2 : 0, church: 1 } });
      }
      case 'ball': return ball(title, glyph);
      case 'track': return track(title, glyph);
      case 'dig': {
        const item = R() < 0.3 ? pick(['ring', 'ring', 'candle', 'bone']) : null;
        if (item) api.giveItem(item);
        return result({ title, glyph, text: `Lantern shuttered, spade muffled with sacking, you open the ground. Rings, buckles, a gold tooth${item ? ` — and ${DATA.ITEMS[item].name.toLowerCase()}` : ''}. The dead lie open to the moon behind you.`, d: { gold: money(ri(8, 24)), humanity: -1, susp: 2 } });
      }
      default:
        if (a.run) return result({ title, glyph, ...a.run() });
        {
          const p = api.chance(a.stat, a.diff);
          const ok = api.roll(p);
          const r = ok ? a.ok() : a.fail();
          return result({ title, glyph, ok, ...r });
        }
    }
  };

  function rumours(title, glyph) {
    if (s.hunter && !s.hunter.known) {
      const inc = ri(12, 20) + api.roleCount('spy') * 5;
      s.hunter.progress = Math.min(100, s.hunter.progress + inc);
      if (s.hunter.progress >= 100) s.hunter.known = true;
      return result({ title, glyph, text: `A fishwife mentions a stranger asking questions about "the pale folk". A tapster says the stranger lodges ${s.hunter.known ? '<b>— and now you know exactly where.</b>' : 'somewhere near. The trail grows warmer.'}`, d: { underworld: 2 } });
    }
    const r = pick([
      { text: 'A drunken clerk boasts of his master\'s strongbox. You make a note of the address.', d: { gold: money(ri(5, 15)), underworld: 2 } },
      { text: 'Talk of a ghost in the old charnel house — a pale woman seen feeding. Another of your kind, careless. You file the knowledge away.', d: { essence: 2 } },
      { text: 'The guilds are feuding over a bridge toll. Knowing who hates whom is its own kind of wealth.', d: { guilds: 3 } },
      { text: 'Nothing but weather, prices and who is sleeping with whom. Still — it is good to hear living voices.', d: { humanity: 1 } },
      { text: `They say ${s.rival ? s.rival.name : 'a certain Kindred'} was seen leaving a bishop\'s house before dawn. Interesting.`, d: { prestige: 1, crown: 1 } },
    ]);
    return result({ title, glyph, ...r });
  }

  function gamble(title, glyph) {
    const stakes = [10, 40, 150].map(money).filter(v => v <= s.gold);
    const p = clamp(0.4 + attr('guile') * 0.035, 0.4, 0.75);
    UI.scene({
      title, glyph, text: 'Tallow candles, a scarred table, bone dice and men with knives in their boots. How much will you wager?',
      choices: stakes.map(v => ({
        label: `Wager £${v}`, sub: 'double or nothing', chance: p,
        onPick: () => {
          const win = api.roll(p);
          Snd.play(win ? 'coin' : 'fail');
          result({ title, glyph, ok: win, text: win ? 'The dice fall your way. Of course they do — you have been reading the thrower\'s pulse all night.' : 'Snake-eyes. The table laughs. You smile back with rather too many teeth, and they stop laughing.', d: { gold: win ? v : -v } });
        },
      })).concat([{ label: 'Walk away', onPick: () => postAction(false) }]),
    });
  }

  function ball(title, glyph) {
    const p = power('majesty') >= 3 ? 1 : api.chance('allure', s.clan === 'hollow' ? 7 : 5);
    const ok = api.roll(p);
    if (ok && !api.lover() && R() < 0.3) {
      const ev = DATA.EVENTS.find(e => e.id === 'lover_meet');
      api.fx({ crown: ri(6, 9), prestige: 1 });
      return present(ev, () => postAction(false));
    }
    return result({ title, glyph, ok, text: ok ? 'You dance, you flatter, you lose gracefully at cards to a duke. By the small hours, three ministers have invited you to dine.' : 'A lady recoils when your hand brushes hers — so cold! — and the whisper travels the ballroom faster than the music.', d: ok ? { crown: ri(6, 10), prestige: 2 } : { crown: 1, susp: 3 } });
  }

  function track(title, glyph) {
    const h = s.hunter, p = trackChance();
    const ok = api.roll(p);
    if (ok) {
      h.progress = Math.min(100, h.progress + ri(30, 50));
      if (h.progress >= 100) h.known = true;
      return result({ title, glyph, ok, text: h.known ? `You follow ${h.name} through three parishes to a narrow house with garlic on the lintel and holy water on the sill. <b>You know where the hunter sleeps.</b>` : `You find the inn where ${h.name} takes supper, and the chandler who sells them blessed candles. The net closes. (${h.progress}% tracked)`, d: {} });
    }
    return result({ title, glyph, ok, text: 'You follow the wrong trail — or the right one, into a trap. Hawthorn stakes in a dark courtyard. You escape, but they know you are hunting them now.', d: { threat: 10, health: -8 } });
  }

  /* ---------------- the hunt ---------------- */
  function genVessel(d) {
    const e = era().id;
    const occs = d.occ.filter(o => !DATA.OCC[o].eras || DATA.OCC[o].eras.includes(e));
    const oid = pick(occs), o = DATA.OCC[oid];
    const hum = pick(Object.keys(DATA.HUMOURS));
    let wary = ri(o.wary[0], o.wary[1]);
    if (s.year <= (s.flags.ginUntil || 0) && o.cls === 'low') wary = Math.max(0, wary - 1);
    return { name: api.genName(), oid, occ: (e === 'victorian' && o.vn) ? o.vn : o.n, cls: o.cls, role: o.role,
      vit: ri(o.vit[0], o.vit[1]), wary, humour: hum, trait: pick(DATA.TRAITS), age: ri(16, 60) };
  }
  function bloodMult(v, d) {
    let k = d.vit;
    if (s.clan === 'morvayne' && v.cls === 'low') k *= 0.5;
    if (s.potency >= 5 && v.cls === 'low') k *= 0.75;
    if (s.year <= (s.flags.plagueUntil || 0)) k *= 0.85;
    return k;
  }
  function feedSusp(base, d) {
    const shadow = [1, 0.75, 0.5, 0.5][power('shadowcraft')];
    return Math.round(base * d.heat * shadow * api.susFactor() * (1 - s.inf.underworld / 300));
  }
  function huntChance(stat, v, extra = 0) {
    let x = extra + (s.flags.fog ? 0.15 : 0) + s.inf.underworld / 500;
    if (stat === 'allure') { if (s.clan === 'hollow') x -= 0.18; if (s.flags.byronic) x += 0.06; if (v.cls === 'high' && s.clan === 'hollow') x -= 0.1; }
    return api.chance(stat, v.wary, x);
  }

  function startHunt(did) {
    const d = dist(did);
    const vessels = [genVessel(d), genVessel(d), genVessel(d)];
    const intro = pick([
      `You drift through ${d.names[era().id]} like smoke, tasting the air. Heartbeats everywhere — quick, slow, drunk, afraid. Three of them catch your attention.`,
      `The bells of the city toll the hour. In ${d.names[era().id]}, the living hurry home through the dark. Not all of them will make it. You mark three.`,
      `Your hunger sharpens every sense. You can hear blood moving in the veins of strangers across the street. Three stand out from the herd.`,
    ]);
    Snd.play('heart');
    UI.scene({
      title: `The Hunt · ${d.names[era().id]}`, glyph: '☾', cls: 'hunt', text: intro,
      choices: vessels.map(v => ({
        label: v.name, sub: `${api.an(v.occ)}, ${v.trait}`,
        tags: [{ t: DATA.HUMOURS[v.humour].name, c: DATA.HUMOURS[v.humour].color },
          { t: `Vitae ${v.vit}` }, { t: `Wariness ${v.wary}` }, { t: v.cls === 'high' ? 'High-born' : v.cls === 'holy' ? 'Holy' : v.cls === 'mid' ? 'Middling' : 'Lowborn' }],
        onPick: () => approach(v, d),
      })).concat([{ label: 'Slink back into the dark', sub: 'Abandon the hunt', onPick: () => postAction(false) }]),
    });
  }

  function approach(v, d) {
    const opts = [
      { stat: 'might', label: 'Stalk and seize', sub: 'Might — a hand over the mouth in a dark doorway' },
      { stat: 'allure', label: 'Seduce', sub: 'Allure — a smile, a promise, a quiet garden' },
      { stat: 'guile', label: 'Beguile with lies', sub: 'Guile — a lost child, a shortcut, a false friend' },
    ];
    if (power('mesmerism') >= 1) opts.push({ stat: 'lore', label: 'Mesmerize', sub: 'Lore — the gaze that empties the mind', extra: 0.27 });
    UI.scene({
      title: v.name, glyph: '☾', cls: 'hunt',
      text: `${api.an(v.occ).replace(/^a/, 'A')}, perhaps ${v.age} years old, ${v.trait}. Even from here you can taste it: ${DATA.HUMOURS[v.humour].desc}.<br><br>How will you take them?`,
      choices: opts.map(o => {
        const p = huntChance(o.stat, v, o.extra || 0);
        return { label: o.label, sub: o.sub, chance: p, onPick: () => { const ok = api.roll(p); ok ? feedScene(v, d, o.stat) : failScene(v, d); } };
      }).concat([{ label: 'Let them pass', onPick: () => postAction(false) }]),
    });
  }

  function feedScene(v, d, how, extraSusp = 0) {
    Snd.play('bite');
    const openers = {
      might: `You take ${v.name} in the dark of a doorway, one cold hand over their mouth. They struggle, then stop.`,
      allure: `${v.name} comes with you willingly, laughing, into the shadows. The laugh becomes a sigh as your teeth find the vein.`,
      guile: `A tale of a lost purse, a shortcut through the churchyard. ${v.name} follows you trustingly into the dark.`,
      lore: `${v.name}'s eyes glaze. They tilt their head and bare their throat like a sleepwalker, and wait.`,
    };
    const k = bloodMult(v, d);
    const sip = Math.round(v.vit * 0.6 * k), deep = Math.round(v.vit * k), drain = Math.round(v.vit * 1.55 * k);
    const humDrain = 3 + Math.floor(s.humanity / 25);
    const humDeep = s.humanity > 40 ? 1 : 0;
    const essDrain = Math.round((3 + s.potency) * (power('sanguimancy') >= 2 ? 1.5 : 1));
    const setRes = str => { s.resonance = { h: v.humour, str, n: 2 }; };
    const done = (text, d2) => { s.feeds++; result({ title: 'The Feeding', glyph: '♥', text, d: d2, cls: 'blood' }); };
    const choices = [
      { label: 'A gentle sip', sub: `+${sip} blood · leave them dizzy and alive`,
        onPick: () => { setRes(1); done(`You drink only a little, lick the wound closed, and leave ${v.name} blinking in the lamplight, remembering nothing but a pleasant dream.`, { blood: sip, susp: feedSusp(1, d) + extraSusp, essence: 1 }); } },
      { label: 'Drink deeply', sub: `+${deep} blood${humDeep ? ' · −1 Humanity' : ''} · they will be abed for a week`,
        onPick: () => { setRes(1); done(`You drink until their heart stutters, then stop. ${v.name} slumps against the wall, grey-lipped, alive. Probably.`, { blood: deep, humanity: -humDeep, susp: feedSusp(3, d) + extraSusp, essence: 2 }); } },
      { label: 'Drain them dry', sub: `+${drain} blood · −${humDrain} Humanity · +${essDrain} Essence`, cls: 'dark',
        onPick: () => {
          setRes(2);
          api.addVictim({ name: v.name, occ: v.occ, where: d.names[era().id] });
          if (v.cls === 'holy') api.count('drain_holy');
          if (v.cls === 'high') api.count('drain_high');
          Snd.play('drain');
          done(pick([
            `You do not stop. The heartbeat slows, stumbles, and ends, and the last of ${v.name} pours into you — their fear, their memories of ${pick(['a mother\'s hands', 'a summer field', 'a lover\'s laugh', 'a dead child', 'the sea'])}, their life. It is ecstasy. It is damnation.`,
            `${v.name} dies with a small, surprised sound. You hold them until they are cold, and a little longer, and then you leave them among the refuse like a broken doll.`,
          ]), { blood: drain, humanity: -humDrain, susp: feedSusp(10, d) + extraSusp, essence: essDrain });
        } },
    ];
    if (v.role && api.ghoulRoom() && s.blood + sip >= 10) {
      const role = DATA.ROLES[v.role];
      choices.push({ label: `Bind them with your blood`, sub: `Make a ghoul · ${role.name}: ${role.desc} · costs 8 blood`,
        onPick: () => {
          setRes(1);
          api.addCircle({ kind: 'ghoul', role: v.role, name: v.name, age: v.age, occ: v.occ, loyalty: 55 });
          done(`You drink, and then you open your own wrist and press it to ${v.name}'s lips. They drink too — hesitantly, then greedily. When they look up at you, it is with the terrible devotion of the blood-bound. They are yours.`, { blood: sip - 8, susp: feedSusp(1, d) + extraSusp, humanity: -1 });
        } });
    }
    if (s.herd < api.herdCap()) {
      const p = api.chance('allure', 4 + Math.floor(v.wary / 2));
      choices.push({ label: 'Make them part of your herd', sub: `Allure · they will return to you willingly`, chance: p,
        onPick: () => {
          setRes(1);
          if (api.roll(p)) done(`You drink gently and whisper to them as you do. ${v.name} will come to your door again, and again, and never quite know why.`, { blood: sip, herd: 1, essence: 1 });
          else done(`You drink gently, but when they wake they flinch from you. Not this one.`, { blood: sip, susp: feedSusp(2, d) });
        } });
    }
    UI.scene({ title: 'The Feeding', glyph: '♥', cls: 'blood',
      text: `${openers[how]}<br><br>Their blood is <span style="color:${DATA.HUMOURS[v.humour].color}">${DATA.HUMOURS[v.humour].name.toLowerCase()}</span> — ${DATA.HUMOURS[v.humour].desc}. How deeply will you drink?`,
      choices });
  }

  function failScene(v, d) {
    Snd.play('fail');
    const choices = [];
    const fleeHurt = power('nightwings') >= 2 ? 0 : ri(4, 9) * d.danger / 2;
    choices.push({ label: 'Flee into the dark', sub: fleeHurt ? 'you may be hurt; they will talk' : 'you are gone before they can see',
      onPick: () => result({ title: 'Flight', glyph: '⋀', ok: false, text: `You run. ${v.name}'s screams follow you across the rooftops${fleeHurt ? ', and so does a thrown cobblestone' : ''}.`, d: { health: -fleeHurt, susp: feedSusp(6, d) } }) });
    const pm = api.chance('might', v.wary + 1);
    choices.push({ label: 'Silence them by force', sub: 'Might · violent and loud', chance: pm, cls: 'dark',
      onPick: () => api.roll(pm) ? feedScene(v, d, 'might', feedSusp(5, d)) : result({ title: 'A Struggle', glyph: '⚔', ok: false, text: `${v.name} fights like a cornered cat. Someone comes running with a lantern and a blade. You escape, bloodied, with a crowd at your heels.`, d: { health: -15, susp: feedSusp(10, d) } }) });
    if (power('shadowcraft') >= 2) choices.push({ label: 'Vanish into shadow', sub: 'Shadowcraft', onPick: () => result({ title: 'Gone', glyph: '◐', text: 'The shadows open like a curtain and close behind you. They will swear they imagined you.', d: {} }) });
    if (power('mesmerism') >= 2) choices.push({ label: 'Make them forget', sub: 'Mesmerism', onPick: () => result({ title: 'Forgotten', glyph: '◉', text: `"You saw nothing," you tell ${v.name}. And they didn't.`, d: {} }) });
    UI.scene({ title: 'The Hunt Goes Wrong', glyph: '✖', cls: 'hunt',
      text: pick([`${v.name} sees your eyes in the dark — sees what you are — and screams.`, `A dog barks. ${v.name} turns and sees your fangs, and the knife in their hand is already out.`, `At the last moment ${v.name} pulls away, and their cry echoes down the street. Shutters bang open.`]),
      choices });
  }

  /* ---------------- frenzy & dawn ---------------- */
  function frenzy(then) {
    s.night.frenzied = true;
    const p = clamp(0.25 + s.humanity / 200 + attr('lore') * 0.04 - (s.clan === 'vargr' ? 0.15 : 0), 0.05, 0.9);
    Snd.play('frenzy');
    UI.scene({ title: 'The Beast Awakens', glyph: '☬', cls: 'frenzy',
      text: 'The hunger is no longer a feeling. It is a <i>voice</i>, and it is screaming. Your vision floods red at the edges. Every heartbeat in the city is a drum calling you to war.',
      choices: [
        { label: 'Chain the Beast', sub: 'Humanity & Lore', chance: p, onPick: () => {
          if (api.roll(p)) result({ title: 'Mastered', glyph: '☬', ok: true, text: 'You bite your own wrist until the pain drowns the hunger. You hold. Barely. You must feed — soon.', d: { health: -5 } }, then);
          else {
            const name = api.genName();
            api.addVictim({ name, occ: 'stranger' });
            result({ title: 'Frenzy', glyph: '☬', ok: false, cls: 'frenzy', text: `When you come back to yourself you are kneeling in an alley, and ${name} is in your arms, and there is blood to your elbows. You do not remember killing them. You remember enjoying it.`, d: { blood: 40, humanity: -5, susp: feedSusp(14, { heat: 1 }) } }, then);
          }
        } },
      ] });
  }

  function dawnCatches() {
    Snd.play('burn');
    let dmg = 32;
    if (s.clan === 'unclaimed') dmg *= 0.5;
    if (power('ironflesh') >= 2) dmg *= 0.5;
    let text = 'The sky over the river turns the colour of a bruise, then of a wound. You are too far from home. You run — and the first finger of sunlight finds you on the threshold. Your skin blackens and smokes.';
    if (s.items.salve) { s.items.salve--; if (!s.items.salve) delete s.items.salve; dmg = 0; text = 'Dawn catches you in the open — but you smear the alchemist\'s grey salve thick over your skin, and the sunlight merely stings. You reach your haven, reeking of sulphur.'; }
    s.loc = 'haven';
    result({ title: 'Caught by the Dawn', glyph: '☀', cls: 'dawn', ok: false, text, d: { health: -dmg } }, () => { if (!checkFatal()) endNight(); });
  }

  /* ---------------- haven & global deeds ---------------- */
  api.deeds = () => {
    const out = [];
    const add = (id, name, glyph, desc, hours, where, avail, reason, extra = {}) => {
      const travel = where ? api.travelCost(where) : 0;
      const h = hours + travel;
      let ok = avail, why = reason;
      if (ok && s.hours < h) { ok = false; why = 'Not enough night left'; }
      out.push({ id, name, glyph, desc, hours: h, travel, avail: ok, reason: why, ...extra });
    };
    add('herdfeed', 'Drink from Your Herd', '❦', 'Your willing vessels wait at your haven. Safe, sinless, sustaining.', 1, 'haven', s.herd > 0 && !s.night.herdFed, s.herd <= 0 ? 'You have no herd' : 'Your herd is spent tonight');
    const mc = power('sanguimancy') >= 1 ? 5 : 10;
    add('mend', 'Mend Your Flesh', '✚', `Spend ${mc} blood to knit wounds closed (+25 health).`, 0, null, s.blood > mc && s.health < api.maxHealth(), s.health >= api.maxHealth() ? 'You are whole' : 'Too little blood');
    if (s.cellar > 0) add('draw', 'Draw from the Cellar', '⚱', `Drink the stored blood (${s.cellar} measures).`, 0, null, s.blood < 100, 'You are sated');
    if (s.upgrades.library) add('study', 'Study the Forbidden', '☥', 'Your library holds what the Church burned. (Lore)', 2, 'haven', true, '', { chance: api.chance('lore', 3) });
    const lv = api.lover();
    if (lv) add('lover', `Spend the Night with ${lv.name.split(' ')[0]}`, '♡', 'Warmth, conversation, the illusion of a life. (+Humanity)', 2, 'haven', true, '');
    if (power('mesmerism') >= 2) add('cloud', 'Cloud Memories', '◉', 'Walk the streets unmaking what witnesses saw. (−12 Suspicion)', 1, null, s.susp > 0, 'No one remembers you');
    if (power('beastcall') >= 1) add('callrats', 'Call the Vermin', '⁂', 'Wherever you are, the rats come.', 1, null, true, '');
    if (power('sanguimancy') >= 3) add('sight', 'Rite of Crimson Sight', '⚶', 'Spend 15 blood to scry the hunter\'s lair.', 2, null, s.hunter && !s.hunter.known && s.blood > 15, 'No hidden hunter to find');
    return out;
  };

  api.doDeed = id => {
    const d = api.deeds().find(x => x.id === id);
    if (!d || !d.avail) return;
    s.hours -= d.hours;
    if (['herdfeed', 'study', 'lover'].includes(id)) s.loc = 'haven';
    Snd.play('click');
    switch (id) {
      case 'herdfeed': {
        s.night.herdFed = true; s.feeds++;
        const b = Math.min(32, 10 + s.herd * 3);
        const weak = s.herd > 0 && R() < 0.12;
        return result({ title: d.name, glyph: d.glyph, text: `They come to you one by one in the candlelight and offer their wrists and throats, eyes half-closed. You drink a little from each.${weak ? ' One of them faints and does not wake for a long time. When they do, they flee and do not return.' : ''}`, d: { blood: b, herd: weak ? -1 : 0 } });
      }
      case 'mend': { const mc = power('sanguimancy') >= 1 ? 5 : 10; return result({ title: d.name, glyph: d.glyph, text: 'The blood moves under your skin like a living thing, and torn flesh draws itself together.', d: { blood: -mc, health: 25 } }); }
      case 'draw': { const take = Math.min(s.cellar, 100 - s.blood); s.cellar -= take; return result({ title: d.name, glyph: d.glyph, text: 'Cold, stale and thickened — but blood.', d: { blood: take } }); }
      case 'study': { const ok = api.roll(api.chance('lore', 3)); return result({ title: d.name, glyph: d.glyph, ok, text: ok ? 'Hours pass in the pages of a Byzantine bestiary. You understand your own blood a little better.' : 'The words swim. You read the same line forty times.', d: { essence: ok ? ri(3, 5) : 1 } }); }
      case 'lover': {
        const lv = api.lover(); lv.loyalty = Math.min(100, lv.loyalty + 12); lv.lastSeen = s.turn;
        const lines = [`${lv.name} reads to you by the fire, and you pretend to be warm.`, `You walk with ${lv.name} along the river, and they talk of the future as if you will share it.`, `${lv.name} asks why you never eat. You make a joke of it. They laugh. You love them for laughing.`, `${lv.name} falls asleep with their head on your shoulder, and you listen to their heartbeat until nearly dawn — and do not bite.`];
        return result({ title: d.name, glyph: d.glyph, text: pick(lines), d: { humanity: s.humanity < 60 ? 3 : s.humanity < 80 ? 2 : 0 } });
      }
      case 'cloud': return result({ title: d.name, glyph: d.glyph, text: 'Door to door, eye to eye, you unmake the memories of a dozen witnesses.', d: { susp: -12 } });
      case 'callrats': { s.feeds++; return result({ title: d.name, glyph: d.glyph, text: 'A soft whistle. They pour out of the gutters to you, a living carpet.', d: { blood: ri(7, 10) * (power('beastcall') >= 3 ? 2 : 1) } }); }
      case 'sight': { s.hunter.known = true; s.hunter.progress = 100; return result({ title: d.name, glyph: d.glyph, text: `In a bowl of your own blood you see a narrow house, a bed, a crucifix, and ${s.hunter.name} asleep. You know where they are.`, d: { blood: -15 } }); }
    }
  };

  api.retire = () => {
    const c = api.travelCost('haven');
    if (s.hours < c) { s.hours = 0; return dawnCatches(); }
    s.hours -= c; s.loc = 'haven';
    endNight();
  };

  /* ---------------- purchases ---------------- */
  api.havenCost = lvl => Math.round(DATA.HAVENS[lvl].cost * (1 + eraIdx() * 0.5));
  api.upgradeCost = id => Math.round(DATA.UPGRADES[id].cost * (1 + eraIdx() * 0.5));
  api.buyHaven = () => {
    const n = s.haven + 1; if (n >= DATA.HAVENS.length) return;
    const c = api.havenCost(n); if (s.gold < c) return;
    s.gold -= c; s.haven = n; Snd.play('coin');
    api.log(`You take possession of ${DATA.HAVENS[n].name}.`, 'gold');
    UI.toast(`New haven: ${DATA.HAVENS[n].name}`);
    checkAchievements(); UI.render(); api.save();
  };
  api.buyUpgrade = id => {
    const u = DATA.UPGRADES[id], c = api.upgradeCost(id);
    if (s.upgrades[id] || s.gold < c || s.haven < u.lvl) return;
    s.gold -= c; s.upgrades[id] = true; Snd.play('coin');
    api.log(`Your haven gains: ${u.name}.`, 'gold'); UI.render(); api.save();
  };
  api.holdingAvail = h => s.year >= h.from && (!h.to || s.year <= h.to);
  api.buyHolding = id => {
    const h = DATA.HOLDINGS.find(x => x.id === id);
    if (s.holdings[id] || s.gold < h.cost || !api.holdingAvail(h)) return;
    s.gold -= h.cost; s.holdings[id] = 1; Snd.play('coin');
    api.log(`You acquire ${h.name}.`, 'gold'); UI.toast(`Acquired: ${h.name}`);
    checkAchievements(); UI.render(); api.save();
  };
  api.sellHolding = id => {
    const h = DATA.HOLDINGS.find(x => x.id === id);
    if (!s.holdings[id]) return;
    delete s.holdings[id]; s.gold += Math.round(h.cost * 0.6); Snd.play('coin');
    api.log(`You sell ${h.name}.`); UI.render(); api.save();
  };
  api.attrCost = k => s.attrs[k] * 3;
  api.raiseAttr = k => {
    const c = api.attrCost(k);
    if (s.essence < c || s.attrs[k] >= 10) return;
    s.essence -= c; s.attrs[k]++; Snd.play('power');
    api.log(`Your ${DATA.ATTRS[k].name} deepens to ${s.attrs[k]}.`, 'gold'); UI.render(); api.save();
  };
  api.powerCost = id => { const r = power(id) + 1; return (api.clan().affinity.includes(id) ? 4 : 6) * r; };
  api.learnPower = id => {
    const c = api.powerCost(id);
    if (s.essence < c || power(id) >= 3) return;
    s.essence -= c; s.powers[id] = power(id) + 1; Snd.play('power');
    if (id === 'quickening') s.hours += 1;
    api.log(`You awaken ${DATA.POWERS[id].name} ${['I', 'II', 'III'][s.powers[id] - 1]}.`, 'gold');
    UI.toast(`${DATA.POWERS[id].name} ${['I', 'II', 'III'][s.powers[id] - 1]} awakened`);
    UI.render(); api.save();
  };
  api.useItem = id => {
    if (!s.items[id]) return;
    const take = () => { s.items[id]--; if (!s.items[id]) delete s.items[id]; };
    if (id === 'candle') { take(); api.fx({ hours: 1 }); UI.toast('The candle burns. The night stretches.'); }
    else if (id === 'vitae') { take(); api.fx({ essence: 12 }); UI.toast('Ancient blood burns through you. +12 Essence'); }
    else if (id === 'bone') { take(); api.fx({ church: 12, susp: -6 }); UI.toast('The relic buys the Church\'s gratitude.'); }
    else if (DATA.ITEMS[id].sell) { take(); api.fx({ gold: money(DATA.ITEMS[id].sell) }); UI.toast('Sold to a fence in Southwark.'); }
    UI.render(); api.save();
  };

  /* ---------------- court ---------------- */
  api.courtActions = () => {
    const out = [];
    const t = api.travelCost('elysium');
    out.push({ id: 'elysium', name: 'Attend Elysium', glyph: '♛', hours: 2 + t, desc: 'Be seen at the Court of the Night. Hear petitions and gossip.', avail: s.hours >= 2 + t, reason: 'Not enough night left' });
    const trib = money(30 * (1 + s.rank * 0.5));
    out.push({ id: 'tribute', name: 'Pay Tribute', glyph: '⚜', hours: 0, desc: `Send £${trib} to the Prince's coffers. (+3 Prestige)`, avail: s.gold >= trib && !s.night.tribute, reason: s.night.tribute ? 'Already paid tonight' : `Requires £${trib}`, cost: trib });
    if (s.rival) out.push({ id: 'scheme', name: `Scheme against ${s.rival.name}`, glyph: '♠', hours: 2, desc: 'Poison their name, bribe their servants, ruin their standing.', avail: s.hours >= 2, reason: 'Not enough night left', chance: schemeChance() });
    if (s.rank === 4) out.push({ id: 'challenge', name: 'Challenge for the Throne', glyph: '♔', hours: 3, desc: 'Topple the Prince. Win, and London is yours. Lose, and you may not survive.', avail: s.hours >= 3 && s.prestige >= 150 && s.inf.crown >= 35, reason: 'Needs 150 Prestige and 35 Crown influence' });
    return out;
  };
  const schemeChance = () => clamp(0.5 + (attr('guile') - s.rival.power - 1) * 0.08 + s.inf.underworld / 400, 0.05, 0.92);

  api.doCourt = id => {
    const a = api.courtActions().find(x => x.id === id);
    if (!a || !a.avail) return;
    s.hours -= a.hours;
    Snd.play('click');
    if (id === 'elysium') {
      s.loc = 'elysium';
      while (s.offers.length < 2) {
        const pool = DATA.TASKS.filter(t => (!t.cond || t.cond(s)) && !s.tasks.some(x => x.id === t.id) && !s.offers.some(x => x.id === t.id));
        if (!pool.length) break;
        const tpl = pick(pool);
        s.offers.push({ id: tpl.id, ...tpl.gen(s), reward: tpl.reward });
      }
      const gossip = pick([
        `${s.princeName} holds court from a throne of black oak. The Primogen whisper behind their hands; you catch the words "hunter" and "Southwark".`,
        'Elysium tonight is a ruined chapel lit with a thousand candles. A Morvayne sings; a Hollow Choir elder listens from the rafters.',
        `${s.rival ? s.rival.name : 'A rival'} greets you with a smile like a drawn knife. You smile back.`,
        'A string quartet of mesmerised mortals plays until their fingers bleed. No one else seems to notice.',
      ]);
      return result({ title: 'Elysium', glyph: '♛', text: `${gossip}<br><br>New petitions are offered to those who seek favour. (See the Court.)`, d: { prestige: ri(1, 3), crown: s.inf.crown < 30 ? 1 : 0 } });
    }
    if (id === 'tribute') {
      s.night.tribute = true;
      return result({ title: 'Tribute', glyph: '⚜', text: 'A purse of coin, a letter of loyalty. The Prince\'s seneschal inclines his head exactly one inch.', d: { gold: -a.cost, prestige: 3 } });
    }
    if (id === 'scheme') {
      const p = schemeChance(), ok = api.roll(p);
      if (!ok) { s.rival.standing += 5; return result({ title: 'The Scheme Unravels', glyph: '♠', ok, text: `Your agent is caught. ${s.rival.name} sends you the man's tongue in a silver box, and the court laughs.`, d: { prestige: -4 } }); }
      s.rival.standing -= ri(12, 22);
      if (s.rival.standing <= 0) {
        const name = s.rival.name; s.rival = null; s.rivalReturn = s.turn + 18;
        return result({ title: 'Ruin', glyph: '♠', ok, text: `The forged letters reach the Prince. ${name} is stripped of domain and status and flees London on a ship to Bruges. Their seat at Elysium is yours to fill.`, d: { prestige: 12, essence: 3 } });
      }
      return result({ title: 'Whispers', glyph: '♠', ok, text: `A bribed servant, a forged confession, a rumour of diablerie. ${s.rival.name}'s star dims at court.`, d: { prestige: 3 } });
    }
    if (id === 'challenge') return challengePrince();
  };

  api.acceptOffer = i => {
    const o = s.offers[i]; if (!o || s.tasks.length >= 3) return;
    s.offers.splice(i, 1);
    const tpl = DATA.TASKS.find(t => t.id === o.id);
    o.left = 8; o.base = tpl.counter ? (s.counters[tpl.counter] || 0) : 0;
    s.tasks.push(o); Snd.play('click');
    api.log(`You accept a petition: ${tpl.title}.`); UI.render(); api.save();
  };
  api.taskTpl = t => DATA.TASKS.find(x => x.id === t.id);
  api.taskDone = t => { const tpl = api.taskTpl(t); return tpl.counter ? (s.counters[tpl.counter] || 0) > t.base : tpl.done(s, t); };
  api.fulfil = i => {
    const t = s.tasks[i]; if (!t || !api.taskDone(t)) return;
    const tpl = api.taskTpl(t);
    s.tasks.splice(i, 1);
    const pay = tpl.pay ? tpl.pay(t) : {};
    const d = { ...pay }; for (const k in t.reward) d[k] = (d[k] || 0) + t.reward[k];
    if (d.gold && t.reward.gold) d.gold = (pay.gold || 0) + money(t.reward.gold);
    Snd.play('power');
    result({ title: 'A Petition Fulfilled', glyph: '♛', ok: true, text: `“${tpl.title}.” The Prince remembers those who are useful.`, d }, () => postAction(false));
  };

  function challengePrince() {
    const pDuel = clamp(0.2 + (attr('might') + s.potency - 11) * 0.06, 0.05, 0.9);
    const pCons = clamp(0.2 + attr('guile') * 0.04 + s.inf.underworld / 250, 0.05, 0.9);
    const pAccl = clamp(0.15 + attr('allure') * 0.04 + s.inf.crown / 250 + (s.prestige - 150) / 500, 0.05, 0.9);
    const win = how => {
      s.rank = 5; s.princeName = `Prince ${s.name}`;
      api.log(`You are Prince of London.`, 'gold');
      return { text: `${how}<br><br>The Primogen kneel, one by one. The crown of the night — a circlet of black iron older than the city — is placed upon your brow.<br><br><b>You are Prince of London.</b>`, d: { prestige: 50, crown: 10 } };
    };
    const lose = how => { s.rank = 2; s.prestige = Math.floor(s.prestige / 2); return { text: `${how}<br><br>You are stripped of your titles and cast down to Ancilla. That you still exist is the Prince's idea of mercy.`, d: { health: -50 } }; };
    present({
      title: 'The Challenge', glyph: '♔',
      text: `Elysium falls silent as you step before the throne. ${s.princeName} regards you with ancient, lightless eyes. "So," the Prince says. "It has come to this. Choose your weapon, little one."`,
      choices: [
        { label: 'Blood Duel', sub: 'Might & Potency', chance: () => pDuel, run: (x, ok) => ok ? win('Fang against fang in the ruined nave. Old as they are, the Prince is slow, and you are hungry.') : lose('They break you like a toy and hang you in chains until dawn nearly takes you.') },
        { label: 'Conspiracy', sub: 'Guile & Underworld', chance: () => pCons, run: (x, ok) => ok ? win('The Prince\'s own ghouls open the doors at noon. The coffin is dragged into the sunlight.') : lose('A traitor among your conspirators. The Prince was waiting.') },
        { label: 'Acclamation', sub: 'Allure, Crown & Prestige', chance: () => pAccl, run: (x, ok) => ok ? win('You speak, and Elysium listens — and then, one by one, the Primogen turn their backs on the old Prince.') : lose('Silence. No one stands with you.') },
      ],
    }, () => postAction(false));
  }

  /* ---------------- circle ---------------- */
  api.releaseGhoul = id => {
    const g = s.circle.find(c => c.id === id); if (!g) return;
    g.alive = false; g.fate = 'released from the blood bond';
    api.fx({ humanity: 1 }); api.log(`You release ${g.name} from the blood bond.`);
    UI.render(); api.save();
  };
  api.embraceLover = () => {
    const lv = api.lover(); if (!lv || s.blood < 30) return;
    present({ title: 'The Embrace', glyph: '✧',
      text: `You tell ${lv.name} everything. They are silent for a long time. Then they take your cold hand. "Forever, then," they say. "If you'll have me."`,
      choices: [
        { label: 'Give them your blood', sub: 'Blood −30 · they will never grow old', run: () => { lv.kind = 'childe'; lv.desc = 'Once your mortal love. Now your childe, for eternity.'; api.log(`You Embrace ${lv.name}.`, 'blood'); return { text: `They die in your arms, as they would have died anyway, someday. And then they open their eyes, and look at you with hunger — and with love. Or something that wears its face.`, d: { blood: -30, humanity: -3, prestige: -3 } }; } },
        { label: 'You cannot do it', run: () => ({ text: 'You kiss their warm forehead and say nothing. It is the kindest cruelty you know.', d: { humanity: 1 } }) },
      ] }, () => postAction(false));
  };
  api.hunterActions = () => {
    const h = s.hunter; if (!h) return [];
    const out = [];
    out.push({ id: 'confront', name: 'Confront the Hunter', hours: 2, avail: h.known && s.hours >= 2, reason: h.known ? 'Not enough night left' : 'You do not know where they sleep' });
    out.push({ id: 'discredit', name: 'Have Them Discredited', hours: 1, avail: s.inf.church >= 40 && s.hours >= 1, reason: 'Needs 40 Church influence', desc: 'Spend 25 Church influence to see them recalled, defrocked or committed.' });
    return out;
  };
  api.hunterAct = id => {
    const h = s.hunter; if (!h) return;
    const a = api.hunterActions().find(x => x.id === id); if (!a || !a.avail) return;
    s.hours -= a.hours;
    if (id === 'discredit') {
      s.hunter = null;
      return result({ title: 'Discredited', glyph: '✝', ok: true, text: `A word to a bishop, a letter to a magistrate. ${h.name} is dismissed as a madman and sent away from London in disgrace.`, d: { church: -25, susp: -10 } });
    }
    const diff = h.level + 3;
    const killed = txt => { s.hunter = null; s.stats.huntersSlain++; api.count('hunter_slain'); api.log(`${h.name} is dead.`, 'blood'); return { text: txt, d: { humanity: -2, susp: -15, prestige: 8, essence: 4 } }; };
    const hurt = txt => { h.threat += 25; return { text: txt, d: { health: -38, susp: 6 } }; };
    const choices = [
      { label: 'Break down the door', sub: 'Might', chance: () => api.chance('might', diff), run: (x, ok) => ok ? killed(`The door gives. ${h.name} gets one shot off — the silver ball scores your ribs — and then it is over.`) : hurt('Holy water. Hawthorn. A crossbow bolt through your shoulder. You retreat, smoking.') },
      { label: 'Wait for them in the dark', sub: 'Guile', chance: () => api.chance('guile', diff - 1), run: (x, ok) => ok ? killed(`${h.name} comes home at midnight and lights a candle, and you are sitting in their chair.`) : hurt('They smell you before they see you. The trap was set for you.') },
    ];
    if (power('mesmerism') >= 3) choices.push({ label: 'Take their memories', sub: 'Mesmerism III · no blood spilled', chance: () => api.chance('lore', diff - 2), run: (x, ok) => { if (ok) { s.hunter = null; s.stats.huntersSlain++; api.count('hunter_slain'); return { text: `${h.name} wakes the next morning with no memory of vampires — or of why they ever came to London.`, d: { susp: -12, prestige: 5 } }; } return hurt('Their faith is a wall your gaze cannot climb.'); } });
    present({ title: h.name, glyph: '✠', text: `The hunter's lodging is a narrow house with garlic on the lintel and salt on the sill. Candlelight in an upper window. ${h.name} is home, and awake.`, choices }, () => postAction(false));
  };

  /* ==================================================================
     Night's end: the day passes
     ================================================================== */
  function endNight() {
    const L = []; // ledger lines {t, cls}
    const add = (t, cls = '') => L.push({ t, cls });
    s.loc = 'haven';

    // Raid
    if (s.hunter && s.hunter.threat >= 100) {
      const atk = 20 + s.hunter.level * 12 + ri(0, 25) + (s.flags.police ? 10 : 0);
      const def = api.havenDef();
      if (def >= atk) {
        s.hunter.threat = 35; s.hunter.level++;
        add(`<b>${s.hunter.name} raided your haven at noon</b> — and was driven off by your defences. They will return, wiser.`, 'gold');
        api.fx({ prestige: 3 });
      } else {
        let dmg = ri(35, 60); if (s.upgrades.sarcophagus) dmg = Math.round(dmg / 2);
        const chips = api.fx({ health: -dmg, havenLoss: 1 });
        const g = api.ghouls()[0]; if (g) { g.alive = false; g.fate = `killed defending you from ${s.hunter.name}`; }
        s.hunter.threat = 40;
        add(`<b>${s.hunter.name} broke into your haven at noon.</b> Stakes, sunlight through smashed shutters. You survived — barely (${chips.map(c => `${c.v} ${DATA.LABELS[c.k]}`).join(', ')}).${g ? ` ${g.name} died defending you.` : ''}`, 'blood');
        if (s.health <= 0) { api.save(); return ending('staked'); }
      }
    }

    // Time passes
    s.month++; s.undeadMonths++; s.turn++;
    let newYear = false;
    if (s.month > 11) { s.month = 0; s.year++; newYear = true; }

    // Hunger
    const hunger = api.hunger();
    s.blood -= hunger;
    add(`The hunger of the day takes ${hunger} blood.`);
    // Ghoul upkeep
    for (const g of api.ghouls()) {
      if (s.blood >= 2) { s.blood -= 2; g.loyalty = Math.min(100, g.loyalty + 2); }
      else {
        g.loyalty -= 20;
        if (g.loyalty <= 0) {
          g.alive = false;
          if (R() < 0.5) { g.fate = 'betrayed you to the hunters'; add(`${g.name}, starved of your blood, has betrayed you to the hunters!`, 'blood'); if (!s.hunter) api.spawnHunter(); s.hunter.threat += 35; s.hunter.known = false; }
          else { g.fate = 'fled when the blood ran dry'; add(`${g.name}, starved of your blood, has fled.`, 'blood'); }
        } else add(`You had no blood to spare for ${g.name}. Their devotion wavers.`, 'blood');
      }
    }
    // Childer & holdings blood
    const cb = api.childer().length * 4 + holdingFx('bloodTurn');
    if (cb) { addBlood(cb); add(`Your ${api.childer().length ? 'childer and ' : ''}charitable works bring you ${cb} blood.`); }
    if (s.blood < 30 && s.cellar > 0) { const t = Math.min(s.cellar, 30 - Math.max(0, s.blood)); s.cellar -= t; s.blood += t; add(`You draw ${t} blood from your cellar.`); }
    if (s.blood < 0) { const dmg = -s.blood * 2; s.blood = 0; s.health = Math.max(1, s.health - dmg); add(`You are starving. Your body devours itself (−${dmg} health).`, 'blood'); }

    // Health
    const heal = 5 + DATA.HAVENS[s.haven].def + api.roleCount('physician') * 8;
    s.health = Math.min(api.maxHealth(), s.health + heal);

    // Money
    const inc = api.income();
    if (inc) { s.gold += inc; add(`Your holdings earn £${inc}.`, 'gold'); }
    for (const f of ['church', 'crown', 'guilds']) { const v = holdingFx(f); if (v) s.inf[f] = Math.min(100, s.inf[f] + v); }

    // Suspicion
    const decay = Math.round(3 + s.inf.church / 25 + api.roleCount('confessor') * 2 + holdingFx('suspDecay') - (s.flags.police ? 1 : 0));
    s.susp = Math.max(0, s.susp - decay);
    if (s.upgrades.chapel && s.humanity < 50) s.humanity++;

    // Influence decay
    for (const f of Object.keys(s.inf)) if (s.inf[f] > 25 && R() < 0.5) s.inf[f]--;

    // Hunters
    if (!s.hunter && s.susp >= 45 && R() < 0.4) { api.spawnHunter(); add(`<b>A hunter has come:</b> ${s.hunter.name}. They are asking questions about you.`, 'blood'); }
    else if (s.hunter) {
      const h = s.hunter;
      const grow = Math.max(0, (2 + s.susp / 8 + h.level) * (power('shadowcraft') >= 3 ? 0.5 : 1) * (s.flags.police ? 1.25 : 1) - api.roleCount('spy') * 3 - (power('beastcall') >= 2 ? 4 : 0));
      h.threat = Math.round(h.threat + grow);
      if (s.susp < 8 && h.threat < 40 && R() < 0.2) { add(`${h.name} has found nothing and left London.`, 'gold'); s.hunter = null; }
      else if (h.threat >= 80) add(`${h.name} is closing in (threat ${h.threat}). At 100, they will raid your haven.`, 'blood');
    }

    // Rival
    if (!s.rival && s.turn >= s.rivalReturn && R() < 0.2) { s.rival = { name: pick(DATA.RIVALS), standing: 50, power: 4 + eraIdx() + ri(0, 2) }; add(`A new rival rises at court: ${s.rival.name}.`); }

    // Tasks
    for (const t of [...s.tasks]) {
      t.left--;
      if (t.left <= 0) { s.tasks.splice(s.tasks.indexOf(t), 1); s.prestige = Math.max(0, s.prestige - 5); add(`You failed the Prince's petition: “${api.taskTpl(t).title}”. (−5 Prestige)`, 'blood'); }
    }
    if (s.offers.length && R() < 0.25) s.offers.shift();

    // Resonance
    if (s.resonance && --s.resonance.n <= 0) s.resonance = null;

    // New Year
    if (newYear) {
      const hy = holdingFx('humYear');
      if (hy) { api.fx({ humanity: hy }); add(`Your holdings weigh on your soul (${hy > 0 ? '+' : ''}${hy} Humanity).`, hy < 0 ? 'blood' : 'gold'); }
      if (s.clan === 'ashen' && s.gold > 0) { const tithe = Math.floor(s.gold / 10); s.gold -= tithe; add(`The Ashen Codex claims its tithe: £${tithe}.`); }
      for (const c of s.circle) if (c.alive && c.kind !== 'childe') {
        if (c.kind === 'ghoul' && c.loyalty > 0) continue; // blood keeps them young
        c.age++;
        if (c.age >= c.lifespan) { c.alive = false; c.fate = `died of old age in ${s.year}`; add(`${c.name} has died, aged ${c.age}.`, 'blood'); if (c.kind === 'lover') { s.flags.loverLost = true; api.fx({ humanity: -2 }); } }
      }
    }
    // Lover neglect
    const lv = api.lover();
    if (lv && s.turn - lv.lastSeen > 6) {
      lv.loyalty -= 10;
      if (lv.loyalty <= 0) { lv.alive = false; lv.fate = 'left you for someone who was warm'; s.flags.loverLost = true; add(`${lv.name} has left you. The letter says only: <i>"You were never really here."</i>`, 'blood'); }
    }

    // Aging & potency
    const pot = api.recalcPotency();
    if (pot > 0) add(`<b>Your blood thickens with age. Blood Potency rises to ${s.potency}.</b>`, 'gold');

    s.stats.maxGold = Math.max(s.stats.maxGold, s.gold);
    if (s.flags.recentKill !== undefined && s.turn - s.flags.recentKill > 2) delete s.flags.recentKill;
    api.log(`The ${DATA.MOONS[(s.month + 11) % 12]} ends.`);

    Snd.play('bell');
    UI.scene({ title: 'The Day\'s Sleep', glyph: '☀', cls: 'dawn',
      text: `You seal yourself away as the sun rises over London and sink into the death-sleep. While you lie still as stone, the world goes on without you.`,
      ledger: L, choices: [{ label: 'Rise at dusk', onPick: beginNight }] });
  }

  function beginNight() {
    if (s.year >= 1901) return ending('century');
    s.hours = api.maxHours(); s.loc = 'haven'; s.night = {};
    delete s.flags.fog;
    api.save();
    const q = [];
    // Era
    if (era().id !== s.eraId) {
      s.eraId = era().id;
      if (s.rank < 5) s.princeName = DATA.PRINCES[s.eraId];
      q.push(next => { Snd.play('organ'); UI.scene({ title: era().name, glyph: era().glyph, cls: 'era', eyebrow: `${era().start} — A New Age`, text: `${era().desc}${s.rank < 5 ? `<br><br>The Court of the Night has a new master: <b>${s.princeName}</b>.` : ''}`, choices: [{ label: 'Step into the new age', onPick: next }] }); });
    }
    // History
    const hist = DATA.HISTORY.find(h => !s.histDone[h.id] && (s.year > h.year || (s.year === h.year && s.month >= h.month)));
    if (hist) {
      s.histDone[hist.id] = true;
      if (hist.apply) hist.apply(s);
      q.push(next => { Snd.play('organ'); present({ ...hist, title: hist.title, text: `<div class="eyebrow">${DATA.MONTHS[s.month]} ${s.year}</div>${hist.text}` }, next, 'history'); });
    }
    // Rank
    while (s.rank < 4 && s.prestige >= DATA.RANKS[s.rank + 1].prestige && s.potency >= DATA.RANKS[s.rank + 1].potency) {
      s.rank++;
      const r = DATA.RANKS[s.rank];
      api.log(`The Court recognises you as ${r.name}.`, 'gold');
      q.push(next => { Snd.play('organ'); UI.scene({ title: `Recognised: ${r.name}`, glyph: '♛', cls: 'era', text: `At Elysium, ${s.princeName} raises a goblet of dark wine towards you. "Let it be known that ${s.name} of ${api.clan().name} is henceforth ${r.name} of this city." ${s.rank === 4 ? '<br><br>Among the Primogen, you now sit one step from the throne. The Prince watches you with new, cold interest.' : ''}`, choices: [{ label: 'Bow', onPick: next }] }); });
    }
    // Lover grows old
    const lv = api.lover();
    if (lv && lv.age >= 50 && !lv.askedOld) {
      lv.askedOld = true;
      q.push(next => present({ title: 'Grey at the Temples', glyph: '♡', text: `${lv.name} is ${lv.age} now. There is grey in their hair, and lines around the eyes that laugh at your jokes. You have not changed at all. They have noticed.`,
        choices: [
          { label: 'Offer them the Embrace', sub: 'Blood −30', req: () => s.blood >= 30, run: () => { lv.kind = 'childe'; lv.desc = 'Once your mortal love. Now your childe, forever.'; return { text: `"Yes," they say, without hesitating. "I was only afraid you would never ask." They die in your arms, and wake.`, d: { blood: -30, humanity: -3 } }; } },
          { label: 'Let them grow old', run: () => ({ text: 'You will love them as they age. You will love them as they die. That is the choice mortals make every day.', d: { humanity: 3 } }) },
        ] }, next));
    }
    // Dusk event
    if (R() < 0.42) { const ev = pickEvent('dusk'); if (ev) q.push(next => present(ev, next)); }
    // Frenzy
    q.push(next => { if (s.blood <= 10) frenzy(next); else next(); });

    const run = () => {
      if (checkFatal()) return;
      const f = q.shift();
      if (f) f(run); else { checkAchievements(); UI.render(); api.save(); }
    };
    UI.render();
    UI.duskCard(() => run());
  }
  api.beginNight = beginNight;

  /* ---------------- torpor ---------------- */
  api.torporOptions = () => [10, 25, 50, 100].filter(y => s.year + y <= 1901);
  api.torpor = years => {
    if (s.loc !== 'haven') { s.hours = Math.max(0, s.hours - api.travelCost('haven')); s.loc = 'haven'; }
    const slept = [];
    const endYear = s.year + years;
    // Historical events slept through
    for (const h of DATA.HISTORY) {
      if (s.histDone[h.id]) continue;
      if (h.year < endYear || (h.year === endYear && h.month <= s.month)) {
        s.histDone[h.id] = true;
        if (h.apply) h.apply(s);
        slept.push(`<b>${h.year}</b> — ${h.sleep}`);
      }
    }
    s.year = endYear; s.undeadMonths += years * 12; s.turn += 1;
    s.stats.torpor += years;
    // Money
    const stewards = api.roleCount('steward');
    const eff = stewards ? 0.45 : 0.22;
    let earned = Math.round(api.income() * 12 * years * eff);
    const lost = [];
    for (const id of Object.keys(s.holdings)) if (R() < Math.min(0.8, years / 120) && s.inf.guilds < 50) { delete s.holdings[id]; lost.push(DATA.HOLDINGS.find(h => h.id === id).name); }
    s.gold += earned;
    // People
    const deaths = [];
    for (const c of s.circle) if (c.alive && c.kind !== 'childe') {
      c.age += years;
      if (c.kind === 'ghoul') c.loyalty -= years * 2;
      if (c.age >= c.lifespan) { c.alive = false; c.fate = 'died while you slept'; deaths.push(c); if (c.kind === 'lover') s.flags.loverLost = true; }
      else if (c.kind === 'ghoul' && c.loyalty <= 0) { c.alive = false; c.fate = 'abandoned you during your long sleep'; deaths.push(c); }
    }
    // World
    for (const f of Object.keys(s.inf)) s.inf[f] = Math.round(s.inf[f] * 0.35);
    s.susp = 0; s.hunter = null; s.tasks = []; s.offers = [];
    s.prestige = Math.round(s.prestige * 0.6);
    if (s.rival && years >= 25) { s.rival = { name: pick(DATA.RIVALS), standing: 50, power: 4 + eraIdx() + ri(0, 2) }; }
    let havenLost = false;
    if (years >= 50 && s.haven > 0 && !s.upgrades.sarcophagus && R() < 0.6) { s.haven--; havenLost = true; }
    s.humanity = Math.min(100, s.humanity + Math.min(5, Math.round(years / 10)));
    s.blood = 6; s.herd = 0; s.resonance = null;
    const pot = api.recalcPotency();
    s.health = api.maxHealth();

    const lines = [];
    lines.push(`You slept for <b>${years} years</b>. You wake in ${DATA.MONTHS[s.month]} of ${s.year}, ravenous.`);
    if (pot > 0) lines.push(`Your blood has thickened in the dark. <b>Blood Potency ${s.potency}.</b>`);
    lines.push(`Your fortune ${stewards ? 'was tended by your steward' : 'was left untended'}: <b>+£${earned}</b>.`);
    if (lost.length) lines.push(`Lost to lawsuits, fire and swindlers: ${lost.join(', ')}.`);
    for (const c of deaths) lines.push(`${c.name} — ${c.fate}.`);
    for (const c of deaths.filter(x => x.kind === 'lover')) lines.push(`<i>Beside your coffin you find a letter in ${c.name}'s hand, the ink faded brown: "I waited as long as I could. I hope you wake to a kinder world. I loved you. I think you loved me."</i>`);
    if (havenLost) lines.push('Your haven was sold for unpaid taxes while you slept. You wake in a meaner refuge.');
    lines.push('The Court has half-forgotten you. The hunters have forgotten you entirely.');
    api.log(`You wake from ${years} years of torpor.`, 'gold');
    Snd.play('organ');
    UI.torporCard(years, () => {
      UI.scene({ title: 'You Wake', glyph: '⚰', cls: 'era', eyebrow: `${s.year - years} — ${s.year}`,
        text: lines.map(l => `<p>${l}</p>`).join(''),
        ledger: slept.length ? [{ t: '<b>While you slept:</b>' }].concat(slept.map(t => ({ t }))) : null,
        choices: [{ label: 'Rise', onPick: () => { checkAchievements(); if (s.year >= 1901) ending('century'); else beginNight(); } }] });
    });
  };

  /* ---------------- achievements & endings ---------------- */
  function checkAchievements() {
    if (!s) return;
    for (const a of DATA.ACH) if (!s.ach[a.id] && a.test(s)) {
      s.ach[a.id] = true; UI.toast(`Achievement · ${a.name}`, 'ach'); Snd.play('ach');
      api.log(`Achievement unlocked: ${a.name}.`, 'gold');
    }
  }
  api.checkAchievements = checkAchievements;

  api.legacy = () => Math.round(api.ageYears() * 2 + s.prestige + s.humanity * 2 + s.gold / 50 + Object.keys(s.ach).length * 40 + s.rank * 60 + s.potency * 20);

  api.canSeekGolconda = () => (s.items.golconda || 0) >= 3 && s.humanity >= 90 && s.attrs.lore >= 6 && api.ageYears() >= 150;
  api.seekGolconda = () => ending('golconda');

  function ending(type) {
    const E = {
      slain: { title: 'Final Death', glyph: '✝', text: `${s.name} of ${api.clan().name} met the Final Death in ${s.year}. The body crumbled to ash in moments, as if centuries had been waiting to claim it. Of the name, nothing remains but a few whispered tales in the taverns of ${pick(['Southwark', 'Wapping', 'Cheapside'])}.` },
      staked: { title: 'Staked at Noon', glyph: '✠', text: `${s.hunter ? s.hunter.name : 'The hunters'} came at noon with stakes and axes and let the sun into your resting place. ${s.name} died screaming in the light, in ${s.year}. The hunter kept your fangs in a velvet box for the rest of their life.` },
      beast: { title: 'The Beast Triumphant', glyph: '☬', text: `In ${s.year}, the last spark of ${s.name} guttered out. What remains walks London's sewers on all fours and remembers nothing but hunger. The Prince sends hunters of your own kind to put it down. They never quite manage it. On foggy nights, it is said, the Thing still hunts.` },
      century: { title: 'The Century Turns', glyph: '☾', text: `January 1901. Queen Victoria is dead, and a new century dawns in electric light. ${s.name} stands on the roof of ${DATA.HAVENS[s.haven].name.replace(/^A /, 'a ')} and looks down on a city of seven million souls, and remembers the plague-pits of 1348.<br><br>${s.rank >= 5 ? 'You rule the night of London. ' : `You are ${DATA.RANKS[s.rank].name} of the Court. `}${s.humanity >= 60 ? 'And somehow, against all odds, you are still a person.' : s.humanity >= 30 ? 'You are something less than a person, and something more.' : 'There is very little of the person you were left.'} The twentieth century will have its own monsters. You will be waiting.` },
      golconda: { title: 'Golconda', glyph: '✦', text: `With the three leaves of the Codex before you, ${s.name} understands at last. Not a cure — a peace. The Beast lies down like a tired dog. The hunger remains, but it no longer rules. You walk out into the ${DATA.MOONS[s.month]} and, for the first time in ${api.ageYears()} years, you are not afraid of anything at all.` },
    }[type];
    s.ending = { type, ...E };
    api.wipe();
    Snd.play(type === 'century' || type === 'golconda' ? 'organ' : 'death');
    UI.renderEnding();
  }
  api.ending = ending;

  return api;
})();
