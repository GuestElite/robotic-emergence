"""Génère des PNG de PREVIEW pour :
- factory-swarmer (player + enemy) — silhouette hexagonale type ruche
- factory-sniper  (player + enemy) — tour-bunker avec scope et canon
- tile-ground-v2                    — sol détaillé (plaques tech, débris, circuits)

Sortie : 08-art-direction/preview/  (volontairement séparé de sprites/
afin que le user valide les designs avant intégration dans le jeu).

Lancer depuis la racine du repo :
    python3 08-art-direction/scripts/preview_factories_and_ground.py
"""

import math
import random
import sys
from pathlib import Path
from PIL import ImageDraw

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from palette import (
    new_canvas, side_palette, drop_shadow, vertical_gradient,
    rounded_rect_with_shading, rivets, turret, antenna,
    METAL, ACCENT, GROUND,
)


# ---------------------------------------------------------------------------
# Helpers locaux
# ---------------------------------------------------------------------------

def hex_points(cx: int, cy: int, r: int, rotate_deg: float = 0):
    """Points d'un hexagone régulier centré sur (cx, cy)."""
    pts = []
    for i in range(6):
        ang = math.radians(60 * i + rotate_deg)
        pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    return pts


def gate(d, side: str, W: int, H: int, gate_w: int = 20):
    """Porte de sortie : bas pour player, haut pour enemy (vers la base adverse)."""
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


# ---------------------------------------------------------------------------
# FACTORY SWARMER — 128x128, ruche hexagonale
# ---------------------------------------------------------------------------

def render_factory_swarmer(side: str):
    W = H = 128
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    cx, cy = W // 2, H // 2

    # Plateforme hexagonale au sol (rotation pour "flat-top")
    plat_pts = hex_points(cx, cy, 58, rotate_deg=30)
    d.polygon(plat_pts, fill=METAL["darkest"], outline=ACCENT["outline"])

    # Corps hexagonal coloré (légèrement plus petit)
    body_pts = hex_points(cx, cy, 50, rotate_deg=30)
    d.polygon(body_pts, fill=pal["base"], outline=ACCENT["outline"])

    # Reflet supérieur (moitié haute plus claire) — trapèze
    d.polygon([
        (cx - 42, cy - 4),
        (cx - 22, cy - 42),
        (cx + 22, cy - 42),
        (cx + 42, cy - 4),
    ], fill=pal["light"])

    # 6 mini-pattes radiales autour (insectoïdes — rappel du Swarmer unit)
    for i in range(6):
        ang = math.radians(60 * i + 30)
        x1 = cx + math.cos(ang) * 48
        y1 = cy + math.sin(ang) * 48
        x2 = cx + math.cos(ang) * 60
        y2 = cy + math.sin(ang) * 60
        d.line((x1, y1, x2, y2), fill=METAL["darkest"], width=3)
        d.ellipse((x2 - 2, y2 - 2, x2 + 2, y2 + 2), fill=METAL["light"])

    # 4 alvéoles hexagonales (cellules d'incubation des swarmers)
    alveoles = [
        (cx - 22, cy - 12),
        (cx + 22, cy - 12),
        (cx - 22, cy + 18),
        (cx + 22, cy + 18),
    ]
    for ax, ay in alveoles:
        # Cellule sombre creusée
        a_pts = hex_points(ax, ay, 11, rotate_deg=30)
        d.polygon(a_pts, fill=METAL["darkest"], outline=ACCENT["outline"])
        # Œuf / glow à l'intérieur
        d.ellipse((ax - 5, ay - 5, ax + 5, ay + 5),
                  fill=pal["glow"], outline=ACCENT["outline"])
        # Reflet sur l'œuf
        d.ellipse((ax - 3, ay - 4, ax - 1, ay - 2), fill=ACCENT["white"])

    # Cœur central (petite tourelle / réacteur)
    d.ellipse((cx - 8, cy - 8, cx + 8, cy + 8),
              fill=METAL["dark"], outline=ACCENT["outline"])
    d.ellipse((cx - 5, cy - 5, cx + 5, cy + 5),
              fill=pal["dark"], outline=ACCENT["outline"])
    d.ellipse((cx - 3, cy - 3, cx + 1, cy + 1), fill=pal["glow"])

    # 2 antennes-warning aux pointes
    antenna(d, int(plat_pts[1][0]), int(plat_pts[1][1]) + 4, 6, ACCENT["warning"])
    antenna(d, int(plat_pts[2][0]), int(plat_pts[2][1]) + 4, 6, ACCENT["warning"])

    # Porte de sortie (large car gros débit d'unités)
    gate(d, side, W, H, gate_w=24)

    return drop_shadow(img, offset=(2, 3), blur=3, opacity=100)


# ---------------------------------------------------------------------------
# FACTORY SNIPER — 128x128, tour-bunker d'artillerie
# ---------------------------------------------------------------------------

def render_factory_sniper(side: str):
    W = H = 128
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    # Plateforme au sol
    d.rounded_rectangle((8, 18, W - 8, H - 6), radius=8,
                        fill=METAL["darkest"], outline=ACCENT["outline"], width=1)

    # Socle large blindé (bas)
    base_box = (16, 64, W - 16, H - 14)
    rounded_rect_with_shading(
        d, base_box,
        color_base=pal["dark"], color_dark=METAL["darkest"],
        color_light=pal["base"], radius=4, outline=ACCENT["outline"],
    )
    rivets(d, base_box, METAL["darkest"], spacing=16)

    # Créneaux / sacs de sable sur le toit du socle
    for x in range(20, W - 24, 12):
        d.ellipse((x, 56, x + 10, 68),
                  fill=GROUND["dark"], outline=ACCENT["outline"])
        # bande sombre
        d.line((x + 2, 62, x + 8, 62), fill=GROUND["darkest"])

    # Tour verticale étroite (plus haute que large)
    tower_box = (W // 2 - 22, 26, W // 2 + 22, 62)
    rounded_rect_with_shading(
        d, tower_box,
        color_base=pal["base"], color_dark=METAL["darkest"],
        color_light=pal["light"], radius=3, outline=ACCENT["outline"],
    )

    # Supports d'angle camembrure (renforts métalliques)
    d.polygon([(W // 2 - 30, 62), (W // 2 - 18, 62), (W // 2 - 22, 72)],
              fill=METAL["darkest"], outline=ACCENT["outline"])
    d.polygon([(W // 2 + 18, 62), (W // 2 + 30, 62), (W // 2 + 22, 72)],
              fill=METAL["darkest"], outline=ACCENT["outline"])

    # Scope/lunette géant au sommet (signature)
    sx, sy = W // 2, 22
    # Anneau extérieur métallique
    d.ellipse((sx - 14, sy - 12, sx + 14, sy + 16),
              fill=METAL["base"], outline=ACCENT["outline"])
    # Cercle interne sombre (la "lentille")
    d.ellipse((sx - 10, sy - 8, sx + 10, sy + 12),
              fill=METAL["darkest"])
    # Œil warning de scope
    d.ellipse((sx - 7, sy - 5, sx + 7, sy + 9),
              fill=ACCENT["warning"])
    # Reflet (point blanc)
    d.ellipse((sx - 3, sy - 2, sx + 1, sy + 2), fill=ACCENT["white"])
    # Mire en croix (subtile)
    d.line((sx - 6, sy + 2, sx + 6, sy + 2), fill=METAL["darkest"], width=1)
    d.line((sx, sy - 4, sx, sy + 8), fill=METAL["darkest"], width=1)

    # LONG canon latéral (côté player → tire vers la droite, côté enemy → gauche)
    barrel_y0, barrel_y1 = 42, 52
    if side == "player":
        bx0, bx1 = W // 2 + 22, W - 8
    else:
        bx0, bx1 = 8, W // 2 - 22
    d.rectangle((bx0, barrel_y0, bx1, barrel_y1),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    # Reflet haut du canon
    d.line((bx0 + 1, barrel_y0 + 1, bx1 - 1, barrel_y0 + 1),
           fill=METAL["light"])
    # Stabilisateur entre tour et canon
    if side == "player":
        d.rectangle((W // 2 + 16, barrel_y0 - 2, W // 2 + 24, barrel_y1 + 2),
                    fill=METAL["dark"], outline=ACCENT["outline"])
    else:
        d.rectangle((W // 2 - 24, barrel_y0 - 2, W // 2 - 16, barrel_y1 + 2),
                    fill=METAL["dark"], outline=ACCENT["outline"])
    # Bouche du canon (muzzle warning)
    if side == "player":
        d.rectangle((bx1 - 4, barrel_y0, bx1, barrel_y1), fill=ACCENT["warning"])
    else:
        d.rectangle((bx0, barrel_y0, bx0 + 4, barrel_y1), fill=ACCENT["warning"])

    # 2 mini-antennes radio sur la tour
    antenna(d, W // 2 - 16, 28, 8, pal["glow"])
    antenna(d, W // 2 + 16, 28, 8, pal["glow"])

    # Porte de sortie (étroite — débit lent)
    gate(d, side, W, H, gate_w=16)

    return drop_shadow(img, offset=(2, 3), blur=4, opacity=110)


# ---------------------------------------------------------------------------
# TILE GROUND v2 — 128x128, sol détaillé tileable
# ---------------------------------------------------------------------------

def render_tile_ground_v2():
    W = H = 128
    img, d = new_canvas(W, H)

    # Base gradient sable
    grad = vertical_gradient(W, H, GROUND["base"], GROUND["dark"])
    img.paste(grad, (0, 0))
    d = ImageDraw.Draw(img, "RGBA")

    rng = random.Random(42)  # seed stable → tile reproductible

    # Damier de fond très subtil (8% d'opacité)
    cell = 32
    light_subtle = (GROUND["light"][0], GROUND["light"][1], GROUND["light"][2], 20)
    for y0 in range(0, H, cell):
        for x0 in range(0, W, cell):
            if (x0 // cell + y0 // cell) % 2 == 0:
                d.rectangle((x0, y0, x0 + cell, y0 + cell), fill=light_subtle)

    # 3 plaques métalliques tech encastrées (toutes bien à l'intérieur pour tileabilité)
    plates = [
        (18, 24, 38, 44),
        (76, 50, 96, 70),
        (40, 90, 62, 108),
    ]
    for px0, py0, px1, py1 in plates:
        d.rounded_rectangle((px0, py0, px1, py1), radius=2,
                            fill=METAL["dark"], outline=METAL["darkest"], width=1)
        # Bande claire haut (relief)
        d.line((px0 + 1, py0 + 1, px1 - 1, py0 + 1), fill=METAL["light"])
        # 4 rivets aux coins
        for rx, ry in [(px0 + 2, py0 + 2), (px1 - 2, py0 + 2),
                       (px0 + 2, py1 - 2), (px1 - 2, py1 - 2)]:
            d.ellipse((rx - 1, ry - 1, rx + 1, ry + 1), fill=METAL["darkest"])

    # Cailloux variés (120, vs 80 dans la v1)
    for _ in range(120):
        x = rng.randint(0, W - 1)
        y = rng.randint(0, H - 1)
        r = rng.randint(1, 3)
        c_pick = rng.random()
        if c_pick < 0.35:
            c = GROUND["light"]
        elif c_pick < 0.70:
            c = GROUND["darkest"]
        elif c_pick < 0.85:
            c = METAL["dark"]
        else:
            c = GROUND["dark"]
        d.ellipse((x - r, y - r, x + r, y + r), fill=c)

    # Débris métalliques (8 — bien à l'intérieur)
    for _ in range(8):
        x = rng.randint(12, W - 12)
        y = rng.randint(12, H - 12)
        kind = rng.randint(0, 2)
        if kind == 0:
            # Boulon (croix)
            d.rectangle((x - 2, y - 1, x + 2, y + 1), fill=METAL["darkest"])
            d.rectangle((x - 1, y - 2, x + 1, y + 2), fill=METAL["darkest"])
        elif kind == 1:
            # Fragment de câble
            d.line((x - 3, y, x + 3, y + 1), fill=METAL["darkest"], width=1)
            d.line((x + 1, y + 1, x + 3, y - 1), fill=METAL["dark"], width=1)
        else:
            # Tache d'huile
            d.ellipse((x - 4, y - 2, x + 4, y + 2), fill=(20, 15, 8, 90))

    # Veines de circuits subtiles (2 — angles à 90°, restent à l'intérieur)
    crack_with_alpha = (GROUND["crack"][0], GROUND["crack"][1],
                       GROUND["crack"][2], 140)
    for _ in range(2):
        x = rng.randint(22, W - 40)
        y = rng.randint(22, H - 30)
        seg_len = rng.randint(15, 28)
        d.line((x, y, x + seg_len, y), fill=crack_with_alpha, width=1)
        d.line((x + seg_len, y, x + seg_len, y + seg_len // 2),
               fill=crack_with_alpha, width=1)
        # Petit nœud lumineux à l'extrémité
        ex, ey = x + seg_len, y + seg_len // 2
        d.ellipse((ex - 2, ey - 2, ex + 2, ey + 2),
                  fill=(GROUND["dark"][0], GROUND["dark"][1],
                        GROUND["dark"][2], 200))

    # Fissures (5 — un peu plus longues que la v1)
    for _ in range(5):
        x, y = rng.randint(15, W - 15), rng.randint(15, H - 15)
        for _ in range(rng.randint(4, 7)):
            nx = x + rng.randint(-14, 14)
            ny = y + rng.randint(-14, 14)
            # Clamp pour ne pas franchir les bords (tileabilité)
            nx = max(2, min(W - 2, nx))
            ny = max(2, min(H - 2, ny))
            d.line((x, y, nx, ny), fill=GROUND["crack"], width=1)
            x, y = nx, ny

    return img


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    repo_root = THIS_DIR.parent.parent
    out_dir = repo_root / "08-art-direction" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)

    to_render = [
        ("factory-swarmer-player.png", lambda: render_factory_swarmer("player")),
        ("factory-swarmer-enemy.png",  lambda: render_factory_swarmer("enemy")),
        ("factory-sniper-player.png",  lambda: render_factory_sniper("player")),
        ("factory-sniper-enemy.png",   lambda: render_factory_sniper("enemy")),
        ("tile-ground-v2.png",         lambda: render_tile_ground_v2()),
    ]

    for name, fn in to_render:
        img = fn()
        out = out_dir / name
        img.save(out, format="PNG")
        print(f"  {name:30s} {img.size[0]:>4}x{img.size[1]:<4}  → {out.relative_to(repo_root)}")

    print(f"\n{len(to_render)} preview(s) générée(s) dans {out_dir.relative_to(repo_root)}/")
    print("→ Validez les designs avant de copier vers 08-art-direction/sprites/")


if __name__ == "__main__":
    main()
