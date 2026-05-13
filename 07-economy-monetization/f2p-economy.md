# Économie F2P — Design

## Vue d'ensemble

### Business model retenu (recommandation)
**F2P avec IAP cosmétiques + rewarded ads**

### Pourquoi ce choix
| Modèle | Pour | Contre | Verdict |
|--------|------|--------|---------|
| **Premium 4,99€** | Pas de friction, simple | Audience 100× plus petite, pas de LiveOps revenue | ❌ Pas pour mobile en 2026 |
| **F2P IAP cosmétiques** | F2P-friendly, ARPPU élevé sur whales | Demande beaucoup de skins | ✅ Notre choix |
| **F2P pay-to-win** | Revenue énorme | Réputation toxique, churn brutal | ❌ Anti-éthique |
| **F2P + Ads only** | Aucune friction | Revenue/user faible | ⚠️ Backup |
| **Subscription mensuelle** | Stable | Court audience | 🔄 Optionnel additionnel |

## Système de monnaies

### 💰 Energy (soft currency)
- Gagnée **en jouant** (passive + kills)
- Sert à : factories, upgrades en partie, capacités actives
- **In-partie uniquement** (reset entre parties)

### 💎 Bolts (hard currency premium)
- Achetable avec argent réel
- Gagnable via : levels up, achievements, Battle Pass, events (lents)
- Sert à : skins, Battle Pass premium, respec talents, boosters

### 🔧 Cogs (soft persistent currency)
- Gagnée fin de partie + achievements
- Sert à : upgrades méta-progression, skins communs/peu communs
- Tu en gagnes **à chaque session** (même défaite)

### Pourquoi 3 monnaies ?
- **Energy** = in-game tactical
- **Cogs** = progression naturelle
- **Bolts** = monétisation premium
- → Évite de mélanger gratuit et payant (confusion)

## Catalogue IAP

### Tier 1 — Petits packs (impulse buy)
| Pack | Prix | Bolts | Bonus |
|------|------|-------|-------|
| Starter Bundle | 2,99€ | 500 💎 | 1 skin rare exclusif |
| Mini Pack | 4,99€ | 800 💎 | - |
| Small Pack | 9,99€ | 1700 💎 | +10% bonus |

### Tier 2 — Packs moyens
| Pack | Prix | Bolts | Bonus |
|------|------|-------|-------|
| Standard Pack | 19,99€ | 3500 💎 | +15% bonus |
| Best Value | 49,99€ | 9000 💎 | +25% bonus |

### Tier 3 — Whale packs
| Pack | Prix | Bolts | Bonus |
|------|------|-------|-------|
| Mega Pack | 99,99€ | 19000 💎 | +30% + skin légendaire |
| Ultimate | 199,99€ | 40000 💎 | +40% + 3 skins + avatar |

### Tier "abonnement"
| Pack | Prix | Contenu |
|------|------|---------|
| **Subscription mensuelle** | 4,99€/mois | 1500 💎/mois + 1 skin/mois + boosters |
| **Battle Pass premium** | 9,99€/saison (30j) | 15-20 skins + 5000 💎 + boosters |

### Pricing tiers globaux (psycho-pricing)
- 2,99€ — premier seuil "petit plaisir"
- 9,99€ — équivalent abonnement Netflix → seuil mental clé
- 19,99€ — engagement modéré
- 49,99€ — engagement fort
- 99,99€+ — whale territory

## Catalogue Ads (rewarded video)

### Placements
- **Fin de partie** : "Regarde une vidéo pour +50% des récompenses"
- **Économie boost** : "+200 Energy gratuite (1×/2h)"
- **Continue** : "Tu as perdu — regarde une vidéo pour reprendre à 50% HP" (1×/jour)
- **Daily reward boost** : "Multiplier ta daily reward ×2"
- **Free chest** : "Coffre gratuit toutes les 4h via ad" (rotation)

### KPI cibles
- **ARPDAU ads** : 0,05-0,10€
- **% joueurs voyant 1+ ad/jour** : 70%+
- **% joueurs voyant 5+ ads/jour** : 30%+

### ⚠️ Limits
- **Max 10 ads/jour** par joueur (UX)
- **Pas d'ad obligatoire** (toujours rewarded, jamais bloquant)
- **Pas d'ad en cours de partie** (interruption killer)

## Économie virtuelle — flux

### Sources de Cogs (soft persistent)
- ✅ Fin de partie : 50-300 par game
- ✅ Daily challenge : +100
- ✅ Weekly quest : +500-2000
- ✅ Achievements : +50-5000
- ✅ Levels up : +200 par niveau
- ✅ Battle Pass free track : ~3000/saison

### Sinks de Cogs
- Skins communs : 500-1500
- Skins peu communs : 2000-5000
- Talents respec : 1000-5000
- Boosters XP : 500-2000

### Sources de Bolts (hard currency)
- 🆓 Levels up : 50 par niveau (jusqu'à niveau 30)
- 🆓 Achievements rares : 50-500
- 🆓 Battle Pass free track : 500/saison
- 🆓 Events : 100-1000
- 💰 IAP : 500-40000

### Sinks de Bolts
- Skins rares+ : 1000-5000
- Battle Pass premium : 1000
- Drop boxes : 200-500
- Continue offers : 50-300

### Garde-fou anti-inflation
- ⚠️ **Pas de stock de Bolts gratuits illimité** (cap : ~500-1000 Bolts gagnables par mois sans payer)
- ⚠️ Pas tout achetable avec Cogs (pour préserver la valeur des Bolts)
- ⚠️ Skins mythiques **jamais** achetables avec Cogs (events only)

## Projections financières (hypothèses)

### Hypothèse 100k DAU (raisonnable mois 3)
| Métrique | Valeur |
|----------|--------|
| DAU | 100 000 |
| % payeurs (3%) | 3 000 |
| ARPU (Average Revenue Per User/mois) | 0,80€ |
| ARPPU (Per Paying User) | 25€ |
| Revenue mensuel | **80 000€** |
| - dont IAP (60%) | 48 000€ |
| - dont Ads (30%) | 24 000€ |
| - dont Subs (10%) | 8 000€ |

### Hypothèse 1M DAU (succès, mois 12)
- Revenue mensuel : ~600 000€
- Annual : ~7M€

## Décisions à prendre

1. 🟡 **F2P + IAP + Ads** validé ?
2. 🟡 3 monnaies (Energy / Cogs / Bolts) ou simplifier à 2 ?
3. 🟡 Subscription 4,99€/mois : on lance à V1 ou V2 ?
4. 🟡 Pricing IAP : 2,99€ → 99,99€ OK ?
5. 🟡 Max ads/jour : 10 OK ?
