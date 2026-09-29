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
    onChase: n => { HUD.alert(`${cap(n.v.occ)}! The watch is after you.`); Snd.play('whistle'); },
    onCaught: n => { if (!G.s || modal) return; W.wanted = 0; releasePointer(); G.watchCatch(n.v, () => { if (n.v.slain) { PEOPLE.kill(n); W.corpses++; } else { n.state = 'walk'; n.path = null; n.aware = 0; } }); },
    onHunterSees: n => { HUD.alert(`${G.s.hunter ? G.s.hunter.name : 'The hunter'} has seen you.`); Snd.play('fail'); },
  };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  function panOf(x, z) { const dx = x - pl.x, dz = z - pl.z, d = Math.hypot(dx, dz) || 1; return (dx * Math.cos(pl.yaw) - dz * Math.sin(pl.yaw)) / d; }

  // Called by G.onHunt at each turn of a feeding
  function onHunt(type, v, extra) {
    const n = W.prey; if (!n) return;
    const wit = W.preyWitnesses || [];
    const loud = ['drain', 'struggle', 'spotted', 'flee', 'forcefeed'].includes(type);
    switch (type) {
      case 'sip': case 'deep': case 'herd': case 'vanish-fed':
        n.state = 'dazed'; n.dazeT = 20; n.path = null; n.v.fed = true; feedFx = 1; break;
      case 'ghoul': n.state = 'leave'; n.path = null; n.v.bound = true; feedFx = 1; break;
      case 'drain': PEOPLE.kill(n); feedFx = 1.4; W.corpses++; break;
      case 'spotted': n.state = 'flee'; n.fleeT = 12; n.path = null; PEOPLE.scream(n, 1.3); break;
      case 'flee': n.state = 'flee'; n.fleeT = 10; n.path = null; break;
      case 'struggle': n.state = 'flee'; n.fleeT = 10; n.path = null; W.wanted = 90; flash = 0.8; break;
      case 'vanish': case 'forget': n.state = 'dazed'; n.dazeT = 8; n.path = null; break;
      case 'pass': n.state = 'walk'; n.path = null; break;
    }
    if (loud || (wit.length && (type === 'drain' || type === 'deep'))) {
      for (const w of wit) if (w.state !== 'dead') { if (w.kind === 'watch') { w.state = 'chase'; w.path = null; } else { w.state = 'flee'; w.fleeT = 10; w.path = null; PEOPLE.scream(w, 1); } }
      if (wit.length || type === 'struggle' || type === 'spotted') W.wanted = Math.max(W.wanted, 60 + wit.length * 15);
    }
    if (type === 'frenzy') { const c = PEOPLE.spawn({ x: pl.x + Math.sin(pl.yaw) * 1.2, z: pl.z + Math.cos(pl.yaw) * 1.2, v: extra }); PEOPLE.kill(c); W.corpses++; }
  }

  function onHunter(result) {
    const n = W.hunterNpc;
    if (!n) return;
    if (result === 'slain') { PEOPLE.kill(n); n.persistent = false; W.hunterNpc = null; }
    else if (result === 'gone') { n.state = 'leave'; n.persistent = false; W.hunterNpc = null; }
    else { n.state = 'walk'; n.path = null; n.aware = 0; n.cool = 25; }
  }

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
    W = { wanted: 0, corpses: 0, prey: null, encounters: [], hunterNpc: null, lastLoc: null, bell: s.hours, warned: false, spawnedHunter: false, seen: {} };
    s.night.min = s.night.min || 0;
    enterHaven(true);
    // encounters: strangers with stories, waiting somewhere in the city tonight
    const nEnc = 2 + (R() < 0.5 ? 1 : 0);
    for (let k = 0; k < nEnc; k++) {
      const did = R.pick(['cheapside', 'southwark', 'stpauls', 'westminster', 'docks', 'whitechapel', 'graveyard']);
      const ev = G.pickEvent(did, true);
      if (!ev || W.encounters.some(e => e.ev.id === ev.id)) continue;
      const cell = randomCell(did, R);
      if (!cell) continue;
      W.encounters.push({ ev, did, x: cell[0], z: cell[1], used: false });
    }
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
      if (modal || bookOpen || paused) return;
      if (e.code === 'KeyE' || e.code === 'KeyF') interact();
      if (e.code === 'KeyR') quickMend();
      if (e.code === 'KeyH') takeWing();
      if (e.code === 'Space' && pl.grounded) { pl.vy = G.power('nightwings') >= 1 ? 6.2 : 4.4; pl.grounded = false; }
    });
    addEventListener('keyup', e => { keys[e.code] = false; });
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
        if (a === 'act') interact(); if (a === 'book') UI.openBook(); if (a === 'map') UI.openBook('city');
        if (a === 'sense') keys.KeyQ = true; if (a === 'run') keys.ShiftLeft = !keys.ShiftLeft; if (a === 'crouch') keys.KeyC = !keys.KeyC;
      });
      b.addEventListener('touchend', () => { if (b.dataset.t === 'sense') keys.KeyQ = false; });
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
     Interaction
     ================================================================== */
  let target = null;
  function findTarget() {
    const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw);
    let best = null;
    const consider = (o, x, z, reach, label, sub, extra = {}) => {
      const dx = x - pl.x, dz = z - pl.z, d = Math.hypot(dx, dz);
      if (d > reach) return;
      const dot = d < 0.5 ? 1 : (dx * fx + dz * fz) / d;
      if (dot < 0.62) return;
      const sc = dot * 2 - d / reach;
      if (!best || sc > best.sc) best = { sc, o, x, z, d, label, sub, ...extra };
    };
    if (pl.inside) {
      for (const it of HAVEN.state.items) consider(it, it.x, it.z, 1.9, itemLabel(it), '', { kind: 'item' });
      return best;
    }
    for (const n of PEOPLE.list) {
      if (n.kind === 'encounter') { const ev = n.ev; consider(n, n.x, n.z, 2.8, ev.title, 'Someone waits in the shadows', { kind: 'encounter' }); continue; }
      if (n.state === 'dead') { if (!n.hidden) consider(n, n.x, n.z, 2.2, `Hide the body of ${n.v.name}`, '15 minutes', { kind: 'corpse' }); continue; }
      if (n.kind === 'hunter') { consider(n, n.x, n.z, 2.6, `Confront ${G.s.hunter ? G.s.hunter.name : 'the hunter'}`, 'They know what you are', { kind: 'hunter' }); continue; }
      if (n.v.fed || n.v.bound || n.state === 'flee' || n.state === 'leave') continue;
      consider(n, n.x, n.z, 2.4, `Stalk ${n.v.name}`, `${G.an(n.v.occ)}, ${n.v.trait}`, { kind: 'vessel' });
    }
    for (const sd of town.sites) {
      const d = sd.door; const nm = sd.names[G.era().id];
      consider(sd, d.x + d.nx * 0.6, d.z + d.nz * 0.6, 2.4, d.open ? nm : `Enter ${nm}`, sd.acts.map(a => G.actName(a)).join(' · '), { kind: 'site' });
    }
    town.havens.forEach((d, lvl) => {
      const s = G.s;
      const label = lvl === s.haven ? 'Enter your haven' : lvl === s.haven + 1 ? `${DATA.HAVENS[lvl].name} — for sale` : lvl < s.haven ? 'Your old haven' : DATA.HAVENS[lvl].name;
      consider({ lvl, d }, d.x + d.nx * 0.6, d.z + d.nz * 0.6, 2.4, label, lvl === s.haven ? DATA.HAVENS[lvl].name : lvl === s.haven + 1 ? `£${G.havenCost(lvl)}` : '', { kind: 'haven' });
    });
    { const d = town.elysium; consider(d, d.x + d.nx * 0.6, d.z + d.nz * 0.6, 2.4, 'Elysium', 'A red lantern. The Court of the Night.', { kind: 'elysium' }); }
    if (G.s.hunter && G.s.hunter.known) { const d = town.lodging; consider(d, d.x + d.nx * 0.6, d.z + d.nz * 0.6, 2.4, `${G.s.hunter.name}'s lodging`, 'Garlic on the lintel. Salt on the sill.', { kind: 'lodging' }); }
    return best;
  }
  function itemLabel(it) {
    switch (it.kind) {
      case 'exit': return 'Go out into the night';
      case 'coffin': return 'Your coffin — rest, or sleep for decades';
      case 'desk': return 'Your writing desk — affairs of the night';
      case 'mirror': return 'The mirror';
      case 'herd': return `Drink from ${it.name.toLowerCase()}`;
      case 'lover': return `${it.name}`;
      case 'library': return 'Study the forbidden';
      case 'cellar': return 'Draw from the cellar';
      default: return it.name;
    }
  }

  function interact() {
    if (!target || modal) return;
    const s = G.s, o = target.o;
    switch (target.kind) {
      case 'vessel': return lunge(o);
      case 'encounter': {
        releasePointer();
        o.persistent = false;
        const enc = W.encounters.find(e => e.npc === o); if (enc) enc.used = true;
        s.eventsDone[o.ev.id] = true;
        G.present(o.ev, () => { o.state = 'walk'; o.kind = 'citizen'; o.path = null; G.postAction(false); });
        return;
      }
      case 'corpse': {
        o.hidden = true; o.found = true;
        spend(15);
        o.f.root.visible = false; if (o.pool) o.pool.visible = false;
        HUD.whisper(`You drag ${o.v.name} into the dark, where no one will find them before dawn.`);
        Snd.play('drag');
        return;
      }
      case 'hunter': releasePointer(); return G.hunterStreet(r => onHunter(r));
      case 'site': return siteMenu(o);
      case 'haven': return havenDoor(o);
      case 'elysium': return elysiumMenu();
      case 'lodging': releasePointer(); G.s.loc = 'lodging'; return G.hunterAct('confront');
      case 'item': return havenItem(o);
    }
  }

  function lunge(n) {
    if (W.lunge) return;
    const s = G.s;
    // how the moment stands: are they looking? is it dark? who is watching?
    const ang = Math.atan2(pl.x - n.x, pl.z - n.z);
    let da = ang - n.yaw; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
    const behind = Math.abs(da) > 1.6 && !n.noticed;
    const dark = pl.vis < 0.35;
    const wit = PEOPLE.witnesses(n, pl);
    W.prey = n; W.preyWitnesses = wit;
    const bonus = { might: 0, allure: 0, guile: 0, lore: 0 }, notes = {};
    if (behind) { bonus.might += 0.15; bonus.guile += 0.06; notes.might = 'Unseen, from behind'; }
    else if (n.noticed) { bonus.might -= 0.1; bonus.allure += 0.05; notes.might = 'They have seen you coming'; }
    if (dark) { bonus.might += 0.08; notes.might = (notes.might ? notes.might + ' · ' : '') + 'In deep shadow'; }
    if (n.state === 'idle' || n.v.oid === 'drunk') bonus.guile += 0.04;
    const watch = wit.filter(w => w.kind === 'watch').length;
    const extraSusp = Math.min(20, wit.length * 3 + watch * 4);
    const witText = wit.length ? `${wit.length} witness${wit.length > 1 ? 'es' : ''}${watch ? ` (${watch} of the watch)` : ''}` : 'No one is watching';
    W.lunge = { n, t: 0.45, go: () => {
      n.state = 'held'; n.path = null;
      releasePointer();
      spend(25);
      G.fpHunt(n.v, TOWN.districtAt(town, n.x, n.z), { bonus, notes, extraSusp, witText, behind, dark });
    } };
    Snd.play('lunge');
  }

  function siteMenu(sd) {
    const did = sd.d, nm = sd.names[G.era().id];
    const acts = G.districtActions(did).filter(a => sd.acts.includes(a.id));
    releasePointer();
    UI.scene({ title: nm, glyph: sd.glyph, eyebrow: G.distName(did), text: siteText(sd),
      choices: acts.map(a => ({ label: a.name, sub: `${a.desc} · ${a.hours}h${a.cost ? ` · £${a.cost}` : ''}${!a.avail && a.reason ? ` — ${a.reason}` : ''}`, chance: a.chance, disabled: !a.avail, onPick: () => G.doAction(a.id, did) }))
        .concat([{ label: 'Walk on', onPick: () => {} }]) });
  }
  function siteText(sd) {
    const e = G.era().id;
    const T = {
      goldsmiths: 'Shutters barred with iron. A light still burns in the counting-room, where someone is weighing coin.',
      guildhall: 'Torchlight on carved oak and gilded arms. The masters of the livery companies keep late hours.',
      tavern_c: e === 'georgian' ? 'Coffee, pipe-smoke and the rattle of newspapers. Every rumour in the City passes through this room.' : 'Low beams, a roaring fire and a hundred voices. Every rumour in the City passes through this room.',
      tavern_s: 'Dice rattle on a scarred table. A man is singing about a hanged highwayman. Someone is bleeding in the corner and nobody minds.',
      stews: 'Rose-water and candle-smoke, laughter behind curtains. Here, lonely people come to be adored.',
      cathedral: 'The great doors stand ajar. Inside, a thousand candles and the smell of cold stone. The holy ground prickles against your dead skin.',
      revels: 'Music spills from high windows. Carriages crowd the gate; the powerful dance here while the city starves.',
      noble: 'A fine house with a servants\' door around the side. Every family this rich has something to hide.',
      warehouse: 'Casks, bales and the smell of tar. The customs men are asleep, or paid, or both.',
      watchhouse: 'A lamp in the window and a bored watchman with a very open palm.',
      almshouse: 'Straw pallets, coughing, a thin soup that smells of nothing. The sisters here never turn anyone away.',
      tavern_w: 'Beer, sawdust and men who know every face in the parish — including the stranger asking about the pale folk.',
      charnel: 'Bones stacked to the ceiling in patient rows. The dead are good listeners, and sometimes they talk back.',
      graves: 'Fresh-turned earth and a spade left leaning on a stone. The dead keep their rings, if no one takes them.',
    };
    return T[sd.id] || '';
  }

  function havenDoor(o) {
    const s = G.s, lvl = o.lvl;
    releasePointer();
    if (lvl === s.haven) { modalOff(); enterHaven(); return; }
    const h = DATA.HAVENS[lvl];
    if (lvl === s.haven + 1) {
      const c = G.havenCost(lvl);
      UI.scene({ title: h.name, glyph: '⚰', text: `${h.desc}<br><br>A discreet agent will sell it to you for <b>£${c}</b>, no questions asked. Your household and herd would follow you here.`,
        choices: [{ label: `Buy it · £${c}`, disabled: s.gold < c, sub: s.gold < c ? 'You cannot afford it yet' : 'Your haven will move here', onPick: () => { G.buyHaven(); } }, { label: 'Not tonight' }] });
      return;
    }
    UI.scene({ title: h.name, glyph: '⚰', text: lvl < s.haven ? 'You lived here once. Other people\'s lives go on behind the shutters now.' : `${h.desc}<br><br>Such a place is beyond your station for now.`, choices: [{ label: 'Walk on' }] });
  }

  function elysiumMenu() {
    const s = G.s;
    releasePointer();
    s.loc = 'elysium';
    const acts = G.courtActions().filter(a => a.id !== 'tribute');
    UI.scene({ title: 'Elysium', glyph: '♛', eyebrow: s.princeName, cls: 'era',
      text: 'A red lantern over an unmarked door. Beyond it, stairs descend to a vaulted hall where the dead of London hold court: velvet, candle-smoke, and eyes that do not blink.',
      choices: acts.map(a => ({ label: a.name, sub: `${a.desc || ''} · ${a.hours}h${!a.avail && a.reason ? ` — ${a.reason}` : ''}`, chance: a.chance, disabled: !a.avail, onPick: () => { s.loc = 'elysium'; G.doCourt(a.id); } }))
        .concat([{ label: 'Consult the Court ledger', sub: 'Petitions, rivals, your standing', onPick: () => setTimeout(() => UI.openBook('court'), 0) }, { label: 'Leave' }]) });
  }

  function havenItem(it) {
    const s = G.s;
    releasePointer();
    const deed = id => { const d = G.deeds().find(x => x.id === id); if (!d) return UI.toast('Not tonight.'); if (!d.avail) return UI.scene({ title: d.name, glyph: d.glyph, text: d.reason || 'Not tonight.', choices: [{ label: 'Very well' }] }); G.doDeed(id); };
    switch (it.kind) {
      case 'exit': modalOff(); leaveHaven(); return;
      case 'desk': UI.openBook('haven'); return;
      case 'coffin': {
        const opts = G.torporOptions();
        UI.scene({ title: 'Your Coffin', glyph: '⚰', text: `${s.hours} hour${s.hours === 1 ? '' : 's'} of darkness remain. The lid is open, and the dark inside is soft.`,
          choices: [
            { label: 'Lie down until dusk', sub: 'End the night', onPick: () => G.retire() },
            { label: 'Sink into torpor…', sub: 'Sleep for decades', disabled: !opts.length, onPick: () => setTimeout(() => UI.torporPrompt(), 0) },
            ...(G.canSeekGolconda() ? [{ label: 'Seek Golconda', sub: 'End your chronicle in peace', cls: 'gold', onPick: () => G.seekGolconda() }] : []),
            { label: 'Not yet' },
          ] });
        return;
      }
      case 'mirror': {
        const h = s.humanity;
        const txt = h >= 80 ? 'The glass shows the room behind you, and no one in it. Still — you straighten a collar you cannot see, out of habit. Habits are how you remember you were a person.'
          : h >= 60 ? 'Nothing. The candle, the coffin, the door. You stand there a long time, trying to remember the colour of your own eyes.'
            : h >= 40 ? 'Nothing looks back. You find that you no longer mind, and that frightens you more than the empty glass.'
              : h >= 20 ? 'For a moment — surely a trick of the candle — something is there. Something with too many teeth, smiling.'
                : 'The Beast looks out of the glass at you, and it is wearing your face, and it is so very hungry.';
        UI.scene({ title: 'The Mirror', glyph: '◌', text: txt, choices: [{ label: 'Turn away' }] });
        return;
      }
      case 'herd': return deed('herdfeed');
      case 'lover': {
        const lv = it.c;
        UI.scene({ title: lv.name, glyph: '♡', text: `${lv.name} looks up as you come in, and smiles the way the living smile at someone they love. They are ${lv.age}.`,
          choices: [
            { label: 'Spend the night with them', sub: '2h · +Humanity', onPick: () => deed('lover') },
            { label: 'Offer them the Embrace…', sub: 'Blood −30', disabled: s.blood < 30, onPick: () => G.embraceLover() },
            { label: 'Not tonight' },
          ] });
        return;
      }
      case 'ghoul': {
        const g = it.c, r = DATA.ROLES[g.role];
        UI.scene({ title: g.name, glyph: r.glyph, text: `Your ${r.name.toLowerCase()}. ${r.desc}<br><br>Their devotion stands at <b>${g.loyalty}</b>. They watch your mouth as you speak, the way a dog watches a hand.`,
          choices: [{ label: 'Dismiss them' }, { label: 'Release them from the blood bond', cls: 'dark', onPick: () => G.releaseGhoul(g.id) }] });
        return;
      }
      case 'childe': UI.scene({ title: it.c.name, glyph: '✧', text: 'Your childe. They sit very still, as you taught them, and listen to the heartbeats in the street above.', choices: [{ label: 'Leave them to it' }] }); return;
      case 'library': return deed('study');
      case 'cellar': return deed('draw');
      case 'chapel': UI.scene({ title: 'The Chapel of Memory', glyph: '✝', text: 'Candles for every name in the Red Ledger, and one for the person you were. You light them, one by one.', choices: [{ label: 'Remember' }] }); return;
    }
  }

  function quickMend() { const d = G.deeds().find(x => x.id === 'mend'); if (d && d.avail) { releasePointer(); G.doDeed('mend'); } else HUD.whisper(d ? d.reason : ''); }
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
    if (W.lunge) {
      // the lunge plays even as the world holds its breath
      const L = W.lunge; L.t -= dt;
      const n = L.n;
      const dx = n.x - pl.x, dz = n.z - pl.z, d = Math.hypot(dx, dz);
      if (d > 0.85) { pl.x += dx / d * Math.min(d - 0.85, dt * 7); pl.z += dz / d * Math.min(d - 0.85, dt * 7); }
      const want = Math.atan2(-dx, -dz);
      let da = want - pl.yaw; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
      pl.yaw += da * Math.min(1, dt * 10); pl.pitch += (-0.1 - pl.pitch) * Math.min(1, dt * 8);
      n.yaw = Math.atan2(pl.x - n.x, pl.z - n.z);
      if (L.t <= 0) { W.lunge = null; L.go(); }
    } else if (running) {
      movePlayer(dt);
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
      if (running || W.lunge) {
        PEOPLE.populate(dt, pl, (weather.crowd || 1) * nightCrowd());
        PEOPLE.update(dt, pl, t);
        PEOPLE.tickPools(dt);
        spawnSpecials();
      }
    }
    updateLights(dt);
    const sensing = !pl.inside && running && (keys.KeyQ || keys.KeyV) || (W.lunge && keys.KeyQ);
    senseLevel += ((sensing ? 1 : 0) - senseLevel) * Math.min(1, dt * 6);
    PEOPLE.setSense(senseLevel > 0.4, t);
    if (sensing && Math.random() < dt * 0.9) Snd.play('heartbeat');
    target = running ? findTarget() : null;
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
    HUD.frame(dt, { pl, target, sensing: senseLevel > 0.5, wanted: W.wanted, weather: weather.id, camera, people: PEOPLE.list, inside: pl.inside, havenDir: havenDir(), wp: waypointDir() });
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
    // encounters appear when you come near
    for (const e of W.encounters) {
      if (e.used || e.npc) continue;
      if (Math.hypot(e.x - pl.x, e.z - pl.z) < 45) {
        const walls = TOWN.DIRS.find(([dx, dz]) => !TOWN.walkableAt(town, e.x + dx * CS, e.z + dz * CS));
        const yaw = walls ? Math.atan2(-walls[0], -walls[1]) : 0;
        const ex = walls ? e.x + walls[0] * 1.3 : e.x, ez = walls ? e.z + walls[1] * 1.3 : e.z;
        const pose = /pray|grave|kneel|mother|child/i.test(e.ev.title) ? 'kneel' : 'stand';
        e.npc = PEOPLE.spawn({ x: ex, z: ez, encounter: true, ev: Object.assign(e.ev, { pose }), yaw });
      }
    }
    // the hunter walks the city when they are close to finding you
    if (s.hunter && s.hunter.threat >= 30 && !W.hunterNpc && !W.spawnedHunter) {
      W.spawnedHunter = true;
      const did = TOWN.districtAt(town, pl.x, pl.z);
      const c = randomCell(R0.pick(['whitechapel', 'cheapside', 'southwark', 'stpauls', 'docks', did, did]), R0);
      if (c) {
        const hv = { name: s.hunter.name, oid: 'watchman', occ: 'hunter', cls: 'mid', humour: 'choleric', g: 'm', vit: 20, wary: 9, trait: 'with a crossbow under their coat' };
        W.hunterNpc = PEOPLE.spawn({ x: c[0], z: c[1], hunter: true, v: hv });
        HUD.whisper(`You smell holy water on the wind. ${s.hunter.name} is abroad tonight.`, 'blood');
      }
    }
    if (W.hunterNpc && W.hunterNpc.cool > 0) W.hunterNpc.cool -= 0.016;
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
    onHunt, onHunter, spend, flyTo,
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
