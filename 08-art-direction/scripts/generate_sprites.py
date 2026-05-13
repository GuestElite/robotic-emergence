"""Générateur de sprites Émergence V0.

Usage :
    python3 generate_sprites.py            # génère tout
    python3 generate_sprites.py base unit   # filtre par mot-clé

Chaque fonction render_* produit une image RGBA aux dimensions exactes
attendues par le code du jeu et la sauvegarde dans ../sprites/.
"""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from palette import (
    ACCENT, ENEMY, GROUND, METAL, PLAYER, TRANSPARENT,
    antenna, drop_shadow, new_canvas, rivets, rounded_rect_with_shading,
    side_palette, turret, vertical_gradient,
)

SPRITES_DIR = Path(__file__).resolve().parent.parent / "sprites"
SPRITES_DIR.mkdir(parents=True, exist_ok=True)


# ===========================================================================
# 1. BASES — 256x256, gate en bas (player) ou en haut (enemy)
# ===========================================================================

def render_base(side: str) -> Image.Image:
    W = H = 256
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    # Sol intérieur (légèrement plus clair que l'extérieur)
    d.rounded_rectangle((16, 16, W - 16, H - 16), radius=18,
                        fill=GROUND["light"], outline=ACCENT["outline"], width=2)

    # Remparts (anneau métallique)
    wall_w = 22
    for ring_box, fill in [
        ((10, 10, W - 10, H - 10), METAL["dark"]),
        ((10 + wall_w, 10 + wall_w, W - 10 - wall_w, H - 10 - wall_w), GROUND["light"]),
    ]:
        d.rounded_rectangle(ring_box, radius=20, fill=fill,
                            outline=ACCENT["outline"], width=2)

    # Bande lumineuse haut/bas du rempart (relief 3D)
    d.rounded_rectangle((10, 10, W - 10, 30), radius=20, fill=METAL["highlight"])
    d.rounded_rectangle((10, H - 30, W - 10, H - 10), radius=20, fill=METAL["darkest"])

    # Rivets sur le rempart externe
    rivets(d, (16, 16, W - 16, W - 16), METAL["darkest"], spacing=24)

    # Bâtiment central — gros bloc industriel coloré
    core = (66, 66, W - 66, H - 66)
    rounded_rect_with_shading(d, core,
                              color_base=pal["dark"], color_dark=METAL["darkest"],
                              color_light=pal["base"], radius=10,
                              outline=ACCENT["outline"])
    # Détails sur le bloc (panneaux)
    d.rectangle((core[0] + 12, core[1] + 30, core[2] - 12, core[1] + 38),
                fill=METAL["darkest"])
    d.rectangle((core[0] + 12, core[3] - 38, core[2] - 12, core[3] - 30),
                fill=METAL["darkest"])

    # 4 tourelles aux coins du bâtiment central
    for cx, cy in [(82, 82), (W - 82, 82), (82, H - 82), (W - 82, H - 82)]:
        turret(d, cx, cy, 14, pal, "up")

    # Antennes décoratives
    antenna(d, W // 2, core[1] + 8, 22, ACCENT["warning"])
    antenna(d, core[0] + 14, core[1] + 14, 14, pal["glow"])
    antenna(d, core[2] - 14, core[1] + 14, 14, pal["glow"])

    # Porte centrale (gate) — bas pour player, haut pour enemy
    gate_w = 36
    if side == "player":
        # Trouée dans le rempart bas
        d.rectangle((W // 2 - gate_w // 2, H - 32 - 1, W // 2 + gate_w // 2, H - 8),
                    fill=TRANSPARENT)
        # Encadrement métallique de la porte
        d.rectangle((W // 2 - gate_w // 2 - 3, H - 32, W // 2 - gate_w // 2, H - 10),
                    fill=METAL["darkest"])
        d.rectangle((W // 2 + gate_w // 2, H - 32, W // 2 + gate_w // 2 + 3, H - 10),
                    fill=METAL["darkest"])
        # Bande de chemin claire visible sous la porte
        d.rectangle((W // 2 - gate_w // 2 + 2, H - 30, W // 2 + gate_w // 2 - 2, H - 12),
                    fill=GROUND["dark"])
    else:
        d.rectangle((W // 2 - gate_w // 2, 8, W // 2 + gate_w // 2, 32 + 1),
                    fill=TRANSPARENT)
        d.rectangle((W // 2 - gate_w // 2 - 3, 10, W // 2 - gate_w // 2, 32),
                    fill=METAL["darkest"])
        d.rectangle((W // 2 + gate_w // 2, 10, W // 2 + gate_w // 2 + 3, 32),
                    fill=METAL["darkest"])
        d.rectangle((W // 2 - gate_w // 2 + 2, 12, W // 2 + gate_w // 2 - 2, 30),
                    fill=GROUND["dark"])

    return drop_shadow(img, offset=(2, 4), blur=4, opacity=110)


# ===========================================================================
# 2. FACTORY LIGHT — 128x128, 1 porte
# ===========================================================================

def render_factory_light(side: str) -> Image.Image:
    W = H = 128
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    # Plateforme au sol (ombre/marquage)
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=10,
                        fill=METAL["darkest"], outline=ACCENT["outline"], width=1)

    # Corps principal (compact, carré)
    body = (12, 14, W - 12, H - 12)
    rounded_rect_with_shading(d, body,
                              color_base=pal["base"], color_dark=METAL["darkest"],
                              color_light=pal["light"], radius=6,
                              outline=ACCENT["outline"])

    # Bandes diagonales jaunes/danger (signature "light" = rapide)
    for off in range(-W, W, 14):
        d.polygon([(body[0] + off, body[1]), (body[0] + off + 6, body[1]),
                   (body[0] + off + 22, body[1] + 8), (body[0] + off + 16, body[1] + 8)],
                  fill=METAL["darkest"])

    # Mini tourelle centrale
    turret(d, W // 2, H // 2 - 4, 10, pal, "up")

    # Antennes (2 — signature "agile")
    antenna(d, body[0] + 8, body[1] + 4, 10, pal["glow"])
    antenna(d, body[2] - 8, body[1] + 4, 10, pal["glow"])

    # Porte de sortie (bas pour player, haut pour enemy)
    gate_w = 22
    if side == "player":
        d.rectangle((W // 2 - gate_w // 2, H - 14, W // 2 + gate_w // 2, H - 6),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((W // 2 - gate_w // 2 + 3, H - 12, W // 2 + gate_w // 2 - 3, H - 8),
                    fill=pal["glow"])
    else:
        d.rectangle((W // 2 - gate_w // 2, 6, W // 2 + gate_w // 2, 14),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((W // 2 - gate_w // 2 + 3, 8, W // 2 + gate_w // 2 - 3, 12),
                    fill=pal["glow"])

    return drop_shadow(img, offset=(1, 2), blur=3, opacity=90)


# ===========================================================================
# 3. FACTORY HEAVY — 128x128, 3 portes (G/D + bas ou haut)
# ===========================================================================

def render_factory_heavy(side: str) -> Image.Image:
    W = H = 128
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    # Plateforme
    d.rounded_rectangle((4, 6, W - 4, H - 4), radius=12,
                        fill=METAL["darkest"], outline=ACCENT["outline"], width=1)

    # Corps massif — plus large et plus carré
    body = (10, 12, W - 10, H - 10)
    rounded_rect_with_shading(d, body,
                              color_base=pal["dark"], color_dark=METAL["darkest"],
                              color_light=pal["base"], radius=4,
                              outline=ACCENT["outline"])
    rivets(d, body, METAL["darkest"], spacing=18)

    # 2 grosses cheminées (smokestacks) → signature "heavy"
    for cx in (W // 2 - 18, W // 2 + 18):
        d.ellipse((cx - 8, H // 2 - 22, cx + 8, H // 2 - 6),
                  fill=METAL["dark"], outline=ACCENT["outline"])
        d.ellipse((cx - 6, H // 2 - 20, cx + 6, H // 2 - 8),
                  fill=METAL["darkest"])
        # fumée stylisée (petit disque clair)
        d.ellipse((cx - 4, H // 2 - 26, cx + 4, H // 2 - 18),
                  fill=ACCENT["white"])

    # Gros canon central
    turret(d, W // 2, H // 2 + 12, 14, pal, "up")

    # Portes : gauche, droite, + bas (player) ou haut (enemy)
    gate_w = 18
    # Gauche
    d.rectangle((4, H // 2 - gate_w // 2, 14, H // 2 + gate_w // 2),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((6, H // 2 - gate_w // 2 + 3, 12, H // 2 + gate_w // 2 - 3),
                fill=pal["glow"])
    # Droite
    d.rectangle((W - 14, H // 2 - gate_w // 2, W - 4, H // 2 + gate_w // 2),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((W - 12, H // 2 - gate_w // 2 + 3, W - 6, H // 2 + gate_w // 2 - 3),
                fill=pal["glow"])
    # Bas ou haut
    if side == "player":
        d.rectangle((W // 2 - gate_w // 2, H - 14, W // 2 + gate_w // 2, H - 4),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((W // 2 - gate_w // 2 + 3, H - 12, W // 2 + gate_w // 2 - 3, H - 6),
                    fill=pal["glow"])
    else:
        d.rectangle((W // 2 - gate_w // 2, 4, W // 2 + gate_w // 2, 14),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((W // 2 - gate_w // 2 + 3, 6, W // 2 + gate_w // 2 - 3, 12),
                    fill=pal["glow"])

    return drop_shadow(img, offset=(2, 3), blur=4, opacity=100)


# ===========================================================================
# 4. UNIT LIGHT — 48x48, robot bipède agile
# ===========================================================================

def render_unit_light(side: str) -> Image.Image:
    W = H = 48
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    cx, cy = W // 2, H // 2

    # Jambes / pieds (deux taches sombres)
    d.ellipse((cx - 14, cy + 8, cx - 4, cy + 18), fill=METAL["darkest"])
    d.ellipse((cx + 4, cy + 8, cx + 14, cy + 18), fill=METAL["darkest"])

    # Torse (losange/octogone coloré)
    d.polygon([(cx - 12, cy - 4), (cx - 6, cy - 14), (cx + 6, cy - 14),
               (cx + 12, cy - 4), (cx + 10, cy + 8), (cx - 10, cy + 8)],
              fill=pal["base"], outline=ACCENT["outline"])
    # Reflet épaule
    d.polygon([(cx - 10, cy - 4), (cx - 6, cy - 12), (cx, cy - 12), (cx - 4, cy - 4)],
              fill=pal["light"])

    # Tête (petit dôme)
    d.ellipse((cx - 5, cy - 18, cx + 5, cy - 8), fill=pal["dark"],
              outline=ACCENT["outline"])
    d.ellipse((cx - 2, cy - 16, cx + 2, cy - 12), fill=pal["glow"])

    # Arme laser (petit canon devant)
    d.rectangle((cx + 6, cy - 6, cx + 16, cy - 2),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((cx + 14, cy - 5, cx + 16, cy - 3), fill=ACCENT["warning"])

    return drop_shadow(img, offset=(1, 2), blur=2, opacity=110)


# ===========================================================================
# 5. UNIT HEAVY — 64x64, tank chenillé
# ===========================================================================

def render_unit_heavy(side: str) -> Image.Image:
    W = H = 64
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    cx, cy = W // 2, H // 2

    # Chenilles (G/D)
    for x_off in (-22, 14):
        d.rounded_rectangle((cx + x_off, cy - 22, cx + x_off + 8, cy + 22),
                            radius=2, fill=METAL["darkest"],
                            outline=ACCENT["outline"])
        # Crans
        for y in range(cy - 20, cy + 21, 4):
            d.line((cx + x_off + 1, y, cx + x_off + 7, y), fill=METAL["light"], width=1)

    # Châssis (large rectangle blindé)
    body = (cx - 14, cy - 16, cx + 14, cy + 16)
    rounded_rect_with_shading(d, body,
                              color_base=pal["base"], color_dark=METAL["darkest"],
                              color_light=pal["light"], radius=3,
                              outline=ACCENT["outline"])

    # Tourelle centrale grosse
    turret(d, cx, cy, 9, pal, "up")

    # Reflet + voyant arrière
    d.rectangle((cx - 4, cy + 12, cx + 4, cy + 14), fill=ACCENT["warning"])

    return drop_shadow(img, offset=(2, 2), blur=2, opacity=120)


# ===========================================================================
# 6. TILE GROUND — 128x128, sable craquelé tileable
# ===========================================================================

def render_tile_ground() -> Image.Image:
    W = H = 128
    img, d = new_canvas(W, H)

    # Fond gradient subtil
    grad = vertical_gradient(W, H, GROUND["base"], GROUND["dark"])
    img.paste(grad, (0, 0))
    d = ImageDraw.Draw(img, "RGBA")

    rng = random.Random(42)  # seed stable → tile reproductible

    # Petits cailloux clairs et sombres
    for _ in range(80):
        x = rng.randint(0, W - 1)
        y = rng.randint(0, H - 1)
        r = rng.randint(1, 3)
        c = GROUND["light"] if rng.random() > 0.4 else GROUND["darkest"]
        d.ellipse((x - r, y - r, x + r, y + r), fill=c)

    # Quelques fissures (lignes brisées)
    for _ in range(4):
        x, y = rng.randint(10, W - 10), rng.randint(10, H - 10)
        for _ in range(rng.randint(3, 6)):
            nx = x + rng.randint(-12, 12)
            ny = y + rng.randint(-12, 12)
            d.line((x, y, nx, ny), fill=GROUND["crack"], width=1)
            x, y = nx, ny

    # Tileable seam fix : effet de bord doux en mirroir
    # (les seams sont déjà OK car on n'a pas dessiné de gros élément sur le bord)
    return img


# ===========================================================================
# 7. TILE WALL — 64x64, mur métallique tileable
# ===========================================================================

def render_tile_wall() -> Image.Image:
    W = H = 64
    img, d = new_canvas(W, H)

    # Base métallique
    d.rectangle((0, 0, W, H), fill=METAL["base"])

    # Bandeau clair haut + sombre bas (relief)
    d.rectangle((0, 0, W, 8), fill=METAL["highlight"])
    d.rectangle((0, H - 10, W, H), fill=METAL["darkest"])

    # Lignes verticales (plaques boulonnées)
    for x in range(16, W, 16):
        d.line((x, 0, x, H), fill=METAL["darkest"], width=1)

    # Boulons
    for x in range(8, W, 16):
        d.ellipse((x - 2, 12, x + 2, 16), fill=METAL["darkest"])
        d.ellipse((x - 2, H - 18, x + 2, H - 14), fill=METAL["darkest"])

    return img


# ===========================================================================
# 8. EFFECT EXPLOSION — 64x64
# ===========================================================================

def render_effect_explosion() -> Image.Image:
    W = H = 64
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2

    # Anneaux concentriques (extérieur sombre → intérieur lumineux)
    for r, c in [(28, ENEMY["dark"]),
                 (22, ENEMY["base"]),
                 (16, ENEMY["light"]),
                 (10, ACCENT["warning"]),
                 (5, ACCENT["white"])]:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c)

    # Étincelles (8 rayons)
    for i in range(8):
        a = i * math.pi / 4
        x1 = cx + math.cos(a) * 12
        y1 = cy + math.sin(a) * 12
        x2 = cx + math.cos(a) * 28
        y2 = cy + math.sin(a) * 28
        d.line((x1, y1, x2, y2), fill=ENEMY["light"], width=2)

    # Léger flou pour adoucir
    img = img.filter(ImageFilter.GaussianBlur(0.8))
    return img


# ===========================================================================
# 9. EFFECT LASER — 32x32
# ===========================================================================

def render_effect_laser() -> Image.Image:
    W = H = 32
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2

    # Trait laser vertical
    d.rectangle((cx - 1, 4, cx + 1, H - 4), fill=ACCENT["white"])
    d.rectangle((cx - 3, 6, cx + 3, H - 6), fill=PLAYER["glow"])
    # Halo
    halo = Image.new("RGBA", (W, H), TRANSPARENT)
    hd = ImageDraw.Draw(halo, "RGBA")
    hd.ellipse((cx - 6, cy - 12, cx + 6, cy + 12), fill=(125, 211, 252, 110))
    halo = halo.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(halo, img)
    return img


# ===========================================================================
# MAIN
# ===========================================================================

SPRITES = [
    # (filename, render_fn, args)
    ("tile-ground.png",          render_tile_ground,    ()),
    ("base-player.png",          render_base,           ("player",)),
    ("base-enemy.png",           render_base,           ("enemy",)),
    ("factory-light-player.png", render_factory_light,  ("player",)),
    ("factory-light-enemy.png",  render_factory_light,  ("enemy",)),
    ("factory-heavy-player.png", render_factory_heavy,  ("player",)),
    ("factory-heavy-enemy.png",  render_factory_heavy,  ("enemy",)),
    ("unit-light-player.png",    render_unit_light,     ("player",)),
    ("unit-light-enemy.png",     render_unit_light,     ("enemy",)),
    ("unit-heavy-player.png",    render_unit_heavy,     ("player",)),
    ("unit-heavy-enemy.png",     render_unit_heavy,     ("enemy",)),
    ("tile-wall.png",            render_tile_wall,      ()),
    ("effect-explosion.png",     render_effect_explosion, ()),
    ("effect-laser.png",         render_effect_laser,   ()),
]


def main():
    filters = [a.lower() for a in sys.argv[1:]]
    n = 0
    for name, fn, args in SPRITES:
        if filters and not any(f in name for f in filters):
            continue
        img = fn(*args)
        out = SPRITES_DIR / name
        img.save(out, format="PNG")
        print(f"  {name:30s} {img.size[0]:>4}x{img.size[1]:<4}  → {out.relative_to(SPRITES_DIR.parent.parent)}")
        n += 1
    print(f"\n{n} sprite(s) générés dans {SPRITES_DIR}")


if __name__ == "__main__":
    main()
