# 11 — Sound Design

Tous les sons du jeu (V0 placeholder).

## Contenu

```
sfx/                      Effets sonores courts
├── unit-light-shoot.wav      Tir laser zap (unité Light)
├── unit-heavy-shoot.wav      Canon lourd basse fréquence (unité Heavy)
├── unit-swarmer-shoot.wav    Chirp rapide (unité Swarmer)
├── unit-sniper-shoot.wav     Boom avec écho longue portée (unité Sniper)
├── unit-death.wav            Mort d'un robot (explosion + descente)
├── unit-crash-rampart.wav    Crash contre rempart ennemi (thud + clang)
└── effect-lightning.wav      Foudre / impact magique (crack + rumble)

music/
└── bgm-pathfinder.mp3         Musique de fond — "Pathfinder" par Scott Buckley (CC-BY 4.0)

scripts/
└── generate_sounds.py         Synthèse procédurale (stdlib uniquement)
```

## Format

- WAV 16-bit signed, **mono**, **22050 Hz**
- Compatible avec HTML5 `<audio>`, Web Audio API, Phaser, Godot, Unity, etc.
- Aucune dépendance externe pour la génération (Python stdlib `wave`)

## Régénérer

Depuis la racine du repo :

```bash
python3 11-sound-design/scripts/generate_sounds.py
```

Le script est déterministe (seeds fixes) → résultats reproductibles.

## Status V0

- **SFX** : synthétisés procéduralement (Python stdlib). Placeholder utilisable.
- **Musique** : "Pathfinder" par Scott Buckley, vraie composition orchestrale
  (cuivres, cordes, percussions). 3:24, 320 kbps stéréo.

## Crédits musique

> **"Pathfinder"** par Scott Buckley — released under CC-BY 4.0.
> [www.scottbuckley.com.au](https://www.scottbuckley.com.au)

Cette attribution **doit apparaître** dans les crédits du jeu (écran de crédits,
README du repo, description vidéo si gameplay sur YouTube, etc.) tant que la
track est utilisée.

## Remplacer la musique

Si plus tard on veut une autre musique :
- Plus de tracks Scott Buckley : https://www.scottbuckley.com.au/library/
- OpenGameArt CC0 : https://opengameart.org/content/cc0-music-0
- Pixabay : https://pixabay.com/music/search/epic%20orchestral/
