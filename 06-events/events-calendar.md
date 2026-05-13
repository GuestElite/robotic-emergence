# Calendrier d'événements — Concept

## 🔁 Rythme global

```
JOUR ──► Daily Challenge (1 défi quotidien rotatif)
SEMAINE ──► Weekly Quest (objectifs hebdomadaires)
2 SEMAINES ──► Event thématique (durée 7-14j)
MOIS ──► Battle Pass (saison de 30j)
TRIMESTRE ──► Major Update (nouveau contenu)
ANNÉE ──► Anniversary + Major Saisons
```

## 📅 Daily Challenge (quotidien)

### Format
- **1 défi par jour**, change à minuit local
- Durée moyenne : **15-30 min** de jeu
- Récompense : 200 XP + 1 coffre commun

### Types de défis
1. **Modificateur de partie** : "Termine un niveau avec uniquement des Sniper Bots"
2. **Performance** : "Gagne 3 parties en moins de 5 min"
3. **Endurance** : "Survis 15 minutes en mode endurance"
4. **Collection** : "Tue 200 Mini Mummies"
5. **Économie** : "Termine une partie avec 1000$ inutilisés"

### Pourquoi ça marche
- 🔁 **Trigger de retour quotidien**
- 🎯 Objectif **clair et atteignable**
- 🆓 **100% gratuit**

---

## 📅 Weekly Quest (hebdomadaire)

### Format
- **5-7 quêtes** disponibles toute la semaine
- Reset le lundi à 9h locale
- Récompense cumulative : 1000-2000 XP + gems + 1 skin garanti

### Exemples
- "Gagne 10 parties en mode campagne"
- "Construit 50 factories au total"
- "Termine 7 daily challenges"
- "Atteins le niveau 10 en endurance"

---

## 📅 Event thématique (bi-hebdo)

### Format type
- Durée : **7 à 14 jours**
- Lore thématique (ex: "L'invasion des Saw Bots")
- **Mécaniques exclusives** (ex: orage permanent, ou faction ennemie spéciale)
- **Pass d'event** : 100 niveaux à compléter pendant l'event
- Récompenses : skins exclusifs, currency, talents temporaires

### 8 formats d'event prévus

#### 1. 🌪️ Storm Front
- Tous les niveaux ont orage permanent
- Buff aux unités non-conductives
- Reward : skin "Tempest" (rare)

#### 2. 👹 Boss Rush
- Suite de 10 boss à enchaîner
- Loot scalant
- Reward : skin "Boss Slayer" + gems

#### 3. 🏗️ Factory Frenzy
- Tu peux placer 2× plus de factories
- Maps spéciales
- Reward : skin "Mass Producer"

#### 4. 🤖 Robo-Royale
- Mode "battle royale asynchrone" : 30 joueurs, sur 2j
- Tu défends ton fort vs les attaques des autres
- Top 10% : skin "Survivor"

#### 5. 💀 Survival Mode
- Mode endurance avec scaling 2× plus rapide
- Records → leaderboards globaux
- Top 100 : skin "Endurance King"

#### 6. ⚡ Speed Run
- Niveaux à finir le plus vite possible
- Leaderboards par niveau
- Top 1% : skin "Lightning"

#### 7. 🎁 Anniversary
- Événement annuel
- Toutes les anciennes raretés + reskins
- Gros pack de gems offert

#### 8. 🎃 Saisonnier
- Halloween, Noël, été, etc.
- Thèmes spéciaux (skins, sons, UI)

---

## 📅 Battle Pass (mensuel)

### Format
- **Saison de 30 jours**
- **100 niveaux** à compléter
- 2 tracks : **Free** + **Premium** (9,99€)

### Free track (40 récompenses)
- Currency soft
- 1 skin commun garanti
- 2-3 skins peu communs

### Premium track (60 récompenses additionnelles)
- 5-8 skins rares à mythiques
- Currency hard
- Boosters XP
- Avatar exclusif

### Vitesse de progression
- Joueur casual : 50-60 niveaux/saison
- Joueur moyen : 80-90 niveaux/saison
- Joueur hardcore : 100/100 facilement

→ Design pour **récompenser le retour quotidien** sans punir les casual.

---

## 📅 Major Update (trimestriel)

### Format
- Tous les 3 mois
- Apporte du **contenu permanent** :
  - 1 nouveau niveau/biome
  - 1 nouvelle faction
  - 2-3 nouvelles unités
  - 1-2 nouvelles factories
  - Refresh de balance

### Communication
- **Roadmap publiée 1 mois à l'avance**
- Trailer vidéo
- Patch notes complètes
- Compensations pour les joueurs actifs

---

## 📅 Annual Event (Anniversaire)

### Format
- **Anniversaire du jeu** (1er anniversaire = grosse opération)
- Durée : 14-30 jours
- Récompenses **massives** (skins légendaires, gems gratuites, packs)
- Rétro narrative

### Pourquoi
- 🎉 Re-engager les **lapsed players** (anciens qui ont quitté)
- 📣 Coup de pub annuel (trailers, presse)
- 💰 Pic de revenue annuel

---

## 📊 Calendrier type — Mois 1 (exemple)

```
Sem 1 (1-7)    : Lancement BP Saison 1 + Event "Forge des âmes"
Sem 2 (8-14)   : Continuation BP + Daily challenges
Sem 3 (15-21)  : Event "Storm Front" (mid-month)
Sem 4 (22-30)  : Boss Rush final + Fin BP
```

## 📊 Calendrier type — Année 1 (exemple)

```
JAN — BP1 + Event "Genèse"
FÉV — BP2 + Event "Saint-Valentin: Heart of Steel"
MAR — BP3 + Major Update v1.1
AVR — BP4 + Event "Spring Bloom"
MAI — BP5 + Event "Anniversary Preview"
JUN — BP6 + Major Update v1.2 + Event "Summer Volcano"
JUL — BP7 + Event "Robo-Royale Summer"
AOU — BP8 + Event "Endless Dunes"
SEP — BP9 + Major Update v1.3 + Event "Equinox"
OCT — BP10 + Event "Halloween: Specter Bots"
NOV — BP11 + Event "Boss Rush"
DEC — BP12 + Event "Holiday Robotic Tales" + ANNIVERSARY
```

## ⚙️ Outils tech à prévoir

- **CMS d'events** : push les events sans déployer une nouvelle version d'app
- **Remote config** : tweaker les valeurs (drops, durées) à chaud
- **A/B testing** : tester durées, récompenses, mécaniques
- **Analytics dashboard** : suivre l'engagement par event
- **Push notif system** : annoncer les events à J-3, J-1, J+1

## Décisions à prendre

1. 🟡 OK avec ce rythme (daily + weekly + bi-monthly + monthly + quarterly + yearly) ?
2. 🟡 Battle Pass à 9,99€/mois ou autre prix ?
3. 🟡 Quels events prioritaires pour le launch (sans calendrier complet) ?
4. 🟡 Tu veux pre-build 2-3 events avant le launch (safety net) ?
