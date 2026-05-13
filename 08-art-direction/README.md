# 08 — Art Direction

## Objectif

Définir le **style visuel** du jeu : ambiance, palette, mood board.

⚠️ **À ne PAS faire trop tôt** : on attend que le pitch narratif soit choisi.

## Statut actuel
⏸️ **Bloqué** — en attente de la Phase 0 (vision/pitch validé).

## Questions à trancher

### 1. 🟡 Style général
| Option | Pour | Contre |
|--------|------|--------|
| **Pixel art moderne** | Niche fidèle, peu cher, retro vibe | Audience plus restreinte |
| **2D vectoriel** (style Reigns, Mini Metro) | Lisible mobile, abordable, classe | Risque "trop minimaliste" |
| **3D isométrique stylisé** (style Clash) | Mainstream, polish, scalable | Cher en prod |
| **Toon shader 3D** (style Genshin light) | Premium, attractif | Très cher, équipe nécessaire |

### 2. 🟡 Mood général (à valider selon le pitch)
- **Option A "Dernier humain"** → tons gris/bruns, mélancolique
- **Option B "Robot avec une âme"** → tons mixed, optimiste, chaleureux
- **Option C "Empire robotique"** → tons sombres/dorés, épique

### 3. 🟡 Palette
À définir après mood : ~5-8 couleurs primaires, codées par fonction.

### 4. 🟡 Animation
- 2D frame-by-frame ?
- 2D skeleton (Spine) ?
- 3D rigging ?

## Files à créer plus tard

- `style-guide.md` — guide d'identité visuelle
- `palette.md` — palette finale
- `moodboard.md` — références visuelles
- `character-sheets/` — designs unités
- `factory-designs/` — designs factories
- `ui-style-guide.md` — UI/UX visuel

## Recommandation tactique

**Style "pixel art moderne premium"** (style Loop Hero, Vampire Survivors)

**Pourquoi** :
- ✅ Cohérent avec l'esprit "héritage flash 2010" du concept original
- ✅ Coût de production maîtrisable (vs 3D)
- ✅ Lisibilité parfaite sur petit écran mobile
- ✅ Niche fidèle (audience pixel art = engagement élevé)
- ✅ Animation simplifiée → coûts contenus

**Pour vérifier l'audience** : tester avec un mock-up pixel art vs 2D vectoriel avant prod.
