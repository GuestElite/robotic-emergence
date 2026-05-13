# 🎮 Game Design Document — Projet RE — V0

> ⚠️ **Document vivant.** Sections marquées 🟡 = à décider ensemble. Sections marquées ⏳ = à rédiger après Phase 0 validée.

---

## 1. Executive Summary

| Élément | Valeur |
|---------|--------|
| **Titre provisoire** | 🟡 À décider (cf. `01-vision-pitch/working-name.md`) |
| **Genre** | Lane-based auto-battler / RTS minimaliste |
| **Plateforme** | iOS + Android (mobile prioritaire) |
| **Cible** | 🟡 À valider — recommandation : 16-40 ans, casual-to-midcore |
| **Business model** | 🟡 À décider — recommandation : F2P avec IAP cosmétiques + rewarded ads |
| **Inspiration** | Robotic Emergence (2010), Mushroom Wars 2, Plants vs Zombies, Mindustry |
| **USP** | Le seul auto-battler mobile avec **factories connectées par chemins** et **méta-progression riche** |

---

## 2. Vision & Pitch

⏳ À rédiger après choix du pitch (cf. `01-vision-pitch/pitch-options.md`)

---

## 3. Game Overview

### Core fantasy
🟡 *À affiner selon le pitch retenu*

### Boucle de jeu (1 partie)
```
Setup (15s) ──► Construction (continu) ──► Combat (continu) ──► Win/Lose (~5-10 min)
```

### Modes de jeu
- ✅ **Campagne** (5 niveaux + boss = ~3-5h de contenu)
- ✅ **Endurance** (mode infini avec scaling exponentiel)
- ✅ **Daily challenge** (1 défi quotidien avec modificateurs)
- ✅ **Événement** (rotation hebdo/bi-hebdo)
- ⏳ V2 : PvP asynchrone (raid sur base de joueurs)

### Sessions cibles
- Session moyenne : **6-10 min**
- Sessions/jour : **2-4**

---

## 4. Core Gameplay

### 4.1 — Boucle de partie (détaillée)

```
1. Tu spawn avec ton mur (200 HP) en bas de l'écran
2. L'ennemi a son mur (200 HP) en haut
3. Tu commences avec X$ + 0 factory
4. Money se génère passivement (5$/sec base)
5. Tu places des factories sur ta moitié de map
6. Chaque factory produit une unité spécifique à intervalles réguliers
7. Les unités sortent et marchent vers le mur ennemi
8. Elles tirent sur les ennemis croisés en chemin
9. Au contact du mur ennemi, elles attaquent jusqu'à mourir
10. Tu peux : placer + factories | upgrade tes factories | utiliser des capacités actives
11. L'ennemi fait pareil de son côté (IA)
12. VICTOIRE = ton mur ennemi à 0 HP. DÉFAITE = ton mur à 0 HP.
```

### 4.2 — Contrôles (mobile)

| Action | Contrôle |
|--------|----------|
| Sélectionner un slot vide | Tap |
| Ouvrir le menu d'achat de factory | Tap "Build" |
| Placer une factory | Drag and drop, ou tap-tap |
| Ouvrir le menu d'upgrade | Tap sur une factory placée |
| Acheter un upgrade | Tap sur l'icône du menu radial |
| Activer une capacité | Tap sur l'icône en bas de l'écran |
| Pause | Tap sur le bouton pause |

### 4.3 — Caméra
- **Vue 2D side-scroll vertical** (haut = ennemi, bas = toi)
- Format **portrait 9:16**
- Pinch-to-zoom : non (jeu doit tenir dans 1 écran)
- Scroll vertical : oui (pour voir l'ennemi)

---

## 5. Mécaniques

### 5.1 — Factories
Cf. `source/04-factories.md` pour l'original.
Notre version : **6 factories de base** au lancement, **+ 4 factories à débloquer** post-lancement via events.

🟡 *Stats détaillées à rédiger en Phase 1.*

### 5.2 — Unités
Cf. `source/03-units.md` pour l'original.
Notre version : **6 unités base + 1 healer** au lancement.

🟡 *Stats détaillées à rédiger en Phase 1.*

### 5.3 — Météo
Système conservé de l'original :
- ☀️ Soleil (neutre)
- 🌧️ Pluie (ralentit Smoke Plants)
- ⛈️ Orage (tue les unités conductives, boost certaines factories)
- 🌫️ Brouillard 🆕 (réduit la portée des Snipers)
- 🔥 Canicule 🆕 (réduit la cadence)

### 5.4 — Capacités actives 🆕
Nouvelles capacités utilisables 1-2 fois par partie :
- 💥 **EMP** — désactive les unités ennemies pendant 3s
- ❤️ **Heal Wall** — restaure 50 HP au mur
- 🚀 **Frappe orbitale** — détruit toutes les unités ennemies à l'écran (cooldown long)
- 🛸 **Drone Scout** 🆕 — révèle les futurs spawns ennemis pendant 10s

### 5.5 — Conditions de terrain 🆕
Chaque map a 1-2 features uniques :
- Rivières infranchissables
- Falaises (bonus de portée)
- Ruines (cover)
- Zones radioactives (dégâts continus)

---

## 6. Économie en partie

### Ressource unique : Energy ($)
🟡 *À renommer selon l'univers retenu.*

### Sources
- **Passif** : 5$/sec (base, scalable selon difficulté)
- **Kill bounty** : 2-15$ par ennemi tué
- **Caisses d'event** : 10-50$ à des moments scénarisés
- **Upgrade ROI** : "Money Bonus" = +1$/sec passif

### Sinks
- Factories : 80-500$
- Upgrades : 20-200$ par niveau
- Capacités actives : 100-500$ par usage
- Réparation murs : 50$ pour 25 HP

🟡 *Équilibrage précis à faire en Phase 1.*

---

## 7. Méta-progression

⏳ Cf. `05-talents/talent-tree-design.md`

---

## 8. Skins & Customisation

⏳ Cf. `04-skins/skin-system-design.md`

---

## 9. Événements & LiveOps

⏳ Cf. `06-events/events-calendar.md`

---

## 10. Monétisation

⏳ Cf. `07-economy-monetization/f2p-economy.md`

---

## 11. Art Direction

⏳ Cf. `08-art-direction/`

---

## 12. Technique

⏳ Cf. `09-tech-stack/`

---

## 13. UX & UI

⏳ Cf. `10-ux-mobile/`

---

## 14. Narration & Lore

⏳ Cf. `01-vision-pitch/pitch-final.md` (à venir)

---

## 15. Roadmap

Cf. `ROADMAP.md` à la racine.

---

## Changelog

- **V0** (2026-05-12) — Création du squelette
