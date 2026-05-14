// =============================================================================
// Biome 3D (three.js) — scène WebGL en arrière-plan du canvas 2D.
// =============================================================================
// Objectif v2 : RÉEL rendu 3D pour le biome "neon" — sol, walls, bases,
// factories, unités sont tous des meshes three.js (procéduraux). Le canvas
// 2D garde les FX (projectiles, damage numbers, HUD, lobby UI).
//
// Coordonnées :
//   - Game (x, y) → three.js (x, height, y)
//   - X = horizontal (game.x), Y = up/down (height), Z = depth (game.y)
//   - Floor en plan XZ à Y=0. Unités/bâtiments s'élèvent vers +Y.
//
// Caméra : perspective avec léger tilt depuis le sud — donne du volume sans
// trop déformer le mapping X (le click handling 2D reste lisible).
//
// API window.RE_3D :
//   - isActive()            → clé biome ou null
//   - activate(biome)
//   - deactivate()
//   - render(cameraX, dt)   → appelé chaque frame depuis game.js
//   - syncFromGame(game)    → met à jour les meshes selon l'état du jeu
//   - resize()

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js";

// Doit matcher game.js
const CANVAS_W = 1280;
const CANVAS_H = 720;
const HUD_H = 60;
const WORLD_W = 2000;
const BASE_W = 280;

// Hauteurs des entités (axe Y)
const WALL_HEIGHT = 70;
const BASE_HEIGHT = 100;
const FACTORY_HEIGHT = 38;
const UNIT_HEIGHT_BY_TYPE = {
  light:   28,
  heavy:   22,
  swarmer: 14,
  sniper:  36,
  air:     22,    // les drones flottent à Y+24 en plus
  medic:   26,
};

// Couleurs côté joueur / ennemi
const SIDE_COLORS = {
  player:     { body: 0x3b82f6, accent: 0x60a5fa, dark: 0x1e3a8a },
  enemy:      { body: 0xef4444, accent: 0xf87171, dark: 0x7f1d1d },
  neutral:    { body: 0x9ca3af, accent: 0xd1d5db, dark: 0x374151 },
};

const state = {
  active: null,
  renderer: null,
  scene: null,
  camera: null,
  canvas: null,
  built: false,
  uniforms: null,
  startTime: 0,
  // Pools : on garde une Map référence-objet → mesh pour ne pas
  // re-créer/détruire les géométries chaque frame (cher avec 100+ unités MP).
  unitMeshes: new Map(),    // unit (game.units[i]) → THREE.Group
  factoryMeshes: new Map(), // slot reference → THREE.Group
  staticGroup: null,        // contient sol, walls, bases (jamais recréé)
};

function ensureRenderer() {
  if (state.renderer) return state.renderer;
  state.canvas = document.getElementById("game-canvas-3d");
  if (!state.canvas) {
    console.warn("[RE_3D] #game-canvas-3d introuvable");
    return null;
  }
  state.renderer = new THREE.WebGLRenderer({
    canvas: state.canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  state.renderer.setSize(CANVAS_W, CANVAS_H, false);
  state.renderer.setClearColor(0x050510, 1);
  state.renderer.shadowMap.enabled = true;
  state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return state.renderer;
}

// ── BUILD : éléments statiques (sol, walls, bases) ──────────────────────────
function buildStatic(scene) {
  const root = new THREE.Group();

  // ── SOL : grille tron-like animée par shader ─────────────────
  const floorGeo = new THREE.PlaneGeometry(WORLD_W, CANVAS_H - HUD_H, 64, 32);
  floorGeo.rotateX(-Math.PI / 2);  // plan XY → plan XZ (floor horizontal)

  const uniforms = {
    uTime:       { value: 0 },
    uGridSize:   { value: 64.0 },
    uLineWidth:  { value: 0.045 },
    uColorBase:  { value: new THREE.Color(0x0a0a20) },
    uColorGridA: { value: new THREE.Color(0xff2dd4) },
    uColorGridB: { value: new THREE.Color(0x00f5ff) },
    uPulseSpeed: { value: 1.4 },
  };
  const floorMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: false,
    depthWrite: true,
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vWorldPos = worldPos;
        gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform float uTime;
      uniform float uGridSize;
      uniform float uLineWidth;
      uniform vec3  uColorBase;
      uniform vec3  uColorGridA;
      uniform vec3  uColorGridB;
      uniform float uPulseSpeed;
      varying vec3 vWorldPos;

      float gridLine(float c, float size, float lw) {
        float v = mod(c, size) / size;
        float edge = min(v, 1.0 - v);
        return 1.0 - smoothstep(0.0, lw, edge);
      }

      void main() {
        // Grille basée sur position monde (X horizontal, Z profondeur)
        float gx = gridLine(vWorldPos.x, uGridSize, uLineWidth);
        float gz = gridLine(vWorldPos.z, uGridSize, uLineWidth);
        float grid = max(gx, gz);
        float pulse = 0.55 + 0.45 * sin(uTime * uPulseSpeed);

        // Onde de scan qui balaie horizontalement
        float wave = smoothstep(60.0, 0.0,
          abs(mod(vWorldPos.x + uTime * 120.0, 480.0) - 240.0));

        float mixT = 0.5 + 0.5 * sin((vWorldPos.x + vWorldPos.z) * 0.005 + uTime * 0.2);
        vec3 gridColor = mix(uColorGridA, uColorGridB, mixT);

        vec3 col = uColorBase;
        col += gridColor * grid * (0.5 + 0.5 * pulse);
        col += gridColor * wave * 0.3;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.set(WORLD_W / 2, 0, HUD_H + (CANVAS_H - HUD_H) / 2);
  floor.receiveShadow = true;
  root.add(floor);
  state.uniforms = uniforms;

  // ── WALLS (remparts) : deux long boxes verticales à gauche et à droite ─
  for (const side of ["player", "enemy"]) {
    const isPlayer = side === "player";
    const colors = SIDE_COLORS[side];
    const wallX = isPlayer ? BASE_W : (WORLD_W - BASE_W);
    const wallGeo = new THREE.BoxGeometry(18, WALL_HEIGHT, CANVAS_H - HUD_H);
    const wallMat = new THREE.MeshStandardMaterial({
      color: colors.dark,
      emissive: colors.body,
      emissiveIntensity: 0.25,
      metalness: 0.6,
      roughness: 0.4,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(wallX, WALL_HEIGHT / 2, HUD_H + (CANVAS_H - HUD_H) / 2);
    wall.castShadow = true;
    wall.receiveShadow = true;
    root.add(wall);

    // Strip lumineux sur la crête du mur (effet néon)
    const stripGeo = new THREE.BoxGeometry(22, 3, CANVAS_H - HUD_H);
    const stripMat = new THREE.MeshBasicMaterial({ color: colors.accent });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(wallX, WALL_HEIGHT + 1.5, HUD_H + (CANVAS_H - HUD_H) / 2);
    root.add(strip);

    // ── BASE : bâtiment composite derrière le mur ──
    const baseX = isPlayer ? BASE_W / 2 : (WORLD_W - BASE_W / 2);
    const baseCenterZ = HUD_H + (CANVAS_H - HUD_H) / 2;

    // Corps principal
    const bodyGeo = new THREE.BoxGeometry(BASE_W - 60, BASE_HEIGHT * 0.7, 280);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colors.dark,
      emissive: colors.body,
      emissiveIntensity: 0.18,
      metalness: 0.5,
      roughness: 0.5,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(baseX, BASE_HEIGHT * 0.35, baseCenterZ);
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    // Tour centrale plus haute
    const towerGeo = new THREE.BoxGeometry(80, BASE_HEIGHT, 80);
    const tower = new THREE.Mesh(towerGeo, bodyMat);
    tower.position.set(baseX, BASE_HEIGHT / 2, baseCenterZ);
    tower.castShadow = true;
    root.add(tower);

    // Antenne / pylon sur la tour
    const antennaGeo = new THREE.CylinderGeometry(3, 6, 50, 8);
    const antennaMat = new THREE.MeshStandardMaterial({
      color: colors.accent,
      emissive: colors.accent,
      emissiveIntensity: 0.6,
      metalness: 0.7,
      roughness: 0.3,
    });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(baseX, BASE_HEIGHT + 25, baseCenterZ);
    antenna.castShadow = true;
    root.add(antenna);

    // Boule lumineuse au sommet de l'antenne (pulse)
    const orbGeo = new THREE.SphereGeometry(7, 16, 16);
    const orbMat = new THREE.MeshBasicMaterial({ color: colors.accent });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(baseX, BASE_HEIGHT + 55, baseCenterZ);
    orb.userData.basePulse = true;
    root.add(orb);
  }

  scene.add(root);
  state.staticGroup = root;
}

// ── BUILD : un mesh d'unité (procédural par type) ───────────────────────────
function buildUnitMesh(typeId, side) {
  const colors = SIDE_COLORS[side] || SIDE_COLORS.neutral;
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: colors.body, metalness: 0.4, roughness: 0.5,
    emissive: colors.body, emissiveIntensity: 0.15,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: colors.accent, metalness: 0.6, roughness: 0.3,
    emissive: colors.accent, emissiveIntensity: 0.45,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: colors.dark, metalness: 0.3, roughness: 0.6,
  });

  switch (typeId) {
    case "light": {
      // Marcheur svelte : corps cube + tête sphère + 2 jambes
      const body = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 12), bodyMat);
      body.position.y = 14;
      group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 8), accentMat);
      head.position.y = 26;
      group.add(head);
      for (const dx of [-5, 5]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 4), darkMat);
        leg.position.set(dx, 4, 0);
        group.add(leg);
      }
      break;
    }
    case "heavy": {
      // Tank trapu : chenilles + tourelle
      const tracks = new THREE.Mesh(new THREE.BoxGeometry(28, 8, 22), darkMat);
      tracks.position.y = 4;
      group.add(tracks);
      const body = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 16), bodyMat);
      body.position.y = 13;
      group.add(body);
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 6, 8), accentMat);
      turret.position.y = 21;
      group.add(turret);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 14, 8), darkMat);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(8, 21, 0);
      group.add(barrel);
      break;
    }
    case "swarmer": {
      // Petite araignée rapide : corps sphère + 4 pattes
      const body = new THREE.Mesh(new THREE.SphereGeometry(7, 12, 10), bodyMat);
      body.position.y = 9;
      group.add(body);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const leg = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 8), darkMat);
        leg.position.set(Math.cos(angle) * 6, 7, Math.sin(angle) * 6);
        leg.rotation.y = angle;
        group.add(leg);
      }
      const eye = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6), accentMat);
      eye.position.set(0, 11, 3);
      group.add(eye);
      break;
    }
    case "sniper": {
      // Long et fin avec canon long : corps + long barrel
      const body = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 10), bodyMat);
      body.position.y = 14;
      group.add(body);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 8), accentMat);
      cab.position.y = 24;
      group.add(cab);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 28, 8), darkMat);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(15, 24, 0);
      group.add(barrel);
      // Tripode
      for (const angle of [Math.PI * 0.5, Math.PI * 1.16, Math.PI * 1.83]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 2), darkMat);
        leg.position.set(Math.cos(angle) * 5, 7, Math.sin(angle) * 5);
        group.add(leg);
      }
      break;
    }
    case "air": {
      // Drone : disque + 4 rotors
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 4, 16), bodyMat);
      disc.position.y = 2;
      group.add(disc);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), accentMat);
      dome.position.y = 4;
      group.add(dome);
      for (const [dx, dz] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) {
        const rotor = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1, 16), darkMat);
        rotor.position.set(dx, 4, dz);
        group.add(rotor);
      }
      // Décale tout le drone en hauteur (il flotte au-dessus du sol)
      group.position.y = 24;
      break;
    }
    case "medic": {
      // Cube avec croix médicale sur le toit
      const body = new THREE.Mesh(new THREE.BoxGeometry(16, 14, 14), bodyMat);
      body.position.y = 13;
      group.add(body);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(12, 2, 3),
        new THREE.MeshBasicMaterial({ color: 0xffffff }));
      crossH.position.y = 21;
      group.add(crossH);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff }));
      crossV.position.y = 21;
      group.add(crossV);
      for (const dx of [-6, 6]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 4), darkMat);
        leg.position.set(dx, 3, 0);
        group.add(leg);
      }
      break;
    }
    default: {
      // Fallback : cube simple
      const body = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), bodyMat);
      body.position.y = 7;
      group.add(body);
    }
  }

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  group.userData.typeId = typeId;
  group.userData.side = side;
  return group;
}

// ── BUILD : un mesh de factory (procédural) ─────────────────────────────────
function buildFactoryMesh(typeId, side) {
  const colors = SIDE_COLORS[side] || SIDE_COLORS.neutral;
  const group = new THREE.Group();

  const baseMat = new THREE.MeshStandardMaterial({
    color: colors.dark, metalness: 0.5, roughness: 0.5,
    emissive: colors.body, emissiveIntensity: 0.18,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: colors.accent, metalness: 0.6, roughness: 0.3,
    emissive: colors.accent, emissiveIntensity: 0.4,
  });

  // Plateforme cube
  const baseSize = 38;
  const baseGeo = new THREE.BoxGeometry(baseSize, FACTORY_HEIGHT * 0.55, baseSize);
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = (FACTORY_HEIGHT * 0.55) / 2;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Top distinctif selon le type
  let topMesh;
  switch (typeId) {
    case "light":   topMesh = new THREE.Mesh(new THREE.ConeGeometry(11, 18, 8), accentMat); break;
    case "heavy":   topMesh = new THREE.Mesh(new THREE.BoxGeometry(20, 14, 20), accentMat); break;
    case "swarmer": topMesh = new THREE.Mesh(new THREE.SphereGeometry(10, 12, 10), accentMat); break;
    case "sniper":  topMesh = new THREE.Mesh(new THREE.CylinderGeometry(4, 8, 22, 8), accentMat); break;
    case "air":     topMesh = new THREE.Mesh(new THREE.TorusGeometry(10, 3, 8, 16), accentMat); break;
    case "medic":   topMesh = new THREE.Mesh(new THREE.OctahedronGeometry(10), accentMat); break;
    default:        topMesh = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), accentMat);
  }
  topMesh.position.y = FACTORY_HEIGHT * 0.55 + 9;
  topMesh.castShadow = true;
  group.add(topMesh);

  group.userData.typeId = typeId;
  group.userData.side = side;
  group.userData.topMesh = topMesh;
  return group;
}

function buildScene(biome) {
  if (biome !== "neon") {
    console.warn("[RE_3D] biome inconnu", biome);
    return;
  }
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050510, 800, 2200);

  // ── CAMÉRA : perspective avec léger tilt ─────────────────
  // Position : au-dessus du centre du viewport et légèrement en arrière (sud)
  // pour révéler le volume des unités tout en restant lisible top-down.
  const camera = new THREE.PerspectiveCamera(28, CANVAS_W / CANVAS_H, 1, 4000);
  // Position définitive ajustée par render() pour suivre game.camera.x.
  camera.position.set(CANVAS_W / 2, 1400, HUD_H + (CANVAS_H - HUD_H) / 2 + 700);
  camera.lookAt(CANVAS_W / 2, 0, HUD_H + (CANVAS_H - HUD_H) / 2);

  // ── LIGHTS ────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0x6060a0, 0.45));

  // Key light : dirigée depuis l'avant-droite, casts shadows
  const keyLight = new THREE.DirectionalLight(0xff6dff, 0.85);
  keyLight.position.set(1200, 800, 200);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.left = -1200;
  keyLight.shadow.camera.right = 1200;
  keyLight.shadow.camera.top = 500;
  keyLight.shadow.camera.bottom = -500;
  keyLight.shadow.camera.near = 100;
  keyLight.shadow.camera.far = 2500;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);
  scene.add(keyLight.target);

  // Fill : cyan en contre-jour
  const fillLight = new THREE.DirectionalLight(0x6effff, 0.4);
  fillLight.position.set(-400, 600, 800);
  scene.add(fillLight);

  buildStatic(scene);

  state.scene = scene;
  state.camera = camera;
  state.startTime = performance.now() / 1000;
  state.unitMeshes.clear();
  state.factoryMeshes.clear();
  state.built = true;
}

function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material.dispose();
    }
  });
}

function tearDown() {
  if (state.scene) {
    state.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }
  state.scene = null;
  state.camera = null;
  state.uniforms = null;
  state.staticGroup = null;
  state.unitMeshes.clear();
  state.factoryMeshes.clear();
  state.built = false;
}

// ── SYNC : maintient les meshes en accord avec l'état du jeu ────────────────
function syncFromGame(game) {
  if (!state.scene || !game) return;

  // 1) UNITÉS — Pool keyed by unit reference. Ajoute nouvelles, supprime mortes.
  const seenUnits = new Set();
  for (const u of game.units || []) {
    seenUnits.add(u);
    let mesh = state.unitMeshes.get(u);
    if (!mesh) {
      mesh = buildUnitMesh(u.typeId, u.side);
      state.scene.add(mesh);
      state.unitMeshes.set(u, mesh);
    }
    // Position : game (x, y) → 3D (x, baseY, y)
    const heightOffset = mesh.userData.typeId === "air" ? 0 : 0; // déjà géré au build pour air
    mesh.position.x = u.x;
    mesh.position.z = u.y;

    // Orientation : tourne vers la base ennemie (les unités attaquent vers oppSide)
    // Player attaque vers +X, enemy vers -X
    const facing = u.side === "player" ? 0 : Math.PI;
    mesh.rotation.y = facing;

    // Wobble léger pour les unités au sol (jambes qui marchent), rotors pour air
    if (mesh.userData.typeId === "air") {
      mesh.rotation.y += performance.now() * 0.003;
    }
  }
  // Retire les meshes des unités qui n'existent plus
  for (const [u, mesh] of state.unitMeshes) {
    if (!seenUnits.has(u)) {
      state.scene.remove(mesh);
      disposeObject(mesh);
      state.unitMeshes.delete(u);
    }
  }

  // 2) FACTORIES — keyed by slot reference. Player + enemy.
  const seenSlots = new Set();
  const handleSlots = (slots, side) => {
    if (!slots) return;
    for (const slot of slots) {
      if (!slot?.factory) continue;
      seenSlots.add(slot);
      let mesh = state.factoryMeshes.get(slot);
      if (!mesh || mesh.userData.typeId !== slot.factory.typeId) {
        if (mesh) {
          state.scene.remove(mesh);
          disposeObject(mesh);
        }
        mesh = buildFactoryMesh(slot.factory.typeId, side);
        state.scene.add(mesh);
        state.factoryMeshes.set(slot, mesh);
      }
      mesh.position.x = slot.x + slot.size / 2;
      mesh.position.z = slot.y + slot.size / 2;
      // Rotation top piece selon le tick (petit feedback de production)
      if (mesh.userData.topMesh) {
        mesh.userData.topMesh.rotation.y = performance.now() * 0.001;
      }
    }
  };
  handleSlots(game.player?.slots, "player");
  handleSlots(game.enemy?.slots, "enemy");
  for (const [slot, mesh] of state.factoryMeshes) {
    if (!seenSlots.has(slot)) {
      state.scene.remove(mesh);
      disposeObject(mesh);
      state.factoryMeshes.delete(slot);
    }
  }
}

const RE_3D = {
  isActive() { return state.active; },

  activate(biome) {
    if (state.active === biome) return;
    if (state.built && state.active && state.active !== biome) tearDown();
    if (!ensureRenderer()) return;
    if (!state.built) buildScene(biome);
    state.active = biome;
    if (state.canvas) state.canvas.classList.add("is-active");
  },

  deactivate() {
    if (!state.active) return;
    if (state.canvas) state.canvas.classList.remove("is-active");
    state.active = null;
  },

  syncFromGame,

  render(cameraX, dt) {
    if (!state.active || !state.renderer || !state.scene || !state.camera) return;
    const t = performance.now() / 1000 - state.startTime;
    if (state.uniforms) state.uniforms.uTime.value = t;

    // Caméra suit le scroll game.camera.x
    const viewCenter = cameraX + CANVAS_W / 2;
    state.camera.position.x = viewCenter;
    state.camera.position.y = 1400;
    state.camera.position.z = HUD_H + (CANVAS_H - HUD_H) / 2 + 700;
    state.camera.lookAt(viewCenter, 0, HUD_H + (CANVAS_H - HUD_H) / 2);

    // Pulse des orbs sur les bases
    if (state.staticGroup) {
      state.staticGroup.traverse((o) => {
        if (o.userData?.basePulse) {
          const s = 0.85 + 0.25 * Math.sin(t * 2.2);
          o.scale.set(s, s, s);
        }
      });
    }

    state.renderer.render(state.scene, state.camera);
  },

  resize() {
    if (!state.renderer) return;
    state.renderer.setSize(CANVAS_W, CANVAS_H, false);
    if (state.camera?.isPerspectiveCamera) {
      state.camera.aspect = CANVAS_W / CANVAS_H;
      state.camera.updateProjectionMatrix();
    }
  },
};

window.RE_3D = RE_3D;
window.dispatchEvent(new CustomEvent("re-3d-ready"));
