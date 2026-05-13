# Biome — Neige

Second biome alternatif (le biome de base est le désert dans `08-art-direction/sprites/`, le 1er alternatif est `12-biomes/jungle/`).

## Concept

Un paysage arctique enneigé où les robots ennemis sont **camouflés en gunmetal sombre** (style "ops hivernales"), avec une lueur **cyan glacé** (au lieu du jaune warning du désert ou du vert acide de la jungle).
Le sol n'est plus du sable mais de la **neige tassée**, parsemée de **plaques de glace bleutées**, de **petits rochers** sombres qui dépassent, et d'**aiguilles de pin** éparses.

**Choix de palette ennemie** : on évite le blanc arctique réaliste (qui se confondrait avec le sol) au profit d'un **gunmetal sombre** qui maximise la lisibilité gameplay contre la neige claire.

## Palette

### Enemy snow (arctic ops)
| Rôle | Couleur | Hex |
|---|---|---|
| Dark | Gunmetal très sombre | `#1A2530` |
| Base | Gunmetal bleu | `#2D3F52` |
| Light | Acier bleuté | `#4A6178` |
| Glow | Cyan glacé (signaux) | `#5BE1FF` |

### Sol neige
| Rôle | Couleur | Hex |
|---|---|---|
| Darkest | Gris-bleu froid | `#8A9AAD` |
| Dark | Neige ombrée | `#B8C7D6` |
| Base | Neige tassée | `#DCE6F0` |
| Light | Neige éclairée | `#F0F5FA` |
| Crack | Terre gelée | `#6E8298` |

### Glace (overlays)
| Rôle | Couleur | Hex |
|---|---|---|
| Dark | Glace ombrée | `#A8C8E0` |
| Base | Glace bleutée | `#C8E0F0` |
| Light | Reflet | `#E6F2FA` |

### Pin (touches végétales)
| Rôle | Couleur | Hex |
|---|---|---|
| Dark | Vert sapin sombre | `#2A3A1F` |
| Base | Vert pin | `#3D5128` |
| Light | Aiguille éclairée | `#5A7038` |

## Sprites

9 PNG dans `sprites/`. Mêmes noms que le biome de base — la sélection se fait par le dossier au chargement.

```
tile-ground.png                128×128   Sol neige (neige tassée + glace + rochers + aiguilles)
factory-light-enemy.png        128×128   Factory light enemy en thème arctic
factory-heavy-enemy.png        128×128
factory-swarmer-enemy.png      128×128
factory-sniper-enemy.png       128×128
unit-light-enemy.png            48×48
unit-heavy-enemy.png            64×64
unit-swarmer-enemy.png          40×40
unit-sniper-enemy.png           56×56
```

**Note** : Le joueur garde ses sprites bleus du désert (`08-art-direction/sprites/unit-*-player.png` et `factory-*-player.png`). Il n'y a pas de variant joueur neige — seul le décor et les ennemis changent par biome.

## Régénérer

Depuis la racine du repo :
```bash
python3 12-biomes/snow/scripts/generate_snow.py
```

Le script est autonome (n'importe que les helpers depuis `08-art-direction/scripts/palette.py`) et déterministe (seeds fixes).

## TODO (V2)

- BGM hivernale (track ambiance arctique / windy)
- Flocons animés (particles) au runtime côté `prototype/`
- Variantes de sol (neige fraîche poudreuse vs glace dominante)
- Empreintes de pas / traces de chenilles
