# Arbre de Talents — Design

## Vue d'ensemble

### Concept
Un **arbre de talents persistant** entre les parties qui :
- Améliore tes capacités à long terme
- Offre des **trade-offs stratégiques** (pas que des +10%)
- Donne une **progression visible** session après session

### Inspiration
- Vampire Survivors (méta-progression)
- Path of Exile (arbre passif)
- Diablo III (paragon levels)
- Slay the Spire (ascensions)

## Structure de l'arbre

```
                      [ROOT — Awakening]
                       /        |        \
                      /         |         \
              [PRODUCTION]  [COMBAT]   [SURVIVAL]
                /    \       /    \      /    \
              ...    ...    ...   ...   ...   ...
              ↓       ↓
            [SPÉCIALISATIONS — niveau 20+]
```

### 3 branches principales

#### 🏭 Branche Production
Optimise les factories.
- Augmente la vitesse de spawn
- Réduit le coût des factories
- Débloque des factories rares
- Synergies entre factories

#### ⚔️ Branche Combat
Optimise les unités.
- Augmente les stats des unités
- Débloque des effets de tir spéciaux
- Améliore les capacités actives
- Synergies entre unités

#### 🛡️ Branche Survival
Optimise la défense.
- Augmente l'HP du mur
- Auto-réparation passive
- Bouclier ponctuel
- Effet "second wind" (revive)

### Niveau max
- **Niveau 50** : fin de l'arbre principal
- **Niveau 50+** : système de prestige (cf. ci-dessous)

## Système de XP

### Sources d'XP
- ✅ Fin de partie (victoire = 100 XP base, défaite = 25 XP)
- ✅ Daily challenges (+200 XP)
- ✅ Quêtes hebdo (+500 XP)
- ✅ Achievements (+50-2000 XP variable)
- ✅ Events (+1000-5000 XP)

### Courbe XP par niveau
- Niveau 1 → 2 : 100 XP
- Niveau 10 → 11 : 1 000 XP
- Niveau 25 → 26 : 5 000 XP
- Niveau 50 → 51 : 25 000 XP (gate vers prestige)

### Vitesse de progression cible
- **Joueur casual** (1 session/jour) : niveau 20 en 2 mois
- **Joueur moyen** (3 sessions/jour) : niveau 35 en 2 mois
- **Joueur hardcore** (10 sessions/jour) : niveau 50 en 2 mois

## Exemples de nœuds (échantillon)

### Branche Production
| Talent | Effet | Niveau requis |
|--------|-------|---------------|
| **Fabrication accélérée I** | +5% vitesse spawn factories | 2 |
| **Fabrication accélérée II** | +10% vitesse spawn factories | 8 |
| **Économie d'échelle** | -10% coût factories | 5 |
| **Synergie verte** | Green Smoke Plant adjacente à une autre = +15% spawn | 12 |
| **Maître bâtisseur** | Tu peux placer 1 factory de plus | 20 |
| **Forge éternelle** | Factories ne se ralentissent plus sous la pluie | 30 |

### Branche Combat
| Talent | Effet | Niveau requis |
|--------|-------|---------------|
| **Affûtage I** | +5% damage tous robots | 2 |
| **Vitesse de tir** | +10% RPM | 5 |
| **Portée étendue** | +15% range | 8 |
| **Coup critique** | 5% de chances de x2 damage | 15 |
| **Frénésie** | À 30% HP, robots tirent 2× plus vite | 25 |
| **Vengeance** | Robot tué = +1% damage temporaire (max 50%) | 35 |

### Branche Survival
| Talent | Effet | Niveau requis |
|--------|-------|---------------|
| **Mur renforcé I** | +20 HP au mur | 2 |
| **Réparation auto** | +1 HP/sec au mur | 8 |
| **Bouclier d'urgence** | À 50% HP, bouclier 50 HP gratuit (1×/partie) | 15 |
| **Seconde chance** | Si tu perds, revive à 100 HP (1×/partie, cooldown 24h) | 30 |
| **Immortel** | Mur ne descend pas en dessous de 10 HP pendant 5s (1×/partie) | 40 |

## Système de Prestige (niveau 50+)

### Concept
Une fois niveau 50 atteint :
- Tu peux **prestige** (réinitialiser tout)
- Tu gardes **un point de prestige permanent**
- Les points de prestige donnent des **bonus passifs cumulatifs**

### Bonus de prestige (linéaires)
- +1% money rate par point (max 100)
- +1% XP gain par point
- Un nouveau badge cosmétique tous les 10 points
- Skin légendaire exclusif tous les 25 points

### Pourquoi c'est addict
- 🔁 Bouclage des 50 niveaux
- 🎯 Objectif **chiffré et visible** ("je suis P12, je vise P25")
- 🏆 **Statut social** dans les leaderboards
- 💰 Aucun pay-to-win (juste le temps)

## Économie de l'arbre

### Coût par point de talent
- 1 point de talent débloqué par niveau (gratuit)
- Tu peux **acheter des respec** : 1ère gratuite, puis 100 gems

### Garde-fou anti pay-to-win
- ❌ Tu ne peux PAS acheter de l'XP pour skipper
- ✅ Tu peux acheter **un boost XP temporaire** (×1.5, 24h) = OK
- ✅ Tu peux acheter **un respec** (changer ta build) = OK

## Décisions à prendre

1. 🟡 Niveau max = 50 ou autre ?
2. 🟡 3 branches ou plus (4 avec une branche "Économie") ?
3. 🟡 Prestige avec reset complet ou conservation partielle ?
4. 🟡 Pricing du respec ?
