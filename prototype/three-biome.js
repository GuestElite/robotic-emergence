// =============================================================================
// Biome 3D (three.js) — rendu WebGL en arrière-plan du canvas 2D.
// =============================================================================
// Le canvas 3D (#game-canvas-3d) est posé DERRIÈRE le canvas 2D (z-index: 1 vs 2).
// Quand un biome 3D est actif, le drawGround() 2D est skip → le canvas 2D laisse
// passer les pixels transparents et le 3D apparaît. Les unités/factories/HUD
// continuent à être rendus en 2D par-dessus (lisibilité top-down préservée).
//
// API exposée sur window.RE_3D :
//   - isActive()                : retourne la clé biome active, ou null
//   - activate(biome)           : lance le rendu pour ce biome (idempotent)
//   - deactivate()              : stoppe + masque le canvas
//   - render(cameraX, dt)       : appelé chaque frame depuis game.js
//   - resize(w, h)              : ajuste viewport (rare — facteur DPR géré)
//
// Pour v1, un seul biome 3D est implémenté : "neon" (grille tron-like).
// L'archi est faite pour accueillir d'autres biomes (lava, void, …) plus tard
// via une factory `buildBiomeScene(biome, three)` qui pourra dispatcher.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js";

// Mêmes constantes que game.js — on garde un système de coordonnées commun
// pour que la caméra 3D scrolle exactement comme la 2D.
const CANVAS_W = 1280;
const CANVAS_H = 720;
const HUD_H = 60;
const WORLD_W = 2000;

const state = {
  active: null,         // clé biome, ou null
  renderer: null,
  scene: null,
  camera: null,
  canvas: null,
  built: false,         // scène initialisée ?
  uniforms: null,       // refs aux uniforms partagés (time, etc.)
  props: [],            // refs aux meshes animés
  startTime: 0,
};

function ensureRenderer() {
  if (state.renderer) return state.renderer;
  state.canvas = document.getElementById("game-canvas-3d");
  if (!state.canvas) {
    console.warn("[RE_3D] #game-canvas-3d introuvable, biome 3D désactivé");
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
  return state.renderer;
}

function buildNeonScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050510, 600, 1800);

  // Caméra orthographique : coordonnées identiques au canvas 2D pour que les
  // unités/factories (rendues en 2D au-dessus) restent alignées avec le sol 3D.
  // Note : on inverse l'axe Y de three.js (+Y vers le haut) en utilisant
  // top=0, bottom=CANVAS_H → Y croit vers le bas, comme en 2D canvas.
  const camera = new THREE.OrthographicCamera(
    0, CANVAS_W,          // left, right
    0, CANVAS_H,          // top, bottom (inversé)
    -2000, 2000           // near, far
  );
  camera.position.set(CANVAS_W / 2, CANVAS_H / 2, 800);
  camera.lookAt(CANVAS_W / 2, CANVAS_H / 2, 0);
  // Comme top=0 et bottom=CANVAS_H, la matrice de projection inverse l'axe Y
  // de three.js — il faut compenser pour que les normales restent correctes.
  camera.up.set(0, -1, 0);

  // Lumières — top-down + ambient pour révéler le volume des props 3D
  scene.add(new THREE.AmbientLight(0x4040ff, 0.4));
  const keyLight = new THREE.DirectionalLight(0xff40ff, 0.9);
  keyLight.position.set(0, -300, 600);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x40ffff, 0.5);
  fillLight.position.set(WORLD_W, -200, 400);
  scene.add(fillLight);

  // ── SOL : grille tron-like animée via custom shader ─────────────────────
  // Plane qui couvre toute la zone jouable (WORLD_W × (CANVAS_H - HUD_H)),
  // centré sur (WORLD_W/2, (HUD_H + CANVAS_H)/2). Plane est dans le plan XY
  // (perpendiculaire à l'écran) car la caméra regarde +Z.
  const floorW = WORLD_W;
  const floorH = CANVAS_H - HUD_H;
  const floorGeo = new THREE.PlaneGeometry(floorW, floorH, 32, 16);
  const uniforms = {
    uTime:        { value: 0 },
    uGridSize:    { value: 64.0 },
    uLineWidth:   { value: 0.045 },
    uColorBase:   { value: new THREE.Color(0x0a0a20) },
    uColorGridA:  { value: new THREE.Color(0xff2dd4) },  // magenta
    uColorGridB:  { value: new THREE.Color(0x00f5ff) },  // cyan
    uPulseSpeed:  { value: 1.4 },
    uScrollSpeed: { value: 14.0 },
  };

  const floorMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: false,
    depthWrite: true,
    vertexShader: /* glsl */ `
      varying vec2 vWorldUV;
      varying vec3 vWorldPos;
      void main() {
        // uv sera utilisé en world-coords (avant transform du plane) pour que
        // la grille reste stable même quand la caméra scrolle.
        vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vWorldPos = worldPos;
        vWorldUV = worldPos.xy;
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
      uniform float uScrollSpeed;
      varying vec2 vWorldUV;
      varying vec3 vWorldPos;

      float gridLine(float coord, float size, float lw) {
        float c = mod(coord, size) / size;
        float edge = min(c, 1.0 - c);
        return 1.0 - smoothstep(0.0, lw, edge);
      }

      void main() {
        // Grille principale fixe (les cellules ne défilent pas — on veut un
        // sol stable, le scroll vient déjà du mouvement caméra).
        vec2 uv = vWorldUV;
        float gx = gridLine(uv.x, uGridSize, uLineWidth);
        float gy = gridLine(uv.y, uGridSize, uLineWidth);
        float grid = max(gx, gy);

        // Pulse global : les lignes respirent doucement
        float pulse = 0.55 + 0.45 * sin(uTime * uPulseSpeed);

        // Onde data : une bande lumineuse qui balaie horizontalement le sol
        float wave = smoothstep(60.0, 0.0,
          abs(mod(uv.x + uTime * uScrollSpeed * 6.0, 480.0) - 240.0));

        // Mélange des 2 couleurs en fonction de la position pour éviter
        // un look monocolore. Subtle, dépend de la diagonale.
        float mixT = 0.5 + 0.5 * sin((uv.x + uv.y) * 0.005 + uTime * 0.2);
        vec3 gridColor = mix(uColorGridA, uColorGridB, mixT);

        // Vignette douce pour ramener l'attention au centre
        vec2 ndc = (gl_FragCoord.xy / vec2(${CANVAS_W}.0, ${CANVAS_H}.0)) - 0.5;
        float vignette = 1.0 - dot(ndc, ndc) * 0.8;

        vec3 col = uColorBase;
        col += gridColor * grid * (0.55 + 0.45 * pulse);
        col += gridColor * wave * 0.35;
        col *= vignette;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const floor = new THREE.Mesh(floorGeo, floorMat);
  // Place le centre du floor au milieu de la zone jouable (X), à mi-hauteur Y
  // (entre HUD_H et CANVAS_H). Plane est en XY → pas de rotation nécessaire.
  floor.position.set(floorW / 2, HUD_H + floorH / 2, -10);
  scene.add(floor);

  // ── PROPS 3D : géométries néon flottantes ───────────────────────────────
  // Posés au-dessus du sol mais derrière les unités 2D — discrets, fournissent
  // de la profondeur visuelle sans gêner la lecture.
  const props = [];
  const propPositions = [
    { x: 350,  y: 200, size: 36, color: 0xff2dd4, kind: "ico" },
    { x: 980,  y: 160, size: 28, color: 0x00f5ff, kind: "oct" },
    { x: 1620, y: 240, size: 42, color: 0xff2dd4, kind: "ico" },
    { x: 600,  y: 600, size: 32, color: 0x00f5ff, kind: "torus" },
    { x: 1300, y: 580, size: 30, color: 0xa855f7, kind: "ico" },
    { x: 1850, y: 480, size: 26, color: 0xff2dd4, kind: "oct" },
    { x: 180,  y: 480, size: 28, color: 0x00f5ff, kind: "oct" },
    { x: 1100, y: 380, size: 24, color: 0xa855f7, kind: "torus" },
  ];

  for (const p of propPositions) {
    let geo;
    if (p.kind === "ico") geo = new THREE.IcosahedronGeometry(p.size, 0);
    else if (p.kind === "oct") geo = new THREE.OctahedronGeometry(p.size, 0);
    else geo = new THREE.TorusGeometry(p.size, p.size * 0.25, 8, 24);

    const mat = new THREE.MeshBasicMaterial({
      color: p.color,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.x, p.y, -2);
    mesh.userData = {
      baseY: p.y,
      bobAmp: 8 + Math.random() * 6,
      bobSpeed: 0.6 + Math.random() * 0.5,
      bobPhase: Math.random() * Math.PI * 2,
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.6,
      ),
    };
    scene.add(mesh);
    props.push(mesh);
  }

  state.scene = scene;
  state.camera = camera;
  state.uniforms = uniforms;
  state.props = props;
  state.built = true;
}

function build(biome) {
  // Place pour dispatcher d'autres biomes plus tard (lava, void, …).
  if (biome === "neon") return buildNeonScene();
  console.warn("[RE_3D] biome inconnu :", biome);
}

function tearDown() {
  if (state.scene) {
    state.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
  state.scene = null;
  state.camera = null;
  state.uniforms = null;
  state.props = [];
  state.built = false;
}

const RE_3D = {
  isActive() {
    return state.active;
  },

  activate(biome) {
    if (state.active === biome) return;
    // Si on switche entre biomes 3D différents, on rebuild.
    if (state.built && state.active && state.active !== biome) tearDown();
    if (!ensureRenderer()) return;
    if (!state.built) build(biome);
    state.active = biome;
    state.startTime = performance.now() / 1000;
    if (state.canvas) state.canvas.classList.add("is-active");
  },

  deactivate() {
    if (!state.active) return;
    if (state.canvas) state.canvas.classList.remove("is-active");
    state.active = null;
    // On garde la scène en mémoire pour éviter de tout reconstruire au
    // prochain activate() — c'est juste l'affichage qui est coupé via la
    // classe CSS. Le render() ne sera plus appelé tant que active est null.
  },

  render(cameraX, dt) {
    if (!state.active || !state.renderer || !state.scene || !state.camera) return;
    const t = performance.now() / 1000 - state.startTime;
    if (state.uniforms) state.uniforms.uTime.value = t;

    // Caméra : recentre horizontalement en fonction du scroll du jeu.
    // cameraX (game.camera.x) = offset top-left du viewport en world coords.
    // En ortho, on déplace la camera de façon à ce que le viewport regarde
    // [cameraX, cameraX + CANVAS_W].
    state.camera.position.x = cameraX + CANVAS_W / 2;
    state.camera.lookAt(state.camera.position.x, state.camera.position.y, 0);

    // Anime les props : bobbing vertical + rotation lente
    for (const mesh of state.props) {
      const d = mesh.userData;
      mesh.position.y = d.baseY + Math.sin(t * d.bobSpeed + d.bobPhase) * d.bobAmp;
      mesh.rotation.x += d.rotSpeed.x * dt;
      mesh.rotation.y += d.rotSpeed.y * dt;
      mesh.rotation.z += d.rotSpeed.z * dt;
    }

    state.renderer.render(state.scene, state.camera);
  },

  resize() {
    if (!state.renderer) return;
    state.renderer.setSize(CANVAS_W, CANVAS_H, false);
  },
};

window.RE_3D = RE_3D;
window.dispatchEvent(new CustomEvent("re-3d-ready"));
