# 🎨 Prompts internes — génération procédurale des sprites V0

> Ce document est le pendant **technique** de `PROMPTS-SPRITES.md`. Ici, pas de prompts pour IA d'images : on documente les **briefs internes** que Claude utilise pour traduire chaque sprite en code PIL (Python).
>
> Source de génération : `scripts/generate_sprites.py` + `scripts/palette.py`. Aucune dépendance externe (pas de DALL-E, pas de Midjourney, pas d'ImageMagick).

---

## 🎨 Palette commune (verrouillée)

| Rôle | Joueur (bleu) | Ennemi (rouge) | Métal | Sol |
|---|---|---|---|---|
| Dark | `#1D4E89` | `#991B1B` | `#1E293B` | `#6B4E35` |
| Base | `#3B82F6` | `#EF4444` | `#475569` | `#C9A874` |
| Light | `#06B6D4` | `#F97316` | `#94A3B8` | `#E0C498` |
| Glow | `#7DD3FC` | `#FDBA74` | — | — |

Contour standard : `#0F172A` (slate-950), pas du noir pur.

---

## 1. `base-{player|enemy}.png` — 256×256

**Silhouette** : double anneau métallique (rempart) entourant un gros bloc industriel coloré. 4 tourelles aux coins du bloc. Antenne centrale. Une porte unique au milieu du rempart (bas pour player, haut pour enemy).

**Détails clés** :
- Rempart externe en `METAL.dark`, bandeau supérieur `METAL.highlight` (lumière du dessus), bandeau inférieur `METAL.darkest` (ombre)
- Rivets toutes les 24px sur le rempart
- Bloc central = gradient bandes claire/sombre pour fake 3D
- Tourelles aux 4 coins = socle gris + dôme `pal.base` + double canon `up`
- Porte = trouée nette + encadrement métallique + bande de chemin `GROUND.dark` visible

**Inspiration** : la base du jeu original (capture 14.00.00) — gros bloc gris-vert avec deux cheminées et un canon au-dessus, intégré dans un rempart en bois/jaune. On stylise en bleu/rouge selon le camp.

---

## 2. `factory-light-{player|enemy}.png` — 128×128

**Silhouette** : carré compact avec **2 antennes** signature "agilité" + bandes diagonales jaunes/noires de signalisation (rapidité). Une seule porte de sortie (bas player / haut enemy).

**Détails clés** :
- Corps `pal.base`, bandeau clair haut, bandeau sombre bas
- Bandes diagonales `METAL.darkest` en haut (style "warning stripes")
- Mini tourelle centrale (size=10)
- 2 antennes courtes avec voyant `pal.glow`
- Porte = encadrement `METAL.darkest` + intérieur lumineux `pal.glow`

---

## 3. `factory-heavy-{player|enemy}.png` — 128×128

**Silhouette** : bloc massif avec **2 cheminées** signature "puissance" + gros canon central. **3 portes** : gauche, droite, et bas (player) / haut (enemy).

**Détails clés** :
- Corps `pal.dark` (plus foncé que la light pour suggérer la masse)
- Rivets densément placés (spacing=18)
- 2 smokestacks elliptiques avec petit nuage de fumée blanc au-dessus
- Tourelle centrale plus grosse (size=14)
- 3 portes avec intérieur `pal.glow`

---

## 4. `unit-light-{player|enemy}.png` — 48×48

**Silhouette** : robot bipède vu de dessus. Tête + torse coloré + 2 pieds sombres + petit canon laser tenu sur le côté droit.

**Détails clés** :
- 2 ovales `METAL.darkest` pour les pieds (rappel jambes)
- Torse hexagonal `pal.base` avec reflet `pal.light` côté gauche
- Tête : petit dôme `pal.dark` + oeil `pal.glow`
- Arme : rectangle `METAL.darkest` + tip `ACCENT.warning`

---

## 5. `unit-heavy-{player|enemy}.png` — 64×64

**Silhouette** : tank chenillé vu de dessus. 2 chenilles latérales en `METAL.darkest` + châssis blindé coloré + grosse tourelle au centre avec double canon vers le haut.

**Détails clés** :
- Chenilles : rectangles arrondis avec crans clairs (rythme `METAL.light` tous les 4px)
- Châssis : `pal.base` avec relief haut/bas
- Tourelle size=9
- Voyant arrière `ACCENT.warning` pour orientation visuelle

---

## 6. `tile-ground.png` — 128×128 (tileable)

**Look** : sable / terre battue craquelée, beige.

**Détails clés** :
- Gradient vertical `GROUND.base` → `GROUND.dark`
- 80 petits cailloux aléatoires (seed=42 pour reproductibilité)
- 4 fissures stylisées (lignes brisées `GROUND.crack`)
- **Aucun gros élément sur les bords** → pas de couture visible quand on tile

---

## 7. `tile-wall.png` — 64×64 (tileable)

**Look** : mur métallique boulonné vu de dessus. Plaques verticales.

**Détails clés** :
- Fond `METAL.base`, bandeau clair haut (8px), bandeau sombre bas (10px)
- Lignes verticales tous les 16px (joints entre plaques)
- Boulons aux jonctions

---

## 8. `effect-explosion.png` — 64×64

**Look** : flash radial. 5 anneaux concentriques du foncé `ENEMY.dark` au blanc `ACCENT.white`. 8 étincelles rayonnantes. Léger GaussianBlur pour adoucir.

---

## 9. `effect-laser.png` — 32×32

**Look** : trait vertical brillant. Cœur blanc + halo `PLAYER.glow` flouté.

---

## ⚙️ Pipeline de génération

```bash
cd "/Users/romainguillaud/Desktop/Robotic emergence/08-art-direction/scripts"
python3 generate_sprites.py          # tout générer
python3 generate_sprites.py base     # juste les bases
python3 generate_sprites.py factory  # juste les factories
```

Les PNG sont écrits dans `08-art-direction/sprites/` avec les noms attendus par le code du jeu.

## 🔁 Itérations

Pour ajuster un sprite :
1. Modifier la fonction `render_xxx` dans `generate_sprites.py`
2. Re-générer avec un filtre : `python3 generate_sprites.py xxx`
3. Recharger la page du jeu (cache busting avec `?v=2` au besoin)

Pour ajuster la palette globale (tous les sprites en cascade) : éditer `palette.py`.
