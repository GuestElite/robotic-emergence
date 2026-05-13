"""Génère T2 et T3 pour TOUS les types de factory : light, heavy, swarmer,
sniper, air. Chaque type préserve son identité visuelle propre.

T1 = 128×128 (référence, le sprite existant — chargé depuis sprites/)
T2 = 256×128 (1×2 slots, fusion twin)
T3 = 256×256 (2×2 slots, mega command)

Sortie : 08-art-direction/preview/
- factory-{type}-{side}-t2.png × 10  (5 types × 2 sides)
- factory-{type}-{side}-t3.png × 10
- factory-all-tiers-preview.png      (comparatif visuel)
"""

import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from palette import (
    new_canvas, side_palette, drop_shadow,
    METAL, ACCENT, GROUND,
)


SHADOW_OFFSET = (2, 3)
SHADOW_COLOR = (0, 0, 0, 110)

TIER2_ACCENT      = (34, 211, 238, 255)
TIER2_ACCENT_DIM  = (34, 211, 238, 100)
TIER3_ACCENT      = (251, 191, 36, 255)
TIER3_ACCENT_DIM  = (251, 191, 36, 140)


# ===========================================================================
# Helpers communs
# ===========================================================================

def cast_shadow_rect(d, box, offset=SHADOW_OFFSET, color=SHADOW_COLOR, radius=3):
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0 + offset[0], y0 + offset[1],
                         x1 + offset[0], y1 + offset[1]),
                        radius=radius, fill=color)


def cast_shadow_ellipse(d, box, offset=SHADOW_OFFSET, color=SHADOW_COLOR):
    x0, y0, x1, y1 = box
    d.ellipse((x0 + offset[0], y0 + offset[1],
               x1 + offset[0], y1 + offset[1]), fill=color)


def shaded_rect_3d(d, box, pal_dark, pal_base, pal_light, radius=3, outline=None):
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


def turret_3d(d, cx, cy, size, pal, accent_color=None):
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
    glow_c = accent_color if accent_color else pal["glow"]
    sx_ = cx - dr // 2
    sy_ = cy - dr // 2
    d.ellipse((sx_, sy_, sx_ + max(1, dr // 3), sy_ + max(1, dr // 3)),
              fill=glow_c)
    bl = int(s * 1.4)
    bw = max(1, s // 4)
    offset = max(1, s // 3)
    for dx_ in (-offset, offset):
        box = (cx + dx_ - bw, cy - bl, cx + dx_ + bw, cy)
        cast_shadow_rect(d, box, offset=(1, 2))
        d.rectangle(box, fill=METAL["darkest"], outline=ACCENT["outline"])
        d.line((cx + dx_ - bw, cy - bl + 1, cx + dx_ - bw + 1, cy - 1),
               fill=METAL["light"])


def antenna_3d(d, x, y, length, tip_color):
    d.line((x + 1, y, x + 1, y - length), fill=SHADOW_COLOR, width=2)
    d.line((x, y, x, y - length), fill=METAL["darkest"], width=1)
    d.ellipse((x - 2, y - length - 2, x + 2, y - length + 2), fill=tip_color)
    d.ellipse((x - 1, y - length - 1, x, y - length), fill=ACCENT["white"])


def rivets_corners(d, box, color, r=2):
    x0, y0, x1, y1 = box
    for cx, cy in [(x0 + 4, y0 + 4), (x1 - 4, y0 + 4),
                   (x0 + 4, y1 - 4), (x1 - 4, y1 - 4)]:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
        d.ellipse((cx - 1, cy - 1, cx, cy), fill=ACCENT["white"])


def vent_grille(d, x, y, w, h, color):
    d.rounded_rectangle((x, y, x + w, y + h), radius=1,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    for ry in range(y + 1, y + h - 1, 2):
        d.line((x + 1, ry, x + w - 1, ry), fill=color, width=1)


def hex_pattern(d, box, color, size=6, alpha=60):
    x0, y0, x1, y1 = box
    r = size
    h = r * math.sqrt(3) / 2
    c = (color[0], color[1], color[2], alpha)
    for cy in range(int(y0), int(y1), int(h)):
        row = (cy - int(y0)) // int(h)
        for cx in range(int(x0) - r, int(x1) + r, int(r * 1.5)):
            ox = (r * 0.75) if row % 2 else 0
            xx = cx + ox
            if xx < x0 - r or xx > x1 + r:
                continue
            pts = []
            for i in range(6):
                ang = math.radians(60 * i)
                pts.append((xx + math.cos(ang) * r, cy + math.sin(ang) * r))
            d.polygon(pts, outline=c)


def energy_conduit_vertical(d, cx, y_top, y_bot, color, width=6):
    d.rounded_rectangle((cx - width // 2 - 1, y_top, cx + width // 2 + 1, y_bot),
                        radius=2, fill=METAL["darkest"], outline=ACCENT["outline"])
    inner = max(1, width // 2 - 1)
    d.rounded_rectangle((cx - inner, y_top + 2, cx + inner, y_bot - 2),
                        radius=1, fill=color)
    d.line((cx, y_top + 3, cx, y_bot - 3), fill=ACCENT["white"], width=1)


def diag_warning_stripes(d, box, stripe_color):
    x0, y0, x1, y1 = box
    W = x1 - x0
    for off in range(-W, W, 14):
        d.polygon([(x0 + off, y0), (x0 + off + 6, y0),
                   (x0 + off + 22, y0 + 8), (x0 + off + 16, y0 + 8)],
                  fill=stripe_color)


def hex_points(cx, cy, r, rotate_deg=0):
    pts = []
    for i in range(6):
        ang = math.radians(60 * i + rotate_deg)
        pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    return pts


def gate_at(d, side, cx_g, cy_top, cy_bot, pal_glow):
    """Dessine une porte centrée en (cx_g) entre cy_top et cy_bot."""
    d.rectangle((cx_g - 11, cy_top, cx_g + 11, cy_bot),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((cx_g - 8, cy_top + 2, cx_g + 8, cy_bot - 2), fill=pal_glow)
    d.ellipse((cx_g - 1, (cy_top + cy_bot) // 2 - 1,
               cx_g + 1, (cy_top + cy_bot) // 2 + 1), fill=ACCENT["white"])


def make_gates_t2(d, side, W, H, bays, pal_glow):
    """Crée 2 gates (1 par baie) sur le bord approprié."""
    for box in bays:
        cx_g = (box[0] + box[2]) // 2
        if side == "player":
            gate_at(d, side, cx_g, H - 16, H - 4, pal_glow)
        else:
            gate_at(d, side, cx_g, 4, 16, pal_glow)


def smokestack(d, cx, cy_base, height=20, width=8, accent=None):
    """Cheminée verticale avec fumée stylisée."""
    cast_shadow_ellipse(d, (cx - width, cy_base - height,
                             cx + width, cy_base - height + 6), offset=(2, 1))
    d.ellipse((cx - width, cy_base - height, cx + width, cy_base - height + 6),
              fill=METAL["base"], outline=ACCENT["outline"])
    d.ellipse((cx - width + 1, cy_base - height + 1,
               cx + width - 1, cy_base - height + 5), fill=METAL["dark"])
    d.ellipse((cx - width + 2, cy_base - height + 2,
               cx + width - 2, cy_base - height + 4), fill=METAL["darkest"])
    # Corps de la cheminée
    d.rectangle((cx - width + 1, cy_base - height + 3, cx + width - 1, cy_base),
                fill=METAL["dark"], outline=ACCENT["outline"])
    d.line((cx - width + 2, cy_base - height + 3, cx - width + 2, cy_base - 1),
           fill=METAL["light"])
    # Fumée
    if accent:
        smoke_c = (accent[0], accent[1], accent[2], 200)
    else:
        smoke_c = (240, 245, 255, 220)
    d.ellipse((cx - width + 1, cy_base - height - 8,
               cx + width - 1, cy_base - height), fill=smoke_c)
    smoke_c2 = (240, 245, 255, 140) if not accent else (accent[0], accent[1], accent[2], 140)
    d.ellipse((cx - width + 2, cy_base - height - 14,
               cx + width - 2, cy_base - height - 6), fill=smoke_c2)


def alveole_egg(d, cx, cy, r, pal):
    """Alvéole hexagonale avec œuf glow à l'intérieur."""
    a_pts = hex_points(cx, cy, r, rotate_deg=30)
    d.polygon([(p[0] + 1, p[1] + 2) for p in a_pts], fill=SHADOW_COLOR)
    d.polygon(a_pts, fill=METAL["darkest"], outline=ACCENT["outline"])
    eg = max(2, r - 5)
    d.ellipse((cx - eg, cy - eg, cx + eg, cy + eg),
              fill=pal["glow"], outline=ACCENT["outline"])
    d.chord((cx - eg, cy - eg, cx + eg, cy + eg), start=0, end=180,
            fill=pal["light"])
    d.ellipse((cx - 2, cy - 3, cx, cy - 1), fill=ACCENT["white"])


# ===========================================================================
# HEAVY — Twin Forge (T2) & Mega Foundry (T3)
# ===========================================================================

def render_factory_heavy_t2(side, pal=None):
    W, H = 256, 128
    if pal is None:
        pal = side_palette(side)
    img, d = new_canvas(W, H)

    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=12,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((4, 6, W - 4, 10), radius=10, fill=METAL["dark"])

    bay_w = 100
    bay_left  = (12, 14, 12 + bay_w, H - 12)
    bay_right = (W - 12 - bay_w, 14, W - 12, H - 12)
    fusion_zone = (12 + bay_w - 2, 14, W - 12 - bay_w + 2, H - 12)

    # Corps des 2 baies (heavy = palette dark + base au lieu de base + light)
    shaded_rect_3d(d, bay_left, pal_dark=METAL["darkest"], pal_base=pal["dark"],
                   pal_light=pal["base"], radius=4)
    shaded_rect_3d(d, bay_right, pal_dark=METAL["darkest"], pal_base=pal["dark"],
                   pal_light=pal["base"], radius=4)
    # Zone fusion
    d.rounded_rectangle(fusion_zone, radius=3,
                        fill=METAL["dark"], outline=ACCENT["outline"])

    # Hex pattern (armure heavy)
    hex_pattern(d, (bay_left[0] + 6, bay_left[1] + 28, bay_left[2] - 6, bay_left[3] - 12),
                pal["dark"], size=6, alpha=80)
    hex_pattern(d, (bay_right[0] + 6, bay_right[1] + 28, bay_right[2] - 6, bay_right[3] - 12),
                pal["dark"], size=6, alpha=80)

    # 4 cheminées (2 par baie) — signature heavy
    smokestack(d, bay_left[0] + 22, H // 2 + 20, height=24, width=7, accent=TIER2_ACCENT)
    smokestack(d, bay_left[2] - 22, H // 2 + 20, height=24, width=7, accent=TIER2_ACCENT)
    smokestack(d, bay_right[0] + 22, H // 2 + 20, height=24, width=7, accent=TIER2_ACCENT)
    smokestack(d, bay_right[2] - 22, H // 2 + 20, height=24, width=7, accent=TIER2_ACCENT)

    # LED strip cyan top
    d.line((bay_left[0] + 4, 12, bay_right[2] - 4, 12), fill=TIER2_ACCENT, width=1)
    d.line((bay_left[0] + 4, 13, bay_right[2] - 4, 13), fill=TIER2_ACCENT_DIM, width=1)

    # Conduit central
    cx_fuse = (fusion_zone[0] + fusion_zone[2]) // 2
    energy_conduit_vertical(d, cx_fuse, 22, H - 18, TIER2_ACCENT, width=10)

    # Rivets gros (heavy aime les rivets)
    for box in (bay_left, bay_right):
        for x in range(box[0] + 12, box[2] - 8, 16):
            d.ellipse((x - 2, box[1] + 14, x + 2, box[1] + 18), fill=METAL["darkest"])

    # Turrets : 1 centrale par baie + 1 super au fusion
    turret_3d(d, bay_left[0] + bay_w // 2, H // 2 + 4, 11, pal, accent_color=TIER2_ACCENT)
    turret_3d(d, bay_right[0] + bay_w // 2, H // 2 + 4, 11, pal, accent_color=TIER2_ACCENT)
    turret_3d(d, cx_fuse, H // 2 + 8, 13, pal, accent_color=TIER2_ACCENT)

    # Vent grilles sur les côtés
    vent_grille(d, 8, H // 2 - 4, 4, 18, TIER2_ACCENT_DIM)
    vent_grille(d, W - 12, H // 2 - 4, 4, 18, TIER2_ACCENT_DIM)

    # Rivets aux coins
    rivets_corners(d, (4, 6, W - 4, H - 4), TIER2_ACCENT, r=2)

    # 2 Gates (1 par baie)
    make_gates_t2(d, side, W, H, [bay_left, bay_right], pal["glow"])

    # Cadre cyan
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=10,
                        outline=TIER2_ACCENT, width=1)

    return drop_shadow(img, offset=(3, 4), blur=5, opacity=130)


def render_factory_heavy_t3(side, pal=None):
    W = H = 256
    if pal is None:
        pal = side_palette(side)
    img, d = new_canvas(W, H)

    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=14,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((4, 6, W - 4, 12), radius=12, fill=METAL["dark"])

    bay_size = 92
    bays = {
        "tl": (10, 14, 10 + bay_size, 14 + bay_size),
        "tr": (W - 10 - bay_size, 14, W - 10, 14 + bay_size),
        "bl": (10, H - 14 - bay_size, 10 + bay_size, H - 14),
        "br": (W - 10 - bay_size, H - 14 - bay_size, W - 10, H - 14),
    }
    for box in bays.values():
        shaded_rect_3d(d, box, pal_dark=METAL["darkest"], pal_base=pal["dark"],
                       pal_light=pal["base"], radius=4)
        hex_pattern(d, (box[0] + 6, box[1] + 12, box[2] - 6, box[3] - 12),
                    pal["dark"], size=6, alpha=80)

    # 8 cheminées (2 par baie)
    for box in bays.values():
        smokestack(d, box[0] + 22, box[3] - 6, height=22, width=6, accent=TIER3_ACCENT)
        smokestack(d, box[2] - 22, box[3] - 6, height=22, width=6, accent=TIER3_ACCENT)

    # Plateforme hex centrale (massive)
    cx, cy = W // 2, H // 2
    hex_pts = hex_points(cx, cy, 58, rotate_deg=30)
    shadow_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.polygon([(p[0] + 2, p[1] + 3) for p in hex_pts], fill=(0, 0, 0, 130))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(3))
    img = Image.alpha_composite(img, shadow_layer)
    d = ImageDraw.Draw(img)
    d.polygon(hex_pts, fill=METAL["base"], outline=ACCENT["outline"])
    for i in range(6):
        p1, p2 = hex_pts[i], hex_pts[(i + 1) % 6]
        d.line((p1[0], p1[1], p2[0], p2[1]), fill=TIER3_ACCENT, width=2)

    # Réacteur central (assise gold + core pulsant)
    inner_pts = hex_points(cx, cy, 42)
    d.polygon(inner_pts, fill=pal["dark"], outline=TIER3_ACCENT)
    hex_pattern(d, (cx - 38, cy - 38, cx + 38, cy + 38), TIER3_ACCENT, size=7, alpha=70)

    # Core gold pulsant central
    for r in (30, 22, 16):
        alpha = 60 if r == 30 else (140 if r == 22 else 220)
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.ellipse((cx - r, cy - r, cx + r, cy + r),
                   fill=(TIER3_ACCENT[0], TIER3_ACCENT[1], TIER3_ACCENT[2], alpha))
        if r == 30:
            layer = layer.filter(ImageFilter.GaussianBlur(4))
        img = Image.alpha_composite(img, layer)
        d = ImageDraw.Draw(img)
    d.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=ACCENT["white"])

    # Mega-quadruple-canon vers le haut
    for dx_t in (-9, -3, 3, 9):
        d.rectangle((cx + dx_t - 1, cy - 32, cx + dx_t + 1, cy + 2),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.line((cx + dx_t - 1, cy - 31, cx + dx_t - 1, cy + 1), fill=METAL["light"])

    # Conduits diagonaux gold vers les 4 baies
    for bx, by in [(bays["tl"][2] - 6, bays["tl"][3] - 6),
                    (bays["tr"][0] + 6, bays["tr"][3] - 6),
                    (bays["bl"][2] - 6, bays["bl"][1] + 6),
                    (bays["br"][0] + 6, bays["br"][1] + 6)]:
        dx_ = bx - cx
        dy_ = by - cy
        length = math.sqrt(dx_ * dx_ + dy_ * dy_)
        ux, uy = dx_ / length, dy_ / length
        sx_ = cx + ux * 56
        sy_ = cy + uy * 56
        d.line((sx_, sy_, bx, by), fill=METAL["darkest"], width=3)
        d.line((sx_, sy_, bx, by), fill=TIER3_ACCENT, width=1)

    # Turrets corner par baie
    for box in bays.values():
        bcx, bcy = (box[0] + box[2]) // 2, (box[1] + box[3]) // 2
        turret_3d(d, bcx, bcy + 8, 9, pal, accent_color=TIER3_ACCENT)

    # Cadre or
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=12, outline=TIER3_ACCENT, width=2)
    d.rounded_rectangle((9, 11, W - 9, H - 9), radius=10, outline=TIER3_ACCENT_DIM, width=1)
    rivets_corners(d, (6, 8, W - 6, H - 6), TIER3_ACCENT, r=3)

    # Gates (player = bas, enemy = haut, 2 gates côté approprié)
    if side == "player":
        for box in (bays["bl"], bays["br"]):
            cx_g = (box[0] + box[2]) // 2
            gate_at(d, side, cx_g, H - 16, H - 4, pal["glow"])
    else:
        for box in (bays["tl"], bays["tr"]):
            cx_g = (box[0] + box[2]) // 2
            gate_at(d, side, cx_g, 4, 16, pal["glow"])

    return drop_shadow(img, offset=(4, 5), blur=6, opacity=140)


# ===========================================================================
# SWARMER — Twin Hive (T2) & Mega Hive (T3)
# ===========================================================================

def render_factory_swarmer_t2(side, pal=None):
    W, H = 256, 128
    if pal is None:
        pal = side_palette(side)
    img, d = new_canvas(W, H)

    # Plateforme
    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=12,
                        fill=METAL["darkest"], outline=ACCENT["outline"])

    # 2 corps hexagonaux côte à côte
    cy = H // 2
    cx_left = 60
    cx_right = W - 60
    cx_mid = W // 2

    # Hex left
    hex_left = hex_points(cx_left, cy, 48, rotate_deg=30)
    d.polygon(hex_left, fill=pal["base"], outline=ACCENT["outline"])
    # Highlight top
    d.polygon([(cx_left - 40, cy - 8), (cx_left - 20, cy - 42),
               (cx_left + 20, cy - 42), (cx_left + 40, cy - 8)],
              fill=pal["light"])
    d.polygon([(cx_left - 40, cy + 8), (cx_left - 20, cy + 42),
               (cx_left + 20, cy + 42), (cx_left + 40, cy + 8)],
              fill=METAL["darkest"])

    # Hex right
    hex_right = hex_points(cx_right, cy, 48, rotate_deg=30)
    d.polygon(hex_right, fill=pal["base"], outline=ACCENT["outline"])
    d.polygon([(cx_right - 40, cy - 8), (cx_right - 20, cy - 42),
               (cx_right + 20, cy - 42), (cx_right + 40, cy - 8)],
              fill=pal["light"])
    d.polygon([(cx_right - 40, cy + 8), (cx_right - 20, cy + 42),
               (cx_right + 20, cy + 42), (cx_right + 40, cy + 8)],
              fill=METAL["darkest"])

    # 8 alvéoles : 4 par hex
    for hx in (cx_left, cx_right):
        for ax, ay in [(hx - 20, cy - 12), (hx + 20, cy - 12),
                        (hx - 20, cy + 16), (hx + 20, cy + 16)]:
            alveole_egg(d, ax, ay, 10, pal)

    # Mini-pattes radiales autour des 2 hex
    for hx in (cx_left, cx_right):
        for i in range(6):
            ang = math.radians(60 * i + 30)
            x1 = hx + math.cos(ang) * 46
            y1 = cy + math.sin(ang) * 46
            x2 = hx + math.cos(ang) * 58
            y2 = cy + math.sin(ang) * 58
            d.line((x1, y1, x2, y2), fill=METAL["darkest"], width=2)
            d.ellipse((x2 - 1, y2 - 1, x2 + 1, y2 + 1), fill=METAL["light"])

    # Super-alvéole CENTRALE au milieu (signature T2)
    cx_super, cy_super = cx_mid, cy
    super_hex = hex_points(cx_super, cy_super, 22, rotate_deg=30)
    d.polygon(super_hex, fill=METAL["darkest"], outline=TIER2_ACCENT)
    # Pulse cyan
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.ellipse((cx_super - 14, cy_super - 14, cx_super + 14, cy_super + 14),
               fill=(TIER2_ACCENT[0], TIER2_ACCENT[1], TIER2_ACCENT[2], 180))
    layer = layer.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, layer)
    d = ImageDraw.Draw(img)
    d.ellipse((cx_super - 8, cy_super - 8, cx_super + 8, cy_super + 8),
              fill=TIER2_ACCENT, outline=ACCENT["outline"])
    d.ellipse((cx_super - 4, cy_super - 4, cx_super + 4, cy_super + 4),
              fill=ACCENT["white"])

    # Antennes warning sur 4 pointes (top de chaque hex)
    antenna_3d(d, int(cx_left), int(cy - 50), 10, TIER2_ACCENT)
    antenna_3d(d, int(cx_right), int(cy - 50), 10, TIER2_ACCENT)
    antenna_3d(d, cx_super, cy - 28, 14, TIER2_ACCENT)

    # Gates : 2 (1 par hex, bas pour player)
    make_gates_t2(d, side, W, H,
                   [(cx_left - 12, 0, cx_left + 12, H),
                    (cx_right - 12, 0, cx_right + 12, H)],
                   pal["glow"])

    rivets_corners(d, (4, 6, W - 4, H - 4), TIER2_ACCENT, r=2)
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=10,
                        outline=TIER2_ACCENT, width=1)

    return drop_shadow(img, offset=(3, 4), blur=5, opacity=120)


def render_factory_swarmer_t3(side, pal=None):
    W = H = 256
    if pal is None:
        pal = side_palette(side)
    img, d = new_canvas(W, H)

    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=14,
                        fill=METAL["darkest"], outline=ACCENT["outline"])

    cx, cy = W // 2, H // 2

    # 4 hex aux coins
    corners = [
        (60, 60), (W - 60, 60),
        (60, H - 60), (W - 60, H - 60),
    ]
    for hx, hy in corners:
        hex_c = hex_points(hx, hy, 44, rotate_deg=30)
        d.polygon([(p[0] + 1, p[1] + 2) for p in hex_c], fill=SHADOW_COLOR)
        d.polygon(hex_c, fill=pal["base"], outline=ACCENT["outline"])
        # Highlight
        d.polygon([(hx - 38, hy - 4), (hx - 18, hy - 38),
                   (hx + 18, hy - 38), (hx + 38, hy - 4)], fill=pal["light"])
        # Shadow
        d.polygon([(hx - 38, hy + 4), (hx - 18, hy + 38),
                   (hx + 18, hy + 38), (hx + 38, hy + 4)], fill=METAL["darkest"])
        # 4 alvéoles par hex
        for ax, ay in [(hx - 16, hy - 10), (hx + 16, hy - 10),
                        (hx - 16, hy + 14), (hx + 16, hy + 14)]:
            alveole_egg(d, ax, ay, 8, pal)
        # Mini-pattes
        for i in range(6):
            ang = math.radians(60 * i + 30)
            x1 = hx + math.cos(ang) * 42
            y1 = hy + math.sin(ang) * 42
            x2 = hx + math.cos(ang) * 52
            y2 = hy + math.sin(ang) * 52
            d.line((x1, y1, x2, y2), fill=METAL["darkest"], width=2)

    # CENTRAL : grand hex queen
    big_hex = hex_points(cx, cy, 50, rotate_deg=30)
    shadow_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.polygon([(p[0] + 2, p[1] + 3) for p in big_hex], fill=(0, 0, 0, 130))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(3))
    img = Image.alpha_composite(img, shadow_layer)
    d = ImageDraw.Draw(img)
    d.polygon(big_hex, fill=pal["dark"], outline=TIER3_ACCENT)
    for i in range(6):
        p1, p2 = big_hex[i], big_hex[(i + 1) % 6]
        d.line((p1[0], p1[1], p2[0], p2[1]), fill=TIER3_ACCENT, width=2)

    # 6 alvéoles autour de la queen
    for i in range(6):
        ang = math.radians(60 * i + 30)
        ax = cx + math.cos(ang) * 28
        ay = cy + math.sin(ang) * 28
        alveole_egg(d, int(ax), int(ay), 9, pal)

    # Queen alveole centrale (gold pulsing)
    queen_hex = hex_points(cx, cy, 12, rotate_deg=30)
    d.polygon(queen_hex, fill=METAL["darkest"], outline=TIER3_ACCENT)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.ellipse((cx - 12, cy - 12, cx + 12, cy + 12),
               fill=(TIER3_ACCENT[0], TIER3_ACCENT[1], TIER3_ACCENT[2], 220))
    layer = layer.filter(ImageFilter.GaussianBlur(3))
    img = Image.alpha_composite(img, layer)
    d = ImageDraw.Draw(img)
    d.ellipse((cx - 7, cy - 7, cx + 7, cy + 7), fill=TIER3_ACCENT)
    d.ellipse((cx - 4, cy - 4, cx + 4, cy + 4), fill=ACCENT["white"])

    # Conduits diagonaux gold vers les 4 hex corners
    for hx, hy in corners:
        dx_ = hx - cx
        dy_ = hy - cy
        length = math.sqrt(dx_ * dx_ + dy_ * dy_)
        ux, uy = dx_ / length, dy_ / length
        sx_ = cx + ux * 48
        sy_ = cy + uy * 48
        ex_ = hx - ux * 42
        ey_ = hy - uy * 42
        d.line((sx_, sy_, ex_, ey_), fill=METAL["darkest"], width=3)
        d.line((sx_, sy_, ex_, ey_), fill=TIER3_ACCENT, width=1)

    # Antennes warning aux 4 corners + 2 centrales top
    for hx, hy in corners:
        antenna_3d(d, int(hx), int(hy - 46), 10, TIER3_ACCENT)

    # Cadre or
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=12, outline=TIER3_ACCENT, width=2)
    d.rounded_rectangle((9, 11, W - 9, H - 9), radius=10, outline=TIER3_ACCENT_DIM, width=1)
    rivets_corners(d, (6, 8, W - 6, H - 6), TIER3_ACCENT, r=3)

    # Gates
    if side == "player":
        for hx, hy in [(60, H - 60), (W - 60, H - 60)]:
            gate_at(d, side, hx, H - 16, H - 4, pal["glow"])
    else:
        for hx, hy in [(60, 60), (W - 60, 60)]:
            gate_at(d, side, hx, 4, 16, pal["glow"])

    return drop_shadow(img, offset=(4, 5), blur=6, opacity=130)


# ===========================================================================
# SNIPER — Twin Watchtower (T2) & Mega Sentinel (T3)
# ===========================================================================

def render_factory_sniper_t2(side, pal=None):
    W, H = 256, 128
    if pal is None:
        pal = side_palette(side)
    img, d = new_canvas(W, H)

    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=12,
                        fill=METAL["darkest"], outline=ACCENT["outline"])

    # 2 socles blindés bas (1 par tour)
    base_l = (12, H - 32, 120, H - 12)
    base_r = (W - 120, H - 32, W - 12, H - 12)
    base_c = (102, H - 26, W - 102, H - 18)
    shaded_rect_3d(d, base_l, pal_dark=METAL["darkest"], pal_base=pal["dark"],
                   pal_light=pal["base"], radius=3)
    shaded_rect_3d(d, base_r, pal_dark=METAL["darkest"], pal_base=pal["dark"],
                   pal_light=pal["base"], radius=3)
    # Pont de jonction central
    d.rounded_rectangle(base_c, radius=2, fill=METAL["base"],
                        outline=ACCENT["outline"])

    # 2 tours verticales étroites
    tower_l = (40, 32, 90, H - 32)
    tower_r = (W - 90, 32, W - 40, H - 32)
    shaded_rect_3d(d, tower_l, pal_dark=METAL["darkest"], pal_base=pal["base"],
                   pal_light=pal["light"], radius=3)
    shaded_rect_3d(d, tower_r, pal_dark=METAL["darkest"], pal_base=pal["base"],
                   pal_light=pal["light"], radius=3)
    hex_pattern(d, tower_l, pal["dark"], size=4, alpha=70)
    hex_pattern(d, tower_r, pal["dark"], size=4, alpha=70)

    # Scope sur chaque tour
    for tx in (65, W - 65):
        sx_, sy_ = tx, 22
        d.ellipse((sx_ - 10, sy_ - 8, sx_ + 10, sy_ + 10),
                  fill=METAL["base"], outline=ACCENT["outline"])
        d.ellipse((sx_ - 7, sy_ - 5, sx_ + 7, sy_ + 7),
                  fill=METAL["darkest"])
        d.ellipse((sx_ - 5, sy_ - 3, sx_ + 5, sy_ + 5),
                  fill=TIER2_ACCENT)
        d.ellipse((sx_ - 2, sy_ - 1, sx_, sy_ + 1), fill=ACCENT["white"])
        # Mire
        d.line((sx_ - 4, sy_ + 1, sx_ + 4, sy_ + 1), fill=METAL["darkest"])
        d.line((sx_, sy_ - 3, sx_, sy_ + 5), fill=METAL["darkest"])

    # Triple-scope CENTRAL au sommet du pont (signature T2)
    for sx_ in (W // 2 - 14, W // 2, W // 2 + 14):
        d.ellipse((sx_ - 7, 16, sx_ + 7, 30),
                  fill=METAL["base"], outline=ACCENT["outline"])
        d.ellipse((sx_ - 5, 18, sx_ + 5, 28), fill=METAL["darkest"])
        d.ellipse((sx_ - 3, 20, sx_ + 3, 26), fill=TIER2_ACCENT)

    # Canons longs latéraux (vers extérieur)
    barrel_y0, barrel_y1 = H // 2 - 4, H // 2 + 2
    # Canon de la tour gauche (pointe à gauche)
    d.rectangle((8, barrel_y0, 40, barrel_y1),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.line((9, barrel_y0 + 1, 39, barrel_y0 + 1), fill=METAL["light"])
    d.rectangle((8, barrel_y0, 12, barrel_y1), fill=pal["glow"])
    # Canon de la tour droite
    d.rectangle((W - 40, barrel_y0, W - 8, barrel_y1),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.line((W - 39, barrel_y0 + 1, W - 9, barrel_y0 + 1), fill=METAL["light"])
    d.rectangle((W - 12, barrel_y0, W - 8, barrel_y1), fill=pal["glow"])

    # Antennes au top des tours + 2 centrales
    antenna_3d(d, 50, 30, 12, TIER2_ACCENT)
    antenna_3d(d, 80, 30, 12, TIER2_ACCENT)
    antenna_3d(d, W - 80, 30, 12, TIER2_ACCENT)
    antenna_3d(d, W - 50, 30, 12, TIER2_ACCENT)

    # Gates (bas pour player, haut pour enemy, 1 par tour)
    if side == "player":
        for tx in (65, W - 65):
            gate_at(d, side, tx, H - 16, H - 4, pal["glow"])
    else:
        for tx in (65, W - 65):
            gate_at(d, side, tx, 4, 16, pal["glow"])

    rivets_corners(d, (4, 6, W - 4, H - 4), TIER2_ACCENT, r=2)
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=10,
                        outline=TIER2_ACCENT, width=1)

    return drop_shadow(img, offset=(3, 4), blur=5, opacity=120)


def render_factory_sniper_t3(side, pal=None):
    W = H = 256
    if pal is None:
        pal = side_palette(side)
    img, d = new_canvas(W, H)

    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=14,
                        fill=METAL["darkest"], outline=ACCENT["outline"])

    cx, cy = W // 2, H // 2

    # 4 tours aux coins
    tower_size = 60
    towers = [
        (20, 20, 20 + tower_size, 20 + 90),
        (W - 20 - tower_size, 20, W - 20, 20 + 90),
        (20, H - 20 - 90, 20 + tower_size, H - 20),
        (W - 20 - tower_size, H - 20 - 90, W - 20, H - 20),
    ]
    for box in towers:
        shaded_rect_3d(d, box, pal_dark=METAL["darkest"], pal_base=pal["base"],
                       pal_light=pal["light"], radius=3)
        hex_pattern(d, box, pal["dark"], size=4, alpha=70)
        # Scope au top de chaque tour
        sx_ = (box[0] + box[2]) // 2
        sy_ = box[1] + 8
        d.ellipse((sx_ - 8, sy_ - 6, sx_ + 8, sy_ + 6),
                  fill=METAL["base"], outline=ACCENT["outline"])
        d.ellipse((sx_ - 5, sy_ - 3, sx_ + 5, sy_ + 3),
                  fill=TIER3_ACCENT)
        d.ellipse((sx_ - 2, sy_ - 1, sx_, sy_ + 1), fill=ACCENT["white"])

    # Central : observatoire massif (dôme)
    dome_r = 56
    shadow_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.ellipse((cx - dome_r + 2, cy - dome_r + 3, cx + dome_r + 2, cy + dome_r + 3),
               fill=(0, 0, 0, 130))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, shadow_layer)
    d = ImageDraw.Draw(img)
    d.ellipse((cx - dome_r, cy - dome_r, cx + dome_r, cy + dome_r),
              fill=METAL["dark"], outline=ACCENT["outline"])
    d.chord((cx - dome_r, cy - dome_r, cx + dome_r, cy + dome_r),
            start=180, end=360, fill=METAL["light"])
    # Bord doré
    d.ellipse((cx - dome_r, cy - dome_r, cx + dome_r, cy + dome_r),
              outline=TIER3_ACCENT, width=2)

    # Mega scope central
    d.ellipse((cx - 22, cy - 16, cx + 22, cy + 22),
              fill=METAL["darkest"], outline=TIER3_ACCENT)
    d.ellipse((cx - 16, cy - 11, cx + 16, cy + 17),
              fill=TIER3_ACCENT_DIM)
    d.ellipse((cx - 11, cy - 7, cx + 11, cy + 13),
              fill=TIER3_ACCENT)
    d.ellipse((cx - 6, cy - 3, cx + 6, cy + 7), fill=ACCENT["white"])
    # Mire en croix gigantesque
    d.line((cx - 18, cy + 3, cx + 18, cy + 3), fill=METAL["darkest"], width=2)
    d.line((cx, cy - 12, cx, cy + 18), fill=METAL["darkest"], width=2)

    # 4 radars dishes diagonaux
    for ang_deg in (30, 150, 210, 330):
        ang = math.radians(ang_deg)
        rx = cx + math.cos(ang) * 46
        ry = cy + math.sin(ang) * 46
        d.line((cx + math.cos(ang) * 28, cy + math.sin(ang) * 28,
                rx, ry), fill=METAL["darkest"], width=2)
        d.ellipse((rx - 7, ry - 4, rx + 7, ry + 4),
                  fill=METAL["base"], outline=ACCENT["outline"])
        d.ellipse((rx - 5, ry - 2, rx + 5, ry + 2), fill=TIER3_ACCENT_DIM)

    # 2 MEGA-canons croisés en X (depuis le centre vers les bords)
    barrel_w = 4
    for end_x in (-110, 110):
        bx_end = cx + end_x
        # Cast shadow
        d.line((cx + 2, cy + 2, bx_end + 2, cy + 2),
               fill=SHADOW_COLOR, width=barrel_w + 2)
        d.line((cx, cy, bx_end, cy), fill=METAL["darkest"], width=barrel_w)
        d.line((cx, cy - 1, bx_end, cy - 1), fill=METAL["light"], width=1)
        # Muzzle gold
        if end_x < 0:
            d.rectangle((bx_end - 2, cy - 3, bx_end + 4, cy + 3),
                        fill=TIER3_ACCENT)
        else:
            d.rectangle((bx_end - 4, cy - 3, bx_end + 2, cy + 3),
                        fill=TIER3_ACCENT)

    # Cadre or
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=12, outline=TIER3_ACCENT, width=2)
    d.rounded_rectangle((9, 11, W - 9, H - 9), radius=10, outline=TIER3_ACCENT_DIM, width=1)
    rivets_corners(d, (6, 8, W - 6, H - 6), TIER3_ACCENT, r=3)

    # Gates
    if side == "player":
        for box in (towers[2], towers[3]):
            cx_g = (box[0] + box[2]) // 2
            gate_at(d, side, cx_g, H - 16, H - 4, pal["glow"])
    else:
        for box in (towers[0], towers[1]):
            cx_g = (box[0] + box[2]) // 2
            gate_at(d, side, cx_g, 4, 16, pal["glow"])

    return drop_shadow(img, offset=(4, 5), blur=6, opacity=140)


# ===========================================================================
# AIR — Twin Hangar (T2) & Mega Airbase (T3)
# ===========================================================================

def render_factory_air_t2(side, pal=None):
    W, H = 256, 128
    if pal is None:
        pal = side_palette(side)
    img, d = new_canvas(W, H)

    # Plateforme tarmac (gris sombre, base d'aéroport)
    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=12,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((10, 12, W - 10, H - 10), radius=8,
                        fill=METAL["dark"], outline=ACCENT["outline"])

    # 2 helipads (cercles avec H)
    pad_l_cx, pad_r_cx = 60, W - 60
    pad_cy = H // 2
    pad_r = 32
    for px in (pad_l_cx, pad_r_cx):
        # Pad sombre
        d.ellipse((px - pad_r, pad_cy - pad_r, px + pad_r, pad_cy + pad_r),
                  fill=METAL["base"], outline=ACCENT["outline"])
        # Cercle intérieur
        d.ellipse((px - pad_r + 4, pad_cy - pad_r + 4,
                   px + pad_r - 4, pad_cy + pad_r - 4),
                  outline=TIER2_ACCENT, width=2)
        # H géant
        d.rectangle((px - 12, pad_cy - 16, px - 7, pad_cy + 16),
                    fill=TIER2_ACCENT)
        d.rectangle((px + 7, pad_cy - 16, px + 12, pad_cy + 16),
                    fill=TIER2_ACCENT)
        d.rectangle((px - 12, pad_cy - 3, px + 12, pad_cy + 3),
                    fill=TIER2_ACCENT)
        # 8 lumières autour du pad
        for i in range(8):
            ang = math.radians(i * 45)
            lx = px + math.cos(ang) * (pad_r - 2)
            ly = pad_cy + math.sin(ang) * (pad_r - 2)
            d.ellipse((lx - 1, ly - 1, lx + 1, ly + 1), fill=TIER2_ACCENT)

    # Taxi runway central (bande pointillée)
    for x in range(pad_l_cx + pad_r + 2, pad_r_cx - pad_r - 2, 8):
        d.rectangle((x, pad_cy - 1, x + 5, pad_cy + 1), fill=TIER2_ACCENT_DIM)

    # Mini control tower au centre
    ct_x, ct_y = W // 2, H // 2
    d.rectangle((ct_x - 8, ct_y - 22, ct_x + 8, ct_y - 8),
                fill=METAL["dark"], outline=ACCENT["outline"])
    d.rectangle((ct_x - 12, ct_y - 28, ct_x + 12, ct_y - 22),
                fill=METAL["base"], outline=ACCENT["outline"])
    # Vitre cyan
    d.rectangle((ct_x - 10, ct_y - 27, ct_x + 10, ct_y - 23),
                fill=TIER2_ACCENT)
    d.line((ct_x - 9, ct_y - 26, ct_x + 9, ct_y - 26), fill=ACCENT["white"])

    # Antennes radio sur la tour
    antenna_3d(d, ct_x - 5, ct_y - 28, 10, TIER2_ACCENT)
    antenna_3d(d, ct_x + 5, ct_y - 28, 12, TIER2_ACCENT)

    rivets_corners(d, (4, 6, W - 4, H - 4), TIER2_ACCENT, r=2)
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=10,
                        outline=TIER2_ACCENT, width=1)

    return drop_shadow(img, offset=(3, 4), blur=5, opacity=120)


def render_factory_air_t3(side, pal=None):
    W = H = 256
    if pal is None:
        pal = side_palette(side)
    img, d = new_canvas(W, H)

    # Tarmac massif
    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=14,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((10, 12, W - 10, H - 10), radius=10,
                        fill=METAL["dark"], outline=ACCENT["outline"])

    # 4 helipads aux coins
    cx, cy = W // 2, H // 2
    pad_r = 32
    corners = [(56, 56), (W - 56, 56), (56, H - 56), (W - 56, H - 56)]
    for px, py in corners:
        d.ellipse((px - pad_r, py - pad_r, px + pad_r, py + pad_r),
                  fill=METAL["base"], outline=ACCENT["outline"])
        d.ellipse((px - pad_r + 4, py - pad_r + 4,
                   px + pad_r - 4, py + pad_r - 4),
                  outline=TIER3_ACCENT, width=2)
        # H
        d.rectangle((px - 12, py - 16, px - 7, py + 16), fill=TIER3_ACCENT)
        d.rectangle((px + 7, py - 16, px + 12, py + 16), fill=TIER3_ACCENT)
        d.rectangle((px - 12, py - 3, px + 12, py + 3), fill=TIER3_ACCENT)
        # Lights
        for i in range(8):
            ang = math.radians(i * 45)
            lx = px + math.cos(ang) * (pad_r - 2)
            ly = py + math.sin(ang) * (pad_r - 2)
            d.ellipse((lx - 1, ly - 1, lx + 1, ly + 1), fill=TIER3_ACCENT)

    # Lignes taxi (croix entre les pads)
    for x in range(96, W - 96, 8):
        d.rectangle((x, cy - 1, x + 5, cy + 1), fill=TIER3_ACCENT_DIM)
    for y in range(96, H - 96, 8):
        d.rectangle((cx - 1, y, cx + 1, y + 5), fill=TIER3_ACCENT_DIM)

    # Central : grand control tower
    # Base
    d.rounded_rectangle((cx - 24, cy - 8, cx + 24, cy + 28), radius=3,
                        fill=METAL["base"], outline=ACCENT["outline"])
    d.rectangle((cx - 22, cy - 6, cx + 22, cy + 26), fill=METAL["dark"])
    # Vitre 360° (annulaire cyan)
    d.ellipse((cx - 28, cy - 16, cx + 28, cy + 4),
              fill=METAL["dark"], outline=ACCENT["outline"])
    d.ellipse((cx - 26, cy - 14, cx + 26, cy + 2), fill=TIER3_ACCENT)
    d.ellipse((cx - 24, cy - 12, cx + 24, cy), fill=TIER3_ACCENT_DIM)
    d.ellipse((cx - 22, cy - 11, cx + 22, cy - 1), fill=METAL["darkest"])

    # Radar dish sur le toit
    radar_cy = cy - 28
    d.rectangle((cx - 2, radar_cy + 4, cx + 2, radar_cy + 16),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.ellipse((cx - 18, radar_cy - 6, cx + 18, radar_cy + 6),
              fill=METAL["base"], outline=ACCENT["outline"])
    d.chord((cx - 18, radar_cy - 6, cx + 18, radar_cy + 6),
            start=180, end=360, fill=TIER3_ACCENT)
    d.ellipse((cx - 2, radar_cy - 2, cx + 2, radar_cy + 2), fill=ACCENT["white"])

    # Holo "flight paths" — cercles concentriques au-dessus de la tour
    holo_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(holo_layer)
    for r in (40, 32, 24):
        alpha = 60 if r == 40 else (100 if r == 32 else 140)
        hd.ellipse((cx - r, radar_cy - r // 4, cx + r, radar_cy + r // 4),
                   outline=(TIER3_ACCENT[0], TIER3_ACCENT[1], TIER3_ACCENT[2], alpha),
                   width=1)
    holo_layer = holo_layer.filter(ImageFilter.GaussianBlur(1))
    img = Image.alpha_composite(img, holo_layer)
    d = ImageDraw.Draw(img)

    # Cadre or
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=12, outline=TIER3_ACCENT, width=2)
    d.rounded_rectangle((9, 11, W - 9, H - 9), radius=10, outline=TIER3_ACCENT_DIM, width=1)
    rivets_corners(d, (6, 8, W - 6, H - 6), TIER3_ACCENT, r=3)

    return drop_shadow(img, offset=(4, 5), blur=6, opacity=130)


# ===========================================================================
# PREVIEW COMPARATIF — 5 types × 3 tiers
# ===========================================================================

REPO_ROOT = THIS_DIR.parent.parent
SPRITES_DIR = REPO_ROOT / "08-art-direction" / "sprites"


def load_t1(type_id, side):
    """Charge le sprite T1 existant (factory-{type}-{side}.png)."""
    path = SPRITES_DIR / f"factory-{type_id}-{side}.png"
    if path.exists():
        return Image.open(path).convert("RGBA")
    # Placeholder gris si absent
    img = Image.new("RGBA", (128, 128), (60, 60, 60, 255))
    return img


def render_comparison(side="player"):
    W, H = 1100, 1200
    img = Image.new("RGBA", (W, H), (15, 23, 42, 255))
    d = ImageDraw.Draw(img)

    title = "Factories — évolution par fusion (T1 → T2 → T3)"
    d.text((20, 14), title, fill=(240, 245, 255, 255))
    d.text((20, 32), f"{side.upper()} — T1 (128) · T2 (256×128) · T3 (256×256)",
           fill=(160, 180, 210, 255))
    d.line((20, 54, W - 20, 54), fill=(60, 80, 110, 255))

    types_data = [
        ("light",    render_factory_light_t1 if False else None, render_factory_light_t2 if False else None, None, "LIGHT"),
        # Pour light on a déjà les sprites dans l'autre script — ici on charge depuis t2/t3 fichiers
    ]
    # On fera plus simple : pour chaque type, on charge T1 depuis sprite + dessine T2/T3
    rows = [
        ("light",   "LIGHT — Compact Reactor"),
        ("heavy",   "HEAVY — Forge"),
        ("swarmer", "SWARMER — Hive"),
        ("sniper",  "SNIPER — Watchtower"),
        ("air",     "AIR — Hangar / Airbase"),
    ]
    row_height = 224
    start_y = 70
    label_w = 60

    for ri, (type_id, label) in enumerate(rows):
        rt = start_y + ri * row_height

        # Label de la rangée
        d.text((20, rt + 8), label, fill=(240, 245, 255, 255))

        # T1
        t1 = load_t1(type_id, side)
        img.paste(t1, (label_w + 20, rt + 24), t1)
        d = ImageDraw.Draw(img)
        d.text((label_w + 20, rt + 156), "T1", fill=(140, 200, 240, 255))

        # T2
        t2 = render_t2_for(type_id, side)
        img.paste(t2, (label_w + 180, rt + 24), t2)
        d = ImageDraw.Draw(img)
        d.text((label_w + 180, rt + 156), "T2 — twin", fill=(34, 211, 238, 255))

        # T3 (256×256 — décalé verticalement pour entrer)
        t3 = render_t3_for(type_id, side)
        img.paste(t3, (label_w + 460, rt - 16), t3)
        d = ImageDraw.Draw(img)
        d.text((label_w + 460, rt + 248), "T3 — mega",
               fill=(251, 191, 36, 255))

        # Séparateur
        if ri < len(rows) - 1:
            d.line((20, rt + row_height - 4, W - 20, rt + row_height - 4),
                   fill=(40, 55, 80, 255))

    return img


def render_t2_for(type_id, side):
    if type_id == "light":
        return _render_factory_light_t2_local(side)
    if type_id == "heavy":
        return render_factory_heavy_t2(side)
    if type_id == "swarmer":
        return render_factory_swarmer_t2(side)
    if type_id == "sniper":
        return render_factory_sniper_t2(side)
    if type_id == "air":
        return render_factory_air_t2(side)
    raise ValueError(type_id)


def render_t3_for(type_id, side):
    if type_id == "light":
        return _render_factory_light_t3_local(side)
    if type_id == "heavy":
        return render_factory_heavy_t3(side)
    if type_id == "swarmer":
        return render_factory_swarmer_t3(side)
    if type_id == "sniper":
        return render_factory_sniper_t3(side)
    if type_id == "air":
        return render_factory_air_t3(side)
    raise ValueError(type_id)


# Light T2/T3 : on importe depuis preview_factory_light_tiers.py si possible
try:
    from preview_factory_light_tiers import (
        render_factory_light_t2 as _render_factory_light_t2_local,
        render_factory_light_t3 as _render_factory_light_t3_local,
    )
except Exception:
    # Fallback : utilise une T2/T3 simple (au cas où l'import échoue)
    def _render_factory_light_t2_local(side):
        return render_factory_heavy_t2(side)
    def _render_factory_light_t3_local(side):
        return render_factory_heavy_t3(side)


# ===========================================================================
# MAIN
# ===========================================================================

def main():
    out_dir = REPO_ROOT / "08-art-direction" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Génère les T2/T3 pour heavy, swarmer, sniper, air × player + enemy
    items = []
    for type_id, t2_fn, t3_fn in [
        ("heavy",   render_factory_heavy_t2,   render_factory_heavy_t3),
        ("swarmer", render_factory_swarmer_t2, render_factory_swarmer_t3),
        ("sniper",  render_factory_sniper_t2,  render_factory_sniper_t3),
        ("air",     render_factory_air_t2,     render_factory_air_t3),
    ]:
        for side in ("player", "enemy"):
            items.append((f"factory-{type_id}-{side}-t2.png", lambda fn=t2_fn, s=side: fn(s)))
            items.append((f"factory-{type_id}-{side}-t3.png", lambda fn=t3_fn, s=side: fn(s)))

    for name, fn in items:
        img = fn()
        out = out_dir / name
        img.save(out, format="PNG")
        print(f"  {name:38s} {img.size[0]:>4}x{img.size[1]:<4}  → {out.relative_to(REPO_ROOT)}")

    # Comparaison player
    comp = render_comparison("player")
    comp_path = out_dir / "factory-all-tiers-preview.png"
    comp.save(comp_path, format="PNG")
    print(f"\n  factory-all-tiers-preview.png       {comp.size[0]}x{comp.size[1]}  → {comp_path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
