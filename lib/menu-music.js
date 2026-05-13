/*
 * Menu music partagée — joue la track choisie par l'utilisateur sur toutes
 * les pages HTML hors-canvas (shop, profile, missions, etc.).
 *
 * Lit le choix + volume depuis localStorage (même clé que prototype/game.js).
 * Tente autoplay, fallback sur 1er clic si bloqué par le navigateur.
 *
 * Usage : <script src="/lib/menu-music.js" defer></script> dans chaque page.
 */
(function () {
  "use strict";

  const SETTINGS_KEY = "robotic-emergence-settings-v1";
  const POS_KEY = "menuMusicPos";  // partagé avec prototype/game.js pour continuité

  const TRACKS = {
    "ride-the-wind": "/11-sound-design/music/bgm-menu.mp3",
    "bring-sky":     "/11-sound-design/music/bgm-menu-bring-sky.mp3",
    "decoherence":   "/11-sound-design/music/bgm-menu-decoherence.mp3",
  };

  const DEFAULT_TRACK = "ride-the-wind";
  const MENU_VOLUME = 0.30;  // doit matcher audio.menuMusicVolume dans game.js
  const RESUME_WINDOW_MS = 5000;  // tolérance avant de reprendre du début

  // ── Lit les settings localStorage
  function readSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (_) { return {}; }
  }

  const settings = readSettings();
  const trackId = TRACKS[settings.menuMusicTrackId] ? settings.menuMusicTrackId : DEFAULT_TRACK;
  const musicEnabled = settings.musicEnabled !== false;  // défaut true
  const musicVolume = (typeof settings.musicVolume === "number")
    ? Math.max(0, Math.min(1, settings.musicVolume))
    : 0.8;
  const finalVolume = MENU_VOLUME * musicVolume;

  if (!musicEnabled) return;  // user a coupé la musique

  // ── Crée l'élément audio
  const audio = new Audio(TRACKS[trackId]);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = finalVolume;

  // Évite que 2 instances ne se superposent si l'utilisateur navigue très vite
  // (le navigateur garde un seul audio par origine grâce à HTMLMediaElement)
  window.__RE_MENU_MUSIC = audio;

  // ── Continuité de lecture entre pages
  // Au chargement, on regarde si une position a été sauvée récemment pour la
  // même track. Si oui, on seek à cette position + temps écoulé (compense le
  // gap de navigation).
  function loadSavedPos() {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.trackId !== trackId) return null;
      const elapsedMs = Date.now() - (data.savedAt || 0);
      if (elapsedMs > RESUME_WINDOW_MS) return null;
      return Math.max(0, (data.position || 0) + elapsedMs / 1000);
    } catch (_) { return null; }
  }

  const resumeAt = loadSavedPos();
  if (resumeAt !== null) {
    audio.addEventListener("loadedmetadata", () => {
      try {
        const dur = audio.duration || 0;
        // Modulo durée si on a dépassé la fin (loop)
        const safePos = dur > 0 ? (resumeAt % dur) : 0;
        audio.currentTime = safePos;
      } catch (_) {}
    }, { once: true });
  }

  // Sauvegarde de la position toutes les ~250ms pendant la lecture
  function saveCurrentPos() {
    if (!audio || audio.paused) return;
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({
        trackId: trackId,
        position: audio.currentTime,
        savedAt: Date.now(),
      }));
    } catch (_) {}
  }
  audio.addEventListener("timeupdate", saveCurrentPos);
  // Flush final avant de quitter la page (le timeupdate ne fire pas pendant unload)
  window.addEventListener("pagehide", saveCurrentPos);
  window.addEventListener("beforeunload", saveCurrentPos);

  // ── Tentative autoplay
  audio.play().catch(() => {
    // Bloqué : on attend le 1er clic / appui clavier / touch
    const tryPlay = () => {
      audio.play().catch(() => {});
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
      window.removeEventListener("touchstart", tryPlay);
    };
    window.addEventListener("pointerdown", tryPlay, { once: true });
    window.addEventListener("keydown", tryPlay, { once: true });
    window.addEventListener("touchstart", tryPlay, { once: true });
  });

  // ── Suit les changements de localStorage si user switch de track dans le jeu
  window.addEventListener("storage", (e) => {
    if (e.key !== SETTINGS_KEY) return;
    try {
      const newSettings = JSON.parse(e.newValue || "{}");
      // Re-applique volume + enabled
      if (newSettings.musicEnabled === false) {
        try { audio.pause(); } catch (_) {}
        return;
      }
      const newVol = (typeof newSettings.musicVolume === "number")
        ? Math.max(0, Math.min(1, newSettings.musicVolume))
        : 0.8;
      audio.volume = MENU_VOLUME * newVol;
      // Si la track a changé, swap proprement
      const newTrack = TRACKS[newSettings.menuMusicTrackId] ? newSettings.menuMusicTrackId : DEFAULT_TRACK;
      if (newTrack && TRACKS[newTrack] && !audio.src.endsWith(TRACKS[newTrack])) {
        const wasPlaying = !audio.paused;
        audio.src = TRACKS[newTrack];
        audio.load();
        if (wasPlaying) audio.play().catch(() => {});
      }
    } catch (_) {}
  });
})();
