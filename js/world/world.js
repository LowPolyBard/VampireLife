/* ==========================================================
   CRIMSON CENTURIES — the night, in the first person
   Renderer & post-process, sky and weather, the city, the
   player's body, the clock, stealth, and every interaction
   that hands off to the chronicle engine (G).
   ========================================================== */

const World = (() => {
  const CS = TOWN.CS;
  const SETTINGS_KEY = 'cc-settings';
  const settings = Object.assign({ sens: 1, pixel: 3, hourSecs: 75, invert: false, grade: true, bob: true }, (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; } })());
  const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } };

  let renderer, scene, camera, rt, postScene, postCam, postMat, canvas;
  let sky, skyMat, glowPts, glowMat, motes, precip, mist = [];
  let hemi, moon, eyeLight;
  const pool = [];                   // point lights reused for the nearest lamps
  let town = null, built = null, builtEra = null, builtSeed = null;
  let mode = 'none';                 // 'title' | 'play'
  let paused = true, modal = false, bookOpen = false;
  let t = 0, last = performance.now();
  const keys = {};
  const dyn = [];                    // dynamic lights this frame (lanterns, torches)
  const pl = { x: 0, z: 0, y: 0, vy: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, speed: 0, crouch: 0, inside: false, vis: 0.5, bob: 0, eye: 1.62, grounded: true };
  let weather = { id: 'clear' };
  let W = {};                        // night-scoped world state
  let flash = 0, burn = 0, feedFx = 0;
  let titleCam = null;
  const isTouch = matchMedia('(pointer: coarse)').matches;

  /* ==================================================================
     Setup
     ================================================================== */
  function boot() {
    canvas = document.getElementById('view');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
    renderer.setPixelRatio(1);
    renderer.autoClear = true;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.08, 190);
    camera.rotation.order = 'YXZ';
    scene.add(camera);
    scene.fog = new THREE.FogExp2(0x160c0e, 0.035);

    hemi = new THREE.HemisphereLight(0x8a80a8, 0x2a1a1c, 0.6); scene.add(hemi);
    moon = new THREE.DirectionalLight(0xa8b4e0, 0.35); moon.position.set(-0.5, 1, -0.4); scene.add(moon);
    for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xffa060, 0, 15, 1.7); scene.add(l); pool.push(l); }
    // the dead see well in the dark: a faint cold light that follows the eye
    eyeLight = new THREE.PointLight(0x8890b8, 0.55, 16, 1.2); eyeLight.position.set(0, 0.4, 0.5); camera.add(eyeLight);

    buildSky();
    buildParticles();
    buildPost();
    HAVEN.setMats(TOWN.materials);

    addEventListener('resize', resize); resize();
    bindInput();
    requestAnimationFrame(frame);
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    const ph = [0, 420, 340, 270, 210][settings.pixel] || 270;
    const lh = Math.min(h, ph), lw = Math.round(lh * w / h);
    if (rt) rt.dispose();
    rt = new THREE.WebGLRenderTarget(lw, lh, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, format: THREE.RGBAFormat });
    camera.aspect = w / h; camera.updateProjectionMatrix();
    postMat.uniforms.res.value.set(lw, lh);
    if (glowMat) glowMat.uniforms.scale.value = lh / 2;
  }

  function buildPost() {
    postScene = new THREE.Scene();
    postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postMat = new THREE.ShaderMaterial({
      uniforms: {
        tex: { value: null }, res: { value: new THREE.Vector2(480, 270) }, time: { value: 0 },
        hunger: { value: 0 }, sense: { value: 0 }, dawn: { value: 0 }, flash: { value: 0 }, burn: { value: 0 },
        grade: { value: 1 }, feed: { value: 0 }, beast: { value: 0 }, fade: { value: 0 }, levels: { value: 22 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }',
      fragmentShader: `
        precision highp float;
        uniform sampler2D tex; uniform vec2 res; uniform float time, hunger, sense, dawn, flash, burn, grade, feed, beast, fade, levels;
        varying vec2 vUv;
        float bayer(vec2 p){ vec2 q = mod(p, 4.0); int x = int(q.x), y = int(q.y);
          int i = x + y*4; float m[16];
          m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
          float r = 0.0; for (int k=0;k<16;k++){ if (k==i) r = m[k]; } return r/16.0 - 0.5; }
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          vec2 px = floor(vUv*res);
          vec4 src = texture2D(tex, (px+0.5)/res);
          vec3 c = src.rgb;
          float mask = step(0.5, src.a);           // 0 where blood-sense silhouettes are drawn
          float lum = dot(c, vec3(0.299,0.587,0.114));
          if (grade > 0.5) {
            // crush and tint: shadows sink to oxblood, highlights to candle-gold
            c = pow(c, vec3(1.08));
            vec3 sh = vec3(0.10,0.035,0.05), hi = vec3(1.05,0.93,0.82);
            c = mix(c, vec3(lum), 0.28);
            c = c*hi + sh*(1.0-smoothstep(0.0,0.35,lum))*0.55;
            c *= vec3(1.06, 0.94, 0.96);
          }
          // the Beast's sight: a crimson monochrome, as in a fever
          float s = sense*mask;
          vec3 red = vec3(pow(lum,0.8)*1.35, lum*0.16, lum*0.14) + vec3(0.07,0.0,0.01);
          c = mix(c, red, s);
          c = mix(c, src.rgb*1.25, sense*(1.0-mask));
          // hunger bleeds in from the edges
          vec2 d = vUv-0.5; float v = dot(d,d);
          float pulse = 0.6+0.4*sin(time*(3.0+hunger*3.0));
          c = mix(c, c*vec3(1.2,0.35,0.35), clamp(hunger*v*3.2*pulse,0.0,0.9));
          c = mix(c, vec3(0.5,0.0,0.03), clamp(beast*v*2.5,0.0,0.6));
          // dawn: the sky bruises, the light turns cruel
          c = mix(c, c*vec3(1.35,0.95,0.9)+vec3(0.08,0.03,0.05), dawn);
          c = mix(c, vec3(1.0,0.85,0.6), burn*0.75);
          c += vec3(0.5,0.0,0.0)*flash + vec3(0.25,0.0,0.02)*feed*(1.0-v*2.0);
          // vignette and grain
          c *= 1.0 - v*1.35;
          c += (hash(px+fract(time)*91.0)-0.5)*0.035;
          // ordered dither into a limited palette
          c += bayer(px)*(1.0/levels);
          c = floor(c*levels+0.5)/levels;
          c *= 1.0 - fade;
          gl_FragColor = vec4(clamp(c,0.0,1.0),1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
  }

  function buildSky() {
    skyMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color(0x05030a) }, hor: { value: new THREE.Color(0x2a1418) }, moonDir: { value: new THREE.Vector3(-0.4, 0.5, -0.75).normalize() }, moonCol: { value: new THREE.Color(0xe8e4d4) }, time: { value: 0 }, dawn: { value: 0 }, cloud: { value: 0.5 }, stars: { value: 1 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
      fragmentShader: `
        uniform vec3 top, hor, moonDir, moonCol; uniform float time, dawn, cloud, stars; varying vec3 vD;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec3 d = normalize(vD); float y = max(d.y, 0.0);
          vec3 c = mix(hor, top, pow(y, 0.55));
          c = mix(c, vec3(0.55,0.2,0.22), dawn*pow(1.0-y, 3.0));
          vec2 sp = d.xz/(d.y+0.15)*60.0;
          float st = step(0.9975, h(floor(sp))) * smoothstep(0.05,0.3,y) * stars;
          c += st*vec3(0.9,0.85,0.8)*(0.6+0.4*sin(time*2.0+h(floor(sp))*40.0));
          float md = dot(d, moonDir);
          float disc = smoothstep(0.9993, 0.99955, md);
          vec2 mp = (d.xz - moonDir.xz)*300.0;
          float crater = n(mp*0.35)*0.35;
          c += moonCol*disc*(0.85-crater) + moonCol*pow(max(md,0.0), 90.0)*0.35 + moonCol*pow(max(md,0.0), 8.0)*0.06;
          vec2 cp = d.xz/(d.y+0.25)*2.2 + vec2(time*0.01, time*0.004);
          float cl = n(cp)*0.6 + n(cp*2.3)*0.3 + n(cp*5.1)*0.1;
          cl = smoothstep(0.55-cloud*0.35, 0.95, cl)*smoothstep(0.0,0.25,y);
          vec3 cc = mix(hor*0.7, vec3(0.2,0.16,0.18), 0.5) + moonCol*pow(max(md,0.0),20.0)*0.25;
          c = mix(c, cc, cl*0.9);
          gl_FragColor = vec4(c, 1.0);
        }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    sky = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12), skyMat);
    sky.renderOrder = -10;
    scene.add(sky);
  }

  function buildParticles() {
    // glows: every lamp, torch and lit lantern in the city, drawn as soft sprites
    glowMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: TEX.get('glow') }, time: { value: 0 }, scale: { value: 150 }, fogD: { value: 0.035 } },
      vertexShader: `attribute vec3 col; attribute float size; attribute float fire; uniform float time, scale; varying vec3 vC; varying float vF;
        void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); float fl = 1.0 + fire*(0.18*sin(time*13.0+position.x*3.0)+0.12*sin(time*23.0+position.z));
          vC = col*fl; gl_PointSize = size*fl*scale/-mv.z; vF = -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: 'uniform sampler2D map; uniform float fogD; varying vec3 vC; varying float vF; void main(){ vec4 t = texture2D(map, gl_PointCoord); float f = exp(-fogD*fogD*vF*vF*0.6); gl_FragColor = vec4(vC*t.rgb*t.a*f*1.2, 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    // drifting motes, ash, rain & snow around the eye
    const n = 900;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    motes = new THREE.Points(g, new THREE.PointsMaterial({ map: TEX.get('dot'), size: 0.07, transparent: true, depthWrite: false, color: 0xd8c0b0, opacity: 0.7, blending: THREE.AdditiveBlending }));
    motes.userData.v = new Float32Array(n * 3);
    motes.frustumCulled = false;
    scene.add(motes);
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(1400 * 6), 3));
    precip = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x8890a0, transparent: true, opacity: 0.35 }));
    precip.frustumCulled = false; precip.visible = false;
    scene.add(precip);
    // low mist wisps
    const mc = TEX.canvas(64, 64), mx = mc.getContext('2d');
    const gr = mx.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    mx.fillStyle = gr; mx.fillRect(0, 0, 64, 64);
    const mt = new THREE.CanvasTexture(mc);
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, color: 0x806870, transparent: true, opacity: 0.1, depthWrite: false, fog: true }));
      s.scale.set(9, 3, 1); s.userData.o = [Math.random() * 60 - 30, Math.random() * 60 - 30, 0.3 + Math.random() * 0.02];
      scene.add(s); mist.push(s);
    }
  }

  function setGlows(list) {
    if (glowPts) { scene.remove(glowPts); glowPts.geometry.dispose(); }
    const n = list.length;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), fire = new Float32Array(n);
    list.forEach((g, i) => { pos.set([g.x, g.y, g.z], i * 3); col.set(g.c, i * 3); size[i] = g.s; fire[i] = g.fire ? 1 : 0.2; });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('col', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('fire', new THREE.BufferAttribute(fire, 1));
    glowPts = new THREE.Points(geo, glowMat); glowPts.frustumCulled = false;
    scene.add(glowPts);
  }

  /* ==================================================================
     The city
     ================================================================== */
  function ensureTown(seed, era) {
    if (!town || builtSeed !== seed) { town = TOWN.generate(seed); builtSeed = seed; builtEra = null; }
    if (builtEra !== era) {
      if (built) { scene.remove(built.group); built.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
      built = TOWN.build(town, era);
      scene.add(built.group);
      builtEra = era;
      setGlows(built.glows);
      PEOPLE.init(scene, town, hooks, era, seed + era.length);
    }
    return town;
  }

  /* ---------------- weather & sky ---------------- */
  const WEATHER = {
    clear: { fog: 0.028, fogC: 0x1a0e14, hor: 0x341a26, top: 0x06040e, hemi: 0.95, moon: 0.55, cloud: 0.25, stars: 1, motes: 'dust', crowd: 1 },
    mist: { fog: 0.042, fogC: 0x28181e, hor: 0x341e24, top: 0x0a0608, hemi: 0.95, moon: 0.35, cloud: 0.55, stars: 0.5, motes: 'dust', crowd: 0.9 },
    fog: { fog: 0.07, fogC: 0x3a2a2c, hor: 0x3c2a2c, top: 0x201618, hemi: 1.0, moon: 0.15, cloud: 1, stars: 0, motes: 'dust', crowd: 0.75 },
    rain: { fog: 0.048, fogC: 0x141620, hor: 0x1e1e2a, top: 0x06060a, hemi: 0.85, moon: 0.12, cloud: 1, stars: 0, motes: 'rain', crowd: 0.55 },
    snow: { fog: 0.05, fogC: 0x2e2e3a, hor: 0x34323e, top: 0x0c0c14, hemi: 1.05, moon: 0.25, cloud: 0.9, stars: 0.2, motes: 'snow', crowd: 0.6 },
    blood: { fog: 0.032, fogC: 0x30090c, hor: 0x541216, top: 0x0a0204, hemi: 0.95, moon: 0.6, cloud: 0.3, stars: 0.7, motes: 'ash', crowd: 0.8, red: true },
    smoke: { fog: 0.055, fogC: 0x2e1e16, hor: 0x3e281c, top: 0x100806, hemi: 0.9, moon: 0.18, cloud: 0.9, stars: 0, motes: 'ash', crowd: 0.8 },
  };
  function rollWeather(s, R) {
    const m = s ? s.month : 9;
    let id = 'clear';
    const r = R();
    const winter = m === 11 || m <= 1;
    if (s && s.flags.fog) id = 'fog';
    else if (r < 0.06) id = 'blood';
    else if (r < 0.26) id = 'mist';
    else if (r < 0.38) id = s && s.eraId === 'victorian' ? 'fog' : 'mist';
    else if (r < 0.56) id = winter ? 'snow' : 'rain';
    else if (r < 0.62 && s && (s.eraId === 'victorian' || s.eraId === 'georgian')) id = 'smoke';
    applyWeather(id);
  }
  function applyWeather(id) {
    weather = Object.assign({ id }, WEATHER[id]);
    scene.fog.color.setHex(weather.fogC); scene.fog.density = weather.fog;
    skyMat.uniforms.hor.value.setHex(weather.hor); skyMat.uniforms.top.value.setHex(weather.top);
    skyMat.uniforms.cloud.value = weather.cloud; skyMat.uniforms.stars.value = weather.stars;
    skyMat.uniforms.moonCol.value.setHex(weather.red ? 0xd83020 : 0xe8e4d4);
    moon.color.setHex(weather.red ? 0xd06050 : 0xa8b4e0);
    renderer.setClearColor(weather.fogC, 1);
    precip.visible = weather.motes === 'rain';
    motes.material.color.setHex(weather.motes === 'snow' ? 0xe8e8f0 : weather.motes === 'ash' ? 0xff7040 : 0xd8c0b0);
    motes.material.size = weather.motes === 'snow' ? 0.11 : 0.06;
    for (const s of mist) s.material.color.setHex(weather.fogC).multiplyScalar(2.2);
    glowMat.uniforms.fogD.value = weather.fog;
    Snd.weather && Snd.weather(id);
  }

  /* ==================================================================
     Game hooks: what the chronicle engine tells the world
     ================================================================== */
  const hooks = {
    vessel: did => (G.s && G.genVessel ? G.genVessel(did) : null),
    dyn: (x, y, z, c, p, n) => dyn.push({ x, y, z, c, p, flick: 0.2, n }),
    wanted: () => W.wanted > 0,
    onScream: (n, loud) => { Snd.play('scream', { pan: panOf(n.x, n.z), dist: Math.hypot(n.x - pl.x, n.z - pl.z) }); },
    onBodyFound: (c, n) => {
      if (!G.s) return;
      const d = G.bodyFound ? G.bodyFound(c.v) : null;
      HUD.whisper(`A scream in the dark — someone has found ${c.v.name}.`, 'blood');
      W.wanted = Math.max(W.wanted, 40);
    },
    onWake: n => { HUD.whisper(`${n.v.name} blinks, shivers, and hurries away, unsure why they came.`); },
    onChase: n => { HUD.alert(`${cap(n.v.occ)}! The watch is after you.`); Snd.play('whistle'); },
    onCaught: n => { if (!G.s || modal || W.act) return; if (n.kind === 'hunter') { n.state = 'chase'; return; } arrest(n); },
    onHunterSees: n => { HUD.alert(`${G.s.hunter ? G.s.hunter.name : 'The hunter'} has seen you.`); Snd.play('sting'); if (n.hp === undefined) n.hp = 100; },
  };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function panOf(x, z) { const dx = x - pl.x, dz = z - pl.z, d = Math.hypot(dx, dz) || 1; return (dx * Math.cos(pl.yaw) - dz * Math.sin(pl.yaw)) / d; }

  /* ==================================================================
     Night lifecycle
     ================================================================== */
  function startGame() {
    const s = G.s;
    if (!s.seed) s.seed = (Math.random() * 1e9) | 0;
    mode = 'play';
    ensureTown(s.seed, s.eraId);
    document.body.classList.add('in-world');
    newNight(true);
  }

  function newNight(first) {
    const s = G.s; if (!s) return;
    ensureTown(s.seed, s.eraId);
    PEOPLE.clear();
    PEOPLE.setEra(s.eraId);
    const R = WU.rng(s.seed + s.turn * 131);
    rollWeather(s, R);
    W = { wanted: 0, corpses: 0, act: null, hunterNpc: null, lastLoc: null, bell: s.hours, warned: false, spawnedHunter: false, seen: {} };
    s.night.min = s.night.min || 0;
    enterHaven(true);
    HUD.reset();
  }

  function randomCell(did, R) {
    for (let t2 = 0; t2 < 200; t2++) {
      const i = R.int(2, TOWN.N - 3), j = R.int(2, TOWN.N - 3), k = TOWN.idx(i, j);
      if (TOWN.DIDS[town.dist[k]] !== did || (town.type[k] !== TOWN.T.STREET && town.type[k] !== TOWN.T.PLAZA && town.type[k] !== TOWN.T.OPEN) || town.blocked[k]) continue;
      // prefer quiet corners: next to walls
      let walls = 0; for (const [dx, dz] of TOWN.DIRS) if (!TOWN.WALKABLE[town.type[TOWN.idx(i + dx, j + dz)]]) walls++;
      if (walls < 2 && R() < 0.7) continue;
      return [(i + 0.5) * CS, (j + 0.5) * CS];
    }
    return null;
  }

  function enterHaven(silent) {
    const s = G.s;
    pl.inside = true;
    const st = HAVEN.build(s.haven, s, scene);
    pl.x = st.spawn.x; pl.z = st.spawn.z; pl.yaw = st.spawn.yaw; pl.pitch = -0.05; pl.vx = pl.vz = 0;
    if (built) built.group.visible = false;
    if (glowPts) glowPts.visible = false;
    for (const m of mist) m.visible = false;
    sky.visible = false; precip.visible = false;
    scene.fog.color.setHex(0x0a0606); scene.fog.density = 0.05;
    renderer.setClearColor(0x050303, 1);
    s.loc = 'haven';
    if (!silent) { Snd.play('door'); fadeIn(); }
  }
  function leaveHaven() {
    const s = G.s;
    pl.inside = false;
    const d = town.havens[s.haven];
    pl.x = d.x + d.nx * 1.6; pl.z = d.z + d.nz * 1.6; pl.yaw = Math.atan2(-d.nx, -d.nz); pl.pitch = 0;
    built.group.visible = true; glowPts.visible = true; sky.visible = true;
    for (const m of mist) m.visible = true;
    applyWeather(weather.id);
    s.loc = TOWN.districtAt(town, pl.x, pl.z);
    Snd.play('door'); fadeIn();
    HUD.district(G.distName(s.loc), G.dist(s.loc).desc[G.era().id]);
  }
  let fadeT = 0;
  function fadeIn() { fadeT = 1; }

  /* ==================================================================
     Input
     ================================================================== */
  function bindInput() {
    addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      keys[e.code] = true;
      if (mode !== 'play') return;
      if (e.code === 'Tab' || e.code === 'KeyJ') { e.preventDefault(); if (!modal) { if (bookOpen) UI.closeBook(); else UI.openBook(); } return; }
      if (e.code === 'KeyM' && !modal) { if (bookOpen) UI.closeBook(); else UI.openBook('city'); return; }
      if (modal || bookOpen) return;
      if (W.act && W.act.type === 'frenzy' && e.code === 'Space') { pressKey('Space'); return; }
      if (paused && !isTouch) return;
      if (!e.repeat && (KEYS.includes(e.code))) pressKey(e.code);
      if (e.code === 'KeyR') quickMend();
      if (e.code === 'KeyH') takeWing();
      if (e.code === 'Space' && pl.grounded) { pl.vy = G.power('nightwings') >= 1 ? 6.2 : 4.4; pl.grounded = false; }
    });
    addEventListener('keyup', e => { keys[e.code] = false; });
    addEventListener('mousedown', e => { if (e.button === 0 && document.pointerLockElement === canvas) { keys.Mouse0 = true; if (!W.act || W.act.type !== 'feed') pressKey('KeyE'); keys.KeyE = true; } });
    addEventListener('mouseup', e => { if (e.button === 0) { keys.Mouse0 = false; keys.KeyE = false; } });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    canvas.addEventListener('click', () => { if (mode === 'play' && !modal && !bookOpen) lock(); });
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      if (!locked && mode === 'play' && !modal && !bookOpen && !isTouch) { paused = true; UI.pauseMenu(); }
      if (locked) paused = false;
    });
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement !== canvas || mode !== 'play') return;
      const k = 0.0022 * settings.sens;
      pl.yaw -= e.movementX * k;
      pl.pitch -= e.movementY * k * (settings.invert ? -1 : 1);
      pl.pitch = WU.clamp(pl.pitch, -1.45, 1.45);
    });
    if (isTouch) touchControls();
  }
  function lock() {
    if (isTouch) { paused = false; return; }
    try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
  }
  function releasePointer() { if (document.pointerLockElement) document.exitPointerLock(); }

  const touch = { mx: 0, mz: 0, look: null, stick: null };
  function touchControls() {
    const el = document.getElementById('touch');
    if (!el) return;
    el.classList.add('on');
    const stick = el.querySelector('.t-stick'), knob = el.querySelector('.t-knob');
    let sid = null, sx = 0, sy = 0, lid = null, lx = 0, ly = 0;
    canvas.addEventListener('touchstart', e => {
      for (const tt of e.changedTouches) {
        if (tt.clientX < innerWidth * 0.4 && sid === null) { sid = tt.identifier; sx = tt.clientX; sy = tt.clientY; stick.style.left = sx - 50 + 'px'; stick.style.top = sy - 50 + 'px'; stick.classList.add('on'); }
        else if (lid === null) { lid = tt.identifier; lx = tt.clientX; ly = tt.clientY; }
      }
      if (mode === 'play' && !modal && !bookOpen) paused = false;
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      for (const tt of e.changedTouches) {
        if (tt.identifier === sid) { const dx = tt.clientX - sx, dy = tt.clientY - sy, L = Math.min(45, Math.hypot(dx, dy)), a = Math.atan2(dy, dx); knob.style.transform = `translate(${Math.cos(a) * L}px,${Math.sin(a) * L}px)`; touch.mx = Math.cos(a) * L / 45; touch.mz = Math.sin(a) * L / 45; }
        if (tt.identifier === lid) { pl.yaw -= (tt.clientX - lx) * 0.006 * settings.sens; pl.pitch = WU.clamp(pl.pitch - (tt.clientY - ly) * 0.006 * settings.sens, -1.4, 1.4); lx = tt.clientX; ly = tt.clientY; }
      }
    }, { passive: true });
    const end = e => { for (const tt of e.changedTouches) { if (tt.identifier === sid) { sid = null; touch.mx = touch.mz = 0; knob.style.transform = ''; stick.classList.remove('on'); } if (tt.identifier === lid) lid = null; } };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
    el.querySelectorAll('[data-t]').forEach(b => {
      b.addEventListener('touchstart', e => {
        e.preventDefault(); const a = b.dataset.t;
        if (mode !== 'play' || modal) return;
        if (KEYS.includes(a)) { keys[a] = true; pressKey(a); }
        if (a === 'book') UI.openBook(); if (a === 'map') UI.openBook('city');
        if (a === 'sense') keys.KeyQ = true; if (a === 'run') keys.ShiftLeft = !keys.ShiftLeft; if (a === 'crouch') keys.KeyC = !keys.KeyC;
      });
      b.addEventListener('touchend', () => { const a = b.dataset.t; if (a === 'sense') keys.KeyQ = false; if (KEYS.includes(a)) keys[a] = false; });
    });
  }

  /* ==================================================================
     Movement & collision
     ================================================================== */
  function solidAt(i, j) {
    if (!TOWN.inb(i, j)) return true;
    return !TOWN.WALKABLE[town.type[TOWN.idx(i, j)]];
  }
  function collide(r) {
    if (pl.inside) {
      const b = HAVEN.state.bounds;
      pl.x = WU.clamp(pl.x, b.x0, b.x1); pl.z = WU.clamp(pl.z, b.z0, b.z1);
      for (const c of HAVEN.state.colliders) pushCircle(c, r);
      return;
    }
    for (let pass = 0; pass < 2; pass++) {
      const ci = Math.floor(pl.x / CS), cj = Math.floor(pl.z / CS);
      for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
        if (!solidAt(i, j)) continue;
        const x0 = i * CS, z0 = j * CS;
        const qx = WU.clamp(pl.x, x0, x0 + CS), qz = WU.clamp(pl.z, z0, z0 + CS);
        const dx = pl.x - qx, dz = pl.z - qz, d = Math.hypot(dx, dz);
        if (d < r) {
          if (d > 1e-5) { pl.x = qx + dx / d * r; pl.z = qz + dz / d * r; }
          else { // inside the block: push out along the shortest axis
            const ox = Math.min(pl.x - x0, x0 + CS - pl.x), oz = Math.min(pl.z - z0, z0 + CS - pl.z);
            if (ox < oz) pl.x = pl.x - x0 < CS / 2 ? x0 - r : x0 + CS + r; else pl.z = pl.z - z0 < CS / 2 ? z0 - r : z0 + CS + r;
          }
        }
      }
      for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
        const arr = town.propGrid[TOWN.idx(i, j)]; if (arr) for (const c of arr) pushCircle(c, r);
      }
      for (const c of built.colliders) if (Math.abs(c.x - pl.x) < 2 && Math.abs(c.z - pl.z) < 2) pushCircle(c, r);
      for (const n of PEOPLE.list) if (n.state !== 'dead' && Math.abs(n.x - pl.x) < 1.2 && Math.abs(n.z - pl.z) < 1.2) pushCircle({ x: n.x, z: n.z, r: 0.3 }, r);
    }
  }
  function pushCircle(c, r) {
    const dx = pl.x - c.x, dz = pl.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
    if (d < m && d > 1e-5) { pl.x = c.x + dx / d * m; pl.z = c.z + dz / d * m; }
  }

  function movePlayer(dt) {
    const s = G.s;
    let fx = 0, fz = 0;
    if (keys.KeyW || keys.ArrowUp) fz += 1;
    if (keys.KeyS || keys.ArrowDown) fz -= 1;
    if (keys.KeyA || keys.ArrowLeft) fx -= 1;
    if (keys.KeyD || keys.ArrowRight) fx += 1;
    if (isTouch) { fx += touch.mx; fz -= touch.mz; }
    const L = Math.hypot(fx, fz); if (L > 1) { fx /= L; fz /= L; }
    const crouch = keys.KeyC || keys.ControlLeft;
    pl.crouch += ((crouch ? 1 : 0) - pl.crouch) * Math.min(1, dt * 8);
    const run = (keys.ShiftLeft || keys.ShiftRight) && !crouch;
    const q = s ? G.power('quickening') : 0;
    const max = crouch ? 1.7 : run ? 6.2 + q * 0.9 : 3.0;
    const sy = Math.sin(pl.yaw), cy = Math.cos(pl.yaw);
    // forward is -z in camera space; the world yaw convention: forward = (-sin, -cos)
    const tx = (-sy * fz + cy * fx) * max, tz = (-cy * fz - sy * fx) * max;
    const acc = pl.grounded ? 12 : 3;
    pl.vx += (tx - pl.vx) * Math.min(1, dt * acc);
    pl.vz += (tz - pl.vz) * Math.min(1, dt * acc);
    pl.x += pl.vx * dt; pl.z += pl.vz * dt;
    // gravity and leaps
    pl.vy -= (keys.Space && s && G.power('nightwings') >= 2 && pl.vy < 0 ? 4 : 16) * dt;
    pl.y += pl.vy * dt;
    if (pl.y <= 0) { if (!pl.grounded && pl.vy < -5) Snd.play('land'); pl.y = 0; pl.vy = 0; pl.grounded = true; }
    collide(0.32);
    pl.speed = Math.hypot(pl.vx, pl.vz);
    // footsteps and bob
    if (pl.grounded && pl.speed > 0.4) {
      const before = Math.sin(pl.bob);
      pl.bob += dt * pl.speed * 2.3;
      if (Math.sign(Math.sin(pl.bob)) !== Math.sign(before)) Snd.play('step', { surf: surfaceAt(), run: pl.speed > 4, soft: crouch });
    }
  }
  function surfaceAt() {
    if (pl.inside) return 'stone';
    const k = TOWN.idx(Math.floor(pl.x / CS), Math.floor(pl.z / CS)), ty = town.type[k];
    if (ty === TOWN.T.OPEN) return 'grass';
    if (ty === TOWN.T.BRIDGE && (builtEra === 'medieval' || builtEra === 'tudor')) return 'wood';
    if (ty === TOWN.T.STREET && builtEra === 'medieval' && ['whitechapel', 'southwark', 'graveyard', 'docks'].includes(TOWN.DIDS[town.dist[k]])) return 'mud';
    return 'stone';
  }

  /* ==================================================================
     Light: the pool of real lights, and how visible you are
     ================================================================== */
  let sortT = 0, sorted = [];
  function updateLights(dt) {
    const src = pl.inside ? HAVEN.state.lights : built.lights;
    sortT -= dt;
    if (sortT <= 0) {
      sortT = 0.3;
      sorted = src.map(l => ({ l, d: Math.hypot(l.x - pl.x, l.z - pl.z) })).filter(q => q.d < 40).sort((a, b) => a.d - b.d).slice(0, 8).map(q => q.l);
    }
    const all = sorted.concat(pl.inside ? [] : dyn.filter(d => Math.hypot(d.x - pl.x, d.z - pl.z) < 30)).map(l => ({ l, d: Math.hypot(l.x - pl.x, l.z - pl.z) })).sort((a, b) => a.d - b.d).slice(0, pool.length);
    let vis = pl.inside ? 0.2 : (weather.moon || 0.2) * 0.55 + 0.08;
    for (let i = 0; i < pool.length; i++) {
      const L = pool[i], q = all[i];
      if (!q) { L.intensity = 0; continue; }
      const l = q.l;
      L.position.set(l.x, l.y, l.z);
      L.color.setRGB(l.c[0], l.c[1], l.c[2]);
      const f = 1 + (l.flick || 0) * (Math.sin(t * 11 + l.x) * 0.5 + Math.sin(t * 23 + l.z) * 0.3 + (Math.random() - 0.5) * 0.4);
      L.intensity = l.p * 1.35 * f;
      L.distance = l.fire ? 11 : 15;
      const k = Math.max(0, 1 - q.d / 9);
      vis += l.p * k * k * 0.9;
    }
    pl.vis = WU.clamp(vis * (1 - pl.crouch * 0.45) * (G.s ? [1, 0.85, 0.72, 0.6][G.power('shadowcraft')] : 1) * (weather.id === 'fog' ? 0.7 : 1), 0.05, 1);
    dyn.length = 0;
  }

  /* ==================================================================
     Interaction: context actions on E, F and G — some tapped, some held
     ================================================================== */
  let target = null;
  const KEYS = ['KeyE', 'KeyF', 'KeyG'];
  const KL = { KeyE: 'E', KeyF: 'F', KeyG: 'G' };
  const act = (key, label, run, o = {}) => ({ key, label, run, ...o });
  const pct = p => `${Math.round(p * 100)}%`;

  function findTarget() {
    const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw);
    let best = null;
    const consider = (o, x, z, reach, build, kind) => {
      const dx = x - pl.x, dz = z - pl.z, d = Math.hypot(dx, dz);
      if (d > reach) return;
      const dot = d < 0.5 ? 1 : (dx * fx + dz * fz) / d;
      if (dot < 0.62) return;
      const sc = dot * 2 - d / reach;
      if (!best || sc > best.sc) best = { sc, o, x, z, d, kind, build };
    };
    if (pl.inside) {
      for (const it of HAVEN.state.items) consider(it, it.x, it.z, 1.9, havenActions, 'item');
    } else {
      for (const n of PEOPLE.list) {
        if (n.state === 'dead') { if (!n.hidden) consider(n, n.x, n.z, 2.2, corpseActions, 'corpse'); continue; }
        if (n.kind === 'hunter') { consider(n, n.x, n.z, 3.2, hunterActions, 'hunter'); continue; }
        if (n.kind === 'encounter' || n.v.fed || n.v.bound || n.state === 'flee' || n.state === 'leave' || n.state === 'dazed') continue;
        const reach = G.power('mesmerism') >= 1 ? 7 : n.state === 'charmed' || n.state === 'entranced' ? 2.6 : 3.4;
        consider(n, n.x, n.z, reach, vesselActions, 'vessel');
      }
      for (const sd of town.sites) { const d = sd.door; consider(sd, d.x + d.nx * 0.6, d.z + d.nz * 0.6, 2.6, siteActions, 'site'); }
      town.havens.forEach((d, lvl) => consider({ lvl, d }, d.x + d.nx * 0.6, d.z + d.nz * 0.6, 2.6, havenDoorActions, 'haven'));
      { const d = town.elysium; consider(d, d.x + d.nx * 0.6, d.z + d.nz * 0.6, 2.6, elysiumActions, 'elysium'); }
      if (G.s.hunter && G.s.hunter.known) { const d = town.lodging; consider(d, d.x + d.nx * 0.6, d.z + d.nz * 0.6, 2.6, lodgingActions, 'lodging'); }
    }
    if (best) Object.assign(best, best.build(best.o, best));
    return best;
  }

  /* ---- the living ---- */
  function facing(n) {
    // how the mortal stands relative to you: from behind, or face to face
    const ang = Math.atan2(pl.x - n.x, pl.z - n.z);
    let da = ang - n.yaw; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
    return Math.abs(da);
  }
  function vesselActions(n, tg) {
    const v = n.v, d = tg.d;
    const out = [];
    const sub = `${G.an(v.occ)}, ${v.trait}`;
    if (n.state === 'charmed' || n.state === 'entranced') {
      out.push(act('KeyE', 'Drink', () => startFeed(n, n.state === 'charmed' ? 'allure' : 'lore'), { sub: n.state === 'charmed' ? 'They lean in, eyes half-closed' : 'They wait, empty-eyed' }));
      return { title: v.name, sub, actions: out };
    }
    const behind = facing(n) > 1.7 && !n.noticed;
    const bonus = mightBonus(n);
    if (d < 2.3) {
      const p = G.huntChance('might', v, bonus);
      out.push(act('KeyE', behind ? 'Seize from behind' : 'Seize', () => seize(n, bonus), { sub: `Might · ${pct(p)}${behind ? ' · unseen' : n.noticed ? ' · they are watching you' : ''}` }));
    }
    if (d < 3.4 && facing(n) < 1.4) {
      const p = G.huntChance('allure', v, 0);
      out.push(act('KeyF', 'Beckon them into the dark', () => beckon(n), { sub: `Allure · ${pct(p)}` }));
    }
    if (G.power('mesmerism') >= 1 && facing(n) < 1.2) {
      const p = G.huntChance('lore', v, 0);
      out.push(act('KeyG', 'Hold their gaze', () => mesmerize(n), { hold: Math.max(0.7, 1.9 - G.attr('lore') * 0.1), sub: `Mesmerism · ${pct(p)}` }));
    }
    return { title: v.name, sub, actions: out, vessel: n };
  }
  function mightBonus(n) {
    let b = 0;
    if (facing(n) > 1.7 && !n.noticed) b += 0.15;
    else if (n.noticed) b -= 0.1;
    if (pl.vis < 0.35) b += 0.08;
    if (pl.crouch > 0.5) b += 0.04;
    return b;
  }
  function witnessInfo(n, quiet) {
    let wit = PEOPLE.witnesses(n, pl);
    if (quiet) wit = wit.filter(w => w.dP < 9);
    const watch = wit.filter(w => w.kind === 'watch').length;
    return { wit, xs: Math.min(20, wit.length * 3 + watch * 4) };
  }
  function seize(n, bonus) {
    const s = G.s, did = TOWN.districtAt(town, n.x, n.z);
    spend(10);
    Snd.play('lunge');
    if (G.huntRoll('might', n.v, bonus)) return startFeed(n, 'might');
    const { wit, xs } = witnessInfo(n);
    const chips = G.feedFail(n.v, did, xs);
    n.state = 'flee'; n.fleeT = 12; n.path = null; PEOPLE.scream(n, 1.3);
    W.wanted = Math.max(W.wanted, 50 + wit.length * 15);
    flash = 0.5;
    UI.notify({ title: 'They break free', glyph: '✖', ok: false, text: `${n.v.name} twists out of your grip and runs, screaming.`, chips });
    G.postAction(false);
  }
  function beckon(n) {
    spend(5);
    if (G.huntRoll('allure', n.v, 0)) {
      n.state = 'charmed'; n.charmT = 50; n.path = null;
      HUD.whisper(`${n.v.name} smiles, uncertain, and follows. Lead them somewhere dark.`);
      Snd.play('heartbeat');
    } else {
      n.state = 'walk'; n.path = null; n.speed = 2; n.aware = 1.5; n.noticed = true;
      const chips = G.s ? [] : [];
      HUD.whisper(`${n.v.name} flinches from your cold hand and hurries away.`);
      if (n.v.wary >= 5) { n.state = 'flee'; n.fleeT = 6; PEOPLE.scream(n, 0.6); }
    }
  }
  function mesmerize(n) {
    spend(5);
    if (G.huntRoll('lore', n.v, 0)) {
      n.state = 'entranced'; n.charmT = 40; n.path = null;
      HUD.whisper(`${n.v.name}'s pupils swell to black moons. They will not move until you let them.`);
    } else {
      n.aware = 2; n.noticed = true;
      if (n.v.wary >= 4) { n.state = 'flee'; n.fleeT = 8; n.path = null; PEOPLE.scream(n, 0.8); W.wanted = Math.max(W.wanted, 30); }
      HUD.whisper('Their eyes slide away from yours. The spell breaks.');
    }
  }

  /* ---- feeding: hold to drink, let go to spare them ---- */
  function startFeed(n, how) {
    const quiet = how !== 'might';
    const { wit, xs } = witnessInfo(n, quiet);
    const did = TOWN.districtAt(town, n.x, n.z);
    spend(10);
    n.state = 'held'; n.path = null;
    W.act = { type: 'feed', n, v: n.v, did, how, frac: 0, idle: 0, xs, wit, full: G.vesselBlood(n.v, did), beat: 0, start: G.s.blood };
    feedFx = 1; Snd.play('bite');
    if (!quiet || wit.length) for (const w of wit) {
      if (w.kind === 'watch') { w.state = 'chase'; w.path = null; }
      else if (!quiet || w.dP < 6) { w.state = 'flee'; w.fleeT = 10; w.path = null; PEOPLE.scream(w, 1); }
    }
    if (wit.length) W.wanted = Math.max(W.wanted, quiet ? 25 : 60 + wit.length * 12);
  }
  function feedFrame(dt) {
    const A = W.act, n = A.n;
    const drinking = keys.KeyE || keys.Mouse0;
    if (drinking) { A.frac = Math.min(1, A.frac + dt * 0.19); A.idle = 0; }
    else A.idle += dt;
    // their heart slows as you drink
    A.beat -= dt;
    if (A.beat <= 0) { A.beat = 0.45 + A.frac * 1.3 + (A.frac > 0.85 ? Math.random() * 0.6 : 0); Snd.play('heartbeat'); feedFx = Math.min(1.4, feedFx + 0.25 + A.frac * 0.3); }
    // hold the embrace: close behind them, at the throat
    const bx = n.x - Math.sin(n.yaw) * 0.8, bz = n.z - Math.cos(n.yaw) * 0.8;
    pl.x += (bx - pl.x) * Math.min(1, dt * 8); pl.z += (bz - pl.z) * Math.min(1, dt * 8);
    const want = Math.atan2(-(n.x - pl.x), -(n.z - pl.z));
    let da = want - pl.yaw; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
    pl.yaw += da * Math.min(1, dt * 6); pl.pitch += (-0.2 - pl.pitch) * Math.min(1, dt * 5); pl.crouch += (0.4 - pl.crouch) * Math.min(1, dt * 5);
    n.f.head.rotation.z = 0.5 * Math.min(1, A.frac * 4); n.f.body.rotation.x = A.frac * 0.25;
    if (A.frac >= 1 || (A.idle > 1.1 && A.frac > 0.02) || A.idle > 4) endFeed(false);
  }
  function endFeed(bind) {
    const A = W.act; if (!A || A.type !== 'feed') return;
    W.act = null;
    const n = A.n;
    const r = G.feedFinish(A.v, A.did, Math.max(0.04, A.frac), { bind, extraSusp: A.xs, gentle: A.how !== 'might' && !A.wit.length });
    n.f.head.rotation.z = 0; n.f.body.rotation.x = n.a.hunch;
    if (r.tier === 'drain') { PEOPLE.kill(n); W.corpses++; feedFx = 1.6; }
    else if (r.tier === 'ghoul') { n.state = 'leave'; n.path = null; n.v.bound = true; }
    else { n.state = 'dazed'; n.dazeT = 20; n.path = null; n.v.fed = true; }
    if (r.tier === 'drain') for (const w of A.wit) if (w.state !== 'dead' && w.kind !== 'watch') { w.state = 'flee'; w.fleeT = 10; w.path = null; PEOPLE.scream(w, 1.2); }
    const T = { sip: 'A Gentle Sip', deep: 'Drunk Deep', drain: 'Drained', ghoul: 'Blood-Bound', herd: 'A Willing Vessel' };
    UI.notify({ title: T[r.tier], glyph: r.tier === 'drain' ? '†' : '♥', text: r.text, chips: r.chips, ok: r.tier === 'drain' ? false : undefined });
    G.postAction(false);
  }

  /* ---- the watch has you ---- */
  function arrest(n) {
    if (W.act || modal) return;
    W.wanted = 0;
    W.act = { type: 'arrest', n, t: 5 };
    n.state = 'held'; n.path = null;
    Snd.play('whistle'); flash = 0.4;
    HUD.alert(`${n.v.name}, ${n.v.occ}, has you by the collar!`);
  }
  function arrestActions() {
    const A = W.act, n = A.n, s = G.s, out = [];
    const bc = G.bribeCost();
    out.push(act('KeyE', `Bribe them · £${bc}`, () => arrestDo('bribe'), { off: s.gold < bc ? 'You cannot afford it' : null }));
    out.push(act('KeyF', 'Break free', () => arrestDo('break'), { sub: `Might · ${pct(G.chance('might', (n.v.wary || 5) - 1))}` }));
    if (G.power('mesmerism') >= 1) out.push(act('KeyG', 'Hold their gaze', () => arrestDo('gaze'), { hold: 0.8, sub: `Lore · ${pct(G.chance('lore', (n.v.wary || 5) - 1, 0.1))}` }));
    return out;
  }
  function arrestDo(kind) {
    const A = W.act; if (!A || A.type !== 'arrest') return;
    const r = G.watchAct(kind, A.n.v); if (!r) return;
    UI.notify({ title: 'The Watch', glyph: '⚿', text: r.text, chips: r.chips, ok: r.ok });
    if (r.ok || kind === 'hauled') { freeFromWatch(A.n, kind === 'hauled'); }
    else { A.t = Math.max(A.t, 2.5); flash = 0.4; }
    G.postAction(false);
  }
  function freeFromWatch(n, hauled) {
    W.act = null;
    n.state = 'idle'; n.idleT = 3; n.aware = 0; n.path = null;
    if (hauled) {
      spend(60);
      const wh = town.sites.find(q => q.id === 'watchhouse');
      if (wh) { pl.x = wh.door.x + wh.door.nx * 1.5; pl.z = wh.door.z + wh.door.nz * 1.5; fadeIn(); }
    } else { pl.x += Math.sin(pl.yaw) * -0.8; pl.z += Math.cos(pl.yaw) * -0.8; }
  }

  /* ---- the hunter, hand to hand ---- */
  function hunterActions(n, tg) {
    const s = G.s, out = [];
    if (tg.d < 2.6) out.push(act('KeyE', 'Strike', () => strikeHunter(n), { sub: `Might · ${pct(G.chance('might', s.hunter ? s.hunter.level + 3 : 5))}` }));
    if (G.power('mesmerism') >= 3) out.push(act('KeyG', 'Take their memories', () => { const r = G.hunterForget(); if (r && r.ok) { UI.notify({ title: 'Forgotten', glyph: '◉', text: `${n.v.name} lowers the crossbow and asks you the way to the river.`, chips: r.chips }); n.state = 'leave'; n.persistent = false; n.kind = 'citizen'; W.hunterNpc = null; } else HUD.whisper('Their faith is a wall your gaze cannot climb.'); }, { hold: 2 }));
    return { title: s.hunter ? s.hunter.name : n.v.name, sub: `A hunter · ${Math.max(0, Math.round(n.hp))} / 100`, actions: out };
  }
  function strikeHunter(n) {
    if ((n.hitCd || 0) > 0) return;
    n.hitCd = 0.8;
    const r = G.hunterStrike(); if (!r) return;
    Snd.play('lunge');
    if (!r.ok) { HUD.whisper('They twist aside. Steel flashes.'); return; }
    n.hp -= r.dmg; flash = 0.25; n.f.body.rotation.x = -0.3;
    HUD.floatText(`−${r.dmg}`, '#ff6060');
    if (n.hp <= 0) {
      const chips = G.hunterSlain();
      PEOPLE.kill(n); n.persistent = false; W.hunterNpc = null; W.corpses++;
      UI.notify({ title: 'The Hunter Is Dead', glyph: '✠', text: `${n.v.name} dies in the gutter with a stake still in their hand.`, chips });
      G.postAction(false);
    } else if (n.state !== 'chase') { n.state = 'chase'; n.aware = 2; n.path = null; }
  }
  function hunterFrame(dt) {
    const n = W.hunterNpc; if (!n || n.state === 'dead' || !G.s.hunter) return;
    n.hitCd = Math.max(0, (n.hitCd || 0) - dt);
    n.shotCd = (n.shotCd === undefined ? 2 : n.shotCd) - dt;
    n.stabCd = (n.stabCd === undefined ? 1 : n.stabCd) - dt;
    if (n.state !== 'chase' || !n.canSee) return;
    const lvl = G.s.hunter.level;
    if (n.dP < 2.4 && n.stabCd <= 0) {
      n.stabCd = 1.9;
      if (Math.random() < 0.5) { const c = G.hunterWound(7 + lvl * 2); hurtFx(c, 'A stake grazes your ribs.'); }
    } else if (n.dP >= 2.4 && n.dP < 16 && n.shotCd <= 0) {
      n.shotCd = 3.6 + Math.random();
      Snd.play('twang');
      if (Math.random() < 0.3 + pl.vis * 0.35 - (pl.speed > 4 ? 0.15 : 0)) { const c = G.hunterWound(9 + lvl * 3); hurtFx(c, 'A crossbow bolt tears through you.'); }
      else HUD.whisper('A bolt hums past your ear.');
    }
  }
  function hurtFx(chips, text) {
    flash = 0.9; HUD.floatChips(chips); HUD.whisper(text, 'blood');
    if (G.s.health <= 0) G.postAction(false);
  }
  function lodgingActions() {
    return { title: `${G.s.hunter.name}'s lodging`, sub: 'Garlic on the lintel. Salt on the sill.', actions: [act('KeyE', 'Break down the door', () => {
      const d = town.lodging;
      if (W.hunterNpc && W.hunterNpc.state !== 'dead') { PEOPLE.remove(W.hunterNpc); }
      const hv = { name: G.s.hunter.name, oid: 'watchman', occ: 'hunter', cls: 'mid', humour: 'choleric', g: 'm', vit: 20, wary: 9, trait: 'with a crossbow' };
      const n = PEOPLE.spawn({ x: d.x + d.nx * 1.2, z: d.z + d.nz * 1.2, hunter: true, v: hv });
      n.hp = 100; n.state = 'chase'; n.aware = 2; n.yaw = Math.atan2(pl.x - n.x, pl.z - n.z);
      W.hunterNpc = n; W.spawnedHunter = true;
      Snd.play('door'); flash = 0.3;
      HUD.alert(`${G.s.hunter.name} was waiting for you.`);
    }, { hold: 0.8 })] };
  }

  /* ---- the Beast ---- */
  function onFrenzy(p, then) {
    W.act = { type: 'frenzy', p, t: 6, need: Math.round(8 + (1 - p) * 16), got: 0, then };
    Snd.play('frenzy'); flash = 1;
    HUD.alert('The Beast wakes. Chain it!');
  }
  function frenzyFrame(dt) {
    const A = W.act;
    A.t -= dt;
    feedFx = 0.6 + Math.sin(t * 9) * 0.4;
    pl.yaw += Math.sin(t * 3.1) * dt * 0.8; pl.pitch += Math.sin(t * 4.3) * dt * 0.4;
    if (A.got >= A.need) { W.act = null; const c = G.frenzyResolve(true); UI.notify({ title: 'Mastered', glyph: '☬', ok: true, text: 'You bite your own wrist until the pain drowns the hunger. You hold. Barely. Feed — soon.', chips: c }); A.then && A.then(); return; }
    if (A.t <= 0) {
      W.act = null;
      let n = null;
      if (!pl.inside) n = PEOPLE.list.filter(q => q.state !== 'dead' && q.kind !== 'hunter' && q.dP < 25).sort((a, b) => a.dP - b.dP)[0];
      const v = n ? n.v : { name: G.genName ? G.genName() : 'a stranger', occ: 'stranger' };
      if (n) { pl.x = n.x - Math.sin(n.yaw) * 0.6; pl.z = n.z - Math.cos(n.yaw) * 0.6; PEOPLE.kill(n); W.corpses++; }
      const c = G.frenzyResolve(false, v);
      feedFx = 1.6;
      UI.notify({ title: 'Frenzy', glyph: '☬', ok: false, text: `When you come back to yourself, ${v.name} is in your arms and there is blood to your elbows. You do not remember killing them. You remember enjoying it.`, chips: c });
      A.then && A.then();
    }
  }

  /* ---- places ---- */
  function timed(hours, fn) {
    // time passes in a blink: candles gutter, the dark comes back
    if (hours > 0) { fadeIn(); Snd.play('page'); }
    fn();
  }
  function siteActions(sd) {
    const did = sd.d, nm = sd.names[G.era().id];
    const acts = G.districtActions(did).filter(a => sd.acts.includes(a.id));
    return { title: nm, sub: siteText(sd), actions: acts.slice(0, 3).map((a, i) => act(KEYS[i], a.name, () => timed(a.hours, () => G.doAction(a.id, did)),
      { sub: `${a.hours}h${a.cost ? ` · £${a.cost}` : ''}${a.chance != null ? ` · ${pct(a.chance)}` : ''}${a.strands ? ' · dawn will catch you' : ''}`, off: a.avail ? null : a.reason })) };
  }
  function elysiumActions() {
    const s = G.s, keep = s.loc;
    s.loc = 'elysium';
    const acts = G.courtActions().filter(a => a.id !== 'tribute');
    s.loc = keep;
    return { title: 'Elysium', sub: 'A red lantern over an unmarked door. The Court of the Night.', actions: acts.slice(0, 3).map((a, i) => act(KEYS[i], a.name, () => timed(a.hours, () => { s.loc = 'elysium'; G.doCourt(a.id); }),
      { sub: `${a.hours}h${a.chance != null ? ` · ${pct(a.chance)}` : ''}`, off: a.avail ? null : a.reason, hold: a.id === 'challenge' ? 2 : 0 })) };
  }
  function havenDoorActions(o) {
    const s = G.s, lvl = o.lvl, h = DATA.HAVENS[lvl];
    if (lvl === s.haven) return { title: 'Your haven', sub: h.name, actions: [act('KeyE', 'Go inside', () => enterHaven())] };
    if (lvl === s.haven + 1) { const c = G.havenCost(lvl); return { title: h.name, sub: `${h.desc} For sale.`, actions: [act('KeyE', `Buy it · £${c}`, () => { G.buyHaven(); if (G.s.haven === lvl) { UI.notify({ title: 'A New Haven', glyph: '⚰', text: `${h.name} is yours. Your household follows you there before dawn.` }); } }, { hold: 1.2, off: s.gold < c ? `You need £${c}` : null })] }; }
    return { title: h.name, sub: lvl < s.haven ? 'You lived here once.' : 'Beyond your station, for now.', actions: [] };
  }
  function corpseActions(n) {
    return { title: `The body of ${n.v.name}`, sub: 'Someone will find it before dawn', actions: [act('KeyE', 'Drag it into the dark', () => {
      n.hidden = true; n.found = true; spend(15);
      n.f.root.visible = false; if (n.pool) n.pool.visible = false;
      HUD.whisper(`You drag ${n.v.name} into the dark, where no one will find them before dawn.`);
      Snd.play('drag');
    }, { hold: 1, sub: '15 minutes' })] };
  }
  function siteText(sd) {
    const e = G.era().id;
    return {
      goldsmiths: 'A light still burns in the counting-room.', guildhall: 'The masters of the livery companies keep late hours.',
      tavern_c: e === 'georgian' ? 'Coffee, pipe-smoke and rumour.' : 'Low beams, a roaring fire, a hundred voices.',
      tavern_s: 'Dice rattle on a scarred table.', stews: 'Rose-water, candle-smoke and laughter behind curtains.',
      cathedral: 'The holy ground prickles against your dead skin.', revels: 'Music spills from the high windows.',
      noble: 'Every family this rich has something to hide.', warehouse: 'Casks, bales and the smell of tar.',
      watchhouse: 'A bored watchman with a very open palm.', almshouse: 'The sisters here never turn anyone away.',
      tavern_w: 'Men who know every face in the parish.', charnel: 'The dead are good listeners.', graves: 'Fresh-turned earth and a spade left leaning on a stone.',
    }[sd.id] || '';
  }

  /* ---- your haven ---- */
  let torporPick = 0;
  function havenActions(it) {
    const s = G.s;
    const deed = (key, id, label, extra = {}) => { const d = G.deeds().find(x => x.id === id); return act(key, label || (d ? d.name : id), () => { const dd = G.deeds().find(x => x.id === id); if (dd && dd.avail) timed(dd.hours, () => G.doDeed(id)); }, { off: !d ? 'Not tonight' : d.avail ? null : d.reason, sub: d ? `${d.hours ? d.hours + 'h' : ''}` : '', ...extra }); };
    switch (it.kind) {
      case 'exit': return { title: 'The door', sub: G.distName(TOWN.districtAt(town, town.havens[s.haven].x, town.havens[s.haven].z)), actions: [act('KeyE', 'Go out into the night', () => leaveHaven())] };
      case 'coffin': {
        const opts = G.torporOptions(); if (torporPick >= opts.length) torporPick = 0;
        const yrs = opts[torporPick];
        return { title: 'Your coffin', sub: `${s.hours} hour${s.hours === 1 ? '' : 's'} of darkness remain`, actions: [
          act('KeyE', 'Sleep until dusk', () => G.retire(), { hold: s.hours > 2 ? 1.2 : 0.4 }),
          act('KeyF', yrs ? `Torpor: ${yrs} years` : 'Torpor', () => { torporPick = (torporPick + 1) % Math.max(1, opts.length); HUD.refreshPrompt(); }, { sub: 'change how long', off: opts.length ? null : 'The century is nearly done' }),
          act('KeyG', yrs ? `Sink into the long sleep` : 'Sink into the long sleep', () => G.torpor(yrs), { hold: 2, off: yrs ? null : 'Not now', sub: yrs ? `wake in ${s.year + yrs}` : '' }),
        ] };
      }
      case 'desk': return { title: 'Your writing desk', sub: 'Ledgers, letters, the book of your blood', actions: [act('KeyE', 'Open your grimoire', () => UI.openBook('haven')),
        ...(G.canSeekGolconda() ? [act('KeyF', 'Seek Golconda', () => G.seekGolconda(), { hold: 3, sub: 'End your chronicle in peace' })] : [])] };
      case 'mirror': return { title: 'The mirror', sub: '', actions: [act('KeyE', 'Look', () => HUD.whisper(mirrorLine(s.humanity), s.humanity < 40 ? 'blood' : ''))] };
      case 'herd': return { title: it.name, sub: 'They offer wrists and throats, eyes half-closed', actions: [deed('KeyE', 'herdfeed', 'Drink from your herd')] };
      case 'lover': {
        const lv = it.c;
        return { title: lv.name, sub: `Mortal · ${lv.age} years old · affection ${lv.loyalty}`, actions: [deed('KeyE', 'lover', 'Spend the night with them'),
          act('KeyF', 'Give them your blood', () => G.embraceLover(), { hold: 2.5, sub: 'the Embrace · 30 blood', off: s.blood < 30 ? 'You need 30 blood' : null })] };
      }
      case 'ghoul': { const g = it.c, r = DATA.ROLES[g.role]; return { title: g.name, sub: `Your ${r.name.toLowerCase()} · devotion ${g.loyalty}`, actions: [act('KeyE', 'Speak with them', () => HUD.whisper(`${g.name.split(' ')[0]} watches your mouth as you speak, the way a dog watches a hand. ${r.desc}`)), act('KeyF', 'Release them from the bond', () => { G.releaseGhoul(g.id); havenRebuild(); }, { hold: 2 })] }; }
      case 'childe': return { title: it.c.name, sub: 'Your childe', actions: [act('KeyE', 'Sit with them', () => HUD.whisper('They sit very still, as you taught them, and listen to the heartbeats in the street above.'))] };
      case 'library': return { title: 'The occult library', sub: '', actions: [deed('KeyE', 'study')] };
      case 'cellar': return { title: 'The blood cellar', sub: `${s.cellar} measures`, actions: [deed('KeyE', 'draw')] };
      case 'chapel': return { title: 'The chapel of memory', sub: '', actions: [act('KeyE', 'Light a candle', () => HUD.whisper(`A candle for ${s.victims.length ? s.victims[0].name : 'the person you were'}. You light them one by one.`))] };
    }
    return { title: it.name, actions: [] };
  }
  function mirrorLine(h) {
    return h >= 80 ? 'The glass shows the room behind you, and no one in it. You straighten a collar you cannot see, out of habit.'
      : h >= 60 ? 'Nothing. You try to remember the colour of your own eyes.'
        : h >= 40 ? 'Nothing looks back. You find that you no longer mind, and that frightens you more.'
          : h >= 20 ? 'For a moment something is there. Something with too many teeth, smiling.'
            : 'The Beast looks out of the glass, and it is wearing your face.';
  }
  function havenRebuild() { if (pl.inside) { const x = pl.x, z = pl.z, y = pl.yaw; HAVEN.build(G.s.haven, G.s, scene); pl.x = x; pl.z = z; pl.yaw = y; } }

  /* ---- key handling for actions ---- */
  let holdA = null;
  function actionsNow() {
    if (W.act && W.act.type === 'arrest') return arrestActions();
    if (W.act) return [];
    return target ? target.actions : [];
  }
  function pressKey(code) {
    if (W.act && W.act.type === 'frenzy') { if (code === 'KeyE' || code === 'Space') { W.act.got++; Snd.play('heartbeat'); } return; }
    if (W.act && W.act.type === 'feed') { if (code === 'KeyF' && G.canBind(W.act.v)) endFeed(true); return; }
    const a = actionsNow().find(x => x.key === code);
    if (!a) return;
    if (a.off) { HUD.whisper(a.off); Snd.play('fail'); return; }
    if (a.hold) { holdA = { a, code, t: 0, tgt: target && target.o }; return; }
    a.run();
  }
  function holdFrame(dt) {
    if (!holdA) { HUD.hold(null, 0); return; }
    if (!keys[holdA.code] || (target && target.o) !== holdA.tgt && !(W.act && W.act.type === 'arrest')) { holdA = null; HUD.hold(null, 0); return; }
    holdA.t += dt;
    HUD.hold(holdA.a.key, holdA.t / holdA.a.hold);
    if (holdA.t >= holdA.a.hold) { const a = holdA.a; holdA = null; HUD.hold(null, 0); a.run(); }
  }

  function quickMend() { const d = G.deeds().find(x => x.id === 'mend'); if (d && d.avail) G.doDeed('mend'); else HUD.whisper(d ? d.reason : ''); }
  function takeWing() {
    if (G.power('nightwings') < 3 || pl.inside) { HUD.whisper(G.power('nightwings') >= 3 ? 'You are already home.' : 'Only a master of Night Wings can fly home in an instant.'); return; }
    Snd.play('wings'); flash = 0.2; enterHaven();
  }
  function flyTo(did) {
    // bat-form flight across the rooftops (Night Wings I)
    if (G.power('nightwings') < 1 || pl.inside) return false;
    const [cx, cz] = town.C[did];
    const k = TOWN.idx(cx, cz);
    let x = (cx + 0.5) * CS, z = (cz + 0.5) * CS;
    if (!TOWN.WALKABLE[town.type[k]]) { const c = randomCell(did, WU.rng(Date.now() | 0)); if (c) [x, z] = c; }
    pl.x = x; pl.z = z; spend(10); Snd.play('wings'); fadeIn();
    return true;
  }

  /* ==================================================================
     The clock
     ================================================================== */
  function spend(mins) {
    const s = G.s; if (!s) return;
    s.night.min = (s.night.min || 0) + mins;
    while (s.night.min >= 60) {
      s.night.min -= 60; s.hours = Math.max(0, s.hours - 1);
      onHour();
    }
  }
  function onHour() {
    const s = G.s;
    Snd.play('toll', { n: Math.min(4, 1 + ((12 - s.hours) % 4)) });
    if (s.hours === 1 && !pl.inside) { HUD.alert('The sky pales in the east. Get home before the dawn.'); HUD.whisper('An hour until dawn. Your skin already prickles.', 'blood'); }
    if (s.hours <= 0 && !modal) { releasePointer(); G.postAction(false); }
  }

  function tickClock(dt) {
    const s = G.s;
    if (!s || s.hours <= 0) return;
    const add = dt * 60 / settings.hourSecs;
    s.night.min = (s.night.min || 0) + add;
    if (s.night.min >= 60) { s.night.min -= 60; s.hours = Math.max(0, s.hours - 1); onHour(); UI.hud(); }
  }

  /* ==================================================================
     Frame
     ================================================================== */
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += dt;
    if (!renderer || !town && mode !== 'none') { render(); return; }
    if (mode === 'title') titleFrame(dt);
    else if (mode === 'play') playFrame(dt);
    render();
  }

  function playFrame(dt) {
    const s = G.s;
    if (!s || s.ending) return;
    const running = !paused && !modal && !bookOpen;
    if (running) {
      const A = W.act;
      if (A && A.type === 'feed') feedFrame(dt);
      else if (A && A.type === 'arrest') { A.t -= dt; const n = A.n; pl.yaw += (Math.atan2(-(n.x - pl.x), -(n.z - pl.z)) - pl.yaw) * 0; if (A.t <= 0) arrestDo('hauled'); }
      else if (A && A.type === 'frenzy') { movePlayer(dt * 0.3); frenzyFrame(dt); }
      else movePlayer(dt);
      holdFrame(dt);
      if (!pl.inside) hunterFrame(dt);
      tickClock(dt);
      if (!pl.inside) {
        const loc = TOWN.districtAt(town, pl.x, pl.z);
        if (loc !== W.lastLoc) {
          if (W.lastLoc) HUD.district(G.distName(loc), G.dist(loc).desc[G.era().id]);
          W.lastLoc = loc;
        }
        s.loc = loc;
        explore();
      }
      if (W.wanted > 0) W.wanted = Math.max(0, W.wanted - dt * (pl.vis < 0.3 ? 3 : 1));
    }
    if (!pl.inside) {
      if (running) {
        PEOPLE.populate(dt, pl, (weather.crowd || 1) * nightCrowd());
        PEOPLE.update(dt, pl, t);
        PEOPLE.tickPools(dt);
        spawnSpecials();
      }
    }
    updateLights(dt);
    const sensing = !pl.inside && running && (keys.KeyQ || keys.KeyV);
    senseLevel += ((sensing ? 1 : 0) - senseLevel) * Math.min(1, dt * 6);
    PEOPLE.setSense(senseLevel > 0.4, t);
    if (sensing && Math.random() < dt * 0.9) Snd.play('heartbeat');
    target = running && !W.act ? findTarget() : null;
    // camera
    const eye = pl.eye - pl.crouch * 0.55 + pl.y;
    const bob = settings.bob && pl.grounded ? Math.sin(pl.bob) * 0.045 * Math.min(1, pl.speed / 3) : 0;
    camera.position.set(pl.x, eye + bob, pl.z);
    camera.rotation.set(pl.pitch, pl.yaw, bob * 0.12 * Math.cos(pl.bob * 0.5));
    const run = pl.speed > 4.5;
    camera.fov += ((sensing ? 64 : run ? 80 : 72) - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix();
    // post uniforms
    const u = postMat.uniforms;
    u.hunger.value = WU.clamp((30 - s.blood) / 26, 0, 1);
    u.beast.value = WU.clamp((30 - s.humanity) / 30, 0, 1);
    u.sense.value = senseLevel;
    const frac = (s.night.min || 0) / 60;
    const left = s.hours - frac;
    u.dawn.value = pl.inside ? 0 : WU.clamp((1.4 - left) / 1.4, 0, 1) * 0.6;
    skyMat.uniforms.dawn.value = u.dawn.value * 1.5;
    flash = Math.max(0, flash - dt * 1.6); u.flash.value = flash;
    feedFx = Math.max(0, feedFx - dt * 0.5); u.feed.value = feedFx;
    burn = Math.max(0, burn - dt * 0.4); u.burn.value = burn;
    // hemisphere light: vampire sight sees further in the dark
    hemi.intensity = pl.inside ? 0.55 : (weather.hemi || 0.9) * (1 + u.dawn.value * 0.8);
    eyeLight.intensity = pl.inside ? 0.25 : 0.55;
    moon.intensity = pl.inside ? 0 : weather.moon;
    HUD.frame(dt, { pl, target, act: W.act, actions: running ? actionsNow() : [], hunter: W.hunterNpc, sensing: senseLevel > 0.5, wanted: W.wanted, weather: weather.id, camera, people: PEOPLE.list, inside: pl.inside, havenDir: havenDir(), wp: waypointDir() });
  }
  let senseLevel = 0;
  function nightCrowd() {
    const s = G.s; if (!s) return 1;
    const max = G.maxHours(), el = max - s.hours;
    // the streets empty as the night deepens, and fill a little before dawn
    return el < 2 ? 1.1 : s.hours <= 2 ? 0.85 : 0.7;
  }

  function spawnSpecials() {
    const s = G.s;
    // the hunter walks the city when they are close to finding you
    if (s.hunter && s.hunter.threat >= 30 && !W.hunterNpc && !W.spawnedHunter) {
      W.spawnedHunter = true;
      const did = TOWN.districtAt(town, pl.x, pl.z);
      const c = randomCell(R0.pick(['whitechapel', 'cheapside', 'southwark', 'stpauls', 'docks', did, did]), R0);
      if (c) {
        const hv = { name: s.hunter.name, oid: 'watchman', occ: 'hunter', cls: 'mid', humour: 'choleric', g: 'm', vit: 20, wary: 9, trait: 'with a crossbow under their coat' };
        W.hunterNpc = PEOPLE.spawn({ x: c[0], z: c[1], hunter: true, v: hv }); W.hunterNpc.hp = 100;
        HUD.whisper(`You smell holy water on the wind. ${s.hunter.name} is abroad tonight.`, 'blood');
      }
    }
  }
  const R0 = WU.rng(99);

  // Reveal the map as you walk
  function explore() {
    const s = G.s;
    if (!s.explored || s.explored.length !== 512) s.explored = '0'.repeat(1024);
    const ci = Math.floor(pl.x / CS), cj = Math.floor(pl.z / CS);
    const key = ci + ',' + cj; if (W.seen[key]) return; W.seen[key] = 1;
    let arr = W.expArr;
    if (!arr) { arr = W.expArr = new Uint8Array(TOWN.N * TOWN.N); for (let i = 0; i < 1024; i++) { const v = parseInt(s.explored[i], 16); for (let b = 0; b < 4; b++) arr[i * 4 + b] = (v >> b) & 1; } }
    for (let j = cj - 3; j <= cj + 3; j++) for (let i = ci - 3; i <= ci + 3; i++) if (TOWN.inb(i, j)) arr[TOWN.idx(i, j)] = 1;
    let out = '';
    for (let i = 0; i < 1024; i++) out += (arr[i * 4] | arr[i * 4 + 1] << 1 | arr[i * 4 + 2] << 2 | arr[i * 4 + 3] << 3).toString(16);
    s.explored = out;
  }
  function exploredMask() {
    const s = G.s, arr = new Uint8Array(TOWN.N * TOWN.N);
    if (s && s.explored) for (let i = 0; i < 1024; i++) { const v = parseInt(s.explored[i], 16); for (let b = 0; b < 4; b++) arr[i * 4 + b] = (v >> b) & 1; }
    return arr;
  }

  function havenDir() {
    if (!town || !G.s || pl.inside) return null;
    const d = town.havens[G.s.haven];
    return { x: d.x, z: d.z };
  }
  let waypoint = null;
  function waypointDir() { return waypoint; }

  function render() {
    if (!renderer) return;
    sky.position.copy(camera.position);
    skyMat.uniforms.time.value = t;
    if (glowMat) glowMat.uniforms.time.value = t;
    // particles around the eye
    updateMotes();
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    postMat.uniforms.tex.value = rt.texture;
    postMat.uniforms.time.value = t;
    postMat.uniforms.grade.value = settings.grade ? 1 : 0;
    postMat.uniforms.levels.value = settings.pixel >= 3 ? 20 : 30;
    fadeT = Math.max(0, fadeT - 0.035); postMat.uniforms.fade.value = fadeT;
    renderer.render(postScene, postCam);
  }

  let mInit = false;
  function updateMotes() {
    const p = motes.geometry.attributes.position, a = p.array, v = motes.userData.v, n = a.length / 3;
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    const kind = weather.motes || 'dust';
    const R = 18;
    for (let i = 0; i < n; i++) {
      let x = a[i * 3], y = a[i * 3 + 1], z = a[i * 3 + 2];
      if (!mInit || Math.abs(x - cx) > R || Math.abs(z - cz) > R || y < -0.2 || y > cy + 12) {
        x = cx + (Math.random() * 2 - 1) * R; z = cz + (Math.random() * 2 - 1) * R; y = mInit ? (kind === 'snow' || kind === 'ash' ? cy + 8 + Math.random() * 3 : Math.random() * 8) : Math.random() * 12;
        v[i * 3] = (Math.random() - 0.5) * 0.3; v[i * 3 + 1] = kind === 'snow' ? -0.6 - Math.random() * 0.5 : kind === 'ash' ? -0.25 - Math.random() * 0.3 : (Math.random() - 0.5) * 0.1; v[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      }
      x += v[i * 3] * 0.016 + Math.sin(t * 0.7 + i) * 0.003; y += v[i * 3 + 1] * 0.016; z += v[i * 3 + 2] * 0.016;
      a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
    }
    mInit = true;
    p.needsUpdate = true;
    motes.visible = !pl.inside || mode === 'title';
    motes.geometry.setDrawRange(0, kind === 'dust' ? 260 : kind === 'rain' ? 120 : n);
    if (precip.visible) {
      const q = precip.geometry.attributes.position, b = q.array, m = b.length / 6;
      for (let i = 0; i < m; i++) {
        let x = b[i * 6], y = b[i * 6 + 1], z = b[i * 6 + 2];
        if (y < 0 || Math.abs(x - cx) > 16 || Math.abs(z - cz) > 16) { x = cx + (Math.random() * 2 - 1) * 16; z = cz + (Math.random() * 2 - 1) * 16; y = cy + 4 + Math.random() * 10; }
        y -= 0.35; x += 0.03;
        b[i * 6] = x; b[i * 6 + 1] = y; b[i * 6 + 2] = z; b[i * 6 + 3] = x - 0.04; b[i * 6 + 4] = y + 0.55; b[i * 6 + 5] = z;
      }
      q.needsUpdate = true;
    }
    for (const s of mist) {
      const o = s.userData.o;
      o[0] += 0.02; if (o[0] > 30) o[0] = -30;
      s.position.set(Math.floor(cx / 60) * 60 + o[0] + 30 * Math.sign(cx - (Math.floor(cx / 60) * 60 + o[0])) * 0, 0.8, cz + o[1]);
      s.position.x = cx + ((o[0] + t * 0.4) % 60 + 60) % 60 - 30;
      s.material.opacity = (weather.id === 'fog' ? 0.22 : weather.id === 'mist' ? 0.16 : 0.07);
    }
  }

  /* ==================================================================
     Title screen: drift through a sleeping city
     ================================================================== */
  function title() {
    mode = 'title';
    document.body.classList.remove('in-world');
    const seed = (Math.random() * 1e9) | 0;
    const eras = ['medieval', 'tudor', 'georgian', 'victorian'];
    const era = eras[(Math.random() * 4) | 0];
    ensureTown(seed, era);
    built.group.visible = true; glowPts.visible = true; sky.visible = true;
    for (const m of mist) m.visible = true;
    pl.inside = false;
    PEOPLE.clear();
    applyWeather(['clear', 'mist', 'fog', 'blood', 'rain'][(Math.random() * 5) | 0]);
    titleCam = { path: null, i: 0, x: 0, z: 0, yaw: 0 };
    newTitlePath();
  }
  function newTitlePath() {
    const C = town.C;
    const ds = Object.keys(C);
    const a = C[ds[(Math.random() * ds.length) | 0]], b = C[ds[(Math.random() * ds.length) | 0]];
    const path = PEOPLE.bfs(TOWN.idx(a[0], a[1]), TOWN.idx(b[0], b[1]));
    if (!path || path.length < 8) { titleCam.path = null; return; }
    titleCam.path = path.map(k => PEOPLE.centre(k)); titleCam.i = 0;
    [titleCam.x, titleCam.z] = titleCam.path[0];
    titleCam.yaw = 0;
  }
  function titleFrame(dt) {
    const c = titleCam; if (!c) return;
    if (!c.path) { newTitlePath(); return; }
    const tgt = c.path[Math.min(c.path.length - 1, c.i + 2)];
    const dx = tgt[0] - c.x, dz = tgt[1] - c.z, d = Math.hypot(dx, dz);
    if (d > 0.01) { c.x += dx / d * dt * 2.2; c.z += dz / d * dt * 2.2; }
    if (Math.hypot(c.path[c.i][0] - c.x, c.path[c.i][1] - c.z) < 2.5) c.i++;
    if (c.i >= c.path.length - 2) { newTitlePath(); return; }
    const want = Math.atan2(-dx, -dz);
    let da = want - c.yaw; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
    c.yaw += da * Math.min(1, dt * 0.8);
    pl.x = c.x; pl.z = c.z; pl.yaw = c.yaw;
    camera.position.set(c.x, 2.4 + Math.sin(t * 0.3) * 0.2, c.z);
    camera.rotation.set(0.06 + Math.sin(t * 0.2) * 0.04, c.yaw, 0);
    PEOPLE.populate(dt, pl, 0.8);
    PEOPLE.update(dt, pl, t);
    updateLights(dt);
    postMat.uniforms.hunger.value = 0.15; postMat.uniforms.sense.value = 0; postMat.uniforms.dawn.value = 0; postMat.uniforms.beast.value = 0;
    hemi.intensity = weather.hemi; moon.intensity = weather.moon;
  }

  /* ==================================================================
     Public
     ================================================================== */
  function modalOn() { modal = true; releasePointer(); }
  function modalOff() { modal = false; if (mode === 'play' && !bookOpen) { paused = false; lock(); } }

  return {
    boot, title, startGame, newNight, settings, saveSettings, resize,
    onFrenzy, spend, flyTo,
    modal: v => (v ? modalOn() : modalOff()),
    book: v => { bookOpen = v; if (v) releasePointer(); else if (!modal) { paused = false; lock(); } },
    get mode() { return mode; }, set mode(v) { mode = v; },
    get town() { return town; }, get pl() { return pl; }, get weather() { return weather; }, get wanted() { return W.wanted || 0; },
    inHaven: () => pl.inside,
    atElysium: () => false,
    exploredMask, setWaypoint: w => { waypoint = w; }, getWaypoint: () => waypoint,
    burn: () => { burn = 1; flash = 0.6; },
    hurt: v => { flash = Math.min(1, flash + v); },
    lock, release: releasePointer,
    resume: () => { paused = false; lock(); },
    get paused() { return paused; },
    enterHaven, leaveHaven, isTouch,
  };
})();
