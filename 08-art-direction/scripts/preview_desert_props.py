"""Génère les previews pour la refonte du sol désert :
- tile-ground-flat.png : sol pur dégradé sable, aucun détail (les détails
  viennent maintenant des props posés dessus, plus baked dans la tile)
- prop-rock-big.png : gros rocher 3/4 côté avec hauteur visible
- prop-rock-small.png : petit rocher
- prop-cactus.png : cactus saguaro vu de côté
- prop-dry-brush.png : tas de branches mortes / buisson sec
- prop-grass-tuft.png : touffe d'herbe sèche

Tous avec cast shadow pour donner l'effet "posé sur le sol".

Sortie : 08-art-direction/preview/
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from palette import (
    new_canvas, vertical_gradient,
    GROUND, ACCENT,
)


# ---------------------------------------------------------------------------
# Palettes locales pour les props
# ---------------------------------------------------------------------------

ROCK = {
    "darkest":   (60,  47,  33,  255),
    "dark":      (92,  74,  51,  255),
    "base":      (139, 118, 96,  255),
    "light":     (181, 160, 131, 255),
    "highlight": (210, 195, 170, 255),
}

CACTUS = {
    "dark":      (61,  94,  32,  255),
    "base":      (90,  130, 53,  255),
    "light":     (123, 168, 77,  255),
    "highlight": (160, 200, 100, 255),
    "spike":     (245, 220, 130, 255),
}

DRY_BRUSH = {
    "darkest":   (74,  51,  26,  255),
    "dark":      (107, 80,  46,  255),
    "base":      (139, 111, 71,  255),
    "light":     (175, 150, 105, 255),
}

CAST = (0, 0, 0, 110)


def cast_shadow_under(img, cx, base_y, half_w, half_h, blur=2):
    """Ajoute une ombre portée elliptique sous l'élément (au niveau du sol)."""
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    # Décalée légèrement bas-droite pour suggérer un soleil top-gauche
    sd.ellipse((cx - half_w, base_y - half_h + 1,
                cx + half_w + 2, base_y + half_h + 2), fill=CAST)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(img, sh)


# ---------------------------------------------------------------------------
# 1. TILE-GROUND PLAT — pur gradient sable
# ---------------------------------------------------------------------------

def render_tile_ground_flat():
    W = H = 128
    img = vertical_gradient(W, H, GROUND["base"], GROUND["dark"]).convert("RGBA")
    return img


# ---------------------------------------------------------------------------
# 2. PROP ROCHER GROS — 36x36, vue 3/4 côté
# ---------------------------------------------------------------------------

def render_prop_rock_big():
    W = H = 36
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 5

    # Ombre portée sous le rocher
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
    d.polygon(rock_pts, fill=ROCK["base"], outline=ACCENT["outline"])

    # Face éclairée haut-gauche
    d.polygon([
        (cx - 11, base_y - 14),
        (cx - 4,  base_y - 19),
        (cx + 1,  base_y - 18),
        (cx - 2,  base_y - 10),
        (cx - 9,  base_y - 10),
    ], fill=ROCK["light"])

    # Très clair sur arête supérieure
    d.polygon([
        (cx - 6, base_y - 16),
        (cx - 2, base_y - 19),
        (cx + 2, base_y - 18),
        (cx, base_y - 15),
    ], fill=ROCK["highlight"])

    # Face sombre bas-droite
    d.polygon([
        (cx + 3,  base_y - 20),
        (cx + 11, base_y - 14),
        (cx + 15, base_y - 6),
        (cx + 13, base_y),
        (cx + 5,  base_y - 4),
        (cx + 2,  base_y - 11),
    ], fill=ROCK["dark"])

    # Petite fissure pour casser l'uniformité
    d.line((cx - 3, base_y - 14, cx + 3, base_y - 7),
           fill=ROCK["darkest"], width=1)

    return img


# ---------------------------------------------------------------------------
# 3. PROP ROCHER PETIT — 24x24
# ---------------------------------------------------------------------------

def render_prop_rock_small():
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
    d.polygon(pts, fill=ROCK["base"], outline=ACCENT["outline"])

    # Highlight haut-gauche
    d.polygon([
        (cx - 6, base_y - 10),
        (cx,     base_y - 12),
        (cx + 3, base_y - 11),
        (cx,     base_y - 8),
        (cx - 4, base_y - 7),
    ], fill=ROCK["light"])

    # Très clair sommet
    d.polygon([
        (cx - 2, base_y - 11),
        (cx + 1, base_y - 12),
        (cx + 2, base_y - 10),
        (cx - 1, base_y - 10),
    ], fill=ROCK["highlight"])

    # Côté sombre
    d.polygon([
        (cx + 3, base_y - 11),
        (cx + 7, base_y - 10),
        (cx + 9, base_y - 5),
        (cx + 8, base_y),
        (cx + 5, base_y - 3),
        (cx + 3, base_y - 8),
    ], fill=ROCK["dark"])

    return img


# ---------------------------------------------------------------------------
# 4. PROP CACTUS — 28x48, saguaro
# ---------------------------------------------------------------------------

def render_prop_cactus():
    W, H = 30, 50
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 4

    # Petite ombre à la base
    img = cast_shadow_under(img, cx, base_y, half_w=8, half_h=3, blur=2)
    d = ImageDraw.Draw(img)

    # Corps principal (rectangle vertical arrondi)
    body = (cx - 5, base_y - 38, cx + 5, base_y)
    d.rounded_rectangle(body, radius=4,
                        fill=CACTUS["base"], outline=ACCENT["outline"])
    # Highlight face gauche (lumière)
    d.rounded_rectangle((cx - 5, base_y - 37, cx - 2, base_y - 2), radius=2,
                        fill=CACTUS["light"])
    # Ombre face droite
    d.rounded_rectangle((cx + 2, base_y - 37, cx + 5, base_y - 2), radius=2,
                        fill=CACTUS["dark"])
    # Highlight très clair sur l'arête éclairée
    d.line((cx - 4, base_y - 37, cx - 4, base_y - 4),
           fill=CACTUS["highlight"], width=1)

    # Bras gauche (segment vertical + horizontal)
    d.rounded_rectangle((cx - 12, base_y - 28, cx - 7, base_y - 14), radius=3,
                        fill=CACTUS["base"], outline=ACCENT["outline"])
    d.rounded_rectangle((cx - 11, base_y - 22, cx - 5, base_y - 18), radius=2,
                        fill=CACTUS["base"], outline=ACCENT["outline"])
    d.line((cx - 11, base_y - 27, cx - 11, base_y - 16),
           fill=CACTUS["light"], width=1)

    # Bras droit (un peu plus haut)
    d.rounded_rectangle((cx + 7, base_y - 32, cx + 12, base_y - 18), radius=3,
                        fill=CACTUS["base"], outline=ACCENT["outline"])
    d.rounded_rectangle((cx + 5, base_y - 26, cx + 11, base_y - 22), radius=2,
                        fill=CACTUS["base"], outline=ACCENT["outline"])
    d.line((cx + 11, base_y - 31, cx + 11, base_y - 20),
           fill=CACTUS["dark"], width=1)

    # Sommet (small cap)
    d.ellipse((cx - 4, base_y - 40, cx + 4, base_y - 36),
              fill=CACTUS["light"], outline=ACCENT["outline"])

    # Épines (petits points jaunes le long du corps)
    for y in range(base_y - 34, base_y - 6, 5):
        d.point((cx - 3, y), fill=CACTUS["spike"])
        d.point((cx + 3, y), fill=CACTUS["spike"])
    # Épines sur bras
    for y in (base_y - 26, base_y - 22):
        d.point((cx - 10, y), fill=CACTUS["spike"])
    for y in (base_y - 30, base_y - 26):
        d.point((cx + 10, y), fill=CACTUS["spike"])

    return img


# ---------------------------------------------------------------------------
# 5. PROP BUISSON SEC — 32x28, tas de branches mortes
# ---------------------------------------------------------------------------

def render_prop_dry_brush():
    W, H = 34, 28
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 3

    # Petite ombre
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse((cx - 12, base_y - 2, cx + 14, base_y + 3), fill=(0, 0, 0, 85))
    sh = sh.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, sh)
    d = ImageDraw.Draw(img)

    # 6-7 branches croisées (paires : ombre épaisse + highlight fin par-dessus)
    branches = [
        ((cx - 10, base_y),     (cx + 6,  base_y - 18)),
        ((cx + 12, base_y),     (cx - 4,  base_y - 16)),
        ((cx - 6,  base_y),     (cx + 10, base_y - 14)),
        ((cx + 4,  base_y),     (cx - 12, base_y - 10)),
        ((cx + 2,  base_y - 2), (cx + 14, base_y - 10)),
        ((cx - 8,  base_y - 2), (cx + 8,  base_y - 6)),
    ]
    for (x1, y1), (x2, y2) in branches:
        d.line((x1, y1, x2, y2), fill=DRY_BRUSH["darkest"], width=2)
        d.line((x1, y1 - 1, x2, y2 - 1), fill=DRY_BRUSH["base"], width=1)

    # Petites brindilles aux extrémités
    twig_ends = [(cx + 6, base_y - 18), (cx - 4, base_y - 16),
                 (cx + 10, base_y - 14), (cx - 12, base_y - 10),
                 (cx + 14, base_y - 10)]
    for tx, ty in twig_ends:
        d.line((tx, ty, tx + 3, ty - 4), fill=DRY_BRUSH["dark"], width=1)
        d.line((tx, ty, tx - 3, ty - 3), fill=DRY_BRUSH["dark"], width=1)

    return img


# ---------------------------------------------------------------------------
# 6. PROP TOUFFE D'HERBE — 18x16
# ---------------------------------------------------------------------------

def render_prop_grass_tuft():
    W, H = 20, 16
    img, _ = new_canvas(W, H)
    cx = W // 2
    base_y = H - 2

    # Pas de cast shadow (trop petit pour être lisible)
    d = ImageDraw.Draw(img)

    # 6 brins d'herbe sèche penchés
    blades = [
        (cx - 5, base_y, cx - 5, base_y - 9),
        (cx - 3, base_y, cx - 1, base_y - 11),
        (cx - 1, base_y, cx - 2, base_y - 13),
        (cx + 1, base_y, cx + 3, base_y - 12),
        (cx + 3, base_y, cx + 5, base_y - 10),
        (cx + 5, base_y, cx + 4, base_y - 8),
    ]
    for x1, y1, x2, y2 in blades:
        d.line((x1, y1, x2, y2), fill=DRY_BRUSH["dark"], width=1)
        d.point((x2 + 1, y2), fill=DRY_BRUSH["light"])

    return img


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    repo_root = THIS_DIR.parent.parent
    out_dir = repo_root / "08-art-direction" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)

    to_render = [
        ("tile-ground-flat.png",   render_tile_ground_flat),
        ("prop-rock-big.png",      render_prop_rock_big),
        ("prop-rock-small.png",    render_prop_rock_small),
        ("prop-cactus.png",        render_prop_cactus),
        ("prop-dry-brush.png",     render_prop_dry_brush),
        ("prop-grass-tuft.png",    render_prop_grass_tuft),
    ]

    for name, fn in to_render:
        img = fn()
        out = out_dir / name
        img.save(out, format="PNG")
        rel = out.relative_to(repo_root)
        print(f"  {name:25s} {img.size[0]:>3}x{img.size[1]:<3}  → {rel}")

    print(f"\n{len(to_render)} preview(s) générée(s) dans {out_dir.relative_to(repo_root)}/")


if __name__ == "__main__":
    main()
