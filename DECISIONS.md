# 📌 Décisions verrouillées — Projet Émergence

> Document de référence : ici figurent toutes les décisions prises avec leur date. À mettre à jour à chaque session.

---

## 2026-05-12 — Session 1

### 🎯 Repositionnement stratégique
- ✅ Le projet est positionné comme **PRÉ-PROD / PROTOTYPE D'APPRENTISSAGE**
- ✅ Objectif : apprendre + valider le concept ludique
- ✅ Ce prototype servira de **tremplin** pour un jeu plus ambitieux plus tard
- ✅ Pas un produit commercial à lancer immédiatement

### 🎮 Identité
- ✅ **Nom du jeu** : `Émergence`
- ✅ **Concept** : Deux empires/camps qui s'affrontent
- ✅ **Lisibilité** : Le cerveau humain doit comprendre instantanément
- ✅ **Pitch narratif léger** : Un robot s'éveille (par faille technique ou pouvoir psychique) et bâtit de grandes factories pour vaincre l'ennemi (autres robots ? aliens ?)

### 📱 Marketing (à activer après validation du prototype)
- ✅ Canaux : TikTok, Instagram, YouTube
- ✅ Format : vidéos de gameplay

### 💰 Monétisation
- ⏸️ **DÉCISION REPORTÉE** — sera traitée après validation que le prototype est fun
- ❌ Pay-to-win = exclu (mauvaise réputation)
- ❌ Ads intrusives = exclu (gave les joueurs)
- Prototype = **100% gratuit, sans pub, sans achat**

### 🤝 Setup équipe
- ✅ Projet **solo** côté user
- ✅ User = direction créative + tests
- ✅ Claude = équipe technique (100% du code + config)
- ✅ User a **zéro connaissance de code** — Claude explique au besoin

### 🛠️ Approche tech (provisoire)
- 🔄 **HTML5 / JS dans le navigateur** pour le prototype (zero install pour le user)
- 🔄 Mobile (Godot ou autre) à envisager après validation du concept

---

---

## 2026-05-12 — Session 2 (Scope V0 figé)

### 🎮 Format & vue
- ✅ **Orientation** : paysage (téléphone à l'horizontale)
- ✅ **Vue** : top-down 2D avec léger relief 3D sur les bâtiments (style des captures du jeu original)
- ✅ **Camps** : joueur à gauche, ennemi à droite
- ✅ **Objectif** : détruire la base ennemie

### 🏭 Factories — 2 types par camp
- ✅ **Factory légère** : produit vite des unités légères (faible HP, attaque rapide). 1 porte de sortie (bas).
- ✅ **Factory lourde** : produit lentement des unités lourdes (gros HP, attaque lente, plus de dégâts). 3 portes de sortie (gauche, droite, bas).

### 🛣️ Système de chemins — V0a (grille de placement)
- ✅ Chaque base contient une **grille fixe** de 6 emplacements (2 lignes × 3 colonnes)
- ✅ Le joueur **place ses factories** sur ces emplacements
- ✅ Les **chemins entre emplacements sont pré-dessinés**
- ✅ Selon les **portes** de la factory placée, certains segments du chemin s'**activent** ou pas
- ✅ Si une factory n'a aucune porte reliée au chemin principal → ses unités restent bloquées (mécanique stratégique)
- ✅ Le chemin principal sort de la base par la porte centrale du rempart
- ⏸️ V0b (placement libre, chemins dynamiques) → seulement si V0a confirme le concept

### ⬆️ Upgrades — pendant la partie uniquement
- ✅ Chaque factory peut être améliorée **3 fois** pendant la manche
- ✅ Chaque niveau : **+30% vitesse de production**
- ✅ **Reset à zéro** au début de chaque nouvelle partie
- ✅ Coût croissant en argent (niveau 1 < niveau 2 < niveau 3)
- ⏸️ V2/V3 : méta-progression (boosts qui persistent entre parties)

### 💰 Économie
- ✅ Tuer une unité ennemie = gain d'argent
- ✅ Argent dépensé pour : acheter de nouvelles factories + acheter des upgrades
- ⏸️ V2/V3 : factories d'énergie séparées (ressource distincte)

### 🤖 IA ennemie V0
- ✅ Construit ses factories tout seule à intervalle régulier (timer simple, pas de stratégie complexe)

### 🎨 Style visuel
- ✅ Direction : **formes géométriques + pixel art**, style cohérent avec les captures du jeu original
- ✅ **Approche en 2 temps** :
  1. Claude code la mécanique avec des **placeholders géométriques** (rectangles colorés)
  2. User génère les **sprites PNG** en parallèle via IA d'images → remplacement progressif
- ✅ Prompts dédiés dans `08-art-direction/PROMPTS-SPRITES.md`

### 🛠️ Stack technique
- ✅ **HTML5 + JavaScript** (vanilla pour commencer, canvas 2D)
- ✅ Pas de framework de jeu (pas de Phaser, pas d'Unity) — on garde simple
- ✅ Tournera dans le navigateur du user (zéro install)
- ✅ Mobile (Godot ou portage natif) à envisager après validation du concept

---

## 2026-05-12 — Session 3 (Sprites V0 générés)

### 🎨 Pipeline sprites — full procédural Python/PIL
- ✅ **Décision** : abandon de la voie "IA d'images externe" (DALL-E, Midjourney) au profit d'une **génération procédurale 100% Python/PIL**, locale, sans dépendance
- ✅ Outils : `08-art-direction/scripts/palette.py` (palette + helpers partagés) + `08-art-direction/scripts/generate_sprites.py` (1 fonction `render_*` par sprite)
- ✅ Brief créatif par sprite documenté dans `08-art-direction/PROMPTS-INTERNES.md`
- ✅ Style : top-down chunky avec léger fake 3D (bandeau clair/sombre + ombre portée), inspiré du *Robotic Emergence* original — **pas du pixel art strict**
- ✅ Itération rapide : `python3 generate_sprites.py <filtre>` régénère un sprite en <1s

### 🟢 Statut sprites V0
- ✅ **Les 14 PNG (11 prioritaires + 3 variantes) sont considérés "suffisants" pour le prototype V0**
- ✅ Bugs visuels mineurs identifiés (factory-light bandes warning, factory-heavy effet smiley) — **non-bloquants pour V0**
- ⏸️ **Perfectionnement esthétique reporté à V2/V3** : refonte complète (probablement avec IA d'images ou artiste) une fois le concept ludique validé

---

## Décisions encore en attente

- 🟡 Univers ennemi : autres robots ? aliens ? autre ? *(narratif léger, peut attendre la fin du V0)*
- 🟡 Origine de l'éveil du robot : faille technique vs pouvoir psychique *(narratif léger, peut attendre)*
- 🟡 Durée cible d'une partie V0 (2-5 min ?) → sera affinée pendant l'équilibrage
