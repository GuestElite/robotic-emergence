# Évolution skins

Dossier de référence visuelle pour tous les skins du jeu, organisé par camp et biome.

**⚠️ Ces PNG sont des copies** — les originaux utilisés par le jeu sont dans
`08-art-direction/sprites/` et `12-biomes/{biome}/sprites/`.

## Structure

```
Évolution skins/
├── player/           Skins joueur (famille bleue — désert applique partout)
├── enemy-desert/     Skins ennemis désert (famille rouge)
├── enemy-jungle/     Skins ennemis jungle (famille verte)
└── enemy-snow/       Skins ennemis neige (famille gunmetal)
```

Chaque dossier contient **15 PNG** : 5 unités × 3 tiers = 15.

## Convention de nommage

`{unite}_T{tier}_{theme}.png`

- **T0** = Common (skin par défaut, déjà en jeu)
- **T1** = Rare (chrome + 1-2 bandes dorées + 2-3 ajouts physiques)
- **T2** = Epic (bleu/rouge/vert/gunmetal très foncé + bandes dorées généreuses + 4-5 ajouts physiques)

## Logique de progression

L'évolution se voit dans **3 dimensions cumulatives** :
1. **Couleur** : famille de base → chrome → ton très foncé
2. **Bandes dorées** : aucune → 1-2 subtiles → généreuses
3. **Ajouts physiques** : aucun → 2-3 (casque, plaque, bipied, etc.) → 4-5 (cape, couronne, double-armes, etc.)

## Familles de couleur par camp/biome

| Famille | Tier 0 | Tier 1 (Steel/Chrome) | Tier 2 (Profond + or) |
|---|---|---|---|
| **player** (tous biomes) | Bleu cyan vif | Bleu acier chromé | Bleu marine quasi-noir |
| **enemy desert** | Rouge vif | Rouge brique chromé | Bordeaux profond |
| **enemy jungle** | Vert militaire | Vert chromé | Vert profond presque noir |
| **enemy snow** | Gunmetal bleuté | Gunmetal chromé clair | Gunmetal très sombre |

## Ajouts physiques par unité (identiques pour player + enemy, palette adaptée)

| Unité | T1 (Rare) | T2 (Epic) |
|---|---|---|
| **light** | casque tactique + visière + antenne dorsale + backpack | cape + casque ailé doré + bouclier rond doré + canon long doré + couronne dorée |
| **heavy** | plaque blindage frontale + radar dorsal + pods latéraux + boulons dorés | mega-tourelle + 4 lance-roquettes aux coins + 2 échappements + crête centrale dorée |
| **swarmer** | 8 pattes + 2 antennes dorées + mandibules allongées + anneau hex doré | 10 pattes + aiguillon arrière + ailes translucides + œil triple doré + couronne dorée |
| **sniper** | casque renforcé + bipied + canon allongé doré + insigne pectoral | cape camouflage + double-canon parallèle + plumes dorées + ceinture munitions |
| **air** | ailes élargies + 4 missiles dorés + réacteurs renforcés + liseré subtil | canards avant + 6 missiles dorés + post-combustion + canopée bulle dorée |

## Régénérer

```bash
# Désert (player + enemy, tous tiers)
python3 08-art-direction/scripts/generate_sprites.py

# Jungle (enemy + tiers jungle)
python3 12-biomes/jungle/scripts/generate_jungle.py

# Snow (enemy + tiers snow)
python3 12-biomes/snow/scripts/generate_snow.py
```

Le code des fonctions `render_unit_*` est centralisé dans `generate_sprites.py`.
Les scripts biome importent ces fonctions et les appellent avec leur palette
(`ENEMY_JUNGLE_T1`, `ENEMY_SNOW_T2`, etc.) via le paramètre `pal_override`.

## Statut intégration boutique

✅ **Sprites prêts** (60 PNG au total)
✅ **Câblage SPRITE_FILES** dans `prototype/game.js` (sprites préchargés)
⏳ **Logique de switch in-game** : pas encore implémentée — `drawUnits()` utilise
   toujours `unit-${typeId}-${side}` sans suffixe `-t1/-t2`. À faire dans une
   session suivante quand on intégrera le data model Supabase pour la boutique
   (table `re_unit_skins` ou équivalent).
