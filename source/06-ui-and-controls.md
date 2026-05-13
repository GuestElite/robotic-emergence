# Robotic Emergence — UI / HUD / Contrôles

Analyse basée sur les 8 captures d'écran du jeu sur jeu.fr.

## Layout général de l'écran

```
┌─────────────────────────────────────────────────────────────────┐
│ [Time: 33] [Money: $20]   [Factory info]    [Unit info]         │ ← HUD haut
│ [Forecast: rain]                                                 │
│ [Click here to buy factories]                                    │
│ [QUIT] [PAUSE] [OPTIONS]   [HP] [EMP]                           │
├─────────────────────────────────────────────────────────────────┤
│  Health 100% ← (ennemi)                    Health 100% → (toi)  │ ← HP bars
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         🏭                                  🏭                  │
│        Base ennemie (haut)                                      │
│        ┌─────┐                                                  │
│   ═════│ Wall│═════════════════════════════════════════════════ │ ← mur ennemi
│                                                                 │
│                  ZONE DE COMBAT (terre brune)                   │ ← battlefield
│                                                                 │
│              [factories joueur placées ici]                     │
│                                                                 │
│   ═════│ Wall│═════════════════════════════════════════════════ │ ← mur joueur
│        └─────┘                                                  │
│        Base joueur (bas)                                        │
└─────────────────────────────────────────────────────────────────┘
                                                          [JEU.FR] ← watermark
```

## Éléments du HUD (haut d'écran)

### Zone gauche : statut joueur
- **Time** : timer de partie (ex: Time: 33 = 33 secondes)
- **Money** : argent disponible (ex: $20)
- **Forecast** : météo en cours / annoncée (ex: rain)
- **"Click here to buy factories"** : bouton qui ouvre le menu d'achat

### Zone centre : info de la factory sélectionnée
- Nom de la factory (ex: "Green Smoke Plant")
- Visuel de l'unité produite
- Stat principale : "Dots per min: 23" (= Bots per minute)
- Autres stats au survol

### Zone droite : info de l'unité produite
- Nom de l'unité (ex: "Box Bot")
- Visuel de l'unité
- Stats complètes :
  - **Power** : 2
  - **RPM** : 90 (rounds per minute = cadence de tir)
  - **Health** : 10
  - **Speed** : 25 mph
  - **Range** : 210 feet
  - **Conductive** : Yes/No (résistance foudre)

### Boutons système
- **QUIT** : quitter la partie
- **PAUSE** : pause
- **OPTIONS** : paramètres
- **HP** (rouge) : probablement soigner le mur (capacité spéciale)
- **EMP** (jaune) : probablement désactiver brièvement les ennemis (Electromagnetic Pulse)

## Le menu d'achat de factories

Visible sur la capture 13.59.44.

Liste verticale qui s'affiche :
```
[Green Smoke Plant]  $100
[Blue Smoke Plant]   $80
[?] Unknown          ???
[?] Unknown          ???
[?] Unknown          ???
[?] Unknown          ???
                          [CLOSE]
```

- Les factories non débloquées apparaissent en **"Unknown ???"** → teaser de progression
- Cliquer sur une factory disponible permet probablement de la **dragger** sur la grille

## Le menu radial d'upgrade

Visible sur la capture 14.00.05 — **mécanique clé du jeu**.

Quand le joueur clique sur une factory placée, **7 icônes apparaissent en cercle** autour :

```
               [⬆ Creation Rate]
                      |
        [+ Health]         [$ Power]
            \              /
               [⬢ FACTORY ⬢]
            /              \
        [Shoot Rate]      [Speed ✓]
                      |
               [🎯 Range]
                      |
                  [$ Sell]
```

| Position | Action | Icône |
|----------|--------|-------|
| Top | Creation Rate | flèche haut |
| Left-up | Health | croix médicale |
| Right-up | Power | $ |
| Left-down | Shoot Rate | (?) |
| Right-down | Speed | check |
| Bottom-left | Range | cible |
| Bottom-right | Sell | $ |

→ **Pattern UX très commun en RTS / tower defense** (cf. Kingdom Rush, Bloons TD).

## Indicateurs en jeu

### HP bars
- "Health 100%" affiché en haut de chaque base
- Diminue à mesure que le mur prend des dégâts
- **"200/200 HP"** affiché au-dessus de la base ennemie quand sélectionnée

### Tips contextuels
- En bas d'écran pendant le jeu
- Exemple capturé : *"Tip: As well as reaching the enemies base quicker, more speed also makes a robot harder to hit"*
- Affichage temporaire pendant les premières parties

### Indicateurs de chemin
- Les chemins entre factories apparaissent comme des **bandes grises** au sol
- Visuellement très lisibles
- Indiquent la connexion à la base principale

## Écran de sélection des niveaux

Visible sur la capture 14.00.38.

Layout vertical, 5 niveaux empilés :
```
┌───────────────────────────────┐
│  [Desolation peak]            │ ← débloqué
├───────────────────────────────┤
│  [Volcano island]             │ ← débloqué
├───────────────────────────────┤
│  [LOCKED] Green Hills         │ ← verrouillé
├───────────────────────────────┤
│  [LOCKED] Twilight Fields     │ ← verrouillé
├───────────────────────────────┤
│  [Endurance Mode]             │
│  [Judgement city]             │ ← niveau final
└───────────────────────────────┘
```

- Chaque ligne montre un **thumbnail du biome**
- Les locked sont visiblement plus sombres
- Sélection au clic

## Popup d'intro de niveau

Visible sur la capture 14.00.45 (Volcano Island).

- **Modal rouge** semi-transparent
- Titre : "Welcome"
- Lore du niveau (3-4 paragraphes)
- Description de la faction ennemie + ses unités
- Bouton **CLOSE** en haut à droite
- → Bonne pédagogie narrative avant chaque mission

## Contrôles

- **Souris uniquement**
- Clic gauche : interaction (placer, sélectionner, upgrader)
- Pas de raccourcis clavier observés
- → **Adaptation mobile = quasi-directe** (tap = clic)

## Implications pour le portage mobile

### ✅ Facile à adapter
- Souris → Tap : direct
- Pas de précision pixel-perfect requise
- Menus déjà sous forme de panneaux cliquables
- Menu radial = parfait pour mobile (déjà utilisé par Brawl Stars, Clash, etc.)

### ⚠️ À repenser pour mobile
- **Écran horizontal → vertical** : il faudra repenser le layout en portrait (2/3 du marché mobile)
- **Densité d'info HUD** : trop dense pour petit écran, simplifier
- **Texte des stats** : trop petit, agrandir
- **Watermark "JEU.FR"** : à retirer (ce n'était pas dans le jeu original)

### 🆕 À ajouter pour mobile
- **Notifications push** : "Ton armée est prête, reviens jouer !"
- **Pinch-to-zoom** sur le terrain
- **Drag des factories** : tap+hold puis drag
- **Daily rewards** + tutoriel interactif
- **Mode sans connexion** (pas de PvP donc OK)
- **Cloud save** (Google Play / GameCenter)
