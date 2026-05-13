"""Preview pour validation : factory light désert aux 3 tiers.
T1 = 128×128 (1 slot, existant)
T2 = 256×128 (1×2 slots) — Twin Factory fusionnée avec réacteur central
T3 = 256×256 (2×2 slots) — Mega Command Factory avec tour centrale

Style robotique/futuriste : conduits d'énergie cyan/or, hex patterns,
radars, vents de refroidissement, LED strips, hologrammes subtils.

Sortie : 08-art-direction/preview/
"""

import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from palette import (
    new_canvas, side_palette, drop_shadow,
    METAL, ACCENT,
)


SHADOW_OFFSET = (2, 3)
SHADOW_COLOR = (0, 0, 0, 110)

TIER2_ACCENT      = (34, 211, 238, 255)   # cyan #22d3ee
TIER2_ACCENT_DIM  = (34, 211, 238, 100)
TIER2_GLOW_INNER  = (140, 240, 255, 255)
TIER3_ACCENT      = (251, 191, 36, 255)   # gold #fbbf24
TIER3_ACCENT_DIM  = (251, 191, 36, 140)
TIER3_GLOW_INNER  = (255, 230, 130, 255)


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
    """Turret futuriste avec dôme + 2 canons. accent_color override le glow."""
    s = size
    cast_shadow_ellipse(d, (cx - s, cy - s, cx + s, cy + s))
    # Socle blindé
    d.ellipse((cx - s, cy - s, cx + s, cy + s),
              fill=METAL["dark"], outline=ACCENT["outline"])
    d.ellipse((cx - s + 2, cy - s + 2, cx + s - 2, cy + s - 2),
              fill=METAL["darkest"])
    # Dôme coloré
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
    # Canons
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


def hex_pattern(d, box, color, size=6, alpha=60):
    """Pattern hexagonal subtil sur une zone (effet armure sci-fi)."""
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
    """Conduit vertical pulsant avec core lumineux."""
    # Tube outer (dark frame)
    d.rounded_rectangle((cx - width // 2 - 1, y_top, cx + width // 2 + 1, y_bot),
                        radius=2, fill=METAL["darkest"], outline=ACCENT["outline"])
    # Core lumineux pulse
    inner = max(1, width // 2 - 1)
    d.rounded_rectangle((cx - inner, y_top + 2, cx + inner, y_bot - 2),
                        radius=1, fill=color)
    # Highlight central
    d.line((cx, y_top + 3, cx, y_bot - 3), fill=ACCENT["white"], width=1)


def rivets_corners(d, box, color, r=2):
    x0, y0, x1, y1 = box
    for cx, cy in [(x0 + 4, y0 + 4), (x1 - 4, y0 + 4),
                    (x0 + 4, y1 - 4), (x1 - 4, y1 - 4)]:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
        d.ellipse((cx - 1, cy - 1, cx, cy), fill=ACCENT["white"])


def vent_grille(d, x, y, w, h, color):
    """Grille de ventilation horizontale."""
    d.rounded_rectangle((x, y, x + w, y + h), radius=1,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    for ry in range(y + 1, y + h - 1, 2):
        d.line((x + 1, ry, x + w - 1, ry), fill=color, width=1)


def diag_warning_stripes(d, box, stripe_color):
    """Bandes diagonales danger jaunes."""
    x0, y0, x1, y1 = box
    W = x1 - x0
    for off in range(-W, W, 14):
        d.polygon([(x0 + off, y0), (x0 + off + 6, y0),
                   (x0 + off + 22, y0 + 8), (x0 + off + 16, y0 + 8)],
                  fill=stripe_color)


# ===========================================================================
# T1 — référence (128×128)
# ===========================================================================

def render_factory_light_t1(side):
    W = H = 128
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=10,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((6, 8, W - 6, 12), radius=8, fill=METAL["dark"])
    body = (12, 14, W - 12, H - 12)
    shaded_rect_3d(d, body, pal_dark=METAL["darkest"], pal_base=pal["base"],
                   pal_light=pal["light"], radius=6)
    diag_warning_stripes(d, (body[0], body[1], body[2], body[1] + 8),
                         METAL["darkest"])

    turret_3d(d, W // 2, H // 2 - 4, 10, pal)
    antenna_3d(d, body[0] + 8, body[1] + 4, 10, pal["glow"])
    antenna_3d(d, body[2] - 8, body[1] + 4, 10, pal["glow"])

    # Gate
    if side == "player":
        d.rectangle((W // 2 - 11, H - 16, W // 2 + 11, H - 4),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((W // 2 - 8, H - 14, W // 2 + 8, H - 6), fill=pal["glow"])
    else:
        d.rectangle((W // 2 - 11, 4, W // 2 + 11, 16),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((W // 2 - 8, 6, W // 2 + 8, 14), fill=pal["glow"])

    return drop_shadow(img, offset=(2, 3), blur=4, opacity=110)


# ===========================================================================
# T2 — TWIN FACTORY FUSIONNÉE (256×128)
# ===========================================================================

def render_factory_light_t2(side, pal=None):
    """Deux baies de factory fusionnées par un réacteur central + LED strips
    cyan, hex pattern sur les côtés, vents de refroidissement, conduits
    d'énergie. Aspect 2:1 pour les slots 1×2."""
    W, H = 256, 128
    if pal is None:
        pal = side_palette(side)
    img, d = new_canvas(W, H)

    # ── Plateforme globale
    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=12,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((4, 6, W - 4, 10), radius=10, fill=METAL["dark"])

    # ── 2 baies symétriques + zone de fusion centrale
    bay_w = 96
    bay_left  = (12, 14, 12 + bay_w, H - 12)
    bay_right = (W - 12 - bay_w, 14, W - 12, H - 12)
    fusion_zone = (12 + bay_w, 14, W - 12 - bay_w, H - 12)

    # Corps baie gauche (4-tons)
    shaded_rect_3d(d, bay_left, pal_dark=METAL["darkest"],
                   pal_base=pal["base"], pal_light=pal["light"], radius=4)
    # Corps baie droite
    shaded_rect_3d(d, bay_right, pal_dark=METAL["darkest"],
                   pal_base=pal["base"], pal_light=pal["light"], radius=4)
    # Zone de fusion (plus sombre, technique)
    d.rounded_rectangle(fusion_zone, radius=3,
                        fill=METAL["dark"], outline=ACCENT["outline"])
    d.rounded_rectangle((fusion_zone[0] + 1, fusion_zone[1] + 1,
                         fusion_zone[2] - 1, fusion_zone[1] + 14),
                        radius=2, fill=METAL["base"])

    # ── Hex pattern subtil sur les baies (armure sci-fi)
    hex_pattern(d, (bay_left[0] + 6, bay_left[1] + 20,
                    bay_left[2] - 6, bay_left[3] - 20),
                pal["dark"], size=5, alpha=80)
    hex_pattern(d, (bay_right[0] + 6, bay_right[1] + 20,
                    bay_right[2] - 6, bay_right[3] - 20),
                pal["dark"], size=5, alpha=80)

    # ── Bandes warning diagonales sur le haut des baies
    diag_warning_stripes(d, (bay_left[0], bay_left[1],
                             bay_left[2], bay_left[1] + 8), METAL["darkest"])
    diag_warning_stripes(d, (bay_right[0], bay_right[1],
                             bay_right[2], bay_right[1] + 8), METAL["darkest"])

    # ── LED strip cyan continue le long du toit (signature T2)
    led_y = 12
    d.line((bay_left[0] + 4, led_y, bay_right[2] - 4, led_y),
           fill=TIER2_ACCENT, width=1)
    d.line((bay_left[0] + 4, led_y + 1, bay_right[2] - 4, led_y + 1),
           fill=TIER2_ACCENT_DIM, width=1)

    # ── Conduit d'énergie central vertical (le réacteur)
    cx_fuse = (fusion_zone[0] + fusion_zone[2]) // 2
    energy_conduit_vertical(d, cx_fuse, fusion_zone[1] + 18,
                             fusion_zone[3] - 6, TIER2_ACCENT, width=8)
    # Anneau pulsant autour du conduit
    for r in (12, 9, 6):
        alpha = 60 if r == 12 else (120 if r == 9 else 180)
        ring_color = (TIER2_ACCENT[0], TIER2_ACCENT[1], TIER2_ACCENT[2], alpha)
        ring_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        rd = ImageDraw.Draw(ring_layer)
        rd.ellipse((cx_fuse - r, H // 2 - r, cx_fuse + r, H // 2 + r),
                   outline=ring_color, width=1)
        img = Image.alpha_composite(img, ring_layer)
        d = ImageDraw.Draw(img)

    # ── Power lines connectant les 2 baies à la zone fusion
    for y_line in (H // 2 - 18, H // 2 + 18):
        d.line((bay_left[2], y_line, fusion_zone[0] + 4, y_line),
               fill=TIER2_ACCENT_DIM, width=2)
        d.line((bay_left[2], y_line, fusion_zone[0] + 4, y_line),
               fill=TIER2_ACCENT, width=1)
        d.line((fusion_zone[2] - 4, y_line, bay_right[0], y_line),
               fill=TIER2_ACCENT_DIM, width=2)
        d.line((fusion_zone[2] - 4, y_line, bay_right[0], y_line),
               fill=TIER2_ACCENT, width=1)

    # ── Vents de refroidissement (côtés des baies)
    vent_grille(d, bay_left[0] + 4, bay_left[3] - 22, 16, 10, TIER2_ACCENT_DIM)
    vent_grille(d, bay_right[2] - 20, bay_right[3] - 22, 16, 10, TIER2_ACCENT_DIM)

    # ── Turrets : 1 sur chaque baie + 1 grosse au sommet du réacteur
    turret_3d(d, bay_left[0] + bay_w // 2, H // 2 - 4, 9, pal, accent_color=TIER2_ACCENT)
    turret_3d(d, bay_right[0] + bay_w // 2, H // 2 - 4, 9, pal, accent_color=TIER2_ACCENT)
    turret_3d(d, cx_fuse, fusion_zone[1] + 26, 10, pal, accent_color=TIER2_ACCENT)

    # ── Antennes : 2 sur chaque baie + 1 centrale top du réacteur
    antenna_3d(d, bay_left[0] + 8, bay_left[1] + 4, 11, TIER2_ACCENT)
    antenna_3d(d, bay_left[2] - 8, bay_left[1] + 4, 11, TIER2_ACCENT)
    antenna_3d(d, bay_right[0] + 8, bay_right[1] + 4, 11, TIER2_ACCENT)
    antenna_3d(d, bay_right[2] - 8, bay_right[1] + 4, 11, TIER2_ACCENT)
    antenna_3d(d, cx_fuse, fusion_zone[1] + 4, 16, TIER2_ACCENT)

    # ── Rivets cyan aux 4 coins de la plateforme
    rivets_corners(d, (4, 6, W - 4, H - 4), TIER2_ACCENT, r=2)

    # ── 2 gates (une par baie)
    if side == "player":
        for bay in (bay_left, bay_right):
            cx_g = (bay[0] + bay[2]) // 2
            d.rectangle((cx_g - 11, H - 16, cx_g + 11, H - 4),
                        fill=METAL["darkest"], outline=ACCENT["outline"])
            d.rectangle((cx_g - 8, H - 14, cx_g + 8, H - 6), fill=pal["glow"])
            d.ellipse((cx_g - 1, H - 11, cx_g + 1, H - 9), fill=ACCENT["white"])
    else:
        for bay in (bay_left, bay_right):
            cx_g = (bay[0] + bay[2]) // 2
            d.rectangle((cx_g - 11, 4, cx_g + 11, 16),
                        fill=METAL["darkest"], outline=ACCENT["outline"])
            d.rectangle((cx_g - 8, 6, cx_g + 8, 14), fill=pal["glow"])
            d.ellipse((cx_g - 1, 9, cx_g + 1, 11), fill=ACCENT["white"])

    # ── Cadre cyan global (signature T2)
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=10,
                        outline=TIER2_ACCENT, width=1)

    return drop_shadow(img, offset=(3, 4), blur=5, opacity=120)


# ===========================================================================
# T3 — MEGA COMMAND FACTORY (256×256)
# ===========================================================================

def render_factory_light_t3(side, pal=None):
    """Mega factory 2×2 : 4 baies aux coins + command tower centrale avec
    radars, super-turret, hologramme, conduits d'énergie or."""
    W = H = 256
    if pal is None:
        pal = side_palette(side)
    img, d = new_canvas(W, H)

    # ── Plateforme massive
    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=14,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rounded_rectangle((4, 6, W - 4, 12), radius=12, fill=METAL["dark"])

    # ── 4 baies aux coins (chacune ~96×96)
    bay_size = 92
    bays = {
        "tl": (10, 14, 10 + bay_size, 14 + bay_size),
        "tr": (W - 10 - bay_size, 14, W - 10, 14 + bay_size),
        "bl": (10, H - 14 - bay_size, 10 + bay_size, H - 14),
        "br": (W - 10 - bay_size, H - 14 - bay_size, W - 10, H - 14),
    }
    for box in bays.values():
        shaded_rect_3d(d, box, pal_dark=METAL["darkest"],
                       pal_base=pal["base"], pal_light=pal["light"], radius=4)
        # Hex pattern dans chaque baie
        hex_pattern(d, (box[0] + 6, box[1] + 18,
                        box[2] - 6, box[3] - 14),
                    pal["dark"], size=5, alpha=80)
        # Warning stripes au top de chaque baie
        diag_warning_stripes(d, (box[0], box[1], box[2], box[1] + 8),
                             METAL["darkest"])

    # ── Zone centrale = command tower (~110×110)
    cx, cy = W // 2, H // 2
    tower_box = (cx - 55, cy - 55, cx + 55, cy + 55)
    # Plateforme hexagonale centrale
    hex_pts = []
    for i in range(6):
        ang = math.radians(60 * i)
        hex_pts.append((cx + math.cos(ang) * 58, cy + math.sin(ang) * 58))
    # Cast shadow de la plateforme hex
    shadow_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.polygon([(p[0] + 2, p[1] + 3) for p in hex_pts], fill=(0, 0, 0, 130))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(3))
    img = Image.alpha_composite(img, shadow_layer)
    d = ImageDraw.Draw(img)
    # Plateforme hex
    d.polygon(hex_pts, fill=METAL["base"], outline=ACCENT["outline"])
    # Bord doré du hex
    for i in range(6):
        p1 = hex_pts[i]
        p2 = hex_pts[(i + 1) % 6]
        d.line((p1[0], p1[1], p2[0], p2[1]), fill=TIER3_ACCENT, width=2)

    # ── Plateforme intérieure (assise du turret)
    inner_pts = []
    for i in range(6):
        ang = math.radians(60 * i)
        inner_pts.append((cx + math.cos(ang) * 42, cy + math.sin(ang) * 42))
    d.polygon(inner_pts, fill=pal["dark"], outline=TIER3_ACCENT)
    # Hex pattern inner
    hex_pattern(d, (cx - 38, cy - 38, cx + 38, cy + 38),
                TIER3_ACCENT, size=6, alpha=60)

    # ── Conduits diagonaux : centre → 4 baies (puits d'énergie or)
    for bx, by in [(bays["tl"][2] - 6, bays["tl"][3] - 6),
                    (bays["tr"][0] + 6, bays["tr"][3] - 6),
                    (bays["bl"][2] - 6, bays["bl"][1] + 6),
                    (bays["br"][0] + 6, bays["br"][1] + 6)]:
        # Vector centre → coin
        dx = bx - cx
        dy = by - cy
        length = math.sqrt(dx * dx + dy * dy)
        # Conduit dark + glow or
        ux = dx / length
        uy = dy / length
        # Start juste à l'extérieur du hex inner
        sx_ = cx + ux * 42
        sy_ = cy + uy * 42
        d.line((sx_, sy_, bx, by), fill=METAL["darkest"], width=3)
        d.line((sx_, sy_, bx, by), fill=TIER3_ACCENT, width=1)

    # ── 4 radars dishes pointant en diagonale (autour du hex inner)
    for ang_deg in (30, 150, 210, 330):
        ang = math.radians(ang_deg)
        dx_ = math.cos(ang) * 50
        dy_ = math.sin(ang) * 50
        rx, ry = cx + dx_, cy + dy_
        # Tige
        d.line((cx + math.cos(ang) * 42, cy + math.sin(ang) * 42,
                rx, ry), fill=METAL["darkest"], width=2)
        # Dish ovale
        # Orientation : perpendiculaire au rayon (face vers l'extérieur)
        d.ellipse((rx - 6, ry - 3, rx + 6, ry + 3),
                  fill=METAL["base"], outline=ACCENT["outline"])
        d.ellipse((rx - 4, ry - 2, rx + 4, ry + 2), fill=TIER3_ACCENT_DIM)
        d.ellipse((rx - 2, ry - 1, rx + 2, ry + 1), fill=TIER3_ACCENT)

    # ── SUPER-TURRET au centre (plus grosse que tout)
    # Cast shadow
    cast_shadow_ellipse(d, (cx - 18, cy - 18, cx + 18, cy + 18))
    # Socle
    d.ellipse((cx - 18, cy - 18, cx + 18, cy + 18),
              fill=METAL["dark"], outline=ACCENT["outline"])
    d.ellipse((cx - 16, cy - 16, cx + 16, cy + 16),
              fill=METAL["darkest"])
    # Dôme coloré pal
    d.ellipse((cx - 13, cy - 13, cx + 13, cy + 13),
              fill=pal["base"], outline=ACCENT["outline"])
    d.chord((cx - 12, cy - 12, cx + 12, cy + 12),
            start=180, end=360, fill=pal["light"])
    # Core or au sommet
    d.ellipse((cx - 5, cy - 5, cx + 5, cy + 5),
              fill=TIER3_ACCENT, outline=ACCENT["outline"])
    d.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=ACCENT["white"])
    # Triple canon (3 tubes vers le haut)
    for dx_t in (-6, 0, 6):
        d.rectangle((cx + dx_t - 1, cy - 24, cx + dx_t + 1, cy),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.line((cx + dx_t - 1, cy - 23, cx + dx_t - 1, cy - 1),
               fill=METAL["light"])

    # ── Turrets corner (1 par baie)
    for box in bays.values():
        bcx = (box[0] + box[2]) // 2
        bcy = (box[1] + box[3]) // 2
        turret_3d(d, bcx, bcy, 9, pal, accent_color=TIER3_ACCENT)

    # ── Antennes : 1 par baie + 4 centrales en croix au-dessus du hex
    for box in bays.values():
        bcx = (box[0] + box[2]) // 2
        antenna_3d(d, bcx, box[1] + 2, 14, TIER3_ACCENT)

    # 4 antennes centrales (au-dessus du hex inner)
    for ang_deg in (60, 120, 240, 300):
        ang = math.radians(ang_deg)
        ax = cx + math.cos(ang) * 36
        ay = cy + math.sin(ang) * 36
        antenna_3d(d, int(ax), int(ay), 10, TIER3_ACCENT)

    # ── Hologramme léger au-dessus du super-turret (cercles concentriques flottants)
    holo_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(holo_layer)
    for r in (24, 20, 16):
        alpha = 80 if r == 24 else (100 if r == 20 else 120)
        hd.ellipse((cx - r, cy - 38 - r // 4, cx + r, cy - 38 + r // 4),
                   outline=(TIER3_ACCENT[0], TIER3_ACCENT[1], TIER3_ACCENT[2], alpha),
                   width=1)
    holo_layer = holo_layer.filter(ImageFilter.GaussianBlur(1))
    img = Image.alpha_composite(img, holo_layer)
    d = ImageDraw.Draw(img)

    # ── Cadre or épais (signature T3)
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=12,
                        outline=TIER3_ACCENT, width=2)
    d.rounded_rectangle((9, 11, W - 9, H - 9), radius=10,
                        outline=TIER3_ACCENT_DIM, width=1)

    # ── Rivets dorés aux 4 coins
    rivets_corners(d, (6, 8, W - 6, H - 6), TIER3_ACCENT, r=3)

    # ── 4 gates : une par baie au front
    if side == "player":
        for box in (bays["bl"], bays["br"]):  # gates côté joueur = bas
            cx_g = (box[0] + box[2]) // 2
            d.rectangle((cx_g - 11, H - 16, cx_g + 11, H - 4),
                        fill=METAL["darkest"], outline=ACCENT["outline"])
            d.rectangle((cx_g - 8, H - 14, cx_g + 8, H - 6), fill=pal["glow"])
            d.ellipse((cx_g - 1, H - 11, cx_g + 1, H - 9), fill=ACCENT["white"])
    else:
        for box in (bays["tl"], bays["tr"]):  # gates côté ennemi = haut
            cx_g = (box[0] + box[2]) // 2
            d.rectangle((cx_g - 11, 4, cx_g + 11, 16),
                        fill=METAL["darkest"], outline=ACCENT["outline"])
            d.rectangle((cx_g - 8, 6, cx_g + 8, 14), fill=pal["glow"])
            d.ellipse((cx_g - 1, 9, cx_g + 1, 11), fill=ACCENT["white"])

    return drop_shadow(img, offset=(4, 5), blur=6, opacity=130)


# ===========================================================================
# PREVIEW COMPARATIF (T1 + T2 + T3 à leurs vraies tailles)
# ===========================================================================

def render_comparison():
    W, H = 1000, 720
    img = Image.new("RGBA", (W, H), (15, 23, 42, 255))
    d = ImageDraw.Draw(img)

    d.text((20, 14), "Light factory — évolution par fusion (Tier I → II → III)",
           fill=(240, 245, 255, 255))
    d.text((20, 32),
           "T1 = 1 slot · T2 = 1×2 slots (twin reactor) · T3 = 2×2 slots (mega command)",
           fill=(160, 180, 210, 255))
    d.line((20, 54, W - 20, 54), fill=(60, 80, 110, 255))

    # 2 rangées : player, enemy
    # Pour chaque, on aligne T1 (128) + T2 (256) + T3 (256) horizontalement
    label_w = 60
    gap = 16
    start_x = label_w + 20

    for ri, side in enumerate(["player", "enemy"]):
        # Y de base de la rangée (centre vertical pour l'alignement)
        if ri == 0:
            row_top = 72
        else:
            row_top = 412

        d.text((20, row_top + 100), side.upper(), fill=(180, 200, 220, 255))

        # T1 (128×128) — aligné au top-left de la rangée
        t1 = render_factory_light_t1(side)
        img.paste(t1, (start_x, row_top), t1)
        d = ImageDraw.Draw(img)
        d.text((start_x, row_top + 132), "T1 — 1 slot",
               fill=(140, 200, 240, 255))

        # T2 (256×128) — à droite de T1
        x_t2 = start_x + 128 + gap
        t2 = render_factory_light_t2(side)
        img.paste(t2, (x_t2, row_top), t2)
        d = ImageDraw.Draw(img)
        d.text((x_t2, row_top + 132), "T2 — 1×2 slots — Twin Reactor",
               fill=(34, 211, 238, 255))

        # T3 (256×256) — à droite de T2, mais sa hauteur est plus grande
        x_t3 = x_t2 + 256 + gap
        t3 = render_factory_light_t3(side)
        img.paste(t3, (x_t3, row_top - 64), t3)  # décale pour centrer verticalement
        d = ImageDraw.Draw(img)
        d.text((x_t3, row_top + 196), "T3 — 2×2 slots — Mega Command",
               fill=(251, 191, 36, 255))

    return img


# ===========================================================================
# MAIN
# ===========================================================================

def main():
    repo_root = THIS_DIR.parent.parent
    out_dir = repo_root / "08-art-direction" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)

    items = [
        ("factory-light-player-t2.png", lambda: render_factory_light_t2("player")),
        ("factory-light-player-t3.png", lambda: render_factory_light_t3("player")),
        ("factory-light-enemy-t2.png",  lambda: render_factory_light_t2("enemy")),
        ("factory-light-enemy-t3.png",  lambda: render_factory_light_t3("enemy")),
        ("factory-light-tiers-preview.png", render_comparison),
    ]

    for name, fn in items:
        img = fn()
        out = out_dir / name
        img.save(out, format="PNG")
        print(f"  {name:38s} {img.size[0]:>4}x{img.size[1]:<4}  → {out.relative_to(repo_root)}")


if __name__ == "__main__":
    main()
