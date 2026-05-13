# 🗺️ Roadmap maître — Projet Émergence

> **⚠️ Reframe 2026-05-12** : ce projet est désormais positionné comme **PRÉ-PROD / PROTOTYPE D'APPRENTISSAGE**, pas un produit commercial à lancer immédiatement.
>
> **Objectifs réels** :
> 1. Apprendre par la pratique (user en direction, Claude en exécution)
> 2. Valider le concept ludique en petit
> 3. Servir de tremplin pour un jeu plus ambitieux plus tard
>
> Les phases 3 à 5 ci-dessous (Production MVP, Soft launch, Global launch) sont conservées comme **vision long terme** mais ne sont **pas** au programme immédiat. La priorité actuelle : **Phase 2 — Prototype jouable dans le navigateur**.

**Statut global** : 🟢 Phase 2 (Prototype V0) — scope figé, démarrage du code
**Date de démarrage** : 2026-05-12

---

## 🎯 Vue d'ensemble — 6 phases

```
Phase 0 ────► Phase 1 ────► Phase 2 ────► Phase 3 ────► Phase 4 ────► Phase 5
Vision        Pré-prod      Prototype     Production    Soft launch   Global
1-2 sem.      4-6 sem.      8-12 sem.     3-6 mois      1-2 mois      Continu
```

| Phase | Nom | Durée | Livrable clé | KPI sortie |
|-------|-----|-------|--------------|-----------|
| **0** | Vision & Différenciation | 1-2 sem | Pitch validé + pivot narratif | Pitch écrit + 1 nom retenu |
| **1** | Pré-production / GDD | 4-6 sem | GDD complet + maquettes UI | GDD V1 signé |
| **2** | Prototype / Vertical Slice | 8-12 sem | 1 niveau jouable end-to-end | Test joueurs externes ≥ 6/10 |
| **3** | Production MVP | 3-6 mois | App store-ready (5 niveaux + endurance) | TestFlight + Play Internal OK |
| **4** | Soft launch | 1-2 mois | Lancement sur 1-2 pays test | D1 ≥ 40%, D7 ≥ 15%, ARPU ≥ 0,05€ |
| **5** | Global launch + LiveOps | Continu | Lancement mondial + events | D30 ≥ 5%, ARPDAU ≥ 0,10€ |

---

## 📅 PHASE 0 — Vision & Différenciation (1-2 semaines)

### Objectif
Définir **ce que sera notre jeu** (et ce qu'il ne sera pas) avant d'écrire la moindre ligne de spec.

### Tâches
- [ ] **Choisir le pivot narratif** (3 options dans `01-vision-pitch/pitch-options.md`)
- [ ] **Choisir un nom de jeu** (shortlist dans `01-vision-pitch/working-name.md`)
- [ ] **Valider les 4 axes de différenciation** vs original
- [ ] **Identifier la cible** (casual, mid-core, hardcore) → impacte tout
- [ ] **Décision business model** : F2P ads / F2P IAP / Premium / Hybrid

### Livrables
- `01-vision-pitch/pitch-final.md` — pitch validé d'1 page
- Nom de projet définitif
- Persona joueur cible

### KPI de sortie
✅ Tu peux pitcher le jeu en 30s à n'importe qui

---

## 📅 PHASE 1 — Pré-production / GDD (4-6 semaines)

### Objectif
Documenter **tout le jeu sur papier** avant la première ligne de code. C'est la phase la moins chère pour itérer.

### Tâches
- [ ] **GDD complet** (cf. `02-gdd/`)
  - Core loop détaillé
  - Liste des unités (joueur + ennemies)
  - Liste des factories
  - Système d'upgrade
  - Système de météo
  - Économie en partie (ressources, coûts, gains)
- [ ] **Méta-progression** (cf. `05-talents/`)
  - Arbre de talents complet
  - Système de prestige
- [ ] **Skins** (cf. `04-skins/`)
  - Catalogue initial (10-20 skins)
  - Système de rareté
- [ ] **Événements** (cf. `06-events/`)
  - Calendrier annuel type
  - 5-8 formats d'événements
- [ ] **Économie F2P** (cf. `07-economy-monetization/`)
  - Sources / sinks de hard currency
  - Pricing IAP
  - Stratégie ads (rewarded video, interstitiels)
- [ ] **Art direction** (cf. `08-art-direction/`)
  - Style visuel choisi (pixel art moderne ? 3D iso ? toon shader ?)
  - Palette + mood board
- [ ] **Stack technique** (cf. `09-tech-stack/`)
  - Moteur choisi (Unity / Godot / autre)
  - Stack backend (sauvegarde cloud, leaderboards)
- [ ] **UX mobile** (cf. `10-ux-mobile/`)
  - Wireframes des 15 écrans clés
  - Format paysage ou portrait ?

### Livrables
- GDD V1 complet (~30-50 pages)
- Wireframes ~15 écrans
- Mood board art direction

### KPI de sortie
✅ Un dev externe pourrait commencer à coder à partir des docs

---

## 📅 PHASE 2 — Prototype / Vertical Slice (8-12 semaines)

### Objectif
**1 niveau jouable end-to-end** dans une qualité proche du jeu final. Pas plus, pas moins.

### Tâches
- [ ] Setup du projet (moteur, repo, CI)
- [ ] Implémentation du core loop (1 niveau, 2 factories, 2 unités)
- [ ] UI/UX du gameplay
- [ ] Sons et musiques placeholder
- [ ] Système de sauvegarde local
- [ ] **Tests utilisateurs** : 10-15 personnes externes

### Livrables
- Build jouable (interne)
- Rapport de test joueurs

### KPI de sortie
✅ Note moyenne testeurs ≥ 6/10
✅ Au moins 70% des testeurs veulent rejouer

### ⚠️ Go/No-Go
À cette étape, on décide si on continue le projet ou si on pivot.

---

## 📅 PHASE 3 — Production MVP (3-6 mois)

### Objectif
Version **App Store-ready** avec contenu minimum viable.

### Scope MVP
- ✅ 5 niveaux campagne
- ✅ Mode endurance avec scaling FIXÉ (vs original)
- ✅ 6 factories + 6 unités
- ✅ Méta-progression (talents niveau 1-20)
- ✅ 5-10 skins
- ✅ 2 événements types
- ✅ Tutoriel guidé
- ✅ Système de save cloud
- ✅ Leaderboards
- ✅ IAP intégrés
- ✅ Rewarded ads intégrées
- ✅ Localisation FR + EN + ES

### Hors-scope MVP (V2)
- ❌ PvP
- ❌ Mode coop
- ❌ Plus de 5 niveaux
- ❌ Système de guildes

### Livrables
- Build TestFlight (iOS)
- Build Play Console Internal (Android)
- Pages store rédigées

### KPI de sortie
✅ Build stable (< 1% crash rate)
✅ Validation App Store / Play Store
✅ ASO baseline rédigé

---

## 📅 PHASE 4 — Soft launch (1-2 mois)

### Objectif
Tester **les métriques de rétention et monétisation** sur un marché restreint avant le lancement mondial.

### Marchés tests (à choisir)
- **Option A — Hard mode** : Canada, Australie, Nouvelle-Zélande (anglophone, marché mature)
- **Option B — Cost-effective** : Philippines, Pologne, Brésil (volume + coût UA faible)

### KPI cibles
| Métrique | Seuil minimum | Cible |
|----------|---------------|-------|
| D1 retention | 40% | 50% |
| D7 retention | 15% | 22% |
| D30 retention | 5% | 8% |
| Average session length | 5 min | 8 min |
| Sessions/day | 2 | 4 |
| ARPDAU | 0,05€ | 0,15€ |
| Crash-free rate | 99% | 99,5% |

### ⚠️ Go/No-Go
Si métriques < seuil minimum → **on retravaille** (3-6 mois) avant global.
Si métriques entre seuil et cible → on optimise puis global.
Si métriques > cible → **on lance vite et on scale UA**.

---

## 📅 PHASE 5 — Global launch + LiveOps (continu)

### Objectif
Lancement mondial + opérations en live pour faire vivre le jeu.

### Rythme LiveOps
- **Hebdo** : Daily challenges (auto), patch de balance si besoin
- **Bi-hebdo** : Événement thématique (durée 7-14 jours)
- **Mensuel** : Battle Pass (saison de 30 jours)
- **Trimestriel** : Major update (nouveau contenu, nouvelle faction, nouvelle map)
- **Annuel** : Saison anniversaire + revisite des skins

### Équipe nécessaire (à terme)
- 1 PM / game designer (toi)
- 1-2 développeurs
- 1 artiste / UI designer
- 1 sound designer (freelance)
- 1 community manager (à partir du soft launch)

---

## 🎯 Critical path & risques

### 🔴 Risques critiques
1. **Saturation du marché** : le auto-battler mobile est encombré → différenciation forte indispensable
2. **Difficulté de balance** : économie F2P + équilibrage des factories + scaling endurance = très technique
3. **Coût d'acquisition** : CPI mobile en hausse constante → budget UA à prévoir
4. **Solo / petite équipe** : si tu fais tout seul, prévoir 18-24 mois jusqu'au global launch

### 🟢 Atouts
1. **Concept éprouvé** mais peu exploité sur mobile (gap à prendre)
2. **Mécanique unique** des factories connectées par chemins
3. **Retours du jeu original** nous indiquent précisément où corriger
4. **Marché auto-battler** = audience établie et engagée

---

## 💰 Budget approximatif (ordre de grandeur)

| Phase | Hypothèse solo | Hypothèse petite équipe (3 pers) |
|-------|----------------|-----------------------------------|
| Phase 0-1 | 0€ (ton temps) | 15-30k€ |
| Phase 2 | 2-5k€ (assets, outils) | 50-80k€ |
| Phase 3 | 5-15k€ (assets premium, sound) | 100-200k€ |
| Phase 4 | 3-10k€ (UA test) | 20-50k€ |
| Phase 5 | Variable (UA scale) | Variable |
| **Total avant scale** | **10-30k€** | **200-400k€** |

---

## 🎯 Prochaines actions immédiates (Phase 2 — Prototype V0)

> Scope V0 figé : voir `DECISIONS.md` (Session 2). Prompts sprites : voir `08-art-direction/PROMPTS-SPRITES.md`.

1. **Moi (Claude principal)** : setup tech HTML5/JS + premier écran jouable avec placeholders géométriques
2. **Toi (en parallèle)** : lancer la génération des sprites PNG via un autre Claude Code (en pointant sur `08-art-direction/PROMPTS-SPRITES.md`)
3. **Itération continue** : remplacer les placeholders par les sprites au fur et à mesure de leur arrivée
4. **À la fin du V0** : test joueur (toi) → décision Go/No-Go pour V0b (placement libre) ou V1 (méta-progression)

---

## 📊 Métriques de suivi (au fil du projet)

À tenir à jour dans un fichier dédié à créer plus tard :
- Heures investies par phase
- Décisions clés prises (avec date + raisonnement)
- Itérations sur le pitch / le scope
- Coûts engagés
