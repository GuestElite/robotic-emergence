"""Génère les previews "props" du biome JUNGLE (en miroir de preview_desert_props.py
et generate_snow_props.py).

Sortie : 12-biomes/jungle/preview/
- tile-ground-flat.png       : sol pur gradient terre forestière, aucun détail
- prop-rock-jungle-big.png   : gros rocher coiffé d'une calotte de mousse
- prop-rock-jungle-small.png : petit rocher coiffé de mousse
- prop-jungle-tree.png       : arbre tropical silhouette épurée
- prop-jungle-vines.png      : tas de lianes croisées
- prop-fern-tuft.png         : touffe de fougère
- prop-mushroom.png          : champignon (optionnel)
- prop-moss-patch.png        : plaque de mousse (optionnel)

Toutes les props sont vues 3/4 côté avec cast shadow sous la base.
Lancer depuis la racine :
    python3 12-biomes/jungle/scripts/generate_jungle_props.py
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
# Palettes locales (jungle)
# ---------------------------------------------------------------------------

# Sol jungle (gradient flat)
GROUND_JUNGLE = {
    "darkest": (45,  30, 18,  255),
    "dark":    (75,  56, 36,  255),
    "base":    (106, 80, 52,  255),
    "light":   (140, 110, 70, 255),
}

# Rocher jungle — gris-vert teinté (mousse imprégnée)
ROCK_JUNGLE = {
    "darkest":   (44,  52,  40,  255),
    "dark":      (72,  82,  62,  255),
    "base":      (108, 118, 92,  255),
    "light":     (148, 160, 124, 255),
    "highlight": (188, 200, 162, 255),
}

# Mousse (pour coiffes et patches)
MOSS = {
    "shadow":    (52,  88,  38,  255),
    "dark":      (68,  108, 44,  255),
    "base":      (96,  148, 60,  255),
    "light":     (134, 184, 82,  255),
    "highlight": (172, 220, 116, 255),
}

# Arbre tropical (canopée + tronc)
TREE = {
    "trunk_dark":  (38,  28,  20, 255),
    "trunk_base":  (72,  54,  36, 255),
    "trunk_light": (108, 84,  56, 255),
    "canopy_darkest": (24,  46,  24, 255),
    "canopy_dark":    (48,  84,  40, 255),
    "canopy_base":    (80,  132, 56, 255),
    "canopy_light":   (124, 178, 76, 255),
    "canopy_hl":      (170, 218, 110, 255),
}

# Feuillage (fougères, lianes, etc.)
FOLIAGE = {
    "darkest": (32,  60,  24, 255),
    "dark":    (56,  98,  38, 255),
    "base":    (90,  142, 56, 255),
    "light":   (138, 190, 82, 255),
}

# Champignon (toadstool classique mais palette naturaliste)
MUSHROOM = {
    "stem_dark":  (180, 168, 130, 255),
    "stem_base":  (220, 208, 168, 255),
    "stem_light": (244, 234, 200, 255),
    "cap_dark":   (138, 36,  32,  255),
    "cap_base":   (188, 58,  52,  255),
    "cap_light":  (224, 92,  82,  255),
    "spot":       (248, 240, 218, 255),
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
# 1. TILE GROUND FLAT — gradient pur terre forestière
# ---------------------------------------------------------------------------

def render_tile_ground_flat():
    W = H = 128
    img = vertical_gradient(W, H, GROUND_JUNGLE["base"],
                            GROUND_JUNGLE["dark"]).convert("RGBA")
    return img


# ---------------------------------------------------------------------------
# 2. PROP ROCK JUNGLE BIG — 36×36, rocher gris-vert + coiffe de mousse
# ---------------------------------------------------------------------------

def render_prop_rock_jungle_big():
    W = H = 36
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 5

    img = cast_shadow_under(img, cx, base_y, half_w=15, half_h=4, blur=2)
    d = ImageDraw.Draw(img)

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
    d.polygon(rock_pts, fill=ROCK_JUNGLE["base"], outline=ACCENT["outline"])

    # Face éclairée haut-gauche
    d.polygon([
        (cx - 11, base_y - 14),
        (cx - 4,  base_y - 19),
        (cx + 1,  base_y - 18),
        (cx - 2,  base_y - 10),
        (cx - 9,  base_y - 10),
    ], fill=ROCK_JUNGLE["light"])

    # Face sombre bas-droite
    d.polygon([
        (cx + 3,  base_y - 20),
        (cx + 11, base_y - 14),
        (cx + 15, base_y - 6),
        (cx + 13, base_y),
        (cx + 5,  base_y - 4),
        (cx + 2,  base_y - 11),
    ], fill=ROCK_JUNGLE["dark"])

    # Petite fissure
    d.line((cx - 3, base_y - 14, cx + 3, base_y - 7),
           fill=ROCK_JUNGLE["darkest"], width=1)

    # COIFFE DE MOUSSE (signature visuelle — équivalent calotte de neige)
    moss_cap = [
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
    d.polygon(moss_cap, fill=MOSS["base"], outline=ACCENT["outline"])
    # Highlight clair en haut de la mousse
    d.polygon([
        (cx - 5, base_y - 17),
        (cx - 1, base_y - 19),
        (cx + 3, base_y - 19),
        (cx + 6, base_y - 17),
        (cx + 3, base_y - 16),
        (cx - 2, base_y - 16),
    ], fill=MOSS["light"])
    d.point((cx, base_y - 18), fill=MOSS["highlight"])
    d.point((cx + 1, base_y - 18), fill=MOSS["highlight"])
    # Quelques brins de mousse retombants sur les côtés (signature jungle)
    d.point((cx - 9, base_y - 12), fill=MOSS["dark"])
    d.point((cx - 9, base_y - 11), fill=MOSS["dark"])
    d.point((cx + 9, base_y - 12), fill=MOSS["dark"])
    d.point((cx + 10, base_y - 11), fill=MOSS["dark"])

    return img


# ---------------------------------------------------------------------------
# 3. PROP ROCK JUNGLE SMALL — 24×24
# ---------------------------------------------------------------------------

def render_prop_rock_jungle_small():
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
    d.polygon(pts, fill=ROCK_JUNGLE["base"], outline=ACCENT["outline"])

    d.polygon([
        (cx - 6, base_y - 10),
        (cx,     base_y - 12),
        (cx + 3, base_y - 11),
        (cx,     base_y - 8),
        (cx - 4, base_y - 7),
    ], fill=ROCK_JUNGLE["light"])

    d.polygon([
        (cx + 3, base_y - 11),
        (cx + 7, base_y - 10),
        (cx + 9, base_y - 5),
        (cx + 8, base_y),
        (cx + 5, base_y - 3),
        (cx + 3, base_y - 8),
    ], fill=ROCK_JUNGLE["dark"])

    # COIFFE DE MOUSSE
    moss_cap = [
        (cx - 5, base_y - 10),
        (cx - 2, base_y - 12),
        (cx + 2, base_y - 12),
        (cx + 6, base_y - 10),
        (cx + 3, base_y - 9),
        (cx - 1, base_y - 10),
        (cx - 3, base_y - 9),
    ]
    d.polygon(moss_cap, fill=MOSS["base"], outline=ACCENT["outline"])
    d.line((cx - 2, base_y - 11, cx + 2, base_y - 11), fill=MOSS["light"])
    d.point((cx, base_y - 11), fill=MOSS["highlight"])

    return img


# ---------------------------------------------------------------------------
# 4. PROP JUNGLE TREE — 30×50, arbre tropical épuré
# ---------------------------------------------------------------------------

def render_prop_jungle_tree():
    W, H = 30, 50
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 4

    img = cast_shadow_under(img, cx, base_y, half_w=11, half_h=3, blur=2)
    d = ImageDraw.Draw(img)

    # Tronc fin et grand (équivalent du corps cactus)
    # Démarrage à la base, monte jusqu'à 2/3 de la hauteur
    trunk_top = base_y - 24
    d.rectangle((cx - 2, trunk_top, cx + 2, base_y - 1),
                fill=TREE["trunk_base"], outline=ACCENT["outline"])
    # Highlight face gauche
    d.line((cx - 2, trunk_top + 1, cx - 2, base_y - 2),
           fill=TREE["trunk_light"], width=1)
    # Ombre face droite
    d.line((cx + 2, trunk_top + 1, cx + 2, base_y - 2),
           fill=TREE["trunk_dark"], width=1)
    # Quelques striures d'écorce
    d.line((cx - 1, base_y - 18, cx + 1, base_y - 16),
           fill=TREE["trunk_dark"], width=1)
    d.line((cx - 1, base_y - 8, cx + 1, base_y - 6),
           fill=TREE["trunk_dark"], width=1)

    # Canopée : silhouette ovale dense au sommet
    # Couche sombre (base = ombre globale de la canopée)
    canopy_base = [
        (cx,      base_y - 47),   # sommet
        (cx - 5,  base_y - 44),
        (cx - 9,  base_y - 40),
        (cx - 12, base_y - 35),
        (cx - 11, base_y - 30),
        (cx - 8,  base_y - 25),
        (cx - 4,  base_y - 22),
        (cx + 4,  base_y - 22),
        (cx + 8,  base_y - 25),
        (cx + 11, base_y - 30),
        (cx + 12, base_y - 35),
        (cx + 9,  base_y - 40),
        (cx + 5,  base_y - 44),
    ]
    d.polygon(canopy_base, fill=TREE["canopy_darkest"], outline=ACCENT["outline"])

    # Couche médium (légèrement plus claire, décalée vers le haut-gauche pour effet lumière)
    canopy_mid = [
        (cx,      base_y - 46),
        (cx - 4,  base_y - 43),
        (cx - 8,  base_y - 39),
        (cx - 10, base_y - 34),
        (cx - 9,  base_y - 30),
        (cx - 6,  base_y - 26),
        (cx - 2,  base_y - 24),
        (cx + 3,  base_y - 24),
        (cx + 6,  base_y - 27),
        (cx + 8,  base_y - 31),
        (cx + 9,  base_y - 35),
        (cx + 7,  base_y - 39),
        (cx + 4,  base_y - 43),
    ]
    d.polygon(canopy_mid, fill=TREE["canopy_dark"])

    # Couche claire (face lumière haut-gauche) — réduite pour effet 3/4
    canopy_lit = [
        (cx - 1, base_y - 45),
        (cx - 4, base_y - 42),
        (cx - 7, base_y - 38),
        (cx - 8, base_y - 33),
        (cx - 6, base_y - 30),
        (cx - 3, base_y - 28),
        (cx - 1, base_y - 30),
        (cx - 2, base_y - 36),
        (cx - 1, base_y - 42),
    ]
    d.polygon(canopy_lit, fill=TREE["canopy_base"])

    # Highlights vert clair sur les arêtes éclairées (suggère feuilles)
    d.line((cx - 1, base_y - 46, cx - 4, base_y - 43), fill=TREE["canopy_light"], width=1)
    d.line((cx - 6, base_y - 38, cx - 8, base_y - 38), fill=TREE["canopy_light"], width=1)
    d.line((cx - 8, base_y - 32, cx - 9, base_y - 32), fill=TREE["canopy_light"], width=1)

    # Quelques pointes de feuilles dépassant de la silhouette (signature jungle)
    leaf_tips = [
        (cx - 2, base_y - 48, cx + 2, base_y - 46),  # sommet
        (cx - 13, base_y - 36, cx - 10, base_y - 34),  # gauche
        (cx + 11, base_y - 33, cx + 13, base_y - 31),  # droite
        (cx - 11, base_y - 27, cx - 9, base_y - 25),
    ]
    for x0, y0, x1, y1 in leaf_tips:
        d.ellipse((x0, y0, x1, y1), fill=TREE["canopy_base"],
                  outline=ACCENT["outline"])
        d.point((x0 + (x1 - x0) // 2, y0), fill=TREE["canopy_hl"])

    return img


# ---------------------------------------------------------------------------
# 5. PROP JUNGLE VINES — 34×28, tas de lianes croisées
# ---------------------------------------------------------------------------

def render_prop_jungle_vines():
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

    # 6 lianes croisées (vert sombre + highlight clair par-dessus)
    vines = [
        ((cx - 10, base_y),     (cx + 6,  base_y - 18)),
        ((cx + 12, base_y),     (cx - 4,  base_y - 16)),
        ((cx - 6,  base_y),     (cx + 10, base_y - 14)),
        ((cx + 4,  base_y),     (cx - 12, base_y - 10)),
        ((cx + 2,  base_y - 2), (cx + 14, base_y - 10)),
        ((cx - 8,  base_y - 2), (cx + 8,  base_y - 6)),
    ]
    for (x1, y1), (x2, y2) in vines:
        d.line((x1, y1, x2, y2), fill=FOLIAGE["darkest"], width=2)
        d.line((x1, y1 - 1, x2, y2 - 1), fill=FOLIAGE["base"], width=1)

    # Petites feuilles aux extrémités (au lieu des brindilles brunes du desert)
    leaf_ends = [(cx + 6, base_y - 18), (cx - 4, base_y - 16),
                 (cx + 10, base_y - 14), (cx - 12, base_y - 10),
                 (cx + 14, base_y - 10)]
    for tx, ty in leaf_ends:
        # Petite feuille ovale
        d.ellipse((tx - 2, ty - 2, tx + 2, ty + 1), fill=FOLIAGE["dark"],
                  outline=ACCENT["outline"])
        d.point((tx - 1, ty - 1), fill=FOLIAGE["light"])

    # Quelques feuilles intermédiaires sur les lianes pour densifier
    mid_leaves = [
        (cx - 2, base_y - 12),
        (cx + 5, base_y - 10),
        (cx + 8, base_y - 8),
        (cx - 5, base_y - 6),
    ]
    for mx, my in mid_leaves:
        d.ellipse((mx - 2, my - 1, mx + 2, my + 1), fill=FOLIAGE["base"])
        d.point((mx - 1, my), fill=FOLIAGE["light"])

    return img


# ---------------------------------------------------------------------------
# 6. PROP FERN TUFT — 20×16, touffe de fougère
# ---------------------------------------------------------------------------

def render_prop_fern_tuft():
    W, H = 20, 16
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 2

    d = ImageDraw.Draw(img)

    # 6 frondes de fougère penchées (palette vert vif vs jaune sec du desert)
    fronds = [
        (cx - 5, base_y, cx - 5, base_y - 9),
        (cx - 3, base_y, cx - 1, base_y - 11),
        (cx - 1, base_y, cx - 2, base_y - 13),
        (cx + 1, base_y, cx + 3, base_y - 12),
        (cx + 3, base_y, cx + 5, base_y - 10),
        (cx + 5, base_y, cx + 4, base_y - 8),
    ]
    for x1, y1, x2, y2 in fronds:
        d.line((x1, y1, x2, y2), fill=FOLIAGE["dark"], width=1)
        # Petite feuille à la pointe (suggère le foliage tropical)
        d.point((x2 + 1, y2), fill=FOLIAGE["light"])
        d.point((x2 - 1, y2 + 1), fill=FOLIAGE["base"])

    # Petites foliole intermédiaires (signature fougère vs herbe simple)
    folioles = [
        (cx - 3, base_y - 5),
        (cx - 1, base_y - 6),
        (cx + 1, base_y - 6),
        (cx + 3, base_y - 5),
    ]
    for fx, fy in folioles:
        d.point((fx, fy), fill=FOLIAGE["base"])
        d.point((fx + 1, fy), fill=FOLIAGE["light"])

    return img


# ---------------------------------------------------------------------------
# 7. PROP MUSHROOM — 20×16, champignon (optionnel)
# ---------------------------------------------------------------------------

def render_prop_mushroom():
    W, H = 20, 16
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 2

    img = cast_shadow_under(img, cx, base_y, half_w=7, half_h=2, blur=2,
                            opacity=90)
    d = ImageDraw.Draw(img)

    # Pied (stem)
    stem_top = base_y - 6
    d.rectangle((cx - 2, stem_top, cx + 2, base_y - 1),
                fill=MUSHROOM["stem_base"], outline=ACCENT["outline"])
    d.line((cx - 2, stem_top + 1, cx - 2, base_y - 2),
           fill=MUSHROOM["stem_light"])
    d.line((cx + 2, stem_top + 1, cx + 2, base_y - 2),
           fill=MUSHROOM["stem_dark"])

    # Chapeau (cap) — demi-ellipse rouge
    cap_box = (cx - 7, base_y - 13, cx + 7, base_y - 5)
    d.chord(cap_box, start=180, end=360, fill=MUSHROOM["cap_base"],
            outline=ACCENT["outline"])
    # Highlight face gauche
    d.chord((cx - 6, base_y - 12, cx + 6, base_y - 6),
            start=200, end=300, fill=MUSHROOM["cap_light"])
    # Ombre face droite (subtile)
    d.chord((cx - 5, base_y - 10, cx + 7, base_y - 5),
            start=300, end=360, fill=MUSHROOM["cap_dark"])
    # Bord inférieur du chapeau (ligne séparation)
    d.line((cx - 6, base_y - 6, cx + 6, base_y - 6), fill=ACCENT["outline"])

    # Points blancs sur le chapeau (signature toadstool)
    d.ellipse((cx - 5, base_y - 11, cx - 3, base_y - 9), fill=MUSHROOM["spot"])
    d.ellipse((cx + 1, base_y - 12, cx + 3, base_y - 10), fill=MUSHROOM["spot"])
    d.point((cx - 1, base_y - 10), fill=MUSHROOM["spot"])
    d.point((cx + 4, base_y - 8), fill=MUSHROOM["spot"])

    return img


# ---------------------------------------------------------------------------
# 8. PROP MOSS PATCH — 28×16, plaque de mousse (optionnel)
# ---------------------------------------------------------------------------

def render_prop_moss_patch():
    W, H = 28, 16
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 3

    img = cast_shadow_under(img, cx, base_y, half_w=11, half_h=2, blur=2,
                            opacity=80)
    d = ImageDraw.Draw(img)

    # Forme oblongue : 2 ellipses overlap (équivalent snow-pile mais en mousse)
    # Couche d'ombre (vert sombre) en dessous
    d.ellipse((cx - 12, base_y - 7, cx + 10, base_y),
              fill=MOSS["shadow"], outline=ACCENT["outline"])
    # Couche médium (corps de la mousse)
    d.ellipse((cx - 10, base_y - 9, cx + 8, base_y - 2),
              fill=MOSS["base"])
    # Highlight sur le sommet
    d.ellipse((cx - 6, base_y - 10, cx + 4, base_y - 6),
              fill=MOSS["light"])
    # Points lumineux + texture (touffes de mousse)
    d.point((cx - 2, base_y - 9), fill=MOSS["highlight"])
    d.point((cx - 1, base_y - 9), fill=MOSS["highlight"])
    # Quelques petits brins/pointes sortants (texture mousse vs neige lisse)
    d.point((cx - 8, base_y - 8), fill=MOSS["light"])
    d.point((cx - 5, base_y - 10), fill=MOSS["light"])
    d.point((cx + 3, base_y - 8), fill=MOSS["light"])
    d.point((cx + 6, base_y - 6), fill=MOSS["light"])
    d.point((cx, base_y - 11), fill=MOSS["highlight"])

    return img


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    out_dir = THIS_DIR.parent / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)

    to_render = [
        ("tile-ground-flat.png",        render_tile_ground_flat),
        ("prop-rock-jungle-big.png",    render_prop_rock_jungle_big),
        ("prop-rock-jungle-small.png",  render_prop_rock_jungle_small),
        ("prop-jungle-tree.png",        render_prop_jungle_tree),
        ("prop-jungle-vines.png",       render_prop_jungle_vines),
        ("prop-fern-tuft.png",          render_prop_fern_tuft),
        ("prop-mushroom.png",           render_prop_mushroom),
        ("prop-moss-patch.png",         render_prop_moss_patch),
    ]

    for name, fn in to_render:
        img = fn()
        out = out_dir / name
        img.save(out, format="PNG")
        rel = out.relative_to(REPO_ROOT)
        print(f"  {name:28s} {img.size[0]:>3}x{img.size[1]:<3}  → {rel}")

    print(f"\n{len(to_render)} preview(s) jungle générée(s) dans {out_dir.relative_to(REPO_ROOT)}/")


if __name__ == "__main__":
    main()
