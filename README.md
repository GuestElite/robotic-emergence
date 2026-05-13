# 🤖 Projet de jeu mobile inspiré de Robotic Emergence

> **Statut** : Phase 0 — Vision & Différenciation
> **Date de démarrage** : 2026-05-12
> **Working title** : *Project RE* (à nommer définitivement — cf. `01-vision-pitch/working-name.md`)

## 🚀 Lancer le prototype (Windows)

Double-clique sur **`launch-prototype.bat`** à la racine du projet.
Le serveur HTTP démarre sur `http://localhost:8765/` et le navigateur s'ouvre automatiquement sur le prototype.

Pour arrêter : ferme la fenêtre du terminal (ou Ctrl+C).

**Dépendances** : le lanceur essaie dans l'ordre `python` → `py` → `node` (npx http-server). Au moins l'un des trois doit être installé. Python recommandé.

## Hub du projet

Cet espace centralise toute la réflexion produit, design et roadmap pour développer notre version mobile inspirée du jeu Flash *Robotic Emergence* (Rob Scherer / Armor Games, 2010).

## 📂 Navigation rapide

| Dossier | Contenu | Statut |
|---------|---------|--------|
| [ROADMAP.md](ROADMAP.md) | **🎯 Roadmap maître du projet** | ⏳ V1 |
| [source/](source/) | Documentation du jeu d'origine + retours communauté | ✅ Complet |
| [01-vision-pitch/](01-vision-pitch/) | Différenciation, pivot narratif, nom du jeu | ⏳ V1 — à co-décider |
| [02-gdd/](02-gdd/) | Game Design Document central | 🚧 Squelette posé |
| [03-creativity/](03-creativity/) | Brainstorms, idées, inspirations | 🚧 Amorcé |
| [04-skins/](04-skins/) | Système de skins (monétisation + collection) | 🚧 Concept |
| [05-talents/](05-talents/) | Arbre de talents (méta-progression) | 🚧 Concept |
| [06-events/](06-events/) | Événements LiveOps (rétention) | 🚧 Concept |
| [07-economy-monetization/](07-economy-monetization/) | F2P, IAP, ads, économie virtuelle | 🚧 Concept |
| [08-art-direction/](08-art-direction/) | Style visuel, palette, mood board | ⏸️ À décider |
| [09-tech-stack/](09-tech-stack/) | Moteur, frameworks, outils | ⏸️ À décider |
| [10-ux-mobile/](10-ux-mobile/) | UX/UI mobile, wireframes | ⏸️ À décider |

## 🎯 Vision en 1 phrase

> Un **lane-based auto-battler** mobile, inspiré du concept "factories qui produisent des robots auto-combattants reliés par chemins", **corrigeant les 4 défauts majeurs** du jeu original (endurance cassée, trop facile, narration pompée, zéro rétention).

## ⚡ Les 4 leviers de différenciation (vs original)

1. **Endurance scaling exponentiel** + leaderboards (vs endurance cassé)
2. **Méta-progression riche** : talents, skins, prestige (vs zéro rétention)
3. **Univers narratif original** (vs pompage d'Animatrix)
4. **Mobile-first UX** : portrait, sessions courtes, push, social (vs Flash desktop)

## 📋 Convention de travail

- **Chaque doc commence par un objectif clair** en haut
- **Décisions ouvertes** marquées 🟡 ⚠️ ou "À décider ensemble"
- **Versions** : V0 (brouillon), V1 (validé), V2 (itéré)
- **Langue** : français pour la doc interne, anglais pour les assets jeu si besoin
