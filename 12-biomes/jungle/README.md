# Biome — Jungle

Premier biome alternatif (le biome de base est le désert dans `08-art-direction/sprites/`).

## Concept

Une forêt tropicale dense où les robots ennemis sont **camouflés en vert forêt**, avec des touches d'écorce brune et une lueur **vert acide** (au lieu du jaune warning du désert).
Le sol n'est plus du sable mais de la **terre brune humide**, parsemée de **patches de mousse**, de **racines** qui dépassent et de **petites fougères**.

## Palette

### Enemy jungle
| Rôle | Couleur | Hex |
|---|---|---|
| Dark | Vert forêt profond | `#1F4A1F` |
| Base | Vert militaire | `#4F7B3A` |
| Light | Vert feuille | `#7CB342` |
| Glow | Vert acide (signaux) | `#A4FF38` |

### Sol jungle
| Rôle | Couleur | Hex |
|---|---|---|
| Darkest | Terre très sombre | `#2D1E12` |
| Dark | Loam sombre | `#4B3824` |
| Base | Terre forestière | `#6A5034` |
| Light | Terre claire | `#8C6E46` |
| Moss | Mousse (3 tons) | `#3C6428` / `#5A8C37` / `#82AF4B` |

## Sprites

9 PNG dans `sprites/`. Mêmes noms que le biome de base — la sélection se fait par le dossier au chargement.

```
tile-ground.png                128×128   Sol jungle (terre + mousse + racines + fougères)
factory-light-enemy.png        128×128   Factory light enemy en thème jungle
factory-heavy-enemy.png        128×128
factory-swarmer-enemy.png      128×128
factory-sniper-enemy.png       128×128
unit-light-enemy.png            48×48
unit-heavy-enemy.png            64×64
unit-swarmer-enemy.png          40×40
unit-sniper-enemy.png           56×56
```

**Note** : Le joueur garde ses sprites bleus du désert (`08-art-direction/sprites/unit-*-player.png` et `factory-*-player.png`). Il n'y a pas de variant joueur jungle — seul le décor et les ennemis changent par biome.

## Régénérer

Depuis la racine du repo :
```bash
python3 12-biomes/jungle/scripts/generate_jungle.py
```

Le script est autonome (n'importe que les helpers depuis `08-art-direction/scripts/palette.py`) et déterministe (seeds fixes).

## TODO (V2)

- BGM jungle (ex: `Forge` ou `Pathfinder` autre track sur scottbuckley.com.au)
- Détails végétaux supplémentaires sur les sprites (feuilles, lianes en V2)
- Variantes de sol (clairière vs sous-bois dense)
