"""Génère les previews "props" du biome NEIGE (en miroir de preview_desert_props.py).

Sortie : 12-biomes/snow/preview/
- tile-ground-flat.png     : sol pur gradient neige, aucun détail
- prop-rock-snow-big.png   : gros rocher coiffé d'une calotte de neige
- prop-rock-snow-small.png : petit rocher coiffé de neige
- prop-pine-tree.png       : sapin enneigé silhouette épurée (pas Noël cliché)
- prop-dead-branch.png     : branches mortes givrées
- prop-ice-shard.png       : cluster de stalagmites de glace
- prop-snow-pile.png       : petite congère (optionnel)
- prop-frozen-bush.png     : buisson givré (optionnel)

Toutes les props sont vues 3/4 côté avec cast shadow sous la base.
Lancer depuis la racine :
    python3 12-biomes/snow/scripts/generate_snow_props.py
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent.parent
ART_SCRIPTS = REPO_ROOT / "08-art-direction" / "scripts"
sys.path.insert(0, str(ART_SCRIPTS))

from palette import new_canvas, vertical_gradient, ACCENT


# ---------------------------------------------------------------------------
# Palettes locales (neige)
# ---------------------------------------------------------------------------

# Sol neige (gradient flat)
GROUND_SNOW = {
    "darkest": (138, 154, 173, 255),
    "dark":    (184, 199, 214, 255),
    "base":    (220, 230, 240, 255),
    "light":   (240, 245, 250, 255),
    "crack":   (110, 130, 152, 255),
}

# Rocher neigeux — gris-bleu froid (plus dark que les ROCK chauds du desert)
ROCK_SNOW = {
    "darkest":   (52,  62,  78,  255),
    "dark":      (78,  92,  112, 255),
    "base":      (112, 128, 148, 255),
    "light":     (156, 172, 192, 255),
    "highlight": (198, 212, 228, 255),
}

# Neige (pour calottes / congères / accents blancs)
SNOW = {
    "shadow":    (188, 204, 220, 255),   # ombre bleutée
    "base":      (228, 238, 248, 255),
    "light":     (244, 250, 254, 255),
    "highlight": (255, 255, 255, 255),
}

# Sapin (silhouette épurée — vert sapin froid + soupçon de blanc)
PINE = {
    "darkest": (28,  42,  36,  255),
    "dark":    (40,  60,  50,  255),
    "base":    (56,  82,  68,  255),
    "light":   (84,  118, 100, 255),
    "trunk":   (52,  40,  30,  255),
    "trunk_l": (78,  62,  48,  255),
}

# Bois mort givré
DEAD_WOOD = {
    "darkest": (78,  92,  108, 255),
    "dark":    (110, 124, 142, 255),
    "base":    (148, 162, 180, 255),
    "light":   (192, 206, 222, 255),
    "frost":   (240, 248, 255, 255),
}

# Glace
ICE = {
    "darkest": (90,  140, 178, 255),
    "dark":    (138, 184, 216, 255),
    "base":    (180, 214, 236, 255),
    "light":   (216, 234, 246, 255),
    "tip":     (250, 254, 255, 255),
}

CAST = (0, 0, 0, 110)


def cast_shadow_under(img, cx, base_y, half_w, half_h, blur=2, opacity=110):
    """Ombre portée elliptique sous l'élément (niveau du sol)."""
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    color = (0, 0, 0, opacity)
    sd.ellipse((cx - half_w, base_y - half_h + 1,
                cx + half_w + 2, base_y + half_h + 2), fill=color)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(img, sh)


# ---------------------------------------------------------------------------
# 1. TILE GROUND FLAT — gradient pur neige
# ---------------------------------------------------------------------------

def render_tile_ground_flat():
    W = H = 128
    # Gradient subtil : neige éclairée en haut → neige tassée en bas
    img = vertical_gradient(W, H, GROUND_SNOW["light"],
                            GROUND_SNOW["base"]).convert("RGBA")
    return img


# ---------------------------------------------------------------------------
# 2. PROP ROCK SNOW BIG — 36×36, rocher gris-bleu + calotte de neige
# ---------------------------------------------------------------------------

def render_prop_rock_snow_big():
    W = H = 36
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 5

    img = cast_shadow_under(img, cx, base_y, half_w=15, half_h=4, blur=2)
    d = ImageDraw.Draw(img)

    # Corps : silhouette irrégulière vue de profil
    rock_pts = [
        (cx - 13, base_y),
        (cx - 15, base_y - 6),
        (cx - 11, base_y - 14),
        (cx - 4,  base_y - 19),
        (cx + 3,  base_y - 20),
        (cx + 11, base_y - 14),
        (cx + 15, base_y - 6),
        (cx + 13, base_y),
    ]
    d.polygon(rock_pts, fill=ROCK_SNOW["base"], outline=ACCENT["outline"])

    # Face éclairée haut-gauche
    d.polygon([
        (cx - 11, base_y - 14),
        (cx - 4,  base_y - 19),
        (cx + 1,  base_y - 18),
        (cx - 2,  base_y - 10),
        (cx - 9,  base_y - 10),
    ], fill=ROCK_SNOW["light"])

    # Face sombre bas-droite
    d.polygon([
        (cx + 3,  base_y - 20),
        (cx + 11, base_y - 14),
        (cx + 15, base_y - 6),
        (cx + 13, base_y),
        (cx + 5,  base_y - 4),
        (cx + 2,  base_y - 11),
    ], fill=ROCK_SNOW["dark"])

    # Petite fissure
    d.line((cx - 3, base_y - 14, cx + 3, base_y - 7),
           fill=ROCK_SNOW["darkest"], width=1)

    # CALOTTE DE NEIGE sur le dessus (signature visuelle)
    # Couche principale (forme convexe épousant le sommet)
    snow_cap = [
        (cx - 10, base_y - 14),
        (cx - 6,  base_y - 17),
        (cx - 2,  base_y - 20),
        (cx + 4,  base_y - 20),
        (cx + 8,  base_y - 17),
        (cx + 11, base_y - 14),
        (cx + 8,  base_y - 13),
        (cx + 3,  base_y - 14),
        (cx - 2,  base_y - 14),
        (cx - 7,  base_y - 13),
    ]
    d.polygon(snow_cap, fill=SNOW["base"], outline=ACCENT["outline"])
    # Highlight brillant sur le haut de la calotte
    d.polygon([
        (cx - 5, base_y - 17),
        (cx - 1, base_y - 19),
        (cx + 3, base_y - 19),
        (cx + 6, base_y - 17),
        (cx + 3, base_y - 16),
        (cx - 2, base_y - 16),
    ], fill=SNOW["light"])
    d.point((cx, base_y - 18), fill=SNOW["highlight"])
    d.point((cx + 1, base_y - 18), fill=SNOW["highlight"])

    return img


# ---------------------------------------------------------------------------
# 3. PROP ROCK SNOW SMALL — 24×24
# ---------------------------------------------------------------------------

def render_prop_rock_snow_small():
    W = H = 24
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 4

    img = cast_shadow_under(img, cx, base_y, half_w=9, half_h=3, blur=2)
    d = ImageDraw.Draw(img)

    pts = [
        (cx - 8, base_y),
        (cx - 9, base_y - 5),
        (cx - 6, base_y - 10),
        (cx,     base_y - 12),
        (cx + 7, base_y - 10),
        (cx + 9, base_y - 5),
        (cx + 8, base_y),
    ]
    d.polygon(pts, fill=ROCK_SNOW["base"], outline=ACCENT["outline"])

    # Highlight haut-gauche
    d.polygon([
        (cx - 6, base_y - 10),
        (cx,     base_y - 12),
        (cx + 3, base_y - 11),
        (cx,     base_y - 8),
        (cx - 4, base_y - 7),
    ], fill=ROCK_SNOW["light"])

    # Côté sombre
    d.polygon([
        (cx + 3, base_y - 11),
        (cx + 7, base_y - 10),
        (cx + 9, base_y - 5),
        (cx + 8, base_y),
        (cx + 5, base_y - 3),
        (cx + 3, base_y - 8),
    ], fill=ROCK_SNOW["dark"])

    # CALOTTE DE NEIGE
    snow_cap = [
        (cx - 5, base_y - 10),
        (cx - 2, base_y - 12),
        (cx + 2, base_y - 12),
        (cx + 6, base_y - 10),
        (cx + 3, base_y - 9),
        (cx - 1, base_y - 10),
        (cx - 3, base_y - 9),
    ]
    d.polygon(snow_cap, fill=SNOW["base"], outline=ACCENT["outline"])
    d.line((cx - 2, base_y - 11, cx + 2, base_y - 11), fill=SNOW["light"])
    d.point((cx, base_y - 11), fill=SNOW["highlight"])

    return img


# ---------------------------------------------------------------------------
# 4. PROP PINE TREE — 30×50, silhouette épurée enneigée
# ---------------------------------------------------------------------------

def render_prop_pine_tree():
    W, H = 30, 50
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 4

    # Ombre portée à la base
    img = cast_shadow_under(img, cx, base_y, half_w=10, half_h=3, blur=2)
    d = ImageDraw.Draw(img)

    # Tronc court (visible juste à la base)
    trunk_top = base_y - 5
    d.rectangle((cx - 2, trunk_top, cx + 2, base_y - 1),
                fill=PINE["trunk"], outline=ACCENT["outline"])
    d.line((cx - 2, trunk_top, cx - 2, base_y - 1), fill=PINE["trunk_l"])

    # Silhouette épurée : un seul grand triangle allongé (pas 3 étages cliché)
    # Pointes légères pour casser la silhouette parfaite
    crown_pts = [
        (cx,      base_y - 44),   # sommet
        (cx - 3,  base_y - 38),
        (cx - 6,  base_y - 32),
        (cx - 4,  base_y - 28),
        (cx - 8,  base_y - 22),
        (cx - 5,  base_y - 18),
        (cx - 10, base_y - 12),
        (cx - 7,  base_y - 7),
        (cx - 11, base_y - 5),
        (cx + 11, base_y - 5),
        (cx + 7,  base_y - 7),
        (cx + 10, base_y - 12),
        (cx + 5,  base_y - 18),
        (cx + 8,  base_y - 22),
        (cx + 4,  base_y - 28),
        (cx + 6,  base_y - 32),
        (cx + 3,  base_y - 38),
    ]
    # Couche sombre (base)
    d.polygon(crown_pts, fill=PINE["dark"], outline=ACCENT["outline"])

    # Face éclairée à gauche (lumière top-gauche) : reproduit la silhouette
    # mais en + clair sur la moitié gauche
    left_lit = [
        (cx,      base_y - 44),
        (cx - 3,  base_y - 38),
        (cx - 6,  base_y - 32),
        (cx - 4,  base_y - 28),
        (cx - 8,  base_y - 22),
        (cx - 5,  base_y - 18),
        (cx - 10, base_y - 12),
        (cx - 7,  base_y - 7),
        (cx - 11, base_y - 5),
        (cx - 4,  base_y - 5),
        (cx - 2,  base_y - 10),
        (cx - 4,  base_y - 18),
        (cx - 2,  base_y - 26),
        (cx - 3,  base_y - 34),
        (cx - 1,  base_y - 42),
    ]
    d.polygon(left_lit, fill=PINE["base"])

    # Highlights vert clair sur quelques arêtes éclairées (3-4 traits)
    d.line((cx - 1, base_y - 42, cx - 3, base_y - 38), fill=PINE["light"], width=1)
    d.line((cx - 4, base_y - 32, cx - 6, base_y - 32), fill=PINE["light"], width=1)
    d.line((cx - 6, base_y - 22, cx - 8, base_y - 22), fill=PINE["light"], width=1)
    d.line((cx - 8, base_y - 12, cx - 10, base_y - 12), fill=PINE["light"], width=1)

    # Accents de neige sur certaines pointes (subtil, pas Noël)
    # 3 petites touches blanches sur les arêtes orientées vers le haut
    snow_accents = [
        (cx - 1, base_y - 43, cx + 1, base_y - 42),     # sommet
        (cx - 7, base_y - 22, cx - 5, base_y - 21),     # mid-gauche
        (cx + 4, base_y - 28, cx + 7, base_y - 27),     # mid-droite
        (cx - 11, base_y - 12, cx - 8, base_y - 11),    # bas-gauche
    ]
    for x0, y0, x1, y1 in snow_accents:
        d.ellipse((x0, y0, x1, y1), fill=SNOW["base"], outline=None)
        d.point((x0 + (x1 - x0) // 2, y0), fill=SNOW["highlight"])

    return img


# ---------------------------------------------------------------------------
# 5. PROP DEAD BRANCH — 34×28, branches givrées
# ---------------------------------------------------------------------------

def render_prop_dead_branch():
    W, H = 34, 28
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 3

    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse((cx - 12, base_y - 2, cx + 14, base_y + 3), fill=(0, 0, 0, 85))
    sh = sh.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, sh)
    d = ImageDraw.Draw(img)

    # 6 branches croisées (palette gris-bleu blanchi, vs marron du desert)
    branches = [
        ((cx - 10, base_y),     (cx + 6,  base_y - 18)),
        ((cx + 12, base_y),     (cx - 4,  base_y - 16)),
        ((cx - 6,  base_y),     (cx + 10, base_y - 14)),
        ((cx + 4,  base_y),     (cx - 12, base_y - 10)),
        ((cx + 2,  base_y - 2), (cx + 14, base_y - 10)),
        ((cx - 8,  base_y - 2), (cx + 8,  base_y - 6)),
    ]
    for (x1, y1), (x2, y2) in branches:
        # Ombre/corps
        d.line((x1, y1, x2, y2), fill=DEAD_WOOD["darkest"], width=2)
        # Highlight clair par-dessus (face éclairée)
        d.line((x1, y1 - 1, x2, y2 - 1), fill=DEAD_WOOD["base"], width=1)

    # Petites brindilles aux extrémités
    twig_ends = [(cx + 6, base_y - 18), (cx - 4, base_y - 16),
                 (cx + 10, base_y - 14), (cx - 12, base_y - 10),
                 (cx + 14, base_y - 10)]
    for tx, ty in twig_ends:
        d.line((tx, ty, tx + 3, ty - 4), fill=DEAD_WOOD["dark"], width=1)
        d.line((tx, ty, tx - 3, ty - 3), fill=DEAD_WOOD["dark"], width=1)

    # Cristaux de givre (signature visuelle) — 5-6 points blancs accumulés
    frost_spots = [
        (cx - 5, base_y - 14),
        (cx + 2, base_y - 12),
        (cx + 7, base_y - 16),
        (cx - 8, base_y - 8),
        (cx + 11, base_y - 11),
        (cx, base_y - 6),
    ]
    for fx, fy in frost_spots:
        d.point((fx, fy), fill=DEAD_WOOD["frost"])
        d.point((fx + 1, fy), fill=DEAD_WOOD["light"])
        d.point((fx, fy + 1), fill=DEAD_WOOD["light"])

    return img


# ---------------------------------------------------------------------------
# 6. PROP ICE SHARD — 20×16, cluster de stalagmites de glace
# ---------------------------------------------------------------------------

def render_prop_ice_shard():
    W, H = 20, 16
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 2

    d = ImageDraw.Draw(img)

    # 5 éclats pointant vers le haut, hauteurs variables
    shards = [
        # (x_base, height, half_width)
        (cx - 6, 9,  2),
        (cx - 3, 11, 2),
        (cx,     14, 3),
        (cx + 3, 10, 2),
        (cx + 6, 8,  2),
    ]
    for sx, shard_h, hw in shards:
        tip_y = base_y - shard_h
        # Triangle de base
        pts = [
            (sx - hw, base_y),
            (sx + hw, base_y),
            (sx,      tip_y),
        ]
        d.polygon(pts, fill=ICE["base"], outline=ACCENT["outline"])
        # Face éclairée (gauche) — un triangle plus fin
        d.polygon([
            (sx - hw, base_y),
            (sx,      base_y),
            (sx,      tip_y),
        ], fill=ICE["light"])
        # Face sombre (droite)
        d.polygon([
            (sx,      base_y),
            (sx + hw, base_y),
            (sx,      tip_y),
        ], fill=ICE["dark"])
        # Reflet vertical sur l'arête centrale
        d.line((sx, base_y - 1, sx, tip_y + 1), fill=ICE["tip"])
        # Pointe brillante
        d.point((sx, tip_y), fill=ICE["tip"])

    return img


# ---------------------------------------------------------------------------
# 7. PROP SNOW PILE — 28×16, petite congère (optionnel)
# ---------------------------------------------------------------------------

def render_prop_snow_pile():
    W, H = 28, 16
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 3

    img = cast_shadow_under(img, cx, base_y, half_w=11, half_h=2, blur=2,
                            opacity=80)
    d = ImageDraw.Draw(img)

    # Forme oblongue : 2 ellipses overlap pour une congère asymétrique
    # Couche d'ombre (base bleutée) en dessous
    d.ellipse((cx - 12, base_y - 7, cx + 10, base_y),
              fill=SNOW["shadow"], outline=ACCENT["outline"])
    # Couche claire (corps de la congère) légèrement décalée vers le haut
    d.ellipse((cx - 10, base_y - 9, cx + 8, base_y - 2),
              fill=SNOW["base"])
    # Highlight sur le sommet
    d.ellipse((cx - 6, base_y - 10, cx + 4, base_y - 6),
              fill=SNOW["light"])
    # Spot brillant
    d.point((cx - 2, base_y - 9), fill=SNOW["highlight"])
    d.point((cx - 1, base_y - 9), fill=SNOW["highlight"])

    return img


# ---------------------------------------------------------------------------
# 8. PROP FROZEN BUSH — 28×24, buisson givré (optionnel)
# ---------------------------------------------------------------------------

def render_prop_frozen_bush():
    W, H = 28, 24
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 3

    img = cast_shadow_under(img, cx, base_y, half_w=11, half_h=3, blur=2,
                            opacity=95)
    d = ImageDraw.Draw(img)

    # Silhouette ronde sombre (vert sapin très foncé, presque noir-bleu)
    # 4-5 cercles overlap pour silhouette irrégulière
    blobs = [
        (cx,      base_y - 8,  9),    # central
        (cx - 7,  base_y - 5,  6),    # gauche-bas
        (cx + 7,  base_y - 5,  6),    # droite-bas
        (cx - 4,  base_y - 12, 6),    # haut-gauche
        (cx + 4,  base_y - 13, 6),    # haut-droite
    ]
    # Couche sombre (base)
    for bx, by, br in blobs:
        d.ellipse((bx - br, by - br, bx + br, by + br),
                  fill=PINE["darkest"], outline=ACCENT["outline"])
    # Couche un poil plus claire (highlight de chaque blob côté gauche)
    for bx, by, br in blobs:
        d.ellipse((bx - br + 1, by - br + 1, bx + br - 3, by + br - 3),
                  fill=PINE["dark"])

    # CRISTAUX DE GIVRE (signature visuelle) : 6-8 points blancs sur le haut
    frost_dots = [
        (cx - 6, base_y - 14),
        (cx - 2, base_y - 16),
        (cx + 2, base_y - 17),
        (cx + 6, base_y - 15),
        (cx - 8, base_y - 8),
        (cx + 9, base_y - 9),
        (cx,     base_y - 13),
        (cx - 4, base_y - 11),
    ]
    for fx, fy in frost_dots:
        d.point((fx, fy), fill=SNOW["highlight"])
        d.point((fx + 1, fy), fill=SNOW["light"])
        d.point((fx, fy + 1), fill=SNOW["light"])

    # Quelques baies gelées (option visuelle subtile — petits points cyan)
    berries = [(cx - 3, base_y - 7), (cx + 4, base_y - 9)]
    for bx, by in berries:
        d.ellipse((bx - 1, by - 1, bx + 1, by + 1), fill=ICE["dark"])
        d.point((bx, by), fill=ICE["light"])

    return img


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    out_dir = THIS_DIR.parent / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)

    to_render = [
        ("tile-ground-flat.png",       render_tile_ground_flat),
        ("prop-rock-snow-big.png",     render_prop_rock_snow_big),
        ("prop-rock-snow-small.png",   render_prop_rock_snow_small),
        ("prop-pine-tree.png",         render_prop_pine_tree),
        ("prop-dead-branch.png",       render_prop_dead_branch),
        ("prop-ice-shard.png",         render_prop_ice_shard),
        ("prop-snow-pile.png",         render_prop_snow_pile),
        ("prop-frozen-bush.png",       render_prop_frozen_bush),
    ]

    for name, fn in to_render:
        img = fn()
        out = out_dir / name
        img.save(out, format="PNG")
        rel = out.relative_to(REPO_ROOT)
        print(f"  {name:28s} {img.size[0]:>3}x{img.size[1]:<3}  → {rel}")

    print(f"\n{len(to_render)} preview(s) snow générée(s) dans {out_dir.relative_to(REPO_ROOT)}/")


if __name__ == "__main__":
    main()
