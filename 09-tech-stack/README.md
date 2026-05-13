# 09 — Tech Stack

## Objectif

Choisir les **technologies** pour développer le jeu (moteur, backend, outils).

⚠️ **À ne PAS faire trop tôt** : décision liée au team setup et au scope.

## Statut actuel
⏸️ **Bloqué** — en attente de la Phase 0 et de la décision team (solo / petite équipe).

## Décisions à prendre

### 1. 🟡 Game engine
| Engine | Pour | Contre | Recommandé pour |
|--------|------|--------|-----------------|
| **Unity** | Standard mobile, communauté énorme, multi-plateforme | C# lourd, monétisation Unity Ads, plus cher | Équipe 2+, ambitieux |
| **Godot 4** | Open source, gratuit, léger, GDScript simple | Communauté plus petite, moins de plugins mobile | Solo dev pragmatique |
| **GameMaker** | Excellent pour 2D, drag-and-drop pour proto | Limité pour scale, propriétaire | Prototypes rapides |
| **Flutter + Flame** | Web + mobile single codebase | Moins puissant pour games | À éviter pour ce jeu |
| **React Native + canvas** | Dev mobile classique | Pas un game engine | À éviter |

### 🎯 Recommandation : **Godot 4**
- Gratuit (vs Unity Pro à 1.5k€/an post-100k$)
- Parfait pour 2D
- Léger (build APK < 50MB possible)
- Communauté active
- ⚠️ Petit risque : moins de tooling backend out-of-the-box

### 2. 🟡 Backend (cloud save + leaderboards + analytics)
| Service | Pour | Contre |
|---------|------|--------|
| **Firebase** | Tout-en-un Google, free tier généreux, push intégré | Vendor lock-in Google |
| **Supabase** | Open source, PostgreSQL, gratuit jusqu'à 50k MAU | Plus de setup |
| **PlayFab** (Microsoft) | Spécialisé games, leaderboards prêts | Pricing rapide à scale |
| **GameSparks** (Amazon) | Idem PlayFab | Idem |
| **Self-hosted** (VPS + Node/PHP) | Total control | Beaucoup de boulot |

### 🎯 Recommandation : **Firebase**
- Auth, Firestore, Cloud Functions, Analytics, Crashlytics, A/B testing, Remote Config = **tout inclus**
- Gratuit jusqu'à 50k MAU
- Push notifications natif
- ⚠️ Risque : pricing scale (5-10€/k DAU à 100k+)

### 3. 🟡 Analytics & marketing
- **Firebase Analytics** (gratuit) : couvert
- **Adjust** ou **AppsFlyer** : attribution UA (payant, ~1k€/mois)
- **Sensor Tower** ou **data.ai** : benchmark concurrents

### 4. 🟡 Monétisation
- **Unity Ads / IronSource / AdMob** : ads rewarded
- **AppLovin** : best fit auto-battler
- **In-App Purchases** : iOS StoreKit + Google Play Billing

### 5. 🟡 CI/CD
- **GitHub Actions** : build automatique iOS + Android
- **Fastlane** : déploiement automatisé stores
- **AltStore / TestFlight** : distribution interne

### 6. 🟡 Outils annexes
- **Aseprite** : pixel art
- **Spine** ou animations Godot natives
- **Audacity / FL Studio** : sons
- **Figma** : UI design + wireframes
- **Notion** : doc projet
- **GitHub** : repo
- **Discord** : community + dev

## Stack recommandée (synthèse)

```
┌─────────────────────────────────────────────────┐
│  GAME ENGINE : Godot 4                          │
│  LANGUAGE    : GDScript + C# (perf-critical)    │
├─────────────────────────────────────────────────┤
│  BACKEND     : Firebase                         │
│  - Auth      : Firebase Auth (anon + social)    │
│  - Save      : Firestore                        │
│  - Funcs     : Cloud Functions (events, anti-cheat) │
│  - Push      : FCM                              │
│  - Analytics : Firebase Analytics + Crashlytics │
│  - A/B test  : Firebase Remote Config           │
├─────────────────────────────────────────────────┤
│  MONÉTISATION                                   │
│  - Ads       : AppLovin MAX                     │
│  - IAP       : RevenueCat (wrapper iOS+Android) │
├─────────────────────────────────────────────────┤
│  ATTRIBUTION : AppsFlyer (post-Phase 4)         │
│  CI/CD       : GitHub Actions + Fastlane        │
└─────────────────────────────────────────────────┘
```

## Coûts mensuels estimés (par phase)

| Phase | Coûts tech |
|-------|------------|
| Phase 0-1 | 0€ (tools gratuits + Aseprite 20€ one-shot) |
| Phase 2 | 0-50€/mois (TestFlight gratuit, Firebase free tier) |
| Phase 3 | 50-200€/mois (asset packs, Firebase early scale) |
| Phase 4 | 200-1500€/mois (AppsFlyer, UA test) |
| Phase 5 | 1500-10000€/mois selon scale |

## Décisions à prendre

1. 🟡 Unity ou Godot ?
2. 🟡 Firebase ou alternative ?
3. 🟡 Tu codes solo ou tu vas embaucher / outsourcer ?
