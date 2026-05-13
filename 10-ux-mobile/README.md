# 10 — UX Mobile

## Objectif

Designer l'**expérience utilisateur mobile** : wireframes, navigation, gestes, accessibilité.

⚠️ **À ne PAS faire trop tôt** : se construit en Phase 1 après le GDD.

## Statut actuel
⏸️ **Bloqué** — en attente du GDD V1 et des décisions tech.

## Décisions à prendre

### 1. 🟡 Orientation
- **Portrait 9:16** ✅ Recommandation forte (80% des cas d'usage mobile)
- **Paysage 16:9** : option supplémentaire pour les gros écrans ?

### 2. 🟡 Architecture des écrans (15 écrans clés)

```
┌─ Splash / Login
├─ Home / Hub
│   ├─ Play (campagne / endurance / event)
│   ├─ Talents
│   ├─ Skins / Inventaire
│   ├─ Battle Pass
│   ├─ Shop
│   ├─ Events
│   ├─ Daily / Weekly
│   ├─ Profil / Settings
│   └─ Leaderboards
├─ Level Select (campagne)
├─ Game (in-match)
├─ Pause menu
├─ Victory / Defeat screen
└─ Recap stats
```

### 3. 🟡 Patterns mobiles à respecter
- ✅ **Bottom nav bar** (Home / Play / Shop / Events / Profile)
- ✅ **One-thumb reachability** (tout dans la zone du pouce)
- ✅ **No buried features** (max 3 taps depuis Home)
- ✅ **Haptic feedback** sur actions clés
- ✅ **Loading screens** utiles (tips, lore, stats)

### 4. 🟡 Onboarding (Phase critique)
**Plante du jeu original** : prologue 3-minutes pas skippable.

Notre approche :
1. Login skip-friendly (anonyme + social link plus tard)
2. **Skip intro option** dès le 1er coup
3. **Tutoriel interactif** (5 min max) : 1 niveau guidé
4. **Reward immédiate** : 1 skin offert à la fin du tutoriel
5. **2e session** : déblocage progressif des features (FOMO du tutoriel)

### 5. 🟡 Accessibilité
- ✅ Daltonisme (couleurs codées + symboles)
- ✅ Sous-titres pour audio
- ✅ Mode "one-handed" (tout à portée du pouce)
- ✅ Police lisible (>14pt)
- ✅ Mode "réduire les animations"

## Files à créer plus tard

- `wireframes/` — Figma exports
- `user-flows.md` — flux utilisateurs (login, premier match, premier IAP, etc.)
- `interaction-patterns.md` — taps, drags, swipes, long-press
- `accessibility-guide.md` — checklist a11y
- `loading-strategy.md` — gestion des temps de chargement
- `error-states.md` — UI en cas d'erreur réseau

## Inspiration UX

### Brillant
- **Marvel Snap** : navigation hub parfaite, friction zéro
- **Royal Match** : onboarding magistral
- **Vampire Survivors** : run flow ultra-fluide
- **Slay the Spire mobile** : informations denses bien organisées

### À éviter
- ❌ Pop-ups agressives (notifs IAP toutes les 5 min)
- ❌ Multi-currency confusion
- ❌ Menus profonds (> 3 taps)
- ❌ Forçage social (login obligatoire avec Facebook)

## Décisions à prendre

1. 🟡 Portrait only ou portrait + paysage ?
2. 🟡 Login obligatoire ou anonyme OK ?
3. 🟡 Bottom nav bar ou drawer menu ?
4. 🟡 Skip intro autorisé dès le départ ?
