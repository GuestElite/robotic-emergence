# Robotic Emergence — Mécaniques de gameplay

## La boucle de jeu (Core Loop)

```
1. Tu commences avec une base (mur de bois) en bas de l'écran
2. L'ennemi a sa base en haut de l'écran
3. Tu gagnes du $ passivement avec le temps + à chaque robot ennemi tué
4. Tu achètes des FACTORIES avec ton $
5. Chaque FACTORY produit AUTOMATIQUEMENT un type d'unité spécifique
6. Les unités sortent de la factory et FONCENT VERS LE MUR ENNEMI
7. Elles tirent sur les unités ennemies qu'elles croisent + tapent le mur en bout de course
8. Tu peux UPGRADE chaque factory (6 axes : Creation Rate / Health / Power / Shoot Rate / Speed / Range)
9. Tu peux VENDRE une factory pour récupérer du $
10. Le mur fait 200 HP — quand il tombe à 0, la base perd la partie
```

## Règles clés

### Le système de chemins (UNIQUE & DIFFÉRENCIANT)
- Une factory ne peut produire que si elle est **connectée à la base principale** par un chemin
- Le chemin se crée automatiquement entre factories voisines
- Chaque factory a des **directions de chemin autorisées** (ex : Blue Smoke Plant = uniquement à gauche)
- → Forte composante **stratégie de placement**

### L'économie
- **Money ($)** = monnaie unique en partie
- Tu gagnes du $ **passivement avec le temps** (taux de base)
- Tu gagnes du $ **à chaque unité ennemie tuée** (ex : 4$ pour un Mini Mummy, 8$ pour un Mummy Droid)
- Les factories ont un coût : 80$ → 300$
- Les upgrades coûtent aussi du $

### Les unités
- **Conductive** (conductrices d'électricité) : peuvent être tuées instantanément par la foudre lors d'orages
- **Non-conductive** : survivent aux orages → critiques sur les niveaux orageux
- Les unités attaquent les unités adverses sur leur passage
- Une fois au mur ennemi, elles attaquent jusqu'à mourir
- Une unité morte **explose** (pas de dégâts) puis disparaît
- Certaines unités sont **stationnaires** (Sniper Bot reste derrière le mur)
- Certaines unités sont **support** (Nurse Droid soigne / ressuscite les alliés)

### La météo (mécanique stratégique majeure)
| Météo | Effet |
|-------|-------|
| **Rain (pluie)** | Green Smoke Plant et Blue Smoke Plant produisent **plus lentement** |
| **Thunderstorm (orage)** | La foudre **tue instantanément** les unités conductrices (Box Bot, Round Bot…). Certaines factories gagnent un **bonus de production** (énergie de la foudre) |
| **Sunny/Calm** | Conditions normales |

→ Chaque niveau a sa météo dominante → forte rejouabilité tactique.

## Système d'upgrade (capture 14.00.05)

Quand tu cliques sur une factory placée, un **menu radial** apparaît avec 7 actions :

```
         [Creation Rate ↑]
              |
[Health +]  ⬢ ⬢ ⬢  [Power $]
   |                    |
[Shoot Rate]        [Speed ✓]
        \\          //
         [Range 🎯]
              |
           [Sell $]
```

| Upgrade | Effet |
|---------|-------|
| **Creation Rate** | Augmente le nb de bots produits par minute |
| **Health** | Augmente les HP des bots produits |
| **Power** | Augmente les dégâts des bots produits |
| **Shoot Rate** | Augmente les RPM (rate per minute) |
| **Speed** | Augmente la vitesse de déplacement |
| **Range** | Augmente la portée de tir |
| **Sell** | Vend la factory contre du $ |

## Système de progression (méta-game)

### Déblocage initial
- **Green Smoke Plant** + **Blue Smoke Plant** : dispo dès le départ
- **Radio Tower (Sniper Bot)** : survie de 2 min sur n'importe quel niveau
- **Pyramid** + **Great Pyramid** : battre Desolation Peak (vs Robo-Gyptians)
- **Brick Hospital (Nurse Droid)** : survie de 4 min sur Volcano Island

### Niveaux à débloquer
1. **Desolation Peak** (déblocable d'office)
2. **Volcano Island**
3. **Green Hills** (locked au départ)
4. **Twilight Fields** (locked au départ)
5. **Judgement City** (boss final)
6. **Endurance Mode** (mode infini de rejouabilité)

## Boutons spéciaux observés

Dans le HUD en haut à gauche, deux boutons :
- **HP** (rouge/rose) — probablement : **soigne le mur de la base**
- **EMP** (jaune) — probablement : **désactive temporairement les unités ennemies** (Electromagnetic Pulse)

Ces deux capacités sont sans doute **limitées en charges** ou en cooldown. Mécanique de "panic button" classique en RTS.

## Boucle de tip / pédagogie

- Le jeu affiche des **tips contextuels** en bas de l'écran pendant le jeu
- Exemple capturé : *"As well as reaching the enemies base quicker, more speed also makes a robot harder to hit"*
- → Bon design pour onboarding mobile

## Conditions de victoire / défaite

- **Victoire** : détruire le mur ennemi (HP → 0)
- **Défaite** : ton mur tombe à 0 HP
- **Endurance Mode** : survivre le plus longtemps possible
