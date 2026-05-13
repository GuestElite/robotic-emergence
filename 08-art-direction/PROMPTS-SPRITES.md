# 🎨 Prompts de génération des sprites — Prototype V0 Émergence

> **Objectif** : générer tous les assets PNG du prototype V0 via une IA d'images (DALL-E 3, Midjourney, Leonardo, Stable Diffusion...).
>
> **Pour l'autre Claude Code** : ce document liste tous les prompts à utiliser, les specs techniques, et où placer les fichiers générés.

---

## 📁 Où placer les fichiers générés

Tous les sprites doivent être déposés dans :
```
/Users/romainguillaud/Desktop/Robotic emergence/08-art-direction/sprites/
```

Avec les noms exacts indiqués dans chaque section ci-dessous. Le code du jeu les chargera depuis ce dossier.

---

## 🎯 Direction artistique globale

**Style** : Top-down 2D game art avec un léger relief 3D sur les bâtiments (style "lite isometric" / "2.5D pixel art"). Inspiration directe : *Robotic Emergence* (jeu Flash 2010, captures dans la racine du workspace).

**Palette** :
- **Joueur (gauche)** : dominante bleue/cyan (#3B82F6 → #06B6D4)
- **Ennemi (droite)** : dominante rouge/orange (#EF4444 → #F97316)
- **Sol/terrain** : tons terre, sable, beige (#A88B6B → #C9A874)
- **Métal/structures** : gris-bleu, acier (#475569 → #64748B)

**Ambiance** : ciel d'orage / nuageux en haut de l'écran, ambiance industrielle robotique, légère pluie possible (effet ajouté par le code, pas dans les sprites).

**Specs techniques universelles** :
- Format : **PNG avec fond transparent**
- Vue : **top-down** (vue de dessus, légèrement en biais pour les bâtiments)
- Pas de texte dans les sprites
- Pas de bordures noires épaisses (style fin, propre)

---

## 📐 Liste des assets V0 (prioritaire)

### 1. Bases (les 2 bâtiments principaux à détruire)

#### 🔵 `base-player.png` — 256×256px
**Prompt** :
```
Top-down 2D game asset, large futuristic robot factory base, blue and cyan color scheme, slight 3D relief from above, sci-fi industrial style, with antenna and turrets on top, surrounded by metal walls and ramparts with a central gate opening at the bottom. Pixel art style, transparent background, no text. 256x256 pixels.
```

#### 🔴 `base-enemy.png` — 256×256px
**Prompt** :
```
Top-down 2D game asset, large futuristic robot factory base, red and orange color scheme, slight 3D relief from above, sci-fi industrial style, with antenna and turrets on top, surrounded by metal walls and ramparts with a central gate opening at the top. Pixel art style, transparent background, no text. 256x256 pixels.
```

---

### 2. Factories légères (production rapide d'unités légères)

#### 🔵 `factory-light-player.png` — 128×128px
**Prompt** :
```
Top-down 2D game asset, small compact robot factory building, square shape, blue and cyan color scheme, slight 3D relief from above, one visible exit door at the bottom of the square, small antennas on top, sci-fi industrial pixel art style. Looks "fast" and "agile". Transparent background, no text. 128x128 pixels.
```

#### 🔴 `factory-light-enemy.png` — 128×128px
**Prompt** : *(même que ci-dessus mais palette rouge/orange, porte de sortie en haut)*

---

### 3. Factories lourdes (production lente d'unités lourdes)

#### 🔵 `factory-heavy-player.png` — 128×128px
**Prompt** :
```
Top-down 2D game asset, massive heavy industrial robot factory building, square shape, blue and cyan color scheme, slight 3D relief from above, three visible exit doors (left, right, bottom of the square), large smokestacks on top, sci-fi industrial pixel art style. Looks "heavy" and "powerful". Transparent background, no text. 128x128 pixels.
```

#### 🔴 `factory-heavy-enemy.png` — 128×128px
**Prompt** : *(même que ci-dessus mais palette rouge/orange, porte basse devient porte du haut)*

---

### 4. Unités (robots qui combattent)

#### 🔵 `unit-light-player.png` — 48×48px
**Prompt** :
```
Top-down 2D game asset, small fast robot soldier with two legs, blue and cyan accents, holding a small laser gun, sci-fi pixel art style. Looks "agile" and "lightweight". Transparent background, no text. 48x48 pixels.
```

#### 🔴 `unit-light-enemy.png` — 48×48px
**Prompt** : *(idem palette rouge/orange)*

#### 🔵 `unit-heavy-player.png` — 64×64px
**Prompt** :
```
Top-down 2D game asset, large heavy robot tank with treads or quadruped legs, blue and cyan accents, armored body with a big cannon, sci-fi pixel art style. Looks "tanky" and "powerful". Transparent background, no text. 64x64 pixels.
```

#### 🔴 `unit-heavy-enemy.png` — 64×64px
**Prompt** : *(idem palette rouge/orange)*

---

### 5. Terrain & décors

#### 🟫 `tile-ground.png` — 128×128px (tileable / répétable)
**Prompt** :
```
Top-down 2D game tile, sand and dirt ground texture, slightly cracked and weathered, beige and brown tones, seamlessly tileable, sci-fi battlefield environment, pixel art style. No objects, no text, just ground texture. 128x128 pixels.
```

#### 🪨 `tile-wall.png` — 64×64px (tileable)
**Prompt** :
```
Top-down 2D game tile, metal rampart wall section seen from above, dark steel grey, slightly weathered, sci-fi industrial pixel art style, seamlessly tileable. Transparent background outside the wall. 64x64 pixels.
```

---

### 6. Effets visuels (optionnel V0, peut attendre V0.5)

#### 💥 `effect-explosion.png` — 64×64px (idéalement spritesheet 4-8 frames)
**Prompt** :
```
Top-down 2D game asset, small explosion effect, orange and yellow flames with smoke, sci-fi pixel art style. Single frame OR 4-frame horizontal sprite sheet. Transparent background. 64x64 pixels per frame.
```

#### ⚡ `effect-laser.png` — 32×32px
**Prompt** :
```
Top-down 2D game asset, small laser projectile, bright blue energy bolt, sci-fi pixel art style. Transparent background, no text. 32x32 pixels.
```

---

## 🎯 Ordre de priorité pour la génération

Si tu génères dans un ordre précis, suis celui-ci (les premiers sont **bloquants** pour le code) :

1. ✅ `tile-ground.png` (sans ça pas de fond)
2. ✅ `base-player.png` + `base-enemy.png`
3. ✅ `factory-light-player.png` + `factory-light-enemy.png`
4. ✅ `factory-heavy-player.png` + `factory-heavy-enemy.png`
5. ✅ `unit-light-player.png` + `unit-light-enemy.png`
6. ✅ `unit-heavy-player.png` + `unit-heavy-enemy.png`
7. 🟡 `tile-wall.png` (peut être placeholder code au début)
8. ⏸️ `effect-explosion.png` + `effect-laser.png` (effets, peuvent attendre)

---

## ⚙️ Workflow recommandé pour l'autre Claude Code

1. Lire ce fichier en entier
2. Lire les captures d'écran du jeu original dans `/Users/romainguillaud/Desktop/Robotic emergence/` (fichiers `Capture d'écran*.png`) pour s'imprégner du style cible
3. Lire `DECISIONS.md` pour bien comprendre le scope V0
4. Générer les sprites un par un (via DALL-E API, Midjourney en CLI, Stable Diffusion local, ou autre outil disponible)
5. Sauvegarder dans `08-art-direction/sprites/` avec les noms exacts ci-dessus
6. Au moindre doute sur la cohérence (palette, dimensions), comparer avec les captures du jeu original

---

## 📌 Notes pour les itérations

- Si un sprite ne rend pas bien, **régénérer en variant le prompt** (ajouter "highly detailed", "clean lines", "professional game asset", etc.)
- Si l'IA d'images génère un fond non-transparent, faire passer en post-traitement (remove.bg, Photoshop, ou un script ImageMagick)
- Pour la cohérence : essayer de **garder le même seed / artiste / modèle** pour toute une famille d'assets (toutes les factories, toutes les unités...)
- Si pixel art trop "AI-looking" : préciser "clean pixel art, sharp edges, limited color palette, retro game style"
