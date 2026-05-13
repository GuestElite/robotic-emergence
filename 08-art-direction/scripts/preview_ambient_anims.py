"""Génère les previews des ambient anims par biome :
- anim-tumbleweed.png : ASSET réel (24×24), sprite du buisson roulant désert
- ambient-anims-preview.png : MOCKUP large 3 rangées (desert/snow/jungle)
  montrant les 3 anims en 3 frames de progression chacune

Sortie : 08-art-direction/preview/
"""

import math
import random
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from palette import new_canvas, drop_shadow, GROUND


# ---------------------------------------------------------------------------
# 1) ASSET RÉEL : anim-tumbleweed.png (24×24)
# ---------------------------------------------------------------------------

TUMBLE_DARK   = (107, 80,  46,  255)  # brun foncé écorce
TUMBLE_BASE   = (155, 122, 75,  255)  # brun clair sec
TUMBLE_LIGHT  = (197, 168, 110, 255)  # paille sun-lit
TUMBLE_TWIG   = (74,  51,  26,  255)  # twigs très sombres


def render_tumbleweed_sprite():
    """Sprite du buisson roulant — 32×32 v2 : branches enchevêtrées seulement,
    pas de silhouette pleine. La forme émerge de la densité des branches.
    Effet "aéré et sec" caractéristique du tumbleweed."""
    W = H = 32
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2
    R = 13  # rayon "logique" du buisson

    # Cast shadow plat au pied
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse((cx - R, cy + R - 1, cx + R + 1, cy + R + 4),
               fill=(0, 0, 0, 110))
    sh = sh.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, sh)
    d = ImageDraw.Draw(img)

    rng = random.Random(7)

    # ── Couche 1 : 35 branches sombres traversantes (squelette)
    # Chaque branche part d'un point intérieur, traverse vers l'autre côté en
    # passant proche du centre. Direction aléatoire.
    for _ in range(35):
        # Point de départ sur un cercle intérieur
        a1 = rng.uniform(0, 2 * math.pi)
        r1 = rng.uniform(R * 0.85, R * 1.05)
        x1 = cx + math.cos(a1) * r1
        y1 = cy + math.sin(a1) * r1
        # Point d'arrivée (vers la zone opposée, mais pas pile en face)
        a2 = a1 + math.pi + rng.uniform(-1.0, 1.0)
        r2 = rng.uniform(R * 0.7, R * 1.05)
        x2 = cx + math.cos(a2) * r2
        y2 = cy + math.sin(a2) * r2
        # Couleur : 65% twig très sombre, 35% brun moyen
        c = TUMBLE_TWIG if rng.random() < 0.65 else TUMBLE_DARK
        d.line((x1, y1, x2, y2), fill=c, width=1)

    # ── Couche 2 : 25 branches plus claires + courtes (texture sun-lit)
    for _ in range(25):
        a1 = rng.uniform(0, 2 * math.pi)
        # Concentré côté haut-gauche (lumière)
        if rng.random() < 0.7:
            a1 = rng.uniform(math.pi * 0.9, math.pi * 1.7)
        r1 = rng.uniform(R * 0.4, R * 0.95)
        x1 = cx + math.cos(a1) * r1
        y1 = cy + math.sin(a1) * r1
        # Petite longueur (4-7 px)
        len_b = rng.uniform(4, 7)
        a_dir = rng.uniform(0, 2 * math.pi)
        x2 = x1 + math.cos(a_dir) * len_b
        y2 = y1 + math.sin(a_dir) * len_b
        c = TUMBLE_BASE if rng.random() < 0.5 else TUMBLE_LIGHT
        d.line((x1, y1, x2, y2), fill=c, width=1)

    # ── Couche 3 : 12 brindilles pointues qui dépassent de la silhouette
    # (le tumbleweed a toujours des aspérités qui sortent)
    for _ in range(12):
        a = rng.uniform(0, 2 * math.pi)
        # Origine légèrement à l'intérieur
        r_in = R * 0.85
        x1 = cx + math.cos(a) * r_in
        y1 = cy + math.sin(a) * r_in
        # Pointe vers l'extérieur
        r_out = R + rng.uniform(1, 4)
        x2 = cx + math.cos(a) * r_out
        y2 = cy + math.sin(a) * r_out
        d.line((x1, y1, x2, y2), fill=TUMBLE_TWIG, width=1)

    # ── Couche 4 : quelques noeuds (points denses où plusieurs branches
    # convergent) — donne de la texture
    for _ in range(8):
        a = rng.uniform(0, 2 * math.pi)
        r = rng.uniform(R * 0.3, R * 0.85)
        x = cx + math.cos(a) * r
        y = cy + math.sin(a) * r
        d.point((x, y), fill=TUMBLE_TWIG)
        d.point((x + 1, y), fill=TUMBLE_DARK)

    return img


# ---------------------------------------------------------------------------
# 2) MOCKUP : 3 rangées de progression d'animation
# ---------------------------------------------------------------------------

def _draw_label(d, x, y, text):
    d.text((x, y), text, fill=(240, 245, 255, 255))


def _draw_subtitle(d, x, y, text):
    d.text((x, y), text, fill=(160, 180, 210, 255))


def _draw_frame_bg(d, x, y, w, h, biome):
    """Background coloré selon le biome."""
    colors = {
        "desert": (201, 168, 116),
        "snow":   (218, 228, 238),
        "jungle": (106, 80, 52),
    }
    base = colors[biome]
    # Petit dégradé vertical (haut clair, bas légèrement sombre)
    for yy in range(h):
        t = yy / h
        c = (
            int(base[0] * (1 - t * 0.15)),
            int(base[1] * (1 - t * 0.15)),
            int(base[2] * (1 - t * 0.15)),
            255,
        )
        d.line((x, y + yy, x + w, y + yy), fill=c)
    # Cadre
    d.rectangle((x, y, x + w - 1, y + h - 1), outline=(50, 70, 100, 255))


def render_mockup():
    """Image globale 3 rangées × 3 frames de progression."""
    W, H = 900, 520
    img = Image.new("RGBA", (W, H), (15, 23, 42, 255))
    d = ImageDraw.Draw(img)

    d.text((20, 12), "Ambient animations par biome — 3 frames de progression",
           fill=(240, 245, 255, 255))
    d.line((20, 32, W - 20, 32), fill=(60, 80, 110, 255))

    frame_w, frame_h = 250, 130
    frame_gap = 16
    label_w = 80

    rows = ["desert", "snow", "jungle"]
    row_labels = {
        "desert": "DESERT — Buisson roulant",
        "snow":   "SNOW — Chute de flocons",
        "jungle": "JUNGLE — Pluie tropicale",
    }
    row_subs = {
        "desert": "1 sprite 24×24, traverse la map en rolling, 5s, toutes 20-35s",
        "snow":   "50-80 particules blanches, drift latéral, 5-7s, toutes 30-50s",
        "jungle": "60-100 gouttes diagonales rapides, 4-7s, toutes 25-45s",
    }

    row_y_start = 50
    for ri, biome in enumerate(rows):
        ry = row_y_start + ri * (frame_h + 35)
        _draw_label(d, 20, ry, row_labels[biome])
        _draw_subtitle(d, 20, ry + 16, row_subs[biome])

        for fi in range(3):
            fx = label_w + 60 + fi * (frame_w + frame_gap)
            fy = ry + 4

            # Background du biome
            _draw_frame_bg(d, fx, fy, frame_w, frame_h, biome)

            # Étiquette frame
            d.text((fx + 4, fy + frame_h - 14),
                   f"frame {fi + 1}/3", fill=(60, 70, 90, 255))

            # ─── DESERT : tumbleweed à 3 positions (gauche → droite) + rotation
            if biome == "desert":
                # Le tumbleweed est plus gros dans le mockup (sprite × 2.5) pour
                # qu'il soit lisible. En jeu il fait 24×24.
                ts = 40  # taille mockup
                # Position progressant de gauche à droite
                bx = 30 + fi * 90
                by = fy + 75
                # Cast shadow
                shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
                shd = ImageDraw.Draw(shadow)
                shd.ellipse((fx + bx - ts // 2 + 2, fy + by - 4,
                             fx + bx + ts // 2 + 4, fy + by + 6),
                            fill=(0, 0, 0, 80))
                shadow = shadow.filter(ImageFilter.GaussianBlur(3))
                img = Image.alpha_composite(img, shadow)
                d = ImageDraw.Draw(img)
                # Tumbleweed rotation simulée : draw at angle
                # Render le sprite et le coller rotated
                tw_sprite = render_tumbleweed_sprite()
                tw_resized = tw_sprite.resize((ts, ts), Image.LANCZOS)
                # Angle qui progresse (suggère le rolling)
                angle = -fi * 130
                tw_rotated = tw_resized.rotate(angle, resample=Image.BICUBIC, expand=False)
                # Centrer
                cx_tw = fx + bx - ts // 2
                cy_tw = fy + by - ts // 2
                img.paste(tw_rotated, (cx_tw, cy_tw), tw_rotated)
                d = ImageDraw.Draw(img)
                # Trail subtil (dust derrière le buisson)
                if fi > 0:
                    for t in range(fi * 3):
                        dx = bx - 20 - t * 4
                        if dx < 4: break
                        dust_alpha = max(0, 80 - t * 12)
                        d.ellipse((fx + dx - 2, fy + by + 5,
                                   fx + dx + 2, fy + by + 9),
                                  fill=(180, 150, 100, dust_alpha))

            # ─── SNOW : particules blanches + drift latéral
            elif biome == "snow":
                # Densité progressant (peu en frame 1, max en frame 2, décroissant en frame 3)
                densities = [20, 50, 35]
                n_part = densities[fi]
                rng = random.Random(100 + fi * 7)
                for _ in range(n_part):
                    px = fx + rng.randint(3, frame_w - 4)
                    py = fy + rng.randint(3, frame_h - 6)
                    r = rng.randint(1, 2)
                    alpha = rng.randint(180, 240)
                    d.ellipse((px - r, py - r, px + r, py + r),
                              fill=(255, 255, 255, alpha))
                # Quelques trainées légères (motion de chute)
                for _ in range(n_part // 3):
                    px = fx + rng.randint(3, frame_w - 4)
                    py = fy + rng.randint(3, frame_h - 6)
                    d.line((px, py, px + rng.uniform(-1, 1), py + 4),
                           fill=(255, 255, 255, 120), width=1)

            # ─── JUNGLE : gouttes diagonales (pluie)
            elif biome == "jungle":
                # Densité comme la neige mais en augmentant constamment
                densities = [25, 55, 75]
                n_part = densities[fi]
                rng = random.Random(200 + fi * 13)
                for _ in range(n_part):
                    px = fx + rng.randint(3, frame_w - 8)
                    py = fy + rng.randint(3, frame_h - 8)
                    length = rng.randint(4, 7)
                    alpha = rng.randint(140, 220)
                    # Gouttes diagonales : direction (-2 vers le bas-gauche
                    # comme la pluie poussée par le vent)
                    d.line((px, py, px - 2, py + length),
                           fill=(180, 220, 245, alpha), width=1)

    return img


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    repo_root = THIS_DIR.parent.parent
    out_dir = repo_root / "08-art-direction" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1) Sprite asset
    sprite = render_tumbleweed_sprite()
    sprite_path = out_dir / "anim-tumbleweed.png"
    sprite.save(sprite_path, format="PNG")
    print(f"  anim-tumbleweed.png       {sprite.size[0]}x{sprite.size[1]}  → {sprite_path.relative_to(repo_root)}")

    # 2) Mockup
    mockup = render_mockup()
    mockup_path = out_dir / "ambient-anims-preview.png"
    mockup.save(mockup_path, format="PNG")
    print(f"  ambient-anims-preview.png {mockup.size[0]}x{mockup.size[1]}  → {mockup_path.relative_to(repo_root)}")


if __name__ == "__main__":
    main()
