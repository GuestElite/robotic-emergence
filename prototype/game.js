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

// Layout du HUD (barre du haut) — constantes partagées pour éviter les
// décalages quand on ajoute/retire des boutons. Ordre gauche → droite :
// [💰 money] [7 build buttons] [4 spell buttons] [timer] [⚙ gear]
// Toutes les positions x sont dérivées des helpers hudBuildX/hudSpellX/...
const HUD_LAYOUT = {
  Y: 12,
  BTN_H: 36,
  // Build section
  BUILD_X: 130,
  BUILD_BTN_W: 92,
  BUILD_BTN_GAP: 4,
  BUILD_COUNT: 7,
  // Spell section
  SPELL_BTN_W: 82,
  SPELL_BTN_GAP: 6,
  SPELL_COUNT: 4,
  // Right block
  TIMER_W: 58,
  GEAR_W: 36,
  // Spacings
  SECTION_GAP: 16,
  RIGHT_PAD: 12,
};

function hudBuildX(idx) {
  return HUD_LAYOUT.BUILD_X + idx * (HUD_LAYOUT.BUILD_BTN_W + HUD_LAYOUT.BUILD_BTN_GAP);
}
function hudBuildEndX() {
  return hudBuildX(HUD_LAYOUT.BUILD_COUNT - 1) + HUD_LAYOUT.BUILD_BTN_W;
}
function hudSpellStartX() {
  return hudBuildEndX() + HUD_LAYOUT.SECTION_GAP;
}
function hudSpellX(idx) {
  return hudSpellStartX() + idx * (HUD_LAYOUT.SPELL_BTN_W + HUD_LAYOUT.SPELL_BTN_GAP);
}
function hudSpellEndX() {
  return hudSpellX(HUD_LAYOUT.SPELL_COUNT - 1) + HUD_LAYOUT.SPELL_BTN_W;
}
function hudGearX() {
  return CONFIG.CANVAS_W - HUD_LAYOUT.RIGHT_PAD - HUD_LAYOUT.GEAR_W;
}
function hudTimerX() {
  return hudGearX() - 10 - HUD_LAYOUT.TIMER_W;
}

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
    cost: 220,            // ↑ de 180 — l'air est polyvalent (sol + air), il doit coûter
    prodInterval: 4.0,    // ↑ de 3.2 — cadence ralentie
    hp: 130,
    unitType: "air",
  },
  medic: {
    id: "medic",
    label: "Médic",
    cost: 140,
    prodInterval: 3.4,
    hp: 120,
    unitType: "medic",
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
    hp: 35, damage: 10, speed: 110, radius: 9,   // PV 45→35, dmg 14→10 (vulnérable face aux turrets/sniper)
    range: 75, attackInterval: 1.1, killReward: 30,
    layer: "air",
    canTargetAir: true, // les drones peuvent tirer sur tout : sol + air
  },
  // Le médic ne fait PAS de dégâts. Au lieu de cibler des ennemis, il
  // cible les alliés blessés à portée et leur applique un heal périodique.
  // damage = montant soigné par tick ; range = rayon de soin.
  medic: {
    id: "medic",
    hp: 45, damage: 12, speed: 85, radius: 9,
    range: 95, attackInterval: 1.0, killReward: 0,
    layer: "ground", canTargetAir: false,
    isMedic: true, // flag pour la logique de ciblage
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

// Coût cumulé pour monter `count` paliers depuis `currentLevel` (raccourci ×5).
// Cap par MAX_UPGRADE_LEVEL : si on dépasse, on s'arrête à la limite.
function bulkUpgradeCost(stat, currentLevel, count) {
  let total = 0;
  for (let i = 0; i < count && currentLevel + i < MAX_UPGRADE_LEVEL; i++) {
    total += upgradeCost(stat, currentLevel + i);
  }
  return total;
}

// Nombre de paliers possibles pour un raccourci ×5 depuis le niveau courant.
function bulkUpgradeSteps(currentLevel, requested = 5) {
  return Math.max(0, Math.min(requested, MAX_UPGRADE_LEVEL - currentLevel));
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
  const tier = factory.tier || 1;
  // Les factories fusionnées produisent un poil plus vite (× 0.85 / 0.65)
  return base * (TIER_PROD_MULTIPLIER[tier] || 1) / statMultiplier(factory.upgrades.creationRate, 0.20);
}

// Stats effectives des unités spawnées par une factory (à figer au moment du spawn)
function spawnStatsFor(factory) {
  const ut = UNIT_TYPES[FACTORY_TYPES[factory.typeId].unitType];
  const u = factory.upgrades;
  const tier = factory.tier || 1;
  const tierMult     = TIER_MULTIPLIER[tier] || 1;
  const speedMult    = TIER_SPEED_MULTIPLIER[tier] || 1;
  const rangeMult    = TIER_RANGE_MULTIPLIER[tier] || 1;
  const radiusMult   = TIER_RADIUS_MULTIPLIER[tier] || 1;
  // Cadence de tir aussi améliorée (plus bas = plus rapide)
  const attackIntervalMult = tier === 1 ? 1 : tier === 2 ? 0.80 : 0.62;
  return {
    hp:             ut.hp        * statMultiplier(u.health, 0.25) * tierMult,
    damage:         ut.damage    * statMultiplier(u.power, 0.22)  * tierMult,
    speed:          ut.speed     * statMultiplier(u.speed, 0.15)  * speedMult,
    range:          ut.range     * statMultiplier(u.range, 0.12)  * rangeMult,
    radius:         ut.radius * radiusMult,
    attackInterval: (ut.attackInterval / statMultiplier(u.shootRate, 0.18)) * attackIntervalMult,
    killReward:     Math.round(ut.killReward * (tier === 1 ? 1 : tier === 2 ? 1.7 : 2.8)),
    layer:          ut.layer || "ground",
    canTargetAir:   !!ut.canTargetAir,
    isMedic:        !!ut.isMedic,
    tier,
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
    desc: "IA lente · plus d'argent et de PV",
    aiBuildInterval: 7.5,
    aiStartMoney: 60,
    aiHeavyChance: 0.15,
    aiTypeWeights: { light: 42, heavy: 18, swarmer: 22, sniper: 10, air: 8, medic: 6 },
    playerStartMoney: 150,
    playerBaseHP: 1500,
    enemyBaseHP: 700,
    aiDefenseChance: 0.15,
  },
  normal: {
    label: "Normal",
    emoji: "🟡",
    desc: "Équilibré — l'expérience par défaut",
    aiBuildInterval: 5.0,
    aiStartMoney: 100,
    aiHeavyChance: 0.30,
    aiTypeWeights: { light: 30, heavy: 22, swarmer: 22, sniper: 14, air: 12, medic: 8 },
    playerStartMoney: 100,
    playerBaseHP: 1000,
    enemyBaseHP: 1000,
    aiDefenseChance: 0.25,
  },
  wave: {
    label: "Vagues",
    emoji: "🌊",
    desc: "Survis aux vagues escaladantes",
    aiBuildInterval: 0,
    aiStartMoney: 0,
    aiHeavyChance: 0,
    aiTypeWeights: { light: 1 },
    playerStartMoney: 200,
    playerBaseHP: 1500,
    enemyBaseHP: 999999,
    aiDefenseChance: 0,
    isWave: true,
  },
  hard: {
    label: "Difficile",
    emoji: "🔴",
    desc: "IA agressive · plus de PV ennemi",
    aiBuildInterval: 3.5,
    aiStartMoney: 150,
    aiHeavyChance: 0.45,
    aiTypeWeights: { light: 22, heavy: 26, swarmer: 22, sniper: 14, air: 16, medic: 10 },
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

// Tracks de menu disponibles dans le dropdown top-left.
// Tous CC-BY 4.0 par Scott Buckley — crédités dans 11-sound-design/README.md.
const MENU_MUSIC_TRACKS = [
  { id: "ride-the-wind", label: "Ride The Wind",    file: "bgm-menu.mp3",             mood: "Aventure épique" },
  { id: "bring-sky",     label: "Bring Me The Sky", file: "bgm-menu-bring-sky.mp3",   mood: "Inspirant doux" },
  { id: "decoherence",   label: "Decoherence",      file: "bgm-menu-decoherence.mp3", mood: "Sci-fi ambient" },
];

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
  menuMusic: null,
  menuMusicVolume: 0.30,  // un peu plus haute que la BGM in-game car écran statique
  menuMusicTrackId: "ride-the-wind",  // track actuelle (auto-restore depuis localStorage)
  ambientAudio: null,
  ambientVolume: 0.16, // sous la BGM, juste assez pour donner vie au biome
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
  // ── Menu music — joué UNIQUEMENT sur l'écran menu, indépendant du BGM in-game.
  // 3 tracks au choix dans le dropdown du menu (top-left). Le user peut switcher
  // à la volée ; le choix est persisté en localStorage.
  // Position de lecture aussi persistée (clé "menuMusicPos") pour assurer la
  // continuité entre cette page canvas et les pages HTML (shop, profile, etc.).
  _menuPosKey: "menuMusicPos",
  _menuPosResumeWindowMs: 5000,
  _saveMenuMusicPos() {
    if (!this.menuMusic || this.menuMusic.paused) return;
    try {
      localStorage.setItem(this._menuPosKey, JSON.stringify({
        trackId: this.menuMusic._trackId,
        position: this.menuMusic.currentTime,
        savedAt: Date.now(),
      }));
    } catch (_) {}
  },
  _loadMenuMusicPos(trackId) {
    try {
      const raw = localStorage.getItem(this._menuPosKey);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.trackId !== trackId) return null;
      const elapsedMs = Date.now() - (data.savedAt || 0);
      if (elapsedMs > this._menuPosResumeWindowMs) return null;
      return Math.max(0, (data.position || 0) + elapsedMs / 1000);
    } catch (_) { return null; }
  },
  _attachMenuMusicTracking(audioEl, trackId) {
    // Restore position si savé récemment
    const resumeAt = this._loadMenuMusicPos(trackId);
    if (resumeAt !== null) {
      audioEl.addEventListener("loadedmetadata", () => {
        try {
          const dur = audioEl.duration || 0;
          audioEl.currentTime = dur > 0 ? (resumeAt % dur) : 0;
        } catch (_) {}
      }, { once: true });
    }
    // Save position périodiquement pendant la lecture (~4 Hz)
    const saveBound = () => this._saveMenuMusicPos();
    audioEl.addEventListener("timeupdate", saveBound);
  },
  preloadMenuMusic() {
    if (this.menuMusic) return;
    const track = MENU_MUSIC_TRACKS.find((t) => t.id === this.menuMusicTrackId)
                  || MENU_MUSIC_TRACKS[0];
    this.menuMusic = new Audio(`../11-sound-design/music/${track.file}`);
    this.menuMusic.loop = true;
    this.menuMusic.preload = "auto";
    this.menuMusic.volume = this.menuMusicVolume * this.musicVolume;
    this.menuMusic._trackId = track.id;
    this._attachMenuMusicTracking(this.menuMusic, track.id);
    try { this.menuMusic.load(); } catch (_) {}
  },
  startMenuMusic() {
    if (!this.musicEnabled) return;
    if (this.menuMusic && !this.menuMusic.paused) return;
    if (!this.menuMusic) this.preloadMenuMusic();
    this.menuMusic.volume = this.menuMusicVolume * this.musicVolume;
    this.menuMusic.play().catch(() => { /* autoplay bloqué — réessaie au prochain clic */ });
  },
  setMenuTrack(trackId) {
    const track = MENU_MUSIC_TRACKS.find((t) => t.id === trackId);
    if (!track) return;
    if (this.menuMusic && this.menuMusic._trackId === trackId && !this.menuMusic.paused) return;
    this.menuMusicTrackId = trackId;
    if (this.menuMusic) {
      try { this.menuMusic.pause(); } catch (_) {}
      this.menuMusic = null;
    }
    this.menuMusic = new Audio(`../11-sound-design/music/${track.file}`);
    this.menuMusic.loop = true;
    this.menuMusic.preload = "auto";
    this.menuMusic.volume = this.menuMusicVolume * this.musicVolume;
    this.menuMusic._trackId = trackId;
    this._attachMenuMusicTracking(this.menuMusic, trackId);
    if (this.musicEnabled && game.screen === "menu") {
      this.menuMusic.play().catch(() => {});
    }
  },
  stopMenuMusic() {
    if (this.menuMusic) {
      try { this.menuMusic.pause(); this.menuMusic.currentTime = 0; } catch (_) {}
    }
  },
  // ── Ambient (vent / souffle de biome, loopé sous la BGM)
  startAmbient(biome) {
    if (!this.musicEnabled) return;  // suit le toggle musique pour V1
    const validBiomes = ["desert", "jungle", "snow"];
    const b = validBiomes.includes(biome) ? biome : "desert";
    // Si on change de biome → reset l'audio
    if (this.ambientAudio && this.ambientAudio._biome !== b) {
      try { this.ambientAudio.pause(); } catch (_) {}
      this.ambientAudio = null;
    }
    if (!this.ambientAudio) {
      this.ambientAudio = new Audio(`../11-sound-design/sfx/ambient-${b}.wav`);
      this.ambientAudio.loop = true;
      this.ambientAudio._biome = b;
    }
    this.ambientAudio.volume = this.ambientVolume * this.musicVolume;
    this.ambientAudio.play().catch(() => {});
  },
  stopAmbient() {
    if (this.ambientAudio) {
      try { this.ambientAudio.pause(); this.ambientAudio.currentTime = 0; } catch (_) {}
    }
  },
  setMusicEnabled(on) {
    this.musicEnabled = on;
    if (on) {
      if (game.screen === "playing") this.startMusic();
      else if (game.screen === "menu") this.startMenuMusic();
    } else {
      this.stopMusic();
      this.stopMenuMusic();
      this.stopAmbient();
    }
  },
  setSfxEnabled(on) { this.sfxEnabled = on; },
  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.bgmAudio) this.bgmAudio.volume = this.bgmVolume * this.musicVolume;
    if (this.menuMusic) this.menuMusic.volume = this.menuMusicVolume * this.musicVolume;
    if (this.ambientAudio) this.ambientAudio.volume = this.ambientVolume * this.musicVolume;
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
    if (s.menuMusicTrackId && MENU_MUSIC_TRACKS.some((t) => t.id === s.menuMusicTrackId)) {
      audio.menuMusicTrackId = s.menuMusicTrackId;
    }
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
      menuMusicTrackId: audio.menuMusicTrackId,
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
  ambientAnims: { active: [], nextSpawnAt: 0 },  // animations d'ambiance par biome
  attackFx: [],                    // legacy, conservé pour compat — vidé en pratique
  explosions: [],
  damageNumbers: [],               // textes flottants -X / +X qui s'élèvent au-dessus des unités
  lightning: null,                // { x, y1, y2, age, ttl } pendant l'animation
  lightningCooldown: 0,           // secondes restantes avant la prochaine charge
  lightningAiming: false,         // true = curseur de visée actif, attend un clic sur la map
  stats: { player: makeStats(), enemy: makeStats() },
  gameOver: null,
  camera: { x: 0, shake: null },  // shake: { magnitude, ttl, age } pour les events critiques
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

// IEM (impulsion électro-magnétique) : sort coûteux qui annihile toutes les
// unités mobiles des deux côtés. Conçu pour clore une vague hors de contrôle
// ou faire reset l'économie de l'adversaire. Plus cher et plus long que l'éclair.
const IEM_COOLDOWN_SEC = 60;
const IEM_COST = 400;
const IEM_TTL_SEC = 1.2;

// Drop Renforts : spawn 3 unités tier I "light" gratuites pour le camp lanceur,
// directement à la sortie de base. Permet de réagir rapidement à une percée
// adverse sans attendre la production de factory.
const DROP_COOLDOWN_SEC = 50;
const DROP_COST = 200;
const DROP_UNIT_COUNT = 3;

// Surge Économique : un boost immédiat + 2.5x le revenu passif pendant 15s.
// Outil de comeback ou d'accélération mid-game.
const SURGE_COOLDOWN_SEC = 60;
const SURGE_COST = 100;
const SURGE_INSTANT_BONUS = 200;
const SURGE_DURATION_SEC = 15;
const SURGE_INCOME_MULT = 2.5;

// Pickups sur la carte (coffres d'or). Spawn périodique dans la zone neutre,
// la première unité (peu importe le camp) qui passe dans le radius le récolte
// pour son camp. Crée un objectif territorial qui peut renverser une partie.
const PICKUP_SPAWN_INTERVAL = 30;   // secondes entre 2 spawns tant que < max
const PICKUP_LIFETIME = 30;         // secondes avant disparition
const PICKUP_RADIUS = 30;
const PICKUP_VALUE = 150;
const PICKUP_MAX_ON_MAP = 3;
// Zone de spawn : neutre, en évitant les abords directs des remparts
const PICKUP_X_MIN = CONFIG.BASE_W + 200;     // 480
const PICKUP_X_MAX = CONFIG.W - CONFIG.BASE_W - 200;  // 1520
const PICKUP_Y_MIN = CONFIG.HUD_H + 80;       // 140
const PICKUP_Y_MAX = CONFIG.H - 80;           // 640

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
    factoriesBuiltByType: { light: 0, heavy: 0, swarmer: 0, sniper: 0, air: 0, medic: 0 },
    unitsSpawnedByType: { light: 0, heavy: 0, swarmer: 0, sniper: 0, air: 0, medic: 0 },
    // Timeline pour graphique post-game : push { t, money, army } toutes les ~2s.
    timeline: [],
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
  // Tier II / III des factories (skins de fusion)
  "factory-light-player-t2",   "factory-light-enemy-t2",
  "factory-light-player-t3",   "factory-light-enemy-t3",
  "factory-heavy-player-t2",   "factory-heavy-enemy-t2",
  "factory-heavy-player-t3",   "factory-heavy-enemy-t3",
  "factory-swarmer-player-t2", "factory-swarmer-enemy-t2",
  "factory-swarmer-player-t3", "factory-swarmer-enemy-t3",
  "factory-sniper-player-t2",  "factory-sniper-enemy-t2",
  "factory-sniper-player-t3",  "factory-sniper-enemy-t3",
  "factory-air-player-t2",     "factory-air-enemy-t2",
  "factory-air-player-t3",     "factory-air-enemy-t3",
  "factory-medic-player-t2",   "factory-medic-enemy-t2",
  "factory-medic-player-t3",   "factory-medic-enemy-t3",
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
  // Médic : factory + 4 frames d'animation par camp
  "factory-medic-player", "factory-medic-enemy",
  "unit-medic-player-0", "unit-medic-player-1",
  "unit-medic-player-2", "unit-medic-player-3",
  "unit-medic-enemy-0", "unit-medic-enemy-1",
  "unit-medic-enemy-2", "unit-medic-enemy-3",
  // Médic skins T1/T2 : 4 frames × 2 camps × 2 tiers
  "unit-medic-player-t1-0", "unit-medic-player-t1-1",
  "unit-medic-player-t1-2", "unit-medic-player-t1-3",
  "unit-medic-player-t2-0", "unit-medic-player-t2-1",
  "unit-medic-player-t2-2", "unit-medic-player-t2-3",
  "unit-medic-enemy-t1-0", "unit-medic-enemy-t1-1",
  "unit-medic-enemy-t1-2", "unit-medic-enemy-t1-3",
  "unit-medic-enemy-t2-0", "unit-medic-enemy-t2-1",
  "unit-medic-enemy-t2-2", "unit-medic-enemy-t2-3",
  // === Skins boutique : tier 1 (Rare) + tier 2 (Epic), player + enemy ===
  // Player skins (mêmes sprites tous biomes — le player garde sa famille bleue)
  "unit-light-player-t1", "unit-light-player-t2",
  "unit-heavy-player-t1", "unit-heavy-player-t2",
  "unit-swarmer-player-t1", "unit-swarmer-player-t2",
  "unit-sniper-player-t1", "unit-sniper-player-t2",
  "unit-air-player-t1", "unit-air-player-t2",
  // Enemy skins (biome-specific : rouge desert / vert jungle / gunmetal snow)
  "unit-light-enemy-t1", "unit-light-enemy-t2",
  "unit-heavy-enemy-t1", "unit-heavy-enemy-t2",
  "unit-swarmer-enemy-t1", "unit-swarmer-enemy-t2",
  "unit-sniper-enemy-t1", "unit-sniper-enemy-t2",
  "unit-air-enemy-t1", "unit-air-enemy-t2",
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
  // Ambient anim assets
  "anim-tumbleweed",
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
  // Skins enemy tier 1/2 — changent aussi par biome
  "unit-light-enemy-t1", "unit-light-enemy-t2",
  "unit-heavy-enemy-t1", "unit-heavy-enemy-t2",
  "unit-swarmer-enemy-t1", "unit-swarmer-enemy-t2",
  "unit-sniper-enemy-t1", "unit-sniper-enemy-t2",
  "unit-air-enemy-t1", "unit-air-enemy-t2",
  // Factories T2/T3 enemy — biome-specific
  "factory-light-enemy-t2", "factory-light-enemy-t3",
  "factory-heavy-enemy-t2", "factory-heavy-enemy-t3",
  "factory-swarmer-enemy-t2", "factory-swarmer-enemy-t3",
  "factory-sniper-enemy-t2", "factory-sniper-enemy-t3",
  "factory-air-enemy-t2", "factory-air-enemy-t3",
  // Médic enemy — factory + 4 frames × 3 tiers (T0/T1/T2) biome-specific
  "factory-medic-enemy", "factory-medic-enemy-t2", "factory-medic-enemy-t3",
  "unit-medic-enemy-0", "unit-medic-enemy-1",
  "unit-medic-enemy-2", "unit-medic-enemy-3",
  "unit-medic-enemy-t1-0", "unit-medic-enemy-t1-1",
  "unit-medic-enemy-t1-2", "unit-medic-enemy-t1-3",
  "unit-medic-enemy-t2-0", "unit-medic-enemy-t2-1",
  "unit-medic-enemy-t2-2", "unit-medic-enemy-t2-3",
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
    // Les tourelles défendent contre TOUTES les couches (sol + air) :
    // c'est le contre principal aux drones, qu'on ne peut pas atteindre avec
    // les unités ground classiques (sauf sniper).
    layer: "ground",
    canTargetAir: true,
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
  if (side === "player") tutorialOnAction("build_turret");
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
  // 7 boutons (raccourcis 1-7) — médic en avant-dernier, turret en dernier
  // (placement sur le mur, pas sur la grille).
  const types = ["light", "heavy", "swarmer", "sniper", "air", "medic", "turret"];
  game.ui.buttons = types.map((t, i) => ({
    id: `build-${t}`,
    type: t,
    x: hudBuildX(i),
    y: HUD_LAYOUT.Y,
    w: HUD_LAYOUT.BUILD_BTN_W,
    h: HUD_LAYOUT.BTN_H,
  }));
}

function pointInRect(px, py, r) {
  // Pad léger sur device tactile : compense l'imprécision du doigt sur les
  // petits boutons (le visuel ne change pas, seulement la zone de hit).
  // 6px tout autour ≈ 12px de zone élargie totale, suffisant pour un usage
  // standard sans créer de conflits sérieux entre boutons adjacents.
  const pad = (typeof IS_TOUCH !== "undefined" && IS_TOUCH) ? 6 : 0;
  return px >= r.x - pad && px <= r.x + r.w + pad && py >= r.y - pad && py <= r.y + r.h + pad;
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
  if (!slot || slot.factory || slot.coveredBy != null) return false;
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
    tier: 1,                          // 1, 2 (1x2) ou 3 (2x2) — augmenté par la fusion
    spanSlots: [slotIndex],           // indices des slots couverts par cette factory
    scale: 0.1,                        // pour anim scale-in à la pose
    scaleAnim: { from: 0.1, to: 1, age: 0, ttl: 0.30 },
    spawnPulse: null,
  };
  audio.playSFX("place");
  if (side === "player") tutorialOnAction("build_factory");
  return true;
}

// ── FUSION ──────────────────────────────────────────────────────────────
// Multiplicateurs appliqués aux factories fusionnées (tier II et III).
// Volontairement généreux pour récompenser le coût d'opportunité (2 ou 4 slots).
const TIER_MULTIPLIER     = { 1: 1.0, 2: 1.85, 3: 3.10 }; // HP & dégâts unités
const TIER_HP_MULTIPLIER  = { 1: 1.0, 2: 2.40, 3: 4.50 }; // PV de la factory
const TIER_PROD_MULTIPLIER= { 1: 1.0, 2: 0.65, 3: 0.42 }; // cadence (× interval — plus bas = plus rapide)
const TIER_SPEED_MULTIPLIER = { 1: 1.0, 2: 1.06, 3: 1.15 }; // vitesse de l'unité
const TIER_RANGE_MULTIPLIER = { 1: 1.0, 2: 1.10, 3: 1.22 }; // portée de tir
const TIER_RADIUS_MULTIPLIER= { 1: 1.0, 2: 1.18, 3: 1.40 }; // taille visuelle

function tierLabel(tier) {
  return tier === 3 ? "TIER III" : tier === 2 ? "TIER II" : "TIER I";
}

// Vérifie si deux slots de factories adjacentes peuvent fusionner.
function canMergeFactories(side, aIdx, bIdx) {
  const state = game[side];
  const a = state.slots[aIdx];
  const b = state.slots[bIdx];
  if (!a || !b || !a.factory || !b.factory) return false;
  if (a.factory.typeId !== b.factory.typeId) return false;
  const tier = a.factory.tier || 1;
  if ((b.factory.tier || 1) !== tier) return false;
  if (tier >= 3) return false; // tier max
  const aSpan = (a.factory.spanSlots || [aIdx]).map((i) => state.slots[i]);
  const bSpan = (b.factory.spanSlots || [bIdx]).map((i) => state.slots[i]);
  if (tier === 1) {
    // Tier 1+1 : horizontalement adjacents (même rangée, col±1)
    return a.row === b.row && Math.abs(a.col - b.col) === 1;
  }
  // Tier 2+2 : verticalement adjacents (rangées consécutives), mêmes colonnes
  if (tier === 2) {
    const aCols = aSpan.map((s) => s.col).sort();
    const bCols = bSpan.map((s) => s.col).sort();
    if (aCols.length !== 2 || bCols.length !== 2) return false;
    if (aCols[0] !== bCols[0] || aCols[1] !== bCols[1]) return false;
    const aRows = aSpan.map((s) => s.row);
    const bRows = bSpan.map((s) => s.row);
    if (new Set(aRows).size !== 1 || new Set(bRows).size !== 1) return false;
    return Math.abs(aRows[0] - bRows[0]) === 1;
  }
  return false;
}

// Trouve une factory voisine fusionnable de slot, retourne son index ou null.
function findMergePartner(side, slotIdx) {
  const state = game[side];
  for (let i = 0; i < state.slots.length; i++) {
    if (i === slotIdx) continue;
    if (canMergeFactories(side, slotIdx, i)) return i;
  }
  return null;
}

function tryMergeFactories(side, aIdx, bIdx) {
  if (!canMergeFactories(side, aIdx, bIdx)) return false;
  const state = game[side];
  const a = state.slots[aIdx];
  const b = state.slots[bIdx];

  // Le slot "primary" est le plus en haut/gauche — toute la factory y vit.
  const primaryIsA = (a.row < b.row) || (a.row === b.row && a.col < b.col);
  const primary = primaryIsA ? a : b;
  const other = primaryIsA ? b : a;
  const primaryIdx = primaryIsA ? aIdx : bIdx;
  const otherIdx = primaryIsA ? bIdx : aIdx;

  const oldTier = primary.factory.tier || 1;
  const newTier = oldTier + 1;

  // Span complet : union de a.span + b.span
  const aSpan = a.factory.spanSlots || [aIdx];
  const bSpan = b.factory.spanSlots || [bIdx];
  const span = Array.from(new Set([...aSpan, ...bSpan]));

  // Upgrades fusionnés : prend le max de chaque stat
  const mergedUpgrades = {};
  const allStats = new Set([
    ...Object.keys(a.factory.upgrades || {}),
    ...Object.keys(b.factory.upgrades || {}),
  ]);
  for (const k of allStats) {
    mergedUpgrades[k] = Math.max(
      a.factory.upgrades?.[k] || 0,
      b.factory.upgrades?.[k] || 0,
    );
  }

  const type = FACTORY_TYPES[primary.factory.typeId];
  const totalInvested = a.factory.totalInvested + b.factory.totalInvested;
  const tierHp = type.hp * TIER_HP_MULTIPLIER[newTier];

  primary.factory = {
    typeId: primary.factory.typeId,
    side,
    hp: tierHp,
    prodTimer: 0,
    level: 1,
    upgrades: mergedUpgrades,
    totalInvested,
    mode: primary.factory.mode || "attack",
    tier: newTier,
    spanSlots: span,
  };
  primary.coveredBy = null;

  // Tous les autres slots du span pointent vers primary
  for (const idx of span) {
    if (idx === primaryIdx) continue;
    const s = state.slots[idx];
    s.factory = null;
    s.coveredBy = primaryIdx;
  }

  audio.playSFX("upgrade");
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
  if (side === "player") tutorialOnAction("upgrade");
  return true;
}

// Vend une factory : rembourse 50% du totalInvested
function sellFactory(side, slotIndex) {
  const state = game[side];
  let slot = state.slots[slotIndex];
  if (!slot) return false;
  // Si on cible un slot couvert par une fusion, on remonte au primary
  if (slot.coveredBy != null) {
    slot = state.slots[slot.coveredBy];
    if (!slot) return false;
  }
  if (!slot.factory) return false;
  const refund = Math.floor(slot.factory.totalInvested * SELL_RATIO);
  state.money += refund;
  // FX scale-out : burst de particules au centre de la factory + flash
  const span = slot.factory.spanSlots || [state.slots.indexOf(slot)];
  const spanSlots = span.map((i) => state.slots[i]).filter(Boolean);
  if (spanSlots.length) {
    const bx = Math.min(...spanSlots.map((s) => s.x));
    const by = Math.min(...spanSlots.map((s) => s.y));
    const bw = Math.max(...spanSlots.map((s) => s.x + s.size)) - bx;
    const bh = Math.max(...spanSlots.map((s) => s.y + s.size)) - by;
    spawnDeathBurst(bx + bw / 2, by + bh / 2, side, Math.min(bw, bh) * 0.5);
  }
  for (const idx of span) {
    const s = state.slots[idx];
    if (!s) continue;
    s.factory = null;
    s.coveredBy = null;
  }
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

  // Pulse visuel sur la factory à chaque unité produite
  factory.spawnPulse = 0;

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
  // Cas médic : cible l'allié blessé le plus prioritaire à portée.
  // Priorité = HP manquants (qui a perdu le plus de PV).
  if (u.stats?.isMedic) {
    let best = null;
    let bestMissing = 0;
    for (const other of game.units) {
      if (other === u) continue;
      if (other.side !== u.side || other.hp <= 0) continue;
      if (other.stats?.isMedic) continue; // un médic ne se soigne pas / pas d'autre médic
      const missing = (other.maxHp || other.stats?.hp || 0) - other.hp;
      if (missing <= 0) continue; // déjà au max
      const d = dist(u.x, u.y, other.x, other.y);
      if (d > u.stats.range) continue;
      if (missing > bestMissing) { best = other; bestMissing = missing; }
    }
    return best;
  }

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
  // amount < 0 = soin (médic). Clamp aux PV max.
  if (amount < 0) {
    const maxHp = target.maxHp || target.stats?.hp || target.hp;
    const before = target.hp;
    target.hp = Math.min(maxHp, target.hp - amount);
    const healed = target.hp - before;
    if (healed > 0) spawnDamageNumber(target, healed, true);
    return;
  }
  target.hp -= amount;
  if (attacker) {
    game.stats[attacker.side].damageDealt += amount;
    game.stats[target.side].damageTaken += amount;
  }
  // Damage number floating au-dessus de la cible
  if (amount > 0) spawnDamageNumber(target, amount, false);
  if (target.hp <= 0 && wasAlive) {
    if (attacker) {
      game[attacker.side].money += target.stats.killReward;
      game.stats[attacker.side].unitsKilled++;
      game.stats[target.side].unitsLost++;
    }
    audio.playSFX("death");
    // Burst supplémentaire à la mort (au-delà de l'explosion classique)
    spawnDeathBurst(target.x, target.y, target.side, target.stats?.radius || 8);
    // Shake léger pour les grosses unités qui crèvent
    if ((target.stats?.hp || 0) >= 80) triggerCameraShake(0.4, 0.15);
  }
}

function spawnDamageNumber(target, value, isHeal) {
  if (!Number.isFinite(value) || value <= 0) return;
  game.damageNumbers.push({
    x: target.x + (Math.random() - 0.5) * 10,
    y: target.y - (target.stats?.radius || 8) - 4,
    vx: (Math.random() - 0.5) * 18,
    vy: -52 - Math.random() * 14,
    value: Math.round(value),
    isHeal: !!isHeal,
    side: target.side,
    age: 0,
    ttl: 0.95,
  });
  // Cap pour éviter de stocker à l'infini lors de gros affrontements
  if (game.damageNumbers.length > 80) game.damageNumbers.splice(0, game.damageNumbers.length - 80);
  // En MP host, on accumule pour relayer au guest dans le prochain snapshot.
  if (game.mode === "mp" && game.mp?.role === "host") {
    if (!game.mp.outgoingDmg) game.mp.outgoingDmg = [];
    game.mp.outgoingDmg.push({
      x: target.x, y: target.y - (target.stats?.radius || 8) - 4,
      value: Math.round(value), isHeal: !!isHeal, side: target.side,
    });
    if (game.mp.outgoingDmg.length > 60) game.mp.outgoingDmg.shift();
  }
}

function updateDamageNumbers(dt) {
  for (const d of game.damageNumbers) {
    d.age += dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vy += 64 * dt; // gravité : les chiffres ralentissent puis retombent
  }
  // Cleanup : retirer ceux qui ont fini leur ttl
  game.damageNumbers = game.damageNumbers.filter((d) => d.age < d.ttl);
}

function drawDamageNumbers(ctx) {
  for (const d of game.damageNumbers) {
    const t = d.age / d.ttl;
    const alpha = (1 - t).toFixed(3);
    const size = 14 + (d.isHeal ? 1 : Math.min(6, d.value / 12));
    ctx.font = `bold ${Math.round(size)}px -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const baseColor = d.isHeal ? "74,222,128" : (d.side === "player" ? "254,202,202" : "191,219,254");
    // Liseré noir pour la lisibilité
    ctx.strokeStyle = `rgba(0,0,0,${(0.55 * (1 - t)).toFixed(3)})`;
    ctx.lineWidth = 3;
    const txt = d.isHeal ? `+${d.value}` : `−${d.value}`;
    ctx.strokeText(txt, d.x, d.y);
    ctx.fillStyle = `rgba(${baseColor},${alpha})`;
    ctx.fillText(txt, d.x, d.y);
  }
}

// Particules au moment de la mort d'une unité — petite gerbe de débris en
// plus de l'explosion principale (gérée par spawnExplosion / drawExplosions).
function spawnDeathBurst(x, y, side, radius) {
  if (!game.flashes) game.flashes = [];
  const n = 6 + Math.min(8, Math.floor(radius / 3));
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const speed = 60 + Math.random() * 80;
    game.flashes.push({
      kind: "debris",
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      age: 0,
      ttl: 0.55 + Math.random() * 0.25,
      side,
      size: 2 + Math.random() * 2.5,
    });
  }
}

function triggerCameraShake(magnitude, ttl) {
  const cur = game.camera.shake;
  if (!cur || magnitude > cur.magnitude * (1 - cur.age / cur.ttl)) {
    game.camera.shake = { magnitude, ttl, age: 0 };
  }
  // Relai au guest via le prochain snapshot
  if (game.mode === "mp" && game.mp?.role === "host") {
    const cu = game.mp.outgoingShake;
    if (!cu || magnitude > cu.magnitude) {
      game.mp.outgoingShake = { magnitude, ttl };
    }
  }
}

function updateCameraShake(dt) {
  if (!game.camera.shake) return;
  game.camera.shake.age += dt;
  if (game.camera.shake.age >= game.camera.shake.ttl) game.camera.shake = null;
}

// ── MODE VAGUES ─────────────────────────────────────────────────────────
// L'ennemi n'a aucun bâtiment visible, mais conceptuellement il "améliore
// ses bâtiments" à mesure que les vagues progressent : son tier d'usine
// monte (I → II → III), ce qui applique TIER_MULTIPLIER (HP & dmg),
// TIER_SPEED_MULTIPLIER, TIER_RANGE_MULTIPLIER et TIER_RADIUS_MULTIPLIER
// aux unités spawnées — mêmes paliers que les usines joueur.
//   - Vagues 1-2 : Tier I  (×1.00)
//   - Vagues 3-6 : Tier II (×1.85 HP/dmg, ×1.06 speed, ×1.10 range, ×1.18 radius)
//   - Vagues 7+  : Tier III (×3.10 HP/dmg, ×1.15 speed, ×1.22 range, ×1.40 radius)
// Par-dessus le tier, scaling fin de +8%/vague (HP & dmg, cumulé).
//
// Spawn interval indexé sur le nombre d'unités : durée doublée à chaque
// triplement d'unités au-delà de 2430 (ancre 8s) — 810→6s, 2430→8s,
// 7290→16s, 21870→32s, 65610→64s, 196830→128s. Plancher 6s. Multi-spawn
// par frame absorbe les intervals très courts. Timer inter-vague : 10s.
// Taille de vague ×3 entre chaque vague (base 10) sans cap : v1=10, v2=30,
// v3=90, v4=270, v5=810, v6=2430… Fin de vague = queue vide → timer inter-
// vague de 3s puis vague suivante (même si des unités sont encore vivantes
// — les restes s'accumulent → pression croissante).
//
// Boss : vagues %5 → heavy ×3 HP / ×2 dmg.
// Mini-boss : vagues 3, 7, 11… (≥3 et %4===3, sauf si déjà boss) → heavy
// ×2 HP / dmg normal.
function enemyTierForWave(waveNum) {
  if (waveNum <= 2) return 1;
  if (waveNum <= 6) return 2;
  return 3;
}

function buildWaveQueue(waveNum) {
  const queue = [];
  // Densité : ×3 entre chaque vague (geometric). Base = 10 unités vague 1.
  // Pas de cap : v1=10, v2=30, v3=90, v4=270, v5=810, v6=2430… framerate
  // mis à l'épreuve volontairement à partir de la vague 5-6.
  const total = Math.round(10 * Math.pow(3, waveNum - 1));
  for (let i = 0; i < total; i++) {
    const r = Math.random();
    let typeId;
    if (waveNum < 3) {
      typeId = r < 0.7 ? "light" : "swarmer";
    } else if (waveNum < 6) {
      typeId = r < 0.40 ? "light" : r < 0.65 ? "swarmer" : r < 0.88 ? "heavy" : "sniper";
    } else if (waveNum < 10) {
      typeId = r < 0.25 ? "light" : r < 0.45 ? "swarmer" : r < 0.65 ? "heavy" : r < 0.85 ? "sniper" : "air";
    } else {
      typeId = r < 0.18 ? "light" : r < 0.36 ? "swarmer" : r < 0.55 ? "heavy" : r < 0.78 ? "sniper" : "air";
    }
    queue.push({ typeId, isBoss: false, isMiniBoss: false });
  }
  const isBossWave = waveNum % 5 === 0;
  const isMiniBossWave = !isBossWave && waveNum >= 3 && waveNum % 4 === 3;
  if (isMiniBossWave) {
    queue.push({ typeId: "heavy", isBoss: false, isMiniBoss: true });
  }
  if (isBossWave) {
    queue.push({ typeId: "heavy", isBoss: true, isMiniBoss: false });
  }
  return queue;
}

function spawnWaveUnit(spec, waveNum) {
  // spec : { typeId, isBoss, isMiniBoss } (rétrocompat : si string passée, traité comme typeId)
  const typeId = typeof spec === "string" ? spec : spec.typeId;
  const isBoss = typeof spec === "string" ? false : !!spec.isBoss;
  const isMiniBoss = typeof spec === "string" ? false : !!spec.isMiniBoss;
  const ut = UNIT_TYPES[typeId];
  if (!ut) return;
  // Tier ennemi : applique les mêmes multiplicateurs que les usines joueur.
  const tier = enemyTierForWave(waveNum);
  const tierMult     = TIER_MULTIPLIER[tier] || 1;       // HP & dmg
  const speedMult    = TIER_SPEED_MULTIPLIER[tier] || 1;
  const rangeMult    = TIER_RANGE_MULTIPLIER[tier] || 1;
  const radiusMult   = TIER_RADIUS_MULTIPLIER[tier] || 1;
  // Scaling fin : +8%/vague (cumulé). Boss : ×3 HP / ×2 dmg. Mini-boss : ×2 HP.
  const sm = 1 + (waveNum - 1) * 0.08;
  const bossHpMult = isBoss ? 3 : (isMiniBoss ? 2 : 1);
  const bossDmgMult = isBoss ? 2 : 1;
  const bossSpeedMult = isBoss ? 0.85 : (isMiniBoss ? 0.92 : 1);
  const bossRadiusMult = isBoss ? 1.4 : (isMiniBoss ? 1.2 : 1);
  const stats = {
    hp: ut.hp * sm * tierMult * bossHpMult,
    damage: ut.damage * sm * tierMult * bossDmgMult,
    speed: ut.speed * speedMult * bossSpeedMult,
    range: ut.range * rangeMult,
    radius: ut.radius * radiusMult * bossRadiusMult,
    attackInterval: ut.attackInterval,
    killReward: Math.round((ut.killReward || 5) * (0.8 + waveNum * 0.05) * (isBoss ? 5 : (isMiniBoss ? 2.5 : 1))),
    layer: ut.layer || "ground",
    canTargetAir: !!ut.canTargetAir,
    tier,
  };
  const gateRows = CONFIG.PATH_ROWS;
  const gateRow = gateRows[Math.floor(Math.random() * gateRows.length)];
  const gate = getGateCenter("enemy", gateRow);
  game.units.push({
    side: "enemy",
    typeId,
    kind: "unit",
    isBoss,
    isMiniBoss,
    x: gate.x,
    y: gate.y,
    gateY: gate.y,
    hp: stats.hp,
    maxHp: stats.hp,
    stats,
    target: null,
    attackCooldown: 0,
    wanderY: null,
    wanderTimer: 0,
    mode: "attack",
    exitWaypoints: [],
    stationary: false,
  });
  game.stats.enemy.unitsSpawned++;
}

function updateWaveSpawning(dt) {
  const w = game.wave;
  if (!w?.active) return;
  if (!w.inWave) {
    w.betweenWaves -= dt;
    if (w.betweenWaves <= 0) {
      w.queue = buildWaveQueue(w.current);
      w.totalThisWave = w.queue.length;
      w.inWave = true;
      w.spawnTimer = 0;
      // Spawn interval indexé sur le nombre d'unités : la durée DOUBLE à
      // chaque triplement d'unités au-delà de 2430 (ancre à 8s).
      //   ≤810   : 6s (plancher)
      //    2430  : 8s
      //    7290  : 16s
      //   21870  : 32s
      //   65610  : 64s
      //  196830  : 128s
      // Multi-spawn par frame absorbe les intervals très courts.
      const totalThis = w.totalThisWave;
      const tripleSteps = Math.log(totalThis / 2430) / Math.log(3);
      const targetDuration = Math.max(6, 8 * Math.pow(2, tripleSteps));
      w.spawnInterval = targetDuration / totalThis;
      w.justClearedAt = null;
    }
    return;
  }
  if (w.queue.length > 0) {
    w.spawnTimer += dt;
    // Multi-spawn par frame : si spawnInterval < dt (cas des grosses vagues
    // avec interval ~0.01s à 60fps où dt ≈ 0.016s), on spawne autant d'unités
    // que la frame autorise au lieu d'être plafonné à 1/frame.
    while (w.queue.length > 0 && w.spawnTimer >= w.spawnInterval) {
      w.spawnTimer -= w.spawnInterval;
      const spec = w.queue.shift();
      spawnWaveUnit(spec, w.current);
    }
    return;
  }
  // Toutes spawnées : on clôt immédiatement la vague (sans attendre la mort
  // des unités encore en jeu) et on déclenche le timer inter-vague. La
  // prochaine vague démarre dans betweenWaves secondes, peu importe l'état du
  // terrain — les restes éventuels viennent se cumuler à la suivante, ce qui
  // crée la pression croissante voulue.
  w.defeated = w.current;
  const bonus = 100 + w.current * 25;
  game.player.money += bonus;
  spawnDamageNumber({ x: 200, y: CONFIG.HUD_H + 60, side: "player", stats: { radius: 0 } }, bonus, true);
  triggerCameraShake(0.6, 0.25);
  w.lastBonus = bonus;
  w.current++;
  w.inWave = false;
  w.betweenWaves = 10;
  w.justClearedAt = performance.now();
}

// Skip la pause d'inter-vague (déclenche immédiatement la prochaine vague).
function skipWaveBreather() {
  const w = game.wave;
  if (!w?.active || w.inWave) return false;
  w.betweenWaves = 0;
  return true;
}

// Panneau bas-centre du mode Vagues : numéro de vague, barre de progression
// "ennemis restants / total", composition (icones), bouton Skip pendant la
// pause inter-vague. Glassmorphique violet pour bien le distinguer du HUD.
function drawWaveOverlay(ctx) {
  const w = game.wave;
  if (!w?.active) return;
  const cx = CONFIG.CANVAS_W / 2;
  const W = 460, H = 86;
  // En bas : 24px de marge depuis le bord inférieur
  const y = CONFIG.H - H - 24;
  const x = cx - W / 2;

  // Panneau glass violet
  ctx.save();
  drawGlass(ctx, x, y, W, H, {
    radius: 16,
    tint: "rgba(76, 29, 149, 0.55)",
    border: "rgba(168, 85, 247, 0.65)",
  });

  // Header : numéro vague + état
  // La vague est gouvernée par le SPAWN (pas les kills) : la barre reflète
  // combien d'unités de la vague ont déjà spawn.
  const aliveCount = game.units.filter((u) => u.side === "enemy" && u.hp > 0 && !u.stationary).length;
  const total = w.totalThisWave || 0;
  const toSpawn = w.queue.length;
  const spawned = Math.max(0, total - toSpawn);
  const ratio = total > 0 ? spawned / total : 0;
  const hasBoss = w.queue.some((s) => s?.isBoss) || game.units.some((u) => u.isBoss && u.side === "enemy" && u.hp > 0);
  const hasMiniBoss = w.queue.some((s) => s?.isMiniBoss) || game.units.some((u) => u.isMiniBoss && u.side === "enemy" && u.hp > 0);
  const enemyTier = enemyTierForWave(w.current);
  const tierRoman = enemyTier === 1 ? "I" : enemyTier === 2 ? "II" : "III";

  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let waveLabel = `🌊 Vague ${w.current}  ·  ⚙️ Tier ${tierRoman}`;
  if (hasBoss) waveLabel += "  ·  👑 BOSS";
  else if (hasMiniBoss) waveLabel += "  ·  ⚔️ Mini-boss";
  ctx.fillText(waveLabel, x + 16, y + 12);

  ctx.font = "11px -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.textAlign = "right";
  ctx.fillText(`Vagues clear : ${w.defeated || 0}`, x + W - 16, y + 14);

  // Barre de progression "kill"
  const barX = x + 16;
  const barY = y + 36;
  const barW = W - 32;
  const barH = 14;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundedRect(ctx, barX, barY, barW, barH, 7);
  ctx.fill();
  if (w.inWave && total > 0) {
    const fillW = barW * ratio;
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, "#a855f7");
    grad.addColorStop(1, "#22d3ee");
    ctx.fillStyle = grad;
    if (fillW > 4) {
      roundedRect(ctx, barX, barY, Math.max(4, fillW), barH, 7);
      ctx.fill();
    }
  }
  // Texte de progression sur la barre
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (w.inWave) {
    const status = `${spawned} / ${total} spawn · ${aliveCount} en jeu`;
    ctx.fillText(status, barX + barW / 2, barY + barH / 2);
  } else {
    const sec = Math.max(0, Math.ceil(w.betweenWaves));
    ctx.fillText(`✓ Vague ${w.current - 1} terminée  ·  +${w.lastBonus || 0}💰  ·  Suivante dans ${sec}s`, barX + barW / 2, barY + barH / 2);
  }

  // Bouton Skip pendant la pause
  game.ui.waveSkipBtn = null;
  if (!w.inWave) {
    const skipW = 110, skipH = 22;
    const skipRect = { x: x + W - skipW - 10, y: y + H - skipH - 8, w: skipW, h: skipH };
    const hover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, skipRect);
    ctx.fillStyle = hover ? "rgba(168, 85, 247, 0.85)" : "rgba(168, 85, 247, 0.55)";
    roundedRect(ctx, skipRect.x, skipRect.y, skipRect.w, skipRect.h, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⏩ Vague suivante", skipRect.x + skipRect.w / 2, skipRect.y + skipRect.h / 2);
    game.ui.waveSkipBtn = skipRect;
  } else {
    // Composition : mini-icones des prochains spawns + ceux à venir dans la queue
    const compoY = y + H - 22;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "10px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const counts = {};
    for (const s of w.queue) {
      const tid = typeof s === "string" ? s : s.typeId;
      counts[tid] = (counts[tid] || 0) + 1;
    }
    const icon = { light: "🤖", heavy: "🛡️", swarmer: "🐝", sniper: "🎯", air: "✈️", medic: "⚕️" };
    let txt = "À venir : ";
    if (w.queue.length === 0) txt = "Toutes les unités spawnent — kill-les pour passer";
    else {
      const parts = [];
      for (const k of Object.keys(counts)) parts.push(`${icon[k] || "•"}×${counts[k]}`);
      txt += parts.join("  ");
    }
    ctx.fillText(txt, x + 16, compoY);
  }

  ctx.restore();
}

function currentShakeOffset() {
  const s = game.camera.shake;
  if (!s) return { x: 0, y: 0 };
  const decay = 1 - s.age / s.ttl;
  const mag = s.magnitude * decay * 14;
  return { x: (Math.random() - 0.5) * mag, y: (Math.random() - 0.5) * mag * 0.7 };
}

// Met à jour les animations attachées aux factories (scale-in à la pose,
// pulse à chaque spawn d'unité).
function updateFactoryAnims(dt) {
  for (const side of ["player", "enemy"]) {
    const s = game[side];
    if (!s?.slots) continue;
    for (const slot of s.slots) {
      const f = slot.factory;
      if (!f) continue;
      if (f.scaleAnim) {
        f.scaleAnim.age += dt;
        const t = Math.min(1, f.scaleAnim.age / f.scaleAnim.ttl);
        // Ease-out elastic léger pour un pop juicy
        const eased = 1 - Math.pow(1 - t, 3);
        f.scale = f.scaleAnim.from + (f.scaleAnim.to - f.scaleAnim.from) * eased;
        if (t >= 1) f.scaleAnim = null;
      }
      if (f.spawnPulse != null) {
        f.spawnPulse += dt;
        if (f.spawnPulse > 0.4) f.spawnPulse = null;
      }
    }
  }
}


// FX visuel du soin : petite traînée verte du médic vers la cible + halo
// circulaire au point d'arrivée. On réutilise game.flashes (structure unifiée
// pour les effets ponctuels au-dessus du sol).
function spawnHealFx(sx, sy, tx, ty) {
  if (!game.flashes) game.flashes = [];
  game.flashes.push({ kind: "heal", x: sx, y: sy, tx, ty, age: 0, ttl: 0.4 });
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
          if (u.stats.isMedic) {
            // Soin : applique un damage NÉGATIF pour incrémenter les PV, clamp
            // à maxHp côté applyDamage. Trigger un FX vert + ne joue pas
            // le bruit "shoot".
            const healAmt = u.stats.damage;
            applyDamage(u.target, -healAmt, u);
            spawnHealFx(u.x, u.y, u.target.x, u.target.y);
          } else {
            applyDamage(u.target, u.stats.damage, u);
            // Bolt visuel qui voyage du tireur à la cible (style Star Wars blaster
            // par type d'unité — light/heavy/swarmer/sniper/air ont chacun leur profil)
            spawnProjectile(u.x, u.y, u.target.x, u.target.y, u.typeId, u.side);
            audio.playSFX(`shoot-${u.typeId}`);
          }
          u.attackCooldown = u.stats.attackInterval;
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
      spawnDeathBurst(u.x, u.y, u.side, (u.stats?.radius || 8) + 4);
      audio.playSFX("crash");
      // Shake léger pour chaque coup à la base ; gros shake si la base est presque morte
      const remaining = game[targetSide].baseHP / Math.max(1, game[targetSide].baseHPMax);
      triggerCameraShake(remaining < 0.2 ? 1.0 : 0.5, 0.20);
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
    game.gameOver = { winner: "enemy", wavesCleared: game.wave?.defeated || 0 };
    audio.playSFX("lose");
    audio.stopMusic();
    audio.stopAmbient();
    triggerCameraShake(2.5, 0.6);
    if (game.wave?.active) recordWaveRun(game.wave.defeated || 0);
    else notifyGameOver("enemy");
  } else if (game.enemy.baseHP <= 0 && !game.wave?.active) {
    game.gameOver = { winner: "player" };
    audio.playSFX(mySide() === "player" ? "win" : "lose");
    audio.stopMusic();
    audio.stopAmbient();
    notifyGameOver("player");
  }
}

async function recordWaveRun(waves) {
  if (!window.RE_AUTH || !window.RE_AUTH.session) return;
  try {
    const { supabase } = await import("/lib/supabase.js");
    const { data, error } = await supabase.rpc("re_record_wave_run", { p_waves: waves });
    if (!error && data?.[0]) {
      game.gameOver.bestWave = data[0].best_wave;
      game.gameOver.wasRecord = data[0].was_record;
    }
  } catch (err) { console.warn("[wave] record run", err); }
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
  // En spectateur on n'enregistre rien (on n'a pas joué).
  if (game.mode === "mp" && game.mp?.role === "spectator") return;
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
    lobbyId:       game.mp?.lobbyId || null,
  };
  try {
    const res = await window.RE_AUTH.finishGame(payload);
    if (res?.ok && game.gameOver) {
      game.gameOver.reward = res.reward;
      if (typeof res.eloDelta === "number") game.gameOver.eloDelta = res.eloDelta;
    }
  } catch (e) {
    console.warn("[RE] finishGame failed:", e);
  }
}

// Applique le skin équipé aux couleurs du joueur (et la souffle au prochain frame)
const DEFAULT_ENEMY_COLOR = "#ef4444";
const DEFAULT_ENEMY_DARK = "#991b1b";

// Applique la couleur d'équipe (skin) du joueur courant à SON côté.
// Solo / host / spectateur : mySide() = "player" → on touche COLORS.player/playerDark.
// Guest MP : mySide() = "enemy" → on touche COLORS.enemy/enemyDark.
// L'autre côté garde sa couleur par défaut tant que applyPeerSkin n'a pas été
// appelée (avec le skin du peer reçu via le hello broadcast).
function applyTeamSkin() {
  const skin = window.RE_AUTH?.skin;
  const me = mySide();
  if (me === "player") {
    if (skin && skin.hex_color && skin.hex_color_dark) {
      COLORS.player = skin.hex_color;
      COLORS.playerDark = skin.hex_color_dark;
      COLORS.playerSoft = hexToRgba(skin.hex_color, 0.15);
    } else {
      COLORS.player = DEFAULT_PLAYER_COLOR;
      COLORS.playerDark = DEFAULT_PLAYER_DARK;
      COLORS.playerSoft = "rgba(59, 130, 246, 0.15)";
    }
  } else {
    if (skin && skin.hex_color && skin.hex_color_dark) {
      COLORS.enemy = skin.hex_color;
      COLORS.enemyDark = skin.hex_color_dark;
    } else {
      COLORS.enemy = DEFAULT_ENEMY_COLOR;
      COLORS.enemyDark = DEFAULT_ENEMY_DARK;
    }
  }
}

// Applique le skin reçu du peer à oppSide() pour que les troupes adverses
// arborent SA couleur, pas la couleur par défaut. Appelée par le handler
// onPeerInfo de multiplayer.js.
function applyPeerSkin(skin) {
  if (!skin || !skin.hex_color || !skin.hex_color_dark) return;
  const opp = oppSide();
  if (opp === "player") {
    COLORS.player = skin.hex_color;
    COLORS.playerDark = skin.hex_color_dark;
    COLORS.playerSoft = hexToRgba(skin.hex_color, 0.15);
  } else {
    COLORS.enemy = skin.hex_color;
    COLORS.enemyDark = skin.hex_color_dark;
  }
}

function hexToRgba(hex, alpha) {
  // Si on reçoit déjà une couleur rgba(...) ou hsla(...), on la passe-through
  // en remplaçant l'alpha existant (best-effort).
  if (typeof hex !== "string") return `rgba(255,255,255,${alpha})`;
  if (hex.startsWith("rgba") || hex.startsWith("rgb")) {
    return hex.replace(/[\d.]+\)$/, `${alpha})`);
  }
  if (hex.startsWith("hsla") || hex.startsWith("hsl")) {
    return hex.replace(/[\d.]+\)$/, `${alpha})`);
  }
  const h = hex.replace("#", "");
  // Supporte les hex 3-char (e.g. #abc) en les dédoublant
  const norm = h.length === 3
    ? h.split("").map((c) => c + c).join("")
    : h;
  const r = parseInt(norm.substring(0, 2), 16);
  const g = parseInt(norm.substring(2, 4), 16);
  const b = parseInt(norm.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(255,255,255,${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Quand la session ou le skin change (login/logout/équiper), on rafraîchit
if (typeof window !== "undefined") {
  window.addEventListener("re-auth-changed", applyTeamSkin);
}

// IA solo : trois personnalités piochées au démarrage de partie qui biaisent
// les choix de factories, plus une réaction à la composition adverse (plus
// de sniper / turret quand le joueur sort de l'air). L'IA pose aussi des
// turrets sur ses wall slots, plus tôt si l'air est repéré.
const AI_STRATEGIES = {
  rush:     { name: "rush",     bias: { swarmer: 2.0, light: 1.5, heavy: 0.6 }, defenseChance: 0.10, turretAffinity: 0.15 },
  balanced: { name: "balanced", bias: { swarmer: 1.0, light: 1.0, heavy: 1.0, sniper: 1.0, air: 1.0 }, defenseChance: 0.30, turretAffinity: 0.30 },
  defense:  { name: "defense",  bias: { heavy: 2.0, sniper: 1.6, swarmer: 0.5 }, defenseChance: 0.55, turretAffinity: 0.60 },
};

function pickAiStrategy() {
  const keys = Object.keys(AI_STRATEGIES);
  return AI_STRATEGIES[keys[Math.floor(Math.random() * keys.length)]];
}

function updateEnemyAI(dt) {
  const state = game.enemy;
  if (!state.aiStrategy) state.aiStrategy = pickAiStrategy();
  state.buildTimer += dt;
  if (state.buildTimer < AI_CONFIG.buildInterval) return;

  // 1) Tentative de placement d'une tourelle anti-air si le joueur a
  //    des drones (>= 2 visibles) et qu'il reste un wall slot libre.
  const playerAirCount = game.units.filter(
    (u) => u.side === "player" && u.stats?.layer === "air" && u.hp > 0
  ).length;
  const wallSlots = state.wallSlots || [];
  const freeWall = wallSlots.findIndex((w) => !w.turret);
  if (freeWall >= 0 && state.money >= TURRET_TYPE.cost) {
    const baseAffinity = state.aiStrategy.turretAffinity;
    const urgency = playerAirCount >= 2 ? 0.7 : (playerAirCount >= 1 ? 0.35 : 0);
    if (Math.random() < Math.min(0.85, baseAffinity + urgency)) {
      tryPlaceTurret("enemy", freeWall);
      state.buildTimer = 0;
      return;
    }
  }

  const buildable = state.slots.filter((s) => !s.factory && !s.isPath);
  if (buildable.length === 0) {
    state.buildTimer = 0;
    return;
  }

  // 2) Choix du type pondéré par la stratégie + réaction au mix adverse
  const affordable = Object.keys(FACTORY_TYPES).filter((t) => state.money >= FACTORY_TYPES[t].cost);
  if (affordable.length === 0) {
    state.buildTimer = AI_CONFIG.buildInterval - 1;
    return;
  }

  const playerHeavyCount = game.units.filter((u) => u.side === "player" && u.typeId === "heavy" && u.hp > 0).length;
  const weightFor = (t) => {
    let w = (AI_CONFIG.typeWeights[t] || 10) * (state.aiStrategy.bias[t] || 1);
    // Réactions au mix adverse :
    if (t === "sniper") {
      if (playerAirCount >= 3) w *= 4;
      else if (playerAirCount >= 1) w *= 2;
    }
    if (t === "heavy" && playerHeavyCount >= 3) w *= 0.6;
    return Math.max(0.1, w);
  };

  const totalWeight = affordable.reduce((a, t) => a + weightFor(t), 0);
  let r = Math.random() * totalWeight;
  let typeId = affordable[0];
  for (const t of affordable) {
    r -= weightFor(t);
    if (r <= 0) { typeId = t; break; }
  }

  // 3) Sélection du slot. Defense factories → proches du rempart,
  //    attaque → plus en arrière de la base.
  const isDefenseFactory = Math.random() < state.aiStrategy.defenseChance;
  const enemyRampartX = CONFIG.W - CONFIG.BASE_W;
  const sorted = [...buildable].sort((a, b) => {
    const aDist = Math.abs(a.x - enemyRampartX);
    const bDist = Math.abs(b.x - enemyRampartX);
    return isDefenseFactory ? aDist - bDist : bDist - aDist;
  });
  // On prend un slot dans le top 3 pour garder un peu d'aléa
  const pool = sorted.slice(0, Math.min(3, sorted.length));
  const slot = pool[Math.floor(Math.random() * pool.length)];

  const type = FACTORY_TYPES[typeId];
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
    mode: isDefenseFactory ? "defense" : "attack",
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
  // Le guest et le spectateur en MP n'ont pas de simulation locale — ils
  // reçoivent un snapshot du host via broadcast et se contentent de rendre.
  const isViewer = game.mode === "mp" && (game.mp?.role === "guest" || game.mp?.role === "spectator");
  if (isViewer) {
    // On laisse juste tourner la caméra et la mise à jour de la souris,
    // les structures (units, factories, etc.) sont écrasées par les snapshots reçus.
    updateCamera(dt);
    updateDamageNumbers(dt);
    updateCameraShake(dt);
    updateFactoryAnims(dt);
    // Sample la timeline côté guest aussi : money et units sont sync via
    // snapshot, donc les courbes seront cohérentes avec celles du host.
    game.time += dt;
    sampleTimeline(dt);
    game.ui.mouse.x = game.ui.mouseScreen.x + game.camera.x;
    game.ui.mouse.y = game.ui.mouseScreen.y;
    return;
  }
  game.time += dt;
  updateCamera(dt);
  updateLightning(dt);
  // En MP host, on désactive le bot : c'est le guest qui joue le côté enemy.
  if (game.mode !== "mp") updateEnemyAI(dt);
  if (game.wave?.active && typeof updateWaveSpawning === "function") updateWaveSpawning(dt);
  updateIncome(dt);
  sampleTimeline(dt);
  updatePickups(dt);
  updateFactories(dt);
  updateUnits(dt);
  resolvePropCollisions();
  updateAttackFx(dt);
  updateProjectiles(dt);
  updateFlashes(dt);
  updateAmbientAnims(dt);
  updateExplosions(dt);
  updateDamageNumbers(dt);
  updateCameraShake(dt);
  updateFactoryAnims(dt);
  checkGameOver();
  game.ui.mouse.x = game.ui.mouseScreen.x + game.camera.x;
  game.ui.mouse.y = game.ui.mouseScreen.y;

  // MP host : broadcast un snapshot d'état à ~24 Hz (était 12 Hz auparavant).
  // 24 Hz améliore notablement la fluidité côté guest (moins de "sauts" entre
  // 2 snapshots) au prix d'un débit réseau doublé — toujours largement dans
  // les limites de Supabase Realtime broadcast.
  if (game.mode === "mp" && game.mp?.role === "host" && window.RE_MP) {
    game.mp.snapAccum = (game.mp.snapAccum || 0) + dt;
    if (game.mp.snapAccum >= (1 / 24)) {
      game.mp.snapAccum = 0;
      try { window.RE_MP.sendSnapshot(buildMpSnapshot()); } catch (e) { console.warn("[MP] snapshot send", e); }
    }
  }
}

// Pickups d'or sur la carte. Spawn périodique tant qu'on n'a pas atteint le
// max simultané. Lifetime limité (disparait s'il n'est pas pris). Collision
// AABB-circle vs unités mobiles : la 1re unité (n'importe quel camp) qui
// touche le pickup le récolte pour son camp.
function updatePickups(dt) {
  if (!Array.isArray(game.pickups)) game.pickups = [];

  // Lifetime + collision
  for (const p of game.pickups) {
    p.age += dt;
    if (p.consumed) continue;
    for (const u of game.units) {
      if (u.hp <= 0) continue;
      if (u.stationary) continue;
      const dx = u.x - p.x;
      const dy = u.y - p.y;
      if (dx * dx + dy * dy <= (PICKUP_RADIUS + (u.stats?.radius || 12)) ** 2) {
        p.consumed = true;
        p.consumedBy = u.side;
        p.fadeAge = 0;
        game[u.side].money += p.value;
        spawnDamageNumber({ x: p.x, y: p.y - 12, side: u.side, stats: { radius: 0 } }, p.value, true);
        spawnExplosion(p.x, p.y, u.side);
        audio.playSFX("upgrade");
        break;
      }
    }
  }
  // Cleanup : expirés (lifetime atteint) ou consommés (après 0.6s d'anim fade)
  game.pickups = game.pickups.filter((p) => {
    if (p.consumed) {
      p.fadeAge = (p.fadeAge || 0) + dt;
      return p.fadeAge < 0.6;
    }
    return p.age < PICKUP_LIFETIME;
  });

  // Spawn (host autoritaire en MP, sinon partout)
  if (game.mode === "mp" && game.mp?.role !== "host") return;
  game.pickupSpawnTimer -= dt;
  if (game.pickupSpawnTimer <= 0) {
    const alive = game.pickups.filter((p) => !p.consumed).length;
    if (alive < PICKUP_MAX_ON_MAP) {
      const x = PICKUP_X_MIN + Math.random() * (PICKUP_X_MAX - PICKUP_X_MIN);
      const y = PICKUP_Y_MIN + Math.random() * (PICKUP_Y_MAX - PICKUP_Y_MIN);
      game.pickups.push({
        id: ++game.pickupIdSeq,
        x, y,
        value: PICKUP_VALUE,
        age: 0,
        consumed: false,
      });
    }
    game.pickupSpawnTimer = PICKUP_SPAWN_INTERVAL;
  }
}

// Rendu d'un pickup (coffre/pièce d'or). Animation : pulse + halo + emoji 💰
// au centre. À la consommation : flash + fade rapide.
function drawPickups(ctx) {
  if (!Array.isArray(game.pickups) || !game.pickups.length) return;
  const t = performance.now() / 380;
  for (const p of game.pickups) {
    const consumed = !!p.consumed;
    const fadeT = consumed ? Math.min(1, (p.fadeAge || 0) / 0.6) : 0;
    const alpha = consumed ? Math.max(0, 1 - fadeT) : 1;
    const expiring = !consumed && p.age > PICKUP_LIFETIME - 5;
    const blink = expiring ? (Math.sin(t * 6) * 0.5 + 0.5) : 1;
    const pulse = consumed ? 1 + fadeT * 0.8 : 1 + Math.sin(t + p.id) * 0.08;
    const r = PICKUP_RADIUS * pulse;
    ctx.save();
    ctx.globalAlpha = alpha * (expiring ? 0.4 + 0.6 * blink : 1);

    // Halo doré
    const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.6);
    halo.addColorStop(0, "rgba(251, 191, 36, 0.45)");
    halo.addColorStop(0.5, "rgba(251, 191, 36, 0.18)");
    halo.addColorStop(1, "rgba(251, 191, 36, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Disque central + bord
    ctx.fillStyle = consumed ? "#fff7d6" : "#fbbf24";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Symbole
    ctx.fillStyle = "#7c2d12";
    ctx.font = "bold 18px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💰", p.x, p.y);

    ctx.restore();
  }
}

// Sampling pour graphique post-game. Sample toutes les 2s : argent en banque
// + "army value" (somme des killReward des unités vivantes du camp = proxy
// économique de la valeur militaire déployée). Appelé aussi côté guest pour
// que les deux camps voient un graphique cohérent (le money/units sont déjà
// sync via snapshot).
function sampleTimeline(dt) {
  game.timelineAccum = (game.timelineAccum || 0) + dt;
  if (game.timelineAccum < 2) return;
  game.timelineAccum -= 2;
  const armyValueOf = (side) => {
    let v = 0;
    for (const u of game.units) {
      if (u.side === side && u.hp > 0) v += u.stats.killReward || 0;
    }
    return v;
  };
  const t = game.time;
  game.stats.player.timeline.push({ t, money: game.player.money, army: armyValueOf("player") });
  game.stats.enemy.timeline.push({ t, money: game.enemy.money, army: armyValueOf("enemy") });
  // Cap : 600 samples = 20 minutes de partie. Au-delà on décime (1 sur 2).
  if (game.stats.player.timeline.length > 600) {
    game.stats.player.timeline = game.stats.player.timeline.filter((_, i) => i % 2 === 0);
    game.stats.enemy.timeline = game.stats.enemy.timeline.filter((_, i) => i % 2 === 0);
  }
}

// Revenu passif : chaque seconde, les deux camps gagnent un revenu de base.
// Un bonus "comeback" est ajouté au camp qui a moins d'argent que l'adversaire
// (1💰/s par tranche de 50💰 d'écart, plafonné à +6) pour qu'une partie
// déséquilibrée laisse une chance de se refaire.
function updateIncome(dt) {
  game.incomeAccum = (game.incomeAccum || 0) + dt;
  if (game.incomeAccum < 1) return;
  const ticks = Math.floor(game.incomeAccum);
  game.incomeAccum -= ticks;
  const BASE_INCOME = 2;
  const BONUS_PER_GAP = 50;
  const BONUS_CAP = 6;
  for (let t = 0; t < ticks; t++) {
    const pMoney = game.player.money;
    const eMoney = game.enemy.money;
    const playerBonus = Math.min(BONUS_CAP, Math.floor(Math.max(0, eMoney - pMoney) / BONUS_PER_GAP));
    const enemyBonus = Math.min(BONUS_CAP, Math.floor(Math.max(0, pMoney - eMoney) / BONUS_PER_GAP));
    const pSurge = (game.player.surgeUntil || 0) > game.time ? SURGE_INCOME_MULT : 1;
    const eSurge = (game.enemy.surgeUntil || 0) > game.time ? SURGE_INCOME_MULT : 1;
    game.player.money += Math.round((BASE_INCOME + playerBonus) * pSurge);
    game.enemy.money += Math.round((BASE_INCOME + enemyBonus) * eSurge);
  }
}

function updateLightning(dt) {
  if (game.lightningCooldown > 0) game.lightningCooldown = Math.max(0, game.lightningCooldown - dt);
  if (game.mode === "mp" && game.mp && game.mp.enemyLightningCooldown > 0) {
    game.mp.enemyLightningCooldown = Math.max(0, game.mp.enemyLightningCooldown - dt);
  }
  // IEM cooldowns
  if (game.iemCooldown > 0) game.iemCooldown = Math.max(0, game.iemCooldown - dt);
  if (game.mode === "mp" && game.mp && game.mp.enemyIemCooldown > 0) {
    game.mp.enemyIemCooldown = Math.max(0, game.mp.enemyIemCooldown - dt);
  }
  // Drop / Surge cooldowns
  if (game.dropCooldown > 0) game.dropCooldown = Math.max(0, game.dropCooldown - dt);
  if (game.surgeCooldown > 0) game.surgeCooldown = Math.max(0, game.surgeCooldown - dt);
  if (game.mode === "mp" && game.mp) {
    if (game.mp.enemyDropCooldown > 0) game.mp.enemyDropCooldown = Math.max(0, game.mp.enemyDropCooldown - dt);
    if (game.mp.enemySurgeCooldown > 0) game.mp.enemySurgeCooldown = Math.max(0, game.mp.enemySurgeCooldown - dt);
  }
  // Tick l'animation IEM en cours
  if (game.iem) {
    game.iem.age += dt;
    if (game.iem.age >= game.iem.ttl) game.iem = null;
  }
  if (!game.lightning) return;
  game.lightning.age += dt;
  if (game.lightning.age >= game.lightning.ttl) game.lightning = null;
}

// Déclenche une IEM : tue toutes les unités mobiles des deux côtés, déduit
// le coût au lanceur, démarre son cooldown, et arme l'effet visuel.
function fireIem(side) {
  if (iemCdFor(side) > 0) return false;
  const state = game[side];
  if (!state || state.money < IEM_COST) return false;
  state.money -= IEM_COST;
  game.stats[side].moneySpent += IEM_COST;
  setIemCdFor(side, IEM_COOLDOWN_SEC);
  game.iem = { side, age: 0, ttl: IEM_TTL_SEC };

  let killsByPlayer = 0, killsByEnemy = 0;
  for (const u of game.units) {
    if (u.hp <= 0) continue;
    if (u.stationary) continue;
    u.hp = 0;
    spawnExplosion(u.x, u.y, u.side);
    game.stats[u.side].unitsLost++;
    if (u.side === "player") killsByEnemy++;
    else killsByPlayer++;
  }
  game.stats.player.unitsKilled += killsByPlayer;
  game.stats.enemy.unitsKilled += killsByEnemy;
  audio.playSFX("lightning");
  triggerCameraShake(2.0, 0.50);
  return true;
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

function iemCdFor(side) {
  if (side === "player") return game.iemCooldown || 0;
  if (game.mode === "mp" && game.mp) return game.mp.enemyIemCooldown || 0;
  return 0;
}
function setIemCdFor(side, value) {
  if (side === "player") game.iemCooldown = value;
  else if (game.mode === "mp" && game.mp) game.mp.enemyIemCooldown = value;
}

// --- Drop & Surge cooldown helpers (mêmes patterns que Lightning/IEM) -----
function dropCdFor(side) {
  if (side === "player") return game.dropCooldown || 0;
  if (game.mode === "mp" && game.mp) return game.mp.enemyDropCooldown || 0;
  return 0;
}
function setDropCdFor(side, value) {
  if (side === "player") game.dropCooldown = value;
  else if (game.mode === "mp" && game.mp) game.mp.enemyDropCooldown = value;
}
function surgeCdFor(side) {
  if (side === "player") return game.surgeCooldown || 0;
  if (game.mode === "mp" && game.mp) return game.mp.enemySurgeCooldown || 0;
  return 0;
}
function setSurgeCdFor(side, value) {
  if (side === "player") game.surgeCooldown = value;
  else if (game.mode === "mp" && game.mp) game.mp.enemySurgeCooldown = value;
}

// Drop Renforts : spawn de DROP_UNIT_COUNT unités light tier 1 à la sortie de
// base du camp. Coût payé, cooldown armé, SFX + secousse caméra subtile.
function fireDrop(side) {
  if (dropCdFor(side) > 0) return false;
  const state = game[side];
  if (!state || state.money < DROP_COST) return false;
  state.money -= DROP_COST;
  game.stats[side].moneySpent += DROP_COST;
  setDropCdFor(side, DROP_COOLDOWN_SEC);

  // Spawn devant la base : x à la frontière sortante, y répartis sur 3 lanes.
  const baseX = side === "player" ? CONFIG.BASE_W + 24 : CONFIG.W - CONFIG.BASE_W - 24;
  const lanes = [CONFIG.H * 0.30, CONFIG.H * 0.50, CONFIG.H * 0.70];
  const baseStats = spawnStatsFor({ typeId: "light", upgrades: defaultUpgrades(), tier: 1 });
  for (let i = 0; i < DROP_UNIT_COUNT; i++) {
    const y = lanes[i % lanes.length];
    const stats = { ...baseStats };
    game.units.push({
      side,
      typeId: "light",
      kind: "unit",
      x: baseX,
      y,
      gateY: y,
      hp: stats.hp,
      maxHp: stats.hp,
      stats,
      target: null,
      attackCooldown: 0,
      wanderY: null,
      wanderTimer: 0,
      mode: "attack",
      exitWaypoints: [],
    });
    game.stats[side].unitsSpawned++;
    if (game.stats[side].unitsSpawnedByType.light != null) game.stats[side].unitsSpawnedByType.light++;
    spawnExplosion(baseX, y, side);
  }
  audio.playSFX("place");
  triggerCameraShake(0.8, 0.20);
  return true;
}

// Surge Économique : bonus instant + multiplicateur de revenu pendant N secondes.
function fireSurge(side) {
  if (surgeCdFor(side) > 0) return false;
  const state = game[side];
  if (!state || state.money < SURGE_COST) return false;
  state.money -= SURGE_COST;
  game.stats[side].moneySpent += SURGE_COST;
  setSurgeCdFor(side, SURGE_COOLDOWN_SEC);
  state.money += SURGE_INSTANT_BONUS;
  state.surgeUntil = (game.time || 0) + SURGE_DURATION_SEC;
  audio.playSFX("upgrade");
  return true;
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
  triggerCameraShake(1.2, 0.30);
  if (side === "player") tutorialOnAction("lightning");
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
  // Sur device tactile : pas d'edge-scroll (le pan se fait via swipe).
  if (IS_TOUCH) return;
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

  // Monde (avec décalage caméra + shake éventuel)
  const shake = currentShakeOffset();
  ctx.save();
  ctx.translate(-game.camera.x + shake.x, shake.y);
  drawGround(ctx);
  drawBattlefieldLane(ctx);
  drawAmbientAnims(ctx);   // sous les props et unités, au-dessus du sol
  drawProps(ctx);
  drawBase(ctx, "player");
  drawBase(ctx, "enemy");
  drawWallSlots(ctx, "player");
  drawWallSlots(ctx, "enemy");
  drawPickups(ctx);
  drawUnits(ctx);
  drawAttackFx(ctx);
  drawProjectiles(ctx);
  drawFlashes(ctx);
  drawExplosions(ctx);
  drawHoverRange(ctx);
  drawLightning(ctx);
  drawLightningAim(ctx);
  drawDamageNumbers(ctx);   // dans le repère monde, juste au-dessus des unités
  ctx.restore();

  // Overlay Vague (par-dessus le monde)
  if (game.wave?.active) drawWaveOverlay(ctx);

  // UI (coordonnées écran)
  drawHUD(ctx);
  drawMinimap(ctx);
  drawScrollHints(ctx);
  drawUpgradePanel(ctx);
  drawSettingsPanel(ctx);
  drawIemFx(ctx);
  if (game.mode === "mp") drawInGameChat(ctx);
  if (game.mode === "mp") drawEmoteOverlay(ctx);
  if (game.mode === "mp" && game.ui.emoteMenuOpen) drawEmoteRadial(ctx);
  if (game.tutorial?.active) drawTutorialOverlay(ctx);
  if (game.gameOver) drawGameOverOverlay(ctx);
}

// Boucle de simulation en arrière-plan (hors RAF) :
// active uniquement quand la page est cachée ET qu'on est host MP en partie
// active. Tick à 20 Hz, simule sans rendre. Le guest n'a pas besoin de ce
// fallback : il reçoit ses snapshots via websocket Supabase (non throttle).
let _bgSimTimer = null;
let _bgSimLastTime = 0;

function shouldRunBackgroundSim() {
  return (
    game.mode === "mp" &&
    game.mp?.role === "host" &&
    game.screen === "playing" &&
    !game.gameOver
  );
}

function startBackgroundSim() {
  if (_bgSimTimer) return;
  _bgSimLastTime = performance.now();
  _bgSimTimer = setInterval(() => {
    if (!document.hidden || !shouldRunBackgroundSim()) {
      stopBackgroundSim();
      return;
    }
    const now = performance.now();
    let dt = (now - _bgSimLastTime) / 1000;
    _bgSimLastTime = now;
    if (dt > 0.1) dt = 0.1;
    try { update(dt); } catch (e) { console.error("[bg update]", e); }
  }, 50);
}

function stopBackgroundSim() {
  if (_bgSimTimer) {
    clearInterval(_bgSimTimer);
    _bgSimTimer = null;
  }
}

// Bridge mobile : un input HTML invisible prend le focus quand on entre en
// mode chat ou saisie de code lobby, ce qui fait apparaître le clavier
// virtuel. À chaque saisie on copie sa valeur dans la bonne variable game.ui.
// Sur desktop, IS_TOUCH=false → no-op.
function setupMobileKeyboard() {
  if (!IS_TOUCH) return;
  const inp = document.getElementById("mobile-keyboard-proxy");
  if (!inp) return;

  let mode = null; // "chat" | "lobbyCode" | null

  function refreshFocus() {
    const wantChat = !!game.ui.chatActive && game.mode === "mp";
    const wantLobbyCode = game.screen === "lobby"
      && game.ui.lobbyPage === "join"
      && !!game.ui.codeInputActive;
    let want = null;
    if (wantChat) want = "chat";
    else if (wantLobbyCode) want = "lobbyCode";
    if (want === mode) return;
    mode = want;
    if (mode === "chat") {
      inp.value = game.ui.chatInput || "";
      inp.maxLength = 240;
      inp.setAttribute("inputmode", "text");
      try { inp.focus({ preventScroll: true }); } catch { inp.focus(); }
    } else if (mode === "lobbyCode") {
      inp.value = game.ui.codeInput || "";
      inp.maxLength = 6;
      inp.setAttribute("inputmode", "text");
      try { inp.focus({ preventScroll: true }); } catch { inp.focus(); }
    } else {
      inp.blur();
      inp.value = "";
    }
  }

  inp.addEventListener("input", () => {
    if (mode === "chat") {
      game.ui.chatInput = (inp.value || "").slice(0, 240);
    } else if (mode === "lobbyCode") {
      const filtered = (inp.value || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);
      if (filtered !== inp.value) inp.value = filtered;
      game.ui.codeInput = filtered;
      game.ui.codeInputError = null;
    }
  });

  inp.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      evt.preventDefault();
      if (mode === "chat") {
        sendCurrentChat();
        // sendCurrentChat reset chatActive=false → refreshFocus va blur
      } else if (mode === "lobbyCode") {
        const code = (game.ui.codeInput || "").trim();
        if (code.length >= 4) {
          game.ui.codeInputActive = false;
          mpJoinByCode(code);
        }
      }
    }
  });

  inp.addEventListener("blur", () => {
    // L'utilisateur a fermé le clavier (back Android, tap canvas, etc.).
    // On reflète l'intention dans le state pour rester cohérent.
    if (mode === "chat") game.ui.chatActive = false;
    if (mode === "lobbyCode") game.ui.codeInputActive = false;
    mode = null;
  });

  // Poll léger pour synchroniser focus/blur avec l'état du jeu.
  setInterval(refreshFocus, 150);
}

function setupBackgroundSimLoop() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (shouldRunBackgroundSim()) startBackgroundSim();
    } else {
      stopBackgroundSim();
      // Le RAF reprend ; on reset lastTimestamp pour que le 1er frame n'ait
      // pas un dt énorme (cap déjà appliqué dans gameLoop mais double sécurité).
      game.lastTimestamp = 0;
    }
  });
}

function gameLoop(timestamp) {
  // Si la simulation tourne en arrière-plan (page cachée), le RAF est gelé
  // par le navigateur ; au retour, le 1er frame a un dt énorme qu'il ne faut
  // pas appliquer (sinon saut de simulation). On cap à 0.1s.
  let dt = game.lastTimestamp ? (timestamp - game.lastTimestamp) / 1000 : 0;
  if (dt > 0.1) dt = 0.1;
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

    // Slot couvert par une factory fusionnée → on saute (le primary dessine)
    if (slot.coveredBy != null) return;

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
      const f = slot.factory;
      // Scale anim au build : on transforme autour du centre de la factory
      const scale = (typeof f.scale === "number" && f.scale > 0) ? f.scale : 1;
      // Pulse au spawn d'une unité : petit overshoot 1 → 1.10 → 1.0
      let pulseMul = 1;
      if (f.spawnPulse != null) {
        const p = Math.min(1, f.spawnPulse / 0.35);
        pulseMul = 1 + 0.10 * Math.sin(p * Math.PI);
      }
      const finalScale = scale * pulseMul;
      if (finalScale !== 1) {
        ctx.save();
        const span = (f.spanSlots || []).map((i) => game[side].slots[i]).filter(Boolean);
        let bx = slot.x, by = slot.y, bw = slot.size, bh = slot.size;
        if (span.length > 1) {
          bx = Math.min(...span.map((s) => s.x));
          by = Math.min(...span.map((s) => s.y));
          bw = Math.max(...span.map((s) => s.x + s.size)) - bx;
          bh = Math.max(...span.map((s) => s.y + s.size)) - by;
        }
        const cx = bx + bw / 2, cy = by + bh / 2;
        ctx.translate(cx, cy);
        ctx.scale(finalScale, finalScale);
        ctx.translate(-cx, -cy);
        drawFactory(ctx, slot, side);
        ctx.restore();
      } else {
        drawFactory(ctx, slot, side);
      }
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
  const inset = 3;
  // Sprite spécifique au tier : T2/T3 ont leurs propres designs ("twin" et
  // "mega") qui occupent visuellement 1×2 ou 2×2 slots. Fallback sur T1
  // si le sprite tier n'est pas chargé.
  const tierForSprite = f.tier || 1;
  const baseSpriteName = `factory-${f.typeId}-${side}`;
  const tieredSpriteName = tierForSprite > 1
    ? `${baseSpriteName}-t${tierForSprite}`
    : baseSpriteName;
  const spriteName = sprites[tieredSpriteName] ? tieredSpriteName : baseSpriteName;

  // Boîte englobant tout le span de la factory (1 slot pour tier 1, 2 pour tier 2, 4 pour tier 3)
  const span = (f.spanSlots || []).map((idx) => game[side].slots[idx]).filter(Boolean);
  let bx = slot.x, by = slot.y, bw = slot.size, bh = slot.size;
  if (span.length > 1) {
    bx = Math.min(...span.map((s) => s.x));
    by = Math.min(...span.map((s) => s.y));
    const maxX = Math.max(...span.map((s) => s.x + s.size));
    const maxY = Math.max(...span.map((s) => s.y + s.size));
    bw = maxX - bx;
    bh = maxY - by;
  }
  const x = bx + inset;
  const y = by + inset;
  const w = bw - inset * 2;
  const h = bh - inset * 2;

  // Halo coloré pour tier 2/3 (rend la factory bien visible)
  const tier = f.tier || 1;
  if (tier > 1) {
    ctx.save();
    const accent = tier === 2 ? "#22d3ee" : "#fbbf24";
    ctx.fillStyle = hexToRgba(accent, 0.18);
    roundedRect(ctx, x - 2, y - 2, w + 4, h + 4, 8);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(accent, 0.85);
    ctx.lineWidth = 1.5;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }

  if (sprites[spriteName]) {
    // Pour les factories étendues, on étire le sprite pour remplir la zone
    ctx.drawImage(sprites[spriteName], x, y, w, h);
  } else {
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

  // Badge tier (haut-gauche) : "II" ou "III" sur les factories fusionnées
  if (tier > 1) {
    const accent = tier === 2 ? "#22d3ee" : "#fbbf24";
    const tag = tier === 2 ? "II" : "III";
    ctx.save();
    ctx.fillStyle = accent;
    roundedRect(ctx, x + 4, y + 4, 22, 14, 4);
    ctx.fill();
    ctx.fillStyle = "#0a0e1a";
    ctx.font = "bold 9px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tag, x + 4 + 11, y + 4 + 7);
    ctx.restore();
  }

  // Étoiles d'amélioration (en bas du sprite, basé sur somme des niveaux d'upgrade)
  const totalLevels = Object.values(f.upgrades).reduce((a, v) => a + v, 0);
  if (totalLevels > 0) {
    drawFactoryStars(ctx, x, y + h - 11, w, totalLevels);
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
  } else if (typeId === "medic") {
    // Centre de soin : base rectangulaire + grosse croix verte au milieu
    ctx.fillStyle = main;
    ctx.fillRect(x + 4, y + 8, w - 8, h - 12);
    // Toit accent
    ctx.fillStyle = accent;
    ctx.fillRect(x + 4, y + 8, w - 8, 4);
    // Croix médicale verte
    ctx.fillStyle = "#22c55e";
    const ch = h * 0.45;
    const cw = w * 0.55;
    const ct = w * 0.16;
    ctx.fillRect(cx - cw / 2, cy - ct / 2, cw, ct);
    ctx.fillRect(cx - ct / 2, cy - ch / 2, ct, ch);
    // Halo vert pulsant
    const pulse = 0.5 + 0.5 * Math.sin((game.time || 0) * 3);
    ctx.strokeStyle = `rgba(74, 222, 128, ${(0.4 + 0.4 * pulse).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) * 0.42, 0, Math.PI * 2);
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

// Renvoie le nom du sprite à utiliser pour une unité, en tenant compte du skin
// équipé par le joueur (T1/T2 — sprite avec ajouts physiques baked-in).
// Tomb sur unit-{type}-{side}.png par défaut si pas de skin ou sprite manquant.
function unitSpriteNameFor(u) {
  // Résolution du tier de skin selon mode/rôle/side (commun médic + autres unités).
  // Solo : seul "player" = moi a un skin. MP : host/guest miroir.
  // Spectator : pas de skin (on n'a pas l'équipement des deux peers).
  let tier = null;
  const myEquipped = window.RE_AUTH?.equippedSkins || {};
  const peerEquipped = game.mp?.peerEquippedSkins || {};
  if (game.mode === "mp") {
    if (game.mp?.role === "host") {
      if (u.side === "player") tier = myEquipped[u.typeId];
      else if (u.side === "enemy") tier = peerEquipped[u.typeId];
    } else if (game.mp?.role === "guest") {
      if (u.side === "enemy") tier = myEquipped[u.typeId];
      else if (u.side === "player") tier = peerEquipped[u.typeId];
    }
  } else {
    if (u.side === "player") tier = myEquipped[u.typeId];
  }

  // Médic : 4 frames d'animation cyclées (~10 fps) tant que l'unité bouge.
  // Quand statique, frame 0 (pose neutre) pour éviter le "court sur place".
  if (u.typeId === "medic") {
    const moved = u._prevX != null &&
                  (Math.abs(u.x - u._prevX) > 0.05 || Math.abs(u.y - u._prevY) > 0.05);
    u._prevX = u.x;
    u._prevY = u.y;
    const frameIdx = moved ? Math.floor((game.time || 0) * 10) % 4 : 0;
    const baseName = `unit-medic-${u.side}-${frameIdx}`;
    if (!tier) return baseName;
    const tieredName = `unit-medic-${u.side}-t${tier}-${frameIdx}`;
    return sprites[tieredName] ? tieredName : baseName;
  }

  const baseName = `unit-${u.typeId}-${u.side}`;
  if (!tier) return baseName;
  const tieredName = `${baseName}-t${tier}`;
  return sprites[tieredName] ? tieredName : baseName;
}

function drawUnits(ctx) {
  for (const u of game.units) {
    const radius = u.stats.radius;
    // Aura boss : halo rouge pulsant + couronne, sous le sprite
    if (u.isBoss) {
      const t = performance.now() / 220;
      const pulse = 0.5 + 0.5 * Math.sin(t);
      const auraR = radius * (2.4 + 0.25 * pulse);
      const aura = ctx.createRadialGradient(u.x, u.y, radius * 0.5, u.x, u.y, auraR);
      aura.addColorStop(0, `rgba(239, 68, 68, ${(0.55 + 0.20 * pulse).toFixed(3)})`);
      aura.addColorStop(0.6, "rgba(239, 68, 68, 0.18)");
      aura.addColorStop(1, "rgba(239, 68, 68, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(u.x, u.y, auraR, 0, Math.PI * 2);
      ctx.fill();
      // Couronne au-dessus
      ctx.font = `bold ${Math.round(radius * 0.9)}px -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("👑", u.x, u.y - radius - 10);
    } else if (u.isMiniBoss) {
      // Mini-boss : halo orange plus discret + épées au-dessus
      const t = performance.now() / 280;
      const pulse = 0.5 + 0.5 * Math.sin(t);
      const auraR = radius * (1.8 + 0.18 * pulse);
      const aura = ctx.createRadialGradient(u.x, u.y, radius * 0.4, u.x, u.y, auraR);
      aura.addColorStop(0, `rgba(251, 146, 60, ${(0.40 + 0.18 * pulse).toFixed(3)})`);
      aura.addColorStop(0.6, "rgba(251, 146, 60, 0.14)");
      aura.addColorStop(1, "rgba(251, 146, 60, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(u.x, u.y, auraR, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `bold ${Math.round(radius * 0.75)}px -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚔️", u.x, u.y - radius - 8);
    }
    const spriteName = unitSpriteNameFor(u);
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
  // Médic : croix médicale verte au centre
  if (u.typeId === "medic") {
    ctx.fillStyle = "#bbf7d0";
    const cw = radius * 0.65;
    const ct = radius * 0.22;
    ctx.fillRect(u.x - cw / 2, u.y - ct / 2, cw, ct);
    ctx.fillRect(u.x - ct / 2, u.y - cw / 2, ct, cw);
    // Petit halo vert pulsant pour rappeler son rôle
    const pulse = 0.5 + 0.5 * Math.sin((game.time || 0) * 3 + u.x * 0.05);
    ctx.strokeStyle = `rgba(74, 222, 128, ${(0.4 + 0.3 * pulse).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(u.x, u.y, radius + 2, 0, Math.PI * 2);
    ctx.stroke();
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
  for (const f of game.flashes) {
    f.age += dt;
    // Les debris bougent avec une petite gravité
    if (f.kind === "debris") {
      f.x += (f.vx || 0) * dt;
      f.y += (f.vy || 0) * dt;
      f.vy = (f.vy || 0) + 220 * dt;
    }
  }
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
    } else if (f.kind === "debris") {
      // Petites particules de débris lors d'une mort
      const fadeOut = Math.max(0, 1 - t);
      ctx.save();
      const c = f.side === "player" ? "147, 197, 253" : "252, 165, 165";
      ctx.fillStyle = `rgba(${c}, ${fadeOut.toFixed(3)})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = `rgba(${c}, ${(fadeOut * 0.6).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (f.kind === "heal") {
      // Heal = trait vert pulsant du soigneur à la cible + croix au-dessus de la cible
      const fadeOut = Math.max(0, 1 - t);
      ctx.save();
      ctx.strokeStyle = `rgba(74, 222, 128, ${(fadeOut * 0.85).toFixed(3)})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.tx, f.ty);
      ctx.stroke();
      // Croix verte au point d'arrivée qui grossit
      const cr = 4 + 6 * t;
      ctx.strokeStyle = `rgba(187, 247, 208, ${fadeOut.toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.tx - cr, f.ty); ctx.lineTo(f.tx + cr, f.ty);
      ctx.moveTo(f.tx, f.ty - cr); ctx.lineTo(f.tx, f.ty + cr);
      ctx.stroke();
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
// Ambient anims par biome — tumbleweed, snowfall, pluie tropicale
// -------------------------------------------------------------

const AMBIENT_ANIM_PROFILES = {
  desert: {
    type: "tumbleweed",
    spawnIntervalMin: 20, spawnIntervalMax: 35,
  },
  snow: {
    type: "snowfall",
    spawnIntervalMin: 30, spawnIntervalMax: 50,
    eventDurationMin: 5, eventDurationMax: 7,
    particleRate: 14, maxParticles: 80,
  },
  jungle: {
    type: "rain",
    spawnIntervalMin: 25, spawnIntervalMax: 45,
    eventDurationMin: 4, eventDurationMax: 7,
    particleRate: 28, maxParticles: 100,
  },
};

function spawnTumbleweed() {
  // Le tumbleweed traverse la zone VISIBLE du joueur (pas tout le monde) :
  // spawn juste hors écran d'un côté, end juste hors écran de l'autre.
  const dir = Math.random() < 0.5 ? 1 : -1;
  const margin = 50;
  const startX = dir > 0
    ? game.camera.x - margin
    : game.camera.x + CONFIG.CANVAS_W + margin;
  const endX = dir > 0
    ? game.camera.x + CONFIG.CANVAS_W + margin
    : game.camera.x - margin;
  // Y dans la zone jouable (pas trop haut/bas pour éviter les bases)
  const playMinY = CONFIG.HUD_H + 100;
  const playMaxY = CONFIG.H - 80;
  const y = playMinY + Math.random() * (playMaxY - playMinY);
  const speed = 260 + Math.random() * 120;  // 260-380 px/s
  game.ambientAnims.active.push({
    type: "tumbleweed",
    x: startX, y,
    vx: dir * speed,
    endX,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: dir * (3 + Math.random() * 3),  // rad/s
    age: 0,
  });
  // Vent ponctuel qui accompagne le tumbleweed (le son ambient continu
  // a été retiré ailleurs ; il ne joue que pendant ces séquences).
  audio.startAmbient(game.biome);
}

function spawnWeather(type) {
  const profile = AMBIENT_ANIM_PROFILES[game.biome];
  if (!profile) return;
  const duration = profile.eventDurationMin +
    Math.random() * (profile.eventDurationMax - profile.eventDurationMin);
  game.ambientAnims.active.push({
    type,  // "snowfall" ou "rain"
    age: 0, ttl: duration,
    particles: [],
    spawnAccum: 0,
  });
}

function updateAmbientAnims(dt) {
  if (game.screen !== "playing") return;
  const profile = AMBIENT_ANIM_PROFILES[game.biome];
  if (!profile) return;

  // ── Décompte du timer de spawn d'événement
  game.ambientAnims.nextSpawnAt -= dt;
  if (game.ambientAnims.nextSpawnAt <= 0) {
    if (profile.type === "tumbleweed") {
      spawnTumbleweed();
    } else {
      spawnWeather(profile.type);
    }
    game.ambientAnims.nextSpawnAt = profile.spawnIntervalMin +
      Math.random() * (profile.spawnIntervalMax - profile.spawnIntervalMin);
  }

  // ── Mise à jour des événements actifs
  for (const ev of game.ambientAnims.active) {
    ev.age += dt;
    if (ev.type === "tumbleweed") {
      ev.x += ev.vx * dt;
      ev.rotation += ev.rotationSpeed * dt;
    } else if (ev.type === "snowfall" || ev.type === "rain") {
      // Spawn de particules selon rate, pendant la durée de l'événement
      if (ev.age < ev.ttl) {
        ev.spawnAccum += dt;
        const spawnInterval = 1 / profile.particleRate;
        while (ev.spawnAccum >= spawnInterval &&
               ev.particles.length < profile.maxParticles) {
          ev.spawnAccum -= spawnInterval;
          // Spawn dans la zone visible du joueur + un peu au-dessus
          const px = game.camera.x + Math.random() * CONFIG.CANVAS_W;
          const py = CONFIG.HUD_H - 20 + Math.random() * 30;
          if (ev.type === "snowfall") {
            ev.particles.push({
              x: px, y: py,
              vx: -15 + Math.random() * 30,  // drift latéral léger
              vy: 60 + Math.random() * 50,   // chute lente
              size: 1 + Math.floor(Math.random() * 2),
            });
          } else {
            // Rain : gouttes diagonales rapides vers bas-gauche
            ev.particles.push({
              x: px, y: py,
              vx: -120,
              vy: 360 + Math.random() * 80,
              length: 4 + Math.floor(Math.random() * 4),
            });
          }
        }
      }
      // Update particles
      for (const p of ev.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      // Retirer celles hors-écran
      ev.particles = ev.particles.filter((p) => p.y < CONFIG.H + 30);
    }
  }

  // ── Cleanup : tumbleweeds arrivés à destination, weather events expirés sans particules restantes
  const hadTumbleweed = game.ambientAnims.active.some((ev) => ev.type === "tumbleweed");
  game.ambientAnims.active = game.ambientAnims.active.filter((ev) => {
    if (ev.type === "tumbleweed") {
      // Arrivé à destination (selon direction)
      const reachedEnd = ev.vx > 0 ? ev.x >= ev.endX : ev.x <= ev.endX;
      return !reachedEnd;
    }
    // Weather : on garde tant que la durée n'est pas finie OU qu'il reste des particules
    return ev.age < ev.ttl || ev.particles.length > 0;
  });
  // Stoppe le vent ambient quand le dernier tumbleweed est sorti de scène
  const stillTumbleweed = game.ambientAnims.active.some((ev) => ev.type === "tumbleweed");
  if (hadTumbleweed && !stillTumbleweed) {
    audio.stopAmbient();
  }
}

function drawAmbientAnims(ctx) {
  for (const ev of game.ambientAnims.active) {
    if (ev.type === "tumbleweed") {
      const img = sprites["anim-tumbleweed"];
      if (!img) continue;
      const size = 32;
      ctx.save();
      ctx.translate(ev.x, ev.y);
      ctx.rotate(ev.rotation);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else if (ev.type === "snowfall") {
      // Flocons blancs avec léger glow
      ctx.save();
      for (const p of ev.particles) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (ev.type === "rain") {
      // Gouttes diagonales : courtes lignes inclinées
      ctx.save();
      ctx.strokeStyle = "rgba(180, 220, 245, 0.65)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const p of ev.particles) {
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 2, p.y + p.length);
      }
      ctx.stroke();
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

  // Panneau glassmorphique avec accent du side
  drawGlass(ctx, x, y, w, h, { radius: 16, tint: "rgba(15, 18, 32, 0.86)", border: hexToRgba(side === "player" ? COLORS.player : COLORS.enemy, 0.55) });

  // Header
  let cursorY = y + 14;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const headerLabel = `🏭 Factory ${type.label}`;
  ctx.fillText(headerLabel, x + 14, cursorY);

  // Badge tier coloré juste à droite du nom (II / III)
  const fTier = factory.tier || 1;
  if (fTier > 1) {
    const accent = fTier === 2 ? "#22d3ee" : "#fbbf24";
    const labelW = ctx.measureText(headerLabel).width;
    ctx.save();
    ctx.fillStyle = accent;
    roundedRect(ctx, x + 14 + labelW + 6, cursorY - 1, 26, 16, 4);
    ctx.fill();
    ctx.fillStyle = "#0a0e1a";
    ctx.font = "bold 9px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(fTier === 2 ? "II" : "III", x + 14 + labelW + 6 + 13, cursorY + 7);
    ctx.restore();
  }

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`Investi : ${factory.totalInvested}💰`, x + w - 38, cursorY + 2);

  cursorY += 22;

  // Petite ligne info des bonus tier (×HP/dmg, cadence, portée)
  if (fTier > 1) {
    const accent = fTier === 2 ? "#22d3ee" : "#fbbf24";
    ctx.fillStyle = accent;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.textAlign = "left";
    const tm = TIER_MULTIPLIER[fTier];
    const pm = TIER_PROD_MULTIPLIER[fTier];
    const prodPct = Math.round((1 / pm - 1) * 100);
    ctx.fillText(`✦ Tier ${fTier === 2 ? "II" : "III"} : HP/dmg ×${tm.toFixed(2)}  ·  cadence +${prodPct}%`, x + 14, cursorY);
    cursorY += 16;
  }

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

    // Raccourci bulk ×N (jusqu'à 5 paliers d'un coup) à gauche du bouton +1.
    // Visible uniquement pour le joueur, si au moins 2 paliers restent.
    const bulkN = bulkUpgradeSteps(lvl, 5);
    if (isPlayer && !isMax && bulkN >= 2) {
      const bulkW = 56;
      const bulkRect = { x: btnRect.x - 4 - bulkW, y: btnRect.y, w: bulkW, h: btnRect.h };
      const bulkCost = bulkUpgradeCost(stat, lvl, bulkN);
      const bulkAfford = state.money >= bulkCost;
      const bulkHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, bulkRect);
      let bulkFill;
      if (!bulkAfford) bulkFill = COLORS.btnDisabled;
      else if (bulkHover) bulkFill = "rgba(168, 85, 247, 0.55)";
      else bulkFill = "rgba(168, 85, 247, 0.32)";
      ctx.fillStyle = bulkFill;
      roundedRect(ctx, bulkRect.x, bulkRect.y, bulkRect.w, bulkRect.h, 6);
      ctx.fill();
      ctx.strokeStyle = bulkAfford ? "rgba(168, 85, 247, 0.85)" : "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = bulkAfford ? "#fff" : COLORS.hudMuted;
      ctx.font = "bold 11px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`×${bulkN}`, bulkRect.x + bulkRect.w / 2, bulkRect.y + bulkRect.h / 2 - 6);
      ctx.font = "9px -apple-system, sans-serif";
      ctx.fillText(`${bulkCost}💰`, bulkRect.x + bulkRect.w / 2, bulkRect.y + bulkRect.h / 2 + 7);
      if (bulkAfford) rects.upgrades.push({ rect: bulkRect, statId: stat.id, bulk: bulkN });
    }

    cursorY += rowH;
  }

  // Séparateur
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(x + 12, cursorY);
  ctx.lineTo(x + w - 12, cursorY);
  ctx.stroke();
  cursorY += 8;

  // Bouton Fusionner — visible si une factory voisine compatible existe
  const ownerSide = side;
  const isOwner = ownerSide === mySide();
  const slotIdx = game[side].slots.indexOf(slot);
  const partnerIdx = isOwner ? findMergePartner(side, slotIdx) : null;
  const canMerge = partnerIdx != null && (factory.tier || 1) < 3;
  if (canMerge) {
    const mergeRect = { x: x + 12, y: cursorY, w: w - 24, h: 34 };
    const mergeHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, mergeRect);
    const accent = (factory.tier || 1) === 1 ? "#22d3ee" : "#fbbf24";
    ctx.save();
    ctx.fillStyle = mergeHover ? hexToRgba(accent, 0.45) : hexToRgba(accent, 0.25);
    if (mergeHover) { ctx.shadowColor = accent; ctx.shadowBlur = 10; }
    roundedRect(ctx, mergeRect.x, mergeRect.y, mergeRect.w, mergeRect.h, 6);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const nextTier = (factory.tier || 1) + 1;
    ctx.fillText(`⚡ Fusionner → ${tierLabel(nextTier)}`, mergeRect.x + mergeRect.w / 2, mergeRect.y + mergeRect.h / 2);
    rects.merge = { rect: mergeRect, partnerIdx };
    cursorY += 40;
  }

  // Bouton Sell
  const refund = Math.floor(factory.totalInvested * SELL_RATIO);
  const sellRect = { x: x + 12, y: cursorY, w: w - 24, h: 34 };
  const sellEnabled = ownerSide === mySide();
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
  // Editable si la factory appartient à mon camp (player en solo / host,
  // enemy en guest MP). Avant : forcé à "player" → bug guest qui ne pouvait
  // pas activer le mode Défense sur ses propres factories.
  const editable = side === mySide();
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

  // Panneau glassmorphique
  drawGlass(ctx, x, y, w, h, { radius: 16, tint: "rgba(15, 18, 32, 0.86)", border: hexToRgba(side === "player" ? COLORS.player : COLORS.enemy, 0.55) });

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

    // Raccourci bulk ×N pour tourelle (même logique que pour les usines).
    const bulkN = bulkUpgradeSteps(lvl, 5);
    if (isPlayer && !isMax && bulkN >= 2) {
      const bulkW = 56;
      const bulkRect = { x: btnRect.x - 4 - bulkW, y: btnRect.y, w: bulkW, h: btnRect.h };
      const bulkCost = bulkUpgradeCost(stat, lvl, bulkN);
      const bulkAfford = state.money >= bulkCost;
      const bulkHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, bulkRect);
      let bulkFill;
      if (!bulkAfford) bulkFill = COLORS.btnDisabled;
      else if (bulkHover) bulkFill = "rgba(168, 85, 247, 0.55)";
      else bulkFill = "rgba(168, 85, 247, 0.32)";
      ctx.fillStyle = bulkFill;
      roundedRect(ctx, bulkRect.x, bulkRect.y, bulkRect.w, bulkRect.h, 6);
      ctx.fill();
      ctx.strokeStyle = bulkAfford ? "rgba(168, 85, 247, 0.85)" : "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = bulkAfford ? "#fff" : COLORS.hudMuted;
      ctx.font = "bold 11px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`×${bulkN}`, bulkRect.x + bulkRect.w / 2, bulkRect.y + bulkRect.h / 2 - 6);
      ctx.font = "9px -apple-system, sans-serif";
      ctx.fillText(`${bulkCost}💰`, bulkRect.x + bulkRect.w / 2, bulkRect.y + bulkRect.h / 2 + 7);
      if (bulkAfford) rects.upgrades.push({ rect: bulkRect, statId: stat.id, bulk: bulkN });
    }

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

  // Multiplicateurs liés au tier de la factory (mirroring spawnStatsFor /
  // effectiveProdInterval pour que le preview reflète la VRAIE valeur in-game).
  const tier = factory.tier || 1;
  const tierMult     = TIER_MULTIPLIER[tier] || 1;     // hp + damage
  const speedMult    = TIER_SPEED_MULTIPLIER[tier] || 1;
  const rangeMult    = TIER_RANGE_MULTIPLIER[tier] || 1;
  const prodMult     = TIER_PROD_MULTIPLIER[tier] || 1;
  const atkMult      = tier === 1 ? 1 : tier === 2 ? 0.80 : 0.62; // attackInterval

  let cur, next;
  switch (stat.id) {
    case "creationRate":
      cur  = (type.prodInterval * prodMult) / statMultiplier(lvl, 0.20);
      next = (type.prodInterval * prodMult) / statMultiplier(lvlNext, 0.20);
      return `${fmt(cur)}s → ${fmt(next)}s / unité`;
    case "health":
      cur  = ut.hp * statMultiplier(lvl, 0.25)   * tierMult;
      next = ut.hp * statMultiplier(lvlNext, 0.25) * tierMult;
      return `${fmt(cur)} → ${fmt(next)} PV / unité`;
    case "shootRate":
      cur  = (ut.attackInterval * atkMult) / statMultiplier(lvl, 0.18);
      next = (ut.attackInterval * atkMult) / statMultiplier(lvlNext, 0.18);
      return `${fmt(cur)}s → ${fmt(next)}s / tir`;
    case "range":
      cur  = ut.range * statMultiplier(lvl, 0.12)   * rangeMult;
      next = ut.range * statMultiplier(lvlNext, 0.12) * rangeMult;
      return `${fmt(cur)} → ${fmt(next)} px`;
    case "speed":
      cur  = ut.speed * statMultiplier(lvl, 0.15)   * speedMult;
      next = ut.speed * statMultiplier(lvlNext, 0.15) * speedMult;
      return `${fmt(cur)} → ${fmt(next)} px/s`;
    case "power":
      cur  = ut.damage * statMultiplier(lvl, 0.22)   * tierMult;
      next = ut.damage * statMultiplier(lvlNext, 0.22) * tierMult;
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
  const PH = 380;
  const px = (CONFIG.CANVAS_W - PW) / 2;
  const py = 234;  // descend pour laisser la place aux cards récompenses

  // Panneau glassmorphique
  drawGlass(ctx, px, py, PW, PH, { radius: 20, tint: "rgba(15, 18, 32, 0.78)", border: "rgba(255,255,255,0.22)" });

  // Tabs cliquables : Stats (table) / Graphiques (timeline économie + army)
  if (!game.ui.gameOverTab) game.ui.gameOverTab = "stats";
  const tabW = 130, tabH = 28;
  const tabsY = py + 8;
  const tabsTotalW = tabW * 2 + 8;
  const tabsX = px + (PW - tabsTotalW) / 2;
  const tabs = [
    { id: "stats", label: "📊 Stats" },
    { id: "charts", label: "📈 Graphiques" },
  ];
  const tabRects = {};
  tabs.forEach((t, i) => {
    const rect = { x: tabsX + i * (tabW + 8), y: tabsY, w: tabW, h: tabH };
    tabRects[t.id] = rect;
    const isActive = game.ui.gameOverTab === t.id;
    const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
    ctx.fillStyle = isActive ? "rgba(91,140,255,0.35)" : (isHover ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)");
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = isActive ? COLORS.player : "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = isActive ? "#fff" : COLORS.hudText;
    ctx.font = "bold 12px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t.label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  });
  game.ui.gameOverTabRects = tabRects;

  // Si onglet Graphiques actif → bypass le tableau
  if (game.ui.gameOverTab === "charts") {
    drawTimelineCharts(ctx, px + 18, py + 50, PW - 36, PH - 64);
    return;
  }

  // Colonnes : Label · Joueur · Ennemi
  const labelX = px + 28;
  const playerX = px + PW * 0.62;
  const enemyX = px + PW - 28;

  // En MP on parle "MOI / ADVERSAIRE" depuis la perspective du joueur courant.
  const isMp = game.mode === "mp";
  const me = mySide();
  const opp = oppSide();
  const myColor = me === "player" ? COLORS.player : COLORS.enemy;
  const oppColor = opp === "player" ? COLORS.player : COLORS.enemy;

  ctx.textBaseline = "top";
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.hudMuted;
  ctx.fillText("Stat", labelX, py + 50);
  ctx.textAlign = "right";
  ctx.fillStyle = isMp ? myColor : COLORS.player;
  ctx.fillText(isMp ? "MOI" : "JOUEUR", playerX, py + 50);
  ctx.fillStyle = isMp ? oppColor : COLORS.enemy;
  ctx.fillText(isMp ? "ADVERSAIRE" : "ENNEMI", enemyX, py + 50);

  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.moveTo(px + 20, py + 70);
  ctx.lineTo(px + PW - 20, py + 70);
  ctx.stroke();

  const ps = isMp ? game.stats[me] : game.stats.player;
  const es = isMp ? game.stats[opp] : game.stats.enemy;
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

// Rendu d'une mini-courbe (line chart) avec axes simples.
// data : [{ t, v }] · x/y/w/h zone du graphe.
function drawLineChart(ctx, x, y, w, h, series, opts = {}) {
  const padL = 38, padR = 8, padT = 14, padB = 22;
  const gx = x + padL;
  const gy = y + padT;
  const gw = w - padL - padR;
  const gh = h - padT - padB;

  // Fond chart
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  roundedRect(ctx, x, y, w, h, 8);
  ctx.fill();

  // Titre
  if (opts.title) {
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(opts.title, x + 10, y + 4);
  }

  // Calcul max global sur les séries
  let maxV = 0, maxT = 0;
  for (const s of series) {
    for (const p of s.data) {
      if (p.v > maxV) maxV = p.v;
      if (p.t > maxT) maxT = p.t;
    }
  }
  if (maxV < 1) maxV = 1;
  if (maxT < 1) maxT = 1;

  // Grille horizontale (4 lignes)
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const ly = gy + (gh * i) / 4;
    ctx.beginPath();
    ctx.moveTo(gx, ly);
    ctx.lineTo(gx + gw, ly);
    ctx.stroke();
    // Label Y
    const val = Math.round(maxV * (1 - i / 4));
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "9px -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(String(val), gx - 4, ly);
  }

  // Axe X : 0 → maxT (durée). Tick toutes les 60s ou plus selon durée.
  const tickStep = maxT > 600 ? 120 : (maxT > 240 ? 60 : 30);
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "9px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let t = 0; t <= maxT; t += tickStep) {
    const lx = gx + (gw * t) / maxT;
    ctx.fillText(`${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`, lx, gy + gh + 4);
  }

  // Lignes
  for (const s of series) {
    if (s.data.length < 2) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < s.data.length; i++) {
      const p = s.data[i];
      const lx = gx + (gw * p.t) / maxT;
      const ly = gy + gh - (gh * p.v) / maxV;
      if (i === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    }
    ctx.stroke();
  }

  // Légende
  let lgX = x + w - padR;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  for (let i = series.length - 1; i >= 0; i--) {
    const s = series[i];
    ctx.fillStyle = s.color;
    ctx.fillText(`■ ${s.label}`, lgX, y + 4);
    lgX -= ctx.measureText(`■ ${s.label}`).width + 12;
  }
}

function drawTimelineCharts(ctx, x, y, w, h) {
  const isMp = game.mode === "mp";
  const me = mySide();
  const opp = oppSide();
  const meLabel = isMp ? "Moi" : "Joueur";
  const oppLabel = isMp ? "Adversaire" : "Ennemi";
  const meColor = me === "player" ? COLORS.player : COLORS.enemy;
  const oppColor = opp === "player" ? COLORS.player : COLORS.enemy;
  const ps = game.stats[me];
  const es = game.stats[opp];

  const moneySeries = [
    { label: meLabel,  color: meColor,  data: ps.timeline.map((p) => ({ t: p.t, v: p.money })) },
    { label: oppLabel, color: oppColor, data: es.timeline.map((p) => ({ t: p.t, v: p.money })) },
  ];
  const armySeries = [
    { label: meLabel,  color: meColor,  data: ps.timeline.map((p) => ({ t: p.t, v: p.army })) },
    { label: oppLabel, color: oppColor, data: es.timeline.map((p) => ({ t: p.t, v: p.army })) },
  ];

  const chartH = (h - 14) / 2;
  drawLineChart(ctx, x, y, w, chartH, moneySeries, { title: "💰 Argent en banque" });
  drawLineChart(ctx, x, y + chartH + 14, w, chartH, armySeries, { title: "⚔️ Army value (somme killReward unités vivantes)" });

  if (ps.timeline.length < 2 && es.timeline.length < 2) {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "italic 12px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Pas assez de données — la partie a été trop courte.", x + w / 2, y + h / 2);
  }
}

// -------------------------------------------------------------
// Menu d'accueil
// -------------------------------------------------------------
// ── Helpers UI Liquid Glass (style iOS/visionOS) ──────────────────────────
// Dessine un fond ambiant (gradient sombre + nappes lumineuses douces) pour
// les écrans full-screen (menu, lobby, game over).
function drawGlassBackground(ctx) {
  // Base
  const grad = ctx.createLinearGradient(0, 0, CONFIG.CANVAS_W, CONFIG.H);
  grad.addColorStop(0, "#07091a");
  grad.addColorStop(0.35, "#0e1530");
  grad.addColorStop(0.7, "#1a1b3a");
  grad.addColorStop(1, "#2a1245");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);

  // Nappes lumineuses radiales (oscillent légèrement avec le temps)
  const t = performance.now() / 6000;
  const blobs = [
    { x: 0.18 + 0.02 * Math.sin(t),       y: 0.22, r: 0.45, c: "rgba(91, 140, 255, 0.22)" },
    { x: 0.82 + 0.02 * Math.cos(t * 1.1), y: 0.70, r: 0.50, c: "rgba(192, 132, 252, 0.18)" },
    { x: 0.40,                            y: 0.95, r: 0.45, c: "rgba(34, 211, 238, 0.14)" },
  ];
  for (const b of blobs) {
    const cx = b.x * CONFIG.CANVAS_W;
    const cy = b.y * CONFIG.H;
    const r = b.r * CONFIG.CANVAS_W;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, b.c);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);
  }
}

// Carte glassmorphique (approximation : ombre douce, translucent, highlight
// haut, gradient subtil). Pas de vrai blur — trop coûteux sur canvas — mais
// l'aspect "frosted" est convaincant en superposition d'un fond gradient.
function drawGlass(ctx, x, y, w, h, opts = {}) {
  const radius = opts.radius != null ? opts.radius : 16;
  const tint = opts.tint || "rgba(255, 255, 255, 0.06)";
  const borderColor = opts.border || "rgba(255, 255, 255, 0.14)";
  const shadow = opts.shadow !== false;

  ctx.save();
  if (shadow) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
  }
  ctx.fillStyle = tint;
  roundedRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.restore();

  // Gradient vertical doux (highlight haut → ombre bas)
  ctx.save();
  roundedRect(ctx, x, y, w, h, radius);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "rgba(255, 255, 255, 0.10)");
  g.addColorStop(0.35, "rgba(255, 255, 255, 0.02)");
  g.addColorStop(1, "rgba(0, 0, 0, 0.10)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // Bordure
  ctx.save();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  roundedRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius);
  ctx.stroke();
  // Top highlight bright line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + radius, y + 0.5);
  ctx.lineTo(x + w - radius, y + 0.5);
  ctx.stroke();
  ctx.restore();
}

// Variante "active" — accent coloré (glow lumineux).
function drawGlassAccent(ctx, x, y, w, h, color, opts = {}) {
  const radius = opts.radius != null ? opts.radius : 16;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = hexToRgba(color, 0.22);
  roundedRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, x, y, w, h, radius);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, hexToRgba(color, 0.35));
  g.addColorStop(1, hexToRgba(color, 0.10));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // Highlight haut
  const hg = ctx.createLinearGradient(0, y, 0, y + h);
  hg.addColorStop(0, "rgba(255, 255, 255, 0.25)");
  hg.addColorStop(0.5, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = hg;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = hexToRgba(color, 0.65);
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, radius);
  ctx.stroke();
  ctx.restore();
}

// Dropdown menu music — chip top-left, click = expand, click option = switch.
function drawMenuMusicSelector(ctx) {
  if (!game.ui.menuMusicRects) game.ui.menuMusicRects = {};
  const X = 16, Y = 14;
  const CHIP_W = 200, CHIP_H = 32;
  const expanded = !!game.ui.menuMusicExpanded;
  const currentTrack = MENU_MUSIC_TRACKS.find((t) => t.id === audio.menuMusicTrackId)
                       || MENU_MUSIC_TRACKS[0];

  ctx.save();

  // ── CHIP
  const chipRect = { x: X, y: Y, w: CHIP_W, h: CHIP_H };
  game.ui.menuMusicRects.chip = chipRect;
  const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, chipRect);
  // Background glass
  ctx.fillStyle = isHover ? "rgba(91, 140, 255, 0.25)" : "rgba(255, 255, 255, 0.10)";
  roundedRect(ctx, X, Y, CHIP_W, CHIP_H, 8);
  ctx.fill();
  ctx.strokeStyle = isHover ? "rgba(91, 140, 255, 0.7)" : "rgba(255, 255, 255, 0.20)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Icône musique 🎵 + nom track + chevron
  ctx.fillStyle = "#fff";
  ctx.font = "13px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`🎵 ${currentTrack.label}`, X + 12, Y + CHIP_H / 2);
  // Chevron (▼ ou ▲)
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.font = "10px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(expanded ? "▲" : "▼", X + CHIP_W - 12, Y + CHIP_H / 2);

  // ── Options expanded
  game.ui.menuMusicRects.options = [];
  if (expanded) {
    const optY0 = Y + CHIP_H + 4;
    const OPT_H = 36;
    // Background panneau
    ctx.fillStyle = "rgba(15, 23, 42, 0.90)";
    roundedRect(ctx, X, optY0, CHIP_W, MENU_MUSIC_TRACKS.length * OPT_H + 4, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let i = 0; i < MENU_MUSIC_TRACKS.length; i++) {
      const t = MENU_MUSIC_TRACKS[i];
      const rect = { x: X + 2, y: optY0 + 2 + i * OPT_H, w: CHIP_W - 4, h: OPT_H, id: t.id };
      game.ui.menuMusicRects.options.push(rect);
      const opHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
      const isActive = t.id === audio.menuMusicTrackId;
      // Highlight
      if (opHover || isActive) {
        ctx.fillStyle = isActive ? "rgba(91, 140, 255, 0.25)" : "rgba(255, 255, 255, 0.08)";
        roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 5);
        ctx.fill();
      }
      // Track label
      ctx.fillStyle = isActive ? "#9bc1ff" : "#fff";
      ctx.font = isActive ? "bold 13px -apple-system, sans-serif" : "13px -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(t.label, rect.x + 10, rect.y + 16);
      // Mood
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "10px -apple-system, sans-serif";
      ctx.fillText(t.mood, rect.x + 10, rect.y + 29);
      // Check si actif
      if (isActive) {
        ctx.fillStyle = "#9bc1ff";
        ctx.font = "11px -apple-system, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("✓", rect.x + rect.w - 10, rect.y + 22);
      }
    }
  }

  ctx.restore();
}

function drawMenu(ctx) {
  drawGlassBackground(ctx);
  const cx = CONFIG.CANVAS_W / 2;

  // ── Dropdown sélecteur de menu music (top-left, uniquement menu)
  drawMenuMusicSelector(ctx);

  // Titre — gradient blanc/bleu façon visionOS
  ctx.save();
  const titleGrad = ctx.createLinearGradient(0, 100, 0, 180);
  titleGrad.addColorStop(0, "#ffffff");
  titleGrad.addColorStop(1, "#93b4ff");
  ctx.fillStyle = titleGrad;
  ctx.font = "bold 64px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(91, 140, 255, 0.6)";
  ctx.shadowBlur = 32;
  ctx.fillText("🤖 ÉMERGENCE", cx, 140);
  ctx.restore();

  ctx.fillStyle = "rgba(240, 244, 255, 0.55)";
  ctx.font = "15px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Lane-based auto-battler · PvP en ligne", cx, 184);

  // ── DIFFICULTÉ ──
  ctx.fillStyle = "rgba(240, 244, 255, 0.55)";
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("DIFFICULTÉ", cx, 226);

  const diffBtnW = 140, diffBtnH = 72, diffGap = 12;
  const diffTotalW = 4 * diffBtnW + 3 * diffGap;
  const diffStartX = cx - diffTotalW / 2;
  const diffY = 240;
  const diffOrder = ["easy", "normal", "hard", "wave"];
  const diffRects = [];

  for (const [i, key] of diffOrder.entries()) {
    const preset = DIFFICULTY_PRESETS[key];
    const rect = { x: diffStartX + i * (diffBtnW + diffGap), y: diffY, w: diffBtnW, h: diffBtnH };
    diffRects.push({ rect, key });
    const isActive = game.difficulty === key;
    const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
    const accent = key === "wave" ? "#a855f7" : "#5b8cff";
    if (isActive) drawGlassAccent(ctx, rect.x, rect.y, rect.w, rect.h, accent, { radius: 14 });
    else drawGlass(ctx, rect.x, rect.y, rect.w, rect.h, { radius: 14, tint: isHover ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)" });

    ctx.fillStyle = "#fff";
    ctx.font = "bold 17px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${preset.emoji} ${preset.label}`, rect.x + rect.w / 2, rect.y + 24);

    ctx.fillStyle = "rgba(240, 244, 255, 0.65)";
    ctx.font = "10px -apple-system, sans-serif";
    wrapText(ctx, preset.desc, rect.x + rect.w / 2, rect.y + 46, rect.w - 14, 12);
  }

  // ── BIOME ──
  ctx.fillStyle = "rgba(240, 244, 255, 0.55)";
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("BIOME", cx, 336);

  const biomeBtnW = 130, biomeBtnH = 56, biomeGap = 14;
  const biomeTotalW = 3 * biomeBtnW + 2 * biomeGap;
  const biomeStartX = cx - biomeTotalW / 2;
  const biomeY = 350;
  const biomeOrder = ["desert", "jungle", "snow"];
  const biomeEmoji = { desert: "🏜️", jungle: "🌴", snow: "❄️" };
  const biomeRects = [];

  for (const [i, key] of biomeOrder.entries()) {
    const rect = { x: biomeStartX + i * (biomeBtnW + biomeGap), y: biomeY, w: biomeBtnW, h: biomeBtnH };
    biomeRects.push({ rect, key });
    const isActive = game.biome === key;
    const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
    if (isActive) drawGlassAccent(ctx, rect.x, rect.y, rect.w, rect.h, "#c084fc", { radius: 14 });
    else drawGlass(ctx, rect.x, rect.y, rect.w, rect.h, { radius: 14, tint: isHover ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)" });
    ctx.fillStyle = "#fff";
    ctx.font = "22px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(biomeEmoji[key], rect.x + rect.w / 2, rect.y + 22);
    ctx.font = "bold 12px -apple-system, sans-serif";
    ctx.fillText(BIOME_LABELS[key], rect.x + rect.w / 2, rect.y + 42);
  }

  // ── BOUTONS JOUER (Solo / Multijoueur) ──
  const playH = 60;
  const playW = 260;
  const playGap = 18;
  const playTotalW = 2 * playW + playGap;
  const playStartX = cx - playTotalW / 2;
  const playY = 432;
  const playRect = { x: playStartX, y: playY, w: playW, h: playH };
  const playMpRect = { x: playStartX + playW + playGap, y: playY, w: playW, h: playH };

  function drawPlayBtn(rect, label, sub, color) {
    const hover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
    drawGlassAccent(ctx, rect.x, rect.y, rect.w, rect.h, color, { radius: 16 });
    if (hover) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 24;
      roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
      ctx.strokeStyle = hexToRgba(color, 0.9);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 - 9);
    ctx.font = "11px -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillText(sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 13);
  }

  drawPlayBtn(playRect, "▶  SOLO", "Joue contre un bot", "#5b8cff");
  drawPlayBtn(playMpRect, "👥  MULTIJOUEUR", "Affronte un autre joueur", "#ff5b6e");

  // Bouton Tutoriel (sous les 2 boutons play) — glass vert discret
  const tutoW = 280, tutoH = 36;
  const tutoRect = { x: cx - tutoW / 2, y: playY + playH + 12, w: tutoW, h: tutoH };
  const tutoHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, tutoRect);
  drawGlassAccent(ctx, tutoRect.x, tutoRect.y, tutoRect.w, tutoRect.h, tutoHover ? "#4ade80" : "#22c55e", { radius: 12 });
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("📘  Tutoriel (1ère partie)", tutoRect.x + tutoRect.w / 2, tutoRect.y + tutoRect.h / 2);

  // ── SETTINGS AUDIO ── (positions décalées vers le bas pour laisser
  // la place au bouton Tutoriel inséré sous les boutons play)
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("PARAMÈTRES", cx, 560);

  const togW = 180, togH = 40, togGap = 16;
  const totalTogW = 2 * togW + togGap;
  const togStartX = cx - totalTogW / 2;
  const togY = 576;
  const musicRect = { x: togStartX, y: togY, w: togW, h: togH };
  const sfxRect = { x: togStartX + togW + togGap, y: togY, w: togW, h: togH };
  drawToggleButton(ctx, musicRect, "🎵 Musique", audio.musicEnabled);
  drawToggleButton(ctx, sfxRect, "🔊 Effets", audio.sfxEnabled);

  // ── CONTRÔLES ──
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Souris bord G/D pour scroller — ← → / A D — H / E pour recadrer — Échap pour annuler — 1-7 sélection bâtiment", cx, 632);

  // ── BANDEAU AUTH / PROFIL ──
  const profile = window.RE_AUTH?.profile;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "13px -apple-system, sans-serif";
  ctx.textAlign = "center";
  if (profile) {
    ctx.fillText(`👤 ${profile.username || "joueur"}  ·  💰 ${profile.currency} global  ·  équipe : ${window.RE_AUTH?.skin?.name || "bleu défaut"}`, cx, 654);
  } else {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.fillText("Tu joues en invité — connecte-toi pour gagner de la monnaie et débloquer des skins.", cx, 654);
  }

  // Liens cliquables
  const linkY = 686;
  const linksData = profile
    ? [
        { label: "🛍️ Boutique", url: "/shop/" },
        { label: "🎯 Missions", url: "/missions/" },
        { label: "🏆 Classement", url: "/leaderboard/" },
        { label: "👥 Amis",     url: "/friends/" },
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

  game.ui.menuRects = { diff: diffRects, biome: biomeRects, play: playRect, playMp: playMpRect, tutorial: tutoRect, music: musicRect, sfx: sfxRect, links: linkRects };
}

function drawToggleButton(ctx, rect, label, on) {
  const color = on ? "#4ade80" : "#ff5b6e";
  drawGlassAccent(ctx, rect.x, rect.y, rect.w, rect.h, color, { radius: 12 });

  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + 14, rect.y + rect.h / 2);

  // Indicateur ON/OFF style pill
  const pillW = 36, pillH = 18;
  const pillX = rect.x + rect.w - pillW - 12;
  const pillY = rect.y + (rect.h - pillH) / 2;
  ctx.fillStyle = on ? "rgba(74,222,128,0.55)" : "rgba(255,91,110,0.45)";
  roundedRect(ctx, pillX, pillY, pillW, pillH, 9);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 10px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(on ? "ON" : "OFF", pillX + pillW / 2, pillY + pillH / 2);
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

// Bandeau récompenses sous le titre du game over : monnaie gagnée, ELO,
// vague atteinte. Trois cards glass aérées au lieu d'une longue ligne dense.
function drawGameOverRewards(ctx) {
  const isWave = !!game.wave?.active;
  const isMp = game.mode === "mp";
  const cards = [];
  if (game.gameOver.reward != null) {
    cards.push({
      icon: "💰",
      label: "Monnaie",
      value: `+${game.gameOver.reward}`,
      sub: window.RE_AUTH?.profile ? `Solde : ${window.RE_AUTH.profile.currency}` : "—",
      color: "#fbbf24",
    });
  }
  if (isMp && typeof game.gameOver.eloDelta === "number" && game.gameOver.eloDelta !== 0) {
    const d = game.gameOver.eloDelta;
    const sign = d > 0 ? "+" : "";
    cards.push({
      icon: "🏆",
      label: "ELO",
      value: `${sign}${d}`,
      sub: d > 0 ? "Tu progresses !" : "À la prochaine !",
      color: d > 0 ? "#4ade80" : "#ff5b6e",
    });
  }
  if (isWave) {
    const w = game.gameOver.wavesCleared || 0;
    cards.push({
      icon: "🌊",
      label: "Vagues",
      value: `${w}`,
      sub: game.gameOver.wasRecord ? "🏅 Nouveau record" : (game.gameOver.bestWave != null ? `Record : ${game.gameOver.bestWave}` : ""),
      color: "#a855f7",
    });
  }
  if (cards.length === 0) return;
  const cardW = 200, cardH = 70, gap = 16;
  const totalW = cardW * cards.length + gap * (cards.length - 1);
  const startX = (CONFIG.CANVAS_W - totalW) / 2;
  const y = 154;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const x = startX + i * (cardW + gap);
    drawGlassAccent(ctx, x, y, cardW, cardH, c.color, { radius: 14 });
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`${c.icon}  ${c.label.toUpperCase()}`, x + 14, y + 18);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 26px -apple-system, sans-serif";
    ctx.fillText(c.value, x + 14, y + 44);
    if (c.sub) {
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "10px -apple-system, sans-serif";
      ctx.fillText(c.sub, x + 14, y + 60);
    }
  }
}

function drawGameOverOverlay(ctx) {
  // Voile assombrissant + nappes lumineuses pour un fond glassmorphique
  ctx.fillStyle = "rgba(7, 9, 26, 0.78)";
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);
  // Nappe accent en haut
  const ag = ctx.createRadialGradient(CONFIG.CANVAS_W / 2, 100, 0, CONFIG.CANVAS_W / 2, 100, 600);
  ag.addColorStop(0, "rgba(91, 140, 255, 0.20)");
  ag.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = ag;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);

  const isSpec = game.mode === "mp" && game.mp?.role === "spectator";
  const isWave = !!game.wave?.active;
  const winnerSide = game.gameOver.winner;
  const win = !isSpec && !isWave && winnerSide === mySide();
  let title, subtitle, titleColor;
  if (isWave) {
    const w = game.gameOver.wavesCleared || 0;
    title = "VAGUES";
    subtitle = `Tu as survécu à ${w} vague${w > 1 ? "s" : ""}.`;
    titleColor = "#a855f7";
    if (game.gameOver.wasRecord) subtitle += "  ·  🏅 Nouveau record perso !";
    else if (game.gameOver.bestWave != null) subtitle += `  ·  Record perso : ${game.gameOver.bestWave}`;
  } else if (isSpec) {
    const winnerName = winnerSide === "player"
      ? (game.mp?.hostUsername  || "Hôte")
      : (game.mp?.guestUsername || "Invité");
    title = "FIN DE PARTIE";
    subtitle = `${winnerName} a remporté la partie.`;
    titleColor = COLORS.hudText;
  } else {
    title = win ? "VICTOIRE !" : "DÉFAITE";
    subtitle = win ? "La base adverse est tombée." : "Ta base a été détruite.";
    titleColor = win ? COLORS.hpGood : COLORS.enemy;
  }
  if (game.gameOver.reason === "opponent_left") {
    subtitle = "L'adversaire a quitté la partie.";
  } else if (game.gameOver.reason === "surrender") {
    subtitle = win
      ? "L'adversaire a abandonné."
      : "Tu as abandonné la partie.";
  }

  ctx.fillStyle = titleColor;
  ctx.font = "bold 52px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = titleColor;
  ctx.shadowBlur = 24;
  ctx.fillText(title, CONFIG.CANVAS_W / 2, 88);
  ctx.shadowBlur = 0;

  ctx.fillStyle = COLORS.hudText;
  ctx.font = "15px -apple-system, sans-serif";
  ctx.fillText(subtitle, CONFIG.CANVAS_W / 2, 124);

  // Bandeau récompenses : ELO / monnaie / wave bonus, en cards glassy
  if (!isSpec) drawGameOverRewards(ctx);

  // Rapport de partie
  drawGameOverReport(ctx);

  // Bouton "Rejouer" (solo) ou "Rematch" (MP, sauf spectateur)
  const isMp = game.mode === "mp";
  const isSpec2 = isMp && game.mp?.role === "spectator";
  const btnW = 200;
  const btnH = 52;
  const gap = 16;
  const showAction = !isSpec2; // spectator → seulement Menu
  const totalW = showAction ? btnW * 2 + gap : btnW;
  const startX = (CONFIG.CANVAS_W - totalW) / 2;
  const btnY = CONFIG.H - 90;
  if (!showAction) {
    game.ui.replayBtn = null;
    game.ui.rematchBtn = null;
    game.ui.gameOverMenuBtn = { x: startX, y: btnY, w: btnW, h: btnH };
  } else {
    if (isMp) {
      // Rematch
      const rect = { x: startX, y: btnY, w: btnW, h: btnH };
      game.ui.rematchBtn = rect;
      game.ui.replayBtn = null;
      const r = ensureRematchState() || { myRequested: false, peerRequested: false, pending: false };
      const hover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
      let label;
      if (r.pending) label = "⏳ Rematch en cours…";
      else if (r.myRequested && !r.peerRequested) label = "✓ En attente de l'adversaire…";
      else if (!r.myRequested && r.peerRequested) label = "🔁 L'adversaire veut rejouer !";
      else label = "🔁 Rematch";
      ctx.fillStyle = hover && !r.pending ? COLORS.hpGood : "rgba(34,197,94,0.35)";
      roundedRect(ctx, rect.x, rect.y, btnW, btnH, 10);
      ctx.fill();
      ctx.strokeStyle = COLORS.hpGood;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px -apple-system, sans-serif";
      ctx.fillText(label, rect.x + btnW / 2, btnY + btnH / 2);
    } else {
      // Solo : "Rejouer"
      game.ui.replayBtn = { x: startX, y: btnY, w: btnW, h: btnH };
      game.ui.rematchBtn = null;
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
    game.ui.gameOverMenuBtn = { x: startX + btnW + gap, y: btnY, w: btnW, h: btnH };
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
  // Barre HUD glassmorphique : gradient sombre + highlight haut
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, CONFIG.HUD_H);
  g.addColorStop(0, "rgba(15, 18, 32, 0.88)");
  g.addColorStop(0.5, "rgba(20, 24, 40, 0.82)");
  g.addColorStop(1, "rgba(10, 14, 28, 0.92)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.HUD_H);
  // Highlight bright top edge
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, 1);
  ctx.restore();

  // Ligne bottom plus douce
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
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

  // Username sous le solde de partie (solde global retiré : consultable dans
  // la boutique, pas critique en partie, et débordait sur le bouton "Légère").
  const profile = window.RE_AUTH?.profile;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.fillStyle = COLORS.hudMuted;
  if (profile) {
    const mpTag = (game.mode === "mp" && game.mp?.role) ? ` · ${game.mp.role === "host" ? "Hôte" : "Invité"}` : "";
    ctx.fillText(`👤 ${profile.username || "joueur"}${mpTag}`, 20, CONFIG.HUD_H / 2 + 10);
  } else {
    ctx.fillText("invité — connecte-toi", 20, CONFIG.HUD_H / 2 + 10);
  }

  // Boutons "Construire" (mode build) + bouton spécial éclair
  drawBuildButtons(ctx);
  drawLightningButton(ctx);
  drawIemButton(ctx);
  drawDropButton(ctx);
  drawSurgeButton(ctx);
  drawSettingsButton(ctx);
  drawSurrenderButton(ctx);

  // Bloc droit : timer (haut) + argent adversaire (bas) — dans la zone dédiée
  // entre les sorts et le gear. Plus de chevauchement avec les boutons.
  const timerCx = hudTimerX() + HUD_LAYOUT.TIMER_W / 2;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 16px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const min = Math.floor(game.time / 60);
  const sec = Math.floor(game.time % 60).toString().padStart(2, "0");
  ctx.fillText(`${min}:${sec}`, timerCx, CONFIG.HUD_H / 2 - 8);

  // Argent adversaire juste sous le timer, dans la couleur du camp opposé.
  ctx.fillStyle = oppForHud === "player" ? COLORS.player : COLORS.enemy;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.fillText(`${game[oppForHud].money} 💰`, timerCx, CONFIG.HUD_H / 2 + 10);

  // Pseudo de l'adversaire (MP uniquement) : sous la barre HUD, près du
  // bouton Abandonner (qui est aussi en dessous), pas dans la barre du haut.
  if (game.mode === "mp" && game.mp?.opponent?.username) {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "10px -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`👤 ${game.mp.opponent.username}`,
                 CONFIG.CANVAS_W - HUD_LAYOUT.RIGHT_PAD, CONFIG.HUD_H + 6);
  }

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
  const ICONS = { light: "🏭", heavy: "🏭", swarmer: "🏭", sniper: "🏭", air: "✈️", medic: "⚕️", turret: "🗼" };
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

    // Label (haut) + coût (bas) empilés verticalement, comme les boutons sorts.
    // Évite le débordement horizontal sur les labels longs ("Aérienne", "Swarmer").
    const cx = btn.x + btn.w / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = canAfford ? COLORS.hudText : COLORS.hudMuted;
    ctx.font = "bold 12px -apple-system, sans-serif";
    ctx.fillText(`${icon} ${label}`, cx, btn.y + btn.h / 2 - 6);

    ctx.fillStyle = canAfford ? "#fbbf24" : COLORS.hudMuted;
    ctx.font = "bold 10px -apple-system, sans-serif";
    ctx.fillText(`${cost} 💰`, cx, btn.y + btn.h / 2 + 9);
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
    rows.push({ label: "Cible", value: "Sol + Air ✈️" });
    return rows;
  }
  const factory = FACTORY_TYPES[type];
  const unit = UNIT_TYPES[factory?.unitType];
  if (!factory || !unit) return rows;
  rows.push({ label: "Usine PV", value: String(factory.hp) });
  rows.push({ label: "Cadence prod", value: `1 unité / ${factory.prodInterval}s` });
  rows.push({ label: "Unité PV", value: String(unit.hp) });
  if (unit.isMedic) {
    rows.push({ label: "Type", value: "🩹 Soigneur" });
    rows.push({ label: "Soin", value: `+${unit.damage} PV / tick` });
    rows.push({ label: "Portée", value: `${unit.range} px` });
    rows.push({ label: "Cadence", value: `1 soin / ${unit.attackInterval}s` });
    rows.push({ label: "Vitesse", value: `${unit.speed} px/s` });
    rows.push({ label: "Cibles", value: "Alliés blessés" });
  } else {
    rows.push({ label: "Dégâts", value: String(unit.damage) });
    rows.push({ label: "Portée", value: `${unit.range} px` });
    rows.push({ label: "Cadence tir", value: `1 tir / ${unit.attackInterval}s` });
    rows.push({ label: "Vitesse", value: `${unit.speed} px/s` });
    rows.push({ label: "Couche", value: unit.layer === "air" ? "Aérienne ✈️" : "Sol 🚜" });
    let targets = unit.layer === "air" ? "Sol + Air" : (unit.canTargetAir ? "Sol + Air" : "Sol uniquement");
    rows.push({ label: "Cibles", value: targets });
    rows.push({ label: "Récompense", value: `+${unit.killReward} 💰 par kill` });
  }
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

// Bouton Abandonner — visible uniquement en MP host/guest pendant la partie.
// Le spectateur a un bouton "Quitter" plutôt qu'un abandon.
function drawSurrenderButton(ctx) {
  if (game.mode !== "mp") { game.ui.surrenderBtn = null; game.ui.spectatorLeaveBtn = null; return; }
  const isSpec = game.mp?.role === "spectator";
  const btnX = CONFIG.CANVAS_W - 16 - 110;
  const btnY = CONFIG.HUD_H + 8;
  const btnW = 110;
  const btnH = 26;
  const rect = { x: btnX, y: btnY, w: btnW, h: btnH };
  const hover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
  // Persiste tant que le joueur n'a pas confirmé/annulé. Plus de timeout
  // 3s qui faisait croire à un bug ("le bouton repassait à abandonner").
  const armed = !isSpec && !!game.ui.surrenderArmedAt;
  ctx.save();
  if (armed) {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);
    ctx.fillStyle = `rgba(239,68,68,${(0.55 + 0.35 * pulse).toFixed(3)})`;
    ctx.shadowColor = COLORS.enemy;
    ctx.shadowBlur = 10 + 6 * pulse;
  } else {
    ctx.fillStyle = hover ? "rgba(239,68,68,0.55)" : "rgba(239,68,68,0.22)";
  }
  roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = COLORS.enemy;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let label;
  if (isSpec) label = "↩ Quitter";
  else if (armed) label = "⚠ Confirmer ?";
  else label = "🏳️ Abandonner";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
  if (isSpec) { game.ui.spectatorLeaveBtn = rect; game.ui.surrenderBtn = null; }
  else { game.ui.surrenderBtn = rect; game.ui.spectatorLeaveBtn = null; }

  // Bandeau "Mode Spectateur" sous le bouton si applicable
  if (isSpec) {
    ctx.save();
    ctx.fillStyle = "rgba(168,85,247,0.85)";
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("👁  MODE SPECTATEUR", rect.x + rect.w, rect.y + rect.h + 14);
    ctx.restore();
  }
}

async function trySurrender() {
  if (!window.RE_MP || game.mode !== "mp") return;
  if (game.gameOver) return;
  // Confirmation 2-clics persistante : reste armé tant que le joueur n'a pas
  // confirmé OU annulé explicitement (Échap ou clic ailleurs). Pas d'auto-revert
  // qui rendait le 2e clic ambigu.
  if (!game.ui.surrenderArmedAt) {
    game.ui.surrenderArmedAt = performance.now();
    return;
  }
  // 2e clic = confirmation
  game.ui.surrenderArmedAt = 0;
  const res = await window.RE_MP.surrender();
  if (res?.error) {
    console.warn("[surrender] RPC failed:", res.error);
    flashLobbyMessage(`Abandon impossible : ${res.error}`, "error");
    // On déclenche quand même un game over local pour libérer le joueur
    handleMpGameOver({ winnerSide: oppSide(), reason: "surrender" });
    return;
  }
  handleMpGameOver({ winnerSide: res.winnerSide || oppSide(), reason: "surrender" });
}

function drawSettingsButton(ctx) {
  // Position : tout à droite du HUD, après les sorts + le timer.
  const btnX = hudGearX();
  const btnY = HUD_LAYOUT.Y;
  const btnW = HUD_LAYOUT.GEAR_W;
  const btnH = HUD_LAYOUT.BTN_H;
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

// Bouton IEM — placé à droite de l'éclair. Couleur cyan (impulsion EM).
function drawIemButton(ctx) {
  const btnW = HUD_LAYOUT.SPELL_BTN_W;
  const btnH = HUD_LAYOUT.BTN_H;
  const btnX = hudSpellX(1);
  const btnY = HUD_LAYOUT.Y;
  game.ui.iemBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

  const cd = iemCdFor(mySide());
  const ready = cd <= 0;
  const canAfford = game[mySide()].money >= IEM_COST;
  const enabled = ready && canAfford;
  const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, game.ui.iemBtn);

  ctx.save();
  if (enabled) {
    ctx.fillStyle = isHover ? "rgba(34, 211, 238, 0.55)" : "rgba(34, 211, 238, 0.35)";
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = isHover ? 16 : 8;
  } else if (!ready) {
    ctx.fillStyle = "rgba(100,116,139,0.22)";
  } else {
    // ready mais pas de fric → grisé rouge
    ctx.fillStyle = "rgba(239,68,68,0.18)";
  }
  roundedRect(ctx, btnX, btnY, btnW, btnH, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = enabled ? "#22d3ee" : (ready ? "rgba(239,68,68,0.55)" : "rgba(255,255,255,0.15)");
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Label
  ctx.fillStyle = enabled ? "#fff" : COLORS.hudMuted;
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (!ready) {
    ctx.fillText(`💥 ${Math.ceil(cd)}s`, btnX + btnW / 2, btnY + btnH / 2 - 4);
  } else {
    ctx.fillText("💥 IEM", btnX + btnW / 2, btnY + btnH / 2 - 4);
  }
  // Coût
  ctx.font = "bold 10px -apple-system, sans-serif";
  ctx.fillStyle = canAfford ? "#fbbf24" : "rgba(239,68,68,0.85)";
  ctx.fillText(`${IEM_COST} 💰`, btnX + btnW / 2, btnY + btnH / 2 + 10);

  // Barre de cooldown
  if (!ready) {
    const ratio = 1 - cd / IEM_COOLDOWN_SEC;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(btnX + 2, btnY + btnH - 4, btnW - 4, 2);
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(btnX + 2, btnY + btnH - 4, (btnW - 4) * ratio, 2);
  }
}

// Helper générique : bouton de sort en haut HUD. Évite la duplication entre
// Drop et Surge (Lightning/IEM gardent leurs versions dédiées par historique).
function drawSpellButton(ctx, opts) {
  const { id, x, y, w, h, label, cost, cd, maxCd, accentRgba, accentHex, canAfford, ready, extraSubLabel } = opts;
  const enabled = ready && canAfford;
  const rect = { x, y, w, h };
  game.ui[id] = rect;
  const isHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);

  ctx.save();
  if (enabled) {
    ctx.fillStyle = isHover ? accentRgba.replace("0.35", "0.55") : accentRgba;
    ctx.shadowColor = accentHex;
    ctx.shadowBlur = isHover ? 16 : 8;
  } else if (!ready) {
    ctx.fillStyle = "rgba(100,116,139,0.22)";
  } else {
    ctx.fillStyle = "rgba(239,68,68,0.18)";
  }
  roundedRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = enabled ? accentHex : (ready ? "rgba(239,68,68,0.55)" : "rgba(255,255,255,0.15)");
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = enabled ? "#fff" : COLORS.hudMuted;
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (!ready) {
    ctx.fillText(`${label.split(" ")[0]} ${Math.ceil(cd)}s`, x + w / 2, y + h / 2 - 4);
  } else {
    ctx.fillText(label, x + w / 2, y + h / 2 - 4);
  }
  ctx.font = "bold 10px -apple-system, sans-serif";
  ctx.fillStyle = canAfford ? "#fbbf24" : "rgba(239,68,68,0.85)";
  ctx.fillText(extraSubLabel || `${cost} 💰`, x + w / 2, y + h / 2 + 10);

  if (!ready) {
    const ratio = 1 - cd / maxCd;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
    ctx.fillStyle = accentHex;
    ctx.fillRect(x + 2, y + h - 4, (w - 4) * ratio, 2);
  }
}

// Bouton Drop Renforts — placé à droite du bouton IEM. Couleur ambre.
function drawDropButton(ctx) {
  const btnW = HUD_LAYOUT.SPELL_BTN_W, btnH = HUD_LAYOUT.BTN_H;
  const btnX = hudSpellX(2);
  drawSpellButton(ctx, {
    id: "dropBtn",
    x: btnX, y: HUD_LAYOUT.Y, w: btnW, h: btnH,
    label: "🪂 Drop",
    cost: DROP_COST,
    cd: dropCdFor(mySide()),
    maxCd: DROP_COOLDOWN_SEC,
    accentRgba: "rgba(251, 191, 36, 0.35)",
    accentHex: "#fbbf24",
    canAfford: game[mySide()].money >= DROP_COST,
    ready: dropCdFor(mySide()) <= 0,
  });
}

// Bouton Surge Économique — placé à droite du Drop. Couleur vert pastel.
function drawSurgeButton(ctx) {
  const btnW = HUD_LAYOUT.SPELL_BTN_W, btnH = HUD_LAYOUT.BTN_H;
  const btnX = hudSpellX(3);
  const me = mySide();
  const surgeActive = (game[me].surgeUntil || 0) > game.time;
  const subLabel = surgeActive
    ? `⚡ ${Math.ceil((game[me].surgeUntil || 0) - game.time)}s actif`
    : `${SURGE_COST} 💰`;
  drawSpellButton(ctx, {
    id: "surgeBtn",
    x: btnX, y: HUD_LAYOUT.Y, w: btnW, h: btnH,
    label: "📈 Surge",
    cost: SURGE_COST,
    cd: surgeCdFor(me),
    maxCd: SURGE_COOLDOWN_SEC,
    accentRgba: "rgba(34, 197, 94, 0.35)",
    accentHex: "#22c55e",
    canAfford: game[me].money >= SURGE_COST,
    ready: surgeCdFor(me) <= 0,
    extraSubLabel: subLabel,
  });
}

// Effet visuel : flash blanc plein écran qui s'estompe + texte "IEM" central.
function drawIemFx(ctx) {
  if (!game.iem) return;
  const t = game.iem.age / game.iem.ttl;
  // Flash : pic à 0.15 puis fade
  const alpha = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.15) / 0.85);
  ctx.save();
  ctx.fillStyle = `rgba(165, 243, 252, ${(alpha * 0.65).toFixed(3)})`;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);
  // Onde de choc circulaire au centre du lanceur (gauche ou droite)
  const cx = game.iem.side === "player" ? CONFIG.BASE_W / 2 : CONFIG.W - CONFIG.BASE_W / 2;
  const cy = CONFIG.H / 2;
  // Repère monde → écran
  const sx = cx - game.camera.x;
  const sy = cy;
  const radius = (t * 1.4) * Math.max(CONFIG.CANVAS_W, CONFIG.H);
  ctx.strokeStyle = `rgba(34, 211, 238, ${(alpha * 0.9).toFixed(3)})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.6).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(sx, sy, radius * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  // Texte central
  if (t < 0.6) {
    const ta = Math.max(0, 1 - t / 0.6);
    ctx.fillStyle = `rgba(255,255,255,${ta.toFixed(3)})`;
    ctx.font = `bold ${Math.round(56 + 24 * t)}px -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚡ IEM ⚡", CONFIG.CANVAS_W / 2, CONFIG.H / 2);
  }
  ctx.restore();
}

function drawLightningButton(ctx) {
  const btnW = HUD_LAYOUT.SPELL_BTN_W;
  const btnH = HUD_LAYOUT.BTN_H;
  const btnX = hudSpellX(0);
  const btnY = HUD_LAYOUT.Y;
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

// Détection device tactile : utilisé pour adapter les comportements
// (pas d'auto-scroll par bord d'écran, pan caméra par swipe à la place,
// pas de hover-only features). Évalué une fois au boot.
const IS_TOUCH = (typeof window !== "undefined")
  && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

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
      audio.startMenuMusic(); // autoplay bloqué jusqu'au 1er clic — démarre ici

      // Dropdown menu music (top-left) : clic chip = toggle, clic option = switch
      const mmr = game.ui.menuMusicRects || {};
      if (mmr.chip && pointInRect(sx, sy, mmr.chip)) {
        game.ui.menuMusicExpanded = !game.ui.menuMusicExpanded;
        audio.playSFX("click");
        return;
      }
      if (game.ui.menuMusicExpanded && Array.isArray(mmr.options)) {
        for (const opt of mmr.options) {
          if (pointInRect(sx, sy, opt)) {
            audio.setMenuTrack(opt.id);
            audio.playSFX("click");
            saveSettings();
            game.ui.menuMusicExpanded = false;  // collapse après sélection
            return;
          }
        }
        // Clic hors options → collapse
        game.ui.menuMusicExpanded = false;
      }

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
      // Tutoriel
      if (mr.tutorial && pointInRect(sx, sy, mr.tutorial)) {
        audio.playSFX("click");
        startTutorial();
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
        if (lr.choiceCreatePublic && pointInRect(sx, sy, lr.choiceCreatePublic)) {
          audio.playSFX("click");
          mpCreateRoom({ visibility: "public" });
          return;
        }
        if (lr.choiceCreatePrivate && pointInRect(sx, sy, lr.choiceCreatePrivate)) {
          audio.playSFX("click");
          mpCreateRoom({ visibility: "private" });
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
        if (lr.refresh && pointInRect(sx, sy, lr.refresh)) {
          audio.playSFX("click");
          refreshPublicLobbies();
          return;
        }
        if (Array.isArray(lr.publicItems)) {
          for (const item of lr.publicItems) {
            if (pointInRect(sx, sy, item.rect) && item.code) {
              audio.playSFX("click");
              mpJoinByCode(item.code);
              return;
            }
          }
        }
        if (Array.isArray(lr.spectateItems)) {
          for (const item of lr.spectateItems) {
            if (pointInRect(sx, sy, item.rect) && item.lobby) {
              audio.playSFX("click");
              spectateLobby(item.lobby);
              return;
            }
          }
        }
      } else if (page === "join") {
        if (lr.joinOk && pointInRect(sx, sy, lr.joinOk)) {
          audio.playSFX("click");
          game.ui.codeInputActive = false;
          mpJoinByCode(game.ui.codeInput);
          return;
        }
        if (lr.back && pointInRect(sx, sy, lr.back)) {
          audio.playSFX("click");
          game.ui.lobbyPage = "choice";
          game.ui.codeInputError = null;
          game.ui.codeInputActive = false;
          return;
        }
        if (lr.joinInput && pointInRect(sx, sy, lr.joinInput)) {
          // Tap sur le champ code → ouvre le clavier virtuel sur mobile
          game.ui.codeInputActive = true;
          return;
        }
        // Tap ailleurs → ferme le clavier virtuel
        game.ui.codeInputActive = false;
      } else if (page === "room") {
        if (lr.chatInput && pointInRect(sx, sy, lr.chatInput)) {
          game.ui.chatActive = true;
          return;
        }
        if (lr.chatSend && pointInRect(sx, sy, lr.chatSend)) {
          sendCurrentChat();
          return;
        }
        if (lr.ready && pointInRect(sx, sy, lr.ready)) {
          // On laisse l'utilisateur se mettre prêt même sans opp visible
          // localement : la détection peut être en retard (poll DB ou sub
          // pas encore reçue). Le serveur ne démarre la partie que si
          // les deux côtés sont ready ET qu'il y a bien un guest_id en DB.
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
        // Clic en dehors du chat → désactive l'édition du chat
        game.ui.chatActive = false;
      }
      return;
    }

    // Cas game over : Rejouer / Rematch / retour Menu
    if (game.gameOver) {
      // Tabs Stats / Graphiques
      if (game.ui.gameOverTabRects) {
        for (const [id, rect] of Object.entries(game.ui.gameOverTabRects)) {
          if (pointInRect(sx, sy, rect)) {
            game.ui.gameOverTab = id;
            audio.playSFX("click");
            return;
          }
        }
      }
      if (game.ui.replayBtn && pointInRect(sx, sy, game.ui.replayBtn)) {
        startGame(game.difficulty);
        return;
      }
      if (game.ui.rematchBtn && pointInRect(sx, sy, game.ui.rematchBtn)) {
        audio.playSFX("click");
        requestRematch();
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
      // Bouton Fusionner (apparaît si voisin compatible)
      if (sel.side === mineSide && !isTurretPanel && pr.merge && pointInRect(sx, sy, pr.merge.rect)) {
        if (isGuestMp) {
          window.RE_MP.sendInput({ type: "merge_factory", slotIndex: sel.slotIndex, partnerIdx: pr.merge.partnerIdx });
        } else {
          tryMergeFactories(mineSide, sel.slotIndex, pr.merge.partnerIdx);
        }
        audio.playSFX("upgrade");
        game.ui.upgradePanel = null;
        return;
      }
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
            const steps = u.bulk || 1;
            if (isGuestMp) {
              for (let i = 0; i < steps; i++) {
                if (isTurretPanel) window.RE_MP.sendInput({ type: "upgrade_turret", wallSlotIndex: sel.index, statId: u.statId });
                else window.RE_MP.sendInput({ type: "upgrade_factory", slotIndex: sel.slotIndex, statId: u.statId });
              }
              audio.playSFX("upgrade");
            } else {
              for (let i = 0; i < steps; i++) {
                const ok = isTurretPanel
                  ? tryUpgradeTurret(mineSide, sel.index, u.statId)
                  : tryUpgradeFactory(mineSide, sel.slotIndex, u.statId);
                if (!ok) break;
              }
            }
            return;
          }
        }
      }
      if (!isTurretPanel && sel.side === mineSide && pr.mode) {
        const applyMode = (newMode) => {
          if (isGuestMp) {
            window.RE_MP.sendInput({ type: "set_factory_mode", slotIndex: sel.slotIndex, mode: newMode });
          } else {
            const slot = game[mineSide].slots[sel.slotIndex];
            if (slot?.factory) slot.factory.mode = newMode;
          }
        };
        if (pr.mode.attack && pointInRect(sx, sy, pr.mode.attack)) {
          applyMode("attack");
          audio.playSFX("click");
          return;
        }
        if (pr.mode.defense && pointInRect(sx, sy, pr.mode.defense)) {
          applyMode("defense");
          audio.playSFX("click");
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

    // Tutoriel : intercepter clic sur Suivant / Passer
    if (game.tutorial?.active && game.ui.tutorialRects) {
      const tr = game.ui.tutorialRects;
      if (tr.next && pointInRect(sx, sy, tr.next)) {
        audio.playSFX("click");
        if (game.tutorial.step >= TUTORIAL_STEPS.length - 1) {
          game.tutorial.active = false;
        } else {
          game.tutorial.step++;
        }
        return;
      }
      if (tr.skip && pointInRect(sx, sy, tr.skip)) {
        audio.playSFX("click");
        game.tutorial.active = false;
        return;
      }
    }

    // 1) Bouton Éclair (coords ÉCRAN) ? → toggle du mode visée
    if (game.ui.lightningBtn && pointInRect(sx, sy, game.ui.lightningBtn)) {
      toggleLightningAim();
      audio.playSFX("click");
      return;
    }

    // 1bis bis) Bouton IEM — tir instantané, pas de visée
    if (game.ui.iemBtn && pointInRect(sx, sy, game.ui.iemBtn)) {
      audio.playSFX("click");
      if (game.mode === "mp" && game.mp?.role === "guest") {
        if (game[mySide()].money < IEM_COST) return;
        if (iemCdFor(mySide()) > 0) return;
        window.RE_MP.sendInput({ type: "iem_fire" });
      } else {
        fireIem(mySide());
      }
      return;
    }

    // 1bis bis bis) Bouton Skip vague (mode Vagues, pendant la pause inter-vague)
    if (game.ui.waveSkipBtn && pointInRect(sx, sy, game.ui.waveSkipBtn)) {
      audio.playSFX("click");
      skipWaveBreather();
      return;
    }

    // 1bis ter) Bouton Drop Renforts — instant, pas de visée
    if (game.ui.dropBtn && pointInRect(sx, sy, game.ui.dropBtn)) {
      audio.playSFX("click");
      const me = mySide();
      if (game[me].money < DROP_COST || dropCdFor(me) > 0) return;
      if (game.mode === "mp" && game.mp?.role === "guest") {
        window.RE_MP.sendInput({ type: "drop_fire" });
      } else {
        fireDrop(me);
      }
      return;
    }

    // 1bis quater) Bouton Surge — buff économique instant
    if (game.ui.surgeBtn && pointInRect(sx, sy, game.ui.surgeBtn)) {
      audio.playSFX("click");
      const me = mySide();
      if (game[me].money < SURGE_COST || surgeCdFor(me) > 0) return;
      if (game.mode === "mp" && game.mp?.role === "guest") {
        window.RE_MP.sendInput({ type: "surge_fire" });
      } else {
        fireSurge(me);
      }
      return;
    }

    // 1ter) Bouton Abandonner (MP host/guest) ou Quitter (spectateur)
    if (game.ui.surrenderBtn && pointInRect(sx, sy, game.ui.surrenderBtn)) {
      audio.playSFX("click");
      trySurrender();
      return;
    }
    if (game.ui.spectatorLeaveBtn && pointInRect(sx, sy, game.ui.spectatorLeaveBtn)) {
      audio.playSFX("click");
      goToMenu();
      return;
    }
    // Menu radial d'emotes ouvert : clic sur un emote → envoi, clic ailleurs → ferme.
    if (game.ui.emoteMenuOpen) {
      const rects = game.ui.emoteRects || [];
      for (const r of rects) {
        if (Math.hypot(sx - r.cx, sy - r.cy) <= r.r) {
          sendEmote(r.emote.id);
          return;
        }
      }
      game.ui.emoteMenuOpen = false;
      return;
    }
    // Le spectateur peut ouvrir/fermer panneaux de lecture, settings, chat,
    // mais ne tire pas, ne place pas, ne sélectionne pas de build.
    const isSpectatorClick = game.mode === "mp" && game.mp?.role === "spectator";

    if (isSpectatorClick) {
      // En spectateur on bloque toutes les actions de jeu sauf les panneaux
      // d'info — on laisse tomber le reste du handler ici.
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
      // Click sur un slot couvert par une fusion → ouvre le panneau du primary
      if (slot.coveredBy != null) {
        const primaryIdx = slot.coveredBy;
        if (game[me].slots[primaryIdx]?.factory) {
          game.ui.upgradePanel = { side: me, type: "factory", slotIndex: primaryIdx };
          game.ui.selectedBuildType = null;
        }
        return;
      }
      if (game.ui.selectedBuildType && FACTORY_TYPES[game.ui.selectedBuildType]
          && !slot.factory && !slot.isPath) {
        if (isGuest) {
          window.RE_MP.sendInput({ type: "build_factory", slotIndex: mySlotIdx, typeId: game.ui.selectedBuildType });
          audio.playSFX("place");
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
      if (slot.coveredBy != null) {
        const primaryIdx = slot.coveredBy;
        if (game[opp].slots[primaryIdx]?.factory) {
          game.ui.upgradePanel = { side: opp, type: "factory", slotIndex: primaryIdx };
        }
        return;
      }
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
      // Si on est en train de taper dans le chat, capture tout le clavier
      if (page === "room" && game.ui.chatActive) {
        if (evt.key === "Escape") { game.ui.chatActive = false; return; }
        if (evt.key === "Enter") { sendCurrentChat(); return; }
        if (evt.key === "Backspace") {
          game.ui.chatInput = (game.ui.chatInput || "").slice(0, -1);
          return;
        }
        if (evt.key && evt.key.length === 1) {
          const cur = game.ui.chatInput || "";
          if (cur.length < 240) game.ui.chatInput = cur + evt.key;
          return;
        }
        return;
      }
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
        if (evt.key === "t" || evt.key === "T") {
          game.ui.chatActive = true;
          evt.preventDefault();
          return;
        }
        if (evt.key === "Enter" || evt.key === " ") {
          if (game.mp?.opponent?.username) mpToggleReady();
        }
      } else if (page === "choice") {
        if (evt.key === "1") mpCreateRoom({ visibility: "public" });
        if (evt.key === "2") { game.ui.lobbyPage = "join"; game.ui.codeInput = ""; game.ui.codeInputError = null; }
      }
      return;
    }
    if (game.gameOver) {
      if ((evt.key === "Enter" || evt.key === " ") && game.mode !== "mp") startGame(game.difficulty);
      if (evt.key === "Escape" || evt.key === "m") goToMenu();
      return;
    }
    // Menu radial emotes (MP) : V ouvre, Échap ou clic ferme, 1-6 envoie direct.
    if (game.mode === "mp" && game.ui.emoteMenuOpen) {
      if (evt.key === "Escape") { game.ui.emoteMenuOpen = false; return; }
      const n = parseInt(evt.key, 10);
      if (n >= 1 && n <= EMOTES.length) {
        sendEmote(EMOTES[n - 1].id);
        return;
      }
      return;
    }
    if (game.mode === "mp" && !game.gameOver && (evt.key === "v" || evt.key === "V")) {
      game.ui.emoteMenuOpen = true;
      evt.preventDefault();
      return;
    }

    // Chat in-game (MP) : T pour ouvrir, capture clavier quand actif.
    if (game.mode === "mp" && game.ui.chatActive) {
      if (evt.key === "Escape") { game.ui.chatActive = false; game.ui.chatInput = ""; return; }
      if (evt.key === "Enter")  { sendCurrentChat(); return; }
      if (evt.key === "Backspace") {
        game.ui.chatInput = (game.ui.chatInput || "").slice(0, -1);
        return;
      }
      if (evt.key && evt.key.length === 1) {
        const cur = game.ui.chatInput || "";
        if (cur.length < 240) game.ui.chatInput = cur + evt.key;
        return;
      }
      return;
    }
    if (game.mode === "mp" && (evt.key === "t" || evt.key === "T")) {
      game.ui.chatActive = true;
      evt.preventDefault();
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
    const keyMap = { "1": "light", "2": "heavy", "3": "swarmer", "4": "sniper", "5": "air", "6": "medic", "7": "turret" };
    if (keyMap[evt.key]) {
      const t = keyMap[evt.key];
      game.ui.selectedBuildType = game.ui.selectedBuildType === t ? null : t;
    }
    // Éclair → toggle du mode visée (puis clic sur la map pour tirer)
    if (evt.key === "l" || evt.key === "L") {
      toggleLightningAim();
    }
    // IEM → tir instantané (coûte de l'argent)
    if (evt.key === "j" || evt.key === "J") {
      if (game.mode === "mp" && game.mp?.role === "guest") {
        if (game[mySide()].money >= IEM_COST && iemCdFor(mySide()) <= 0) {
          window.RE_MP.sendInput({ type: "iem_fire" });
        }
      } else {
        fireIem(mySide());
      }
    }
    // Echap → annule le mode visée
    if (evt.key === "Escape" && game.lightningAiming) {
      game.lightningAiming = false;
    }
    // Echap annule aussi un abandon armé (1er clic Abandonner)
    if (evt.key === "Escape" && game.ui.surrenderArmedAt) {
      game.ui.surrenderArmedAt = 0;
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

  // ── Touch handlers (mobile / tablette) ─────────────────────────────────
  // Mappe touch → pipeline existant : tap court = click ; swipe long sur la
  // zone monde = pan caméra. On ne tente pas de hover-only feature.
  let touchStart = null;
  let touchPanned = false;
  const TOUCH_PAN_THRESHOLD = 12; // pixels avant de basculer en mode pan

  function canPanFrom(sx, sy) {
    // On ne pan pas si on touch le HUD, un panel, un overlay actif.
    if (sy < CONFIG.HUD_H) return false;
    if (game.ui.upgradePanel) return false;
    if (game.ui.settingsOpen) return false;
    if (game.ui.emoteMenuOpen) return false;
    if (game.gameOver) return false;
    if (game.tutorial?.active) return false;
    if (game.screen !== "playing") return false;
    return true;
  }

  canvas.addEventListener("touchstart", (evt) => {
    if (evt.touches.length !== 1) return;
    evt.preventDefault();
    const t = evt.touches[0];
    const pos = canvasCoordsFromEvent(canvas, t);
    touchStart = {
      x: pos.x, y: pos.y,
      camX: game.camera.x,
      time: performance.now(),
      panAllowed: canPanFrom(pos.x, pos.y),
    };
    touchPanned = false;
    game.ui.mouseScreen.x = pos.x;
    game.ui.mouseScreen.y = pos.y;
    game.ui.mouseInside = true;
    // Détection drag slider (settings audio ouvert)
    if (game.ui.settingsOpen && game.ui.settingsRects) {
      const sr = game.ui.settingsRects;
      if (pointInRect(pos.x, pos.y, sr.musicSlider)) {
        game.ui.draggingSlider = "music";
        const v = Math.max(0, Math.min(1, (pos.x - sr.musicSlider.x) / sr.musicSlider.w));
        audio.setMusicVolume(v);
      } else if (pointInRect(pos.x, pos.y, sr.sfxSlider)) {
        game.ui.draggingSlider = "sfx";
        const v = Math.max(0, Math.min(1, (pos.x - sr.sfxSlider.x) / sr.sfxSlider.w));
        audio.setSfxVolume(v);
      }
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", (evt) => {
    if (!touchStart || evt.touches.length !== 1) return;
    evt.preventDefault();
    const t = evt.touches[0];
    const pos = canvasCoordsFromEvent(canvas, t);
    // Drag slider en cours : prio absolue
    if (game.ui.draggingSlider && game.ui.settingsRects) {
      const sr = game.ui.settingsRects;
      const slider = game.ui.draggingSlider === "music" ? sr.musicSlider : sr.sfxSlider;
      const v = Math.max(0, Math.min(1, (pos.x - slider.x) / slider.w));
      if (game.ui.draggingSlider === "music") audio.setMusicVolume(v);
      else audio.setSfxVolume(v);
      game.ui.mouseScreen.x = pos.x;
      game.ui.mouseScreen.y = pos.y;
      return;
    }
    const dx = pos.x - touchStart.x;
    const dy = pos.y - touchStart.y;
    if (Math.hypot(dx, dy) > TOUCH_PAN_THRESHOLD && touchStart.panAllowed) {
      touchPanned = true;
    }
    if (touchPanned) {
      const maxScroll = Math.max(0, CONFIG.W - CONFIG.CANVAS_W);
      let nx = touchStart.camX - dx;
      if (nx < 0) nx = 0;
      if (nx > maxScroll) nx = maxScroll;
      game.camera.x = nx;
      game.ui.hoverSlot = null;
      game.ui.hoverUnit = null;
    } else {
      game.ui.mouseScreen.x = pos.x;
      game.ui.mouseScreen.y = pos.y;
    }
  }, { passive: false });

  canvas.addEventListener("touchend", (evt) => {
    if (!touchStart) return;
    evt.preventDefault();
    // Si on était en train de drag un slider, on save et on shortcut
    if (game.ui.draggingSlider) {
      saveSettings();
      game.ui.draggingSlider = null;
      touchStart = null;
      touchPanned = false;
      return;
    }
    if (!touchPanned) {
      const rect = canvas.getBoundingClientRect();
      const clientX = touchStart.x * (rect.width / canvas.width) + rect.left;
      const clientY = touchStart.y * (rect.height / canvas.height) + rect.top;
      canvas.dispatchEvent(new MouseEvent("click", { clientX, clientY, bubbles: false }));
    }
    touchStart = null;
    touchPanned = false;
  }, { passive: false });

  canvas.addEventListener("touchcancel", () => {
    if (game.ui.draggingSlider) {
      saveSettings();
      game.ui.draggingSlider = null;
    }
    touchStart = null;
    touchPanned = false;
  }, { passive: false });
}

function resetGame() {
  game.time = 0;
  game.lastTimestamp = 0;
  game.incomeAccum = 0;
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
  // Ambient anims : reset active events + premier spawn dans 8-15s
  // (court pour que le joueur voie l'effet rapidement après le start)
  game.ambientAnims = {
    active: [],
    nextSpawnAt: 8 + Math.random() * 7,
  };
  game.explosions = [];
  game.lightning = null;
  game.lightningCooldown = 0;
  game.iem = null;
  game.iemCooldown = 0;
  game.dropCooldown = 0;
  game.surgeCooldown = 0;
  game.pickups = [];
  game.pickupSpawnTimer = 8; // 1er pickup dispo après 8s pour ne pas spawner trop tôt
  game.pickupIdSeq = 0;
  if (game.mp) {
    game.mp.enemyLightningCooldown = 0;
    game.mp.enemyIemCooldown = 0;
    game.mp.enemyDropCooldown = 0;
    game.mp.enemySurgeCooldown = 0;
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

// 6 étapes simples pour la 1ère partie d'un nouveau joueur. Tu cliques sur
// "Compris !" pour passer à la suivante (pas de détection d'action automatique
// pour rester simple). Le panneau reste affiché en haut de l'écran.
// Chaque étape peut avoir un awaitAction : si le joueur effectue l'action
// correspondante avant de cliquer "Compris", on passe automatiquement à la
// suivante. targetBtn (optionnel) référence l'id d'un build button pour
// dessiner un pulse autour pendant l'étape.
const TUTORIAL_STEPS = [
  {
    title: "Bienvenue sur Émergence !",
    body: "Tu pilotes une équipe de robots (à gauche). Ton but : détruire la base ennemie (à droite). Tes unités sortent toutes seules de tes usines.",
  },
  {
    title: "Pose ta première usine",
    body: "En haut, choisis une 🏭 Légère (touche 1), puis clique sur un emplacement vide à gauche pour la poser. Les usines coûtent de l'argent, affiché en haut à gauche.",
    awaitAction: "build_factory",
    targetBtn: "build-light",
  },
  {
    title: "Améliore tes usines",
    body: "Clique sur une usine que tu as posée pour ouvrir son panneau d'upgrade : dégâts, vitesse, PV, etc. Plus tu améliores, plus tes unités sont fortes.",
    awaitAction: "upgrade",
  },
  {
    title: "Défends-toi avec des tourelles",
    body: "Sélectionne 🗼 Turret (touche 6) et clique sur ton rempart pour poser une tourelle qui tire automatiquement sur les ennemis (y compris les drones !).",
    awaitAction: "build_turret",
    targetBtn: "build-turret",
  },
  {
    title: "Lance l'éclair quand ça chauffe ⚡",
    body: "Le bouton ⚡ Éclair (touche L) te permet de tirer une frappe verticale qui tue toutes les unités sur une bande. Cooldown de 30s.",
    awaitAction: "lightning",
    targetBtn: "lightning",
  },
  {
    title: "💥 IEM : balayage total",
    body: "Le bouton 💥 IEM coûte 400 💰 et tue TOUTES les unités mobiles des deux camps. Réservé aux moments où tu te fais déborder.",
    targetBtn: "iem",
  },
  {
    title: "Bonne chance !",
    body: "Pour gagner, fais tomber la base ennemie à 0 PV. Pour gagner de la monnaie et débloquer des skins/missions, connecte-toi via le menu. Ferme ce tutoriel et joue !",
  },
];

// Appelée par tryPlaceFactory / tryUpgradeFactory / tryPlaceTurret /
// fireLightningAt quand l'action réussit côté joueur. Si l'étape courante
// attend cette action, on l'avance.
function tutorialOnAction(actionType) {
  if (!game.tutorial?.active) return;
  const step = TUTORIAL_STEPS[game.tutorial.step];
  if (!step || !step.awaitAction) return;
  if (step.awaitAction === actionType) {
    if (game.tutorial.step < TUTORIAL_STEPS.length - 1) {
      game.tutorial.step++;
    } else {
      game.tutorial.active = false;
    }
  }
}

// Dessine un pulse cyan/vert autour d'un bouton du HUD pour guider le clic.
// btnId : "build-light" / "build-turret" / "lightning" / "iem".
function drawTutorialPulse(ctx, btnId) {
  let rect = null;
  if (btnId === "lightning") rect = game.ui.lightningBtn;
  else if (btnId === "iem") rect = game.ui.iemBtn;
  else {
    const b = (game.ui.buttons || []).find((bb) => bb.id === btnId);
    if (b) rect = b;
  }
  if (!rect) return;
  const t = (performance.now() % 1100) / 1100;
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  ctx.save();
  ctx.strokeStyle = `rgba(34, 197, 94, ${(0.7 + 0.3 * pulse).toFixed(3)})`;
  ctx.lineWidth = 3 + 2 * pulse;
  ctx.shadowColor = "#22c55e";
  ctx.shadowBlur = 12 + 8 * pulse;
  const grow = 4 + 4 * pulse;
  roundedRect(ctx, rect.x - grow, rect.y - grow, rect.w + grow * 2, rect.h + grow * 2, 8);
  ctx.stroke();
  ctx.restore();
}

function startTutorial() {
  if (game.mp && window.RE_MP) { try { window.RE_MP.leave(); } catch {} }
  game.mp = null;
  game.mode = "solo";
  game.tutorial = { step: 0, active: true };
  // Difficulté facile + bonus d'argent côté joueur
  game.difficulty = "easy";
  game.preset = { ...DIFFICULTY_PRESETS.easy };
  game.preset.playerStartMoney = Math.max(game.preset.playerStartMoney, 300);
  applyTeamSkin();
  resetGame();
  game.screen = "playing";
  saveSettings();
  audio.startMusic();
}

// Tutoriel — deux modes :
//   - Étapes purement informatives (welcome, end) : modal centré avec voile
//     sombre pour bloquer l'attention.
//   - Étapes avec awaitAction : bannière haut-centre plus discrète + pulse
//     autour du bouton cible, pour que le joueur PUISSE effectuer l'action.
function drawTutorialOverlay(ctx) {
  if (!game.tutorial?.active) { game.ui.tutorialRects = null; return; }
  const step = TUTORIAL_STEPS[game.tutorial.step];
  if (!step) { game.tutorial.active = false; return; }

  const interactive = !!step.awaitAction;

  // Pulse autour du bouton cible (si défini)
  if (step.targetBtn) drawTutorialPulse(ctx, step.targetBtn);

  // Voile : opaque pour les étapes "lecture", très léger pour les étapes
  // interactives où l'utilisateur doit pouvoir voir et cliquer.
  ctx.save();
  ctx.fillStyle = interactive ? "rgba(0, 0, 0, 0.18)" : "rgba(0, 0, 0, 0.62)";
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);
  ctx.restore();

  const W = interactive ? 600 : 540;
  const H = interactive ? 170 : 280;
  const x = (CONFIG.CANVAS_W - W) / 2;
  // En interactif on remonte le panneau pour libérer le bas (zone de jeu).
  const y = interactive
    ? CONFIG.H - H - 24
    : (CONFIG.H - H) / 2;

  ctx.save();
  ctx.fillStyle = "rgba(15,23,42,0.94)";
  roundedRect(ctx, x, y, W, H, 12);
  ctx.fill();
  ctx.strokeStyle = COLORS.hpGood;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Compteur d'étapes en haut-gauche
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`TUTORIEL  ·  Étape ${game.tutorial.step + 1} / ${TUTORIAL_STEPS.length}`, x + 16, y + 12);

  // Titre
  ctx.fillStyle = COLORS.hpGood;
  ctx.font = "bold 18px -apple-system, sans-serif";
  ctx.fillText(step.title, x + 16, y + 32);

  // Corps (wrapping) — pleine largeur, plus de réserve pour les boutons
  // puisqu'ils sont sous le texte, pas à côté.
  ctx.fillStyle = "#fff";
  ctx.font = "13px -apple-system, sans-serif";
  const lines = wrapTextToLines(ctx, step.body, W - 32);
  let cy = y + 60;
  for (const ln of lines.slice(0, 5)) {
    ctx.fillText(ln, x + 16, cy);
    cy += 16;
  }

  // Boutons : Suivant + Skip (en bas de la bannière)
  const isLast = game.tutorial.step >= TUTORIAL_STEPS.length - 1;
  const btnW = 130, btnH = 36;
  const nextRect = { x: x + W - btnW - 16, y: y + H - btnH - 14, w: btnW, h: btnH };
  const skipRect = { x: x + W - btnW * 2 - 24, y: y + H - btnH - 14, w: btnW, h: btnH };

  const nextHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, nextRect);
  ctx.fillStyle = nextHover ? COLORS.player : COLORS.playerDark;
  roundedRect(ctx, nextRect.x, nextRect.y, nextRect.w, nextRect.h, 8);
  ctx.fill();
  ctx.strokeStyle = COLORS.player;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(isLast ? "Fermer le tutoriel" : "Compris ! ▶", nextRect.x + nextRect.w / 2, nextRect.y + nextRect.h / 2);

  if (!isLast) {
    const skipHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, skipRect);
    ctx.fillStyle = skipHover ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)";
    roundedRect(ctx, skipRect.x, skipRect.y, skipRect.w, skipRect.h, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillText("Passer", skipRect.x + skipRect.w / 2, skipRect.y + skipRect.h / 2);
  }

  ctx.restore();
  game.ui.tutorialRects = { next: nextRect, skip: isLast ? null : skipRect };
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
  // Mode Vagues : initialise un état dédié et désactive l'IA d'usine
  if (game.preset?.isWave) {
    game.wave = {
      active: true,
      current: 1,
      defeated: 0,
      queue: [],
      totalThisWave: 0,
      spawnTimer: 0,
      spawnInterval: 1.0,
      betweenWaves: 4,    // 4s avant la 1ère vague
      inWave: false,
      lastBonus: 0,
    };
  } else {
    game.wave = null;
  }
  applyTeamSkin(); // applique le skin courant aux COLORS.player avant resetGame
  resetGame();
  game.screen = "playing";
  saveSettings();
  // On bascule de menu music → BGM in-game (jamais les 2 en même temps)
  audio.stopMenuMusic();
  audio.startMusic();
  // Ambient continu désactivé : le son ambient est désormais joué ponctuellement
  // lors d'événements (ex. tumbleweed désert). Voir spawnTumbleweed.
}

function goToMenu() {
  game.screen = "menu";
  game.gameOver = null;
  audio.stopMusic();
  audio.stopAmbient();
  audio.startMenuMusic();
  // Si on revient au menu depuis un lobby/partie multi, on quitte proprement le canal
  if (game.mp && window.RE_MP) {
    try { window.RE_MP.leave(); } catch {}
    game.mp = null;
  }
  game.mode = "solo";
  game.tutorial = null;
  game.ui.chatActive = false;
  game.ui.chatInput = "";
  game.ui.chatMessages = [];
  game.ui.emoteMenuOpen = false;
  game.ui.emoteEvents = [];
  game.ui.surrenderArmedAt = 0;
  // Reset des couleurs MP (le skin du peer pouvait avoir teinté enemy/player)
  COLORS.enemy = DEFAULT_ENEMY_COLOR;
  COLORS.enemyDark = DEFAULT_ENEMY_DARK;
  applyTeamSkin();
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
  game.ui.publicLobbies = [];
  game.ui.publicLobbiesLastFetch = 0;
  game.ui.publicLobbiesLoading = false;
  game.ui.chatInput = "";
  game.ui.chatActive = false;
  game.ui.chatMessages = [];
  game.ui.lobbyVisibility = "public";

  // Sub aux events Realtime (idempotent : on le fait 1 seule fois par session de page)
  if (!game.mp.subscribed) {
    window.RE_MP.onInput(handleMpInput);
    window.RE_MP.onSnapshot(applyMpSnapshot);
    window.RE_MP.onGameOver(handleMpGameOver);
    window.RE_MP.onOpponentLeave(handleMpOpponentLeave);
    window.RE_MP.onLobbyUpdate(handleMpLobbyUpdate);
    window.RE_MP.onStart(handleMpStart);
    window.RE_MP.onChat(handleMpChat);
    window.RE_MP.onEmote(handleMpEmote);
    window.RE_MP.onRematch(handleMpRematch);
    window.RE_MP.onPeerInfo(({ skin, username, equippedSkins, from }) => {
      if (skin) applyPeerSkin(skin);
      // Stocke les skins équipés du peer pour que unitSpriteNameFor puisse
      // appliquer les bons sprites à ses unités côté oppSide().
      if (game.mp && equippedSkins) {
        game.mp.peerEquippedSkins = equippedSkins;
      }
      if (game.mp && username) {
        if (from === "host") game.mp.hostUsername = username;
        if (from === "guest") game.mp.guestUsername = username;
        if (!game.mp.opponent || game.mp.opponent.username !== username) {
          game.mp.opponent = { id: game.mp.opponent?.id || null, username };
        }
      }
    });
    game.mp.subscribed = true;
  }
  // Démarre la première récupération de la liste des salons publics.
  refreshPublicLobbies();
}

async function spectateLobby(lobbyMeta) {
  if (!window.RE_MP || !lobbyMeta?.lobby_id) return;
  flashLobbyMessage("Connexion au flux…");
  const res = await window.RE_MP.joinAsSpectator(lobbyMeta.lobby_id, { meta: lobbyMeta });
  if (res?.error) {
    flashLobbyMessage(`Erreur : ${res.error}`, "error");
    return;
  }
  game.mp.role = "spectator";
  game.mp.lobbyId = res.lobbyId;
  game.mp.opponent = null;
  game.mp.status = "playing";
  game.mp.seed = res.seed;
  game.biome = res.biome || game.biome;
  game.difficulty = res.difficulty || game.difficulty;
  if (DIFFICULTY_PRESETS[game.difficulty]) game.preset = DIFFICULTY_PRESETS[game.difficulty];
  game.mp.hostUsername  = res.host_username;
  game.mp.guestUsername = res.guest_username;
  applyTeamSkin();
  resetGame();
  game.screen = "playing";
  audio.stopMenuMusic();
  audio.startMusic();
}

async function refreshPublicLobbies() {
  if (!window.RE_MP) return;
  if (game.ui.publicLobbiesLoading) return;
  game.ui.publicLobbiesLoading = true;
  try {
    const res = await window.RE_MP.listActiveLobbies();
    if (res && Array.isArray(res.lobbies)) {
      game.ui.publicLobbies = res.lobbies;
      game.ui.publicLobbiesLastFetch = performance.now();
    }
  } catch {}
  game.ui.publicLobbiesLoading = false;
}

// 6 emotes disponibles via le menu radial (touche V en MP)
const EMOTES = [
  { id: "gg",      icon: "👏", label: "GG" },
  { id: "bravo",   icon: "🤝", label: "Bien joué" },
  { id: "attack",  icon: "⚔️", label: "Attaque !" },
  { id: "defend",  icon: "🛡️", label: "Défense !" },
  { id: "oops",    icon: "😅", label: "Oups…" },
  { id: "hello",   icon: "👋", label: "Salut" },
];

function handleMpEmote(payload) {
  if (!payload) return;
  if (!game.ui.emoteEvents) game.ui.emoteEvents = [];
  game.ui.emoteEvents.push({
    id: payload.emote,
    username: payload.username || "?",
    from: payload.from || "?",
    self: !!payload.self,
    ts: performance.now(),
  });
  if (game.ui.emoteEvents.length > 8) game.ui.emoteEvents.shift();
}

// ── Rematch ───────────────────────────────────────────────────────────────
// Le rematch utilise le canal courant pour s'accorder, puis l'host appelle
// createLobby et broadcast le nouveau code au guest. Chacun rejoint le
// nouveau lobby + se marque ready automatiquement.
function ensureRematchState() {
  if (!game.mp) return null;
  if (!game.mp.rematch) {
    game.mp.rematch = { myRequested: false, peerRequested: false, newLobbyCode: null, pending: false };
  }
  return game.mp.rematch;
}

async function requestRematch() {
  if (!window.RE_MP || game.mode !== "mp" || !game.mp) return;
  const r = ensureRematchState();
  if (r.pending) return;
  r.myRequested = true;
  window.RE_MP.sendRematch("request");
  // Si le peer avait déjà demandé, on file directement à l'étape suivante
  if (r.peerRequested) await proceedRematch();
}

async function handleMpRematch(payload) {
  if (!payload || !game.mp) return;
  const r = ensureRematchState();
  if (payload.from === game.mp.role) return; // ignore mes propres echoes (au cas où)
  if (payload.action === "request") {
    r.peerRequested = true;
    if (r.myRequested) await proceedRematch();
  } else if (payload.action === "cancel") {
    r.peerRequested = false;
  } else if (payload.action === "start") {
    // Le host nous communique le code du nouveau lobby — on le rejoint
    r.pending = true;
    await rejoinAsGuest(payload.code);
  }
}

async function proceedRematch() {
  const r = ensureRematchState();
  if (r.pending) return;
  r.pending = true;
  if (game.mp.role === "host") {
    // Crée un nouveau lobby et envoie le code à l'adversaire
    const res = await window.RE_MP.createLobby({
      biome: game.biome,
      difficulty: game.difficulty,
      visibility: game.mp.visibility === "private" ? "private" : "public",
    });
    if (res?.error) {
      flashLobbyMessage("Erreur rematch : " + res.error, "error");
      r.pending = false;
      r.myRequested = false;
      return;
    }
    // Sur le NOUVEAU lobby, je suis host. Envoie le code via l'ANCIEN
    // canal (qui est encore vivant) avant de remplacer.
    if (window.RE_MP.state.channel) {
      // setupChannel() de createLobby a déjà remplacé state.channel par le nouveau.
      // L'ancien est fermé — on ne peut plus broadcast dessus. À la place, on
      // s'appuie sur le fait qu'on a envoyé "start" AVANT createLobby ? Non,
      // on n'avait pas le code. Solution simple : le guest a aussi écouté
      // postgres_changes / poll DB pour un nouveau lobby créé par son host
      // mais c'est lourd. Plus simple : on rouvre le canal ancien
      // temporairement via un broadcast sur le NOUVEAU canal (le guest n'y
      // est pas encore) → impossible.
    }
    // Approche retenue : on broadcast l'event "start" sur le NOUVEAU lobby
    // ne marche pas (guest pas connecté). On utilise un poll DB côté guest :
    // après avoir cliqué rematch, le guest interroge les lobbies actifs du
    // host. Voir guestWaitForRematch ci-dessous.
    // Pour le host : on transitionne directement vers le room screen.
    game.mp.lobbyId = window.RE_MP.state.lobbyId;
    game.mp.code = window.RE_MP.state.code;
    game.mp.status = "waiting";
    game.mp.hostReady = false;
    game.mp.guestReady = false;
    game.mp.opponent = null; // sera repeuplé quand le guest rejoint
    game.tutorial = null;
    game.screen = "lobby";
    game.ui.lobbyPage = "room";
    game.ui.lobbyMessage = "En attente du rematch de l'adversaire…";
    // Auto-ready côté host (on a déjà accepté en cliquant Rematch)
    setTimeout(() => { if (game.mp?.lobbyId) window.RE_MP.setReady(true); }, 300);
  } else {
    // Guest : poll le re_list_active_lobbies pour trouver le nouveau lobby
    // de l'host (avec son host_id), puis joinByCode dessus
    rejoinLookupHostLobby();
  }
}

async function rejoinLookupHostLobby() {
  const hostId = game.mp?.opponent?.id;
  const tries = 30; // ~30 * 1s = 30s timeout
  for (let i = 0; i < tries; i++) {
    if (!game.mp?.rematch?.pending) return;
    try {
      const res = await window.RE_MP.listActiveLobbies();
      const fresh = (res?.lobbies || []).find((l) =>
        l.host_id === hostId && l.status === "waiting" && (!game.mp?.lobbyId || l.lobby_id !== game.mp.lobbyId)
      );
      if (fresh) {
        await rejoinAsGuest(fresh.code);
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  flashLobbyMessage("Le rematch a expiré — retour au menu.", "error");
  setTimeout(() => goToMenu(), 2000);
}

async function rejoinAsGuest(code) {
  if (!code) return;
  const res = await window.RE_MP.joinByCode(code);
  if (res?.error) {
    flashLobbyMessage("Rematch impossible : " + res.error, "error");
    return;
  }
  game.mp.role = "guest";
  game.mp.lobbyId = res.lobbyId;
  game.mp.code = res.code;
  game.mp.status = res.status || "waiting";
  game.mp.hostReady = false;
  game.mp.guestReady = false;
  game.mp.opponent = { id: null, username: res.host_username };
  game.tutorial = null;
  game.screen = "lobby";
  game.ui.lobbyPage = "room";
  game.ui.lobbyMessage = "";
  setTimeout(() => { if (game.mp?.lobbyId) window.RE_MP.setReady(true); }, 300);
}

function handleMpChat(payload) {
  if (!payload) return;
  if (!game.ui.chatMessages) game.ui.chatMessages = [];
  game.ui.chatMessages.push({
    text: payload.text,
    username: payload.username,
    from: payload.from,
    ts: payload.ts || Date.now(),
    self: !!payload.self,
    receivedAt: performance.now(),
  });
  if (game.ui.chatMessages.length > 60) game.ui.chatMessages.shift();
}

async function mpCreateRoom(opts = {}) {
  flashLobbyMessage("Création du salon…");
  const visibility = opts.visibility || game.ui.lobbyVisibility || "public";
  const res = await window.RE_MP.createLobby({
    biome: game.biome,
    difficulty: game.difficulty,
    visibility,
  });
  if (res?.error) {
    flashLobbyMessage(`Erreur : ${res.error}`, "error");
    return;
  }
  game.mp.role = "host";
  game.mp.lobbyId = res.lobbyId;
  game.mp.code = res.code;
  game.mp.visibility = res.visibility || visibility;
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
  audio.stopMenuMusic();
  audio.startMusic();
  // Ambient continu désactivé (cf. startGame solo)
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
  // Réutilise le fond glassmorphique du menu
  drawGlassBackground(ctx);
}

function drawLobbyButton(ctx, rect, label, sub, color, colorDark) {
  const hover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
  drawGlassAccent(ctx, rect.x, rect.y, rect.w, rect.h, color, { radius: 16 });
  if (hover) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = hexToRgba(color, 0.9);
    ctx.lineWidth = 1.5;
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
    ctx.stroke();
    ctx.restore();
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
  // Rafraîchit la liste toutes les 5 secondes
  if (performance.now() - (game.ui.publicLobbiesLastFetch || 0) > 5000) refreshPublicLobbies();

  const cx = CONFIG.CANVAS_W / 2;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = "bold 36px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = COLORS.enemy;
  ctx.shadowBlur = 16;
  ctx.fillText("👥 MULTIJOUEUR", cx, 80);
  ctx.shadowBlur = 0;

  // ── Colonne gauche : actions ──
  const leftX = 60;
  const colW = 360;
  const btnW = colW, btnH = 70, gap = 14;
  const startY = 130;

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("CRÉER OU REJOINDRE", leftX, startY - 14);

  const createPubRect  = { x: leftX, y: startY,                   w: btnW, h: btnH };
  const createPrivRect = { x: leftX, y: startY + btnH + gap,      w: btnW, h: btnH };
  const joinRect       = { x: leftX, y: startY + (btnH + gap) * 2, w: btnW, h: btnH };

  drawLobbyButton(ctx, createPubRect,  "✨  Créer un salon PUBLIC",   "Apparaît dans la liste à droite", COLORS.player, COLORS.playerDark);
  drawLobbyButton(ctx, createPrivRect, "🔒  Créer un salon PRIVÉ",   "Seuls ceux qui ont le code rejoignent", "#a855f7", "#5b21b6");
  drawLobbyButton(ctx, joinRect,       "🔑  Rejoindre via code",     "Entre un code à 6 caractères",   COLORS.enemy, COLORS.enemyDark || "#7f1d1d");

  // Bouton retour menu
  const backW = 200, backH = 36;
  const backRect = { x: leftX, y: startY + (btnH + gap) * 3 + 14, w: backW, h: backH };
  const backHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, backRect);
  ctx.fillStyle = backHover ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)";
  roundedRect(ctx, backRect.x, backRect.y, backRect.w, backRect.h, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("↩  Retour au menu", backRect.x + backRect.w / 2, backRect.y + backRect.h / 2);

  if (game.ui.lobbyMessage) {
    ctx.fillStyle = (game.ui.lobbyMessageLevel === "error") ? COLORS.enemy : COLORS.hudMuted;
    ctx.font = "12px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(game.ui.lobbyMessage, leftX, backRect.y + backRect.h + 24);
  }

  // ── Colonne droite : navigateur de salons + parties en cours ──
  const rightX = CONFIG.CANVAS_W - 60 - 460;
  const rightW = 460;

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("SALONS PUBLICS OUVERTS", rightX, startY - 14);

  // Bouton refresh
  const refreshRect = { x: rightX + rightW - 90, y: startY - 26, w: 90, h: 22 };
  const refreshHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, refreshRect);
  ctx.fillStyle = refreshHover ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)";
  roundedRect(ctx, refreshRect.x, refreshRect.y, refreshRect.w, refreshRect.h, 4);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(game.ui.publicLobbiesLoading ? "Chargement…" : "🔄 Actualiser", refreshRect.x + refreshRect.w / 2, refreshRect.y + refreshRect.h / 2);

  // Sections waiting + playing
  const waiting = (game.ui.publicLobbies || []).filter((l) => l.status === "waiting");
  const playing = (game.ui.publicLobbies || []).filter((l) => l.status === "playing");

  const rowH = 44;
  let curY = startY;
  const itemRects = [];

  if (waiting.length === 0) {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "13px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Aucun salon public ouvert. Crée le premier !", rightX, curY + 22);
    curY += 60;
  } else {
    for (const l of waiting.slice(0, 5)) {
      const rect = { x: rightX, y: curY, w: rightW, h: rowH };
      const hover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
      ctx.fillStyle = hover ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.05)";
      roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
      ctx.fill();
      ctx.strokeStyle = hover ? COLORS.player : "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pseudo + code à gauche
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${l.host_username || "Hôte"}`, rect.x + 14, rect.y + 16);
      ctx.fillStyle = COLORS.hudMuted;
      ctx.font = "11px ui-monospace, SFMono-Regular, monospace";
      ctx.fillText(`Code : ${l.code || "—"}  ·  ${BIOME_LABELS[l.biome] || l.biome}  ·  ${DIFFICULTY_PRESETS[l.difficulty]?.label || l.difficulty}`, rect.x + 14, rect.y + 31);

      // CTA à droite
      ctx.fillStyle = hover ? COLORS.player : COLORS.playerDark;
      const ctaW = 90, ctaH = 28;
      const ctaRect = { x: rect.x + rect.w - ctaW - 8, y: rect.y + (rect.h - ctaH) / 2, w: ctaW, h: ctaH };
      roundedRect(ctx, ctaRect.x, ctaRect.y, ctaRect.w, ctaRect.h, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("▶ Rejoindre", ctaRect.x + ctaRect.w / 2, ctaRect.y + ctaRect.h / 2);

      itemRects.push({ rect, code: l.code, type: "join" });
      curY += rowH + 6;
    }
  }

  // Parties en cours
  curY += 18;
  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`PARTIES EN COURS (${playing.length})`, rightX, curY);
  curY += 16;

  const spectateRects = [];
  if (playing.length === 0) {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "12px -apple-system, sans-serif";
    ctx.fillText("Aucune partie en cours.", rightX, curY + 16);
  } else {
    for (const l of playing.slice(0, 4)) {
      const rect = { x: rightX, y: curY, w: rightW, h: 40 };
      const hover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, rect);
      ctx.fillStyle = hover ? "rgba(168,85,247,0.18)" : "rgba(34,197,94,0.10)";
      roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
      ctx.fill();
      ctx.strokeStyle = hover ? "rgba(168,85,247,0.55)" : "rgba(34,197,94,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${l.host_username || "?"} vs ${l.guest_username || "?"}`, rect.x + 12, rect.y + rect.h / 2 - 8);
      ctx.fillStyle = COLORS.hudMuted;
      ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
      const since = l.started_at ? Math.floor((Date.now() - new Date(l.started_at).getTime()) / 1000) : 0;
      const minS = Math.floor(since / 60).toString().padStart(2, "0");
      const secS = (since % 60).toString().padStart(2, "0");
      ctx.fillText(`${BIOME_LABELS[l.biome] || l.biome}  ·  ${DIFFICULTY_PRESETS[l.difficulty]?.label || l.difficulty}  ·  ${minS}:${secS}`, rect.x + 12, rect.y + rect.h / 2 + 8);

      // CTA spectateur
      const ctaW = 90, ctaH = 26;
      const cta = { x: rect.x + rect.w - ctaW - 8, y: rect.y + (rect.h - ctaH) / 2, w: ctaW, h: ctaH };
      ctx.fillStyle = hover ? "rgba(168,85,247,0.85)" : "rgba(168,85,247,0.45)";
      roundedRect(ctx, cta.x, cta.y, cta.w, cta.h, 5);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("👁 Regarder", cta.x + cta.w / 2, cta.y + cta.h / 2);

      spectateRects.push({ rect, lobby: l });
      curY += 40 + 4;
    }
  }

  game.ui.lobbyRects = { choiceCreatePublic: createPubRect, choiceCreatePrivate: createPrivRect, choiceJoin: joinRect, back: backRect, refresh: refreshRect, publicItems: itemRects, spectateItems: spectateRects };
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
  // Le contenu principal du salon prend la zone de gauche (~870 px),
  // le panneau de chat occupe le côté droit.
  const chatW = 360;
  const chatPadL = 24;
  const mainW = CONFIG.CANVAS_W - chatW - chatPadL;
  const cx = Math.round(mainW / 2);
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

  // Bouton Prêt / Pas prêt — toujours cliquable. Si pas d'opponent encore
  // détecté, on colore en doux mais on permet quand même de se marquer
  // prêt (le serveur ne lance la partie que si guest_id est rempli).
  const myReady = mp.role === "host" ? mp.hostReady : mp.guestReady;
  const readyW = 220, readyH = 56;
  const readyRect = { x: cx - readyW / 2, y: cardY + playerCardH + 56, w: readyW, h: readyH };
  const readyHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, readyRect);
  if (myReady) {
    ctx.fillStyle = readyHover ? "rgba(34,197,94,0.65)" : "rgba(34,197,94,0.45)";
  } else {
    ctx.fillStyle = readyHover ? COLORS.player : COLORS.playerDark;
  }
  roundedRect(ctx, readyRect.x, readyRect.y, readyRect.w, readyRect.h, 10);
  ctx.fill();
  ctx.strokeStyle = myReady ? COLORS.hpGood : COLORS.player;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fff";
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

  // Panneau de chat à droite (toujours visible dans le salon)
  const chatRects = drawChatPanel(ctx, {
    x: CONFIG.CANVAS_W - chatW - 16, y: 80, w: chatW, h: CONFIG.H - 100,
  });

  game.ui.lobbyRects = { ready: readyRect, leave: leaveRect, copy: copyRect, codeBox, ...chatRects };
}

// Dessine un panneau de chat (utilisé dans le salon et en jeu).
// Retourne les rects utiles pour le handler de clic (input box, send button).
function drawChatPanel(ctx, opts) {
  const { x, y, w, h } = opts;
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  roundedRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Header
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("💬  Chat", x + 14, y + 22);

  ctx.fillStyle = COLORS.hudMuted;
  ctx.font = "10px -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Entrée pour envoyer", x + w - 12, y + 22);

  // Séparateur
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 32);
  ctx.lineTo(x + w - 10, y + 32);
  ctx.stroke();

  // Zone des messages (scrollée vers le bas — on affiche les derniers)
  const inputH = 56;
  const messagesAreaY = y + 38;
  const messagesAreaH = h - inputH - 38 - 8;
  const messages = game.ui.chatMessages || [];
  ctx.font = "12px -apple-system, sans-serif";
  ctx.textBaseline = "alphabetic";
  let cy = messagesAreaY + messagesAreaH;
  // Affiche du plus récent au plus ancien, vers le haut
  for (let i = messages.length - 1; i >= 0 && cy > messagesAreaY + 16; i--) {
    const m = messages[i];
    const lines = wrapTextToLines(ctx, m.text, w - 24);
    const blockH = 14 + lines.length * 15 + 4;
    cy -= blockH;
    if (cy < messagesAreaY) break;

    // Pseudo + horaire
    const meSide = mySide();
    const isMine = m.self
      || (game.mp?.role && m.from === game.mp.role)
      || (m.username && window.RE_AUTH?.profile?.username && m.username === window.RE_AUTH.profile.username);
    ctx.fillStyle = isMine ? COLORS.hpGood : (m.from === "host" ? COLORS.player : COLORS.enemy);
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(m.username || "anonyme", x + 12, cy + 10);

    // Texte
    ctx.fillStyle = "#fff";
    ctx.font = "12px -apple-system, sans-serif";
    for (let li = 0; li < lines.length; li++) {
      ctx.fillText(lines[li], x + 12, cy + 22 + li * 14);
    }
  }
  if (messages.length === 0) {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.font = "12px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Aucun message. Lance la conversation !", x + w / 2, messagesAreaY + 32);
  }

  // Champ input + bouton envoyer
  const inputBox = { x: x + 10, y: y + h - inputH + 8, w: w - 92, h: 36 };
  const sendBtn  = { x: inputBox.x + inputBox.w + 6, y: inputBox.y, w: 64, h: 36 };

  const active = !!game.ui.chatActive;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundedRect(ctx, inputBox.x, inputBox.y, inputBox.w, inputBox.h, 6);
  ctx.fill();
  ctx.strokeStyle = active ? COLORS.player : "rgba(255,255,255,0.15)";
  ctx.lineWidth = active ? 2 : 1;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "13px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const input = game.ui.chatInput || "";
  const display = input.length > 38 ? "…" + input.slice(-38) : input;
  if (!input) {
    ctx.fillStyle = COLORS.hudMuted;
    ctx.fillText(active ? "Tape un message…" : "Clique ici ou appuie sur T pour discuter", inputBox.x + 10, inputBox.y + inputBox.h / 2);
  } else {
    ctx.fillText(display, inputBox.x + 10, inputBox.y + inputBox.h / 2);
    // Curseur clignotant si actif
    if (active && (Math.floor(performance.now() / 500) % 2) === 0) {
      const tw = ctx.measureText(display).width;
      ctx.fillStyle = "#fff";
      ctx.fillRect(inputBox.x + 10 + tw + 1, inputBox.y + 8, 1.5, inputBox.h - 16);
    }
  }

  const sendHover = pointInRect(game.ui.mouseScreen.x, game.ui.mouseScreen.y, sendBtn);
  ctx.fillStyle = sendHover && input ? COLORS.player : (input ? COLORS.playerDark : "rgba(255,255,255,0.08)");
  roundedRect(ctx, sendBtn.x, sendBtn.y, sendBtn.w, sendBtn.h, 6);
  ctx.fill();
  ctx.strokeStyle = input ? COLORS.player : "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = input ? "#fff" : COLORS.hudMuted;
  ctx.font = "bold 12px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Envoyer", sendBtn.x + sendBtn.w / 2, sendBtn.y + sendBtn.h / 2);

  ctx.restore();
  return { chatInput: inputBox, chatSend: sendBtn };
}

// Découpe un texte en lignes selon la largeur disponible (renvoie array de strings).
function wrapTextToLines(ctx, text, maxW) {
  const words = (text || "").split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width <= maxW) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      // Si le mot seul est plus large, on coupe à la main
      if (ctx.measureText(w).width > maxW) {
        let chunk = "";
        for (const ch of w) {
          if (ctx.measureText(chunk + ch).width > maxW) {
            lines.push(chunk);
            chunk = ch;
          } else chunk += ch;
        }
        cur = chunk;
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Overlay de chat in-game : messages flottants à gauche du minimap, input
// box en bas de l'écran quand chatActive. Géré uniquement en mode MP.
function drawInGameChat(ctx) {
  const messages = game.ui.chatMessages || [];
  const now = performance.now();
  // Affiche les 5 derniers messages, fade après 12s
  const recent = messages.slice(-6).filter((m) => now - m.receivedAt < 12000);
  const boxX = 14;
  const boxY = CONFIG.HUD_H + 14;
  const boxW = 300;
  let cy = boxY;
  ctx.save();
  ctx.font = "12px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (const m of recent) {
    const age = now - m.receivedAt;
    const alpha = age < 9000 ? 1 : Math.max(0, 1 - (age - 9000) / 3000);
    const lines = wrapTextToLines(ctx, m.text, boxW - 18);
    const blockH = 14 + lines.length * 14 + 6;
    // Fond semi-opaque
    ctx.fillStyle = `rgba(0,0,0,${(0.55 * alpha).toFixed(3)})`;
    roundedRect(ctx, boxX, cy, boxW, blockH, 6);
    ctx.fill();
    // Pseudo coloré
    const isMine = m.self
      || (game.mp?.role && m.from === game.mp.role)
      || (m.username && window.RE_AUTH?.profile?.username && m.username === window.RE_AUTH.profile.username);
    ctx.fillStyle = `rgba(${isMine ? "187,247,208" : m.from === "host" ? "59,130,246" : "239,68,68"},${alpha.toFixed(3)})`;
    ctx.font = "bold 11px -apple-system, sans-serif";
    ctx.fillText(m.username || "anonyme", boxX + 10, cy + 12);
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.font = "12px -apple-system, sans-serif";
    for (let li = 0; li < lines.length; li++) {
      ctx.fillText(lines[li], boxX + 10, cy + 24 + li * 14);
    }
    cy += blockH + 4;
  }

  // Hint
  if (!game.ui.chatActive && recent.length === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.fillText("Appuie sur T pour discuter", boxX + 4, boxY + 14);
  }

  // Input box (en bas-gauche) si actif
  if (game.ui.chatActive) {
    const inW = 460, inH = 36;
    const inX = 14;
    const inY = CONFIG.H - inH - 14;
    const rect = { x: inX, y: inY, w: inW, h: inH };
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = COLORS.player;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "13px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const inText = game.ui.chatInput || "";
    const display = inText.length > 56 ? "…" + inText.slice(-56) : inText;
    if (!inText) {
      ctx.fillStyle = COLORS.hudMuted;
      ctx.fillText("Tape un message — Entrée pour envoyer · Échap pour annuler", rect.x + 12, rect.y + rect.h / 2);
    } else {
      ctx.fillText(display, rect.x + 12, rect.y + rect.h / 2);
      if ((Math.floor(now / 500) % 2) === 0) {
        const tw = ctx.measureText(display).width;
        ctx.fillStyle = "#fff";
        ctx.fillRect(rect.x + 12 + tw + 1, rect.y + 8, 1.5, rect.h - 16);
      }
    }
  }
  ctx.restore();
}

// Affiche les emotes reçues en haut-droite, chacune s'estompe sur 3 s.
function drawEmoteOverlay(ctx) {
  const events = game.ui.emoteEvents || [];
  const now = performance.now();
  const visible = events.filter((e) => now - e.ts < 3500);
  game.ui.emoteEvents = visible; // cleanup léger
  const baseX = CONFIG.CANVAS_W - 220;
  let cy = CONFIG.HUD_H + 14;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (const e of visible.slice(-5)) {
    const age = now - e.ts;
    const alpha = age < 2500 ? 1 : Math.max(0, 1 - (age - 2500) / 1000);
    const def = EMOTES.find((x) => x.id === e.id) || { icon: "❓", label: e.id };
    const w = 200, h = 38;
    ctx.fillStyle = `rgba(0,0,0,${(0.6 * alpha).toFixed(3)})`;
    roundedRect(ctx, baseX, cy, w, h, 8);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.font = "22px -apple-system, sans-serif";
    ctx.fillText(def.icon, baseX + 12, cy + h / 2);
    ctx.font = "bold 13px -apple-system, sans-serif";
    ctx.fillText(def.label, baseX + 48, cy + h / 2 - 7);
    const isMine = e.self || (game.mp?.role && e.from === game.mp.role);
    ctx.fillStyle = `rgba(${isMine ? "187,247,208" : e.from === "host" ? "59,130,246" : "239,68,68"},${alpha.toFixed(3)})`;
    ctx.font = "11px -apple-system, sans-serif";
    ctx.fillText(e.username, baseX + 48, cy + h / 2 + 8);
    cy += h + 6;
  }
  ctx.restore();
}

// Roue d'emotes — affichée quand on appuie sur V (et ne se ferme qu'après envoi
// ou Échap). 6 emotes disposés en cercle autour du centre de l'écran.
function drawEmoteRadial(ctx) {
  const cx = CONFIG.CANVAS_W / 2;
  const cy = CONFIG.H / 2;
  const radius = 130;
  const itemR = 56;
  const mx = game.ui.mouseScreen.x, my = game.ui.mouseScreen.y;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.H);

  ctx.fillStyle = "rgba(15,23,42,0.85)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius - itemR / 2 - 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.20)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Choisis une emote", cx, cy - 14);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "11px -apple-system, sans-serif";
  ctx.fillText("Échap pour annuler · 1-6 pour envoyer directement", cx, cy + 10);

  const rects = [];
  for (let i = 0; i < EMOTES.length; i++) {
    const angle = -Math.PI / 2 + (i / EMOTES.length) * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const r = { x: x - itemR / 2, y: y - itemR / 2, w: itemR, h: itemR };
    const hover = Math.hypot(mx - x, my - y) < itemR / 2;
    ctx.fillStyle = hover ? "rgba(168,85,247,0.55)" : "rgba(255,255,255,0.10)";
    ctx.beginPath();
    ctx.arc(x, y, itemR / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hover ? "#a855f7" : "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "26px -apple-system, sans-serif";
    ctx.fillText(EMOTES[i].icon, x, y - 5);
    ctx.font = "bold 9px -apple-system, sans-serif";
    ctx.fillText(EMOTES[i].label, x, y + 16);
    // Touche raccourci
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "bold 10px ui-monospace, monospace";
    ctx.fillText(`${i + 1}`, x, y - itemR / 2 - 8);
    rects.push({ rect: r, cx: x, cy: y, r: itemR / 2, emote: EMOTES[i] });
  }
  game.ui.emoteRects = rects;
  ctx.restore();
}

function sendEmote(emoteId) {
  if (!window.RE_MP) return;
  window.RE_MP.sendEmote(emoteId);
  game.ui.emoteMenuOpen = false;
}

function sendCurrentChat() {
  const txt = (game.ui.chatInput || "").trim();
  if (!txt) return;
  if (window.RE_MP) window.RE_MP.sendChat(txt);
  game.ui.chatInput = "";
  game.ui.chatActive = false;
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
      if (!slot.factory) {
        // On note coveredBy pour reconstruire les fusions côté guest
        return slot.coveredBy != null ? { coveredBy: slot.coveredBy } : null;
      }
      const f = slot.factory;
      return {
        typeId: f.typeId, hp: f.hp, level: f.level,
        upgrades: { ...f.upgrades }, totalInvested: f.totalInvested, mode: f.mode,
        tier: f.tier || 1,
        spanSlots: f.spanSlots || null,
        // Polish synchronisé : scale d'apparition + pulse au spawn
        scale: f.scale,
        scaleAnim: f.scaleAnim ? { ...f.scaleAnim } : null,
        spawnPulse: f.spawnPulse,
      };
    }),
    wallTurrets: s.wallSlots.map((w) => {
      if (!w.turret) return null;
      const t = w.turret;
      return { hp: t.hp, maxHp: t.maxHp, upgrades: { ...t.upgrades }, totalInvested: t.totalInvested, stats: { ...t.stats } };
    }),
  };
}

function buildMpSnapshot() {
  // Pop les events accumulés depuis le dernier snapshot (damage numbers,
  // camera shakes, événements polish) pour les transmettre au guest.
  const popDmg = game.mp?.outgoingDmg || [];
  const popShake = game.mp?.outgoingShake || null;
  if (game.mp) { game.mp.outgoingDmg = []; game.mp.outgoingShake = null; }
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
        // On embarque les stats réellement applicables à cette unité
        // (incluant tier multiplier + upgrades) pour que le hover range
        // sur le guest reflète la VRAIE portée et que les sprites sachent
        // s'ils peuvent toucher l'air.
        stats: u.stats ? {
          hp: u.stats.hp, damage: u.stats.damage, speed: u.stats.speed,
          range: u.stats.range, radius: u.stats.radius,
          attackInterval: u.stats.attackInterval, killReward: u.stats.killReward,
          layer: u.stats.layer, canTargetAir: !!u.stats.canTargetAir,
          isMedic: !!u.stats.isMedic, tier: u.stats.tier || 1,
        } : null,
      })),
    attackFx: game.attackFx.slice(-40).map((fx) => ({ ...fx })),
    explosions: game.explosions.slice(-12).map((ex) => ({ ...ex })),
    // Blasters Star Wars : bolts en vol + muzzle/impact flashes. Snapshot
    // récent uniquement (max 60 projectiles / 30 flashes) — au-delà c'est
    // visuel mineur et coût réseau pas justifié.
    projectiles: game.projectiles.slice(-60).map((p) => ({
      startX: p.startX, startY: p.startY, endX: p.endX, endY: p.endY,
      x: p.x, y: p.y, angle: p.angle,
      age: p.age, ttl: p.ttl, profile: p.profile, side: p.side,
    })),
    // Spread complet pour conserver tx/ty (heal), vx/vy/size (debris), etc.
    flashes: game.flashes.slice(-40).map((f) => ({ ...f })),
    lightning: game.lightning ? { ...game.lightning, segments: game.lightning.segments?.slice() || [] } : null,
    iem: game.iem ? { ...game.iem } : null,
    cd: { player: game.lightningCooldown, enemy: game.mp?.enemyLightningCooldown || 0 },
    iemCd: { player: game.iemCooldown || 0, enemy: game.mp?.enemyIemCooldown || 0 },
    dropCd: { player: game.dropCooldown || 0, enemy: game.mp?.enemyDropCooldown || 0 },
    surgeCd: { player: game.surgeCooldown || 0, enemy: game.mp?.enemySurgeCooldown || 0 },
    surgeUntil: { player: game.player.surgeUntil || 0, enemy: game.enemy.surgeUntil || 0 },
    pickups: (game.pickups || []).map((p) => ({
      id: p.id, x: p.x, y: p.y, value: p.value, age: p.age,
      consumed: !!p.consumed, consumedBy: p.consumedBy || null, fadeAge: p.fadeAge || 0,
    })),
    stats: { player: game.stats.player, enemy: game.stats.enemy },
    // Events polish à rejouer côté guest
    events: { dmg: popDmg, shake: popShake },
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
      if (!inc) { slot.factory = null; slot.coveredBy = null; continue; }
      // Slot couvert par une fusion : pas de factory propre, juste un pointeur
      if (inc.coveredBy != null) {
        slot.factory = null;
        slot.coveredBy = inc.coveredBy;
        continue;
      }
      const baseType = FACTORY_TYPES[inc.typeId];
      if (!baseType) continue;
      slot.coveredBy = null;
      const isNew = !slot.factory;
      if (isNew) {
        slot.factory = {
          typeId: inc.typeId, side, hp: inc.hp, prodTimer: 0,
          level: inc.level || 1, upgrades: inc.upgrades || defaultUpgrades(),
          totalInvested: inc.totalInvested || baseType.cost,
          mode: inc.mode || "attack",
          tier: inc.tier || 1,
          spanSlots: inc.spanSlots || [i],
          // Anim de pose sur le guest même si c'est l'host qui a posé la
          // factory (sinon elle apparaît instantanément sans pop juicy).
          scale: 0.1,
          scaleAnim: { from: 0.1, to: 1, age: 0, ttl: 0.30 },
          spawnPulse: null,
        };
      } else {
        slot.factory.typeId = inc.typeId;
        slot.factory.hp = inc.hp;
        slot.factory.level = inc.level || 1;
        slot.factory.upgrades = inc.upgrades || defaultUpgrades();
        slot.factory.totalInvested = inc.totalInvested || slot.factory.totalInvested;
        slot.factory.mode = inc.mode || slot.factory.mode;
        slot.factory.tier = inc.tier || 1;
        slot.factory.spanSlots = inc.spanSlots || [i];
        // Détection d'un spawn d'unité côté host : le pulse passe de null
        // à 0 dans le snapshot. On déclenche le pulse local.
        if (inc.spawnPulse === 0 && (slot.factory.spawnPulse == null || slot.factory.spawnPulse > 0.10)) {
          slot.factory.spawnPulse = 0;
        }
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
  if (!snap || game.mode !== "mp") return;
  // Le host génère les snapshots, il ne les ré-applique pas.
  if (game.mp?.role === "host") return;
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
      // Si le snapshot embarque les stats (avec tier + upgrades), on les
      // utilise tel quel ; sinon fallback sur les stats de base.
      const stats = u.stats ? { ...u.stats } : { ...unitDef };
      game.units.push({
        side: u.side,
        typeId: u.typeId,
        kind: "unit",
        x: u.x,
        y: u.y,
        hp: u.hp,
        maxHp: u.maxHp,
        stats,
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
  // Blasters bolts + flashes — réinjectés côté guest pour qu'il voit les tirs.
  game.projectiles = Array.isArray(snap.projectiles)
    ? snap.projectiles.map((p) => ({ ...p }))
    : [];
  game.flashes = Array.isArray(snap.flashes)
    ? snap.flashes.map((f) => ({ ...f }))
    : [];
  game.lightning = snap.lightning ? { ...snap.lightning } : null;
  game.iem = snap.iem ? { ...snap.iem } : null;
  if (snap.cd) {
    // On écrit les DEUX cooldowns : player → game.lightningCooldown,
    // enemy → game.mp.enemyLightningCooldown. Comme ça lightningCdFor()
    // retourne la bonne valeur peu importe le côté qu'on consulte (et
    // notamment pour le guest, mySide()="enemy" lit bien sa propre cd).
    game.lightningCooldown = snap.cd.player ?? 0;
    if (game.mp) game.mp.enemyLightningCooldown = snap.cd.enemy ?? 0;
  }
  if (snap.iemCd) {
    game.iemCooldown = snap.iemCd.player ?? 0;
    if (game.mp) game.mp.enemyIemCooldown = snap.iemCd.enemy ?? 0;
  }
  if (snap.dropCd) {
    game.dropCooldown = snap.dropCd.player ?? 0;
    if (game.mp) game.mp.enemyDropCooldown = snap.dropCd.enemy ?? 0;
  }
  if (snap.surgeCd) {
    game.surgeCooldown = snap.surgeCd.player ?? 0;
    if (game.mp) game.mp.enemySurgeCooldown = snap.surgeCd.enemy ?? 0;
  }
  if (snap.surgeUntil) {
    game.player.surgeUntil = snap.surgeUntil.player || 0;
    game.enemy.surgeUntil = snap.surgeUntil.enemy || 0;
  }
  if (Array.isArray(snap.pickups)) {
    game.pickups = snap.pickups.map((p) => ({ ...p }));
  }
  // Replay des events polish envoyés par le host
  if (snap.events) {
    if (Array.isArray(snap.events.dmg)) {
      for (const e of snap.events.dmg) {
        game.damageNumbers.push({
          x: (e.x || 0) + (Math.random() - 0.5) * 8,
          y: e.y || 0,
          vx: (Math.random() - 0.5) * 18,
          vy: -52 - Math.random() * 14,
          value: e.value || 1,
          isHeal: !!e.isHeal,
          side: e.side,
          age: 0, ttl: 0.95,
        });
      }
      if (game.damageNumbers.length > 80) game.damageNumbers.splice(0, game.damageNumbers.length - 80);
    }
    if (snap.events.shake) {
      const s = snap.events.shake;
      // Trigger sans relai (on est déjà côté guest, pas la peine de re-broadcast)
      const cur = game.camera.shake;
      if (!cur || s.magnitude > cur.magnitude * (1 - cur.age / cur.ttl)) {
        game.camera.shake = { magnitude: s.magnitude, ttl: s.ttl, age: 0 };
      }
    }
  }
  if (snap.stats) {
    // Snapshot des stats (host autoritaire) — permet au guest d'avoir un
    // rapport de fin de partie complet.
    if (snap.stats.player) game.stats.player = { ...game.stats.player, ...snap.stats.player };
    if (snap.stats.enemy)  game.stats.enemy  = { ...game.stats.enemy,  ...snap.stats.enemy };
  }
  if (snap.gameOver && !game.gameOver) {
    handleMpGameOver({ winnerSide: snap.gameOver.winner });
  }
}

// Côté host : applique un input reçu du guest (= actions sur le côté enemy).
function handleMpInput(input) {
  if (!input || game.mode !== "mp") return;
  if (game.mp?.role !== "host") return;
  if (game.screen !== "playing") return;
  if (game.gameOver) return;
  // Seuls les inputs envoyés par le guest sont autorisés (ignore spectateurs).
  if (input.from && input.from !== "guest") return;
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
    case "iem_fire":
      fireIem(side);
      break;
    case "drop_fire":
      fireDrop(side);
      break;
    case "surge_fire":
      fireSurge(side);
      break;
    case "merge_factory":
      tryMergeFactories(side, input.slotIndex, input.partnerIdx);
      break;
    case "set_factory_mode": {
      const slot = game[side].slots[input.slotIndex];
      if (slot?.factory && (input.mode === "attack" || input.mode === "defense")) {
        slot.factory.mode = input.mode;
      }
      break;
    }
    default:
      console.warn("[MP] input inconnu:", input);
  }
}

function handleMpGameOver({ winnerSide }) {
  if (game.gameOver) return;
  // winnerSide est en perspective host : "player" (host gagne) ou "enemy" (guest gagne)
  game.gameOver = { winner: winnerSide || "player", at: performance.now() };
  audio.stopMusic();
  audio.stopAmbient();
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
    audio.stopAmbient();
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

  // Précharge la menu music (le user peut la changer via le dropdown menu).
  audio.preloadMenuMusic();

  // Flush la position de lecture avant de quitter la page → la prochaine
  // page HTML (shop, profile…) reprendra à la même position.
  const flushMenuPos = () => audio._saveMenuMusicPos();
  window.addEventListener("pagehide", flushMenuPos);
  window.addEventListener("beforeunload", flushMenuPos);

  // Démarre l'écran de menu (le gameplay s'init au clic sur Jouer)
  game.screen = "menu";
  requestAnimationFrame(gameLoop);

  // Tentative d'autoplay : la plupart des navigateurs bloqueront si c'est
  // la 1ère visite du site (politique autoplay). Le catch() est silencieux,
  // dans ce cas la musique démarrera au 1er clic utilisateur (cf. handler clic).
  setTimeout(() => audio.startMenuMusic(), 100);

  // Fallback simulation hors-RAF quand la page est cachée (autre onglet,
  // fenêtre minimisée). Sans ça, le host MP fige et bloque le guest.
  // On simule à 20 Hz sans rendu — le rendu reprend dès que la page est
  // visible (le RAF redémarre automatiquement).
  setupBackgroundSimLoop();
  setupMobileKeyboard();

  // ?invite=CODE → auto-flow vers le rejoindre MP avec le code prérempli
  try {
    const params = new URLSearchParams(location.search);
    const inviteCode = params.get("invite");
    if (inviteCode && /^[A-Z0-9]{4,8}$/i.test(inviteCode)) {
      // Nettoie l'URL pour que le refresh n'auto-rejoigne pas en boucle
      history.replaceState(null, "", location.pathname);
      // Démarre la séquence MP → join screen → préfill code
      setTimeout(() => {
        if (!window.RE_AUTH?.profile) {
          location.href = `/auth/login.html?next=${encodeURIComponent("/prototype/?invite=" + inviteCode)}`;
          return;
        }
        startMultiplayer();
        game.ui.lobbyPage = "join";
        game.ui.codeInput = inviteCode.toUpperCase();
        // Auto-submit après un court délai
        setTimeout(() => { if (game.screen === "lobby" && game.ui.lobbyPage === "join") mpJoinByCode(game.ui.codeInput); }, 600);
      }, 400);
    }
  } catch (err) { console.warn("[invite URL]", err); }

  // Ping de présence pour qu'on apparaisse en ligne dans la liste d'amis
  schedulePresencePing();
}

// Met à jour last_seen_at toutes les 60 s tant que la page est ouverte.
async function schedulePresencePing() {
  const ping = async () => {
    if (window.RE_AUTH?.session) {
      try {
        const { supabase } = await import("/lib/supabase.js");
        await supabase.rpc("re_touch_presence");
      } catch {}
    }
  };
  await ping();
  setInterval(ping, 60_000);
}

document.addEventListener("DOMContentLoaded", boot);
