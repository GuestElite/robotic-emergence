"""Génère les sprites du biome NEIGE.

Lancer depuis la racine du repo :
    python3 12-biomes/snow/scripts/generate_snow.py

Sortie : 12-biomes/snow/sprites/
- tile-ground.png           sol neige (neige tassée + glace + rochers + aiguilles)
- factory-*-enemy.png × 4   factories ennemies en thème arctic ops
- unit-*-enemy.png × 4      unités ennemies en thème arctic ops

Le joueur n'a pas de variant neige — il garde ses sprites bleus du désert.
"""

import math
import random
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent.parent
ART_SCRIPTS = REPO_ROOT / "08-art-direction" / "scripts"
sys.path.insert(0, str(ART_SCRIPTS))

from palette import new_canvas, drop_shadow, vertical_gradient, METAL, ACCENT
# Import des render_unit_* partagés (utilisés pour les tiers T1/T2 snow)
from generate_sprites import (
    render_unit_light, render_unit_heavy,
    render_unit_swarmer, render_unit_sniper, render_unit_air,
    render_unit_medic, render_factory_medic,
)


# ---------------------------------------------------------------------------
# Palettes Snow
# ---------------------------------------------------------------------------

# Ennemis arctic — gunmetal sombre + glow cyan glacé
ENEMY_SNOW = {
    "dark":  (26,  37,  48,  255),   # #1A2530 gunmetal très sombre
    "base":  (45,  63,  82,  255),   # #2D3F52 gunmetal bleu
    "light": (74,  97,  120, 255),   # #4A6178 acier bleuté
    "glow":  (91,  225, 255, 255),   # #5BE1FF cyan glacé
}

# Enemy snow tier 1 — gunmetal chromé + accents dorés subtils (Rare)
ENEMY_SNOW_T1 = {
    "dark":  ( 45,  63,  82, 255),   # gunmetal medium
    "base":  ( 90, 115, 140, 255),   # gunmetal chromé clair
    "light": (170, 192, 215, 255),   # acier brillant
    "glow":  ( 91, 225, 255, 255),   # cyan glacé (conservé)
}

# Enemy snow tier 2 — gunmetal très foncé + glow doré (Epic)
ENEMY_SNOW_T2 = {
    "dark":  ( 10,  18,  28, 255),   # noir profond bleuté
    "base":  ( 22,  35,  50, 255),   # gunmetal très sombre
    "light": ( 60,  85, 110, 255),   # acier intermédiaire
    "glow":  (251, 191,  36, 255),   # doré (yeux/voyants premium)
}

# Sol neige
GROUND_SNOW = {
    "darkest": (138, 154, 173, 255),  # #8A9AAD gris-bleu froid
    "dark":    (184, 199, 214, 255),  # #B8C7D6 neige ombrée
    "base":    (220, 230, 240, 255),  # #DCE6F0 neige tassée
    "light":   (240, 245, 250, 255),  # #F0F5FA neige éclairée
    "crack":   (110, 130, 152, 255),  # #6E8298 terre gelée
}

# Glace (overlays)
ICE = {
    "dark":  (168, 200, 224, 255),    # #A8C8E0
    "base":  (200, 224, 240, 255),    # #C8E0F0
    "light": (230, 242, 250, 255),    # #E6F2FA
}

# Pin / aiguilles de conifère
PINE = {
    "dark":  (42,  58,  31, 255),     # #2A3A1F
    "base":  (61,  81,  40, 255),     # #3D5128
    "light": (90,  112, 56, 255),     # #5A7038
}


# ---------------------------------------------------------------------------
# Helpers 3D (copiés depuis preview_3d_relief.py pour rendre ce dossier autonome)
# ---------------------------------------------------------------------------

SHADOW_OFFSET = (2, 3)
SHADOW_COLOR = (0, 0, 0, 110)


def cast_shadow_rect(d, box, offset=SHADOW_OFFSET, color=SHADOW_COLOR, radius=3):
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0 + offset[0], y0 + offset[1],
                         x1 + offset[0], y1 + offset[1]),
                        radius=radius, fill=color)


def cast_shadow_ellipse(d, box, offset=SHADOW_OFFSET, color=SHADOW_COLOR):
    x0, y0, x1, y1 = box
    d.ellipse((x0 + offset[0], y0 + offset[1],
               x1 + offset[0], y1 + offset[1]), fill=color)


def cast_shadow_polygon(d, points, offset=SHADOW_OFFSET, color=SHADOW_COLOR):
    shifted = [(x + offset[0], y + offset[1]) for x, y in points]
    d.polygon(shifted, fill=color)


def shaded_rect_3d(d, box, pal_dark, pal_base, pal_light, radius=3,
                   outline=None, specular=True):
    """Rectangle arrondi avec shading 4-tons + spot spéculaire top-left."""
    x0, y0, x1, y1 = box
    h = y1 - y0
    if outline is None:
        outline = ACCENT["outline"]
    d.rounded_rectangle(box, radius=radius, fill=pal_base,
                        outline=outline, width=1)
    bd = max(2, int(h * 0.3))
    d.rounded_rectangle((x0 + 1, y1 - bd, x1 - 1, y1 - 1),
                        radius=max(1, radius - 1), fill=pal_dark)
    hl = max(2, int(h * 0.2))
    d.rounded_rectangle((x0 + 1, y0 + 1, x1 - 1, y0 + hl),
                        radius=max(1, radius - 1), fill=pal_light)
    if specular and (x1 - x0) > 6 and (y1 - y0) > 6:
        d.ellipse((x0 + 3, y0 + 2, x0 + 5, y0 + 4), fill=ACCENT["white"])


def shaded_polygon_3d(d, points, pal_base, pal_light, pal_dark, outline=None):
    if outline is None:
        outline = ACCENT["outline"]
    d.polygon(points, fill=pal_base, outline=outline)
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


def turret_3d(d, cx, cy, size, pal, barrel_dir="up"):
    s = size
    cast_shadow_ellipse(d, (cx - s, cy - s, cx + s, cy + s))
    d.ellipse((cx - s, cy - s, cx + s, cy + s),
              fill=METAL["dark"], outline=ACCENT["outline"])
    d.ellipse((cx - s + 2, cy - s + 2, cx + s - 2, cy + s - 2),
              fill=METAL["darkest"])
    dr = int(s * 0.75)
    d.ellipse((cx - dr, cy - dr, cx + dr, cy + dr),
              fill=pal["base"], outline=ACCENT["outline"])
    d.chord((cx - dr + 1, cy - dr + 1, cx + dr - 1, cy + dr - 1),
            start=180, end=360, fill=pal["light"])
    sx = cx - dr // 2
    sy = cy - dr // 2
    d.ellipse((sx, sy, sx + max(1, dr // 3), sy + max(1, dr // 3)),
              fill=pal["glow"])
    d.ellipse((sx + 1, sy + 1, sx + 2, sy + 2), fill=ACCENT["white"])
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


def antenna_3d(d, x, y, length, tip_color):
    d.line((x + 1, y, x + 1, y - length), fill=SHADOW_COLOR, width=2)
    d.line((x, y, x, y - length), fill=METAL["darkest"], width=1)
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


def gate_enemy(d, W, H, gate_w=20):
    """Porte ennemie (haut du sprite) — glow cyan glacé arctic."""
    d.rectangle((W // 2 - gate_w // 2, 4, W // 2 + gate_w // 2, 16),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((W // 2 - gate_w // 2 + 3, 6,
                 W // 2 + gate_w // 2 - 3, 14),
                fill=ENEMY_SNOW["glow"])


def hex_points(cx, cy, r, rotate_deg=0):
    pts = []
    for i in range(6):
        ang = math.radians(60 * i + rotate_deg)
        pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    return pts


# ---------------------------------------------------------------------------
# UNITÉS snow (variantes enemy uniquement)
# ---------------------------------------------------------------------------

def render_unit_light_snow():
    W = H = 48
    pal = ENEMY_SNOW
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2
    d.ellipse((cx - 14, cy + 8, cx - 4, cy + 18), fill=METAL["darkest"])
    d.ellipse((cx + 4, cy + 8, cx + 14, cy + 18), fill=METAL["darkest"])
    d.polygon([(cx - 12, cy - 4), (cx - 6, cy - 14), (cx + 6, cy - 14),
               (cx + 12, cy - 4), (cx + 10, cy + 8), (cx - 10, cy + 8)],
              fill=pal["base"], outline=ACCENT["outline"])
    d.polygon([(cx - 10, cy - 4), (cx - 6, cy - 12), (cx, cy - 12), (cx - 4, cy - 4)],
              fill=pal["light"])
    d.ellipse((cx - 5, cy - 18, cx + 5, cy - 8), fill=pal["dark"],
              outline=ACCENT["outline"])
    d.ellipse((cx - 2, cy - 16, cx + 2, cy - 12), fill=pal["glow"])
    d.rectangle((cx + 6, cy - 6, cx + 16, cy - 2),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((cx + 14, cy - 5, cx + 16, cy - 3), fill=pal["glow"])
    return drop_shadow(img, offset=(1, 2), blur=2, opacity=110)


def render_unit_heavy_snow():
    W = H = 64
    pal = ENEMY_SNOW
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2
    for x_off in (-22, 14):
        d.rounded_rectangle((cx + x_off, cy - 22, cx + x_off + 8, cy + 22),
                            radius=2, fill=METAL["darkest"],
                            outline=ACCENT["outline"])
        for y in range(cy - 20, cy + 21, 4):
            d.line((cx + x_off + 1, y, cx + x_off + 7, y),
                   fill=METAL["light"], width=1)
    body = (cx - 14, cy - 16, cx + 14, cy + 16)
    shaded_rect_3d(d, body, pal_dark=METAL["darkest"], pal_base=pal["base"],
                   pal_light=pal["light"], radius=3)
    turret_3d(d, cx, cy, 9, pal, "up")
    d.rectangle((cx - 4, cy + 12, cx + 4, cy + 14), fill=pal["glow"])
    return drop_shadow(img, offset=(2, 2), blur=2, opacity=120)


def render_unit_swarmer_snow():
    W = H = 40
    pal = ENEMY_SNOW
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2
    leg_len = 12
    for angle_deg in (35, 95, 145, 215, 265, 325):
        rad = math.radians(angle_deg)
        x_end = int(cx + math.cos(rad) * leg_len)
        y_end = int(cy + math.sin(rad) * leg_len)
        d.line((cx, cy, x_end, y_end), fill=METAL["darkest"], width=2)
        d.ellipse((x_end - 1, y_end - 1, x_end + 1, y_end + 1),
                  fill=METAL["light"])
    r = 8
    hex_pts = []
    for i in range(6):
        ang = math.radians(60 * i + 30)
        hex_pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    d.polygon(hex_pts, fill=pal["base"], outline=ACCENT["outline"])
    r2 = 4
    hl_pts = []
    for i in range(6):
        ang = math.radians(60 * i + 30)
        hl_pts.append((cx + math.cos(ang) * r2, cy - 2 + math.sin(ang) * r2))
    d.polygon(hl_pts, fill=pal["light"])
    d.ellipse((cx + 3, cy - 2, cx + 8, cy + 3),
              fill=pal["glow"], outline=ACCENT["outline"])
    d.ellipse((cx + 5, cy, cx + 6, cy + 1), fill=ACCENT["outline"])
    d.line((cx + 8, cy - 1, cx + 12, cy - 4), fill=METAL["darkest"], width=1)
    d.line((cx + 8, cy + 2, cx + 12, cy + 5), fill=METAL["darkest"], width=1)
    return drop_shadow(img, offset=(1, 2), blur=2, opacity=100)


def render_unit_sniper_snow():
    W = H = 56
    pal = ENEMY_SNOW
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2
    leg_top_y = cy + 6
    leg_bottom_y = cy + 22
    for dx in (-7, 7):
        d.rectangle(
            (cx + dx - 3, leg_top_y, cx + dx + 3, leg_bottom_y),
            fill=METAL["dark"], outline=ACCENT["outline"],
        )
        d.rectangle((cx + dx - 2, leg_top_y + 1, cx + dx - 1, leg_bottom_y - 2),
                    fill=METAL["light"])
        d.ellipse(
            (cx + dx - 5, leg_bottom_y - 2, cx + dx + 5, leg_bottom_y + 4),
            fill=METAL["darkest"], outline=ACCENT["outline"],
        )
    body = (cx - 10, cy - 16, cx + 10, cy + 8)
    shaded_rect_3d(d, body, pal_dark=METAL["darkest"], pal_base=pal["base"],
                   pal_light=pal["light"], radius=3)
    d.rectangle((cx - 4, cy - 6, cx + 4, cy + 2), fill=pal["dark"])
    d.line((cx, cy - 6, cx, cy + 2), fill=ACCENT["outline"])
    d.rectangle((cx - 4, cy - 22, cx + 4, cy - 16),
                fill=METAL["base"], outline=ACCENT["outline"])
    d.ellipse((cx - 2, cy - 21, cx + 2, cy - 17), fill=pal["glow"])
    d.ellipse((cx - 1, cy - 20, cx, cy - 19), fill=ACCENT["white"])
    barrel_y0 = cy - 3
    barrel_y1 = cy + 1
    d.rectangle((cx + 10, barrel_y0, cx + 26, barrel_y1),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.line((cx + 11, barrel_y0 + 1, cx + 25, barrel_y0 + 1),
           fill=METAL["light"])
    d.rectangle((cx + 24, barrel_y0, cx + 26, barrel_y1),
                fill=pal["glow"])
    d.rectangle((cx + 8, cy - 5, cx + 12, cy + 3),
                fill=METAL["dark"], outline=ACCENT["outline"])
    return drop_shadow(img, offset=(2, 2), blur=2, opacity=120)


# ---------------------------------------------------------------------------
# FACTORIES snow (variantes enemy uniquement)
# ---------------------------------------------------------------------------

def render_factory_light_snow():
    W = H = 128
    pal = ENEMY_SNOW
    img, d = new_canvas(W, H)
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=10,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((6, 8, W - 6, 12), radius=8, fill=METAL["dark"])
    body = (12, 14, W - 12, H - 12)
    shaded_rect_3d(d, body, pal_dark=METAL["darkest"], pal_base=pal["base"],
                   pal_light=pal["light"], radius=6)
    rivets(d, body, METAL["darkest"], spacing=18)
    for off in range(-W, W, 14):
        d.polygon([(body[0] + off, body[1]), (body[0] + off + 6, body[1]),
                   (body[0] + off + 22, body[1] + 8),
                   (body[0] + off + 16, body[1] + 8)],
                  fill=METAL["darkest"])
    turret_3d(d, W // 2, H // 2 - 4, 10, pal, "up")
    antenna_3d(d, body[0] + 8, body[1] + 4, 10, pal["glow"])
    antenna_3d(d, body[2] - 8, body[1] + 4, 10, pal["glow"])
    gate_enemy(d, W, H, gate_w=22)
    return drop_shadow(img, offset=(2, 3), blur=4, opacity=110)


def render_factory_heavy_snow():
    W = H = 128
    pal = ENEMY_SNOW
    img, d = new_canvas(W, H)
    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=12,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((4, 6, W - 4, 10), radius=10, fill=METAL["dark"])
    body = (10, 12, W - 10, H - 10)
    shaded_rect_3d(d, body, pal_dark=METAL["darkest"], pal_base=pal["dark"],
                   pal_light=pal["base"], radius=4)
    rivets(d, body, METAL["darkest"], spacing=18)
    for cx in (W // 2 - 18, W // 2 + 18):
        cast_shadow_ellipse(d, (cx - 8, H // 2 - 22, cx + 8, H // 2 - 6),
                            offset=(2, 2))
        d.ellipse((cx - 8, H // 2 - 22, cx + 8, H // 2 - 6),
                  fill=METAL["base"], outline=ACCENT["outline"])
        d.ellipse((cx - 7, H // 2 - 21, cx + 7, H // 2 - 9),
                  fill=METAL["dark"])
        d.ellipse((cx - 6, H // 2 - 20, cx + 6, H // 2 - 12),
                  fill=METAL["darkest"])
        # Fumée blanche (visible sur fond neigeux mais teintée gris-bleu)
        d.ellipse((cx - 5, H // 2 - 28, cx + 3, H // 2 - 20),
                  fill=(220, 230, 240, 200))
        d.ellipse((cx - 3, H // 2 - 33, cx + 3, H // 2 - 27),
                  fill=(220, 230, 240, 140))
        d.line((cx - 6, H // 2 - 20, cx - 6, H // 2 - 14), fill=METAL["light"])
    turret_3d(d, W // 2, H // 2 + 12, 14, pal, "up")
    d.rectangle((4, H // 2 - 9, 14, H // 2 + 9),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((6, H // 2 - 6, 12, H // 2 + 6), fill=pal["glow"])
    d.rectangle((W - 14, H // 2 - 9, W - 4, H // 2 + 9),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((W - 12, H // 2 - 6, W - 6, H // 2 + 6), fill=pal["glow"])
    gate_enemy(d, W, H, gate_w=18)
    return drop_shadow(img, offset=(3, 4), blur=4, opacity=120)


def render_factory_swarmer_snow():
    W = H = 128
    pal = ENEMY_SNOW
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2
    plat_pts = hex_points(cx, cy, 58, rotate_deg=30)
    d.polygon(plat_pts, fill=METAL["darkest"], outline=ACCENT["outline"])
    body_pts = hex_points(cx, cy, 50, rotate_deg=30)
    shaded_polygon_3d(d, body_pts, pal_base=pal["base"],
                      pal_light=pal["light"], pal_dark=METAL["darkest"])
    d.polygon([(cx - 42, cy - 6), (cx - 22, cy - 42),
               (cx + 22, cy - 42), (cx + 42, cy - 6)],
              fill=pal["light"])
    d.polygon([(cx - 42, cy + 6), (cx - 22, cy + 42),
               (cx + 22, cy + 42), (cx + 42, cy + 6)],
              fill=METAL["darkest"])
    d.line((cx - 48, cy, cx + 48, cy), fill=ACCENT["outline"], width=1)
    for i in range(6):
        ang = math.radians(60 * i + 30)
        x1 = cx + math.cos(ang) * 48
        y1 = cy + math.sin(ang) * 48
        x2 = cx + math.cos(ang) * 60
        y2 = cy + math.sin(ang) * 60
        d.line((x1 + 1, y1 + 2, x2 + 1, y2 + 2), fill=SHADOW_COLOR, width=3)
        d.line((x1, y1, x2, y2), fill=METAL["darkest"], width=3)
        d.ellipse((x2 - 2, y2 - 2, x2 + 2, y2 + 2), fill=METAL["light"])
    alveoles = [(cx - 22, cy - 12), (cx + 22, cy - 12),
                (cx - 22, cy + 18), (cx + 22, cy + 18)]
    for ax, ay in alveoles:
        a_shad = hex_points(ax + 1, ay + 2, 11, rotate_deg=30)
        d.polygon(a_shad, fill=SHADOW_COLOR)
        a_pts = hex_points(ax, ay, 11, rotate_deg=30)
        d.polygon(a_pts, fill=METAL["darkest"], outline=ACCENT["outline"])
        d.ellipse((ax - 5, ay - 5, ax + 5, ay + 5),
                  fill=pal["glow"], outline=ACCENT["outline"])
        d.chord((ax - 5, ay - 5, ax + 5, ay + 5), start=0, end=180,
                fill=pal["light"])
        d.ellipse((ax - 3, ay - 4, ax - 1, ay - 2), fill=ACCENT["white"])
    cast_shadow_ellipse(d, (cx - 8, cy - 8, cx + 8, cy + 8))
    d.ellipse((cx - 8, cy - 8, cx + 8, cy + 8),
              fill=METAL["dark"], outline=ACCENT["outline"])
    d.ellipse((cx - 5, cy - 5, cx + 5, cy + 5),
              fill=pal["dark"], outline=ACCENT["outline"])
    d.ellipse((cx - 3, cy - 3, cx + 2, cy + 2), fill=pal["glow"])
    d.ellipse((cx - 2, cy - 2, cx, cy), fill=ACCENT["white"])
    antenna_3d(d, int(plat_pts[1][0]), int(plat_pts[1][1]) + 4, 7, pal["glow"])
    antenna_3d(d, int(plat_pts[2][0]), int(plat_pts[2][1]) + 4, 7, pal["glow"])
    gate_enemy(d, W, H, gate_w=24)
    return drop_shadow(img, offset=(3, 4), blur=4, opacity=120)


def render_unit_air_snow():
    """Chasseur delta enemy en thème arctic (gunmetal + glow cyan glacé).
    Orientation : pointe vers la droite (+X). game.js flippe pour enemy au runtime."""
    W = H = 48
    pal = ENEMY_SNOW
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2

    # Ombre projetée au sol
    shadow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd_shadow = ImageDraw.Draw(shadow_layer, "RGBA")
    sd_shadow.polygon(
        [(cx + 22, cy + 5), (cx - 14, cy + 14), (cx - 14, cy - 4)],
        fill=(0, 0, 0, 90),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, shadow_layer)
    d = ImageDraw.Draw(img, "RGBA")

    # Aile delta swept-back
    wing = [(cx + 20, cy), (cx - 16, cy - 14), (cx - 8, cy), (cx - 16, cy + 14)]
    d.polygon(wing, fill=pal["base"], outline=ACCENT["outline"])
    d.line((cx + 20, cy, cx - 16, cy - 14), fill=pal["light"], width=1)

    # Fuselage central effilé
    d.polygon(
        [(cx + 18, cy - 1), (cx + 18, cy + 1),
         (cx - 12, cy + 4), (cx - 12, cy - 4)],
        fill=pal["dark"], outline=ACCENT["outline"],
    )

    # Cockpit glow cyan glacé
    d.ellipse((cx + 4, cy - 3, cx + 14, cy + 3),
              fill=pal["glow"], outline=ACCENT["outline"])
    d.ellipse((cx + 6, cy - 2, cx + 9, cy), fill=ACCENT["white"])

    # Missiles sous les ailes (avec pointe glow cyan)
    d.rectangle((cx - 4, cy - 10, cx + 8, cy - 8),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((cx + 6, cy - 10, cx + 8, cy - 8), fill=pal["glow"])
    d.rectangle((cx - 4, cy + 8, cx + 8, cy + 10),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((cx + 6, cy + 8, cx + 8, cy + 10), fill=pal["glow"])

    # Réacteurs arrière (flamme cyan)
    d.rectangle((cx - 16, cy - 6, cx - 10, cy - 2),
                fill=METAL["dark"], outline=ACCENT["outline"])
    d.rectangle((cx - 17, cy - 5, cx - 16, cy - 3), fill=pal["glow"])
    d.rectangle((cx - 16, cy + 2, cx - 10, cy + 6),
                fill=METAL["dark"], outline=ACCENT["outline"])
    d.rectangle((cx - 17, cy + 3, cx - 16, cy + 5), fill=pal["glow"])

    # Empennage stabilisateur
    d.polygon([(cx - 10, cy - 1), (cx - 10, cy + 1), (cx - 14, cy)],
              fill=METAL["light"])

    return drop_shadow(img, offset=(1, 2), blur=2, opacity=90)


def render_factory_air_snow():
    """Hangar à toit ouvert enemy en thème arctic. Sprite dessiné en orientation
    'player' puis flippé verticalement → toit ouvre vers le sud."""
    W = H = 128
    pal = ENEMY_SNOW
    img, d = new_canvas(W, H)

    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=10,
                        fill=METAL["darkest"], outline=ACCENT["outline"], width=1)

    sub_img, sd = new_canvas(W, H)

    # Corps principal (gunmetal)
    body = (12, 14, W - 12, H - 12)
    shaded_rect_3d(sd, body, pal_dark=METAL["darkest"], pal_base=pal["base"],
                   pal_light=pal["light"], radius=6)
    rivets(sd, body, METAL["darkest"], spacing=18)

    # Ouverture centrale
    opening = (32, 20, W - 32, 70)
    sd.rectangle(opening, fill=METAL["darkest"])
    sd.rectangle((opening[0], opening[1], opening[2], opening[1] + 2),
                 fill=ACCENT["outline"])

    # Toits ouverts (trapèzes inclinés)
    left_roof = [(32, 20), (32, 70), (14, 60), (14, 28)]
    sd.polygon(left_roof, fill=METAL["dark"], outline=ACCENT["outline"])
    sd.line((14, 28, 32, 20), fill=METAL["light"], width=1)
    sd.ellipse((12, 32, 16, 36), fill=METAL["light"], outline=ACCENT["outline"])
    sd.ellipse((12, 56, 16, 60), fill=METAL["light"], outline=ACCENT["outline"])

    right_roof = [(W - 32, 20), (W - 32, 70), (W - 14, 60), (W - 14, 28)]
    sd.polygon(right_roof, fill=METAL["dark"], outline=ACCENT["outline"])
    sd.line((W - 14, 28, W - 32, 20), fill=METAL["light"], width=1)
    sd.ellipse((W - 16, 32, W - 12, 36), fill=METAL["light"], outline=ACCENT["outline"])
    sd.ellipse((W - 16, 56, W - 12, 60), fill=METAL["light"], outline=ACCENT["outline"])

    # Rampe de lancement (gunmetal sombre + rayures cyan)
    ramp = [(38, 68), (W - 38, 68), (W - 50, 24), (50, 24)]
    sd.polygon(ramp, fill=pal["dark"], outline=ACCENT["outline"])
    for y_off, x_shrink in ((32, 1), (42, 3), (52, 5), (62, 7)):
        sd.line((50 + x_shrink, y_off, W - 50 - x_shrink, y_off),
                fill=pal["glow"], width=1)

    # Mini drone delta sur la rampe (pointe vers le haut)
    cx_d, cy_d = W // 2, 44
    sd.polygon([(cx_d, cy_d - 14), (cx_d - 14, cy_d + 10), (cx_d + 14, cy_d + 10)],
               fill=pal["light"], outline=ACCENT["outline"])
    sd.polygon([(cx_d, cy_d - 12), (cx_d - 4, cy_d + 10), (cx_d + 4, cy_d + 10)],
               fill=pal["base"])
    sd.ellipse((cx_d - 3, cy_d - 5, cx_d + 3, cy_d + 1), fill=pal["glow"])
    sd.ellipse((cx_d - 1, cy_d - 4, cx_d + 1, cy_d - 2), fill=ACCENT["white"])
    sd.rectangle((cx_d - 10, cy_d, cx_d - 7, cy_d + 7), fill=METAL["darkest"])
    sd.rectangle((cx_d + 7, cy_d, cx_d + 10, cy_d + 7), fill=METAL["darkest"])
    sd.rectangle((cx_d - 10, cy_d, cx_d - 7, cy_d + 2), fill=pal["glow"])
    sd.rectangle((cx_d + 7, cy_d, cx_d + 10, cy_d + 2), fill=pal["glow"])

    # Marqueur H façon héliport
    cx_h, cy_h = W // 2, 96
    sd.rectangle((cx_h - 14, cy_h - 9, cx_h + 14, cy_h + 9),
                 fill=pal["dark"], outline=ACCENT["outline"])
    sd.rectangle((cx_h - 10, cy_h - 6, cx_h - 6, cy_h + 6), fill=pal["glow"])
    sd.rectangle((cx_h + 6, cy_h - 6, cx_h + 10, cy_h + 6), fill=pal["glow"])
    sd.rectangle((cx_h - 10, cy_h - 2, cx_h + 10, cy_h + 2), fill=pal["glow"])

    # Antennes
    antenna_3d(sd, 22, 80, 14, pal["glow"])
    antenna_3d(sd, W - 22, 80, 14, pal["glow"])

    # Lumières de balisage (cyan glacé pour cohérence biome)
    for cx, cy in [(20, 90), (W - 20, 90), (34, 16), (W - 34, 16)]:
        sd.ellipse((cx - 2, cy - 2, cx + 2, cy + 2),
                   fill=pal["glow"], outline=ACCENT["outline"])

    # Porte arrière de service
    gate_w = 22
    sd.rectangle((W // 2 - gate_w // 2, H - 14, W // 2 + gate_w // 2, H - 6),
                 fill=METAL["darkest"], outline=ACCENT["outline"])
    sd.rectangle((W // 2 - gate_w // 2 + 3, H - 12, W // 2 + gate_w // 2 - 3, H - 8),
                 fill=pal["glow"])

    # Flip vertical → orientation enemy
    sub_img = sub_img.transpose(Image.FLIP_TOP_BOTTOM)
    img = Image.alpha_composite(img, sub_img)
    return drop_shadow(img, offset=(3, 4), blur=4, opacity=120)


def render_factory_sniper_snow():
    W = H = 128
    pal = ENEMY_SNOW
    img, d = new_canvas(W, H)
    d.rounded_rectangle((8, 18, W - 8, H - 6), radius=8,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((8, 18, W - 8, 22), radius=6, fill=METAL["dark"])
    base_box = (16, 64, W - 16, H - 14)
    shaded_rect_3d(d, base_box, pal_dark=METAL["darkest"], pal_base=pal["dark"],
                   pal_light=pal["base"], radius=4)
    rivets(d, base_box, METAL["darkest"], spacing=16)
    # Créneaux teintés neige/glace (au lieu du sable du désert ou de la terre jungle)
    for x in range(20, W - 24, 12):
        cast_shadow_ellipse(d, (x, 56, x + 10, 68), offset=(1, 2))
        d.ellipse((x, 56, x + 10, 68),
                  fill=GROUND_SNOW["dark"], outline=ACCENT["outline"])
        d.chord((x, 56, x + 10, 68), start=180, end=360,
                fill=GROUND_SNOW["light"])
        d.line((x + 2, 62, x + 8, 62), fill=GROUND_SNOW["darkest"])
    cast_shadow_rect(d, (W // 2 - 22, 26, W // 2 + 22, 62), offset=(2, 3))
    tower_box = (W // 2 - 22, 26, W // 2 + 22, 62)
    shaded_rect_3d(d, tower_box, pal_dark=METAL["darkest"],
                   pal_base=pal["base"], pal_light=pal["light"], radius=3)
    for pts in [
        [(W // 2 - 30, 62), (W // 2 - 18, 62), (W // 2 - 22, 72)],
        [(W // 2 + 18, 62), (W // 2 + 30, 62), (W // 2 + 22, 72)],
    ]:
        cast_shadow_polygon(d, pts, offset=(1, 2))
        d.polygon(pts, fill=METAL["dark"], outline=ACCENT["outline"])
        d.line((pts[0][0], pts[0][1], pts[1][0], pts[1][1]),
               fill=METAL["light"])
    sx, sy = W // 2, 22
    cast_shadow_ellipse(d, (sx - 14, sy - 12, sx + 14, sy + 16))
    d.ellipse((sx - 14, sy - 12, sx + 14, sy + 16),
              fill=METAL["base"], outline=ACCENT["outline"])
    d.ellipse((sx - 12, sy - 10, sx + 12, sy + 14),
              fill=METAL["light"])
    d.ellipse((sx - 10, sy - 8, sx + 10, sy + 12),
              fill=METAL["darkest"])
    d.ellipse((sx - 7, sy - 5, sx + 7, sy + 9), fill=pal["glow"])
    d.chord((sx - 7, sy - 5, sx + 7, sy + 9), start=180, end=360,
            fill=pal["light"])
    d.ellipse((sx - 3, sy - 2, sx + 1, sy + 2), fill=ACCENT["white"])
    d.line((sx - 6, sy + 2, sx + 6, sy + 2), fill=METAL["darkest"])
    d.line((sx, sy - 4, sx, sy + 8), fill=METAL["darkest"])
    # Canon pointe à gauche pour enemy (vers la base joueur)
    barrel_y0, barrel_y1 = 42, 52
    bx0, bx1 = 8, W // 2 - 22
    cast_shadow_rect(d, (bx0, barrel_y0, bx1, barrel_y1), offset=(2, 3),
                     radius=2)
    d.rectangle((bx0, barrel_y0, bx1, barrel_y1),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.line((bx0 + 1, barrel_y0 + 1, bx1 - 1, barrel_y0 + 1),
           fill=METAL["light"])
    d.line((bx0 + 1, barrel_y0 + 2, bx1 - 1, barrel_y0 + 2),
           fill=METAL["base"])
    d.line((bx0 + 1, barrel_y1 - 1, bx1 - 1, barrel_y1 - 1),
           fill=ACCENT["outline"])
    d.rectangle((W // 2 - 24, barrel_y0 - 2, W // 2 - 16, barrel_y1 + 2),
                fill=METAL["dark"], outline=ACCENT["outline"])
    d.rectangle((bx0, barrel_y0, bx0 + 4, barrel_y1), fill=pal["glow"])
    antenna_3d(d, W // 2 - 16, 28, 8, pal["glow"])
    antenna_3d(d, W // 2 + 16, 28, 8, pal["glow"])
    gate_enemy(d, W, H, gate_w=16)
    return drop_shadow(img, offset=(3, 4), blur=4, opacity=120)


# ---------------------------------------------------------------------------
# TILE GROUND snow — sol arctique (tileable)
# ---------------------------------------------------------------------------

def render_tile_ground_snow():
    W = H = 128
    # Gradient subtil : neige éclairée → neige tassée
    img = vertical_gradient(W, H, GROUND_SNOW["light"],
                            GROUND_SNOW["base"]).convert("RGBA")

    # --- Variations de tons (zones plus claires ET zones d'ombre bleutée)
    rng = random.Random(7)
    patches = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(patches)
    for _ in range(14):
        x = rng.randint(0, W - 1)
        y = rng.randint(0, H - 1)
        r = rng.randint(16, 38)
        if rng.random() < 0.55:
            # Ombre froide
            c = (GROUND_SNOW["dark"][0], GROUND_SNOW["dark"][1],
                 GROUND_SNOW["dark"][2], 75)
        else:
            # Réveil de neige éclairée
            c = (GROUND_SNOW["light"][0], GROUND_SNOW["light"][1],
                 GROUND_SNOW["light"][2], 90)
        for dx_ in (-W, 0, W):
            for dy_ in (-H, 0, H):
                pd.ellipse((x + dx_ - r, y + dy_ - r,
                            x + dx_ + r, y + dy_ + r), fill=c)
    patches = patches.filter(ImageFilter.GaussianBlur(radius=11))
    img = Image.alpha_composite(img, patches)

    # --- 3 plaques de glace bleutées (formes oblongues avec teinte cyan, fortement blurrées)
    ice_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    icd = ImageDraw.Draw(ice_layer)
    ice_patches = [
        (38, 48, 24, 14),   # cx, cy, rx, ry
        (92, 88, 20, 12),
        (110, 30, 16, 10),
    ]
    for ix, iy, rx, ry in ice_patches:
        c = (ICE["base"][0], ICE["base"][1], ICE["base"][2], 130)
        for dx_ in (-W, 0, W):
            for dy_ in (-H, 0, H):
                icd.ellipse((ix + dx_ - rx, iy + dy_ - ry,
                             ix + dx_ + rx, iy + dy_ + ry), fill=c)
    ice_layer = ice_layer.filter(ImageFilter.GaussianBlur(radius=4))
    img = Image.alpha_composite(img, ice_layer)

    d = ImageDraw.Draw(img)

    # --- Détails de glace (bords plus nets, reflets) sur les plaques
    for ix, iy, rx, ry in ice_patches:
        for dx_ in (-W, 0, W):
            for dy_ in (-H, 0, H):
                # Bord intérieur plus foncé (ombre de la dépression)
                d.ellipse((ix + dx_ - rx + 1, iy + dy_ - ry + 1,
                           ix + dx_ + rx - 1, iy + dy_ + ry - 1),
                          outline=ICE["dark"], width=1)
                # Reflet (arc clair en haut)
                d.chord((ix + dx_ - rx + 3, iy + dy_ - ry + 2,
                         ix + dx_ + rx - 3, iy + dy_ + ry - 2),
                        start=200, end=340, fill=None, outline=ICE["light"],
                        width=1)
                # Petits éclats brillants
                d.ellipse((ix + dx_ - rx // 2 - 1, iy + dy_ - 1,
                           ix + dx_ - rx // 2 + 1, iy + dy_ + 1),
                          fill=ICE["light"])
                d.point((ix + dx_ + 2, iy + dy_ - ry // 2), fill=ACCENT["white"])

    # --- 3 petits rochers sombres (avec cast shadow + highlight)
    rocks = [
        (22, 80, 7),    # cx, cy, size
        (70, 22, 6),
        (60, 110, 5),
    ]
    for rx, ry, rs in rocks:
        # Cast shadow (ovale doux bas-droite)
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        shd = ImageDraw.Draw(sh)
        for dx_w in (-W, 0, W):
            for dy_w in (-H, 0, H):
                shd.ellipse((rx + dx_w - rs + 2, ry + dy_w - rs // 2 + 3,
                             rx + dx_w + rs + 4, ry + dy_w + rs - 1 + 3),
                            fill=(0, 0, 0, 95))
        sh = sh.filter(ImageFilter.GaussianBlur(radius=2))
        img = Image.alpha_composite(img, sh)
        d = ImageDraw.Draw(img)
        # Corps du rocher (gris-bleu froid)
        for dx_w in (-W, 0, W):
            for dy_w in (-H, 0, H):
                # Forme légèrement irrégulière (2 ellipses overlap)
                d.ellipse((rx + dx_w - rs, ry + dy_w - rs + 1,
                           rx + dx_w + rs, ry + dy_w + rs - 1),
                          fill=GROUND_SNOW["crack"])
                d.ellipse((rx + dx_w - rs + 1, ry + dy_w - rs,
                           rx + dx_w + rs - 1, ry + dy_w + rs // 2),
                          fill=GROUND_SNOW["darkest"])
                # Highlight (croissant haut-gauche éclairé)
                d.chord((rx + dx_w - rs + 1, ry + dy_w - rs + 1,
                         rx + dx_w + rs - 1, ry + dy_w + rs - 2),
                        start=180, end=300, fill=None,
                        outline=GROUND_SNOW["dark"], width=1)
                # Petite calotte de neige sur le dessus
                d.chord((rx + dx_w - rs + 1, ry + dy_w - rs,
                         rx + dx_w + rs - 1, ry + dy_w),
                        start=200, end=340, fill=GROUND_SNOW["light"])

    # --- 4 petits clusters d'aiguilles de pin tombées (subtil, faible densité)
    rng_p = random.Random(19)
    pine_clusters = [
        (52, 28, 5),     # cx, cy, size
        (104, 60, 4),
        (15, 50, 4),
        (82, 102, 5),
    ]
    for px_, py_, ps in pine_clusters:
        # 4-6 petites aiguilles orientées aléatoirement
        n = rng_p.randint(4, 6)
        for _ in range(n):
            ang = math.radians(rng_p.uniform(0, 360))
            length = rng_p.uniform(ps * 0.7, ps * 1.2)
            ex = px_ + math.cos(ang) * length
            ey = py_ + math.sin(ang) * length
            color = PINE["base"] if rng_p.random() > 0.4 else PINE["dark"]
            for dx_w in (-W, 0, W):
                for dy_w in (-H, 0, H):
                    d.line((px_ + dx_w, py_ + dy_w,
                            ex + dx_w, ey + dy_w),
                           fill=color, width=1)
            # Petit point clair à la pointe (lumière)
            if rng_p.random() > 0.5:
                for dx_w in (-W, 0, W):
                    for dy_w in (-H, 0, H):
                        d.point((ex + dx_w, ey + dy_w), fill=PINE["light"])

    # --- Petits flocons / cristaux éparpillés (points lumineux)
    rng_s = random.Random(29)
    for _ in range(14):
        x = rng_s.randint(2, W - 2)
        y = rng_s.randint(2, H - 2)
        d.point((x, y), fill=ACCENT["white"])
        if rng_s.random() > 0.6:
            d.point((x + 1, y), fill=GROUND_SNOW["light"])
            d.point((x, y + 1), fill=GROUND_SNOW["light"])

    # --- Stries de vent (très légères lignes diagonales claires)
    wind_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wind_layer)
    rng_w = random.Random(37)
    for _ in range(6):
        y = rng_w.randint(0, H - 1)
        x_start = rng_w.randint(0, W - 1)
        length = rng_w.randint(18, 32)
        for dx_w in (-W, 0, W):
            for dy_w in (-H, 0, H):
                wd.line((x_start + dx_w, y + dy_w,
                         x_start + dx_w + length, y + dy_w - 3),
                        fill=(GROUND_SNOW["light"][0],
                              GROUND_SNOW["light"][1],
                              GROUND_SNOW["light"][2], 110),
                        width=1)
    wind_layer = wind_layer.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, wind_layer)

    return img


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    out_dir = THIS_DIR.parent / "sprites"
    out_dir.mkdir(parents=True, exist_ok=True)

    to_render = [
        ("tile-ground.png",            render_tile_ground_snow),
        ("unit-light-enemy.png",       render_unit_light_snow),
        ("unit-heavy-enemy.png",       render_unit_heavy_snow),
        ("unit-swarmer-enemy.png",     render_unit_swarmer_snow),
        ("unit-sniper-enemy.png",      render_unit_sniper_snow),
        ("unit-air-enemy.png",         render_unit_air_snow),
        ("factory-light-enemy.png",    render_factory_light_snow),
        ("factory-heavy-enemy.png",    render_factory_heavy_snow),
        ("factory-swarmer-enemy.png",  render_factory_swarmer_snow),
        ("factory-sniper-enemy.png",   render_factory_sniper_snow),
        ("factory-air-enemy.png",      render_factory_air_snow),
        # === Tier 1 snow (gunmetal chromé + accents dorés subtils) ===
        ("unit-light-enemy-t1.png",    lambda: render_unit_light("enemy", 1, ENEMY_SNOW_T1)),
        ("unit-heavy-enemy-t1.png",    lambda: render_unit_heavy("enemy", 1, ENEMY_SNOW_T1)),
        ("unit-swarmer-enemy-t1.png",  lambda: render_unit_swarmer("enemy", 1, ENEMY_SNOW_T1)),
        ("unit-sniper-enemy-t1.png",   lambda: render_unit_sniper("enemy", 1, ENEMY_SNOW_T1)),
        ("unit-air-enemy-t1.png",      lambda: render_unit_air("enemy", 1, ENEMY_SNOW_T1)),
        # === Tier 2 snow (gunmetal très foncé + glow doré + accessoires premium) ===
        ("unit-light-enemy-t2.png",    lambda: render_unit_light("enemy", 2, ENEMY_SNOW_T2)),
        ("unit-heavy-enemy-t2.png",    lambda: render_unit_heavy("enemy", 2, ENEMY_SNOW_T2)),
        ("unit-swarmer-enemy-t2.png",  lambda: render_unit_swarmer("enemy", 2, ENEMY_SNOW_T2)),
        ("unit-sniper-enemy-t2.png",   lambda: render_unit_sniper("enemy", 2, ENEMY_SNOW_T2)),
        ("unit-air-enemy-t2.png",      lambda: render_unit_air("enemy", 2, ENEMY_SNOW_T2)),
        # === Médic K9 snow — factory + 4 frames × 3 tiers (T0/T1/T2) ===
        ("factory-medic-enemy.png",    lambda: render_factory_medic("enemy", pal_override=ENEMY_SNOW)),
        ("unit-medic-enemy-0.png",     lambda: render_unit_medic("enemy", 0, 0, ENEMY_SNOW)),
        ("unit-medic-enemy-1.png",     lambda: render_unit_medic("enemy", 1, 0, ENEMY_SNOW)),
        ("unit-medic-enemy-2.png",     lambda: render_unit_medic("enemy", 2, 0, ENEMY_SNOW)),
        ("unit-medic-enemy-3.png",     lambda: render_unit_medic("enemy", 3, 0, ENEMY_SNOW)),
        ("unit-medic-enemy-t1-0.png",  lambda: render_unit_medic("enemy", 0, 1, ENEMY_SNOW_T1)),
        ("unit-medic-enemy-t1-1.png",  lambda: render_unit_medic("enemy", 1, 1, ENEMY_SNOW_T1)),
        ("unit-medic-enemy-t1-2.png",  lambda: render_unit_medic("enemy", 2, 1, ENEMY_SNOW_T1)),
        ("unit-medic-enemy-t1-3.png",  lambda: render_unit_medic("enemy", 3, 1, ENEMY_SNOW_T1)),
        ("unit-medic-enemy-t2-0.png",  lambda: render_unit_medic("enemy", 0, 2, ENEMY_SNOW_T2)),
        ("unit-medic-enemy-t2-1.png",  lambda: render_unit_medic("enemy", 1, 2, ENEMY_SNOW_T2)),
        ("unit-medic-enemy-t2-2.png",  lambda: render_unit_medic("enemy", 2, 2, ENEMY_SNOW_T2)),
        ("unit-medic-enemy-t2-3.png",  lambda: render_unit_medic("enemy", 3, 2, ENEMY_SNOW_T2)),
    ]

    for name, fn in to_render:
        img = fn()
        out = out_dir / name
        img.save(out, format="PNG")
        rel = out.relative_to(REPO_ROOT)
        print(f"  {name:30s} {img.size[0]:>4}x{img.size[1]:<4}  → {rel}")

    print(f"\n{len(to_render)} sprite(s) snow généré(s) dans {out_dir.relative_to(REPO_ROOT)}/")


if __name__ == "__main__":
    main()
