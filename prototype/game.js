// =============================================================
// ÉMERGENCE — Prototype V0
// Scope figé dans ../DECISIONS.md (Session 2)
// =============================================================

const CONFIG = {
  CANVAS_W: 1280, // largeur visible (canvas DOM)
  W: 2000,         // largeur du MONDE (scroll horizontal)
  H: 720,          // hauteur (pas de scroll vertical)
  HUD_H: 60,
  BASE_W: 280,
  BASE_HP_MAX: 1000,           // overridé par game.preset au démarrage
  START_MONEY: 100,            // overridé par game.preset
  CAMERA_SCROLL_MARGIN: 80,
  CAMERA_SCROLL_SPEED: 650,
  // Grille étendue : occupe toute la base. Les rangées PATH_ROWS et la colonne PATH_COL
  // forment une croix multi-bras non-constructible, et chaque rangée mène à son propre gate.
  GRID_COLS: 5,
  GRID_ROWS: 11,
  SLOT_SIZE: 44,
  SLOT_GAP: 4,
  PATH_ROWS: [2, 5, 8], // 3 voies horizontales = 3 gates dans le rempart (top / mid / bot)
  PATH_COL: 2,          // voie verticale (connecte les 3 bras)
  GATE_H: 100,
};

const COLORS = {
  background: "#1a2030",
  ground: "#a88b6b",
  groundDark: "#8e7355",
  hudBg: "rgba(15, 20, 25, 0.92)",
  hudText: "#e8eef5",
  hudMuted: "rgba(232, 238, 245, 0.55)",
  player: "#3b82f6",
  playerDark: "#1e40af",
  playerSoft: "rgba(59, 130, 246, 0.15)",
  enemy: "#ef4444",
  enemyDark: "#991b1b",
  enemySoft: "rgba(239, 68, 68, 0.15)",
  wall: "#475569",
  wallDark: "#334155",
  slotEmpty: "rgba(255, 255, 255, 0.08)",
  slotBorder: "rgba(255, 255, 255, 0.25)",
  slotHover: "rgba(59, 130, 246, 0.35)",
  slotInvalid: "rgba(239, 68, 68, 0.35)",
  hpGood: "#22c55e",
  hpWarn: "#f59e0b",
  hpDanger: "#ef4444",
  btnIdle: "rgba(255, 255, 255, 0.08)",
  btnHover: "rgba(255, 255, 255, 0.18)",
  btnActive: "rgba(59, 130, 246, 0.45)",
  btnDisabled: "rgba(255, 255, 255, 0.04)",
};

// -------------------------------------------------------------
// Définitions des entités (types et stats)
// -------------------------------------------------------------

// 4 types de factory + unités correspondantes
const FACTORY_TYPES = {
  light: {
    id: "light",
    label: "Légère",
    cost: 50,
    prodInterval: 2.0,
    hp: 100,
    unitType: "light",
  },
  heavy: {
    id: "heavy",
    label: "Lourde",
    cost: 100,
    prodInterval: 4.0,
    hp: 200,
    unitType: "heavy",
  },
  swarmer: {
    id: "swarmer",
    label: "Swarmer",
    cost: 35,            // léger boost du coût (était 30)
    prodInterval: 1.4,   // un peu moins de spam (était 1.2)
    hp: 70,
    unitType: "swarmer",
  },
  sniper: {
    id: "sniper",
    label: "Sniper",
    cost: 130,           // baissé (était 150)
    prodInterval: 5.0,   // un peu plus rapide à produire (était 5.5)
    hp: 150,
    unitType: "sniper",
  },
};

const UNIT_TYPES = {
  light: {
    id: "light",
    hp: 30,
    damage: 10,
    speed: 90,
    radius: 8,
    range: 55,
    attackInterval: 0.7,
    killReward: 10,
  },
  heavy: {
    id: "heavy",
    hp: 80,
    damage: 25,
    speed: 50,
    radius: 12,
    range: 65,
    attackInterval: 1.5,
    killReward: 25,
  },
  swarmer: {
    id: "swarmer",
    hp: 18,             // légère boost (était 15) pour ne pas mourir d'un seul tir
    damage: 4,          // DPS réduit (était 6) — comptabilise via volume
    speed: 135,         // toujours le plus rapide
    radius: 6,
    range: 35,
    attackInterval: 0.45,
    killReward: 5,      // récompense légèrement réduite (cible facile)
  },
  sniper: {
    id: "sniper",
    hp: 55,             // un peu plus de PV (était 50)
    damage: 35,         // DPS toujours élevé (était 40) — équilibré avec cadence
    speed: 50,          // moins lent (était 35)
    radius: 10,
    range: 145,         // longue portée
    attackInterval: 2.0, // cadence améliorée (était 2.5)
    killReward: 28,
  },
};

// Dégâts qu'inflige une unité quand elle atteint le rempart ennemi (suicide à la frontière).
// L'unité meurt instantanément et la base perd ce montant de PV. Pas de tir sur la base.
const BORDER_HIT_DAMAGE = 1;

// -------------------------------------------------------------
// Comportement défensif
// -------------------------------------------------------------
// Distance MAXIMALE entre le rempart et une menace ennemie pour qu'elle soit considérée
// "en zone de défense" — déclenche l'auto-interception de TOUTES les unités alliées proches.
const DEFENSE_THRESHOLD_PX = 380;
// Rayon de détection d'une unité en mode défense (très supérieur à son attack range)
const DEFENSE_DETECTION_RANGE = 280;
// X de "ralliement" d'une unité défensive sans cible (devant son propre rempart)
function defenseRallyX(side) {
  return side === "player" ? CONFIG.BASE_W + 90 : CONFIG.W - CONFIG.BASE_W - 90;
}
// Une unité ennemie est-elle "menaçante" pour notre base (proche du rempart) ?
function isThreateningOwnBase(enemyUnit, defenderSide) {
  if (defenderSide === "player") return enemyUnit.x < CONFIG.BASE_W + DEFENSE_THRESHOLD_PX;
  return enemyUnit.x > CONFIG.W - CONFIG.BASE_W - DEFENSE_THRESHOLD_PX;
}

// -------------------------------------------------------------
// Système d'upgrades de factory
// -------------------------------------------------------------
// Chaque stat se monte par paliers. Le multiplicateur appliqué = 1 + perLevel * level
// (sauf pour les stats "interval" qui se divisent, plus court = mieux).
const MAX_UPGRADE_LEVEL = 5;
const SELL_RATIO = 0.5; // 50% du total investi est rendu à la revente

const UPGRADE_STATS = [
  { id: "creationRate", label: "Creation rate", emoji: "⏱️",  baseCost: 60, perLevel: 0.20, kind: "factory-interval", unit: "s" },
  { id: "health",       label: "Health",        emoji: "🛡️", baseCost: 40, perLevel: 0.25, kind: "unit-hp",          unit: "PV" },
  { id: "shootRate",    label: "Shoot rate",    emoji: "🔫",  baseCost: 50, perLevel: 0.18, kind: "unit-interval",    unit: "s" },
  { id: "range",        label: "Range",         emoji: "🎯",  baseCost: 55, perLevel: 0.12, kind: "unit",             unit: "px" },
  { id: "speed",        label: "Speed",         emoji: "💨",  baseCost: 40, perLevel: 0.15, kind: "unit",             unit: "px/s" },
  { id: "power",        label: "Power",         emoji: "💥",  baseCost: 70, perLevel: 0.22, kind: "unit",             unit: "" },
];

function upgradeCost(stat, currentLevel) {
  // Cost double à chaque palier : baseCost × 2^level
  return Math.round(stat.baseCost * Math.pow(2, currentLevel));
}

function statMultiplier(level, perLevel) {
  return 1 + perLevel * level;
}

function defaultUpgrades() {
  return { creationRate: 0, health: 0, shootRate: 0, range: 0, speed: 0, power: 0 };
}

// Stats effectives d'une factory une fois ses upgrades appliquées
function effectiveProdInterval(factory) {
  const base = FACTORY_TYPES[factory.typeId].prodInterval;
  return base / statMultiplier(factory.upgrades.creationRate, 0.20);
}

// Stats effectives des unités spawnées par une factory (à figer au moment du spawn)
function spawnStatsFor(factory) {
  const ut = UNIT_TYPES[FACTORY_TYPES[factory.typeId].unitType];
  const u = factory.upgrades;
  return {
    hp:             ut.hp        * statMultiplier(u.health, 0.25),
    damage:         ut.damage    * statMultiplier(u.power, 0.22),
    speed:          ut.speed     * statMultiplier(u.speed, 0.15),
    range:          ut.range     * statMultiplier(u.range, 0.12),
    radius:         ut.radius,
    attackInterval: ut.attackInterval / statMultiplier(u.shootRate, 0.18),
    killReward:     ut.killReward,
  };
}

// -------------------------------------------------------------
// IA ennemie (V0 — timer simple, pas de stratégie complexe)
// -------------------------------------------------------------

// Valeurs par défaut — écrasées par game.preset au démarrage de partie
const AI_CONFIG = {
  buildInterval: 5.0,
  firstBuildDelay: 2,
  typeWeights: { light: 35, heavy: 25, swarmer: 25, sniper: 15 },
};

// -------------------------------------------------------------
// Présets de difficulté
// -------------------------------------------------------------
const DIFFICULTY_PRESETS = {
  easy: {
    label: "Facile",
    emoji: "🟢",
    desc: "L'IA construit lentement, tu démarres avec plus d'argent et de PV",
    aiBuildInterval: 7.5,
    aiStartMoney: 60,
    aiHeavyChance: 0.15,
    aiTypeWeights: { light: 45, heavy: 20, swarmer: 25, sniper: 10 },
    playerStartMoney: 150,
    playerBaseHP: 1500,
    enemyBaseHP: 700,
    aiDefenseChance: 0.15,
  },
  normal: {
    label: "Normal",
    emoji: "🟡",
    desc: "Équilibré — l'expérience pensée par défaut",
    aiBuildInterval: 5.0,
    aiStartMoney: 100,
    aiHeavyChance: 0.30,
    aiTypeWeights: { light: 35, heavy: 25, swarmer: 25, sniper: 15 },
    playerStartMoney: 100,
    playerBaseHP: 1000,
    enemyBaseHP: 1000,
    aiDefenseChance: 0.25,
  },
  hard: {
    label: "Difficile",
    emoji: "🔴",
    desc: "L'IA spam, plus de PV, tu démarres handicapé",
    aiBuildInterval: 3.5,
    aiStartMoney: 150,
    aiHeavyChance: 0.45,
    aiTypeWeights: { light: 25, heavy: 30, swarmer: 25, sniper: 20 },
    playerStartMoney: 80,
    playerBaseHP: 700,
    enemyBaseHP: 1500,
    aiDefenseChance: 0.35,
  },
};

// -------------------------------------------------------------
// Audio (Web Audio API — pas de fichier à charger, tout est synthétisé)
// -------------------------------------------------------------
const audio = {
  ctx: null,
  musicEnabled: true,
  sfxEnabled: true,
  musicMaster: null,   // GainNode pour la musique
  musicNodes: [],      // oscillators de la musique
  lastSfxTime: {},     // throttle par type de SFX
  ensureCtx() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn("[Audio] Web Audio API indisponible :", e);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  },
  playSFX(type) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    // Throttle : pas plus d'un même SFX par 60ms (sauf cas critique)
    const now = ctx.currentTime;
    const minGap = type === "explosion" ? 0.18 : 0.06;
    if (this.lastSfxTime[type] && now - this.lastSfxTime[type] < minGap) return;
    this.lastSfxTime[type] = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);

    switch (type) {
      case "shot": {
        osc.type = "square";
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }
      case "explosion": {
        // Bruit blanc burst via plusieurs oscillators
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.32);
        break;
      }
      case "place": {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }
      case "upgrade": {
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.linearRampToValueAtTime(990, now + 0.16);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      case "sell": {
        osc.type = "sine";
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.18);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }
      case "click": {
        osc.type = "square";
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
      case "win":
      case "lose": {
        osc.type = "sawtooth";
        if (type === "win") {
          osc.frequency.setValueAtTime(330, now);
          osc.frequency.linearRampToValueAtTime(660, now + 0.5);
        } else {
          osc.frequency.setValueAtTime(330, now);
          osc.frequency.linearRampToValueAtTime(110, now + 0.6);
        }
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.75);
        break;
      }
    }
  },
  startMusic() {
    if (!this.musicEnabled || this.musicNodes.length > 0) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.06, now + 1.5);
    master.connect(ctx.destination);
    this.musicMaster = master;

    // Drone à 3 voix (do — sol — mi) avec léger détune
    const freqs = [110, 165, 220];
    for (const f of freqs) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f, now);
      // LFO sur la fréquence pour donner un peu de vie
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.15 + Math.random() * 0.2, now);
      lfoGain.gain.setValueAtTime(2.5, now);
      lfo.connect(lfoGain).connect(o.frequency);
      g.gain.setValueAtTime(0.5, now);
      // Filtre passe-bas pour adoucir
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(600, now);
      o.connect(filter).connect(g).connect(master);
      o.start(now);
      lfo.start(now);
      this.musicNodes.push(o, lfo);
    }
  },
  stopMusic() {
    if (!this.musicMaster) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    this.musicMaster.gain.cancelScheduledValues(now);
    this.musicMaster.gain.setValueAtTime(this.musicMaster.gain.value, now);
    this.musicMaster.gain.linearRampToValueAtTime(0.0001, now + 0.5);
    setTimeout(() => {
      for (const n of this.musicNodes) {
        try { n.stop(); } catch (_) {}
      }
      this.musicNodes = [];
      this.musicMaster = null;
    }, 600);
  },
  setMusicEnabled(on) {
    this.musicEnabled = on;
    if (on && game.screen === "playing") this.startMusic();
    else this.stopMusic();
  },
  setSfxEnabled(on) { this.sfxEnabled = on; },
};

// -------------------------------------------------------------
// Persistance settings (localStorage)
// -------------------------------------------------------------
const SETTINGS_KEY = "robotic-emergence-settings-v1";

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.difficulty && DIFFICULTY_PRESETS[s.difficulty]) {
      game.difficulty = s.difficulty;
      game.preset = DIFFICULTY_PRESETS[s.difficulty];
    }
    if (typeof s.musicEnabled === "boolean") audio.musicEnabled = s.musicEnabled;
    if (typeof s.sfxEnabled === "boolean") audio.sfxEnabled = s.sfxEnabled;
  } catch (_) {}
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      difficulty: game.difficulty,
      musicEnabled: audio.musicEnabled,
      sfxEnabled: audio.sfxEnabled,
    }));
  } catch (_) {}
}

// -------------------------------------------------------------
// État global du jeu
// -------------------------------------------------------------

const game = {
  time: 0,
  lastTimestamp: 0,
  screen: "menu",
  difficulty: "normal",
  preset: DIFFICULTY_PRESETS.normal,
  player: null,
  enemy: null,
  units: [],
  attackFx: [],
  explosions: [],
  lightning: null,                // { x, y1, y2, age, ttl } pendant l'animation
  lightningCooldown: 0,           // secondes restantes avant la prochaine charge
  stats: { player: makeStats(), enemy: makeStats() },
  gameOver: null,
  camera: { x: 0 },
  ui: {
    selectedBuildType: null,
    hoverSlot: null,
    mouse: { x: 0, y: 0 },
    mouseScreen: { x: 0, y: 0 },
    mouseInside: false,
    buttons: [],
    replayBtn: null,
    upgradePanel: null,
    panelRects: null,
    menuRects: null,
    gameOverMenuBtn: null,
    lightningBtn: null,           // rect du bouton Éclair en HUD
  },
};

// -------------------------------------------------------------
// Turret : nouveau type de bâtiment placé sur le rempart
// -------------------------------------------------------------
const TURRET_TYPE = {
  cost: 200,
  hp: 200,
  damage: 18,
  range: 220,
  attackInterval: 0.9,
  radius: 12,
  killReward: 0,
};

const LIGHTNING_COOLDOWN_SEC = 30;
const LIGHTNING_KILL_HALF_WIDTH = 70; // moitié largeur de la zone létale (px)
const LIGHTNING_TTL_SEC = 0.55;

function makeSideState(side) {
  const preset = game.preset;
  const startMoney = side === "player" ? preset.playerStartMoney : preset.aiStartMoney;
  const baseHP = side === "player" ? preset.playerBaseHP : preset.enemyBaseHP;
  return {
    side,
    money: startMoney,
    startMoney,
    baseHP,
    baseHPMax: baseHP,
    slots: [],
    wallSlots: [],
    buildTimer: side === "enemy"
      ? preset.aiBuildInterval - AI_CONFIG.firstBuildDelay
      : 0,
  };
}

// Stats de partie (reset à chaque startGame)
function makeStats() {
  return {
    moneySpent: 0,
    factoriesBuilt: 0,
    upgradesBought: 0,
    turretsBuilt: 0,
    unitsSpawned: 0,
    unitsKilled: 0,
    unitsLost: 0,
    damageDealt: 0,
    damageTaken: 0,
    borderHits: 0,
    lightningsUsed: 0,
    factoriesBuiltByType: { light: 0, heavy: 0, swarmer: 0, sniper: 0 },
    unitsSpawnedByType: { light: 0, heavy: 0, swarmer: 0, sniper: 0 },
  };
}

// -------------------------------------------------------------
// Sprite loader (fallback géométrique si PNG absent)
// -------------------------------------------------------------

const SPRITE_FILES = [
  "tile-ground",
  "base-player",
  "base-enemy",
  "factory-light-player",
  "factory-light-enemy",
  "factory-heavy-player",
  "factory-heavy-enemy",
  "unit-light-player",
  "unit-light-enemy",
  "unit-heavy-player",
  "unit-heavy-enemy",
  "unit-swarmer-player",
  "unit-swarmer-enemy",
  "unit-sniper-player",
  "unit-sniper-enemy",
];

const sprites = {};

function loadSprite(name) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      sprites[name] = img;
      resolve();
    };
    img.onerror = () => {
      sprites[name] = null;
      resolve();
    };
    img.src = `../08-art-direction/sprites/${name}.png`;
  });
}

async function loadAllSprites() {
  await Promise.all(SPRITE_FILES.map(loadSprite));
}

// -------------------------------------------------------------
// Initialisation des grilles (V0b : grille pleine + path en croix)
// -------------------------------------------------------------

function isPathCell(row, col) {
  return CONFIG.PATH_ROWS.includes(row) || col === CONFIG.PATH_COL;
}

// Pour une factory à la rangée donnée, renvoie la rangée du gate utilisé (la plus proche).
function gateRowFor(factoryRow) {
  let best = CONFIG.PATH_ROWS[0];
  let bestDist = Math.abs(best - factoryRow);
  for (const r of CONFIG.PATH_ROWS) {
    const d = Math.abs(r - factoryRow);
    if (d < bestDist) { best = r; bestDist = d; }
  }
  return best;
}

// Renvoie le Y central d'un gate (row de path). Identique côté joueur et ennemi (grille mirroirée).
function gateRowToY(gateRow) {
  const slot = game.player.slots.find((s) => s.row === gateRow && s.col === 0);
  return slot ? slot.y + slot.size / 2 : CONFIG.HUD_H + (CONFIG.H - CONFIG.HUD_H) / 2;
}

// Couleur associée à chaque gate (pour color-coder slots + ouvertures rempart en mode build)
const GATE_COLORS = {
  top:    { fill: "rgba(34, 211, 238, 0.22)",  stroke: "rgba(34, 211, 238, 0.85)",  hex: "#22d3ee" },
  mid:    { fill: "rgba(34, 197, 94, 0.22)",   stroke: "rgba(34, 197, 94, 0.85)",   hex: "#22c55e" },
  bot:    { fill: "rgba(251, 146, 60, 0.22)",  stroke: "rgba(251, 146, 60, 0.85)",  hex: "#fb923c" },
};

function gateKeyForRow(row) {
  const idx = CONFIG.PATH_ROWS.indexOf(row);
  return idx === 0 ? "top" : idx === 1 ? "mid" : "bot";
}

function buildSlots() {
  const gameAreaTop = CONFIG.HUD_H;
  const gameAreaH = CONFIG.H - CONFIG.HUD_H;

  const gridW = CONFIG.GRID_COLS * CONFIG.SLOT_SIZE + (CONFIG.GRID_COLS - 1) * CONFIG.SLOT_GAP;
  const gridH = CONFIG.GRID_ROWS * CONFIG.SLOT_SIZE + (CONFIG.GRID_ROWS - 1) * CONFIG.SLOT_GAP;
  const gridStartY = gameAreaTop + (gameAreaH - gridH) / 2;

  const buildSide = (side) => {
    const slots = [];
    // Centre la grille dans la largeur de la base (en réservant ~12px pour le mur extérieur)
    const baseInnerX = side === "player" ? 12 : CONFIG.W - CONFIG.BASE_W + 12;
    const baseInnerW = CONFIG.BASE_W - 24;
    const baseLeftX = baseInnerX + (baseInnerW - gridW) / 2;
    for (let row = 0; row < CONFIG.GRID_ROWS; row++) {
      for (let col = 0; col < CONFIG.GRID_COLS; col++) {
        slots.push({
          row,
          col,
          x: baseLeftX + col * (CONFIG.SLOT_SIZE + CONFIG.SLOT_GAP),
          y: gridStartY + row * (CONFIG.SLOT_SIZE + CONFIG.SLOT_GAP),
          size: CONFIG.SLOT_SIZE,
          factory: null,
          isPath: isPathCell(row, col),
        });
      }
    }
    return slots;
  };

  game.player.slots = buildSide("player");
  game.enemy.slots = buildSide("enemy");

  // Wall slots : 1 par rangée non-path (8 slots par camp) — placement de turrets.
  // Hitbox large (36px de large) qui déborde de chaque côté du rempart pour faciliter le clic.
  for (const side of ["player", "enemy"]) {
    const state = game[side];
    state.wallSlots = [];
    for (let row = 0; row < CONFIG.GRID_ROWS; row++) {
      if (CONFIG.PATH_ROWS.includes(row)) continue;
      const gridSlot = state.slots.find((s) => s.row === row && s.col === 0);
      if (!gridSlot) continue;
      const wallX = side === "player" ? CONFIG.BASE_W - 28 : CONFIG.W - CONFIG.BASE_W - 8;
      state.wallSlots.push({
        row,
        x: wallX,
        y: gridSlot.y,
        w: 36,
        h: gridSlot.size,
        turret: null,
      });
    }
  }
}

function tryPlaceTurret(side, wallSlotIndex) {
  if (side !== "player") return false;
  const state = game[side];
  const slot = state.wallSlots[wallSlotIndex];
  if (!slot || slot.turret) return false;
  if (state.money < TURRET_TYPE.cost) return false;

  state.money -= TURRET_TYPE.cost;
  game.stats[side].moneySpent += TURRET_TYPE.cost;
  game.stats[side].turretsBuilt++;

  const stats = {
    hp: TURRET_TYPE.hp,
    damage: TURRET_TYPE.damage,
    speed: 0,
    radius: TURRET_TYPE.radius,
    range: TURRET_TYPE.range,
    attackInterval: TURRET_TYPE.attackInterval,
    killReward: TURRET_TYPE.killReward,
  };
  const turret = {
    side,
    typeId: "turret",
    kind: "turret",
    stationary: true,
    x: slot.x + slot.w / 2,
    y: slot.y + slot.h / 2,
    hp: stats.hp,
    maxHp: stats.hp,
    stats,
    target: null,
    attackCooldown: 0,
    wanderY: null,
    wanderTimer: 0,
    mode: "defense",
    exitWaypoints: [],
    wallSlotRef: slot,
    totalInvested: TURRET_TYPE.cost,
  };
  game.units.push(turret);
  slot.turret = turret;
  audio.playSFX("place");
  return true;
}

function sellTurret(side, wallSlotIndex) {
  const state = game[side];
  const slot = state.wallSlots[wallSlotIndex];
  if (!slot || !slot.turret) return false;
  const refund = Math.floor((slot.turret.totalInvested || TURRET_TYPE.cost) * SELL_RATIO);
  state.money += refund;
  slot.turret.hp = 0; // sera retirée à la prochaine cleanup
  slot.turret = null;
  audio.playSFX("sell");
  return refund;
}

// Conservé pour compat : renvoie le Y du gate central (mid).
function getPathCenterY() {
  return gateRowToY(CONFIG.PATH_ROWS[1]);
}

// -------------------------------------------------------------
// Boutons du HUD (mode build)
// -------------------------------------------------------------

function buildHudButtons() {
  // 5 boutons de construction côte à côte (raccourcis 1-5)
  const types = ["light", "heavy", "swarmer", "sniper", "turret"];
  const startX = 130;
  const btnW = 116;
  const btnGap = 4;
  game.ui.buttons = types.map((t, i) => ({
    id: `build-${t}`,
    type: t,
    x: startX + i * (btnW + btnGap),
    y: 12,
    w: btnW,
    h: 36,
  }));
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// -------------------------------------------------------------
// Coordonnées des portes des remparts (point de sortie des unités)
// -------------------------------------------------------------

// Position de sortie pour un gate donné. gateRow ∈ CONFIG.PATH_ROWS.
function getGateCenter(side, gateRow) {
  const gateX = side === "player" ? CONFIG.BASE_W - 6 : CONFIG.W - CONFIG.BASE_W + 6;
  return { x: gateX, y: gateRowToY(gateRow) };
}

// Ligne de "frontière" : x au moment où l'unité atteint le rempart adverse (face battlefield).
// L'unité y explose : 1 PV à la base + mort instantanée. Pas de tir.
function getEnemyBorderX(unitSide) {
  // unit du joueur → rempart ennemi (bord extérieur face battlefield)
  if (unitSide === "player") return CONFIG.W - CONFIG.BASE_W;
  // unit ennemie → rempart joueur (bord extérieur face battlefield)
  return CONFIG.BASE_W;
}

// -------------------------------------------------------------
// Placement / production
// -------------------------------------------------------------

function tryPlaceFactory(side, slotIndex, typeId) {
  if (side !== "player") return false; // V0 : seul le joueur place manuellement
  const state = game[side];
  const slot = state.slots[slotIndex];
  if (!slot || slot.factory) return false;
  if (slot.isPath) return false; // pas de construction sur le path
  const type = FACTORY_TYPES[typeId];
  if (!type) return false;
  if (state.money < type.cost) return false;

  state.money -= type.cost;
  game.stats[side].moneySpent += type.cost;
  game.stats[side].factoriesBuilt++;
  if (game.stats[side].factoriesBuiltByType[typeId] != null) {
    game.stats[side].factoriesBuiltByType[typeId]++;
  }
  slot.factory = {
    typeId,
    side,
    hp: type.hp,
    prodTimer: 0,
    level: 1,
    upgrades: defaultUpgrades(),
    totalInvested: type.cost,
    mode: "attack",
  };
  audio.playSFX("place");
  return true;
}

// Achète un upgrade pour une factory donnée. Retourne true si succès.
function tryUpgradeFactory(side, slotIndex, statId) {
  const state = game[side];
  const slot = state.slots[slotIndex];
  if (!slot || !slot.factory) return false;
  const stat = UPGRADE_STATS.find((s) => s.id === statId);
  if (!stat) return false;
  const lvl = slot.factory.upgrades[statId] || 0;
  if (lvl >= MAX_UPGRADE_LEVEL) return false;
  const cost = upgradeCost(stat, lvl);
  if (state.money < cost) return false;
  state.money -= cost;
  game.stats[side].moneySpent += cost;
  game.stats[side].upgradesBought++;
  slot.factory.upgrades[statId] = lvl + 1;
  slot.factory.totalInvested += cost;
  audio.playSFX("upgrade");
  return true;
}

// Vend une factory : rembourse 50% du totalInvested
function sellFactory(side, slotIndex) {
  const state = game[side];
  const slot = state.slots[slotIndex];
  if (!slot || !slot.factory) return false;
  const refund = Math.floor(slot.factory.totalInvested * SELL_RATIO);
  state.money += refund;
  slot.factory = null;
  audio.playSFX("sell");
  return refund;
}

function updateFactories(dt) {
  for (const side of ["player", "enemy"]) {
    const state = game[side];
    for (const slot of state.slots) {
      if (!slot.factory) continue;
      const f = slot.factory;
      f.prodTimer += dt;
      const interval = effectiveProdInterval(f);
      if (f.prodTimer >= interval) {
        f.prodTimer = 0;
        spawnUnitFromFactory(side, slot);
      }
    }
  }
}

function spawnUnitFromFactory(side, slot) {
  const factory = slot.factory;
  const gateRow = gateRowFor(slot.row);
  const gate = getGateCenter(side, gateRow);
  const stats = spawnStatsFor(factory);

  const spawnX = slot.x + slot.size / 2;
  const spawnY = slot.y + slot.size / 2;

  const typeId = FACTORY_TYPES[factory.typeId].unitType;
  game.units.push({
    side,
    typeId,
    kind: "unit",
    x: spawnX,
    y: spawnY,
    gateY: gate.y,
    hp: stats.hp,
    maxHp: stats.hp,
    stats,
    target: null,
    attackCooldown: 0,
    wanderY: null,
    wanderTimer: 0,
    mode: factory.mode || "attack",
    exitWaypoints: buildInternalWaypoints(side, slot, gateRow),
  });
  game.stats[side].unitsSpawned++;
  if (game.stats[side].unitsSpawnedByType[typeId] != null) {
    game.stats[side].unitsSpawnedByType[typeId]++;
  }
}

// Construit la suite de points (x, y) que l'unité va suivre depuis sa factory
// jusqu'à l'extérieur du rempart, en empruntant la croix.
function buildInternalWaypoints(side, slot, gateRow) {
  const wps = [];
  const pathColSlot = game[side].slots.find((s) => s.col === CONFIG.PATH_COL && s.row === slot.row);
  const pathColX = pathColSlot ? pathColSlot.x + pathColSlot.size / 2 : slot.x + slot.size / 2;
  const factoryCy = slot.y + slot.size / 2;
  const gateY = gateRowToY(gateRow);
  const gate = getGateCenter(side, gateRow);

  // 1) horizontal : de la factory à la vertical arm (col PATH_COL, même row que la factory)
  if (slot.col !== CONFIG.PATH_COL) {
    wps.push({ x: pathColX, y: factoryCy });
  }
  // 2) vertical : de la vertical arm à la gate row
  if (slot.row !== gateRow) {
    wps.push({ x: pathColX, y: gateY });
  }
  // 3) horizontal : du croisement à la sortie du rempart
  wps.push({ x: gate.x, y: gate.y });

  return wps;
}

// Plage Y utilisable pour le wander (toute la map sauf marge haut/bas)
function pickRandomWanderY() {
  const minY = CONFIG.HUD_H + 24;
  const maxY = CONFIG.H - 24;
  return minY + Math.random() * (maxY - minY);
}

function isInBattlefield(u) {
  return u.x > CONFIG.BASE_W && u.x < CONFIG.W - CONFIG.BASE_W;
}

function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function targetIsAlive(target) {
  if (!target) return false;
  return target.hp > 0;
}

// Cible : SEULEMENT les unités ennemies à portée. Pas de fallback "base"
// — quand aucune cible n'est en range, l'unité avance tout droit vers la base ennemie
// pour s'y faire exploser à la frontière (cf. updateUnits).
function findTargetFor(u) {
  const enemySide = u.side === "player" ? "enemy" : "player";
  const isDef = u.mode === "defense";

  let best = null;
  let bestDist = Infinity;
  for (const other of game.units) {
    if (other.side !== enemySide || other.hp <= 0) continue;
    const d = dist(u.x, u.y, other.x, other.y);

    // Cas 1 : ennemi déjà à portée de tir → cible directe (priorité absolue)
    if (d <= u.stats.range) {
      if (d < bestDist) { best = other; bestDist = d; }
      continue;
    }

    // Cas 2 : auto-interception — toute unité alliée vise les menaces proches de SA base
    if (isThreateningOwnBase(other, u.side) && d <= DEFENSE_DETECTION_RANGE) {
      if (d < bestDist) { best = other; bestDist = d; }
      continue;
    }

    // Cas 3 : mode défense — détecte aussi les ennemis dans le rayon élargi
    // (même hors de la zone de défense, pour aller à la rencontre)
    if (isDef && d <= DEFENSE_DETECTION_RANGE) {
      if (d < bestDist) { best = other; bestDist = d; }
    }
  }
  return best;
}

function applyDamage(target, amount, attacker) {
  target.hp -= amount;
  if (attacker) {
    game.stats[attacker.side].damageDealt += amount;
    game.stats[target.side].damageTaken += amount;
  }
  if (target.hp <= 0 && attacker) {
    game[attacker.side].money += target.stats.killReward;
    game.stats[attacker.side].unitsKilled++;
    game.stats[target.side].unitsLost++;
  }
}

function spawnExplosion(x, y, side) {
  game.explosions.push({ x, y, age: 0, ttl: 0.45, side });
  audio.playSFX("explosion");
}

function isExiting(u) {
  return !u.stationary && u.exitWaypoints && u.exitWaypoints.length > 0;
}

function updateUnits(dt) {
  // 1) Choix / révision de cible (sauf si l'unité traverse encore sa base)
  for (const u of game.units) {
    if (u.hp <= 0 || isExiting(u)) continue;
    if (!targetIsAlive(u.target) || dist(u.x, u.y, u.target.x, u.target.y) > u.stats.range) {
      u.target = findTargetFor(u);
    }
  }

  // 2) Comportement : exit-phase / combat / wander / défense selon état
  for (const u of game.units) {
    if (u.hp <= 0) continue;
    u.attackCooldown = Math.max(0, u.attackCooldown - dt);

    // Phase de sortie : suit ses waypoints internes, ne combat pas, ne wander pas
    if (isExiting(u)) {
      const wp = u.exitWaypoints[0];
      const dx = wp.x - u.x;
      const dy = wp.y - u.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const step = u.stats.speed * dt;
      if (d <= step + 1) {
        // Atteint le waypoint : on snap dessus et on passe au suivant
        u.x = wp.x;
        u.y = wp.y;
        u.exitWaypoints.shift();
      } else {
        u.x += (dx / d) * step;
        u.y += (dy / d) * step;
      }
      continue;
    }

    if (u.target && targetIsAlive(u.target)) {
      const d = dist(u.x, u.y, u.target.x, u.target.y);
      if (d <= u.stats.range) {
        if (u.attackCooldown === 0) {
          applyDamage(u.target, u.stats.damage, u);
          u.attackCooldown = u.stats.attackInterval;
          game.attackFx.push({
            x1: u.x, y1: u.y, x2: u.target.x, y2: u.target.y,
            age: 0, ttl: 0.12, side: u.side,
          });
          audio.playSFX("shot");
        }
        continue;
      }
      // Stationnaire (turret) : ne poursuit pas, attend la cible
      if (u.stationary) continue;
      // Cible hors range : poursuit (mode def, ou cible menace la base)
      const isDef = u.mode === "defense";
      const isThreat = isThreateningOwnBase(u.target, u.side);
      if (isDef || isThreat) {
        const dx = u.target.x - u.x;
        const dy = u.target.y - u.y;
        const len = Math.max(0.0001, Math.sqrt(dx * dx + dy * dy));
        u.x += (dx / len) * u.stats.speed * dt;
        u.y += (dy / len) * u.stats.speed * dt;
        continue;
      }
    }

    // Tout mouvement suivant est sauté pour les unités stationnaires
    if (u.stationary) continue;

    // Pas de cible (ou cible attaque non-menaçante) → déplacement par mode
    if (u.mode === "defense") {
      // Reste près du rempart, wander local
      const rallyX = defenseRallyX(u.side);
      const dxRally = rallyX - u.x;
      if (Math.abs(dxRally) > 30) {
        u.x += Math.sign(dxRally) * u.stats.speed * 0.6 * dt;
      }
      // Wander Y locale entre 80 et H-30
      u.wanderTimer -= dt;
      const reached = u.wanderY != null && Math.abs(u.y - u.wanderY) < 8;
      if (u.wanderY == null || reached || u.wanderTimer <= 0) {
        u.wanderY = pickRandomWanderY();
        u.wanderTimer = 2 + Math.random() * 3;
      }
      const dyW = u.wanderY - u.y;
      if (Math.abs(dyW) > 0.5) {
        u.y += Math.sign(dyW) * Math.min(Math.abs(dyW), u.stats.speed * 0.5 * dt);
      }
      continue;
    }

    // Mode attaque : avance vers la base ennemie + wander
    const forwardSign = u.side === "player" ? 1 : -1;
    u.x += forwardSign * u.stats.speed * dt;

    if (isInBattlefield(u)) {
      u.wanderTimer -= dt;
      const reached = u.wanderY != null && Math.abs(u.y - u.wanderY) < 8;
      if (u.wanderY == null || reached || u.wanderTimer <= 0) {
        u.wanderY = pickRandomWanderY();
        u.wanderTimer = 1.5 + Math.random() * 2.5;
      }
      const dy = u.wanderY - u.y;
      const lateralSpeed = u.stats.speed * 0.65;
      if (Math.abs(dy) > 0.5) {
        u.y += Math.sign(dy) * Math.min(Math.abs(dy), lateralSpeed * dt);
      }
    } else {
      // Dans la base : réaligne sur le gateY pour franchir le rempart
      const targetY = u.gateY != null ? u.gateY : getPathCenterY();
      const dy = targetY - u.y;
      const lateralSpeed = u.stats.speed * 0.5;
      if (Math.abs(dy) > 0.5) {
        u.y += Math.sign(dy) * Math.min(Math.abs(dy), lateralSpeed * dt);
      }
    }
  }

  // 3) Frontière : unité qui atteint le rempart ennemi → suicide (1 HP base) + explosion
  for (const u of game.units) {
    if (u.hp <= 0 || isExiting(u) || u.stationary) continue;
    const borderX = getEnemyBorderX(u.side);
    const reached = u.side === "player" ? u.x >= borderX : u.x <= borderX;
    if (reached) {
      const targetSide = u.side === "player" ? "enemy" : "player";
      game[targetSide].baseHP = Math.max(0, game[targetSide].baseHP - BORDER_HIT_DAMAGE);
      game.stats[u.side].borderHits++;
      spawnExplosion(u.x, u.y, u.side);
      u.hp = 0;
    }
  }

  // 4) Nettoyage : libère les wallSlots des turrets détruites, retire les morts
  for (const u of game.units) {
    if (u.hp <= 0 && u.wallSlotRef && u.wallSlotRef.turret === u) {
      u.wallSlotRef.turret = null;
    }
  }
  game.units = game.units.filter((u) => u.hp > 0);
}

function updateExplosions(dt) {
  for (const fx of game.explosions) fx.age += dt;
  game.explosions = game.explosions.filter((fx) => fx.age < fx.ttl);
}

function updateAttackFx(dt) {
  for (const fx of game.attackFx) fx.age += dt;
  game.attackFx = game.attackFx.filter((fx) => fx.age < fx.ttl);
}

function checkGameOver() {
  if (game.gameOver) return;
  if (game.player.baseHP <= 0) {
    game.gameOver = { winner: "enemy" };
    audio.playSFX("lose");
    audio.stopMusic();
  } else if (game.enemy.baseHP <= 0) {
    game.gameOver = { winner: "player" };
    audio.playSFX("win");
    audio.stopMusic();
  }
}

function updateEnemyAI(dt) {
  const state = game.enemy;
  state.buildTimer += dt;
  if (state.buildTimer < AI_CONFIG.buildInterval) return;

  // L'IA ne construit que sur les cellules constructibles (hors path)
  const buildable = state.slots.filter((s) => !s.factory && !s.isPath);
  if (buildable.length === 0) {
    state.buildTimer = 0;
    return;
  }

  // Tirage pondéré parmi les types abordables
  const affordable = Object.keys(FACTORY_TYPES).filter((t) => state.money >= FACTORY_TYPES[t].cost);
  if (affordable.length === 0) {
    state.buildTimer = AI_CONFIG.buildInterval - 1;
    return;
  }
  const totalWeight = affordable.reduce((a, t) => a + (AI_CONFIG.typeWeights[t] || 10), 0);
  let r = Math.random() * totalWeight;
  let typeId = affordable[0];
  for (const t of affordable) {
    r -= AI_CONFIG.typeWeights[t] || 10;
    if (r <= 0) { typeId = t; break; }
  }

  const type = FACTORY_TYPES[typeId];
  const slot = buildable[Math.floor(Math.random() * buildable.length)];
  state.money -= type.cost;
  game.stats.enemy.moneySpent += type.cost;
  game.stats.enemy.factoriesBuilt++;
  if (game.stats.enemy.factoriesBuiltByType[typeId] != null) {
    game.stats.enemy.factoriesBuiltByType[typeId]++;
  }
  slot.factory = {
    typeId,
    side: "enemy",
    hp: type.hp,
    prodTimer: 0,
    level: 1,
    upgrades: defaultUpgrades(),
    totalInvested: type.cost,
    mode: Math.random() < game.preset.aiDefenseChance ? "defense" : "attack",
  };
  state.buildTimer = 0;
}

// -------------------------------------------------------------
// Boucle de jeu
// -------------------------------------------------------------

function update(dt) {
  if (game.screen !== "playing" || game.gameOver) {
    if (game.player) {
      game.ui.mouse.x = game.ui.mouseScreen.x + game.camera.x;
      game.ui.mouse.y = game.ui.mouseScreen.y;
    }
    return;
  }
  game.time += dt;
  updateCamera(dt);
  updateLightning(dt);
  updateEnemyAI(dt);
  updateFactories(dt);
  updateUnits(dt);
  updateAttackFx(dt);
  updateExplosions(dt);
  checkGameOver();
  game.ui.mouse.x = game.ui.mouseScreen.x + game.camera.x;
  game.ui.mouse.y = game.ui.mouseScreen.y;
}

function updateLightning(dt) {
  if (game.lightningCooldown > 0) game.lightningCooldown = Math.max(0, game.lightningCooldown - dt);
  if (!game.lightning) return;
  game.lightning.age += dt;
  if (game.lightning.age >= game.lightning.ttl) game.lightning = null;
}

function triggerLightning() {
  if (game.lightningCooldown > 0) return false;
  const centerX = CONFIG.W / 2;
  const y1 = CONFIG.HUD_H + 20;
  const y2 = CONFIG.H - 20;
  game.lightning = { x: centerX, y1, y2, age: 0, ttl: LIGHTNING_TTL_SEC, segments: makeLightningSegments(centerX, y1, y2) };
  game.lightningCooldown = LIGHTNING_COOLDOWN_SEC;
  // Tue tout ce qui se trouve dans la bande [centerX - half, centerX + half], sans distinction
  let killsByPlayer = 0, killsByEnemy = 0;
  for (const u of game.units) {
    if (u.hp <= 0) continue;
    if (u.stationary) continue; // les turrets sur les remparts (loin du milieu) ne sont pas touchées
    if (Math.abs(u.x - centerX) <= LIGHTNING_KILL_HALF_WIDTH) {
      u.hp = 0;
      spawnExplosion(u.x, u.y, u.side);
      game.stats[u.side].unitsLost++;
      if (u.side === "player") killsByEnemy++;
      else killsByPlayer++;
    }
  }
  // L'éclair étant déclenché par le joueur, on compte les kills ennemis tués pour lui
  game.stats.player.unitsKilled += killsByPlayer;
  game.stats.enemy.unitsKilled += killsByEnemy; // si l'IA balayait sa propre vague (rare)
  game.stats.player.lightningsUsed++;
  audio.playSFX("explosion");
  audio.playSFX("explosion");
  return true;
}

function makeLightningSegments(x, y1, y2) {
  // Génère une polyligne en zigzag pour le rendu
  const segs = [{ x, y: y1 }];
  const steps = 18;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const yy = y1 + (y2 - y1) * t;
    const jitter = (Math.random() - 0.5) * 30;
    segs.push({ x: x + jitter, y: yy });
  }
  segs.push({ x, y: y2 });
  return segs;
}

function updateCamera(dt) {
  const margin = CONFIG.CAMERA_SCROLL_MARGIN;
  const speed = CONFIG.CAMERA_SCROLL_SPEED;
  const sx = game.ui.mouseScreen.x;
  const sy = game.ui.mouseScreen.y;
  const cw = CONFIG.CANVAS_W;

  // 1) Si la souris survole une zone UI (HUD, panneau d'upgrade, game over,
  //    minimap, boutons), on coupe l'auto-scroll pour éviter d'emporter la
  //    map quand on clique sur ces éléments.
  const overHud = sy < CONFIG.HUD_H;
  const panelGeo = game.ui.upgradePanel ? getPanelGeometry() : null;
  const overPanel = panelGeo && pointInRect(sx, sy, panelGeo);
  const overGameOver = !!game.gameOver;
  if (!game.ui.mouseInside || overHud || overPanel || overGameOver) return;

  if (sx >= 0 && sx < margin) {
    const intensity = 1 - sx / margin;
    game.camera.x -= speed * intensity * dt;
  } else if (sx > cw - margin && sx <= cw) {
    const intensity = (sx - (cw - margin)) / margin;
    game.camera.x += speed * intensity * dt;
  }
  const maxScroll = Math.max(0, CONFIG.W - CONFIG.CANVAS_W);
  if (game.camera.x < 0) game.camera.x = 0;
  if (game.camera.x > maxScroll) game.camera.x = maxScroll;
}

function render(ctx) {
  if (game.screen === "menu") {
    drawMenu(ctx);
    return;
  }

  // Monde (avec décalage caméra)
  ctx.save();
  ctx.translate(-game.camera.x, 0);
  drawGround(ctx);
  drawBattlefieldLane(ctx);
  drawBase(ctx, "player");
  drawBase(ctx, "enemy");
  drawWallSlots(ctx, "player");
  drawWallSlots(ctx, "enemy");
  drawUnits(ctx);
  drawAttackFx(ctx);
  drawExplosions(ctx);
  drawLightning(ctx);
  ctx.restore();

  // UI (coordonnées écran)
  drawHUD(ctx);
  drawMinimap(ctx);
  drawScrollHints(ctx);
  drawUpgradePanel(ctx);
  if (game.gameOver) drawGameOverOverlay(ctx);
}

function gameLoop(timestamp) {
  const dt = game.lastTimestamp ? (timestamp - game.lastTimestamp) / 1000 : 0;
  game.lastTimestamp = timestamp;

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  try {
    update(dt);
  } catch (e) {
    console.error("[update]", e);
  }
  ctx.clearRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);
  try {
    render(ctx);
  } catch (e) {
    console.error("[render]", e);
    // Fallback : affiche l'erreur sur le canvas pour pouvoir la voir
    ctx.fillStyle = "#1a2030";
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Erreur de rendu :", 20, 20);
    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    const msg = String(e && (e.stack || e.message || e));
    msg.split("\n").slice(0, 12).forEach((line, i) => {
      ctx.fillText(line.slice(0, 110), 20, 50 + i * 16);
    });
    ctx.fillStyle = "#fbbf24";
    ctx.font = "11px monospace";
    ctx.fillText("→ F12 pour la console (rechargement = F5 pour réessayer)", 20, 280);
  }

  requestAnimationFrame(gameLoop);
}

// -------------------------------------------------------------
// Rendu — terrain
// -------------------------------------------------------------

function drawGround(ctx) {
  if (sprites["tile-ground"]) {
    const tile = sprites["tile-ground"];
    const tileSize = 128;
    for (let y = CONFIG.HUD_H; y < CONFIG.H; y += tileSize) {
      for (let x = 0; x < CONFIG.W; x += tileSize) {
        ctx.drawImage(tile, x, y, tileSize, tileSize);
      }
    }
  } else {
    const tileSize = 64;
    for (let y = CONFIG.HUD_H; y < CONFIG.H; y += tileSize) {
      for (let x = 0; x < CONFIG.W; x += tileSize) {
        ctx.fillStyle =
          ((x / tileSize + y / tileSize) | 0) % 2 === 0
            ? COLORS.ground
            : COLORS.groundDark;
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
  }
}

function drawBattlefieldLane(ctx) {
  // Petits halos devant chaque gate pour signaler les 3 points de sortie
  const fromX = CONFIG.BASE_W - 4;
  const toX = CONFIG.W - CONFIG.BASE_W + 4;
  const haloLen = 60;
  for (const gateRow of CONFIG.PATH_ROWS) {
    const y = gateRowToY(gateRow);
    const key = gateKeyForRow(gateRow);
    const c = GATE_COLORS[key];
    // Halo côté joueur (sort vers la droite)
    const playerGrad = ctx.createLinearGradient(fromX, y, fromX + haloLen, y);
    playerGrad.addColorStop(0, c.fill);
    playerGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = playerGrad;
    ctx.fillRect(fromX, y - 14, haloLen, 28);
    // Halo côté ennemi (sort vers la gauche)
    const enemyGrad = ctx.createLinearGradient(toX, y, toX - haloLen, y);
    enemyGrad.addColorStop(0, c.fill);
    enemyGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = enemyGrad;
    ctx.fillRect(toX - haloLen, y - 14, haloLen, 28);
  }

  // Ligne de séparation des camps (frontière)
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.moveTo(CONFIG.W / 2, CONFIG.HUD_H + 10);
  ctx.lineTo(CONFIG.W / 2, CONFIG.H - 10);
  ctx.stroke();
  ctx.setLineDash([]);
}

// -------------------------------------------------------------
// Rendu — bases (rempart + grille + factories)
// -------------------------------------------------------------

function drawBase(ctx, side) {
  const baseX = side === "player" ? 0 : CONFIG.W - CONFIG.BASE_W;
  const baseY = CONFIG.HUD_H;
  const baseH = CONFIG.H - CONFIG.HUD_H;

  ctx.fillStyle = side === "player" ? COLORS.playerSoft : COLORS.enemySoft;
  ctx.fillRect(baseX, baseY, CONFIG.BASE_W, baseH);

  drawRampart(ctx, side);
  drawSlots(ctx, side);
  drawBaseBuilding(ctx, side);
}

function drawRampart(ctx, side) {
  const baseY = CONFIG.HUD_H;
  const baseH = CONFIG.H - CONFIG.HUD_H;
  const rampartX = side === "player" ? CONFIG.BASE_W - 20 : CONFIG.W - CONFIG.BASE_W;
  const gateH = CONFIG.SLOT_SIZE + 6;

  ctx.fillStyle = COLORS.wallDark;
  ctx.fillRect(rampartX, baseY, 20, baseH);

  // Détails crénelés en haut/bas du rempart
  ctx.fillStyle = COLORS.wall;
  for (let y = baseY; y < baseY + 12; y += 6) ctx.fillRect(rampartX, y, 20, 3);
  for (let y = baseY + baseH - 12; y < baseY + baseH; y += 6) ctx.fillRect(rampartX, y, 20, 3);

  // Trouées : une par gate (PATH_ROWS)
  for (const gateRow of CONFIG.PATH_ROWS) {
    const gy = gateRowToY(gateRow);
    ctx.clearRect(rampartX, gy - gateH / 2, 20, gateH);

    // Halo coloré autour du gate (montre clairement les 3 sorties)
    const key = gateKeyForRow(gateRow);
    ctx.strokeStyle = GATE_COLORS[key].stroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rampartX, gy - gateH / 2, 20, gateH);
  }
}

function drawSlots(ctx, side) {
  const state = game[side];
  const isPlayer = side === "player";
  const hover = game.ui.hoverSlot;
  // Preview seulement pour les types de FACTORIES (pas pour turret qui se pose sur le mur)
  const previewActive = isPlayer && !!game.ui.selectedBuildType && !!FACTORY_TYPES[game.ui.selectedBuildType];

  // 1) Passe path : cellules de la croix en couleur "route", chaque rangée teintée par gate
  state.slots.forEach((slot) => {
    if (!slot.isPath) return;
    ctx.fillStyle = "rgba(30, 35, 50, 0.6)";
    ctx.fillRect(slot.x, slot.y, slot.size, slot.size);

    if (CONFIG.PATH_ROWS.includes(slot.row)) {
      const key = gateKeyForRow(slot.row);
      ctx.fillStyle = GATE_COLORS[key].fill;
      ctx.fillRect(slot.x, slot.y, slot.size, slot.size);
    }
  });

  // 2) Passe slots constructibles
  state.slots.forEach((slot, idx) => {
    if (slot.isPath) return;

    let fill = COLORS.slotEmpty;
    let strokeColor = COLORS.slotBorder;

    // APERÇU mode build : color-code les slots constructibles selon leur gate
    if (previewActive && !slot.factory) {
      const type = FACTORY_TYPES[game.ui.selectedBuildType];
      const canAfford = game.player.money >= type.cost;
      const key = gateKeyForRow(gateRowFor(slot.row));
      if (canAfford) {
        fill = GATE_COLORS[key].fill;
        strokeColor = GATE_COLORS[key].stroke;
      } else {
        fill = "rgba(239, 68, 68, 0.10)";
      }
    }

    // HOVER en mode build factory (turret est géré dans drawWallSlots)
    if (isPlayer && game.ui.selectedBuildType && FACTORY_TYPES[game.ui.selectedBuildType]
        && hover && hover.side === "player" && hover.slotIndex === idx) {
      const type = FACTORY_TYPES[game.ui.selectedBuildType];
      if (!slot.factory && game.player.money >= type.cost) {
        fill = COLORS.slotHover;
      } else {
        fill = COLORS.slotInvalid;
      }
    }

    ctx.fillStyle = fill;
    ctx.fillRect(slot.x, slot.y, slot.size, slot.size);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(slot.x + 0.5, slot.y + 0.5, slot.size - 1, slot.size - 1);
    ctx.setLineDash([]);

    if (slot.factory) {
      drawFactory(ctx, slot, side);
    }
  });

  // 3) Overlay path : flèches de sens dans chaque bras horizontal
  drawPathOverlay(ctx, side);

  // 4) Ligne preview slot hover → gate (mode build)
  if (previewActive && hover && hover.side === side) {
    const slot = state.slots[hover.slotIndex];
    if (slot && !slot.factory && !slot.isPath) {
      drawPreviewLineToGate(ctx, side, slot);
    }
  }
}

function drawPathOverlay(ctx, side) {
  const state = game[side];
  const fwd = side === "player" ? 1 : -1;

  // Flèches de direction le long de chaque bras horizontal
  for (const gateRow of CONFIG.PATH_ROWS) {
    const key = gateKeyForRow(gateRow);
    const arrowColor = GATE_COLORS[key].stroke;
    const rowSlots = state.slots.filter((s) => s.row === gateRow);
    rowSlots.sort((a, b) => a.x - b.x);
    for (const slot of rowSlots) {
      const cy = slot.y + slot.size / 2;
      const cx = slot.x + slot.size / 2;
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 6 * fwd, cy - 5);
      ctx.lineTo(cx + 6 * fwd, cy);
      ctx.lineTo(cx - 6 * fwd, cy + 5);
      ctx.stroke();
      ctx.lineCap = "butt";
    }
  }
}

// Ligne reliant un slot constructible (hovered) à son gate de sortie
function drawPreviewLineToGate(ctx, side, slot) {
  const gateRow = gateRowFor(slot.row);
  const gateY = gateRowToY(gateRow);
  const key = gateKeyForRow(gateRow);
  const color = GATE_COLORS[key].stroke;

  const factCx = slot.x + slot.size / 2;
  const factCy = slot.y + slot.size / 2;
  // Point intermédiaire : col PATH_COL au niveau du gate
  const pathColSlot = game[side].slots.find((s) => s.col === CONFIG.PATH_COL && s.row === gateRow);
  const midCx = pathColSlot ? pathColSlot.x + pathColSlot.size / 2 : factCx;
  // Gate à l'extrémité du rempart
  const rampartX = side === "player" ? CONFIG.BASE_W - 10 : CONFIG.W - CONFIG.BASE_W + 10;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 5]);
  ctx.lineCap = "round";
  ctx.beginPath();
  // slot → col PATH_COL (vertical) → gate row (horizontal) → rampart
  ctx.moveTo(factCx, factCy);
  ctx.lineTo(midCx, factCy);
  ctx.lineTo(midCx, gateY);
  ctx.lineTo(rampartX, gateY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Petit cercle pulsant au gate
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(rampartX, gateY, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawFactory(ctx, slot, side) {
  const f = slot.factory;
  const type = FACTORY_TYPES[f.typeId];
  const spriteName = `factory-${f.typeId}-${side}`;
  const inset = 3;
  const x = slot.x + inset;
  const y = slot.y + inset;
  const w = slot.size - inset * 2;
  const h = slot.size - inset * 2;

  if (sprites[spriteName]) {
    ctx.drawImage(sprites[spriteName], x, y, w, h);
  } else {
    // Placeholder polish — silhouette par type
    drawFactoryPlaceholder(ctx, f.typeId, side, x, y, w, h);
  }

  // Petit marqueur de mode défense en haut à droite
  if (f.mode === "defense") {
    ctx.fillStyle = "rgba(34, 197, 94, 0.92)";
    ctx.beginPath();
    ctx.arc(x + w - 6, y + 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 8px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🛡", x + w - 6, y + 6);
  }

  // Étoiles d'amélioration (en bas du sprite, basé sur somme des niveaux d'upgrade)
  const totalLevels = Object.values(f.upgrades).reduce((a, v) => a + v, 0);
  if (totalLevels > 0) {
    drawFactoryStars(ctx, x, y + h - 11, w, totalLevels);
    // La barre de prod est décalée plus haut pour ne pas écraser les étoiles
    drawProdBar(ctx, f, type, x, y + h - 14, w);
  } else {
    drawProdBar(ctx, f, type, x, y + h - 4, w);
  }
}

// Placeholder polish : silhouette distincte par type de factory
function drawFactoryPlaceholder(ctx, typeId, side, x, y, w, h) {
  const main = side === "player" ? COLORS.playerDark : COLORS.enemyDark;
  const accent = side === "player" ? COLORS.player : COLORS.enemy;
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (typeId === "light") {
    // Hangar bas, toit ondulé
    ctx.fillStyle = main;
    ctx.fillRect(x + 2, y + h * 0.25, w - 4, h * 0.75 - 2);
    ctx.fillStyle = accent;
    ctx.fillRect(x + 2, y + h * 0.25, w - 4, 3);
    // Petites cheminées
    ctx.fillStyle = main;
    ctx.fillRect(cx - 9, y + 4, 5, h * 0.25);
    ctx.fillRect(cx + 4, y + 4, 5, h * 0.25);
    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("L", cx, cy + 4);
  } else if (typeId === "heavy") {
    // Bastion : pyramide tronquée + créneaux
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + h - 2);
    ctx.lineTo(x + w - 4, y + h - 2);
    ctx.lineTo(x + w - 7, y + 6);
    ctx.lineTo(x + 7, y + 6);
    ctx.closePath();
    ctx.fill();
    // Créneaux
    ctx.fillStyle = accent;
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 8 + i * 8, y + 3, 4, 5);
    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("H", cx, cy + 5);
  } else if (typeId === "swarmer") {
    // Ruche hexagonale
    drawHexagon(ctx, cx, cy + 1, w * 0.42, main, accent, 2);
    // 4 petites alvéoles internes
    const r = 5;
    ctx.fillStyle = accent;
    [[-7, -5], [7, -5], [-7, 5], [7, 5]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    // Label
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("S", cx, cy);
  } else if (typeId === "sniper") {
    // Tour effilée + scope au sommet
    ctx.fillStyle = main;
    ctx.fillRect(cx - 6, y + 10, 12, h - 14);
    // Base élargie
    ctx.fillRect(x + 4, y + h - 8, w - 8, 6);
    // Scope (cercle)
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, y + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx, y + 8, 2, 0, Math.PI * 2);
    ctx.fill();
    // Réticule
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 7, y + 8); ctx.lineTo(cx + 7, y + 8);
    ctx.moveTo(cx, y + 1);     ctx.lineTo(cx, y + 15);
    ctx.stroke();
  }

  // Cadre d'accent partagé
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function drawHexagon(ctx, cx, cy, r, fill, stroke, lw) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw || 1;
    ctx.stroke();
  }
}

function drawProdBar(ctx, factory, type, x, y, w) {
  const interval = effectiveProdInterval(factory);
  const prodRatio = Math.min(1, factory.prodTimer / interval);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(x, y, w * prodRatio, 3);
}

function drawFactoryStars(ctx, x, y, w, totalLevels) {
  // 5 étoiles max visibles, remplies en fonction du total. 1 étoile pleine = 1 niveau.
  const N = Math.min(5, totalLevels);
  const starSize = 7;
  const gap = 1;
  const rowW = N * starSize + (N - 1) * gap;
  const startX = x + (w - rowW) / 2;
  for (let i = 0; i < N; i++) {
    drawStar(ctx, startX + i * (starSize + gap) + starSize / 2, y + starSize / 2, starSize / 2, "#fbbf24", "#92400e");
  }
  // Si total > 5, affiche le surplus sous forme " +X "
  if (totalLevels > 5) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 8px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`+${totalLevels - 5}`, startX + rowW + 2, y + starSize / 2);
  }
}

function drawStar(ctx, cx, cy, r, fill, stroke) {
  const spikes = 5;
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? r : inner;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

function drawBaseBuilding(ctx, side) {
  // En-tête de base compact, placé dans la zone libre entre le HUD et le haut de la grille
  const drawX = side === "player" ? 16 : CONFIG.W - CONFIG.BASE_W + 16;
  const drawY = CONFIG.HUD_H + 6;
  const drawW = CONFIG.BASE_W - 32;
  const drawH = 22;

  ctx.fillStyle = side === "player" ? COLORS.playerDark : COLORS.enemyDark;
  ctx.fillRect(drawX, drawY, drawW, drawH);
  ctx.strokeStyle = side === "player" ? COLORS.player : COLORS.enemy;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(drawX + 0.5, drawY + 0.5, drawW - 1, drawH - 1);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    side === "player" ? "BASE JOUEUR" : "BASE ENNEMIE",
    drawX + drawW / 2,
    drawY + drawH / 2
  );

  drawBaseHP(ctx, side);
}

function drawBaseHP(ctx, side) {
  const state = game[side];
  const ratio = state.baseHP / state.baseHPMax;
  const barW = CONFIG.BASE_W - 32;
  const barH = 14;
  const barX = side === "player" ? 16 : CONFIG.W - CONFIG.BASE_W + 16;
  const barY = CONFIG.HUD_H + 34;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(barX, barY, barW, barH);

  ctx.fillStyle =
    ratio > 0.5 ? COLORS.hpGood : ratio > 0.25 ? COLORS.hpWarn : COLORS.hpDanger;
  ctx.fillRect(barX + 1, barY + 1, (barW - 2) * ratio, barH - 2);

  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `${Math.ceil(state.baseHP)} / ${state.baseHPMax} ❤️`,
    barX + barW / 2,
    barY + barH / 2
  );
}

// -------------------------------------------------------------
// Rendu — unités
// -------------------------------------------------------------

function drawUnits(ctx) {
  for (const u of game.units) {
    const radius = u.stats.radius;
    const spriteName = `unit-${u.typeId}-${u.side}`;
    if (sprites[spriteName]) {
      const size = radius * 4;
      ctx.drawImage(sprites[spriteName], u.x - size / 2, u.y - size / 2, size, size);
    } else {
      drawUnitPlaceholder(ctx, u, radius);
    }

    // HP bar (uniquement si blessée)
    if (u.hp < u.maxHp) {
      const barW = radius * 2.4;
      const barH = 3;
      const barX = u.x - barW / 2;
      const barY = u.y - radius - 7;
      const ratio = u.hp / u.maxHp;

      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle =
        ratio > 0.5 ? COLORS.hpGood : ratio > 0.25 ? COLORS.hpWarn : COLORS.hpDanger;
      ctx.fillRect(barX, barY, barW * ratio, barH);
    }
  }
}

function drawUnitPlaceholder(ctx, u, radius) {
  const main = u.side === "player" ? COLORS.player : COLORS.enemy;
  const dark = u.side === "player" ? COLORS.playerDark : COLORS.enemyDark;
  const fwd = u.side === "player" ? 1 : -1;

  if (u.kind === "turret") {
    // Tourelle automatisée : socle + canon orienté vers la frontière + dôme
    ctx.fillStyle = dark;
    ctx.fillRect(u.x - 12, u.y - 4, 24, 18); // socle
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.arc(u.x, u.y - 4, 9, 0, Math.PI * 2); // dôme
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Canon
    ctx.fillStyle = dark;
    ctx.fillRect(u.x + (fwd > 0 ? 6 : -16), u.y - 6, 10, 4);
    // Témoin lumineux
    ctx.fillStyle = u.attackCooldown > 0 ? "#fbbf24" : "#22c55e";
    ctx.beginPath();
    ctx.arc(u.x, u.y - 8, 1.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (u.typeId === "swarmer") {
    // Petit triangle "drone" pointé vers l'avant
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.moveTo(u.x + fwd * radius * 1.2, u.y);
    ctx.lineTo(u.x - fwd * radius * 0.8, u.y - radius * 0.9);
    ctx.lineTo(u.x - fwd * radius * 0.8, u.y + radius * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Œil unique
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(u.x + fwd * radius * 0.3, u.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (u.typeId === "sniper") {
    // Capsule allongée + canon
    ctx.fillStyle = main;
    const rxA = radius * 1.4;
    const ryA = radius * 0.7;
    ctx.beginPath();
    ctx.ellipse(u.x, u.y, rxA, ryA, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Canon devant
    ctx.fillStyle = dark;
    ctx.fillRect(u.x + (fwd > 0 ? rxA - 1 : -rxA - radius * 0.6), u.y - 1.5, radius * 0.7, 3);
    return;
  }

  // Light / Heavy : cercle de base
  ctx.fillStyle = main;
  ctx.beginPath();
  ctx.arc(u.x, u.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (u.typeId === "heavy") {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(u.x, u.y, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAttackFx(ctx) {
  for (const fx of game.attackFx) {
    const alpha = 1 - fx.age / fx.ttl;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = fx.side === "player" ? "#bfdbfe" : "#fecaca";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = fx.side === "player" ? COLORS.player : COLORS.enemy;
    ctx.beginPath();
    ctx.moveTo(fx.x1, fx.y1);
    ctx.lineTo(fx.x2, fx.y2);
    ctx.stroke();
    ctx.restore();
  }
}

// -------------------------------------------------------------
// Rendu — panneau d'upgrade (apparaît au clic sur une factory)
// -------------------------------------------------------------

function getPanelGeometry() {
  const sel = game.ui.upgradePanel;
  if (!sel) return null;
  const slot = game[sel.side].slots[sel.slotIndex];
  if (!slot || !slot.factory) return null;

  const PW = 290;
  const PH = 432;

  // Panneau pinné en haut à droite de l'écran (coords ÉCRAN, indépendant de la caméra)
  const px = CONFIG.CANVAS_W - PW - 14;
  const py = CONFIG.HUD_H + 14;

  return { x: px, y: py, w: PW, h: PH, slot, side: sel.side };
}

function drawUpgradePanel(ctx) {
  const geo = getPanelGeometry();
  if (!geo) { game.ui.panelRects = null; return; }
  const { x, y, w, h, slot, side } = geo;
  const factory = slot.factory;
  const type = FACTORY_TYPES[factory.typeId];
  const state = game[side];

  // Fond + bordure
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(15, 20, 25, 0.97)";
  roundedRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = side === "player" ? COLORS.player : COLORS.enemy;
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, w, h, 10);
  ctx.stroke();

  // Header
  let cursorY = y + 14;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`🏭 Factory ${type.label}`, x + 14, cursorY);

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`Investi : ${factory.totalInvested}💰`, x + w - 38, cursorY + 2);

  cursorY += 22;

  // Toggle Attaque / Défense (côté joueur uniquement, sinon affiché en lecture seule)
  const modeRects = drawModeToggle(ctx, x + 12, cursorY, w - 24, factory, side);
  cursorY += 32;

  // Ligne séparatrice
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 12, cursorY);
  ctx.lineTo(x + w - 12, cursorY);
  ctx.stroke();

  cursorY += 6;

  // 6 lignes d'upgrade
  const rects = { upgrades: [], sell: null, close: null, mode: modeRects };
  const rowH = 48;
  const btnW = 70;

  for (const stat of UPGRADE_STATS) {
    const lvl = factory.upgrades[stat.id] || 0;
    const isMax = lvl >= MAX_UPGRADE_LEVEL;
    const cost = isMax ? 0 : upgradeCost(stat, lvl);
    const canAfford = !isMax && state.money >= cost;
    const isPlayer = side === "player";
    const enabled = isPlayer && !isMax && canAfford;

    const rowX = x + 12;
    const rowY = cursorY;
    const rowW = w - 24;

    // Label + emoji
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "bold 12px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`${stat.emoji} ${stat.label}`, rowX, rowY);

    // Valeur courante → suivante
    const previewLabel = formatStatPreview(factory, stat);
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillText(previewLabel, rowX, rowY + 16);

    // Niveau (pips)
    for (let i = 0; i < MAX_UPGRADE_LEVEL; i++) {
      const pipX = rowX + i * 9;
      const pipY = rowY + 32;
      ctx.fillStyle = i < lvl
        ? (isPlayer ? COLORS.player : COLORS.enemy)
        : "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.arc(pipX + 3, pipY + 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bouton "Upgrade" à droite (hover en coords ÉCRAN car panneau en coords écran)
    const btnRect = { x: x + w - 12 - btnW, y: rowY + 6, w: btnW, h: 32 };
    const hover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, btnRect);
    let btnFill;
    if (isMax) btnFill = "rgba(34, 197, 94, 0.25)";
    else if (!isPlayer) btnFill = COLORS.btnDisabled;
    else if (!canAfford) btnFill = COLORS.btnDisabled;
    else if (hover) btnFill = COLORS.btnHover;
    else btnFill = COLORS.btnIdle;

    ctx.fillStyle = btnFill;
    roundedRect(ctx, btnRect.x, btnRect.y, btnRect.w, btnRect.h, 6);
    ctx.fill();
    ctx.strokeStyle = enabled ? COLORS.player : "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isMax ? "#22c55e" : (enabled ? COLORS.hudText : COLORS.hudMuted);
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (isMax) {
      ctx.fillText("✓ MAX", btnRect.x + btnRect.w / 2, btnRect.y + btnRect.h / 2);
    } else {
      ctx.fillText(`+ ${cost}💰`, btnRect.x + btnRect.w / 2, btnRect.y + btnRect.h / 2);
    }

    if (enabled) rects.upgrades.push({ rect: btnRect, statId: stat.id });

    cursorY += rowH;
  }

  // Séparateur
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(x + 12, cursorY);
  ctx.lineTo(x + w - 12, cursorY);
  ctx.stroke();
  cursorY += 8;

  // Bouton Sell
  const refund = Math.floor(factory.totalInvested * SELL_RATIO);
  const sellRect = { x: x + 12, y: cursorY, w: w - 24, h: 34 };
  const sellEnabled = side === "player";
  const sellHover = sellEnabled && pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, sellRect);
  ctx.fillStyle = sellEnabled
    ? (sellHover ? "rgba(239, 68, 68, 0.35)" : "rgba(239, 68, 68, 0.22)")
    : COLORS.btnDisabled;
  roundedRect(ctx, sellRect.x, sellRect.y, sellRect.w, sellRect.h, 6);
  ctx.fill();
  ctx.strokeStyle = sellEnabled ? COLORS.enemy : "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = sellEnabled ? "#fee2e2" : COLORS.hudMuted;
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`❌ Vendre — +${refund}💰`, sellRect.x + sellRect.w / 2, sellRect.y + sellRect.h / 2);
  if (sellEnabled) rects.sell = sellRect;

  // Bouton close (×) en haut à droite
  const closeRect = { x: x + w - 26, y: y + 6, w: 20, h: 20 };
  const closeHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, closeRect);
  ctx.fillStyle = closeHover ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)";
  roundedRect(ctx, closeRect.x, closeRect.y, closeRect.w, closeRect.h, 4);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("×", closeRect.x + closeRect.w / 2, closeRect.y + closeRect.h / 2);
  rects.close = closeRect;

  // Note "lecture seule" pour les factories ennemies
  if (side === "enemy") {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "italic 10px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("(lecture seule — factory ennemie)", x + w / 2, y + h - 6);
  }

  game.ui.panelRects = rects;
}

function drawModeToggle(ctx, x, y, w, factory, side) {
  const btnW = (w - 8) / 2;
  const btnH = 26;
  const editable = side === "player";
  const rects = { attack: null, defense: null };

  for (const [i, mode] of ["attack", "defense"].entries()) {
    const bx = x + i * (btnW + 8);
    const isActive = factory.mode === mode;
    const isHover = editable && pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, { x: bx, y, w: btnW, h: btnH });
    let fill;
    if (isActive) fill = mode === "attack" ? "rgba(239, 68, 68, 0.35)" : "rgba(34, 197, 94, 0.35)";
    else if (!editable) fill = COLORS.btnDisabled;
    else if (isHover) fill = COLORS.btnHover;
    else fill = COLORS.btnIdle;

    ctx.fillStyle = fill;
    roundedRect(ctx, bx, y, btnW, btnH, 6);
    ctx.fill();
    ctx.strokeStyle = isActive ? (mode === "attack" ? COLORS.enemy : COLORS.hpGood) : "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = isActive ? "#fff" : (editable ? COLORS.hudText : COLORS.hudMuted);
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      mode === "attack" ? "⚔️ Attaque" : "🛡️ Défense",
      bx + btnW / 2,
      y + btnH / 2
    );

    if (editable) rects[mode] = { x: bx, y, w: btnW, h: btnH };
  }
  return rects;
}

function formatStatPreview(factory, stat) {
  const type = FACTORY_TYPES[factory.typeId];
  const ut = UNIT_TYPES[type.unitType];
  const u = factory.upgrades;
  const lvl = u[stat.id] || 0;
  const lvlNext = Math.min(lvl + 1, MAX_UPGRADE_LEVEL);
  const fmt = (v) => Number(v).toFixed(stat.id === "creationRate" || stat.id === "shootRate" ? 2 : 0);

  let cur, next;
  switch (stat.id) {
    case "creationRate":
      cur = type.prodInterval / statMultiplier(lvl, 0.20);
      next = type.prodInterval / statMultiplier(lvlNext, 0.20);
      return `${fmt(cur)}s → ${fmt(next)}s / unité`;
    case "health":
      cur = ut.hp * statMultiplier(lvl, 0.25);
      next = ut.hp * statMultiplier(lvlNext, 0.25);
      return `${fmt(cur)} → ${fmt(next)} PV / unité`;
    case "shootRate":
      cur = ut.attackInterval / statMultiplier(lvl, 0.18);
      next = ut.attackInterval / statMultiplier(lvlNext, 0.18);
      return `${fmt(cur)}s → ${fmt(next)}s / tir`;
    case "range":
      cur = ut.range * statMultiplier(lvl, 0.12);
      next = ut.range * statMultiplier(lvlNext, 0.12);
      return `${fmt(cur)} → ${fmt(next)} px`;
    case "speed":
      cur = ut.speed * statMultiplier(lvl, 0.15);
      next = ut.speed * statMultiplier(lvlNext, 0.15);
      return `${fmt(cur)} → ${fmt(next)} px/s`;
    case "power":
      cur = ut.damage * statMultiplier(lvl, 0.22);
      next = ut.damage * statMultiplier(lvlNext, 0.22);
      return `${fmt(cur)} → ${fmt(next)} dégâts`;
    default:
      return "";
  }
}

function drawWallSlots(ctx, side) {
  const state = game[side];
  if (!state || !state.wallSlots) return;
  const isPlayer = side === "player";
  const buildMode = game.ui.selectedBuildType === "turret" && isPlayer;

  for (let i = 0; i < state.wallSlots.length; i++) {
    const slot = state.wallSlots[i];
    if (slot.turret) {
      // Socle du turret (le turret lui-même rendu via drawUnits)
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(slot.x, slot.y + slot.h * 0.2, slot.w, slot.h * 0.6);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(slot.x + 0.5, slot.y + slot.h * 0.2 + 0.5, slot.w - 1, slot.h * 0.6 - 1);
      continue;
    }
    if (!buildMode) continue;

    const hover = game.ui.hoverWallSlot;
    const isHover = hover && hover.side === "player" && hover.idx === i;
    const canAfford = game.player.money >= TURRET_TYPE.cost;

    // Rect de fond (cyan ou rouge selon affordabilité)
    if (isHover) {
      ctx.fillStyle = canAfford ? "rgba(34, 211, 238, 0.65)" : "rgba(239, 68, 68, 0.50)";
    } else {
      ctx.fillStyle = canAfford ? "rgba(34, 211, 238, 0.30)" : "rgba(239, 68, 68, 0.18)";
    }
    ctx.fillRect(slot.x, slot.y, slot.w, slot.h);

    // Bordure
    ctx.strokeStyle = isHover ? "#fff" : (canAfford ? "rgba(34, 211, 238, 0.9)" : "rgba(239, 68, 68, 0.6)");
    ctx.lineWidth = isHover ? 2 : 1.5;
    ctx.strokeRect(slot.x + 0.5, slot.y + 0.5, slot.w - 1, slot.h - 1);

    // Petit symbole + au centre (géométrique, pas d'emoji pour éviter les soucis de fonts)
    ctx.strokeStyle = canAfford ? "#fff" : "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2;
    const cx = slot.x + slot.w / 2;
    const cy = slot.y + slot.h / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 6);
    ctx.stroke();
  }
}

function drawLightning(ctx) {
  if (!game.lightning) return;
  const fx = game.lightning;
  const t = fx.age / fx.ttl;
  const alpha = 1 - Math.pow(t, 0.6);

  // Glow large autour de la bande létale
  ctx.save();
  ctx.globalAlpha = alpha * 0.5;
  ctx.fillStyle = "rgba(165, 220, 255, 0.6)";
  ctx.fillRect(fx.x - LIGHTNING_KILL_HALF_WIDTH, fx.y1, LIGHTNING_KILL_HALF_WIDTH * 2, fx.y2 - fx.y1);
  ctx.restore();

  // Plusieurs lignes de zigzag superposées
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  for (let pass = 0; pass < 3; pass++) {
    ctx.beginPath();
    for (let i = 0; i < fx.segments.length; i++) {
      const s = fx.segments[i];
      const jitter = pass === 0 ? 0 : (Math.random() - 0.5) * 12 * (pass);
      if (i === 0) ctx.moveTo(s.x + jitter, s.y);
      else ctx.lineTo(s.x + jitter, s.y);
    }
    if (pass === 0) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 6;
      ctx.shadowColor = "#a5dcff";
      ctx.shadowBlur = 30;
    } else if (pass === 1) {
      ctx.strokeStyle = "#bee5ff";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = "rgba(165, 220, 255, 0.6)";
      ctx.lineWidth = 1.5;
    }
    ctx.stroke();
  }
  ctx.restore();

  // Petits éclats horizontaux
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = "rgba(220, 240, 255, 0.85)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const y = fx.y1 + Math.random() * (fx.y2 - fx.y1);
    const x = fx.x + (Math.random() - 0.5) * 30;
    const len = 30 + Math.random() * 40;
    ctx.beginPath();
    ctx.moveTo(x - len / 2, y);
    ctx.lineTo(x + len / 2, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawExplosions(ctx) {
  for (const fx of game.explosions) {
    const t = fx.age / fx.ttl; // 0 → 1
    const radius = 8 + t * 24;
    const alpha = 1 - t;
    ctx.save();
    ctx.globalAlpha = alpha;

    if (sprites["effect-explosion"]) {
      const size = radius * 2.4;
      ctx.drawImage(sprites["effect-explosion"], fx.x - size / 2, fx.y - size / 2, size, size);
    } else {
      const grad = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, radius);
      grad.addColorStop(0, "#fff7d6");
      grad.addColorStop(0.5, "#fbbf24");
      grad.addColorStop(1, "rgba(239, 68, 68, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// -------------------------------------------------------------
// Rapport de partie (game over overlay)
// -------------------------------------------------------------
function drawGameOverReport(ctx) {
  const PW = 620;
  const PH = 440;
  const px = (CONFIG.CANVAS_W - PW) / 2;
  const py = 160;

  // Fond du panneau
  ctx.fillStyle = "rgba(15, 20, 25, 0.92)";
  roundedRect(ctx, px, py, PW, PH, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 16px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("📊 RAPPORT DE PARTIE", px + PW / 2, py + 12);

  // Colonnes : Label · Joueur · Ennemi
  const labelX = px + 28;
  const playerX = px + PW * 0.62;
  const enemyX = px + PW - 28;

  // Headers de colonne
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.fillText("Stat", labelX, py + 50);
  ctx.textAlign = "right";
  ctx.fillStyle = COLORS.player;
  ctx.fillText("JOUEUR", playerX, py + 50);
  ctx.fillStyle = COLORS.enemy;
  ctx.fillText("ENNEMI", enemyX, py + 50);

  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.moveTo(px + 20, py + 70);
  ctx.lineTo(px + PW - 20, py + 70);
  ctx.stroke();

  const ps = game.stats.player;
  const es = game.stats.enemy;
  const min = Math.floor(game.time / 60);
  const sec = Math.floor(game.time % 60).toString().padStart(2, "0");

  const rows = [
    { label: "⏱️ Durée",                value: `${min}:${sec}`,                  noBoth: true },
    { label: "💰 Argent dépensé",        p: ps.moneySpent,                        e: es.moneySpent },
    { label: "🏭 Factories construites", p: ps.factoriesBuilt,                    e: es.factoriesBuilt },
    { label: "🗼 Turrets posées",        p: ps.turretsBuilt,                      e: es.turretsBuilt },
    { label: "⭐ Upgrades achetés",       p: ps.upgradesBought,                    e: es.upgradesBought },
    { label: "🤖 Unités produites",      p: ps.unitsSpawned,                      e: es.unitsSpawned },
    { label: "⚔️ Kills",                p: ps.unitsKilled,                       e: es.unitsKilled },
    { label: "💀 Unités perdues",        p: ps.unitsLost,                         e: es.unitsLost },
    { label: "💥 Dégâts infligés",       p: Math.round(ps.damageDealt),           e: Math.round(es.damageDealt) },
    { label: "🛡️ Dégâts subis",         p: Math.round(ps.damageTaken),           e: Math.round(es.damageTaken) },
    { label: "🏰 Hits frontière",        p: ps.borderHits,                        e: es.borderHits },
    { label: "⚡ Éclairs utilisés",       p: ps.lightningsUsed,                    e: es.lightningsUsed },
  ];

  let y = py + 84;
  const rowH = 22;
  ctx.font = "13px -apple-system, sans-serif";
  for (const r of rows) {
    ctx.fillStyle = COLORS.hudText;
    ctx.textAlign = "left";
    ctx.fillText(r.label, labelX, y);

    if (r.noBoth) {
      ctx.fillStyle = COLORS.hudMuted;
      ctx.textAlign = "right";
      ctx.fillText(String(r.value), enemyX, y);
    } else {
      // Met en évidence le meilleur (vert) / perdant (gris) sur chaque ligne
      const better = (r.label.includes("perdues") || r.label.includes("subis"))
        ? (r.p < r.e ? "player" : (r.p > r.e ? "enemy" : "none"))
        : (r.p > r.e ? "player" : (r.p < r.e ? "enemy" : "none"));

      ctx.textAlign = "right";
      ctx.fillStyle = better === "player" ? COLORS.hpGood : COLORS.player;
      ctx.fillText(String(r.p), playerX, y);
      ctx.fillStyle = better === "enemy" ? COLORS.hpGood : COLORS.enemy;
      ctx.fillText(String(r.e), enemyX, y);
    }
    y += rowH;
  }

  // Ratio kills (efficacité)
  const playerEff = ps.unitsSpawned ? (ps.unitsKilled / ps.unitsSpawned).toFixed(2) : "0.00";
  const enemyEff = es.unitsSpawned ? (es.unitsKilled / es.unitsSpawned).toFixed(2) : "0.00";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "italic 11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Ratio kills / units : Joueur ${playerEff} · Ennemi ${enemyEff}`, px + PW / 2, py + PH - 14);
}

// -------------------------------------------------------------
// Menu d'accueil
// -------------------------------------------------------------
function drawMenu(ctx) {
  // Fond dégradé
  const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.H);
  grad.addColorStop(0, "#0a0e1a");
  grad.addColorStop(1, "#1a2030");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);

  // Grille de fond (style sci-fi subtil)
  ctx.strokeStyle = "rgba(59, 130, 246, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < CONFIG.CANVAS_W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CONFIG.H); ctx.stroke();
  }
  for (let y = 0; y < CONFIG.H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CONFIG.CANVAS_W, y); ctx.stroke();
  }

  const cx = CONFIG.CANVAS_W / 2;

  // Titre
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 64px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = COLORS.player;
  ctx.shadowBlur = 24;
  ctx.fillText("🤖 ÉMERGENCE", cx, 140);
  ctx.shadowBlur = 0;

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "16px -apple-system, sans-serif";
  ctx.fillText("Prototype V0 — lane-based auto-battler", cx, 184);

  // ── DIFFICULTÉ ──
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DIFFICULTÉ", cx, 250);

  const diffBtnW = 180, diffBtnH = 80, diffGap = 14;
  const diffTotalW = 3 * diffBtnW + 2 * diffGap;
  const diffStartX = cx - diffTotalW / 2;
  const diffY = 270;
  const diffOrder = ["easy", "normal", "hard"];
  const diffRects = [];

  for (const [i, key] of diffOrder.entries()) {
    const preset = DIFFICULTY_PRESETS[key];
    const rect = { x: diffStartX + i * (diffBtnW + diffGap), y: diffY, w: diffBtnW, h: diffBtnH };
    diffRects.push({ rect, key });
    const isActive = game.difficulty === key;
    const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);

    ctx.fillStyle = isActive ? "rgba(59, 130, 246, 0.32)" : (isHover ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)");
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.fill();
    ctx.strokeStyle = isActive ? COLORS.player : "rgba(255,255,255,0.15)";
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px -apple-system, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(`${preset.emoji} ${preset.label}`, rect.x + rect.w / 2, rect.y + 28);

    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "11px -apple-system, sans-serif";
    wrapText(ctx, preset.desc, rect.x + rect.w / 2, rect.y + 54, rect.w - 16, 13);
  }

  // ── BOUTON JOUER ──
  const playW = 280, playH = 64;
  const playRect = { x: cx - playW / 2, y: 400, w: playW, h: playH };
  const playHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, playRect);

  ctx.fillStyle = playHover ? COLORS.player : COLORS.playerDark;
  roundedRect(ctx, playRect.x, playRect.y, playRect.w, playRect.h, 12);
  ctx.fill();
  ctx.strokeStyle = COLORS.player;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (playHover) {
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = "#fff";
  ctx.font = "bold 26px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("▶  JOUER", playRect.x + playRect.w / 2, playRect.y + playRect.h / 2);

  // ── SETTINGS AUDIO ──
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("PARAMÈTRES", cx, 510);

  const togW = 180, togH = 44, togGap = 16;
  const totalTogW = 2 * togW + togGap;
  const togStartX = cx - totalTogW / 2;
  const togY = 525;
  const musicRect = { x: togStartX, y: togY, w: togW, h: togH };
  const sfxRect = { x: togStartX + togW + togGap, y: togY, w: togW, h: togH };
  drawToggleButton(ctx, musicRect, "🎵 Musique", audio.musicEnabled);
  drawToggleButton(ctx, sfxRect, "🔊 Effets", audio.sfxEnabled);

  // ── CONTRÔLES ──
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Souris bord G/D pour scroller — ← → / A D — H / E pour recadrer — Échap pour annuler — 1-4 sélection factory", cx, 620);

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.fillText("github.com/GuestElite/robotic-emergence", cx, CONFIG.H - 16);

  game.ui.menuRects = { diff: diffRects, play: playRect, music: musicRect, sfx: sfxRect };
}

function drawToggleButton(ctx, rect, label, on) {
  const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
  ctx.fillStyle = on
    ? (isHover ? "rgba(34, 197, 94, 0.45)" : "rgba(34, 197, 94, 0.30)")
    : (isHover ? "rgba(239, 68, 68, 0.35)" : "rgba(239, 68, 68, 0.22)");
  roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.strokeStyle = on ? COLORS.hpGood : COLORS.enemy;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + 14, rect.y + rect.h / 2);

  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = on ? "#bbf7d0" : "#fecaca";
  ctx.fillText(on ? "ON" : "OFF", rect.x + rect.w - 14, rect.y + rect.h / 2);
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawGameOverOverlay(ctx) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);

  const win = game.gameOver.winner === "player";
  const title = win ? "VICTOIRE !" : "DÉFAITE";
  const subtitle = win
    ? "La base ennemie est tombée."
    : "Ta base a été détruite.";

  ctx.fillStyle = win ? COLORS.hpGood : COLORS.enemy;
  ctx.font = "bold 52px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, CONFIG.CANVAS_W / 2, 90);

  ctx.fillStyle = COLORS.hudText;
  ctx.font = "16px -apple-system, sans-serif";
  ctx.fillText(subtitle, CONFIG.CANVAS_W / 2, 130);

  // Rapport de partie
  drawGameOverReport(ctx);

  // Bouton "Rejouer"
  const btnW = 180;
  const btnH = 52;
  const gap = 16;
  const totalW = btnW * 2 + gap;
  const startX = (CONFIG.CANVAS_W - totalW) / 2;
  const btnY = CONFIG.H - 90;
  game.ui.replayBtn = { x: startX, y: btnY, w: btnW, h: btnH };
  game.ui.gameOverMenuBtn = { x: startX + btnW + gap, y: btnY, w: btnW, h: btnH };

  const replayHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, game.ui.replayBtn);
  ctx.fillStyle = replayHover ? COLORS.player : COLORS.playerDark;
  roundedRect(ctx, game.ui.replayBtn.x, game.ui.replayBtn.y, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = COLORS.player;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px -apple-system, sans-serif";
  ctx.fillText("↻ Rejouer", game.ui.replayBtn.x + btnW / 2, btnY + btnH / 2);

  const menuHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, game.ui.gameOverMenuBtn);
  ctx.fillStyle = menuHover ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)";
  roundedRect(ctx, game.ui.gameOverMenuBtn.x, game.ui.gameOverMenuBtn.y, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px -apple-system, sans-serif";
  ctx.fillText("☰ Menu", game.ui.gameOverMenuBtn.x + btnW / 2, btnY + btnH / 2);
}

// -------------------------------------------------------------
// Rendu — HUD (haut) + boutons build
// -------------------------------------------------------------

// Indicateurs visuels quand la caméra peut scroller
function drawScrollHints(ctx) {
  if (game.gameOver) return;
  const margin = CONFIG.CAMERA_SCROLL_MARGIN;
  const canScrollLeft = game.camera.x > 0;
  const canScrollRight = game.camera.x < (CONFIG.W - CONFIG.CANVAS_W);
  const sx = game.ui.mouseScreen.x;
  const inLeft = game.ui.mouseInside && sx < margin;
  const inRight = game.ui.mouseInside && sx > CONFIG.CANVAS_W - margin;

  if (canScrollLeft) {
    const alpha = inLeft ? 0.9 : 0.35;
    drawScrollArrow(ctx, 24, CONFIG.HUD_H + (CONFIG.H - CONFIG.HUD_H) / 2, "left", alpha);
  }
  if (canScrollRight) {
    const alpha = inRight ? 0.9 : 0.35;
    drawScrollArrow(ctx, CONFIG.CANVAS_W - 24, CONFIG.HUD_H + (CONFIG.H - CONFIG.HUD_H) / 2, "right", alpha);
  }
}

function drawScrollArrow(ctx, cx, cy, dir, alpha) {
  const s = 18;
  const sign = dir === "left" ? -1 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + sign * s, cy);
  ctx.lineTo(cx - sign * (s / 2), cy - s);
  ctx.lineTo(cx - sign * (s / 2), cy + s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Mini-carte (overview du monde) en bas-centre du HUD ou côté gauche
function drawMinimap(ctx) {
  if (game.gameOver) return;
  const mmW = 200;
  const mmH = 30;
  const mmX = (CONFIG.CANVAS_W - mmW) / 2;
  const mmY = CONFIG.HUD_H + 4;

  // Fond
  ctx.fillStyle = "rgba(15, 20, 25, 0.55)";
  roundedRect(ctx, mmX, mmY, mmW, mmH, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const worldToMm = mmW / CONFIG.W;

  // Bases miniatures
  const baseMmW = CONFIG.BASE_W * worldToMm;
  ctx.fillStyle = COLORS.playerSoft;
  ctx.fillRect(mmX, mmY, baseMmW, mmH);
  ctx.fillStyle = COLORS.enemySoft;
  ctx.fillRect(mmX + mmW - baseMmW, mmY, baseMmW, mmH);

  // Unités (points colorés)
  for (const u of game.units) {
    const px = mmX + u.x * worldToMm;
    const py = mmY + 4 + (u.y - CONFIG.HUD_H) * ((mmH - 8) / (CONFIG.H - CONFIG.HUD_H));
    ctx.fillStyle = u.side === "player" ? COLORS.player : COLORS.enemy;
    ctx.fillRect(px - 1, py - 1, 2, 2);
  }

  // Cadre du viewport (zone visible)
  const vpX = mmX + game.camera.x * worldToMm;
  const vpW = CONFIG.CANVAS_W * worldToMm;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(vpX, mmY + 1, vpW, mmH - 2);
}

function drawHUD(ctx) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.HUD_H);

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, CONFIG.HUD_H);
  ctx.lineTo(CONFIG.CANVAS_W, CONFIG.HUD_H);
  ctx.stroke();

  // Argent joueur (gauche)
  ctx.fillStyle = COLORS.player;
  ctx.font = "bold 20px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`💰 ${game.player.money}`, 20, CONFIG.HUD_H / 2);

  // Boutons "Construire" (mode build) + bouton spécial éclair
  drawBuildButtons(ctx);
  drawLightningButton(ctx);

  // Argent ennemi (droite)
  ctx.fillStyle = COLORS.enemy;
  ctx.textAlign = "right";
  ctx.fillText(`${game.enemy.money} 💰`, CONFIG.CANVAS_W - 20, CONFIG.HUD_H / 2);

  // Timer (sous le centre du HUD)
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.textAlign = "center";
  const min = Math.floor(game.time / 60);
  const sec = Math.floor(game.time % 60).toString().padStart(2, "0");
  ctx.fillText(`${min}:${sec}`, CONFIG.CANVAS_W - 90, CONFIG.HUD_H / 2);

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.fillText("ÉMERGENCE", CONFIG.CANVAS_W - 90, CONFIG.HUD_H / 2 + 14);

  // Indicateur de mode build actif (instruction)
  if (game.ui.selectedBuildType) {
    const t = FACTORY_TYPES[game.ui.selectedBuildType];
    ctx.fillStyle = COLORS.player;
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      `→ Clique un emplacement vide pour poser une factory ${t.label.toLowerCase()} (Échap pour annuler)`,
      150,
      CONFIG.HUD_H - 8
    );
  }
}

function drawBuildButtons(ctx) {
  for (const btn of game.ui.buttons) {
    const isTurret = btn.type === "turret";
    const cost = isTurret ? TURRET_TYPE.cost : FACTORY_TYPES[btn.type].cost;
    const label = isTurret ? "Turret" : FACTORY_TYPES[btn.type].label;
    const icon = isTurret ? "🗼" : "🏭";

    const isActive = game.ui.selectedBuildType === btn.type;
    const canAfford = game.player.money >= cost;
    const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, btn);

    let fill;
    if (!canAfford) fill = COLORS.btnDisabled;
    else if (isActive) fill = COLORS.btnActive;
    else if (isHover) fill = COLORS.btnHover;
    else fill = COLORS.btnIdle;

    ctx.fillStyle = fill;
    roundedRect(ctx, btn.x, btn.y, btn.w, btn.h, 6);
    ctx.fill();

    ctx.strokeStyle = isActive ? COLORS.player : "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = canAfford ? COLORS.hudText : COLORS.hudMuted;
    ctx.font = "bold 12px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${icon} ${label}`, btn.x + btn.w / 2 - 16, btn.y + btn.h / 2);

    ctx.fillStyle = canAfford ? "#fbbf24" : COLORS.hudMuted;
    ctx.font = "bold 12px -apple-system, sans-serif";
    ctx.fillText(`${cost}💰`, btn.x + btn.w / 2 + 34, btn.y + btn.h / 2);
  }
}

function drawLightningButton(ctx) {
  const btnW = 110;
  const btnH = 36;
  const btnX = 130 + 5 * (116 + 4) + 12;
  const btnY = 12;
  game.ui.lightningBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

  const ready = game.lightningCooldown <= 0;
  const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, game.ui.lightningBtn);

  ctx.save();
  if (ready) {
    ctx.fillStyle = isHover ? "rgba(251, 191, 36, 0.55)" : "rgba(251, 191, 36, 0.35)";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = isHover ? 16 : 8;
  } else {
    ctx.fillStyle = "rgba(100,116,139,0.22)";
  }
  roundedRect(ctx, btnX, btnY, btnW, btnH, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = ready ? "#fbbf24" : "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Texte
  ctx.fillStyle = ready ? "#fff" : COLORS.hudMuted;
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (ready) {
    ctx.fillText("⚡ Éclair", btnX + btnW / 2, btnY + btnH / 2);
  } else {
    ctx.fillText(`⚡ ${Math.ceil(game.lightningCooldown)}s`, btnX + btnW / 2, btnY + btnH / 2);
  }

  // Barre de progression du cooldown (en bas du bouton)
  if (!ready) {
    const ratio = 1 - game.lightningCooldown / LIGHTNING_COOLDOWN_SEC;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(btnX + 2, btnY + btnH - 4, btnW - 4, 2);
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(btnX + 2, btnY + btnH - 4, (btnW - 4) * ratio, 2);
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// -------------------------------------------------------------
// Entrées utilisateur (souris + clavier)
// -------------------------------------------------------------

function canvasCoordsFromEvent(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY,
  };
}

function findSlotAt(side, x, y) {
  const state = game[side];
  for (let i = 0; i < state.slots.length; i++) {
    const s = state.slots[i];
    if (x >= s.x && x <= s.x + s.size && y >= s.y && y <= s.y + s.size) {
      return i;
    }
  }
  return -1;
}

function setupInput(canvas) {
  canvas.addEventListener("mouseenter", () => { game.ui.mouseInside = true; });
  canvas.addEventListener("mouseleave", () => {
    game.ui.mouseInside = false;
    game.ui.hoverSlot = null;
  });

  canvas.addEventListener("mousemove", (evt) => {
    const { x, y } = canvasCoordsFromEvent(canvas, evt);
    game.ui.mouseScreen.x = x;
    game.ui.mouseScreen.y = y;
    game.ui.mouseInside = true;

    // Coordonnées monde (pour hover slots/factories)
    const wx = x + game.camera.x;
    const wy = y;
    game.ui.mouse.x = wx;
    game.ui.mouse.y = wy;

    if (game.gameOver) {
      game.ui.hoverSlot = null;
      return;
    }

    // Hover slots sur les 2 sides (le panneau lecture seule fonctionne aussi pour l'ennemi)
    let idx = findSlotAt("player", wx, wy);
    if (idx >= 0) {
      game.ui.hoverSlot = { side: "player", slotIndex: idx };
    } else {
      idx = findSlotAt("enemy", wx, wy);
      game.ui.hoverSlot = idx >= 0 ? { side: "enemy", slotIndex: idx } : null;
    }

    // Hover wall slot (côté joueur uniquement, pour placement turret)
    game.ui.hoverWallSlot = null;
    if (game.ui.selectedBuildType === "turret") {
      const wallSlots = game.player.wallSlots || [];
      for (let i = 0; i < wallSlots.length; i++) {
        const s = wallSlots[i];
        if (wx >= s.x && wx <= s.x + s.w && wy >= s.y && wy <= s.y + s.h) {
          game.ui.hoverWallSlot = { side: "player", idx: i };
          break;
        }
      }
    }
  });

  canvas.addEventListener("click", (evt) => {
    const screen = canvasCoordsFromEvent(canvas, evt);
    const sx = screen.x, sy = screen.y;
    const wx = sx + game.camera.x, wy = sy;

    // Cas menu : routes vers Play / difficulté / toggles audio
    if (game.screen === "menu") {
      const mr = game.ui.menuRects;
      if (!mr) return;
      audio.ensureCtx(); // débloque l'AudioContext sur le premier clic utilisateur
      // Difficulté
      for (const d of mr.diff) {
        if (pointInRect(sx, sy, d.rect)) {
          game.difficulty = d.key;
          game.preset = DIFFICULTY_PRESETS[d.key];
          audio.playSFX("click");
          saveSettings();
          return;
        }
      }
      // Toggle musique
      if (pointInRect(sx, sy, mr.music)) {
        audio.setMusicEnabled(!audio.musicEnabled);
        audio.playSFX("click");
        saveSettings();
        return;
      }
      // Toggle SFX
      if (pointInRect(sx, sy, mr.sfx)) {
        audio.setSfxEnabled(!audio.sfxEnabled);
        audio.playSFX("click"); // joue avant le toggle si on désactive, sinon pas grave
        saveSettings();
        return;
      }
      // Play
      if (pointInRect(sx, sy, mr.play)) {
        audio.playSFX("click");
        startGame(game.difficulty);
        return;
      }
      return;
    }

    // Cas game over : Rejouer ou retour Menu
    if (game.gameOver) {
      if (game.ui.replayBtn && pointInRect(sx, sy, game.ui.replayBtn)) {
        startGame(game.difficulty);
        return;
      }
      if (game.ui.gameOverMenuBtn && pointInRect(sx, sy, game.ui.gameOverMenuBtn)) {
        goToMenu();
        return;
      }
      return;
    }

    // 0) Panneau d'upgrade ouvert : intercepter les clics dessus (coords ÉCRAN)
    if (game.ui.upgradePanel && game.ui.panelRects) {
      const pr = game.ui.panelRects;
      if (pr.close && pointInRect(sx, sy, pr.close)) {
        game.ui.upgradePanel = null;
        return;
      }
      const sel = game.ui.upgradePanel;
      if (sel.side === "player" && pr.sell && pointInRect(sx, sy, pr.sell)) {
        const refund = sellFactory("player", sel.slotIndex);
        if (refund !== false) {
          game.ui.upgradePanel = null;
        }
        return;
      }
      if (sel.side === "player" && pr.upgrades) {
        for (const u of pr.upgrades) {
          if (pointInRect(sx, sy, u.rect)) {
            tryUpgradeFactory("player", sel.slotIndex, u.statId);
            return;
          }
        }
      }
      if (sel.side === "player" && pr.mode) {
        if (pr.mode.attack && pointInRect(sx, sy, pr.mode.attack)) {
          const slot = game.player.slots[sel.slotIndex];
          if (slot?.factory) slot.factory.mode = "attack";
          return;
        }
        if (pr.mode.defense && pointInRect(sx, sy, pr.mode.defense)) {
          const slot = game.player.slots[sel.slotIndex];
          if (slot?.factory) slot.factory.mode = "defense";
          return;
        }
      }
      // Click hors du panneau (en coords écran) → ferme le panneau, on continue à traiter
      const geo = getPanelGeometry();
      if (geo && !pointInRect(sx, sy, geo)) {
        game.ui.upgradePanel = null;
      } else if (geo) {
        return; // clic dans le panneau déjà géré ci-dessus
      }
    }

    // 1) Bouton Éclair (coords ÉCRAN) ?
    if (game.ui.lightningBtn && pointInRect(sx, sy, game.ui.lightningBtn)) {
      triggerLightning();
      return;
    }

    // 2) Boutons de build (coords ÉCRAN) — toggle libre, l'argent est vérifié au placement
    for (const btn of game.ui.buttons) {
      if (pointInRect(sx, sy, btn)) {
        game.ui.selectedBuildType =
          game.ui.selectedBuildType === btn.type ? null : btn.type;
        audio.playSFX("click");
        return;
      }
    }

    // 3) Placement turret sur wall slot (mode build turret actif) ?
    if (game.ui.selectedBuildType === "turret") {
      const wallSlots = game.player.wallSlots || [];
      for (let i = 0; i < wallSlots.length; i++) {
        const s = wallSlots[i];
        if (wx >= s.x && wx <= s.x + s.w && wy >= s.y && wy <= s.y + s.h) {
          if (tryPlaceTurret("player", i)) {
            if (game.player.money < TURRET_TYPE.cost) game.ui.selectedBuildType = null;
          }
          return;
        }
      }
    }

    // 4) Click sur un slot joueur (coords MONDE) ?
    const playerSlotIdx = findSlotAt("player", wx, wy);
    if (playerSlotIdx >= 0) {
      const slot = game.player.slots[playerSlotIdx];
      // 2a) Mode build actif + slot constructible vide → placement
      if (game.ui.selectedBuildType && !slot.factory && !slot.isPath) {
        const placed = tryPlaceFactory("player", playerSlotIdx, game.ui.selectedBuildType);
        if (placed) {
          const type = FACTORY_TYPES[game.ui.selectedBuildType];
          if (game.player.money < type.cost) game.ui.selectedBuildType = null;
        }
        return;
      }
      // 2b) Factory existante → ouvrir panneau d'upgrade
      if (slot.factory) {
        game.ui.upgradePanel = { side: "player", slotIndex: playerSlotIdx };
        game.ui.selectedBuildType = null; // évite de placer accidentellement
        return;
      }
    }

    // 3) Click sur une factory ennemie ? (lecture seule, coords MONDE)
    const enemySlotIdx = findSlotAt("enemy", wx, wy);
    if (enemySlotIdx >= 0) {
      const slot = game.enemy.slots[enemySlotIdx];
      if (slot.factory) {
        game.ui.upgradePanel = { side: "enemy", slotIndex: enemySlotIdx };
        return;
      }
    }
  });

  window.addEventListener("keydown", (evt) => {
    if (game.screen === "menu") {
      if (evt.key === "Enter" || evt.key === " ") {
        audio.ensureCtx();
        startGame(game.difficulty);
      }
      return;
    }
    if (game.gameOver) {
      if (evt.key === "Enter" || evt.key === " ") startGame(game.difficulty);
      if (evt.key === "Escape" || evt.key === "m") goToMenu();
      return;
    }
    if (evt.key === "Escape") {
      game.ui.selectedBuildType = null;
      game.ui.upgradePanel = null;
    }
    const keyMap = { "1": "light", "2": "heavy", "3": "swarmer", "4": "sniper", "5": "turret" };
    if (keyMap[evt.key]) {
      const t = keyMap[evt.key];
      game.ui.selectedBuildType = game.ui.selectedBuildType === t ? null : t;
    }
    // Éclair
    if (evt.key === "l" || evt.key === "L") {
      triggerLightning();
    }
    // Scroll au clavier (flèches ← → ou A/D)
    const SCROLL_STEP = 120;
    const maxScroll = Math.max(0, CONFIG.W - CONFIG.CANVAS_W);
    if (evt.key === "ArrowLeft" || evt.key === "a" || evt.key === "A") {
      game.camera.x = Math.max(0, game.camera.x - SCROLL_STEP);
    }
    if (evt.key === "ArrowRight" || evt.key === "d" || evt.key === "D") {
      game.camera.x = Math.min(maxScroll, game.camera.x + SCROLL_STEP);
    }
    // Home → recadre sur la base joueur
    if (evt.key === "Home" || evt.key === "h" || evt.key === "H") {
      game.camera.x = 0;
    }
    // End → recadre sur la base ennemie
    if (evt.key === "End" || evt.key === "e" || evt.key === "E") {
      game.camera.x = maxScroll;
    }
  });
}

function resetGame() {
  game.time = 0;
  game.lastTimestamp = 0;
  game.player = makeSideState("player");
  game.enemy = makeSideState("enemy");
  game.units = [];
  game.attackFx = [];
  game.explosions = [];
  game.lightning = null;
  game.lightningCooldown = 0;
  game.stats = { player: makeStats(), enemy: makeStats() };
  game.gameOver = null;
  game.camera.x = 0;
  game.ui.selectedBuildType = null;
  game.ui.hoverSlot = null;
  game.ui.hoverWallSlot = null;
  game.ui.replayBtn = null;
  game.ui.upgradePanel = null;
  game.ui.panelRects = null;
  AI_CONFIG.buildInterval = game.preset.aiBuildInterval;
  AI_CONFIG.typeWeights = { ...game.preset.aiTypeWeights };
  buildSlots();
}

function startGame(difficulty) {
  if (DIFFICULTY_PRESETS[difficulty]) {
    game.difficulty = difficulty;
    game.preset = DIFFICULTY_PRESETS[difficulty];
  }
  resetGame();
  game.screen = "playing";
  saveSettings();
  audio.startMusic();
}

function goToMenu() {
  game.screen = "menu";
  game.gameOver = null;
  audio.stopMusic();
}

// -------------------------------------------------------------
// Boot
// -------------------------------------------------------------

function drawBootScreen(ctx, message) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 28px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, CONFIG.CANVAS_W / 2, CONFIG.H / 2);
}

async function boot() {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) {
    console.error("[Émergence] #game-canvas introuvable dans le DOM");
    return;
  }
  const ctx = canvas.getContext("2d");

  drawBootScreen(ctx, "Chargement...");

  // Settings persistés (difficulté, audio toggles)
  loadSettings();

  buildHudButtons();
  setupInput(canvas);

  try {
    await loadAllSprites();
  } catch (err) {
    console.warn("[Émergence] Erreur de chargement des sprites :", err);
  }

  // Démarre l'écran de menu (le gameplay s'init au clic sur Jouer)
  game.screen = "menu";
  requestAnimationFrame(gameLoop);
}

document.addEventListener("DOMContentLoaded", boot);
