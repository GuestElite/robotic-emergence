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

// Couleurs joueur par défaut (overridées par le skin Supabase via applyTeamSkin())
const DEFAULT_PLAYER_COLOR = "#3b82f6";
const DEFAULT_PLAYER_DARK = "#1e40af";

const COLORS = {
  background: "#1a2030",
  ground: "#a88b6b",
  groundDark: "#8e7355",
  hudBg: "rgba(15, 20, 25, 0.92)",
  hudText: "#e8eef5",
  hudMuted: "rgba(232, 238, 245, 0.55)",
  player: DEFAULT_PLAYER_COLOR,
  playerDark: DEFAULT_PLAYER_DARK,
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
    cost: 130,
    prodInterval: 5.0,
    hp: 150,
    unitType: "sniper",
  },
  air: {
    id: "air",
    label: "Aérienne",
    cost: 180,
    prodInterval: 3.2,
    hp: 130,
    unitType: "air",
  },
};

const UNIT_TYPES = {
  light: {
    id: "light",
    hp: 30, damage: 10, speed: 90, radius: 8,
    range: 55, attackInterval: 0.7, killReward: 10,
    layer: "ground", canTargetAir: false,
  },
  heavy: {
    id: "heavy",
    hp: 80, damage: 25, speed: 50, radius: 12,
    range: 65, attackInterval: 1.5, killReward: 25,
    layer: "ground", canTargetAir: false,
  },
  swarmer: {
    id: "swarmer",
    hp: 18, damage: 4, speed: 135, radius: 6,
    range: 35, attackInterval: 0.45, killReward: 5,
    layer: "ground", canTargetAir: false,
  },
  sniper: {
    id: "sniper",
    hp: 55, damage: 35, speed: 50, radius: 10,
    range: 145, attackInterval: 2.0, killReward: 28,
    layer: "ground", canTargetAir: true, // SEUL ground qui peut viser l'air
  },
  air: {
    id: "air",
    hp: 45, damage: 14, speed: 110, radius: 9,
    range: 75, attackInterval: 1.0, killReward: 30,
    layer: "air",
    canTargetAir: true, // les drones peuvent tirer sur tout : sol + air
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
    // Layer + capacités anti-air (sniper et air)
    layer:          ut.layer || "ground",
    canTargetAir:   !!ut.canTargetAir,
  };
}

// -------------------------------------------------------------
// IA ennemie (V0 — timer simple, pas de stratégie complexe)
// -------------------------------------------------------------

// Valeurs par défaut — écrasées par game.preset au démarrage de partie
const AI_CONFIG = {
  buildInterval: 5.0,
  firstBuildDelay: 2,
  typeWeights: { light: 30, heavy: 22, swarmer: 22, sniper: 14, air: 12 },
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
    aiTypeWeights: { light: 42, heavy: 18, swarmer: 22, sniper: 10, air: 8 },
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
    aiTypeWeights: { light: 30, heavy: 22, swarmer: 22, sniper: 14, air: 12 },
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
    aiTypeWeights: { light: 22, heavy: 26, swarmer: 22, sniper: 14, air: 16 },
    playerStartMoney: 80,
    playerBaseHP: 700,
    enemyBaseHP: 1500,
    aiDefenseChance: 0.35,
  },
};

// -------------------------------------------------------------
// Audio (Web Audio API — pas de fichier à charger, tout est synthétisé)
// -------------------------------------------------------------
// Sons WAV synthétisés (préchargés depuis 11-sound-design/sfx/).
// Quand un type est présent ici, on joue le WAV au lieu de l'oscillateur de fallback.
const SFX_WAV_FILES = {
  "shoot-light":   "unit-light-shoot.wav",
  "shoot-heavy":   "unit-heavy-shoot.wav",
  "shoot-swarmer": "unit-swarmer-shoot.wav",
  "shoot-sniper":  "unit-sniper-shoot.wav",
  "shoot-air":     "unit-air-shoot.wav",
  "death":         "unit-death.wav",
  "crash":         "unit-crash-rampart.wav",
  "lightning":     "effect-lightning.wav",
};

const SFX_WAV_VOLUMES = {
  "shoot-light":   0.40,
  "shoot-heavy":   0.45,  // grave, doit se sentir punchy
  "shoot-swarmer": 0.20,  // tir spammé → volume réduit
  "shoot-sniper":  0.50,
  "shoot-air":     0.38,
  "death":         0.45,
  "crash":         0.70,  // boom — laisser claquer
  "lightning":     0.65,
};

const audio = {
  ctx: null,
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.8,    // 0..1 user-facing, multiplie bgmVolume (BGM HTMLAudio) ou musicMaster (synth fallback)
  sfxVolume: 0.8,      // 0..1 user-facing, multiplie tous les gains de SFX
  musicMaster: null,
  musicNodes: [],
  bgmAudio: null,
  bgmVolume: 0.22,     // référence interne (mixée avec musicVolume)
  wavBuffers: {},
  lastSfxTime: {},
  async preloadWavs() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const entries = Object.entries(SFX_WAV_FILES);
    await Promise.all(entries.map(async ([type, file]) => {
      try {
        const res = await fetch(`../11-sound-design/sfx/${file}`);
        const arr = await res.arrayBuffer();
        this.wavBuffers[type] = await ctx.decodeAudioData(arr);
      } catch (e) {
        console.warn(`[Audio] échec chargement ${file} :`, e);
        this.wavBuffers[type] = null;
      }
    }));
  },
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
    // Throttle par type
    const now = ctx.currentTime;
    let minGap = 0.06;
    if (type === "explosion" || type === "crash" || type === "lightning") minGap = 0.18;
    else if (type === "death") minGap = 0.08;
    if (this.lastSfxTime[type] && now - this.lastSfxTime[type] < minGap) return;
    this.lastSfxTime[type] = now;

    // 1) Si un WAV est chargé pour ce type → on le joue (sons réels)
    const buf = this.wavBuffers[type];
    if (buf) {
      try {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        const baseVol = SFX_WAV_VOLUMES[type] != null ? SFX_WAV_VOLUMES[type] : 0.4;
        g.gain.value = baseVol * this.sfxVolume;
        src.connect(g).connect(ctx.destination);
        src.start(0);
      } catch (_) {}
      return;
    }

    // 2) Sinon → fallback oscillator (sons UI comme "click", "place", "upgrade", etc.)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const volGain = ctx.createGain();
    volGain.gain.setValueAtTime(this.sfxVolume, now);
    osc.connect(gain).connect(volGain).connect(ctx.destination);

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
    if (!this.musicEnabled) return;
    if (this.bgmAudio && !this.bgmAudio.paused) return;
    if (!this.bgmAudio) {
      this.bgmAudio = new Audio("../11-sound-design/music/bgm-pathfinder.mp3");
      this.bgmAudio.loop = true;
    }
    this.bgmAudio.volume = this.bgmVolume * this.musicVolume;
    this.bgmAudio.play().catch(() => {});
  },
  stopMusic() {
    if (this.bgmAudio) {
      try { this.bgmAudio.pause(); this.bgmAudio.currentTime = 0; } catch (_) {}
    }
  },
  setMusicEnabled(on) {
    this.musicEnabled = on;
    if (on && game.screen === "playing") this.startMusic();
    else this.stopMusic();
  },
  setSfxEnabled(on) { this.sfxEnabled = on; },
  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.bgmAudio) this.bgmAudio.volume = this.bgmVolume * this.musicVolume;
  },
  setSfxVolume(v) { this.sfxVolume = Math.max(0, Math.min(1, v)); },
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
    if (s.biome && ["desert", "jungle", "snow"].includes(s.biome)) {
      game.biome = s.biome;
    }
    if (typeof s.musicEnabled === "boolean") audio.musicEnabled = s.musicEnabled;
    if (typeof s.sfxEnabled === "boolean") audio.sfxEnabled = s.sfxEnabled;
    if (typeof s.musicVolume === "number") audio.musicVolume = Math.max(0, Math.min(1, s.musicVolume));
    if (typeof s.sfxVolume === "number") audio.sfxVolume = Math.max(0, Math.min(1, s.sfxVolume));
  } catch (_) {}
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      difficulty: game.difficulty,
      biome: game.biome,
      musicEnabled: audio.musicEnabled,
      sfxEnabled: audio.sfxEnabled,
      musicVolume: audio.musicVolume,
      sfxVolume: audio.sfxVolume,
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
  biome: "desert",                // "desert" | "jungle" | "snow" — affecte sprites + gradient sol
  player: null,
  enemy: null,
  units: [],
  props: [],                       // décors fixes posés sur la map (rocher, cactus, etc.)
  projectiles: [],                 // bolts en vol (remplace attackFx)
  flashes: [],                     // muzzle + impact flashes
  attackFx: [],                    // legacy, conservé pour compat — vidé en pratique
  explosions: [],
  lightning: null,                // { x, y1, y2, age, ttl } pendant l'animation
  lightningCooldown: 0,           // secondes restantes avant la prochaine charge
  lightningAiming: false,         // true = curseur de visée actif, attend un clic sur la map
  stats: { player: makeStats(), enemy: makeStats() },
  gameOver: null,
  camera: { x: 0 },
  ui: {
    selectedBuildType: null,
    hoverSlot: null,
    hoverUnit: null,             // unité (mobile ou turret) survolée par la souris — affiche son cercle de portée
    mouse: { x: 0, y: 0 },
    mouseScreen: { x: 0, y: 0 },
    mouseInside: false,
    buttons: [],
    replayBtn: null,
    upgradePanel: null,
    panelRects: null,
    menuRects: null,
    gameOverMenuBtn: null,
    lightningBtn: null,
    settingsBtn: null,
    settingsOpen: false,
    settingsRects: null,
    draggingSlider: null,         // "music" | "sfx" pendant un drag de volume
    lobbyRects: null,             // rects du screen "salle d'attente"
  },
  // Mode courant. "solo" = vs bot. "mp" = multijoueur PvP synchronisé via Supabase Realtime.
  mode: "solo",
  // État multijoueur. Voir startMultiplayer() / multiplayer.js
  mp: null,
};

// Retourne le côté que contrôle l'utilisateur courant.
// Solo ou host → "player" (gauche). Guest MP → "enemy" (droite).
function mySide() {
  if (game.mode === "mp" && game.mp?.role === "guest") return "enemy";
  return "player";
}
function oppSide() {
  return mySide() === "player" ? "enemy" : "player";
}

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

// Upgrades dédiés aux turrets (4 stats au lieu de 6 — pas de creation rate / speed)
const TURRET_UPGRADE_STATS = [
  { id: "health",    label: "Health",     emoji: "🛡️", baseCost: 80,  perLevel: 0.25, kind: "turret-hp",       unit: "PV" },
  { id: "shootRate", label: "Shoot rate", emoji: "🔫",  baseCost: 70,  perLevel: 0.18, kind: "turret-interval", unit: "s" },
  { id: "range",     label: "Range",      emoji: "🎯",  baseCost: 90,  perLevel: 0.12, kind: "turret-range",    unit: "px" },
  { id: "power",     label: "Power",      emoji: "💥",  baseCost: 100, perLevel: 0.22, kind: "turret-power",    unit: "" },
];

const LIGHTNING_COOLDOWN_SEC = 30;
const LIGHTNING_KILL_HALF_WIDTH = 70; // moitié largeur de la zone létale (px)
const LIGHTNING_TTL_SEC = 0.55;

function makeSideState(side) {
  const preset = game.preset;
  // En multijoueur, les deux joueurs partent avec le même argent et le même
  // HP de base (celui du joueur humain). En solo, l'IA garde son économie
  // différenciée par difficulté.
  const isMp = game.mode === "mp";
  const startMoney = (isMp || side === "player") ? preset.playerStartMoney : preset.aiStartMoney;
  const baseHP = (isMp || side === "player") ? preset.playerBaseHP : preset.enemyBaseHP;
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
    factoriesBuiltByType: { light: 0, heavy: 0, swarmer: 0, sniper: 0, air: 0 },
    unitsSpawnedByType: { light: 0, heavy: 0, swarmer: 0, sniper: 0, air: 0 },
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
  "factory-swarmer-player",
  "factory-swarmer-enemy",
  "factory-sniper-player",
  "factory-sniper-enemy",
  "factory-air-player",
  "factory-air-enemy",
  "unit-light-player",
  "unit-light-enemy",
  "unit-heavy-player",
  "unit-heavy-enemy",
  "unit-swarmer-player",
  "unit-swarmer-enemy",
  "unit-sniper-player",
  "unit-sniper-enemy",
  "unit-air-player",
  "unit-air-enemy",
  "effect-explosion",
  // Props désert
  "prop-rock-big",
  "prop-rock-small",
  "prop-cactus",
  "prop-dry-brush",
  "prop-grass-tuft",
  // Props jungle
  "prop-rock-jungle-big",
  "prop-rock-jungle-small",
  "prop-jungle-tree",
  "prop-jungle-vines",
  "prop-fern-tuft",
  "prop-mushroom",
  "prop-moss-patch",
  // Props snow
  "prop-rock-snow-big",
  "prop-rock-snow-small",
  "prop-pine-tree",
  "prop-frozen-bush",
  "prop-ice-shard",
  "prop-snow-pile",
  "prop-dead-branch",
];

// -------------------------------------------------------------
// Props décoratifs (placés sur la map à des positions fixes au démarrage)
// -------------------------------------------------------------
// Chaque type définit : sprite, dimensions (utilisées pour le rendu centré sur
// (x, y) = position du pied du prop), et un bbox de collision relatif à (x, y).
// Si blocking=true, les unités sont push-out hors du bbox.
//
// Le sprite est dessiné avec sa BASE alignée sur (x, y) — autrement dit l'ancre
// est en bas-centre du sprite (comme une plante posée sur le sol).
const PROP_TYPES = {
  // === DESERT ===
  "rock-big":          { sprite: "prop-rock-big",   w: 36, h: 36, blocking: true,
                         // bbox = empreinte au sol, centrée sur (x, y), un peu plus
                         // étroit que la silhouette pour éviter le wall-stick
                         bbox: { dx: -11, dy: -7, w: 22, h: 9 } },
  "rock-small":        { sprite: "prop-rock-small", w: 24, h: 24, blocking: true,
                         bbox: { dx: -7, dy: -5, w: 14, h: 6 } },
  "cactus":            { sprite: "prop-cactus",     w: 30, h: 50, blocking: true,
                         bbox: { dx: -6, dy: -6, w: 12, h: 6 } },
  "dry-brush":         { sprite: "prop-dry-brush",  w: 34, h: 28, blocking: false, bbox: null },
  "grass-tuft":        { sprite: "prop-grass-tuft", w: 20, h: 16, blocking: false, bbox: null },
  // === JUNGLE ===
  "rock-jungle-big":   { sprite: "prop-rock-jungle-big",   w: 36, h: 36, blocking: true,
                         bbox: { dx: -11, dy: -7, w: 22, h: 9 } },
  "rock-jungle-small": { sprite: "prop-rock-jungle-small", w: 24, h: 24, blocking: true,
                         bbox: { dx: -7, dy: -5, w: 14, h: 6 } },
  "jungle-tree":       { sprite: "prop-jungle-tree",       w: 30, h: 50, blocking: true,
                         bbox: { dx: -5, dy: -6, w: 10, h: 6 } },
  "jungle-vines":      { sprite: "prop-jungle-vines",      w: 34, h: 28, blocking: false, bbox: null },
  "fern-tuft":         { sprite: "prop-fern-tuft",         w: 20, h: 16, blocking: false, bbox: null },
  "mushroom":          { sprite: "prop-mushroom",          w: 20, h: 16, blocking: false, bbox: null },
  "moss-patch":        { sprite: "prop-moss-patch",        w: 28, h: 16, blocking: false, bbox: null },
  // === SNOW ===
  "rock-snow-big":     { sprite: "prop-rock-snow-big",     w: 36, h: 36, blocking: true,
                         bbox: { dx: -11, dy: -7, w: 22, h: 9 } },
  "rock-snow-small":   { sprite: "prop-rock-snow-small",   w: 24, h: 24, blocking: true,
                         bbox: { dx: -7, dy: -5, w: 14, h: 6 } },
  "pine-tree":         { sprite: "prop-pine-tree",         w: 30, h: 50, blocking: true,
                         bbox: { dx: -4, dy: -5, w: 8, h: 5 } },
  "frozen-bush":       { sprite: "prop-frozen-bush",       w: 28, h: 24, blocking: false, bbox: null },
  "ice-shard":         { sprite: "prop-ice-shard",         w: 20, h: 16, blocking: true,
                         bbox: { dx: -5, dy: -4, w: 10, h: 5 } },
  "snow-pile":         { sprite: "prop-snow-pile",         w: 28, h: 16, blocking: false, bbox: null },
  "dead-branch":       { sprite: "prop-dead-branch",       w: 34, h: 28, blocking: false, bbox: null },
};

// Mapping nom de sprite → biome (utilisé par spritePathFor pour résoudre
// le bon dossier de chargement)
const PROP_BIOME = {
  // desert
  "prop-rock-big": "desert", "prop-rock-small": "desert", "prop-cactus": "desert",
  "prop-dry-brush": "desert", "prop-grass-tuft": "desert",
  // jungle
  "prop-rock-jungle-big": "jungle", "prop-rock-jungle-small": "jungle",
  "prop-jungle-tree": "jungle", "prop-jungle-vines": "jungle",
  "prop-fern-tuft": "jungle", "prop-mushroom": "jungle", "prop-moss-patch": "jungle",
  // snow
  "prop-rock-snow-big": "snow", "prop-rock-snow-small": "snow",
  "prop-pine-tree": "snow", "prop-frozen-bush": "snow",
  "prop-ice-shard": "snow", "prop-snow-pile": "snow", "prop-dead-branch": "snow",
};

// Positions fixes (déterministes pour V1). x/y = pied du prop dans le monde.
// Le monde fait 2000 × 720, bases ~280 px à gauche/droite, battlefield ~320..1720.
// 22 props par biome, jamais sur les voies du milieu (Y ≈ 156/300/444).
const PROP_POSITIONS_BY_BIOME = {
  desert: [
    // Bande haute
    { type: "rock-big",   x: 380,  y: 115 },
    { type: "grass-tuft", x: 510,  y: 105 },
    { type: "cactus",     x: 640,  y: 130 },
    { type: "rock-small", x: 770,  y: 110 },
    { type: "dry-brush",  x: 910,  y: 125 },
    { type: "rock-big",   x: 1090, y: 138 },
    { type: "grass-tuft", x: 1230, y: 108 },
    { type: "cactus",     x: 1380, y: 145 },
    { type: "rock-small", x: 1530, y: 118 },
    { type: "dry-brush",  x: 1660, y: 132 },
    // Bandes intermédiaires
    { type: "rock-small", x: 420,  y: 250 },
    { type: "grass-tuft", x: 1180, y: 235 },
    { type: "rock-big",   x: 1480, y: 385 },
    { type: "dry-brush",  x: 600,  y: 395 },
    { type: "cactus",     x: 880,  y: 405 },
    // Bande basse
    { type: "rock-big",   x: 420,  y: 535 },
    { type: "cactus",     x: 590,  y: 600 },
    { type: "dry-brush",  x: 760,  y: 560 },
    { type: "rock-small", x: 920,  y: 640 },
    { type: "grass-tuft", x: 1080, y: 595 },
    { type: "rock-big",   x: 1300, y: 555 },
    { type: "rock-small", x: 1620, y: 650 },
  ],
  jungle: [
    // Bande haute — arbres + mousse + champignons
    { type: "jungle-tree",       x: 380,  y: 130 },
    { type: "fern-tuft",         x: 490,  y: 115 },
    { type: "rock-jungle-big",   x: 600,  y: 140 },
    { type: "mushroom",          x: 720,  y: 105 },
    { type: "jungle-vines",      x: 820,  y: 130 },
    { type: "moss-patch",        x: 950,  y: 120 },
    { type: "rock-jungle-small", x: 1080, y: 145 },
    { type: "jungle-tree",       x: 1220, y: 135 },
    { type: "fern-tuft",         x: 1380, y: 110 },
    { type: "jungle-vines",      x: 1530, y: 130 },
    // Intermédiaires
    { type: "rock-jungle-small", x: 430,  y: 250 },
    { type: "mushroom",          x: 720,  y: 235 },
    { type: "moss-patch",        x: 1180, y: 245 },
    { type: "fern-tuft",         x: 600,  y: 395 },
    { type: "rock-jungle-big",   x: 1480, y: 385 },
    // Bande basse
    { type: "jungle-tree",       x: 420,  y: 545 },
    { type: "rock-jungle-big",   x: 580,  y: 610 },
    { type: "mushroom",          x: 760,  y: 575 },
    { type: "rock-jungle-small", x: 920,  y: 645 },
    { type: "fern-tuft",         x: 1080, y: 600 },
    { type: "jungle-tree",       x: 1300, y: 555 },
    { type: "rock-jungle-small", x: 1620, y: 650 },
  ],
  snow: [
    // Bande haute — sapins + glaçons + congères
    { type: "pine-tree",       x: 380,  y: 130 },
    { type: "ice-shard",       x: 490,  y: 115 },
    { type: "rock-snow-big",   x: 600,  y: 145 },
    { type: "snow-pile",       x: 720,  y: 110 },
    { type: "frozen-bush",     x: 830,  y: 135 },
    { type: "ice-shard",       x: 960,  y: 115 },
    { type: "rock-snow-small", x: 1080, y: 145 },
    { type: "pine-tree",       x: 1220, y: 135 },
    { type: "dead-branch",     x: 1380, y: 125 },
    { type: "snow-pile",       x: 1530, y: 110 },
    // Intermédiaires
    { type: "rock-snow-small", x: 430,  y: 250 },
    { type: "ice-shard",       x: 720,  y: 235 },
    { type: "snow-pile",       x: 1180, y: 245 },
    { type: "frozen-bush",     x: 600,  y: 395 },
    { type: "rock-snow-big",   x: 1480, y: 385 },
    // Bande basse
    { type: "pine-tree",       x: 420,  y: 545 },
    { type: "rock-snow-big",   x: 580,  y: 610 },
    { type: "ice-shard",       x: 760,  y: 570 },
    { type: "rock-snow-small", x: 920,  y: 645 },
    { type: "dead-branch",     x: 1080, y: 600 },
    { type: "pine-tree",       x: 1300, y: 555 },
    { type: "rock-snow-small", x: 1620, y: 650 },
  ],
};

const sprites = {};

// Sprites qui CHANGENT selon le biome (chargés depuis 12-biomes/{biome}/sprites/
// si biome != desert, sinon depuis 08-art-direction/sprites/).
const BIOME_SPECIFIC_SPRITES = new Set([
  "tile-ground",
  "unit-light-enemy", "unit-heavy-enemy",
  "unit-swarmer-enemy", "unit-sniper-enemy", "unit-air-enemy",
  "factory-light-enemy", "factory-heavy-enemy",
  "factory-swarmer-enemy", "factory-sniper-enemy", "factory-air-enemy",
]);

// Couleur du gradient peint sur le sol par biome (rgba semi-transparent).
// Ton plus chaud = ombrage cohérent avec l'ambiance du biome.
const BIOME_GRADIENT_COLOR = {
  desert: "80, 50, 25",     // brun chaud sable
  jungle: "30, 50, 15",     // vert sombre humus
  snow:   "60, 90, 130",    // bleu glacé ombré
};

// Affichage humain du biome dans l'UI
const BIOME_LABELS = {
  desert: "Désert",
  jungle: "Jungle",
  snow:   "Neige",
};

function spritePathFor(name, biome) {
  // Sprites biome-specific (tile-ground + enemy units + enemy factories)
  if (BIOME_SPECIFIC_SPRITES.has(name) && biome && biome !== "desert") {
    return `../12-biomes/${biome}/sprites/${name}.png`;
  }
  // Props biome-specific : chacun est mappé à son biome propre via PROP_BIOME
  const propBiome = PROP_BIOME[name];
  if (propBiome && propBiome !== "desert") {
    return `../12-biomes/${propBiome}/sprites/${name}.png`;
  }
  return `../08-art-direction/sprites/${name}.png`;
}

function loadSprite(name, biome) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { sprites[name] = img; resolve(); };
    img.onerror = () => { sprites[name] = null; resolve(); };
    img.src = spritePathFor(name, biome || game.biome);
  });
}

async function loadAllSprites() {
  await Promise.all(SPRITE_FILES.map((n) => loadSprite(n, game.biome)));
}

// Recharge UNIQUEMENT les sprites biome-specific pour le nouveau biome.
// Appelé quand le user change de biome depuis le menu.
async function applyBiome(newBiome) {
  if (!BIOME_LABELS[newBiome]) return;  // biome inconnu, ignore
  game.biome = newBiome;
  const toReload = [...BIOME_SPECIFIC_SPRITES].filter((n) => SPRITE_FILES.includes(n));
  await Promise.all(toReload.map((n) => loadSprite(n, newBiome)));
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
  if (game.mode !== "mp" && side !== "player") return false;
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
    // Upgrades (mêmes 4 niveaux que les factories, appliqués directement à la turret)
    upgrades: { health: 0, shootRate: 0, range: 0, power: 0 },
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

// Achète un upgrade pour une turret. Applique immédiatement le bonus à l'unité.
function tryUpgradeTurret(side, wallSlotIndex, statId) {
  if (game.mode !== "mp" && side !== "player") return false;
  const state = game[side];
  const slot = state.wallSlots[wallSlotIndex];
  if (!slot || !slot.turret) return false;
  const stat = TURRET_UPGRADE_STATS.find((s) => s.id === statId);
  if (!stat) return false;
  const turret = slot.turret;
  const lvl = turret.upgrades[statId] || 0;
  if (lvl >= MAX_UPGRADE_LEVEL) return false;
  const cost = upgradeCost(stat, lvl);
  if (state.money < cost) return false;

  state.money -= cost;
  game.stats[side].moneySpent += cost;
  game.stats[side].upgradesBought++;
  turret.upgrades[statId] = lvl + 1;
  turret.totalInvested += cost;
  applyTurretUpgrades(turret);
  audio.playSFX("upgrade");
  return true;
}

// Recalcule les stats effectives de la turret en partant des stats de base + upgrades
function applyTurretUpgrades(turret) {
  const u = turret.upgrades;
  const newMaxHp = TURRET_TYPE.hp * statMultiplier(u.health, 0.25);
  const hpRatio = turret.maxHp ? (turret.hp / turret.maxHp) : 1;
  turret.maxHp = newMaxHp;
  turret.hp = Math.min(newMaxHp, newMaxHp * hpRatio); // garde le % de vie courant
  turret.stats.hp = newMaxHp;
  turret.stats.damage = TURRET_TYPE.damage * statMultiplier(u.power, 0.22);
  turret.stats.range = TURRET_TYPE.range * statMultiplier(u.range, 0.12);
  turret.stats.attackInterval = TURRET_TYPE.attackInterval / statMultiplier(u.shootRate, 0.18);
}

// Conservé pour compat : renvoie le Y du gate central (mid).
function getPathCenterY() {
  return gateRowToY(CONFIG.PATH_ROWS[1]);
}

// -------------------------------------------------------------
// Boutons du HUD (mode build)
// -------------------------------------------------------------

function buildHudButtons() {
  // 6 boutons (raccourcis 1-6) — turret en dernier (placement sur le mur, pas sur la grille)
  const types = ["light", "heavy", "swarmer", "sniper", "air", "turret"];
  const startX = 130;
  const btnW = 100;
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
  // En solo, seul le joueur place manuellement (l'AI gère l'enemy via updateEnemyAI).
  // En multijoueur, les deux côtés sont contrôlés par des humains, donc on autorise les deux.
  if (game.mode !== "mp" && side !== "player") return false;
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
  // Les unités aériennes survolent les murs : aucun waypoint interne, elles partent direct
  const isAir = stats.layer === "air";
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
    exitWaypoints: isAir ? [] : buildInternalWaypoints(side, slot, gateRow),
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
function canEngage(attacker, target) {
  // L'air est intouchable par les unités ground sans canTargetAir
  if (target.stats && target.stats.layer === "air") {
    return !!attacker.stats?.canTargetAir;
  }
  // Sol : toutes les unités peuvent attaquer (sniper et air aussi)
  return true;
}

function findTargetFor(u) {
  const enemySide = u.side === "player" ? "enemy" : "player";
  const isDef = u.mode === "defense";

  let best = null;
  let bestDist = Infinity;
  for (const other of game.units) {
    if (other.side !== enemySide || other.hp <= 0) continue;
    if (!canEngage(u, other)) continue;
    const d = dist(u.x, u.y, other.x, other.y);

    if (d <= u.stats.range) {
      if (d < bestDist) { best = other; bestDist = d; }
      continue;
    }

    if (isThreateningOwnBase(other, u.side) && d <= DEFENSE_DETECTION_RANGE) {
      if (d < bestDist) { best = other; bestDist = d; }
      continue;
    }

    if (isDef && d <= DEFENSE_DETECTION_RANGE) {
      if (d < bestDist) { best = other; bestDist = d; }
    }
  }
  return best;
}

function applyDamage(target, amount, attacker) {
  const wasAlive = target.hp > 0;
  target.hp -= amount;
  if (attacker) {
    game.stats[attacker.side].damageDealt += amount;
    game.stats[target.side].damageTaken += amount;
  }
  if (target.hp <= 0 && wasAlive) {
    if (attacker) {
      game[attacker.side].money += target.stats.killReward;
      game.stats[attacker.side].unitsKilled++;
      game.stats[target.side].unitsLost++;
    }
    audio.playSFX("death");
  }
}

function spawnExplosion(x, y, side) {
  game.explosions.push({ x, y, age: 0, ttl: 0.45, side });
  // L'audio (death / crash / lightning) est joué par le code appelant pour
  // pouvoir distinguer les contextes (combat vs rempart vs éclair).
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
          // Bolt visuel qui voyage du tireur à la cible (style Star Wars blaster
          // par type d'unité — light/heavy/swarmer/sniper/air ont chacun leur profil)
          spawnProjectile(u.x, u.y, u.target.x, u.target.y, u.typeId, u.side);
          audio.playSFX(`shoot-${u.typeId}`);
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
      audio.playSFX("crash");
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

// Push-out des unités hors des bbox des props bloquants. Approche soft (post-step) :
// si une unité finit dans un bbox bloquant, on la repousse vers le bord le plus proche.
// Pour les unités stationnaires (turrets) on skip — elles ne peuvent pas être dans un prop
// de toute façon (placement contrôlé) et les recoller serait coûteux.
function resolvePropCollisions() {
  if (!game.props || game.props.length === 0) return;
  for (const u of game.units) {
    if (u.hp <= 0 || u.stationary) continue;
    const r = (u.stats && u.stats.radius) || 8;
    for (const p of game.props) {
      const def = p.def;
      if (!def || !def.blocking || !def.bbox) continue;
      const bb = def.bbox;
      const left = p.x + bb.dx;
      const top = p.y + bb.dy;
      const right = left + bb.w;
      const bottom = top + bb.h;
      // Test de chevauchement cercle (unité) × rectangle (bbox)
      if (u.x + r <= left || u.x - r >= right ||
          u.y + r <= top  || u.y - r >= bottom) continue;
      // Push : trouve la pénétration minimale et pousse l'unité hors du bbox
      const penLeft   = (u.x + r) - left;
      const penRight  = right - (u.x - r);
      const penTop    = (u.y + r) - top;
      const penBottom = bottom - (u.y - r);
      const minPen = Math.min(penLeft, penRight, penTop, penBottom);
      if (minPen === penLeft)        u.x = left - r;
      else if (minPen === penRight)  u.x = right + r;
      else if (minPen === penTop)    u.y = top - r;
      else                            u.y = bottom + r;
    }
  }
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
    audio.playSFX(mySide() === "enemy" ? "win" : "lose");
    audio.stopMusic();
    notifyGameOver("enemy");
  } else if (game.enemy.baseHP <= 0) {
    game.gameOver = { winner: "player" };
    audio.playSFX(mySide() === "player" ? "win" : "lose");
    audio.stopMusic();
    notifyGameOver("player");
  }
}

// Notifie le backend (solo) ou diffuse en MP (host) la fin de partie.
// Dans tous les cas le joueur courant enregistre son résultat perso pour
// que la monnaie et les missions soient bien créditées.
function notifyGameOver(winnerSide) {
  const myResult = winnerSide === mySide() ? "win" : "lose";
  if (game.mode === "mp" && game.mp?.role === "host" && window.RE_MP) {
    const mappedWinner = winnerSide === "player" ? "host" : "guest";
    try { window.RE_MP.sendGameOver(winnerSide); } catch {}
    try { window.RE_MP.reportFinish(mappedWinner); } catch {}
  }
  sendGameResultToBackend(myResult);
}

// Pousse les stats de partie vers Supabase (via auth-bridge.js).
// Met à jour le solde local du joueur et la progression des missions.
// Le snapshot de stats utilisé est celui du côté que le joueur a réellement contrôlé
// (mySide()) — important en MP où le guest pilote le côté "enemy".
async function sendGameResultToBackend(result) {
  if (!window.RE_AUTH || !window.RE_AUTH.session) return;
  const ps = game.stats[mySide()] || game.stats.player;
  const payload = {
    difficulty:    game.difficulty,
    result,
    duration:      game.time,
    unitsKilled:   ps.unitsKilled,
    unitsLost:     ps.unitsLost,
    damageDealt:   ps.damageDealt,
    damageTaken:   ps.damageTaken,
    turretsBuilt:  ps.turretsBuilt,
    lightningUsed: ps.lightningsUsed,
    mode:          game.mode === "mp" ? "mp" : "solo",
  };
  try {
    const res = await window.RE_AUTH.finishGame(payload);
    if (res?.ok && game.gameOver) {
      game.gameOver.reward = res.reward;
    }
  } catch (e) {
    console.warn("[RE] finishGame failed:", e);
  }
}

// Applique le skin équipé aux couleurs du joueur (et la souffle au prochain frame)
function applyTeamSkin() {
  const skin = window.RE_AUTH?.skin;
  if (skin && skin.hex_color && skin.hex_color_dark) {
    COLORS.player = skin.hex_color;
    COLORS.playerDark = skin.hex_color_dark;
    COLORS.playerSoft = hexToRgba(skin.hex_color, 0.15);
  } else {
    COLORS.player = DEFAULT_PLAYER_COLOR;
    COLORS.playerDark = DEFAULT_PLAYER_DARK;
    COLORS.playerSoft = "rgba(59, 130, 246, 0.15)";
  }
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Quand la session ou le skin change (login/logout/équiper), on rafraîchit
if (typeof window !== "undefined") {
  window.addEventListener("re-auth-changed", applyTeamSkin);
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
  // Le guest en MP n'est qu'un client de rendu — toute la simulation est
  // calculée par le host, qui envoie des snapshots via Realtime broadcast.
  const isGuest = game.mode === "mp" && game.mp?.role === "guest";
  if (isGuest) {
    // On laisse juste tourner la caméra et la mise à jour de la souris,
    // les structures (units, factories, etc.) sont écrasées par les snapshots reçus.
    updateCamera(dt);
    game.ui.mouse.x = game.ui.mouseScreen.x + game.camera.x;
    game.ui.mouse.y = game.ui.mouseScreen.y;
    return;
  }
  game.time += dt;
  updateCamera(dt);
  updateLightning(dt);
  // En MP host, on désactive le bot : c'est le guest qui joue le côté enemy.
  if (game.mode !== "mp") updateEnemyAI(dt);
  updateFactories(dt);
  updateUnits(dt);
  resolvePropCollisions();
  updateAttackFx(dt);
  updateProjectiles(dt);
  updateFlashes(dt);
  updateExplosions(dt);
  checkGameOver();
  game.ui.mouse.x = game.ui.mouseScreen.x + game.camera.x;
  game.ui.mouse.y = game.ui.mouseScreen.y;

  // MP host : broadcast un snapshot d'état à ~12 Hz
  if (game.mode === "mp" && game.mp?.role === "host" && window.RE_MP) {
    game.mp.snapAccum = (game.mp.snapAccum || 0) + dt;
    if (game.mp.snapAccum >= (1 / 12)) {
      game.mp.snapAccum = 0;
      try { window.RE_MP.sendSnapshot(buildMpSnapshot()); } catch (e) { console.warn("[MP] snapshot send", e); }
    }
  }
}

function updateLightning(dt) {
  if (game.lightningCooldown > 0) game.lightningCooldown = Math.max(0, game.lightningCooldown - dt);
  if (game.mode === "mp" && game.mp && game.mp.enemyLightningCooldown > 0) {
    game.mp.enemyLightningCooldown = Math.max(0, game.mp.enemyLightningCooldown - dt);
  }
  if (!game.lightning) return;
  game.lightning.age += dt;
  if (game.lightning.age >= game.lightning.ttl) game.lightning = null;
}

// Retourne le cooldown de foudre courant pour un côté donné.
// En solo, on n'utilise que game.lightningCooldown (côté player).
// En MP, le host a 2 cooldowns : game.lightningCooldown (player) et game.mp.enemyLightningCooldown (enemy).
function lightningCdFor(side) {
  if (side === "player") return game.lightningCooldown;
  if (game.mode === "mp" && game.mp) return game.mp.enemyLightningCooldown || 0;
  return 0;
}
function setLightningCdFor(side, value) {
  if (side === "player") game.lightningCooldown = value;
  else if (game.mode === "mp" && game.mp) game.mp.enemyLightningCooldown = value;
}

// Toggle du mode de visée (clic bouton Éclair / touche L)
function toggleLightningAim() {
  if (game.lightningAiming) {
    game.lightningAiming = false;  // cancel
    return false;
  }
  if (lightningCdFor(mySide()) > 0) return false;
  game.lightningAiming = true;
  return true;
}

// Tire la foudre à une position X donnée (le joueur a cliqué sur la map en aim mode)
// `side` indique qui tire (par défaut "player" pour le mode solo et le host).
function fireLightningAt(targetX, side = "player") {
  if (lightningCdFor(side) > 0) return false;
  // Clamp pour rester dans la zone de jeu
  const margin = LIGHTNING_KILL_HALF_WIDTH;
  const x = Math.max(margin, Math.min(CONFIG.W - margin, targetX));
  const y1 = CONFIG.HUD_H + 20;
  const y2 = CONFIG.H - 20;
  game.lightning = { x, y1, y2, age: 0, ttl: LIGHTNING_TTL_SEC, segments: makeLightningSegments(x, y1, y2), side };
  setLightningCdFor(side, LIGHTNING_COOLDOWN_SEC);
  game.lightningAiming = false;
  // Tue tout ce qui se trouve dans la bande [x - half, x + half]
  let killsByPlayer = 0, killsByEnemy = 0;
  for (const u of game.units) {
    if (u.hp <= 0) continue;
    if (u.stationary) continue; // les turrets sur les remparts ne sont pas touchées
    if (Math.abs(u.x - x) <= LIGHTNING_KILL_HALF_WIDTH) {
      u.hp = 0;
      spawnExplosion(u.x, u.y, u.side);
      game.stats[u.side].unitsLost++;
      if (u.side === "player") killsByEnemy++;
      else killsByPlayer++;
    }
  }
  game.stats.player.unitsKilled += killsByPlayer;
  game.stats.enemy.unitsKilled += killsByEnemy;
  game.stats[side].lightningsUsed++;
  audio.playSFX("lightning");
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
  if (!game.ui.mouseInside || overHud || overPanel || overGameOver || game.ui.settingsOpen) return;

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
  if (game.screen === "lobby") {
    drawLobbyScreen(ctx);
    return;
  }

  // Monde (avec décalage caméra)
  ctx.save();
  ctx.translate(-game.camera.x, 0);
  drawGround(ctx);
  drawBattlefieldLane(ctx);
  drawProps(ctx);
  drawBase(ctx, "player");
  drawBase(ctx, "enemy");
  drawWallSlots(ctx, "player");
  drawWallSlots(ctx, "enemy");
  drawUnits(ctx);
  drawAttackFx(ctx);
  drawProjectiles(ctx);
  drawFlashes(ctx);
  drawExplosions(ctx);
  drawHoverRange(ctx);
  drawLightning(ctx);
  drawLightningAim(ctx);
  ctx.restore();

  // UI (coordonnées écran)
  drawHUD(ctx);
  drawMinimap(ctx);
  drawScrollHints(ctx);
  drawUpgradePanel(ctx);
  drawSettingsPanel(ctx);
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
  // 1) Tile-ground (texture grain sable, tileable, couleur uniforme)
  if (sprites["tile-ground"]) {
    const tile = sprites["tile-ground"];
    const tileSize = 128;
    for (let y = CONFIG.HUD_H; y < CONFIG.H; y += tileSize) {
      for (let x = 0; x < CONFIG.W; x += tileSize) {
        ctx.drawImage(tile, x, y, tileSize, tileSize);
      }
    }
  } else {
    // Fallback : couleur unie
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, CONFIG.HUD_H, CONFIG.W, CONFIG.H - CONFIG.HUD_H);
  }

  // 2) Overlay gradient vertical peint EN UNE SEULE FOIS sur toute la map
  //    (transparent en haut → sombre en bas). Couvre l'intégralité du
  //    battlefield d'un coup → ZÉRO bande horizontale liée au tilage.
  //    La couleur de l'ombre dépend du biome actuel.
  const top = CONFIG.HUD_H;
  const bot = CONFIG.H;
  const gradColor = BIOME_GRADIENT_COLOR[game.biome] || BIOME_GRADIENT_COLOR.desert;
  const grad = ctx.createLinearGradient(0, top, 0, bot);
  grad.addColorStop(0,   "rgba(0, 0, 0, 0.00)");
  grad.addColorStop(0.5, `rgba(${gradColor}, 0.06)`);
  grad.addColorStop(1,   `rgba(${gradColor}, 0.22)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, top, CONFIG.W, bot - top);
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

// Dessine les props décoratifs, triés par Y croissant : ceux du haut sont
// dessinés en premier, ceux du bas par-dessus → fausse profondeur 2.5D.
// L'ancre du sprite est au pied du prop (bas-centre) pour que le pied colle au sol.
function drawProps(ctx) {
  if (!game.props || game.props.length === 0) return;
  const sorted = [...game.props].sort((a, b) => a.y - b.y);
  for (const p of sorted) {
    const def = p.def;
    if (!def) continue;
    const img = sprites[def.sprite];
    if (!img) continue;
    // Position du sprite : centré en X sur p.x, bas du sprite aligné avec p.y
    const dx = Math.round(p.x - def.w / 2);
    const dy = Math.round(p.y - def.h);
    ctx.drawImage(img, dx, dy, def.w, def.h);
  }
}

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
  const isPlayer = side === mySide();
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
      const canAfford = game[mySide()].money >= type.cost;
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
        && hover && hover.side === mySide() && hover.slotIndex === idx) {
      const type = FACTORY_TYPES[game.ui.selectedBuildType];
      if (!slot.factory && game[mySide()].money >= type.cost) {
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
  } else if (typeId === "air") {
    // Héliport : plateforme circulaire avec H au centre + lumières clignotantes
    ctx.fillStyle = main;
    ctx.fillRect(x + 4, y + h - 14, w - 8, 12);
    // Plateforme cercle
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, cy - 2, w * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Lettre H
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("H", cx, cy - 2);
    // Petites lumières (4 coins)
    const pulse = (Math.sin((game.time || 0) * 6) + 1) / 2;
    ctx.fillStyle = `rgba(251, 191, 36, ${0.4 + pulse * 0.6})`;
    [[-w*0.35,-h*0.20],[w*0.35,-h*0.20],[-w*0.35,h*0.30],[w*0.35,h*0.30]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });
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

// Cercle de portée de tir affiché autour de l'unité survolée par la souris.
// Dessiné dans le repère monde (entre drawUnits et drawAttackFx). Affiche également
// la zone de "détection" pour les unités en mode défense, en pointillés.
function drawHoverRange(ctx) {
  const u = game.ui.hoverUnit;
  if (!u || u.hp <= 0 || !u.stats) return;
  const range = u.stats.range || 0;
  if (range <= 0) return;

  const color = u.side === "player" ? COLORS.player : COLORS.enemy;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(u.x, u.y, range, 0, Math.PI * 2);
  ctx.stroke();

  // Remplissage léger pour la zone
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();

  // Petit label de portée
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  const label = `${Math.round(range)} px`;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const labelW = ctx.measureText(label).width + 10;
  const labelX = u.x - labelW / 2;
  const labelY = u.y - (u.stats.radius || 10) - 24;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  roundedRect(ctx, labelX, labelY, labelW, 18, 4);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(label, u.x, labelY + 9);
  ctx.restore();
}

function drawUnits(ctx) {
  for (const u of game.units) {
    const radius = u.stats.radius;
    const spriteName = `unit-${u.typeId}-${u.side}`;
    if (sprites[spriteName]) {
      const size = radius * 4;
      // Les sprites enemy ont leur canon/œil orienté vers +X (comme les player).
      // Or les unités enemy avancent vers -X (la base joueur). Donc on flippe
      // horizontalement le sprite pour que les ennemis "regardent" leur cible.
      if (u.side === "enemy") {
        ctx.save();
        ctx.translate(u.x, u.y);
        ctx.scale(-1, 1);
        ctx.drawImage(sprites[spriteName], -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        ctx.drawImage(sprites[spriteName], u.x - size / 2, u.y - size / 2, size, size);
      }
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

  if (u.typeId === "air") {
    // Drone aérien : ombre projetée au sol + corps qui flotte + 4 rotors
    const bob = Math.sin((game.time || 0) * 4 + u.x * 0.02) * 2.5;
    const flyOffset = -16 + bob; // hauteur de vol (vers le haut)
    const cx = u.x;
    const cy = u.y + flyOffset;

    // Ombre au sol (à la position "ground" = u.y, transparente)
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(u.x, u.y + 4, radius * 1.1, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4 bras + rotors
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.5;
    const armLen = radius * 1.3;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (Math.PI / 2) * i;
      const rx = cx + Math.cos(a) * armLen;
      const ry = cy + Math.sin(a) * armLen;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      // Rotor (cercle flou)
      ctx.fillStyle = "rgba(200, 220, 255, 0.55)";
      ctx.beginPath();
      ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    // Corps central
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // LED frontale (clignote)
    const blink = (Math.sin((game.time || 0) * 8) + 1) / 2;
    ctx.fillStyle = `rgba(34, 197, 94, ${0.5 + blink * 0.5})`;
    ctx.beginPath();
    ctx.arc(cx + fwd * radius * 0.4, cy, 1.6, 0, Math.PI * 2);
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

// Legacy — vide en pratique. Conservé au cas où du vieux code spawne encore
// dans attackFx, mais le système actif est drawProjectiles / drawFlashes.
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
// Projectiles (blasters Star Wars-style, profil par type d'unité)
// -------------------------------------------------------------

// Visuel + vitesse par classe d'unité
const PROJECTILE_PROFILES = {
  light:   { coreW: 5, coreH: 2,  haloW: 16, haloH: 8,  haloBlur: 8,
             trailCount: 3, trailSpacing: 4, trailWidth: 2, speed: 700, isLaser: false },
  heavy:   { coreW: 9, coreH: 4,  haloW: 24, haloH: 12, haloBlur: 12,
             trailCount: 4, trailSpacing: 5, trailWidth: 3, speed: 480, isLaser: false },
  swarmer: { coreW: 3, coreH: 1,  haloW: 8,  haloH: 4,  haloBlur: 6,
             trailCount: 0, trailSpacing: 0, trailWidth: 0, speed: 900, isLaser: false },
  sniper:  { coreW: 26, coreH: 1, haloW: 32, haloH: 4,  haloBlur: 10,
             trailCount: 1, trailSpacing: 12, trailWidth: 1, speed: 1800, isLaser: true,
             trailLong: true },
  // Air drone (ajouté par Julien) : profil similaire au light
  air:     { coreW: 5, coreH: 2,  haloW: 16, haloH: 8,  haloBlur: 8,
             trailCount: 3, trailSpacing: 4, trailWidth: 2, speed: 750, isLaser: false },
};

const PROJECTILE_COLORS = {
  player: {
    haloOuter: [80, 180, 255],
    haloInner: [140, 220, 255],
    core:      [220, 245, 255],
    coreInner: [240, 250, 255],
    trail:     [120, 220, 255],
  },
  enemy: {
    haloOuter: [255, 80, 50],
    haloInner: [255, 140, 90],
    core:      [255, 220, 180],
    coreInner: [255, 240, 220],
    trail:     [255, 140, 90],
  },
};

function rgba(c, alpha) {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

function spawnProjectile(fromX, fromY, toX, toY, unitType, side) {
  const profile = PROJECTILE_PROFILES[unitType] || PROJECTILE_PROFILES.light;
  const dx = toX - fromX, dy = toY - fromY;
  const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const ttl = dist / profile.speed;
  game.projectiles.push({
    startX: fromX, startY: fromY,
    endX: toX, endY: toY,
    x: fromX, y: fromY,
    angle: Math.atan2(dy, dx),
    age: 0, ttl,
    profile: unitType,
    side,
  });
  // Muzzle flash à l'origine
  game.flashes.push({
    x: fromX, y: fromY, age: 0, ttl: 0.08, kind: "muzzle", side,
  });
}

function updateProjectiles(dt) {
  for (const p of game.projectiles) {
    p.age += dt;
    if (p.age >= p.ttl) {
      // Impact flash quand le bolt arrive
      game.flashes.push({
        x: p.endX, y: p.endY, age: 0, ttl: 0.14, kind: "impact", side: p.side,
      });
    } else {
      const t = p.age / p.ttl;
      p.x = p.startX + (p.endX - p.startX) * t;
      p.y = p.startY + (p.endY - p.startY) * t;
    }
  }
  game.projectiles = game.projectiles.filter((p) => p.age < p.ttl);
}

function updateFlashes(dt) {
  for (const f of game.flashes) f.age += dt;
  game.flashes = game.flashes.filter((f) => f.age < f.ttl);
}

function drawProjectiles(ctx) {
  for (const p of game.projectiles) {
    const profile = PROJECTILE_PROFILES[p.profile] || PROJECTILE_PROFILES.light;
    const colors = PROJECTILE_COLORS[p.side];

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // ── Trail (segments fading derrière le bolt)
    if (profile.trailCount > 0) {
      for (let t = 0; t < profile.trailCount; t++) {
        const offset = -(profile.coreW + 2 + t * profile.trailSpacing);
        const alpha = Math.max(0, (180 - t * 45) / 255);
        ctx.fillStyle = rgba(colors.trail, alpha);
        if (profile.trailLong) {
          // Sniper : trait long fading
          ctx.fillRect(offset - 10, -0.5, 10, 1);
        } else {
          // Light / heavy : ovales fading
          const tw = profile.trailWidth;
          ctx.beginPath();
          ctx.ellipse(offset, 0, tw, Math.max(1, tw / 2), 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ── Halo (shadow blur pour effet glow)
    ctx.shadowBlur = profile.haloBlur;
    ctx.shadowColor = rgba(colors.haloOuter, 0.9);
    ctx.fillStyle = rgba(colors.haloInner, 0.7);
    ctx.beginPath();
    ctx.ellipse(0, 0, profile.haloW / 2, profile.haloH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // ── Core
    ctx.fillStyle = rgba(colors.core, 1);
    if (profile.isLaser) {
      // Laser sniper : rectangle fin
      ctx.fillRect(-profile.coreW, -profile.coreH, profile.coreW * 2, profile.coreH * 2 + 1);
      // Trait blanc pur au milieu
      ctx.fillStyle = rgba(colors.coreInner, 1);
      ctx.fillRect(-profile.coreW + 2, -0.5, (profile.coreW - 2) * 2, 1);
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, profile.coreW, profile.coreH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(colors.coreInner, 1);
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1, profile.coreW - 2), Math.max(0.5, profile.coreH - 1), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawFlashes(ctx) {
  for (const f of game.flashes) {
    const colors = PROJECTILE_COLORS[f.side];
    const t = f.age / f.ttl;            // 0 → 1
    const alpha = 1 - t;                 // fade out
    if (f.kind === "muzzle") {
      // Muzzle = petit éclat jaune-blanc rapide (cohérent pour les 2 sides)
      const r = 6 + 4 * t;
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = rgba(colors.haloOuter, alpha);
      ctx.fillStyle = `rgba(255, 240, 200, ${alpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Core blanc
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (f.kind === "impact") {
      // Impact = étoile + cercle qui s'élargit
      const r = 4 + 12 * t;
      ctx.save();
      ctx.shadowBlur = 14;
      ctx.shadowColor = rgba(colors.haloOuter, alpha);
      // Cercle qui grandit (onde)
      ctx.strokeStyle = rgba(colors.haloInner, alpha * 0.6);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.stroke();
      // Coeur de l'explosion
      ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 4 * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
      // 4 traits de l'étoile
      ctx.strokeStyle = `rgba(255, 240, 200, ${alpha})`;
      ctx.lineWidth = 1.5;
      const armLen = 8 * (1 - t);
      for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 2) {
        ctx.beginPath();
        ctx.moveTo(f.x + Math.cos(ang) * 2, f.y + Math.sin(ang) * 2);
        ctx.lineTo(f.x + Math.cos(ang) * (2 + armLen), f.y + Math.sin(ang) * (2 + armLen));
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// -------------------------------------------------------------
// Rendu — panneau d'upgrade (apparaît au clic sur une factory)
// -------------------------------------------------------------

function getPanelGeometry() {
  const sel = game.ui.upgradePanel;
  if (!sel) return null;
  if (sel.type === "turret") {
    const slot = game[sel.side].wallSlots[sel.index];
    if (!slot || !slot.turret) return null;
    const PW = 290;
    const PH = 340; // moins haut : 4 stats au lieu de 6
    const px = CONFIG.CANVAS_W - PW - 14;
    const py = CONFIG.HUD_H + 14;
    return { x: px, y: py, w: PW, h: PH, slot, side: sel.side, type: "turret" };
  }
  // Factory (par défaut)
  const slot = game[sel.side].slots[sel.slotIndex];
  if (!slot || !slot.factory) return null;
  const PW = 290;
  const PH = 432;
  const px = CONFIG.CANVAS_W - PW - 14;
  const py = CONFIG.HUD_H + 14;
  return { x: px, y: py, w: PW, h: PH, slot, side: sel.side, type: "factory" };
}

function drawUpgradePanel(ctx) {
  const geo = getPanelGeometry();
  if (!geo) { game.ui.panelRects = null; return; }
  if (geo.type === "turret") return drawTurretUpgradePanel(ctx, geo);
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
    const isPlayer = side === mySide();
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

function drawTurretUpgradePanel(ctx, geo) {
  const { x, y, w, h, slot, side } = geo;
  const turret = slot.turret;
  const state = game[side];

  // Fond
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
  ctx.fillText(`🗼 Turret défensive`, x + 14, cursorY);

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`Investi : ${turret.totalInvested}💰`, x + w - 38, cursorY + 2);

  cursorY += 22;

  // HP de la turret (info)
  const hpRatio = turret.hp / turret.maxHp;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x + 12, cursorY, w - 24, 8);
  ctx.fillStyle = hpRatio > 0.5 ? COLORS.hpGood : hpRatio > 0.25 ? COLORS.hpWarn : COLORS.hpDanger;
  ctx.fillRect(x + 12, cursorY, (w - 24) * hpRatio, 8);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(turret.hp)} / ${Math.ceil(turret.maxHp)} PV`, x + w / 2, cursorY + 12);

  cursorY += 28;

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 12, cursorY);
  ctx.lineTo(x + w - 12, cursorY);
  ctx.stroke();

  cursorY += 8;

  // 4 lignes d'upgrade
  const rects = { upgrades: [], sell: null, close: null, mode: null };
  const rowH = 48;
  const btnW = 70;

  for (const stat of TURRET_UPGRADE_STATS) {
    const lvl = turret.upgrades[stat.id] || 0;
    const isMax = lvl >= MAX_UPGRADE_LEVEL;
    const cost = isMax ? 0 : upgradeCost(stat, lvl);
    const canAfford = !isMax && state.money >= cost;
    const isPlayer = side === mySide();
    const enabled = isPlayer && !isMax && canAfford;

    const rowX = x + 12;
    const rowY = cursorY;

    ctx.fillStyle = COLORS.hudText;
    ctx.font = "bold 12px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`${stat.emoji} ${stat.label}`, rowX, rowY);

    const previewLabel = formatTurretStatPreview(turret, stat);
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillText(previewLabel, rowX, rowY + 16);

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
    ctx.fillText(isMax ? "✓ MAX" : `+ ${cost}💰`, btnRect.x + btnRect.w / 2, btnRect.y + btnRect.h / 2);

    if (enabled) rects.upgrades.push({ rect: btnRect, statId: stat.id });

    cursorY += rowH;
  }

  // Séparateur + sell
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(x + 12, cursorY);
  ctx.lineTo(x + w - 12, cursorY);
  ctx.stroke();
  cursorY += 8;

  const refund = Math.floor(turret.totalInvested * SELL_RATIO);
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

  // Close button
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

  game.ui.panelRects = rects;
}

function formatTurretStatPreview(turret, stat) {
  const u = turret.upgrades;
  const lvl = u[stat.id] || 0;
  const lvlNext = Math.min(lvl + 1, MAX_UPGRADE_LEVEL);
  const fmt = (v) => Number(v).toFixed(stat.id === "shootRate" ? 2 : 0);

  switch (stat.id) {
    case "health": {
      const cur = TURRET_TYPE.hp * statMultiplier(lvl, 0.25);
      const next = TURRET_TYPE.hp * statMultiplier(lvlNext, 0.25);
      return `${fmt(cur)} → ${fmt(next)} PV`;
    }
    case "shootRate": {
      const cur = TURRET_TYPE.attackInterval / statMultiplier(lvl, 0.18);
      const next = TURRET_TYPE.attackInterval / statMultiplier(lvlNext, 0.18);
      return `${fmt(cur)}s → ${fmt(next)}s / tir`;
    }
    case "range": {
      const cur = TURRET_TYPE.range * statMultiplier(lvl, 0.12);
      const next = TURRET_TYPE.range * statMultiplier(lvlNext, 0.12);
      return `${fmt(cur)} → ${fmt(next)} px`;
    }
    case "power": {
      const cur = TURRET_TYPE.damage * statMultiplier(lvl, 0.22);
      const next = TURRET_TYPE.damage * statMultiplier(lvlNext, 0.22);
      return `${fmt(cur)} → ${fmt(next)} dégâts`;
    }
    default:
      return "";
  }
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
  const isPlayer = side === mySide();
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
    const isHover = hover && hover.side === mySide() && hover.idx === i;
    const canAfford = game[mySide()].money >= TURRET_TYPE.cost;

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

// Curseur de visée pendant le mode aim — bande verticale qui montre où la foudre frappera
function drawLightningAim(ctx) {
  if (!game.lightningAiming) return;
  // Position cible = mouseWorld.x (clampé pour rester dans la zone valide)
  const margin = LIGHTNING_KILL_HALF_WIDTH;
  const x = Math.max(margin, Math.min(CONFIG.W - margin, game.ui.mouse.x));
  const y1 = CONFIG.HUD_H + 20;
  const y2 = CONFIG.H - 20;
  const t = (performance.now() / 250) % (Math.PI * 2);
  const pulse = 0.55 + 0.25 * Math.sin(t); // léger pulse

  ctx.save();
  // Bande létale (jaune semi-transparent)
  ctx.fillStyle = `rgba(251, 191, 36, ${0.18 * pulse})`;
  ctx.fillRect(x - LIGHTNING_KILL_HALF_WIDTH, y1, LIGHTNING_KILL_HALF_WIDTH * 2, y2 - y1);
  // Bords de la zone
  ctx.strokeStyle = `rgba(251, 191, 36, ${0.85 * pulse})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x - LIGHTNING_KILL_HALF_WIDTH, y1, LIGHTNING_KILL_HALF_WIDTH * 2, y2 - y1);
  ctx.setLineDash([]);
  // Crosshair au centre
  ctx.strokeStyle = "rgba(251, 191, 36, 0.95)";
  ctx.lineWidth = 2;
  const cy = (y1 + y2) / 2;
  ctx.beginPath();
  ctx.moveTo(x - 14, cy); ctx.lineTo(x - 4, cy);
  ctx.moveTo(x + 4, cy);  ctx.lineTo(x + 14, cy);
  ctx.moveTo(x, cy - 14); ctx.lineTo(x, cy - 4);
  ctx.moveTo(x, cy + 4);  ctx.lineTo(x, cy + 14);
  ctx.stroke();
  // Cercle central
  ctx.beginPath();
  ctx.arc(x, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(251, 191, 36, 1)";
  ctx.fill();
  ctx.restore();
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
  ctx.fillText("DIFFICULTÉ", cx, 230);

  const diffBtnW = 180, diffBtnH = 72, diffGap = 14;
  const diffTotalW = 3 * diffBtnW + 2 * diffGap;
  const diffStartX = cx - diffTotalW / 2;
  const diffY = 250;
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
    wrapText(ctx, preset.desc, rect.x + rect.w / 2, rect.y + 50, rect.w - 16, 13);
  }

  // ── BIOME ──
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BIOME", cx, 340);

  const biomeBtnW = 130, biomeBtnH = 56, biomeGap = 14;
  const biomeTotalW = 3 * biomeBtnW + 2 * biomeGap;
  const biomeStartX = cx - biomeTotalW / 2;
  const biomeY = 354;
  const biomeOrder = ["desert", "jungle", "snow"];
  const biomeEmoji = { desert: "🏜️", jungle: "🌴", snow: "❄️" };
  const biomeRects = [];

  for (const [i, key] of biomeOrder.entries()) {
    const rect = { x: biomeStartX + i * (biomeBtnW + biomeGap), y: biomeY, w: biomeBtnW, h: biomeBtnH };
    biomeRects.push({ rect, key });
    const isActive = game.biome === key;
    const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
    ctx.fillStyle = isActive ? "rgba(59, 130, 246, 0.32)"
                              : (isHover ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)");
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.fill();
    ctx.strokeStyle = isActive ? COLORS.player : "rgba(255,255,255,0.15)";
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "22px -apple-system, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(biomeEmoji[key], rect.x + rect.w / 2, rect.y + 22);
    ctx.font = "bold 13px -apple-system, sans-serif";
    ctx.fillText(BIOME_LABELS[key], rect.x + rect.w / 2, rect.y + 42);
  }

  // ── BOUTONS JOUER (Solo / Multijoueur) ──
  const playH = 60;
  const playW = 230;
  const playGap = 18;
  const playTotalW = 2 * playW + playGap;
  const playStartX = cx - playTotalW / 2;
  const playY = 432;
  const playRect = { x: playStartX, y: playY, w: playW, h: playH };
  const playMpRect = { x: playStartX + playW + playGap, y: playY, w: playW, h: playH };

  function drawPlayBtn(rect, label, sub, baseColor, baseColorDark) {
    const hover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
    ctx.fillStyle = hover ? baseColor : baseColorDark;
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
    ctx.fill();
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (hover) {
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 - 8);
    ctx.font = "11px -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillText(sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 14);
  }

  drawPlayBtn(playRect, "▶  SOLO", "Joue contre un bot", COLORS.player, COLORS.playerDark);
  drawPlayBtn(playMpRect, "👥  MULTIJOUEUR", "Affronte un autre joueur", COLORS.enemy, COLORS.enemyDark || "rgba(220,38,38,0.4)");

  // ── SETTINGS AUDIO ──
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("PARAMÈTRES", cx, 528);

  const togW = 180, togH = 40, togGap = 16;
  const totalTogW = 2 * togW + togGap;
  const togStartX = cx - totalTogW / 2;
  const togY = 544;
  const musicRect = { x: togStartX, y: togY, w: togW, h: togH };
  const sfxRect = { x: togStartX + togW + togGap, y: togY, w: togW, h: togH };
  drawToggleButton(ctx, musicRect, "🎵 Musique", audio.musicEnabled);
  drawToggleButton(ctx, sfxRect, "🔊 Effets", audio.sfxEnabled);

  // ── CONTRÔLES ──
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Souris bord G/D pour scroller — ← → / A D — H / E pour recadrer — Échap pour annuler — 1-5 sélection bâtiment", cx, 612);

  // ── BANDEAU AUTH / PROFIL (cliquable HTML hors canvas idéalement, ici on dessine et on intercepte les clics)
  const profile = window.RE_AUTH?.profile;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "13px -apple-system, sans-serif";
  ctx.textAlign = "center";
  if (profile) {
    ctx.fillText(`👤 ${profile.username || "joueur"}  ·  💰 ${profile.currency} global  ·  équipe : ${window.RE_AUTH?.skin?.name || "bleu défaut"}`, cx, 640);
  } else {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.fillText("Tu joues en invité — connecte-toi pour gagner de la monnaie et débloquer des skins.", cx, 640);
  }

  // Liens cliquables
  const linkY = 672;
  const linksData = profile
    ? [
        { label: "🛍️ Boutique", url: "/shop/" },
        { label: "🎯 Missions", url: "/missions/" },
        { label: "👤 Profil",   url: "/profile/" },
        ...(profile.is_admin ? [{ label: "⚙️ Admin", url: "/admin/" }] : []),
        { label: "↪ Déconnexion", action: "signout" },
      ]
    : [
        { label: "🔐 Se connecter", url: "/auth/login.html" },
        { label: "🆕 Créer un compte", url: "/auth/signup.html" },
      ];
  const linkRects = [];
  ctx.font = "bold 12px -apple-system, sans-serif";
  // Mesure et place
  const padX = 14;
  const linkH = 28;
  let totalW = 0;
  for (const l of linksData) totalW += ctx.measureText(l.label).width + padX * 2 + 8;
  let lx = cx - totalW / 2;
  for (const l of linksData) {
    const w = ctx.measureText(l.label).width + padX * 2;
    const rect = { x: lx, y: linkY - linkH / 2, w, h: linkH, ...l };
    const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
    ctx.fillStyle = isHover ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.08)";
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.strokeStyle = isHover ? COLORS.player : "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(l.label, lx + w / 2, linkY);
    linkRects.push(rect);
    lx += w + 8;
  }

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("github.com/GuestElite/robotic-emergence", cx, CONFIG.H - 12);

  game.ui.menuRects = { diff: diffRects, biome: biomeRects, play: playRect, playMp: playMpRect, music: musicRect, sfx: sfxRect, links: linkRects };
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

  const win = game.gameOver.winner === mySide();
  const title = win ? "VICTOIRE !" : "DÉFAITE";
  let subtitle = win
    ? "La base adverse est tombée."
    : "Ta base a été détruite.";
  if (game.gameOver.reason === "opponent_left") {
    subtitle = "L'adversaire a quitté la partie.";
  }
  // Récompense Supabase si dispo
  if (game.gameOver.reward != null) {
    subtitle += `  · +${game.gameOver.reward} 💰 ajoutés à ton solde`;
  } else if (!window.RE_AUTH?.session) {
    subtitle += "  · (invité — aucune monnaie attribuée)";
  }

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

  // Bouton "Rejouer" (masqué en multijoueur)
  const isMp = game.mode === "mp";
  const btnW = 180;
  const btnH = 52;
  const gap = 16;
  const totalW = isMp ? btnW : btnW * 2 + gap;
  const startX = (CONFIG.CANVAS_W - totalW) / 2;
  const btnY = CONFIG.H - 90;
  if (isMp) {
    game.ui.replayBtn = null;
    game.ui.gameOverMenuBtn = { x: startX, y: btnY, w: btnW, h: btnH };
  } else {
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
  }

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

  // Argent du joueur courant (toujours à gauche, peu importe MP host/guest)
  const mineForHud = mySide();
  const oppForHud = oppSide();
  ctx.fillStyle = mineForHud === "player" ? COLORS.player : COLORS.enemy;
  ctx.font = "bold 20px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`💰 ${game[mineForHud].money}`, 20, CONFIG.HUD_H / 2 - 8);

  // Solde global (currency Supabase) + username sous le solde de partie
  const profile = window.RE_AUTH?.profile;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.fillStyle = COLORS.hudMuted;
  if (profile) {
    const mpTag = (game.mode === "mp" && game.mp?.role) ? ` · ${game.mp.role === "host" ? "Hôte" : "Invité"}` : "";
    ctx.fillText(`👤 ${profile.username || "joueur"} · 💰 ${profile.currency} global${mpTag}`, 20, CONFIG.HUD_H / 2 + 10);
  } else {
    ctx.fillText("invité — connecte-toi pour gagner", 20, CONFIG.HUD_H / 2 + 10);
  }

  // Boutons "Construire" (mode build) + bouton spécial éclair
  drawBuildButtons(ctx);
  drawLightningButton(ctx);
  drawSettingsButton(ctx);

  // Argent de l'adversaire (droite). En MP on ajoute son pseudo.
  ctx.fillStyle = oppForHud === "player" ? COLORS.player : COLORS.enemy;
  ctx.textAlign = "right";
  ctx.fillText(`${game[oppForHud].money} 💰`, CONFIG.CANVAS_W - 20, CONFIG.HUD_H / 2 - 8);
  if (game.mode === "mp" && game.mp?.opponent?.username) {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.fillText(`👤 ${game.mp.opponent.username}`, CONFIG.CANVAS_W - 20, CONFIG.HUD_H / 2 + 10);
  }

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
    const sel = game.ui.selectedBuildType;
    const t = FACTORY_TYPES[sel];
    const isTurret = sel === "turret";
    const label = isTurret ? "turret" : (t ? t.label.toLowerCase() : sel);
    const where = isTurret ? "sur le rempart" : "vide";
    ctx.fillStyle = COLORS.player;
    ctx.font = "11px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      `→ Clique un emplacement ${where} pour poser une ${label} (Échap pour annuler)`,
      150,
      CONFIG.HUD_H - 8
    );
  }
}

function drawBuildButtons(ctx) {
  const ICONS = { light: "🏭", heavy: "🏭", swarmer: "🏭", sniper: "🏭", air: "✈️", turret: "🗼" };
  let hoveredBtn = null;
  for (const btn of game.ui.buttons) {
    const isTurret = btn.type === "turret";
    const cost = isTurret ? TURRET_TYPE.cost : FACTORY_TYPES[btn.type].cost;
    const label = isTurret ? "Turret" : FACTORY_TYPES[btn.type].label;
    const icon = ICONS[btn.type] || "🏭";

    const isActive = game.ui.selectedBuildType === btn.type;
    const canAfford = game[mySide()].money >= cost;
    const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, btn);
    if (isHover) hoveredBtn = btn;

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

  // Tooltip de caractéristiques au survol — affiché après les boutons
  // pour passer par-dessus la rangée et toujours rester lisible.
  if (hoveredBtn) drawBuildButtonTooltip(ctx, hoveredBtn);
}

// Construit la liste des lignes (label + valeur) à afficher pour un type de bâtiment donné.
function buildTooltipRows(type) {
  const rows = [];
  if (type === "turret") {
    const t = TURRET_TYPE;
    rows.push({ label: "Type", value: "Tourelle (rempart)" });
    rows.push({ label: "PV", value: String(t.hp) });
    rows.push({ label: "Dégâts", value: String(t.damage) });
    rows.push({ label: "Portée", value: `${t.range} px` });
    rows.push({ label: "Cadence", value: `1 tir / ${t.attackInterval}s` });
    rows.push({ label: "Cible", value: "Sol uniquement" });
    return rows;
  }
  const factory = FACTORY_TYPES[type];
  const unit = UNIT_TYPES[factory?.unitType];
  if (!factory || !unit) return rows;
  rows.push({ label: "Usine PV", value: String(factory.hp) });
  rows.push({ label: "Cadence prod", value: `1 unité / ${factory.prodInterval}s` });
  rows.push({ label: "Unité PV", value: String(unit.hp) });
  rows.push({ label: "Dégâts", value: String(unit.damage) });
  rows.push({ label: "Portée", value: `${unit.range} px` });
  rows.push({ label: "Cadence tir", value: `1 tir / ${unit.attackInterval}s` });
  rows.push({ label: "Vitesse", value: `${unit.speed} px/s` });
  rows.push({ label: "Couche", value: unit.layer === "air" ? "Aérienne ✈️" : "Sol 🚜" });
  let targets = unit.layer === "air" ? "Sol + Air" : (unit.canTargetAir ? "Sol + Air" : "Sol uniquement");
  rows.push({ label: "Cibles", value: targets });
  rows.push({ label: "Récompense", value: `+${unit.killReward} 💰 par kill` });
  return rows;
}

function drawBuildButtonTooltip(ctx, btn) {
  const rows = buildTooltipRows(btn.type);
  if (rows.length === 0) return;

  const factory = FACTORY_TYPES[btn.type];
  const title = btn.type === "turret" ? "Tourelle" : (factory ? factory.label : btn.type);

  // Dimensions
  const padX = 12, padY = 10, lineH = 16, headerH = 20;
  ctx.save();
  ctx.font = "bold 13px -apple-system, sans-serif";
  let maxW = ctx.measureText(title).width;
  ctx.font = "12px -apple-system, sans-serif";
  for (const r of rows) {
    const lineW = ctx.measureText(`${r.label} : ${r.value}`).width;
    if (lineW > maxW) maxW = lineW;
  }
  ctx.restore();

  const boxW = Math.ceil(maxW) + padX * 2;
  const boxH = headerH + rows.length * lineH + padY * 2;

  // Position : sous le bouton, calée sur son centre, clampée dans le canvas
  let x = Math.round(btn.x + btn.w / 2 - boxW / 2);
  let y = Math.round(btn.y + btn.h + 8);
  if (x < 6) x = 6;
  if (x + boxW > CONFIG.CANVAS_W - 6) x = CONFIG.CANVAS_W - 6 - boxW;
  if (y + boxH > CONFIG.H - 6) y = btn.y - boxH - 8; // bascule au-dessus si manque de place

  ctx.save();
  // Petit triangle pointant vers le bouton (uniquement si tooltip en dessous)
  if (y > btn.y + btn.h) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
    const tipX = Math.max(x + 18, Math.min(x + boxW - 18, btn.x + btn.w / 2));
    ctx.beginPath();
    ctx.moveTo(tipX - 8, y);
    ctx.lineTo(tipX + 8, y);
    ctx.lineTo(tipX, y - 7);
    ctx.closePath();
    ctx.fill();
  }

  // Boîte
  ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
  roundedRect(ctx, x, y, boxW, boxH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(59, 130, 246, 0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Titre
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(title, x + padX, y + padY + 12);

  // Séparateur sous le titre
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(x + padX, y + padY + headerH);
  ctx.lineTo(x + boxW - padX, y + padY + headerH);
  ctx.stroke();

  // Lignes label : valeur
  ctx.font = "12px -apple-system, sans-serif";
  let cy = y + padY + headerH + 2;
  for (const r of rows) {
    cy += lineH;
    ctx.fillStyle = COLORS.hudMuted;
    ctx.textAlign = "left";
    ctx.fillText(r.label, x + padX, cy);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    ctx.fillText(r.value, x + boxW - padX, cy);
  }
  ctx.restore();
}

function drawSettingsButton(ctx) {
  const btnX = 130 + 6 * (100 + 4) + 12 + 110 + 10;
  const btnY = 12;
  const btnW = 36;
  const btnH = 36;
  game.ui.settingsBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
  const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, game.ui.settingsBtn);

  ctx.fillStyle = isHover ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)";
  roundedRect(ctx, btnX, btnY, btnW, btnH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const cx = btnX + btnW / 2;
  const cy = btnY + btnH / 2;
  ctx.strokeStyle = isHover ? "#fff" : "#cbd5e1";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
    ctx.lineTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = isHover ? "#fff" : "#cbd5e1";
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawSettingsPanel(ctx) {
  if (!game.ui.settingsOpen) { game.ui.settingsRects = null; return; }

  const PW = 360;
  // Hauteur augmentée si on est en partie (pour caser le bouton "Quitter la partie")
  const inGame = game.screen === "playing" && !game.gameOver;
  const PH = inGame ? 360 : 280;
  const px = (CONFIG.CANVAS_W - PW) / 2;
  const py = (CONFIG.H - PH) / 2;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "rgba(15, 20, 25, 0.97)";
  roundedRect(ctx, px, py, PW, PH, 12);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = COLORS.player;
  ctx.lineWidth = 2;
  roundedRect(ctx, px, py, PW, PH, 12);
  ctx.stroke();

  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 17px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Paramètres audio", px + PW / 2, py + 16);

  const closeRect = { x: px + PW - 32, y: py + 10, w: 24, h: 24 };
  const closeHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, closeRect);
  ctx.fillStyle = closeHover ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)";
  roundedRect(ctx, closeRect.x, closeRect.y, closeRect.w, closeRect.h, 5);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 16px -apple-system, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("×", closeRect.x + closeRect.w / 2, closeRect.y + closeRect.h / 2);

  // Music
  let yy = py + 64;
  const musicToggle = { x: px + 24, y: yy, w: 100, h: 36 };
  drawAudioToggle(ctx, musicToggle, "🎵 Musique", audio.musicEnabled);
  const musicSlider = drawAudioSlider(ctx, px + 140, yy + 8, 180, audio.musicVolume, audio.musicEnabled);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(`${Math.round(audio.musicVolume * 100)}%`, px + PW - 24, yy + 38);

  // SFX
  yy = py + 130;
  const sfxToggle = { x: px + 24, y: yy, w: 100, h: 36 };
  drawAudioToggle(ctx, sfxToggle, "🔊 Effets", audio.sfxEnabled);
  const sfxSlider = drawAudioSlider(ctx, px + 140, yy + 8, 180, audio.sfxVolume, audio.sfxEnabled);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(audio.sfxVolume * 100)}%`, px + PW - 24, yy + 38);

  // Bouton "Quitter la partie" (visible uniquement en jeu)
  let quitRect = null;
  if (inGame) {
    // Séparateur
    const sepY = py + 196;
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 20, sepY);
    ctx.lineTo(px + PW - 20, sepY);
    ctx.stroke();

    quitRect = { x: px + 24, y: py + 212, w: PW - 48, h: 44 };
    const quitHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, quitRect);
    ctx.fillStyle = quitHover ? "rgba(239, 68, 68, 0.45)" : "rgba(239, 68, 68, 0.25)";
    roundedRect(ctx, quitRect.x, quitRect.y, quitRect.w, quitRect.h, 8);
    ctx.fill();
    ctx.strokeStyle = COLORS.enemy;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("☰  Quitter la partie", quitRect.x + quitRect.w / 2, quitRect.y + quitRect.h / 2);

    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("Retour au menu principal — la partie en cours est abandonnée", px + PW / 2, quitRect.y + quitRect.h + 8);
  }

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("Échap pour fermer · clique ou glisse le curseur du volume", px + PW / 2, py + PH - 14);

  game.ui.settingsRects = {
    panel: { x: px, y: py, w: PW, h: PH },
    close: closeRect,
    musicToggle, sfxToggle,
    musicSlider, sfxSlider,
    quit: quitRect,
  };
}

function drawAudioToggle(ctx, rect, label, on) {
  const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
  ctx.fillStyle = on
    ? (isHover ? "rgba(34, 197, 94, 0.45)" : "rgba(34, 197, 94, 0.30)")
    : (isHover ? "rgba(239, 68, 68, 0.35)" : "rgba(239, 68, 68, 0.22)");
  roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
  ctx.fill();
  ctx.strokeStyle = on ? COLORS.hpGood : COLORS.enemy;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function drawAudioSlider(ctx, x, y, width, value, enabled) {
  const trackH = 8;
  const knobR = 8;
  const trackY = y + 10;
  ctx.fillStyle = enabled ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)";
  roundedRect(ctx, x, trackY, width, trackH, 4);
  ctx.fill();
  const fillW = width * value;
  ctx.fillStyle = enabled ? COLORS.player : "rgba(100,116,139,0.45)";
  roundedRect(ctx, x, trackY, fillW, trackH, 4);
  ctx.fill();
  const knobX = x + fillW;
  const knobY = trackY + trackH / 2;
  ctx.fillStyle = enabled ? "#fff" : "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(knobX, knobY, knobR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = enabled ? COLORS.player : "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  for (const t of [0.25, 0.5, 0.75]) {
    const tx = x + width * t;
    ctx.fillRect(tx - 0.5, trackY - 2, 1, trackH + 4);
  }
  return { x, y: trackY - 6, w: width, h: trackH + 12 };
}

function drawLightningButton(ctx) {
  const btnW = 110;
  const btnH = 36;
  const btnX = 130 + 6 * (100 + 4) + 12;
  const btnY = 12;
  game.ui.lightningBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

  const myCd = lightningCdFor(mySide());
  const ready = myCd <= 0;
  const aiming = game.lightningAiming;
  const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, game.ui.lightningBtn);

  ctx.save();
  if (aiming) {
    // Mode visée actif : pulse fort, couleur saturée
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
    ctx.fillStyle = `rgba(251, 191, 36, ${0.55 + 0.25 * pulse})`;
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 18 + 8 * pulse;
  } else if (ready) {
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
  ctx.fillStyle = (ready || aiming) ? "#fff" : COLORS.hudMuted;
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (aiming) {
    ctx.fillText("⚡ Visez…", btnX + btnW / 2, btnY + btnH / 2);
  } else if (ready) {
    ctx.fillText("⚡ Éclair", btnX + btnW / 2, btnY + btnH / 2);
  } else {
    ctx.fillText(`⚡ ${Math.ceil(myCd)}s`, btnX + btnW / 2, btnY + btnH / 2);
  }

  // Barre de progression du cooldown (en bas du bouton)
  if (!ready) {
    const ratio = 1 - myCd / LIGHTNING_COOLDOWN_SEC;
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
  if (!state || !state.slots) return -1;
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
    game.ui.hoverUnit = null;
    game.ui.draggingSlider = null;
  });

  canvas.addEventListener("mousedown", (evt) => {
    if (!game.ui.settingsOpen || !game.ui.settingsRects) return;
    const { x, y } = canvasCoordsFromEvent(canvas, evt);
    const sr = game.ui.settingsRects;
    if (pointInRect(x, y, sr.musicSlider)) game.ui.draggingSlider = "music";
    else if (pointInRect(x, y, sr.sfxSlider)) game.ui.draggingSlider = "sfx";
  });

  window.addEventListener("mouseup", () => {
    if (game.ui.draggingSlider) {
      saveSettings();
      game.ui.draggingSlider = null;
    }
  });

  canvas.addEventListener("mousemove", (evt) => {
    const { x, y } = canvasCoordsFromEvent(canvas, evt);
    game.ui.mouseScreen.x = x;
    game.ui.mouseScreen.y = y;
    game.ui.mouseInside = true;

    // Drag actif → met à jour le volume en live
    if (game.ui.draggingSlider && game.ui.settingsRects) {
      const sr = game.ui.settingsRects;
      const slider = game.ui.draggingSlider === "music" ? sr.musicSlider : sr.sfxSlider;
      const v = Math.max(0, Math.min(1, (x - slider.x) / slider.w));
      if (game.ui.draggingSlider === "music") audio.setMusicVolume(v);
      else audio.setSfxVolume(v);
    }

    // Coordonnées monde (pour hover slots/factories)
    const wx = x + game.camera.x;
    const wy = y;
    game.ui.mouse.x = wx;
    game.ui.mouse.y = wy;

    if (game.gameOver) {
      game.ui.hoverSlot = null;
      return;
    }

    // Hover slots sur les 2 sides (le panneau lecture seule fonctionne aussi pour l'adversaire)
    const meHov = mySide();
    const oppHov = oppSide();
    let idx = findSlotAt(meHov, wx, wy);
    if (idx >= 0) {
      game.ui.hoverSlot = { side: meHov, slotIndex: idx };
    } else {
      idx = findSlotAt(oppHov, wx, wy);
      game.ui.hoverSlot = idx >= 0 ? { side: oppHov, slotIndex: idx } : null;
    }

    // Hover wall slot (côté joueur courant uniquement, pour placement turret)
    game.ui.hoverWallSlot = null;
    if (game.ui.selectedBuildType === "turret") {
      const wallSlots = game[meHov].wallSlots || [];
      for (let i = 0; i < wallSlots.length; i++) {
        const s = wallSlots[i];
        if (wx >= s.x && wx <= s.x + s.w && wy >= s.y && wy <= s.y + s.h) {
          game.ui.hoverWallSlot = { side: meHov, idx: i };
          break;
        }
      }
    }

    // Hover unité (mobile ou turret) : on retient la plus proche dans son rayon.
    // Sert à dessiner son cercle de portée de tir au-dessus du monde.
    game.ui.hoverUnit = null;
    if (Array.isArray(game.units)) {
      let best = null;
      let bestD2 = Infinity;
      for (const u of game.units) {
        if (!u || u.hp <= 0 || !u.stats) continue;
        const r = (u.stats.radius || 8) + 4; // marge pour faciliter le hover
        const dx = wx - u.x;
        const dy = wy - u.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r * r && d2 < bestD2) { best = u; bestD2 = d2; }
      }
      game.ui.hoverUnit = best;
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
      // Biome
      if (mr.biome) {
        for (const b of mr.biome) {
          if (pointInRect(sx, sy, b.rect)) {
            if (b.key !== game.biome) {
              audio.playSFX("click");
              applyBiome(b.key).then(saveSettings);
            }
            return;
          }
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
      // Liens du bandeau auth (shop / missions / profil / admin / login / signup / signout)
      if (mr.links) {
        for (const link of mr.links) {
          if (pointInRect(sx, sy, link)) {
            audio.playSFX("click");
            if (link.action === "signout") {
              window.RE_AUTH?.signOut();
            } else if (link.url) {
              window.location.href = link.url;
            }
            return;
          }
        }
      }
      // Play SOLO
      if (pointInRect(sx, sy, mr.play)) {
        audio.playSFX("click");
        startGame(game.difficulty);
        return;
      }
      // Play MULTIJOUEUR
      if (mr.playMp && pointInRect(sx, sy, mr.playMp)) {
        audio.playSFX("click");
        startMultiplayer();
        return;
      }
      return;
    }

    // Salle d'attente / lobby
    if (game.screen === "lobby") {
      const lr = game.ui.lobbyRects;
      const page = game.ui.lobbyPage || "choice";
      if (!lr) return;

      if (page === "choice") {
        if (lr.choiceCreate && pointInRect(sx, sy, lr.choiceCreate)) {
          audio.playSFX("click");
          mpCreateRoom();
          return;
        }
        if (lr.choiceJoin && pointInRect(sx, sy, lr.choiceJoin)) {
          audio.playSFX("click");
          game.ui.lobbyPage = "join";
          game.ui.codeInput = "";
          game.ui.codeInputError = null;
          return;
        }
        if (lr.back && pointInRect(sx, sy, lr.back)) {
          audio.playSFX("click");
          cancelMultiplayer();
          return;
        }
      } else if (page === "join") {
        if (lr.joinOk && pointInRect(sx, sy, lr.joinOk)) {
          audio.playSFX("click");
          mpJoinByCode(game.ui.codeInput);
          return;
        }
        if (lr.back && pointInRect(sx, sy, lr.back)) {
          audio.playSFX("click");
          game.ui.lobbyPage = "choice";
          game.ui.codeInputError = null;
          return;
        }
      } else if (page === "room") {
        if (lr.ready && pointInRect(sx, sy, lr.ready)) {
          const hasOpp = !!(game.mp?.opponent?.username);
          if (!hasOpp) return; // pas de prêt sans adversaire
          audio.playSFX("click");
          mpToggleReady();
          return;
        }
        if (lr.copy && pointInRect(sx, sy, lr.copy) && game.mp?.code) {
          audio.playSFX("click");
          try {
            navigator.clipboard.writeText(game.mp.code);
            game.ui.codeCopied = true;
            setTimeout(() => { game.ui.codeCopied = false; }, 1500);
          } catch {}
          return;
        }
        if (lr.leave && pointInRect(sx, sy, lr.leave)) {
          audio.playSFX("click");
          cancelMultiplayer();
          return;
        }
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
      const sel = game.ui.upgradePanel;
      const isTurretPanel = sel.type === "turret";

      if (pr.close && pointInRect(sx, sy, pr.close)) {
        game.ui.upgradePanel = null;
        return;
      }
      const mineSide = mySide();
      const isGuestMp = game.mode === "mp" && game.mp?.role === "guest";
      if (sel.side === mineSide && pr.sell && pointInRect(sx, sy, pr.sell)) {
        if (isGuestMp) {
          if (isTurretPanel) window.RE_MP.sendInput({ type: "sell_turret", wallSlotIndex: sel.index });
          else window.RE_MP.sendInput({ type: "sell_factory", slotIndex: sel.slotIndex });
          audio.playSFX("sell");
          game.ui.upgradePanel = null;
        } else {
          const refund = isTurretPanel
            ? sellTurret(mineSide, sel.index)
            : sellFactory(mineSide, sel.slotIndex);
          if (refund !== false) game.ui.upgradePanel = null;
        }
        return;
      }
      if (sel.side === mineSide && pr.upgrades) {
        for (const u of pr.upgrades) {
          if (pointInRect(sx, sy, u.rect)) {
            if (isGuestMp) {
              if (isTurretPanel) window.RE_MP.sendInput({ type: "upgrade_turret", wallSlotIndex: sel.index, statId: u.statId });
              else window.RE_MP.sendInput({ type: "upgrade_factory", slotIndex: sel.slotIndex, statId: u.statId });
              audio.playSFX("upgrade");
            } else {
              if (isTurretPanel) tryUpgradeTurret(mineSide, sel.index, u.statId);
              else tryUpgradeFactory(mineSide, sel.slotIndex, u.statId);
            }
            return;
          }
        }
      }
      if (!isTurretPanel && sel.side === mineSide && pr.mode) {
        if (pr.mode.attack && pointInRect(sx, sy, pr.mode.attack)) {
          const slot = game[mineSide].slots[sel.slotIndex];
          if (slot?.factory) slot.factory.mode = "attack";
          return;
        }
        if (pr.mode.defense && pointInRect(sx, sy, pr.mode.defense)) {
          const slot = game[mineSide].slots[sel.slotIndex];
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

    // 0bis) Panneau Settings ouvert
    if (game.ui.settingsOpen && game.ui.settingsRects) {
      const sr = game.ui.settingsRects;
      if (pointInRect(sx, sy, sr.close)) {
        game.ui.settingsOpen = false; saveSettings(); return;
      }
      if (sr.quit && pointInRect(sx, sy, sr.quit)) {
        audio.playSFX("click");
        game.ui.settingsOpen = false;
        saveSettings();
        goToMenu();
        return;
      }
      if (pointInRect(sx, sy, sr.musicToggle)) {
        audio.setMusicEnabled(!audio.musicEnabled);
        audio.playSFX("click"); saveSettings(); return;
      }
      if (pointInRect(sx, sy, sr.sfxToggle)) {
        audio.setSfxEnabled(!audio.sfxEnabled);
        audio.playSFX("click"); saveSettings(); return;
      }
      if (pointInRect(sx, sy, sr.musicSlider)) {
        audio.setMusicVolume((sx - sr.musicSlider.x) / sr.musicSlider.w);
        saveSettings(); return;
      }
      if (pointInRect(sx, sy, sr.sfxSlider)) {
        audio.setSfxVolume((sx - sr.sfxSlider.x) / sr.sfxSlider.w);
        audio.playSFX("click"); saveSettings(); return;
      }
      if (!pointInRect(sx, sy, sr.panel)) {
        game.ui.settingsOpen = false; saveSettings(); return;
      }
      return;
    }

    // 0ter) Bouton ⚙️ Settings
    if (game.ui.settingsBtn && pointInRect(sx, sy, game.ui.settingsBtn)) {
      game.ui.settingsOpen = true;
      audio.playSFX("click");
      return;
    }

    // 1) Bouton Éclair (coords ÉCRAN) ? → toggle du mode visée
    if (game.ui.lightningBtn && pointInRect(sx, sy, game.ui.lightningBtn)) {
      toggleLightningAim();
      audio.playSFX("click");
      return;
    }

    // 1bis) Pendant le mode visée : clic sur la map = tir, clic ailleurs = annule
    if (game.lightningAiming) {
      if (sy >= CONFIG.HUD_H) {
        if (game.mode === "mp" && game.mp?.role === "guest") {
          window.RE_MP.sendInput({ type: "lightning_fire", x: wx });
          // Côté guest, on a "consommé" l'aim — le host appliquera. On présume succès pour l'UX.
          game.lightningAiming = false;
        } else {
          fireLightningAt(wx, mySide());
        }
      } else {
        game.lightningAiming = false;
      }
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

    const me = mySide();
    const opp = oppSide();
    const isGuest = game.mode === "mp" && game.mp?.role === "guest";

    // 3) Wall slot du joueur courant — placement de turret OU ouverture du panneau si déjà construite
    {
      const wallSlots = game[me].wallSlots || [];
      for (let i = 0; i < wallSlots.length; i++) {
        const s = wallSlots[i];
        if (wx >= s.x && wx <= s.x + s.w && wy >= s.y && wy <= s.y + s.h) {
          if (s.turret) {
            game.ui.upgradePanel = { side: me, type: "turret", index: i };
            game.ui.selectedBuildType = null;
            return;
          }
          if (game.ui.selectedBuildType === "turret") {
            if (isGuest) {
              window.RE_MP.sendInput({ type: "build_turret", wallSlotIndex: i });
              audio.playSFX("place");
            } else {
              if (tryPlaceTurret(me, i)) {
                if (game[me].money < TURRET_TYPE.cost) game.ui.selectedBuildType = null;
              }
            }
            return;
          }
        }
      }
    }

    // 3bis) Wall slot adverse avec turret → panneau lecture seule
    {
      const wallSlots = game[opp].wallSlots || [];
      for (let i = 0; i < wallSlots.length; i++) {
        const s = wallSlots[i];
        if (s.turret && wx >= s.x && wx <= s.x + s.w && wy >= s.y && wy <= s.y + s.h) {
          game.ui.upgradePanel = { side: opp, type: "turret", index: i };
          return;
        }
      }
    }

    // 4) Click sur un slot du joueur courant (coords MONDE)
    const mySlotIdx = findSlotAt(me, wx, wy);
    if (mySlotIdx >= 0) {
      const slot = game[me].slots[mySlotIdx];
      if (game.ui.selectedBuildType && FACTORY_TYPES[game.ui.selectedBuildType]
          && !slot.factory && !slot.isPath) {
        if (isGuest) {
          window.RE_MP.sendInput({ type: "build_factory", slotIndex: mySlotIdx, typeId: game.ui.selectedBuildType });
          audio.playSFX("place");
          // On présume succès côté UX, l'auto-reset du selected sera repris quand snap reviendra
        } else {
          const placed = tryPlaceFactory(me, mySlotIdx, game.ui.selectedBuildType);
          if (placed) {
            const type = FACTORY_TYPES[game.ui.selectedBuildType];
            if (game[me].money < type.cost) game.ui.selectedBuildType = null;
          }
        }
        return;
      }
      if (slot.factory) {
        game.ui.upgradePanel = { side: me, type: "factory", slotIndex: mySlotIdx };
        game.ui.selectedBuildType = null;
        return;
      }
    }

    // 5) Click sur une factory adverse → lecture seule
    const oppSlotIdx = findSlotAt(opp, wx, wy);
    if (oppSlotIdx >= 0) {
      const slot = game[opp].slots[oppSlotIdx];
      if (slot.factory) {
        game.ui.upgradePanel = { side: opp, type: "factory", slotIndex: oppSlotIdx };
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
    if (game.screen === "lobby") {
      const page = game.ui.lobbyPage || "choice";
      if (evt.key === "Escape") {
        if (page === "choice") cancelMultiplayer();
        else if (page === "join") { game.ui.lobbyPage = "choice"; game.ui.codeInputError = null; }
        else if (page === "room") cancelMultiplayer();
        return;
      }
      if (page === "join") {
        if (evt.key === "Enter") {
          mpJoinByCode(game.ui.codeInput);
          return;
        }
        if (evt.key === "Backspace") {
          game.ui.codeInput = (game.ui.codeInput || "").slice(0, -1);
          game.ui.codeInputError = null;
          return;
        }
        // alphanumerique seulement, max 6 caractères
        if (evt.key && evt.key.length === 1 && /^[a-zA-Z0-9]$/.test(evt.key)) {
          const cur = game.ui.codeInput || "";
          if (cur.length < 6) {
            game.ui.codeInput = (cur + evt.key.toUpperCase());
            game.ui.codeInputError = null;
          }
          return;
        }
      } else if (page === "room") {
        if (evt.key === "Enter" || evt.key === " ") {
          if (game.mp?.opponent?.username) mpToggleReady();
        }
      } else if (page === "choice") {
        if (evt.key === "1") mpCreateRoom();
        if (evt.key === "2") { game.ui.lobbyPage = "join"; game.ui.codeInput = ""; game.ui.codeInputError = null; }
      }
      return;
    }
    if (game.gameOver) {
      if ((evt.key === "Enter" || evt.key === " ") && game.mode !== "mp") startGame(game.difficulty);
      if (evt.key === "Escape" || evt.key === "m") goToMenu();
      return;
    }
    if (evt.key === "Escape") {
      if (game.ui.settingsOpen) {
        game.ui.settingsOpen = false;
        saveSettings();
      } else {
        game.ui.selectedBuildType = null;
        game.ui.upgradePanel = null;
      }
    }
    const keyMap = { "1": "light", "2": "heavy", "3": "swarmer", "4": "sniper", "5": "air", "6": "turret" };
    if (keyMap[evt.key]) {
      const t = keyMap[evt.key];
      game.ui.selectedBuildType = game.ui.selectedBuildType === t ? null : t;
    }
    // Éclair → toggle du mode visée (puis clic sur la map pour tirer)
    if (evt.key === "l" || evt.key === "L") {
      toggleLightningAim();
    }
    // Echap → annule le mode visée
    if (evt.key === "Escape" && game.lightningAiming) {
      game.lightningAiming = false;
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
  // Props biome-specific : chaque biome a sa liste de props (22 environ).
  const biomeProps = PROP_POSITIONS_BY_BIOME[game.biome] || [];
  game.props = biomeProps.map((p) => ({
    type: p.type, x: p.x, y: p.y, def: PROP_TYPES[p.type],
  }));
  game.attackFx = [];
  game.projectiles = [];
  game.flashes = [];
  game.explosions = [];
  game.lightning = null;
  game.lightningCooldown = 0;
  if (game.mp) {
    game.mp.enemyLightningCooldown = 0;
    game.mp.snapAccum = 0;
  }
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
  // Solo : on s'assure de quitter un éventuel canal multijoueur résiduel.
  if (game.mp && window.RE_MP) {
    try { window.RE_MP.leave(); } catch {}
    game.mp = null;
  }
  game.mode = "solo";
  applyTeamSkin(); // applique le skin courant aux COLORS.player avant resetGame
  resetGame();
  game.screen = "playing";
  saveSettings();
  audio.startMusic();
}

function goToMenu() {
  game.screen = "menu";
  game.gameOver = null;
  audio.stopMusic();
  // Si on revient au menu depuis un lobby/partie multi, on quitte proprement le canal
  if (game.mp && window.RE_MP) {
    try { window.RE_MP.leave(); } catch {}
    game.mp = null;
  }
  game.mode = "solo";
}

// -------------------------------------------------------------
// Multijoueur — orchestration côté client (lobby + sync via Realtime)
// -------------------------------------------------------------

// Entrée dans le mode multijoueur : passe au menu "Créer ou Rejoindre un salon".
function startMultiplayer() {
  if (!window.RE_MP) {
    flashLobbyMessage("Multijoueur indisponible — recharge la page.", "error");
    return;
  }
  const profile = window.RE_AUTH?.profile;
  if (!profile) {
    window.location.href = "/auth/login.html?next=/prototype/";
    return;
  }

  game.mode = "mp";
  game.mp = {
    role: null,
    lobbyId: null,
    code: null,
    opponent: null,
    status: "idle",
    hostReady: false,
    guestReady: false,
    snapAccum: 0,
  };
  game.screen = "lobby";
  game.ui.lobbyPage = "choice";
  game.ui.lobbyMessage = "";
  game.ui.codeInput = "";
  game.ui.codeInputError = null;

  // Sub aux events Realtime (idempotent : on le fait 1 seule fois par session de page)
  if (!game.mp.subscribed) {
    window.RE_MP.onInput(handleMpInput);
    window.RE_MP.onSnapshot(applyMpSnapshot);
    window.RE_MP.onGameOver(handleMpGameOver);
    window.RE_MP.onOpponentLeave(handleMpOpponentLeave);
    window.RE_MP.onLobbyUpdate(handleMpLobbyUpdate);
    window.RE_MP.onStart(handleMpStart);
    game.mp.subscribed = true;
  }
}

async function mpCreateRoom() {
  flashLobbyMessage("Création du salon…");
  const res = await window.RE_MP.createLobby({
    biome: game.biome,
    difficulty: game.difficulty,
  });
  if (res?.error) {
    flashLobbyMessage(`Erreur : ${res.error}`, "error");
    return;
  }
  game.mp.role = "host";
  game.mp.lobbyId = res.lobbyId;
  game.mp.code = res.code;
  game.mp.status = "waiting";
  if (res.biome) game.biome = res.biome;
  if (res.difficulty) {
    game.difficulty = res.difficulty;
    if (DIFFICULTY_PRESETS[res.difficulty]) game.preset = DIFFICULTY_PRESETS[res.difficulty];
  }
  game.ui.lobbyPage = "room";
  game.ui.lobbyMessage = "";
}

async function mpJoinByCode(code) {
  const trimmed = (code || "").trim().toUpperCase();
  if (!trimmed) {
    game.ui.codeInputError = "Entre un code à 6 caractères.";
    return;
  }
  flashLobbyMessage("Connexion au salon…");
  const res = await window.RE_MP.joinByCode(trimmed);
  if (res?.error) {
    const labels = {
      lobby_not_found: "Salon introuvable.",
      lobby_full: "Ce salon est déjà plein.",
      cannot_join_own_lobby: "C'est ton propre salon — partage le code à un ami.",
      invalid_code: "Code invalide.",
      not_authenticated: "Connecte-toi pour rejoindre un salon.",
    };
    game.ui.codeInputError = labels[res.error] || `Erreur : ${res.error}`;
    flashLobbyMessage("");
    return;
  }
  game.mp.role = "guest";
  game.mp.lobbyId = res.lobbyId;
  game.mp.code = res.code;
  game.mp.opponent = { id: null, username: res.host_username };
  game.mp.status = res.status || "waiting";
  if (res.biome) game.biome = res.biome;
  if (res.difficulty) {
    game.difficulty = res.difficulty;
    if (DIFFICULTY_PRESETS[res.difficulty]) game.preset = DIFFICULTY_PRESETS[res.difficulty];
  }
  game.ui.lobbyPage = "room";
  game.ui.codeInputError = null;
  game.ui.lobbyMessage = "";
}

async function mpToggleReady() {
  if (!game.mp || !game.mp.lobbyId) return;
  const cur = (game.mp.role === "host" ? game.mp.hostReady : game.mp.guestReady);
  const res = await window.RE_MP.setReady(!cur);
  if (res?.error) {
    flashLobbyMessage(`Erreur : ${res.error}`, "error");
    return;
  }
  game.mp.hostReady = res.hostReady;
  game.mp.guestReady = res.guestReady;
  // si bothReady, le serveur a flippé le status — handleMpStart sera déclenché
  // par la sub postgres_changes (et le poll fallback).
}

function handleMpLobbyUpdate({ status, hostReady, guestReady, opponent, code }) {
  if (!game.mp) return;
  game.mp.hostReady = hostReady;
  game.mp.guestReady = guestReady;
  if (code) game.mp.code = code;
  if (status === "abandoned" || status === "finished") {
    game.mp.status = status;
  } else if (status) {
    game.mp.status = status;
  }
  if (game.mp.role === "host" && opponent && (!game.mp.opponent || game.mp.opponent.id !== opponent.id)) {
    game.mp.opponent = opponent;
  } else if (game.mp.role === "guest" && opponent) {
    game.mp.opponent = opponent;
  }
}

function handleMpStart({ seed, biome, difficulty, opponent }) {
  if (!game.mp) return;
  game.mp.opponent = opponent || game.mp.opponent;
  game.mp.seed = seed || game.mp.seed;
  if (biome) game.biome = biome;
  if (difficulty) {
    game.difficulty = difficulty;
    if (DIFFICULTY_PRESETS[difficulty]) game.preset = DIFFICULTY_PRESETS[difficulty];
  }
  game.mp.status = "playing";
  startMpGame();
}

function startMpGame() {
  applyTeamSkin();
  resetGame();
  game.screen = "playing";
  // Le guest se positionne par défaut sur sa base (droite), l'host reste à gauche.
  if (game.mp?.role === "guest") {
    const maxScroll = Math.max(0, CONFIG.W - CONFIG.CANVAS_W);
    game.camera.x = maxScroll;
  }
  audio.startMusic();
}

async function cancelMultiplayer() {
  if (window.RE_MP) {
    try { await window.RE_MP.leave(); } catch {}
  }
  game.mp = null;
  game.mode = "solo";
  game.screen = "menu";
}

function flashLobbyMessage(msg, level = "info") {
  game.ui.lobbyMessage = msg;
  game.ui.lobbyMessageLevel = level;
}

function drawLobbyBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.H);
  grad.addColorStop(0, "#0a0e1a");
  grad.addColorStop(1, "#1a2030");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);
}

function drawLobbyButton(ctx, rect, label, sub, color, colorDark) {
  const hover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
  ctx.fillStyle = hover ? color : colorDark;
  roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (hover) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 - (sub ? 10 : 0));
  if (sub) {
    ctx.font = "12px -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillText(sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 14);
  }
}

function drawLobbyScreen(ctx) {
  drawLobbyBackground(ctx);
  const page = game.ui.lobbyPage || "choice";
  if (page === "choice")      drawLobbyChoice(ctx);
  else if (page === "create") drawLobbyCreate(ctx);
  else if (page === "join")   drawLobbyJoin(ctx);
  else if (page === "room")   drawLobbyRoom(ctx);
}

function drawLobbyChoice(ctx) {
  const cx = CONFIG.CANVAS_W / 2;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 44px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = COLORS.enemy;
  ctx.shadowBlur = 18;
  ctx.fillText("👥 MULTIJOUEUR", cx, 150);
  ctx.shadowBlur = 0;

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "14px -apple-system, sans-serif";
  ctx.fillText("Crée un salon et partage le code avec un ami, ou rejoins le sien.", cx, 195);

  const btnW = 320, btnH = 90;
  const gap = 24;
  const totalH = btnH * 2 + gap;
  const startY = 250;

  const createRect = { x: cx - btnW / 2, y: startY, w: btnW, h: btnH };
  const joinRect   = { x: cx - btnW / 2, y: startY + btnH + gap, w: btnW, h: btnH };
  drawLobbyButton(ctx, createRect, "✨  CRÉER UN SALON", "Génère un code à partager", COLORS.player, COLORS.playerDark);
  drawLobbyButton(ctx, joinRect, "🔑  REJOINDRE UN SALON", "Entre le code de l'hôte", COLORS.enemy, COLORS.enemyDark || "rgba(220,38,38,0.4)");

  // Bouton retour
  const backW = 180, backH = 40;
  const backRect = { x: cx - backW / 2, y: startY + totalH + 36, w: backW, h: backH };
  const backHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, backRect);
  ctx.fillStyle = backHover ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)";
  roundedRect(ctx, backRect.x, backRect.y, backRect.w, backRect.h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.fillText("↩  Retour au menu", backRect.x + backRect.w / 2, backRect.y + backRect.h / 2);

  if (game.ui.lobbyMessage) {
    ctx.fillStyle = (game.ui.lobbyMessageLevel === "error") ? COLORS.enemy : COLORS.hudMuted;
    ctx.font = "13px -apple-system, sans-serif";
    ctx.fillText(game.ui.lobbyMessage, cx, CONFIG.H - 60);
  }

  game.ui.lobbyRects = { choiceCreate: createRect, choiceJoin: joinRect, back: backRect };
}

function drawLobbyJoin(ctx) {
  const cx = CONFIG.CANVAS_W / 2;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 36px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🔑 REJOINDRE UN SALON", cx, 150);

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "14px -apple-system, sans-serif";
  ctx.fillText("Entre le code à 6 caractères partagé par l'hôte.", cx, 200);

  // Champ de code
  const inputW = 360, inputH = 70;
  const inputRect = { x: cx - inputW / 2, y: 240, w: inputW, h: inputH };
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundedRect(ctx, inputRect.x, inputRect.y, inputRect.w, inputRect.h, 10);
  ctx.fill();
  ctx.strokeStyle = COLORS.player;
  ctx.lineWidth = 2;
  ctx.stroke();

  const code = (game.ui.codeInput || "").padEnd(6, "·");
  ctx.fillStyle = "#fff";
  ctx.font = "bold 38px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Espacement entre les caractères pour la lisibilité
  const chars = code.split("");
  const spacing = 38;
  const totalW = (chars.length - 1) * spacing;
  for (let i = 0; i < chars.length; i++) {
    const cxc = cx - totalW / 2 + i * spacing;
    const c = chars[i];
    ctx.fillStyle = c === "·" ? "rgba(255,255,255,0.18)" : "#fff";
    ctx.fillText(c, cxc, inputRect.y + inputRect.h / 2);
  }

  // Hint clavier
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "12px -apple-system, sans-serif";
  ctx.fillText("Tape le code au clavier — Entrée pour valider, Échap pour revenir.", cx, inputRect.y + inputRect.h + 22);

  if (game.ui.codeInputError) {
    ctx.fillStyle = COLORS.enemy;
    ctx.font = "13px -apple-system, sans-serif";
    ctx.fillText(game.ui.codeInputError, cx, inputRect.y + inputRect.h + 46);
  }

  // Boutons
  const btnW = 180, btnH = 50, gap = 16;
  const totalBtnW = btnW * 2 + gap;
  const okRect   = { x: cx - totalBtnW / 2,             y: 390, w: btnW, h: btnH };
  const backRect = { x: cx - totalBtnW / 2 + btnW + gap, y: 390, w: btnW, h: btnH };

  const okHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, okRect);
  const ready = (game.ui.codeInput || "").length === 6;
  ctx.fillStyle = ready ? (okHover ? COLORS.player : COLORS.playerDark) : "rgba(255,255,255,0.10)";
  roundedRect(ctx, okRect.x, okRect.y, okRect.w, okRect.h, 10);
  ctx.fill();
  ctx.strokeStyle = ready ? COLORS.player : "rgba(255,255,255,0.20)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = ready ? "#fff" : COLORS.hudMuted;
  ctx.font = "bold 16px -apple-system, sans-serif";
  ctx.fillText("Rejoindre", okRect.x + okRect.w / 2, okRect.y + okRect.h / 2);

  const backHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, backRect);
  ctx.fillStyle = backHover ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)";
  roundedRect(ctx, backRect.x, backRect.y, backRect.w, backRect.h, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillText("↩  Retour", backRect.x + backRect.w / 2, backRect.y + backRect.h / 2);

  game.ui.lobbyRects = { joinOk: okRect, back: backRect, joinInput: inputRect };
}

function drawLobbyRoom(ctx) {
  const cx = CONFIG.CANVAS_W / 2;
  const mp = game.mp || {};

  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 36px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("👥 SALON", cx, 100);

  // Code du salon en grand
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "13px -apple-system, sans-serif";
  ctx.fillText("CODE DU SALON — partage-le à ton adversaire", cx, 150);

  const codeBoxW = 360, codeBoxH = 70;
  const codeBox = { x: cx - codeBoxW / 2, y: 170, w: codeBoxW, h: codeBoxH };
  ctx.fillStyle = "rgba(59,130,246,0.18)";
  roundedRect(ctx, codeBox.x, codeBox.y, codeBox.w, codeBox.h, 12);
  ctx.fill();
  ctx.strokeStyle = COLORS.player;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 40px ui-monospace, SFMono-Regular, Menlo, monospace";
  const codeText = (mp.code || "------").split("").join(" ");
  ctx.fillText(codeText, cx, codeBox.y + codeBox.h / 2);

  // Bouton copier le code
  const copyW = 140, copyH = 32;
  const copyRect = { x: cx - copyW / 2, y: codeBox.y + codeBox.h + 10, w: copyW, h: copyH };
  const copyHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, copyRect);
  ctx.fillStyle = copyHover ? "rgba(59,130,246,0.35)" : "rgba(59,130,246,0.18)";
  roundedRect(ctx, copyRect.x, copyRect.y, copyRect.w, copyRect.h, 6);
  ctx.fill();
  ctx.strokeStyle = COLORS.player;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.fillText(game.ui.codeCopied ? "✓ Copié !" : "📋 Copier le code", copyRect.x + copyRect.w / 2, copyRect.y + copyRect.h / 2);

  // Joueurs (host à gauche, guest à droite)
  const playerCardW = 240, playerCardH = 110, playerGap = 32;
  const totalCardW = playerCardW * 2 + playerGap;
  const cardY = 305;
  const hostCard  = { x: cx - totalCardW / 2,                      y: cardY, w: playerCardW, h: playerCardH };
  const guestCard = { x: cx - totalCardW / 2 + playerCardW + playerGap, y: cardY, w: playerCardW, h: playerCardH };

  drawPlayerCard(ctx, hostCard,  "Hôte (équipe bleue)", window.RE_AUTH?.profile?.username && mp.role === "host" ? window.RE_AUTH.profile.username : (mp.role === "host" ? "Toi" : (mp.opponent?.username || "Hôte")), mp.hostReady, COLORS.player);
  drawPlayerCard(ctx, guestCard, "Invité (équipe rouge)", mp.role === "guest" ? (window.RE_AUTH?.profile?.username || "Toi") : (mp.opponent?.username || "(en attente…)"), mp.guestReady, COLORS.enemy);

  // Statut du salon
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "13px -apple-system, sans-serif";
  const opp = (mp.role === "host" ? mp.opponent?.username : mp.opponent?.username) || null;
  let statusLine;
  if (!opp) statusLine = "En attente d'un adversaire…";
  else if (mp.hostReady && mp.guestReady) statusLine = "Lancement de la partie…";
  else if ((mp.role === "host" && mp.hostReady) || (mp.role === "guest" && mp.guestReady)) statusLine = "Tu es prêt — en attente de l'adversaire.";
  else statusLine = "Marque-toi prêt quand tu veux lancer la partie.";
  ctx.fillText(statusLine, cx, cardY + playerCardH + 32);

  // Bouton Prêt / Pas prêt
  const myReady = mp.role === "host" ? mp.hostReady : mp.guestReady;
  const canReady = !!opp; // pas de "prêt" tant qu'il n'y a pas d'adversaire
  const readyW = 220, readyH = 56;
  const readyRect = { x: cx - readyW / 2, y: cardY + playerCardH + 56, w: readyW, h: readyH };
  const readyHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, readyRect);
  if (!canReady) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
  } else if (myReady) {
    ctx.fillStyle = readyHover ? "rgba(34,197,94,0.65)" : "rgba(34,197,94,0.45)";
  } else {
    ctx.fillStyle = readyHover ? COLORS.player : COLORS.playerDark;
  }
  roundedRect(ctx, readyRect.x, readyRect.y, readyRect.w, readyRect.h, 10);
  ctx.fill();
  ctx.strokeStyle = !canReady ? "rgba(255,255,255,0.18)" : (myReady ? COLORS.hpGood : COLORS.player);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = canReady ? "#fff" : COLORS.hudMuted;
  ctx.font = "bold 18px -apple-system, sans-serif";
  ctx.fillText(myReady ? "✓ PRÊT (clic pour annuler)" : "Je suis prêt", readyRect.x + readyRect.w / 2, readyRect.y + readyRect.h / 2);

  // Quitter le salon
  const leaveW = 180, leaveH = 40;
  const leaveRect = { x: cx - leaveW / 2, y: readyRect.y + readyH + 22, w: leaveW, h: leaveH };
  const leaveHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, leaveRect);
  ctx.fillStyle = leaveHover ? "rgba(239,68,68,0.45)" : "rgba(239,68,68,0.22)";
  roundedRect(ctx, leaveRect.x, leaveRect.y, leaveRect.w, leaveRect.h, 8);
  ctx.fill();
  ctx.strokeStyle = COLORS.enemy;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.fillText("Quitter le salon", leaveRect.x + leaveRect.w / 2, leaveRect.y + leaveRect.h / 2);

  game.ui.lobbyRects = { ready: readyRect, leave: leaveRect, copy: copyRect, codeBox };
}

function drawPlayerCard(ctx, rect, role, name, ready, sideColor) {
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.strokeStyle = ready ? COLORS.hpGood : "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = sideColor;
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.fillText(role, rect.x + rect.w / 2, rect.y + 22);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px -apple-system, sans-serif";
  ctx.fillText(name || "—", rect.x + rect.w / 2, rect.y + 56);

  ctx.fillStyle = ready ? COLORS.hpGood : COLORS.hudMuted;
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.fillText(ready ? "✓ PRÊT" : "EN ATTENTE…", rect.x + rect.w / 2, rect.y + rect.h - 16);
}

function drawLobbyCreate(ctx) {
  // (sous-écran inutilisé : la création passe directement à "room" après l'appel RPC)
  drawLobbyRoom(ctx);
}

// Sérialise l'état partagé en multijoueur. Le host appelle ça à ~12 Hz.
function serializeSide(side) {
  const s = game[side];
  if (!s) return null;
  return {
    money: s.money,
    baseHP: s.baseHP,
    baseHPMax: s.baseHPMax,
    slots: s.slots.map((slot) => {
      if (!slot.factory) return null;
      const f = slot.factory;
      return { typeId: f.typeId, hp: f.hp, level: f.level, upgrades: { ...f.upgrades }, totalInvested: f.totalInvested, mode: f.mode };
    }),
    wallTurrets: s.wallSlots.map((w) => {
      if (!w.turret) return null;
      const t = w.turret;
      return { hp: t.hp, maxHp: t.maxHp, upgrades: { ...t.upgrades }, totalInvested: t.totalInvested, stats: { ...t.stats } };
    }),
  };
}

function buildMpSnapshot() {
  return {
    t: game.time,
    player: serializeSide("player"),
    enemy: serializeSide("enemy"),
    units: game.units
      .filter((u) => u.hp > 0 && !u.stationary)
      .map((u) => ({
        side: u.side,
        typeId: u.typeId,
        x: u.x,
        y: u.y,
        hp: u.hp,
        maxHp: u.maxHp,
      })),
    attackFx: game.attackFx.slice(-40).map((fx) => ({ ...fx })),
    explosions: game.explosions.slice(-12).map((ex) => ({ ...ex })),
    lightning: game.lightning ? { ...game.lightning, segments: game.lightning.segments?.slice() || [] } : null,
    cd: { player: game.lightningCooldown, enemy: game.mp?.enemyLightningCooldown || 0 },
    gameOver: game.gameOver ? { winner: game.gameOver.winner } : null,
  };
}

// Recompose une side state à partir d'un snapshot reçu (côté guest uniquement).
function applySerializedSide(side, ser) {
  if (!ser) return;
  const local = game[side];
  if (!local) return;
  local.money = ser.money;
  local.baseHP = ser.baseHP;
  local.baseHPMax = ser.baseHPMax;
  if (Array.isArray(ser.slots)) {
    for (let i = 0; i < ser.slots.length && i < local.slots.length; i++) {
      const inc = ser.slots[i];
      const slot = local.slots[i];
      if (!inc) { slot.factory = null; continue; }
      const baseType = FACTORY_TYPES[inc.typeId];
      if (!baseType) continue;
      if (!slot.factory) {
        slot.factory = {
          typeId: inc.typeId, side, hp: inc.hp, prodTimer: 0,
          level: inc.level || 1, upgrades: inc.upgrades || defaultUpgrades(),
          totalInvested: inc.totalInvested || baseType.cost,
          mode: inc.mode || "attack",
        };
      } else {
        slot.factory.typeId = inc.typeId;
        slot.factory.hp = inc.hp;
        slot.factory.level = inc.level || 1;
        slot.factory.upgrades = inc.upgrades || defaultUpgrades();
        slot.factory.totalInvested = inc.totalInvested || slot.factory.totalInvested;
        slot.factory.mode = inc.mode || slot.factory.mode;
      }
    }
  }
  if (Array.isArray(ser.wallTurrets)) {
    for (let i = 0; i < ser.wallTurrets.length && i < local.wallSlots.length; i++) {
      const inc = ser.wallTurrets[i];
      const wall = local.wallSlots[i];
      if (!inc) {
        if (wall.turret) wall.turret.hp = 0;
        wall.turret = null;
        continue;
      }
      if (!wall.turret) {
        const turret = {
          side, typeId: "turret", kind: "turret", stationary: true,
          x: wall.x + wall.w / 2, y: wall.y + wall.h / 2,
          hp: inc.hp, maxHp: inc.maxHp, stats: { ...inc.stats },
          target: null, attackCooldown: 0, wanderY: null, wanderTimer: 0,
          mode: "defense", exitWaypoints: [], wallSlotRef: wall,
          totalInvested: inc.totalInvested,
          upgrades: { ...inc.upgrades },
        };
        game.units.push(turret);
        wall.turret = turret;
      } else {
        wall.turret.hp = inc.hp;
        wall.turret.maxHp = inc.maxHp;
        wall.turret.stats = { ...inc.stats };
        wall.turret.upgrades = { ...inc.upgrades };
        wall.turret.totalInvested = inc.totalInvested;
      }
    }
  }
}

function applyMpSnapshot(snap) {
  if (!snap || game.mode !== "mp" || game.mp?.role !== "guest") return;
  if (game.screen !== "playing") {
    // Le host a démarré la partie avant que le guest n'ait fini son setup local
    startMpGame();
  }
  game.time = snap.t;
  applySerializedSide("player", snap.player);
  applySerializedSide("enemy", snap.enemy);

  // Rebuild des units mobiles : on retire celles non-stationnaires et on les recrée
  game.units = game.units.filter((u) => u.stationary && u.hp > 0);
  if (Array.isArray(snap.units)) {
    for (const u of snap.units) {
      const factoryDef = FACTORY_TYPES[u.typeId];
      const unitDef = UNIT_TYPES[factoryDef?.unitType] || UNIT_TYPES[u.typeId];
      if (!unitDef) continue;
      game.units.push({
        side: u.side,
        typeId: u.typeId,
        kind: "unit",
        x: u.x,
        y: u.y,
        hp: u.hp,
        maxHp: u.maxHp,
        stats: { ...unitDef },
        target: null,
        attackCooldown: 0,
        wanderY: null,
        wanderTimer: 0,
        mode: "attack",
        exitWaypoints: [],
        stationary: false,
      });
    }
  }
  game.attackFx = Array.isArray(snap.attackFx) ? snap.attackFx.map((fx) => ({ ...fx })) : [];
  game.explosions = Array.isArray(snap.explosions) ? snap.explosions.map((ex) => ({ ...ex })) : [];
  game.lightning = snap.lightning ? { ...snap.lightning } : null;
  if (snap.cd) {
    // Sur le guest, "ma" lightning cd est celle de mon côté
    game.lightningCooldown = snap.cd[mySide()] ?? 0;
  }
  if (snap.gameOver && !game.gameOver) {
    handleMpGameOver({ winnerSide: snap.gameOver.winner });
  }
}

// Côté host : applique un input reçu du guest (= actions sur le côté enemy).
function handleMpInput(input) {
  if (!input || game.mode !== "mp") return;
  // Le host est seul à traiter les inputs (le guest n'a pas de simulation locale).
  if (game.mp?.role !== "host") return;
  if (game.screen !== "playing") return;
  if (game.gameOver) return;
  const side = "enemy"; // le guest ne peut piloter que son côté

  switch (input.type) {
    case "build_factory":
      tryPlaceFactory(side, input.slotIndex, input.typeId);
      break;
    case "upgrade_factory":
      tryUpgradeFactory(side, input.slotIndex, input.statId);
      break;
    case "sell_factory":
      sellFactory(side, input.slotIndex);
      break;
    case "build_turret":
      tryPlaceTurret(side, input.wallSlotIndex);
      break;
    case "upgrade_turret":
      tryUpgradeTurret(side, input.wallSlotIndex, input.statId);
      break;
    case "sell_turret":
      sellTurret(side, input.wallSlotIndex);
      break;
    case "lightning_fire":
      fireLightningAt(input.x, side);
      break;
    default:
      console.warn("[MP] input inconnu:", input);
  }
}

function handleMpGameOver({ winnerSide }) {
  if (game.gameOver) return;
  // winnerSide est en perspective host : "player" (host gagne) ou "enemy" (guest gagne)
  game.gameOver = { winner: winnerSide || "player", at: performance.now() };
  audio.stopMusic();
  if (window.RE_MP && game.mp?.role === "host") {
    const mappedWinner = winnerSide === "player" ? "host" : "guest";
    try { window.RE_MP.sendGameOver(winnerSide); } catch {}
    try { window.RE_MP.reportFinish(mappedWinner); } catch {}
  }
  // Que ce soit côté host ou guest, on enregistre son propre résultat pour
  // créditer la monnaie et faire avancer les missions.
  const myResult = winnerSide === mySide() ? "win" : "lose";
  sendGameResultToBackend(myResult);
}

function handleMpOpponentLeave() {
  if (game.gameOver) return;
  if (game.screen === "playing") {
    // Adversaire parti pendant la partie → victoire par forfait pour celui qui reste
    const myWinner = mySide();
    game.gameOver = { winner: myWinner, at: performance.now(), reason: "opponent_left" };
    audio.stopMusic();
  } else if (game.screen === "lobby") {
    flashLobbyMessage("L'adversaire a quitté avant le début de la partie.", "warn");
  }
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
    await Promise.all([loadAllSprites(), audio.preloadWavs()]);
  } catch (err) {
    console.warn("[Émergence] Erreur de chargement des assets :", err);
  }

  // Démarre l'écran de menu (le gameplay s'init au clic sur Jouer)
  game.screen = "menu";
  requestAnimationFrame(gameLoop);
}

document.addEventListener("DOMContentLoaded", boot);
