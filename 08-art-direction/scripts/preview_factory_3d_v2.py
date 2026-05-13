"""Génère les previews :
- factory-light-player-3d-v2.png : nouvelle factory light avec vraie 3D
  (toit visible top-down + front wall visible + cast shadow large) — comme
  les rochers/arbres qui ont du relief 3D.
- factory-light-enemy-3d-v2.png : variante enemy.
- blaster-preview.png : filmstrip horizontal montrant le design du bolt
  + sa trajectoire (5 frames + flashes muzzle/impact).

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


SHADOW_COL = (0, 0, 0, 130)


def cast_shadow_ellipse_blurred(img, x0, y0, x1, y1, blur=3, alpha=140):
    """Ombre portée elliptique floutée."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((x0, y0, x1, y1), fill=(0, 0, 0, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(img, layer)


def render_factory_light_3d_v2(side):
    """Factory light V2 : building 3D avec toit + front wall + cast shadow."""
    W = H = 128
    pal = side_palette(side)
    img, _ = new_canvas(W, H)

    # ─── 1) Cast shadow large à la base (le bâtiment "se tient" sur le sol)
    img = cast_shadow_ellipse_blurred(img, 8, 108, 122, 124, blur=3, alpha=160)
    d = ImageDraw.Draw(img)

    # ─── 2) FRONT WALL (Y 78-110) — trapèze légèrement plus large en bas (perspective)
    front_pts = [
        (18, 78),    # top-gauche
        (110, 78),   # top-droit
        (118, 110),  # bottom-droit (un peu plus large)
        (10, 110),   # bottom-gauche
    ]
    # Base de la front wall (mid-tone sombre)
    d.polygon(front_pts, fill=pal["dark"], outline=ACCENT["outline"])
    # Highlight haut du mur (suggère le bord du toit)
    d.line((18, 79, 110, 79), fill=pal["base"], width=1)
    d.line((18, 80, 110, 80), fill=pal["base"], width=1)
    # Ombre sol (très sombre tout en bas)
    d.polygon([(10, 108), (118, 108), (118, 110), (10, 110)], fill=(0, 0, 0, 255))

    # ─── 3) PORTE / GATE centrée sur la front wall
    gate_x, gate_w = W // 2, 26
    gate_top, gate_bot = 84, 106
    # Encadrement (pilier sombre)
    d.rectangle((gate_x - gate_w // 2 - 2, gate_top, gate_x + gate_w // 2 + 2, gate_bot),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    # Lumière intérieure (glow)
    d.rectangle((gate_x - gate_w // 2 + 2, gate_top + 3, gate_x + gate_w // 2 - 2, gate_bot - 2),
                fill=pal["glow"])
    # Petit reflet sur la porte
    d.line((gate_x - gate_w // 2 + 3, gate_top + 4, gate_x + gate_w // 2 - 3, gate_top + 4),
           fill=ACCENT["white"])

    # ─── 4) Plinthe / soubassement entre roof et front wall (épais bord)
    d.rectangle((14, 75, 114, 80), fill=METAL["darkest"], outline=ACCENT["outline"])

    # ─── 5) ROOF / TOIT (Y 14-75) — vue top-down avec relief
    roof_box = (16, 14, 112, 78)
    # Bord sombre extérieur (sol de plateforme)
    d.rounded_rectangle((14, 12, 114, 76), radius=8,
                        fill=METAL["darkest"], outline=ACCENT["outline"])
    # Corps du toit (4-tons clair)
    d.rounded_rectangle((roof_box[0], roof_box[1], roof_box[2], roof_box[3]), radius=6,
                        fill=pal["base"], outline=ACCENT["outline"])
    # Bande highlight haut (toit éclairé top-left)
    d.rounded_rectangle((roof_box[0] + 2, roof_box[1] + 2, roof_box[2] - 2, roof_box[1] + 18),
                        radius=4, fill=pal["light"])
    # Bande très claire (spec) sur l'arête haut-gauche
    d.line((roof_box[0] + 4, roof_box[1] + 3, roof_box[2] - 4, roof_box[1] + 3),
           fill=ACCENT["white"], width=1)
    # Bande sombre côté droit (face en ombre)
    d.polygon([
        (roof_box[2] - 8, roof_box[1] + 2),
        (roof_box[2] - 2, roof_box[1] + 2),
        (roof_box[2] - 2, roof_box[3] - 2),
        (roof_box[2] - 8, roof_box[3] - 2),
    ], fill=pal["dark"])

    # ─── 6) Détails signature "light" : bandes diagonales jaunes danger sur le toit
    for off in range(-W, W, 14):
        pts = [
            (roof_box[0] + off + 2, roof_box[1] + 4),
            (roof_box[0] + off + 8, roof_box[1] + 4),
            (roof_box[0] + off + 22, roof_box[1] + 14),
            (roof_box[0] + off + 16, roof_box[1] + 14),
        ]
        # Clip aux bornes du toit
        clipped = [(min(max(p[0], roof_box[0] + 2), roof_box[2] - 2), p[1]) for p in pts]
        d.polygon(clipped, fill=METAL["darkest"])

    # ─── 7) Tourelle centrale (avec cast shadow)
    cx_t, cy_t = W // 2, 46
    # Cast shadow sous la tourelle
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse((cx_t - 11, cy_t + 9, cx_t + 13, cy_t + 16), fill=(0, 0, 0, 120))
    sh = sh.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, sh)
    d = ImageDraw.Draw(img)
    # Socle métal
    d.ellipse((cx_t - 11, cy_t - 11, cx_t + 11, cy_t + 11),
              fill=METAL["dark"], outline=ACCENT["outline"])
    d.ellipse((cx_t - 9, cy_t - 9, cx_t + 9, cy_t + 9), fill=METAL["darkest"])
    # Dôme coloré
    d.ellipse((cx_t - 7, cy_t - 7, cx_t + 7, cy_t + 7),
              fill=pal["base"], outline=ACCENT["outline"])
    # Reflet sur le dôme (chord haut)
    d.chord((cx_t - 7, cy_t - 7, cx_t + 7, cy_t + 7), start=180, end=360,
            fill=pal["light"])
    d.ellipse((cx_t - 3, cy_t - 4, cx_t, cy_t - 1), fill=ACCENT["white"])
    # Canons (2 tubes vers le haut, avec ombre)
    for dx_ in (-3, 3):
        # Shadow
        d.rectangle((cx_t + dx_ - 1, cy_t - 18, cx_t + dx_ + 2, cy_t),
                    fill=(0, 0, 0, 100))
        d.rectangle((cx_t + dx_ - 1, cy_t - 18, cx_t + dx_ + 1, cy_t),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.line((cx_t + dx_ - 1, cy_t - 17, cx_t + dx_ - 1, cy_t - 1),
               fill=METAL["light"])

    # ─── 8) Antennes (avec lueur)
    for ax in (22, 106):
        # Tige
        d.line((ax + 1, 20, ax + 1, 8), fill=(0, 0, 0, 120), width=2)
        d.line((ax, 20, ax, 8), fill=METAL["darkest"], width=1)
        # Boule
        d.ellipse((ax, 8, ax + 2, 10), fill=(0, 0, 0, 120))
        d.ellipse((ax - 2, 6, ax + 2, 10), fill=pal["glow"])
        d.ellipse((ax - 1, 6, ax, 7), fill=ACCENT["white"])

    # ─── 9) Petit "panneau" lumineux sur le côté de la front wall (détail tech)
    # Suggère que la machine est active. À gauche pour player, droite pour enemy.
    if side == "player":
        d.rectangle((22, 88, 30, 96), fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((23, 89, 29, 95), fill=pal["glow"])
    else:
        d.rectangle((W - 30, 88, W - 22, 96), fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((W - 29, 89, W - 23, 95), fill=pal["glow"])

    return drop_shadow(img, offset=(2, 3), blur=3, opacity=80)


# ---------------------------------------------------------------------------
# BLASTER PREVIEW
# ---------------------------------------------------------------------------

BLASTER_THEMES = {
    "player": {
        "halo_outer":  (80, 180, 255, 100),   # bleu diffus
        "halo_inner":  (120, 220, 255, 220),
        "core":        (220, 245, 255, 255),
        "core_inner":  (240, 250, 255, 255),
        "trail":       (120, 220, 255),
        "title":       "Blaster bolt — JOUEUR (bleu/cyan)",
    },
    "enemy": {
        "halo_outer":  (255, 80, 50, 110),    # rouge/orange diffus
        "halo_inner":  (255, 140, 90, 230),
        "core":        (255, 220, 180, 255),
        "core_inner":  (255, 240, 220, 255),
        "trail":       (255, 140, 90),
        "title":       "Blaster bolt — ENNEMI (rouge/orange)",
    },
}


def render_blaster_preview(theme="player"):
    """Filmstrip horizontal : design isolé + 5 frames de trajectoire."""
    W, H = 480, 100
    th = BLASTER_THEMES[theme]
    img = Image.new("RGBA", (W, H), (15, 23, 42, 255))
    d = ImageDraw.Draw(img)

    # Titre
    d.text((10, 8), th["title"], fill=(240, 245, 255, 255))

    # ─── 1) Le design isolé (zoom) à gauche
    # Bolt = capsule lumineuse (core blanc, halo coloré)
    bolt_cy = 50
    bolt_cx_zoom = 60
    # Halo extérieur (couche large diffuse)
    halo_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo_layer)
    hd.ellipse((bolt_cx_zoom - 18, bolt_cy - 8, bolt_cx_zoom + 18, bolt_cy + 8),
               fill=th["halo_outer"])
    halo_layer = halo_layer.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, halo_layer)
    d = ImageDraw.Draw(img)
    # Halo intérieur (plus saturé)
    d.ellipse((bolt_cx_zoom - 12, bolt_cy - 4, bolt_cx_zoom + 12, bolt_cy + 4),
              fill=th["halo_inner"])
    # Core très brillant
    d.ellipse((bolt_cx_zoom - 7, bolt_cy - 2, bolt_cx_zoom + 7, bolt_cy + 2),
              fill=th["core"])
    # Étiquette
    d.text((bolt_cx_zoom - 28, 78), "design seul", fill=(180, 200, 220, 255))

    # Séparateur
    d.line((110, 28, 110, 88), fill=(60, 80, 110, 255), width=1)

    # ─── 2) Filmstrip : 5 frames de trajectoire (gauche → droite)
    # Frame 0 : muzzle flash + bolt naissant
    # Frames 1-3 : bolt en vol avec trail
    # Frame 4 : bolt arrive + impact flash
    frame_y_top, frame_y_bot = 25, 75
    strip_x_start, strip_x_end = 130, 470
    frame_w = (strip_x_end - strip_x_start) // 5

    for i in range(5):
        fx0 = strip_x_start + i * frame_w
        # Cadre subtil pour chaque frame
        d.rectangle((fx0 + 1, frame_y_top, fx0 + frame_w - 2, frame_y_bot),
                    outline=(50, 70, 100, 255))

        bolt_x = fx0 + 8 + (i * (frame_w - 16)) // 4  # bolt avance frame par frame
        bolt_y = (frame_y_top + frame_y_bot) // 2

        # Frame 0 : muzzle flash (étoile)
        if i == 0:
            flash_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            fl = ImageDraw.Draw(flash_layer)
            for r in range(6, 0, -2):
                fl.ellipse((fx0 + 6 - r, bolt_y - r, fx0 + 6 + r, bolt_y + r),
                           fill=(255, 240, 180, 80))
            flash_layer = flash_layer.filter(ImageFilter.GaussianBlur(2))
            img = Image.alpha_composite(img, flash_layer)
            d = ImageDraw.Draw(img)
            d.ellipse((fx0 + 4, bolt_y - 2, fx0 + 8, bolt_y + 2),
                      fill=(255, 240, 180, 255))

        # Frame 4 : impact flash (étoile + cercles)
        if i == 4:
            impact_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            il = ImageDraw.Draw(impact_layer)
            for r in range(8, 0, -2):
                il.ellipse((fx0 + frame_w - 8 - r, bolt_y - r,
                            fx0 + frame_w - 8 + r, bolt_y + r),
                           fill=(255, 220, 100, 100))
            impact_layer = impact_layer.filter(ImageFilter.GaussianBlur(2))
            img = Image.alpha_composite(img, impact_layer)
            d = ImageDraw.Draw(img)
            # Croix d'impact
            ix = fx0 + frame_w - 8
            for ang in (0, 45, 90, 135):
                rad = math.radians(ang)
                ex = ix + math.cos(rad) * 6
                ey = bolt_y + math.sin(rad) * 6
                d.line((ix - (ex - ix), bolt_y - (ey - bolt_y), ex, ey),
                       fill=(255, 240, 180, 255), width=1)

        # Bolt + trail (frames 1-3 : bolt en plein vol, trainée derrière lui)
        if 0 < i < 4:
            # Trail (3 segments fading derrière le bolt)
            trail_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            tl = ImageDraw.Draw(trail_layer)
            for t in range(3):
                tx = bolt_x - 5 - t * 4
                alpha = 180 - t * 50
                tr = th["trail"]
                tl.ellipse((tx - 2, bolt_y - 1, tx + 2, bolt_y + 1),
                           fill=(tr[0], tr[1], tr[2], alpha))
            trail_layer = trail_layer.filter(ImageFilter.GaussianBlur(1))
            img = Image.alpha_composite(img, trail_layer)
            d = ImageDraw.Draw(img)

        # Le bolt lui-même (toujours visible sauf frame 4)
        if i < 4:
            # Halo
            halo_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            hl = ImageDraw.Draw(halo_layer)
            ho = th["halo_outer"]
            hl.ellipse((bolt_x - 8, bolt_y - 4, bolt_x + 8, bolt_y + 4),
                       fill=(ho[0], ho[1], ho[2], 140))
            halo_layer = halo_layer.filter(ImageFilter.GaussianBlur(2))
            img = Image.alpha_composite(img, halo_layer)
            d = ImageDraw.Draw(img)
            # Core
            d.ellipse((bolt_x - 5, bolt_y - 2, bolt_x + 5, bolt_y + 2),
                      fill=th["core"])
            d.ellipse((bolt_x - 3, bolt_y - 1, bolt_x + 3, bolt_y + 1),
                      fill=th["core_inner"])

        # Label de la frame
        labels = ["1. tir +\nmuzzle", "2. vol", "3. vol+trail", "4. arrivée", "5. impact"]
        d.text((fx0 + 2, 80), labels[i], fill=(160, 180, 210, 255))

    return img


def main():
    repo_root = THIS_DIR.parent.parent
    out_dir = repo_root / "08-art-direction" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)

    items = [
        ("factory-light-player-3d-v2.png", lambda: render_factory_light_3d_v2("player")),
        ("factory-light-enemy-3d-v2.png",  lambda: render_factory_light_3d_v2("enemy")),
        ("blaster-preview-player.png",     lambda: render_blaster_preview("player")),
        ("blaster-preview-enemy.png",      lambda: render_blaster_preview("enemy")),
    ]

    for name, fn in items:
        img = fn()
        out = out_dir / name
        img.save(out, format="PNG")
        rel = out.relative_to(repo_root)
        print(f"  {name:38s} {img.size[0]:>3}x{img.size[1]:<3}  → {rel}")


if __name__ == "__main__":
    main()
