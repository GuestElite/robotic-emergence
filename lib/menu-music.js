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

  const TRACKS = {
    "ride-the-wind": "/11-sound-design/music/bgm-menu.mp3",
    "bring-sky":     "/11-sound-design/music/bgm-menu-bring-sky.mp3",
    "decoherence":   "/11-sound-design/music/bgm-menu-decoherence.mp3",
  };

  const DEFAULT_TRACK = "ride-the-wind";
  const MENU_VOLUME = 0.30;  // doit matcher audio.menuMusicVolume dans game.js

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
