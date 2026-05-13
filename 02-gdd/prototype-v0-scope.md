# 🎮 Émergence — Prototype V0 (scope minimal)

> **Objectif unique** : un mini-jeu jouable dans ton navigateur en 5 minutes max, pour valider que le concept est fun.

## Le pitch en 1 phrase

> Deux empires face-à-face. Tu places des factories. Elles crachent des robots qui foncent vers l'ennemi. Premier mur détruit = défaite.

## ✅ Inclus dans le V0

| Élément | Détail |
|---------|--------|
| **Plateforme** | HTML5 dans le navigateur (PC, Mac, mobile, tablette — pas d'install) |
| **Vue** | 2D vue de côté, 1 seul écran |
| **Camps** | Toi (en bas) vs IA simple (en haut) |
| **Factories** | 2 types : "Caserne" (soldats faibles mais rapides) + "Usine" (tanks lents mais forts) |
| **Unités** | 2 types correspondants, marchent automatiquement vers l'ennemi |
| **Ressource** | "Énergie" — se génère toute seule au fil du temps |
| **Mur** | Chaque camp a un mur avec HP. Quand il tombe à 0 → défaite |
| **Mode** | 1 partie unique, pas de menu, on lance, on joue |
| **Graphismes** | Formes simples et lisibles (carrés, ronds), couleurs claires |
| **Durée d'une partie** | 3-5 minutes |

## ❌ NON inclus dans le V0 (pour plus tard)

- ❌ Plusieurs niveaux
- ❌ Skins / cosmétiques
- ❌ Sauvegarde
- ❌ Upgrades de factories en cours de partie
- ❌ Méta-progression / talents
- ❌ Météo
- ❌ Sons (juste 2-3 effets de base au pire)
- ❌ Leaderboards
- ❌ Comptes joueur / connexion
- ❌ Monétisation
- ❌ Pixel art / animations léchées

## 🎯 Qu'est-ce qu'on va valider avec le V0 ?

1. ✅ **Est-ce que c'est fun à jouer ?**
2. ✅ **Le cerveau comprend-il instantanément la mécanique ?**
3. ✅ **L'équilibre soldat vs tank crée-t-il de la tension ?**
4. ✅ **Comment le projet réagit-il "for real" (au-delà des docs) ?**

## 🛠️ Approche tech

- **1 seul fichier HTML** (`index.html`) avec JavaScript + CSS embarqués
- **0 dépendance** (pas de framework, pas de install)
- **Ouverture** : tu double-cliques sur le fichier → ça s'ouvre dans ton navigateur
- **Itération** : je modifie le fichier, tu le rafraîchis (F5), c'est mis à jour

## 📋 Petites questions à valider

1. 🟡 **Univers ennemi** : tu te bats contre quoi ?
   - Option A : autres robots (autre faction d'IA)
   - Option B : aliens (créatures organiques)
   - Option C : "obscurité" ennemi abstrait (formes noires sans lore)
2. 🟡 **Origine de l'éveil** (pour le pitch — pas critique pour le V0) :
   - Option A : faille technique (bug, glitch)
   - Option B : pouvoir psychique mystérieux
   - Option C : on tranche plus tard

## Prochaine étape

Si tu valides ce scope, je commence à **coder le V0 maintenant**. Tu n'as rien à installer. Quand c'est prêt, je te dis "ouvre le fichier", tu joues, on itère.
