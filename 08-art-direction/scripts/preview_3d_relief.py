"""Génère les previews avec plus de relief 3D :
- 4 factories (light, heavy, swarmer, sniper) — shading 4-tons, cast shadows
  depuis les éléments en relief, spots spéculaires
- tile-ground v4 — plaine lisse + rochers et dunes de sable avec relief, tileable

Sortie : 08-art-direction/preview/
"""

import math
import random
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from palette import (
    new_canvas, side_palette, drop_shadow, vertical_gradient,
    METAL, ACCENT, GROUND,
)


# ---------------------------------------------------------------------------
# Helpers 3D
# ---------------------------------------------------------------------------

SHADOW_OFFSET = (2, 3)        # direction "soleil top-left" → ombre bot-right
SHADOW_COLOR = (0, 0, 0, 110)
INNER_SHADOW = (0, 0, 0, 70)


def cast_shadow_rect(d, box, offset=SHADOW_OFFSET, color=SHADOW_COLOR, radius=3):
    """Dessine une ombre portée rectangulaire avant l'élément lui-même."""
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0 + offset[0], y0 + offset[1],
                         x1 + offset[0], y1 + offset[1]),
                        radius=radius, fill=color)


def cast_shadow_ellipse(d, box, offset=SHADOW_OFFSET, color=SHADOW_COLOR):
    x0, y0, x1, y1 = box
    d.ellipse((x0 + offset[0], y0 + offset[1],
               x1 + offset[0], y1 + offset[1]),
              fill=color)


def cast_shadow_polygon(d, points, offset=SHADOW_OFFSET, color=SHADOW_COLOR):
    shifted = [(x + offset[0], y + offset[1]) for x, y in points]
    d.polygon(shifted, fill=color)


def shaded_rect_3d(d, box, pal_dark, pal_base, pal_light, radius=3,
                   outline=None, specular=True):
    """Rectangle arrondi avec shading 4-tons + spot spéculaire top-left.

    Tons :
    - outline   : contour
    - pal_dark  : 30% bas (ombre)
    - pal_base  : 50% milieu
    - pal_light : 20% haut (highlight)
    - white     : 1 pixel spéculaire en haut à gauche
    """
    x0, y0, x1, y1 = box
    h = y1 - y0
    if outline is None:
        outline = ACCENT["outline"]
    # Corps base
    d.rounded_rectangle(box, radius=radius, fill=pal_base,
                        outline=outline, width=1)
    # Bande sombre bas (~30%)
    bd = max(2, int(h * 0.3))
    d.rounded_rectangle((x0 + 1, y1 - bd, x1 - 1, y1 - 1),
                        radius=max(1, radius - 1), fill=pal_dark)
    # Bande highlight haut (~20%)
    hl = max(2, int(h * 0.2))
    d.rounded_rectangle((x0 + 1, y0 + 1, x1 - 1, y0 + hl),
                        radius=max(1, radius - 1), fill=pal_light)
    # Spot spéculaire (petit point blanc top-left)
    if specular and (x1 - x0) > 6 and (y1 - y0) > 6:
        d.ellipse((x0 + 3, y0 + 2, x0 + 5, y0 + 4), fill=ACCENT["white"])


def shaded_polygon_3d(d, points, pal_base, pal_light, pal_dark, outline=None):
    """Polygone avec shading. Le polygone est dessiné en pal_base puis on
    ajoute un trait clair sur les arêtes supérieures et un trait sombre
    sur les arêtes inférieures."""
    if outline is None:
        outline = ACCENT["outline"]
    d.polygon(points, fill=pal_base, outline=outline)
    # Trouve les arêtes "supérieures" (y du milieu de l'arête < cy) et "inférieures"
    cy = sum(p[1] for p in points) / len(points)
    n = len(points)
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        edge_cy = (y1 + y2) / 2
        if edge_cy < cy - 1:
            d.line((x1, y1, x2, y2), fill=pal_light, width=1)
        elif edge_cy > cy + 1:
            d.line((x1, y1, x2, y2), fill=pal_dark, width=1)


def specular_dot(d, cx, cy, r=2):
    """Petit point blanc spéculaire."""
    d.ellipse((cx - r, cy - r, cx + r // 2, cy + r // 2), fill=ACCENT["white"])


def turret_3d(d, cx, cy, size, side_pal, barrel_dir="up"):
    """Tourelle avec cast shadow + shading 3-tons sur le dôme."""
    s = size
    # Cast shadow du socle
    cast_shadow_ellipse(d, (cx - s, cy - s, cx + s, cy + s))
    # Socle métal
    d.ellipse((cx - s, cy - s, cx + s, cy + s),
              fill=METAL["dark"], outline=ACCENT["outline"])
    # Anneau intérieur sombre
    d.ellipse((cx - s + 2, cy - s + 2, cx + s - 2, cy + s - 2),
              fill=METAL["darkest"])
    # Dôme coloré
    dr = int(s * 0.75)
    d.ellipse((cx - dr, cy - dr, cx + dr, cy + dr),
              fill=side_pal["base"], outline=ACCENT["outline"])
    # Bande claire haut du dôme (demi-cercle)
    d.chord((cx - dr + 1, cy - dr + 1, cx + dr - 1, cy + dr - 1),
            start=180, end=360, fill=side_pal["light"])
    # Spot spéculaire
    sx = cx - dr // 2
    sy = cy - dr // 2
    d.ellipse((sx, sy, sx + max(1, dr // 3), sy + max(1, dr // 3)),
              fill=side_pal["glow"])
    specular_dot(d, sx + 1, sy + 1, r=1)
    # Canons (avec cast shadow)
    bl = int(s * 1.4)
    bw = max(1, s // 4)
    offset = max(1, s // 3)
    if barrel_dir == "up":
        for dx_ in (-offset, offset):
            box = (cx + dx_ - bw, cy - bl, cx + dx_ + bw, cy)
            cast_shadow_rect(d, box, offset=(1, 2))
            d.rectangle(box, fill=METAL["darkest"], outline=ACCENT["outline"])
            d.line((cx + dx_ - bw, cy - bl + 1, cx + dx_ - bw + 1, cy - 1),
                   fill=METAL["light"])


def antenna_3d(d, x, y, length, tip_color=None):
    """Antenne avec cast shadow + boule en haut."""
    if tip_color is None:
        tip_color = ACCENT["warning"]
    # Cast shadow de la tige
    d.line((x + 1, y, x + 1, y - length), fill=SHADOW_COLOR, width=2)
    # Tige
    d.line((x, y, x, y - length), fill=METAL["darkest"], width=1)
    # Boule (cast shadow + boule)
    d.ellipse((x, y - length, x + 2, y - length + 2), fill=SHADOW_COLOR)
    d.ellipse((x - 2, y - length - 2, x + 2, y - length + 2), fill=tip_color)
    d.ellipse((x - 1, y - length - 1, x, y - length), fill=ACCENT["white"])


def rivets(d, box, color, spacing=12):
    x0, y0, x1, y1 = box
    r = 1
    for x in range(x0 + spacing, x1 - spacing + 1, spacing):
        d.ellipse((x - r, y0 + 2 - r, x + r, y0 + 2 + r), fill=color)
        d.ellipse((x - r, y1 - 2 - r, x + r, y1 - 2 + r), fill=color)
    for y in range(y0 + spacing, y1 - spacing + 1, spacing):
        d.ellipse((x0 + 2 - r, y - r, x0 + 2 + r, y + r), fill=color)
        d.ellipse((x1 - 2 - r, y - r, x1 - 2 + r, y + r), fill=color)


def gate(d, side: str, W: int, H: int, gate_w: int = 20):
    pal_glow = side_palette(side)["glow"]
    if side == "player":
        d.rectangle((W // 2 - gate_w // 2, H - 16, W // 2 + gate_w // 2, H - 4),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((W // 2 - gate_w // 2 + 3, H - 14,
                     W // 2 + gate_w // 2 - 3, H - 6),
                    fill=pal_glow)
    else:
        d.rectangle((W // 2 - gate_w // 2, 4, W // 2 + gate_w // 2, 16),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((W // 2 - gate_w // 2 + 3, 6,
                     W // 2 + gate_w // 2 - 3, 14),
                    fill=pal_glow)


def hex_points(cx, cy, r, rotate_deg=0):
    pts = []
    for i in range(6):
        ang = math.radians(60 * i + rotate_deg)
        pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    return pts


# ---------------------------------------------------------------------------
# FACTORY LIGHT 3D
# ---------------------------------------------------------------------------

def render_factory_light_3d(side):
    W = H = 128
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    # Plateforme (avec ombre profonde + couche claire dessus)
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=10,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    # Bord supérieur clair (relief plateforme)
    d.rounded_rectangle((6, 8, W - 6, 12), radius=8, fill=METAL["dark"])

    # Corps principal (4-tons)
    body = (12, 14, W - 12, H - 12)
    shaded_rect_3d(d, body, pal_dark=METAL["darkest"], pal_base=pal["base"],
                   pal_light=pal["light"], radius=6)
    rivets(d, body, METAL["darkest"], spacing=18)

    # Bandes diagonales jaunes/danger (signature "light")
    for off in range(-W, W, 14):
        d.polygon([(body[0] + off, body[1]), (body[0] + off + 6, body[1]),
                   (body[0] + off + 22, body[1] + 8),
                   (body[0] + off + 16, body[1] + 8)],
                  fill=METAL["darkest"])

    # Tourelle centrale (avec cast shadow)
    turret_3d(d, W // 2, H // 2 - 4, 10, pal, "up")

    # 2 antennes (signature "agile") avec cast shadow
    antenna_3d(d, body[0] + 8, body[1] + 4, 10, pal["glow"])
    antenna_3d(d, body[2] - 8, body[1] + 4, 10, pal["glow"])

    # Porte
    gate(d, side, W, H, gate_w=22)

    return drop_shadow(img, offset=(2, 3), blur=4, opacity=110)


# ---------------------------------------------------------------------------
# FACTORY HEAVY 3D
# ---------------------------------------------------------------------------

def render_factory_heavy_3d(side):
    W = H = 128
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    # Plateforme
    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=12,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((4, 6, W - 4, 10), radius=10, fill=METAL["dark"])

    # Corps massif (4-tons)
    body = (10, 12, W - 10, H - 10)
    shaded_rect_3d(d, body, pal_dark=METAL["darkest"], pal_base=pal["dark"],
                   pal_light=pal["base"], radius=4)
    rivets(d, body, METAL["darkest"], spacing=18)

    # 2 grosses cheminées (smokestacks) avec cast shadow + dégradé
    for cx in (W // 2 - 18, W // 2 + 18):
        # Cast shadow
        cast_shadow_ellipse(d, (cx - 8, H // 2 - 22, cx + 8, H // 2 - 6),
                            offset=(2, 2))
        # Cylindre métal
        d.ellipse((cx - 8, H // 2 - 22, cx + 8, H // 2 - 6),
                  fill=METAL["base"], outline=ACCENT["outline"])
        d.ellipse((cx - 7, H // 2 - 21, cx + 7, H // 2 - 9),
                  fill=METAL["dark"])
        d.ellipse((cx - 6, H // 2 - 20, cx + 6, H // 2 - 12),
                  fill=METAL["darkest"])
        # Fumée stylisée (3 cercles dégradés)
        d.ellipse((cx - 5, H // 2 - 28, cx + 3, H // 2 - 20),
                  fill=(240, 245, 255, 200))
        d.ellipse((cx - 3, H // 2 - 33, cx + 3, H // 2 - 27),
                  fill=(240, 245, 255, 140))
        # Spec sur cheminée
        d.line((cx - 6, H // 2 - 20, cx - 6, H // 2 - 14), fill=METAL["light"])

    # Gros canon central (cast shadow)
    turret_3d(d, W // 2, H // 2 + 12, 14, pal, "up")

    # 3 portes
    d.rectangle((4, H // 2 - 9, 14, H // 2 + 9),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((6, H // 2 - 6, 12, H // 2 + 6), fill=pal["glow"])
    d.rectangle((W - 14, H // 2 - 9, W - 4, H // 2 + 9),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((W - 12, H // 2 - 6, W - 6, H // 2 + 6), fill=pal["glow"])
    gate(d, side, W, H, gate_w=18)

    return drop_shadow(img, offset=(3, 4), blur=4, opacity=120)


# ---------------------------------------------------------------------------
# FACTORY SWARMER 3D
# ---------------------------------------------------------------------------

def render_factory_swarmer_3d(side):
    W = H = 128
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    cx, cy = W // 2, H // 2

    # Plateforme hexagonale (avec relief)
    plat_pts = hex_points(cx, cy, 58, rotate_deg=30)
    d.polygon(plat_pts, fill=METAL["darkest"], outline=ACCENT["outline"])

    # Corps hexagonal coloré (3-tons via shaded_polygon)
    body_pts = hex_points(cx, cy, 50, rotate_deg=30)
    shaded_polygon_3d(d, body_pts, pal_base=pal["base"],
                      pal_light=pal["light"], pal_dark=METAL["darkest"])

    # Bande highlight haut (trapèze plus marquée)
    d.polygon([
        (cx - 42, cy - 6),
        (cx - 22, cy - 42),
        (cx + 22, cy - 42),
        (cx + 42, cy - 6),
    ], fill=pal["light"])
    # Bande sombre bas (trapèze)
    d.polygon([
        (cx - 42, cy + 6),
        (cx - 22, cy + 42),
        (cx + 22, cy + 42),
        (cx + 42, cy + 6),
    ], fill=METAL["darkest"])
    # Sépare clair/sombre avec une ligne horizontale base
    d.line((cx - 48, cy, cx + 48, cy), fill=ACCENT["outline"], width=1)

    # 6 mini-pattes radiales (avec cast shadow)
    for i in range(6):
        ang = math.radians(60 * i + 30)
        x1 = cx + math.cos(ang) * 48
        y1 = cy + math.sin(ang) * 48
        x2 = cx + math.cos(ang) * 60
        y2 = cy + math.sin(ang) * 60
        # Shadow
        d.line((x1 + 1, y1 + 2, x2 + 1, y2 + 2), fill=SHADOW_COLOR, width=3)
        # Patte
        d.line((x1, y1, x2, y2), fill=METAL["darkest"], width=3)
        # Pointe
        d.ellipse((x2 - 2, y2 - 2, x2 + 2, y2 + 2), fill=METAL["light"])

    # 4 alvéoles hexagonales avec cast shadow et œufs lumineux 3D
    alveoles = [(cx - 22, cy - 12), (cx + 22, cy - 12),
                (cx - 22, cy + 18), (cx + 22, cy + 18)]
    for ax, ay in alveoles:
        # Cast shadow alvéole
        a_shad = hex_points(ax + 1, ay + 2, 11, rotate_deg=30)
        d.polygon(a_shad, fill=SHADOW_COLOR)
        # Alvéole creusée
        a_pts = hex_points(ax, ay, 11, rotate_deg=30)
        d.polygon(a_pts, fill=METAL["darkest"], outline=ACCENT["outline"])
        # Bord clair en haut (relief intérieur)
        a_inner = hex_points(ax, ay - 1, 9, rotate_deg=30)
        d.polygon([a_inner[3], a_inner[4], a_inner[5]],
                  fill=METAL["base"])  # bord arrière éclairé
        # Œuf glow 3D
        d.ellipse((ax - 5, ay - 5, ax + 5, ay + 5),
                  fill=pal["glow"], outline=ACCENT["outline"])
        d.chord((ax - 5, ay - 5, ax + 5, ay + 5), start=0, end=180,
                fill=pal["light"])
        d.ellipse((ax - 3, ay - 4, ax - 1, ay - 2), fill=ACCENT["white"])

    # Cœur central (réacteur 3D)
    cast_shadow_ellipse(d, (cx - 8, cy - 8, cx + 8, cy + 8))
    d.ellipse((cx - 8, cy - 8, cx + 8, cy + 8),
              fill=METAL["dark"], outline=ACCENT["outline"])
    d.ellipse((cx - 5, cy - 5, cx + 5, cy + 5),
              fill=pal["dark"], outline=ACCENT["outline"])
    d.ellipse((cx - 3, cy - 3, cx + 2, cy + 2), fill=pal["glow"])
    d.ellipse((cx - 2, cy - 2, cx, cy), fill=ACCENT["white"])

    # 2 antennes 3D aux pointes hex
    antenna_3d(d, int(plat_pts[1][0]), int(plat_pts[1][1]) + 4, 7, ACCENT["warning"])
    antenna_3d(d, int(plat_pts[2][0]), int(plat_pts[2][1]) + 4, 7, ACCENT["warning"])

    gate(d, side, W, H, gate_w=24)

    return drop_shadow(img, offset=(3, 4), blur=4, opacity=120)


# ---------------------------------------------------------------------------
# FACTORY SNIPER 3D
# ---------------------------------------------------------------------------

def render_factory_sniper_3d(side):
    W = H = 128
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    # Plateforme
    d.rounded_rectangle((8, 18, W - 8, H - 6), radius=8,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((8, 18, W - 8, 22), radius=6, fill=METAL["dark"])

    # Socle large blindé (4-tons)
    base_box = (16, 64, W - 16, H - 14)
    shaded_rect_3d(d, base_box, pal_dark=METAL["darkest"], pal_base=pal["dark"],
                   pal_light=pal["base"], radius=4)
    rivets(d, base_box, METAL["darkest"], spacing=16)

    # Créneaux / sacs de sable (avec relief)
    for x in range(20, W - 24, 12):
        cast_shadow_ellipse(d, (x, 56, x + 10, 68), offset=(1, 2))
        d.ellipse((x, 56, x + 10, 68),
                  fill=GROUND["dark"], outline=ACCENT["outline"])
        d.chord((x, 56, x + 10, 68), start=180, end=360,
                fill=GROUND["light"])
        d.line((x + 2, 62, x + 8, 62), fill=GROUND["darkest"])

    # Tour verticale avec cast shadow
    cast_shadow_rect(d, (W // 2 - 22, 26, W // 2 + 22, 62), offset=(2, 3))
    tower_box = (W // 2 - 22, 26, W // 2 + 22, 62)
    shaded_rect_3d(d, tower_box, pal_dark=METAL["darkest"],
                   pal_base=pal["base"], pal_light=pal["light"], radius=3)

    # Supports d'angle (avec cast shadow)
    for pts in [
        [(W // 2 - 30, 62), (W // 2 - 18, 62), (W // 2 - 22, 72)],
        [(W // 2 + 18, 62), (W // 2 + 30, 62), (W // 2 + 22, 72)],
    ]:
        cast_shadow_polygon(d, pts, offset=(1, 2))
        d.polygon(pts, fill=METAL["dark"], outline=ACCENT["outline"])
        d.line((pts[0][0], pts[0][1], pts[1][0], pts[1][1]),
               fill=METAL["light"])

    # Scope géant 3D au sommet
    sx, sy = W // 2, 22
    # Cast shadow
    cast_shadow_ellipse(d, (sx - 14, sy - 12, sx + 14, sy + 16))
    # Anneau métal extérieur
    d.ellipse((sx - 14, sy - 12, sx + 14, sy + 16),
              fill=METAL["base"], outline=ACCENT["outline"])
    # Anneau intérieur (bord biseauté)
    d.ellipse((sx - 12, sy - 10, sx + 12, sy + 14),
              fill=METAL["light"])
    # Cercle sombre profond
    d.ellipse((sx - 10, sy - 8, sx + 10, sy + 12),
              fill=METAL["darkest"])
    # Œil warning lumineux
    d.ellipse((sx - 7, sy - 5, sx + 7, sy + 9), fill=ACCENT["warning"])
    # Spec brillance
    d.chord((sx - 7, sy - 5, sx + 7, sy + 9), start=180, end=360,
            fill=(255, 230, 120, 220))
    d.ellipse((sx - 3, sy - 2, sx + 1, sy + 2), fill=ACCENT["white"])
    # Mire en croix
    d.line((sx - 6, sy + 2, sx + 6, sy + 2), fill=METAL["darkest"])
    d.line((sx, sy - 4, sx, sy + 8), fill=METAL["darkest"])

    # Long canon avec cast shadow et reflet
    barrel_y0, barrel_y1 = 42, 52
    if side == "player":
        bx0, bx1 = W // 2 + 22, W - 8
    else:
        bx0, bx1 = 8, W // 2 - 22
    cast_shadow_rect(d, (bx0, barrel_y0, bx1, barrel_y1), offset=(2, 3),
                     radius=2)
    d.rectangle((bx0, barrel_y0, bx1, barrel_y1),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    # Reflet haut du canon (2 lignes)
    d.line((bx0 + 1, barrel_y0 + 1, bx1 - 1, barrel_y0 + 1),
           fill=METAL["light"])
    d.line((bx0 + 1, barrel_y0 + 2, bx1 - 1, barrel_y0 + 2),
           fill=METAL["base"])
    # Bas du canon (ombre)
    d.line((bx0 + 1, barrel_y1 - 1, bx1 - 1, barrel_y1 - 1),
           fill=ACCENT["outline"])
    # Stabilisateur
    if side == "player":
        d.rectangle((W // 2 + 16, barrel_y0 - 2, W // 2 + 24, barrel_y1 + 2),
                    fill=METAL["dark"], outline=ACCENT["outline"])
    else:
        d.rectangle((W // 2 - 24, barrel_y0 - 2, W // 2 - 16, barrel_y1 + 2),
                    fill=METAL["dark"], outline=ACCENT["outline"])
    # Muzzle warning
    if side == "player":
        d.rectangle((bx1 - 4, barrel_y0, bx1, barrel_y1), fill=ACCENT["warning"])
    else:
        d.rectangle((bx0, barrel_y0, bx0 + 4, barrel_y1), fill=ACCENT["warning"])

    # 2 antennes radio
    antenna_3d(d, W // 2 - 16, 28, 8, pal["glow"])
    antenna_3d(d, W // 2 + 16, 28, 8, pal["glow"])

    gate(d, side, W, H, gate_w=16)

    return drop_shadow(img, offset=(3, 4), blur=4, opacity=120)


# ---------------------------------------------------------------------------
# TILE GROUND v4 — plaine + rochers + dunes (tileable)
# ---------------------------------------------------------------------------

def draw_tiled_ellipse(d, x, y, rx, ry, color, W, H):
    """Ellipse + 8 ghosts pour tileabilité."""
    for dx_ in (-W, 0, W):
        for dy_ in (-H, 0, H):
            d.ellipse((x + dx_ - rx, y + dy_ - ry,
                       x + dx_ + rx, y + dy_ + ry), fill=color)


def render_tile_ground_v4():
    W = H = 128
    # Base v3 : plaine lisse
    img = vertical_gradient(W, H, GROUND["base"], GROUND["dark"]).convert("RGBA")

    # Layer patches doux pour variation de tons
    rng = random.Random(7)
    patches = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(patches)
    for _ in range(14):
        x = rng.randint(0, W - 1)
        y = rng.randint(0, H - 1)
        r = rng.randint(18, 36)
        if rng.random() < 0.5:
            c = (GROUND["light"][0], GROUND["light"][1], GROUND["light"][2], 55)
        else:
            c = (GROUND["darkest"][0], GROUND["darkest"][1], GROUND["darkest"][2], 40)
        for dx_ in (-W, 0, W):
            for dy_ in (-H, 0, H):
                pd.ellipse((x + dx_ - r, y + dy_ - r,
                            x + dx_ + r, y + dy_ + r), fill=c)
    patches = patches.filter(ImageFilter.GaussianBlur(radius=10))
    img = Image.alpha_composite(img, patches)

    d = ImageDraw.Draw(img)

    # 2 dunes de sable allongées (gradient + relief)
    # Stratégie : ellipse longue, partie supérieure plus claire (sommet de dune),
    # partie inférieure plus sombre (ombre portée du sommet)
    dunes = [
        (35, 45, 28, 10),   # x, y, rx, ry
        (90, 95, 22, 8),
    ]
    for dx_, dy_, rx, ry in dunes:
        # Cast shadow (offset bot-droite, blurry via taille +)
        sh_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sh_d = ImageDraw.Draw(sh_layer)
        draw_tiled_ellipse(sh_d, dx_ + 3, dy_ + 4, rx, ry,
                           (0, 0, 0, 70), W, H)
        sh_layer = sh_layer.filter(ImageFilter.GaussianBlur(radius=3))
        img = Image.alpha_composite(img, sh_layer)
        d = ImageDraw.Draw(img)
        # Corps de la dune (sable plus clair)
        draw_tiled_ellipse(d, dx_, dy_, rx, ry, GROUND["light"] + (0,)[:0]
                           if False else GROUND["light"], W, H)
        # Crête éclairée (ellipse plus petite décalée vers le haut)
        crest_color = (GROUND["light"][0] + 10 if GROUND["light"][0] + 10 < 256 else 255,
                       GROUND["light"][1] + 10 if GROUND["light"][1] + 10 < 256 else 255,
                       GROUND["light"][2] + 10 if GROUND["light"][2] + 10 < 256 else 255,
                       255)
        draw_tiled_ellipse(d, dx_, dy_ - 3, rx - 4, max(2, ry - 4),
                           crest_color, W, H)

    # 3 rochers avec cast shadow
    rocks = [
        (20, 95, 7, 6, GROUND["darkest"]),
        (105, 30, 6, 5, METAL["dark"]),
        (70, 70, 9, 7, GROUND["darkest"]),
    ]
    for rx_, ry_, srx, sry, rcol in rocks:
        # Cast shadow allongée bot-droite
        sh_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sh_d = ImageDraw.Draw(sh_layer)
        draw_tiled_ellipse(sh_d, rx_ + 3, ry_ + 3, srx + 2, sry + 1,
                           (0, 0, 0, 110), W, H)
        sh_layer = sh_layer.filter(ImageFilter.GaussianBlur(radius=2))
        img = Image.alpha_composite(img, sh_layer)
        d = ImageDraw.Draw(img)
        # Corps rocher
        draw_tiled_ellipse(d, rx_, ry_, srx, sry, rcol, W, H)
        # Highlight haut-gauche (relief)
        hl_color = (min(255, rcol[0] + 50), min(255, rcol[1] + 50),
                    min(255, rcol[2] + 50), 255)
        for dx_w in (-W, 0, W):
            for dy_w in (-H, 0, H):
                d.chord((rx_ + dx_w - srx + 1, ry_ + dy_w - sry + 1,
                         rx_ + dx_w + srx - 1, ry_ + dy_w + sry - 1),
                        start=180, end=300, fill=hl_color)

    # Quelques ripples discrètes (sable sculpté par le vent)
    rng_r = random.Random(13)
    ripple_color = (GROUND["darkest"][0], GROUND["darkest"][1],
                    GROUND["darkest"][2], 80)
    for _ in range(4):
        x0 = rng_r.randint(5, W - 45)
        y0 = rng_r.randint(8, H - 8)
        length = rng_r.randint(25, 40)
        amp = rng_r.uniform(1.5, 3.0)
        phase = rng_r.uniform(0, math.pi)
        prev = None
        for dx_ in range(0, length, 1):
            y = y0 + amp * math.sin(dx_ / 5 + phase)
            cur = (x0 + dx_, y)
            if prev:
                d.line((prev[0], prev[1], cur[0], cur[1]),
                       fill=ripple_color, width=1)
            prev = cur

    return img


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    repo_root = THIS_DIR.parent.parent
    out_dir = repo_root / "08-art-direction" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)

    to_render = [
        ("factory-light-player-3d.png",   lambda: render_factory_light_3d("player")),
        ("factory-light-enemy-3d.png",    lambda: render_factory_light_3d("enemy")),
        ("factory-heavy-player-3d.png",   lambda: render_factory_heavy_3d("player")),
        ("factory-heavy-enemy-3d.png",    lambda: render_factory_heavy_3d("enemy")),
        ("factory-swarmer-player-3d.png", lambda: render_factory_swarmer_3d("player")),
        ("factory-swarmer-enemy-3d.png",  lambda: render_factory_swarmer_3d("enemy")),
        ("factory-sniper-player-3d.png",  lambda: render_factory_sniper_3d("player")),
        ("factory-sniper-enemy-3d.png",   lambda: render_factory_sniper_3d("enemy")),
        ("tile-ground-v4.png",            lambda: render_tile_ground_v4()),
    ]

    for name, fn in to_render:
        img = fn()
        out = out_dir / name
        img.save(out, format="PNG")
        print(f"  {name:36s} {img.size[0]:>4}x{img.size[1]:<4}  → {out.relative_to(repo_root)}")

    print(f"\n{len(to_render)} preview(s) générée(s) dans {out_dir.relative_to(repo_root)}/")


if __name__ == "__main__":
    main()
