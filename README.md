# 🤖 Projet de jeu mobile inspiré de Robotic Emergence

> **Statut** : Phase 0 — Vision & Différenciation
> **Date de démarrage** : 2026-05-12
> **Working title** : *Project RE* (à nommer définitivement — cf. `01-vision-pitch/working-name.md`)

## 🌐 Lien live

**▶︎ [robotic-emergence.vercel.app](https://robotic-emergence.vercel.app)**

Mis à jour à chaque `git push` sur `main` (une fois l'intégration GitHub activée — voir section [Auto-deploy](#-auto-deploy-vercel) ci-dessous).

## 🚀 Lancer le prototype

Le serveur HTTP local démarre sur `http://localhost:8765/` et le navigateur s'ouvre automatiquement. Pour arrêter : ferme la fenêtre du terminal (ou Ctrl+C).

### 🪟 Windows
Double-clique sur **`launch-prototype.bat`** à la racine du projet.

### 🍎 macOS
Double-clique sur **`launch-prototype.command`** à la racine.
Si macOS refuse de l'ouvrir (bouton « Ouvrir » grisé) :
```bash
chmod +x launch-prototype.command
```
puis re-double-clique. Si l'avertissement Gatekeeper persiste : clic droit → **Ouvrir** → **Ouvrir**.

### 🐧 Linux
Depuis un terminal à la racine du projet :
```bash
./launch-prototype.command
```

### Dépendances
Le lanceur essaie dans l'ordre `python3` → `python` → `node` (npx http-server).
Au moins l'un des trois doit être installé. **Python 3 recommandé** (pré-installé sur la plupart des macOS et Linux).

### Sans lanceur (n'importe quel OS)
Tu peux aussi lancer manuellement depuis le dossier du projet :
```bash
python3 -m http.server 8765
# puis ouvre http://localhost:8765/prototype/
```

## ☁️ Auto-deploy Vercel

Le prototype est déployé en production sur **[robotic-emergence.vercel.app](https://robotic-emergence.vercel.app)**.

### Activer l'auto-deploy sur push (à faire une fois)
1. Va sur [vercel.com/julienconciergelite-7113s-projects/robotic-emergence](https://vercel.com/julienconciergelite-7113s-projects/robotic-emergence/settings/git)
2. Section **Git** → **Connect Git Repository** → sélectionne `GuestElite/robotic-emergence`
3. Vercel installera l'app GitHub si nécessaire (autoriser l'accès)
4. Une fois lié : chaque push sur `main` déclenche un déploiement prod, chaque push sur une autre branche / PR génère une preview URL

### Déploiement manuel via CLI (si auto-deploy non activé)
```bash
cd robotic-emergence
vercel --prod
```
La config `vercel.json` :
- redirige `/` vers `/prototype/`
- no-cache sur les fichiers du proto (pour voir les updates direct)
- cache court (1h) sur les sprites

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
