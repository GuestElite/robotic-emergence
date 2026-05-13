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
# 5b. FACTORY AIR — 128x128, hangar industriel à toit ouvert
# ===========================================================================
# Signature : toit en V ouvert au centre, révélant une rampe de lancement et
# un mini drone delta posé dessus. Orientation explicite par côté :
#   - player : toit ouvert vers le HAUT (drone décolle vers la base ennemie)
#   - enemy  : toit ouvert vers le BAS  (drone décolle vers la base joueur)

def render_factory_air(side: str) -> Image.Image:
    W = H = 128
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    # Plateforme/socle au sol (symétrique → pas affectée par le flip vertical)
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=10,
                        fill=METAL["darkest"], outline=ACCENT["outline"], width=1)

    # Tout le reste est dessiné en orientation "player" puis flippé pour enemy.
    sub_img, sd = new_canvas(W, H)

    # === Corps principal du hangar (couvre tout le sprite) ===
    body = (12, 14, W - 12, H - 12)
    rounded_rect_with_shading(sd, body,
                              color_base=pal["base"], color_dark=METAL["darkest"],
                              color_light=pal["light"], radius=6,
                              outline=ACCENT["outline"])
    rivets(sd, body, METAL["darkest"], spacing=18)

    # === Ouverture centrale (intérieur sombre du hangar, toit ouvert) ===
    opening = (32, 20, W - 32, 70)
    sd.rectangle(opening, fill=METAL["darkest"])
    # Petit liseré sombre supérieur pour donner de la profondeur
    sd.rectangle((opening[0], opening[1], opening[2], opening[1] + 2),
                 fill=ACCENT["outline"])

    # === 2 toits ouverts (trapèzes inclinés vers l'extérieur — comme des portes pliantes) ===
    # Trapèze gauche
    left_roof = [
        (32, 20),     # charnière haut intérieure
        (32, 70),     # charnière bas intérieure
        (14, 60),     # appui externe bas
        (14, 28),     # appui externe haut
    ]
    sd.polygon(left_roof, fill=METAL["dark"], outline=ACCENT["outline"])
    sd.line((14, 28, 32, 20), fill=METAL["highlight"], width=1)
    sd.ellipse((12, 32, 16, 36), fill=METAL["light"], outline=ACCENT["outline"])
    sd.ellipse((12, 56, 16, 60), fill=METAL["light"], outline=ACCENT["outline"])

    # Trapèze droit (miroir)
    right_roof = [
        (W - 32, 20),
        (W - 32, 70),
        (W - 14, 60),
        (W - 14, 28),
    ]
    sd.polygon(right_roof, fill=METAL["dark"], outline=ACCENT["outline"])
    sd.line((W - 14, 28, W - 32, 20), fill=METAL["highlight"], width=1)
    sd.ellipse((W - 16, 32, W - 12, 36), fill=METAL["light"], outline=ACCENT["outline"])
    sd.ellipse((W - 16, 56, W - 12, 60), fill=METAL["light"], outline=ACCENT["outline"])

    # === Rampe de lancement colorée (trapèze qui pointe vers le haut) ===
    ramp = [
        (38, 68),
        (W - 38, 68),
        (W - 50, 24),
        (50, 24),
    ]
    sd.polygon(ramp, fill=pal["dark"], outline=ACCENT["outline"])
    # Rayures glow de guidage (suggèrent le mouvement vers le haut)
    for y_off, x_shrink in ((32, 1), (42, 3), (52, 5), (62, 7)):
        sd.line((50 + x_shrink, y_off, W - 50 - x_shrink, y_off),
                fill=pal["glow"], width=1)

    # === Mini drone delta posé sur la rampe (pointe vers le haut) ===
    cx_d = W // 2
    cy_d = 44
    # Aile delta principale
    sd.polygon([(cx_d, cy_d - 14), (cx_d - 14, cy_d + 10), (cx_d + 14, cy_d + 10)],
               fill=pal["light"], outline=ACCENT["outline"])
    # Fuselage central
    sd.polygon([(cx_d, cy_d - 12), (cx_d - 4, cy_d + 10), (cx_d + 4, cy_d + 10)],
               fill=pal["base"])
    # Cockpit (glow)
    sd.ellipse((cx_d - 3, cy_d - 5, cx_d + 3, cy_d + 1), fill=pal["glow"])
    sd.ellipse((cx_d - 1, cy_d - 4, cx_d + 1, cy_d - 2), fill=ACCENT["white"])
    # Missiles sous les ailes
    sd.rectangle((cx_d - 10, cy_d, cx_d - 7, cy_d + 7), fill=METAL["darkest"])
    sd.rectangle((cx_d + 7, cy_d, cx_d + 10, cy_d + 7), fill=METAL["darkest"])
    sd.rectangle((cx_d - 10, cy_d, cx_d - 7, cy_d + 2), fill=ACCENT["warning"])
    sd.rectangle((cx_d + 7, cy_d, cx_d + 10, cy_d + 2), fill=ACCENT["warning"])

    # === Marqueur "H" façon héliport (lisibilité immédiate du rôle aérien) ===
    cx_h = W // 2
    cy_h = 96
    sd.rectangle((cx_h - 14, cy_h - 9, cx_h + 14, cy_h + 9),
                 fill=pal["dark"], outline=ACCENT["outline"])
    # Lettre H stylisée (2 barres verticales + 1 horizontale)
    sd.rectangle((cx_h - 10, cy_h - 6, cx_h - 6, cy_h + 6), fill=pal["glow"])
    sd.rectangle((cx_h + 6, cy_h - 6, cx_h + 10, cy_h + 6), fill=pal["glow"])
    sd.rectangle((cx_h - 10, cy_h - 2, cx_h + 10, cy_h + 2), fill=pal["glow"])

    # === Antennes / tour de contrôle (coins du corps, sous l'ouverture) ===
    antenna(sd, 22, 80, 14, pal["glow"])
    antenna(sd, W - 22, 80, 14, pal["glow"])

    # === Lumières de balisage clignotantes (4 voyants jaunes) ===
    for cx, cy in [(20, 90), (W - 20, 90), (34, 16), (W - 34, 16)]:
        sd.ellipse((cx - 2, cy - 2, cx + 2, cy + 2),
                   fill=ACCENT["warning"], outline=ACCENT["outline"])

    # === Porte arrière de service (sortie standard pour le routing du jeu) ===
    gate_w = 22
    sd.rectangle((W // 2 - gate_w // 2, H - 14, W // 2 + gate_w // 2, H - 6),
                 fill=METAL["darkest"], outline=ACCENT["outline"])
    sd.rectangle((W // 2 - gate_w // 2 + 3, H - 12, W // 2 + gate_w // 2 - 3, H - 8),
                 fill=pal["glow"])

    # === Flip vertical pour enemy (toit ouvert pointe vers le sud) ===
    if side == "enemy":
        sub_img = sub_img.transpose(Image.FLIP_TOP_BOTTOM)
    img = Image.alpha_composite(img, sub_img)
    return drop_shadow(img, offset=(2, 3), blur=4, opacity=110)


# ===========================================================================
# 5c. UNIT AIR — 48x48, chasseur delta stylisé top-down
# ===========================================================================
# Orientation : pointe vers la DROITE (+X). Le code de game.js flippe
# horizontalement pour les enemy. On dessine donc toujours côté player.

def render_unit_air(side: str) -> Image.Image:
    W = H = 48
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    cx, cy = W // 2, H // 2

    # === Ombre projetée au sol (décalée en bas-droite, plate, floue) ===
    # Donne l'illusion que le chasseur survole le sol.
    shadow_layer = Image.new("RGBA", (W, H), TRANSPARENT)
    sd_shadow = ImageDraw.Draw(shadow_layer, "RGBA")
    sd_shadow.polygon(
        [(cx + 22, cy + 5), (cx - 14, cy + 14), (cx - 14, cy - 4)],
        fill=(0, 0, 0, 90),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, shadow_layer)
    d = ImageDraw.Draw(img, "RGBA")

    # === Aile delta (triangle large, pointe vers la droite, swept-back) ===
    wing = [
        (cx + 20, cy),           # pointe avant
        (cx - 16, cy - 14),      # arrière-gauche-haut
        (cx - 8, cy),            # creux arrière central
        (cx - 16, cy + 14),      # arrière-gauche-bas
    ]
    d.polygon(wing, fill=pal["base"], outline=ACCENT["outline"])

    # === Highlight sur le bord d'attaque supérieur (suggère l'éclairage) ===
    d.line((cx + 20, cy, cx - 16, cy - 14), fill=pal["light"], width=1)

    # === Fuselage central (rectangle effilé sur l'axe) ===
    d.polygon(
        [(cx + 18, cy - 1), (cx + 18, cy + 1),
         (cx - 12, cy + 4), (cx - 12, cy - 4)],
        fill=pal["dark"], outline=ACCENT["outline"],
    )

    # === Cockpit / canopée (ovale glow vers l'avant du fuselage) ===
    d.ellipse((cx + 4, cy - 3, cx + 14, cy + 3),
              fill=pal["glow"], outline=ACCENT["outline"])
    # Reflet sur la canopée
    d.ellipse((cx + 6, cy - 2, cx + 9, cy), fill=ACCENT["white"])

    # === Missiles sous les ailes (2 rectangles fins métal) ===
    d.rectangle((cx - 4, cy - 10, cx + 8, cy - 8),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((cx + 6, cy - 10, cx + 8, cy - 8), fill=ACCENT["warning"])
    d.rectangle((cx - 4, cy + 8, cx + 8, cy + 10),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    d.rectangle((cx + 6, cy + 8, cx + 8, cy + 10), fill=ACCENT["warning"])

    # === Réacteurs arrière (2 cylindres + flamme glow) ===
    # Réacteur supérieur
    d.rectangle((cx - 16, cy - 6, cx - 10, cy - 2),
                fill=METAL["dark"], outline=ACCENT["outline"])
    d.rectangle((cx - 17, cy - 5, cx - 16, cy - 3), fill=pal["glow"])
    # Réacteur inférieur
    d.rectangle((cx - 16, cy + 2, cx - 10, cy + 6),
                fill=METAL["dark"], outline=ACCENT["outline"])
    d.rectangle((cx - 17, cy + 3, cx - 16, cy + 5), fill=pal["glow"])

    # === Empennage stabilisateur arrière (petit triangle vertical au centre) ===
    d.polygon([(cx - 10, cy - 1), (cx - 10, cy + 1), (cx - 14, cy)],
              fill=METAL["light"])

    return drop_shadow(img, offset=(1, 2), blur=2, opacity=90)


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
    ("factory-air-player.png",   render_factory_air,    ("player",)),
    ("factory-air-enemy.png",    render_factory_air,    ("enemy",)),
    ("unit-air-player.png",      render_unit_air,       ("player",)),
    ("unit-air-enemy.png",       render_unit_air,       ("enemy",)),
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
