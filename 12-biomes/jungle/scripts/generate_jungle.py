"""Génère les sprites du biome JUNGLE.

Lancer depuis la racine du repo :
    python3 12-biomes/jungle/scripts/generate_jungle.py

Sortie : 12-biomes/jungle/sprites/
- tile-ground.png           sol jungle (terre + mousse + racines + fougères)
- factory-*-enemy.png × 4   factories ennemies en thème jungle
- unit-*-enemy.png × 4      unités ennemies en thème jungle

Le joueur n'a pas de variant jungle — il garde ses sprites bleus du désert.
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


# ---------------------------------------------------------------------------
# Palettes Jungle
# ---------------------------------------------------------------------------

# Ennemis jungle — camouflage vert + glow vert acide (au lieu du jaune warning)
ENEMY_JUNGLE = {
    "dark":  (31,  74,  31, 255),   # #1F4A1F vert forêt profond
    "base":  (79,  123, 58, 255),   # #4F7B3A vert militaire
    "light": (124, 179, 66, 255),   # #7CB342 vert feuille
    "glow":  (164, 255, 56, 255),   # #A4FF38 vert acide
}

# Sol jungle — terre brune humide
GROUND_JUNGLE = {
    "darkest": (45,  30, 18,  255),   # terre très sombre
    "dark":    (75,  56, 36,  255),   # loam sombre
    "base":    (106, 80, 52,  255),   # terre forestière
    "light":   (140, 110, 70, 255),   # terre claire
    "crack":   (50,  30, 16,  255),   # racines sombres
}

# Mousse pour les overlays
MOSS = {
    "dark":  (60,  100, 40, 255),
    "base":  (90,  140, 55, 255),
    "light": (130, 175, 75, 255),
}

# Couleur de fougère / feuilles (utilisée pour les éléments verts du sol)
FOLIAGE = {
    "dark":  (45,  90,  35, 255),
    "base":  (90,  150, 50, 255),
    "light": (135, 190, 75, 255),
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
    """Porte ennemie (haut du sprite) — glow vert acide jungle."""
    d.rectangle((W // 2 - gate_w // 2, 4, W // 2 + gate_w // 2, 16),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((W // 2 - gate_w // 2 + 3, 6,
                 W // 2 + gate_w // 2 - 3, 14),
                fill=ENEMY_JUNGLE["glow"])


def hex_points(cx, cy, r, rotate_deg=0):
    pts = []
    for i in range(6):
        ang = math.radians(60 * i + rotate_deg)
        pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    return pts


# ---------------------------------------------------------------------------
# UNITÉS jungle (variantes enemy uniquement)
# ---------------------------------------------------------------------------

def render_unit_light_jungle():
    W = H = 48
    pal = ENEMY_JUNGLE
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


def render_unit_heavy_jungle():
    W = H = 64
    pal = ENEMY_JUNGLE
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


def render_unit_swarmer_jungle():
    W = H = 40
    pal = ENEMY_JUNGLE
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


def render_unit_sniper_jungle():
    W = H = 56
    pal = ENEMY_JUNGLE
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
# FACTORIES jungle (variantes enemy uniquement)
# ---------------------------------------------------------------------------

def render_factory_light_jungle():
    W = H = 128
    pal = ENEMY_JUNGLE
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


def render_factory_heavy_jungle():
    W = H = 128
    pal = ENEMY_JUNGLE
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
        d.ellipse((cx - 5, H // 2 - 28, cx + 3, H // 2 - 20),
                  fill=(240, 245, 255, 200))
        d.ellipse((cx - 3, H // 2 - 33, cx + 3, H // 2 - 27),
                  fill=(240, 245, 255, 140))
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


def render_factory_swarmer_jungle():
    W = H = 128
    pal = ENEMY_JUNGLE
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


def render_factory_sniper_jungle():
    W = H = 128
    pal = ENEMY_JUNGLE
    img, d = new_canvas(W, H)
    d.rounded_rectangle((8, 18, W - 8, H - 6), radius=8,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((8, 18, W - 8, 22), radius=6, fill=METAL["dark"])
    base_box = (16, 64, W - 16, H - 14)
    shaded_rect_3d(d, base_box, pal_dark=METAL["darkest"], pal_base=pal["dark"],
                   pal_light=pal["base"], radius=4)
    rivets(d, base_box, METAL["darkest"], spacing=16)
    # Créneaux teintés terre jungle (au lieu du sable du désert)
    for x in range(20, W - 24, 12):
        cast_shadow_ellipse(d, (x, 56, x + 10, 68), offset=(1, 2))
        d.ellipse((x, 56, x + 10, 68),
                  fill=GROUND_JUNGLE["dark"], outline=ACCENT["outline"])
        d.chord((x, 56, x + 10, 68), start=180, end=360,
                fill=GROUND_JUNGLE["light"])
        d.line((x + 2, 62, x + 8, 62), fill=GROUND_JUNGLE["darkest"])
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
# TILE GROUND jungle — sol de forêt tropicale (tileable)
# ---------------------------------------------------------------------------

def draw_tiled_ellipse(d, x, y, rx, ry, color, W, H):
    for dx_ in (-W, 0, W):
        for dy_ in (-H, 0, H):
            d.ellipse((x + dx_ - rx, y + dy_ - ry,
                       x + dx_ + rx, y + dy_ + ry), fill=color)


def render_tile_ground_jungle():
    W = H = 128
    img = vertical_gradient(W, H, GROUND_JUNGLE["base"],
                            GROUND_JUNGLE["dark"]).convert("RGBA")

    # --- Variations de tons (terre claire + terre sombre) avec patches blurrés
    rng = random.Random(11)
    patches = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(patches)
    for _ in range(12):
        x = rng.randint(0, W - 1)
        y = rng.randint(0, H - 1)
        r = rng.randint(18, 36)
        if rng.random() < 0.5:
            c = (GROUND_JUNGLE["light"][0], GROUND_JUNGLE["light"][1],
                 GROUND_JUNGLE["light"][2], 60)
        else:
            c = (GROUND_JUNGLE["darkest"][0], GROUND_JUNGLE["darkest"][1],
                 GROUND_JUNGLE["darkest"][2], 60)
        for dx_ in (-W, 0, W):
            for dy_ in (-H, 0, H):
                pd.ellipse((x + dx_ - r, y + dy_ - r,
                            x + dx_ + r, y + dy_ + r), fill=c)
    patches = patches.filter(ImageFilter.GaussianBlur(radius=10))
    img = Image.alpha_composite(img, patches)

    # --- Patches de mousse verte (gros blobs, faible opacité, fortement blurrés)
    moss_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    md = ImageDraw.Draw(moss_layer)
    rng_m = random.Random(23)
    for _ in range(7):
        x = rng_m.randint(0, W - 1)
        y = rng_m.randint(0, H - 1)
        r = rng_m.randint(15, 30)
        moss = MOSS["base"]
        c = (moss[0], moss[1], moss[2], 95)
        for dx_ in (-W, 0, W):
            for dy_ in (-H, 0, H):
                md.ellipse((x + dx_ - r, y + dy_ - r,
                            x + dx_ + r, y + dy_ + r), fill=c)
    moss_layer = moss_layer.filter(ImageFilter.GaussianBlur(radius=8))
    img = Image.alpha_composite(img, moss_layer)

    d = ImageDraw.Draw(img)

    # --- 3 racines courbes 3D (multi-segments avec cast shadow + highlight + stries d'écorce)
    # Chaque racine = chemin de control points + épaisseur. On dessine ombre puis corps puis highlight.
    # Pour rester tileable, on garde tous les points à >= 8px des bords.
    def draw_root_curve(draw, points, thickness, body_col, highlight_col=None,
                        shadow_offset=None):
        """Dessine une racine sinueuse via une polyline thick + circles aux joints."""
        # Offset pour l'ombre portée
        offset = shadow_offset if shadow_offset else (0, 0)
        for i in range(len(points) - 1):
            x1, y1 = points[i][0] + offset[0], points[i][1] + offset[1]
            x2, y2 = points[i + 1][0] + offset[0], points[i + 1][1] + offset[1]
            draw.line((x1, y1, x2, y2), fill=body_col, width=thickness)
        # Disques aux joints pour lisser les coudes
        r = thickness // 2
        for p in points:
            px, py = p[0] + offset[0], p[1] + offset[1]
            draw.ellipse((px - r, py - r, px + r, py + r), fill=body_col)
        # Highlight : strand parallèle décalé de 1px vers le haut, plus mince
        if highlight_col and thickness > 3:
            hl_thick = max(1, thickness - 3)
            hl_r = hl_thick // 2
            for i in range(len(points) - 1):
                x1, y1 = points[i][0], points[i][1] - 1
                x2, y2 = points[i + 1][0], points[i + 1][1] - 1
                draw.line((x1, y1, x2, y2), fill=highlight_col, width=hl_thick)
            for p in points:
                draw.ellipse((p[0] - hl_r, p[1] - 1 - hl_r,
                              p[0] + hl_r, p[1] - 1 + hl_r), fill=highlight_col)

    # 3 racines avec chemins sinueux
    roots = [
        [(14, 28), (28, 32), (42, 30), (54, 36), (66, 34)],            # horizontale ondulante
        [(78, 60), (82, 70), (90, 76), (100, 74), (108, 80), (116, 78)],  # diagonale descendante
        [(20, 95), (28, 102), (40, 100), (50, 108), (60, 104)],         # bas-gauche horizontale
    ]
    for root_pts in roots:
        thickness = 7
        # 1) Cast shadow : strand offsetée flouttée
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        shd = ImageDraw.Draw(sh)
        draw_root_curve(shd, root_pts, thickness + 2, (0, 0, 0, 110),
                        shadow_offset=(2, 3))
        sh = sh.filter(ImageFilter.GaussianBlur(radius=2))
        img = Image.alpha_composite(img, sh)
        d = ImageDraw.Draw(img)
        # 2) Corps de la racine (couleur écorce sombre + highlight)
        draw_root_curve(d, root_pts, thickness,
                        body_col=GROUND_JUNGLE["darkest"],
                        highlight_col=GROUND_JUNGLE["dark"])
        # 3) Stries d'écorce (petites lignes perpendiculaires à la racine)
        for i in range(len(root_pts) - 1):
            x1, y1 = root_pts[i]
            x2, y2 = root_pts[i + 1]
            # Direction
            dx = x2 - x1
            dy = y2 - y1
            length = max(math.sqrt(dx * dx + dy * dy), 0.01)
            # Perpendiculaire
            px = -dy / length
            py = dx / length
            # Place 2-3 stries le long du segment
            for t in (0.3, 0.65):
                cx_s = x1 + dx * t
                cy_s = y1 + dy * t
                hw = thickness // 2 - 1
                d.line((cx_s - px * hw, cy_s - py * hw,
                        cx_s + px * hw, cy_s + py * hw),
                       fill=GROUND_JUNGLE["crack"], width=1)

    # --- 4 buissons (clusters de feuilles vertes avec cast shadow + reflets soleil)
    bushes = [(50, 45, 9), (98, 105, 8), (28, 65, 7), (115, 35, 6)]
    for bx, by, bs in bushes:
        # 1) Cast shadow circulaire (bas-droite)
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        shd = ImageDraw.Draw(sh)
        shd.ellipse((bx - bs + 2, by - bs // 2 + 3,
                     bx + bs + 2, by + bs + 3),
                    fill=(0, 0, 0, 90))
        sh = sh.filter(ImageFilter.GaussianBlur(radius=2))
        img = Image.alpha_composite(img, sh)
        d = ImageDraw.Draw(img)
        # 2) Corps du buisson : 5-7 petits cercles overlappés (vert sombre)
        leaves = [
            (bx, by, bs),
            (bx - bs * 0.6, by - bs * 0.3, bs * 0.85),
            (bx + bs * 0.6, by - bs * 0.4, bs * 0.85),
            (bx - bs * 0.3, by + bs * 0.4, bs * 0.7),
            (bx + bs * 0.3, by + bs * 0.5, bs * 0.7),
            (bx, by - bs * 0.55, bs * 0.75),
        ]
        for lx, ly, lr in leaves:
            d.ellipse((lx - lr, ly - lr, lx + lr, ly + lr),
                      fill=FOLIAGE["dark"])
        # 3) Reflets sun (cercles plus petits, plus clairs, sur partie haut-gauche de chaque feuille)
        for lx, ly, lr in leaves:
            r_hl = lr * 0.55
            d.ellipse((lx - r_hl - lr * 0.15, ly - r_hl - lr * 0.2,
                       lx + r_hl - lr * 0.15, ly + r_hl - lr * 0.2),
                      fill=FOLIAGE["base"])
        # 4) Spots brillants (3 petits points lumineux pour suggérer le soleil qui filtre)
        d.ellipse((bx - bs * 0.4, by - bs * 0.7,
                   bx - bs * 0.2, by - bs * 0.5), fill=FOLIAGE["light"])
        d.ellipse((bx + bs * 0.2, by - bs * 0.55,
                   bx + bs * 0.4, by - bs * 0.4), fill=FOLIAGE["light"])
        d.ellipse((bx - bs * 0.05, by + bs * 0.15,
                   bx + bs * 0.1, by + bs * 0.3), fill=FOLIAGE["light"])

    # --- 4 fougères / touffes de feuilles (petits clusters de triangles)
    rng_f = random.Random(31)
    ferns = [
        (15, 78, 6),    # x_center, y_center, size
        (95, 25, 7),
        (62, 50, 5),
        (110, 90, 6),
    ]
    for fx, fy, fs in ferns:
        # Tige
        for dx_w in (-W, 0, W):
            for dy_w in (-H, 0, H):
                d.line((fx + dx_w, fy + dy_w + fs, fx + dx_w, fy + dy_w - fs - 2),
                       fill=FOLIAGE["dark"], width=1)
        # 6 petites feuilles en éventail
        for i in range(6):
            angle_deg = 90 - 60 + i * 24  # de -30° à +30° autour du vertical
            ang = math.radians(angle_deg - 90)  # 0 = vers le haut
            leaf_len = fs + 2
            ex = fx + math.cos(ang) * leaf_len
            ey = fy + math.sin(ang) * leaf_len - 2
            # Feuille = petite ellipse
            for dx_w in (-W, 0, W):
                for dy_w in (-H, 0, H):
                    d.ellipse((ex + dx_w - 2, ey + dy_w - 1,
                               ex + dx_w + 2, ey + dy_w + 1),
                              fill=FOLIAGE["base"])
                    # Reflet supérieur
                    d.ellipse((ex + dx_w - 1, ey + dy_w - 1,
                               ex + dx_w + 1, ey + dy_w),
                              fill=FOLIAGE["light"])

    # --- Quelques feuilles tombées éparpillées (petites taches vertes claires)
    rng_l = random.Random(41)
    for _ in range(10):
        x = rng_l.randint(3, W - 3)
        y = rng_l.randint(3, H - 3)
        c = FOLIAGE["base"] if rng_l.random() > 0.4 else FOLIAGE["dark"]
        d.ellipse((x - 1, y, x + 1, y + 1), fill=c)
        if rng_l.random() > 0.5:
            d.point((x, y - 1), fill=FOLIAGE["light"])

    return img


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    out_dir = THIS_DIR.parent / "sprites"
    out_dir.mkdir(parents=True, exist_ok=True)

    to_render = [
        ("tile-ground.png",            render_tile_ground_jungle),
        ("unit-light-enemy.png",       render_unit_light_jungle),
        ("unit-heavy-enemy.png",       render_unit_heavy_jungle),
        ("unit-swarmer-enemy.png",     render_unit_swarmer_jungle),
        ("unit-sniper-enemy.png",      render_unit_sniper_jungle),
        ("factory-light-enemy.png",    render_factory_light_jungle),
        ("factory-heavy-enemy.png",    render_factory_heavy_jungle),
        ("factory-swarmer-enemy.png",  render_factory_swarmer_jungle),
        ("factory-sniper-enemy.png",   render_factory_sniper_jungle),
    ]

    for name, fn in to_render:
        img = fn()
        out = out_dir / name
        img.save(out, format="PNG")
        rel = out.relative_to(REPO_ROOT)
        print(f"  {name:30s} {img.size[0]:>4}x{img.size[1]:<4}  → {rel}")

    print(f"\n{len(to_render)} sprite(s) jungle généré(s) dans {out_dir.relative_to(REPO_ROOT)}/")


if __name__ == "__main__":
    main()
