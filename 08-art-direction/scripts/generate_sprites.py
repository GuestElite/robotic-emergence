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
    ACCENT, ENEMY, GOLD, GROUND, METAL, PLAYER, TRANSPARENT,
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

def render_unit_light(side: str, tier: int = 0, pal_override: dict = None) -> Image.Image:
    """Light unit. Tiers (player only):
       0 = bleu base / silhouette de base
       1 = Emerald + casque tactique + backpack + antenne dorsale (Recon)
       2 = Royal + cape + casque ailé + bouclier + canon long doré (Royal Guard)"""
    W = H = 48
    pal = pal_override if pal_override is not None else side_palette(side, tier)
    is_t1 = tier == 1
    is_t2 = tier == 2
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2

    # === [Layer 0] CAPE arrière (T2 seulement) — passe derrière le perso ===
    if is_t2:
        cape_pts = [
            (cx - 14, cy - 4), (cx + 14, cy - 4),
            (cx + 12, cy + 16), (cx - 12, cy + 16),
        ]
        d.polygon(cape_pts, fill=pal["dark"], outline=ACCENT["outline"])
        # Plis verticaux
        for x_off in (-6, 0, 6):
            d.line((cx + x_off, cy - 2, cx + x_off, cy + 14),
                   fill=(40, 20, 80, 255), width=1)
        # Liseré doré au bord bas
        d.line((cx - 12, cy + 16, cx + 12, cy + 16), fill=GOLD["light"], width=1)

    # === [Layer 1] JAMBES (commune) ===
    d.ellipse((cx - 14, cy + 8, cx - 4, cy + 18), fill=METAL["darkest"])
    d.ellipse((cx + 4, cy + 8, cx + 14, cy + 18), fill=METAL["darkest"])

    # === [Layer 2] BACKPACK arrière (T1 seulement) — visible derrière le torse ===
    if is_t1:
        d.rectangle((cx - 4, cy - 16, cx + 4, cy - 10),
                    fill=pal["dark"], outline=ACCENT["outline"])
        d.line((cx, cy - 16, cx, cy - 10), fill=pal["light"], width=1)
        # Sangle backpack visible (rectangle en travers du torse)
        d.line((cx - 12, cy - 2, cx + 12, cy - 2), fill=METAL["darkest"], width=1)

    # === [Layer 3] TORSE (commune, couleur du tier) ===
    d.polygon([(cx - 12, cy - 4), (cx - 6, cy - 14), (cx + 6, cy - 14),
               (cx + 12, cy - 4), (cx + 10, cy + 8), (cx - 10, cy + 8)],
              fill=pal["base"], outline=ACCENT["outline"])
    d.polygon([(cx - 10, cy - 4), (cx - 6, cy - 12), (cx, cy - 12), (cx - 4, cy - 4)],
              fill=pal["light"])

    # === [Layer 4] TÊTE — casque pour T1/T2, dôme rond pour T0 ===
    if is_t1 or is_t2:
        # Casque tactique large (rectangle arrondi)
        d.rounded_rectangle((cx - 7, cy - 18, cx + 7, cy - 8), radius=4,
                            fill=pal["dark"], outline=ACCENT["outline"])
        # Visière noire (bandeau)
        d.rectangle((cx - 6, cy - 14, cx + 6, cy - 10), fill=METAL["darkest"])
        # Reflet glow sur la visière (œil cyclope)
        d.ellipse((cx - 1, cy - 13, cx + 2, cy - 11), fill=pal["glow"])
        # Mini reflet blanc
        d.ellipse((cx, cy - 13, cx + 1, cy - 12), fill=ACCENT["white"])
    else:
        # Tête ronde classique (T0)
        d.ellipse((cx - 5, cy - 18, cx + 5, cy - 8), fill=pal["dark"],
                  outline=ACCENT["outline"])
        d.ellipse((cx - 2, cy - 16, cx + 2, cy - 12), fill=pal["glow"])

    # === [Layer 5] ARME ===
    if is_t2:
        # Canon long premium (étendu jusqu'à cx+20, +4px de long)
        d.rectangle((cx + 6, cy - 6, cx + 20, cy - 2),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        # Bouche dorée
        d.rectangle((cx + 18, cy - 5, cx + 20, cy - 3), fill=GOLD["light"])
        # Reflet doré sur le dessus du canon (liseré)
        d.line((cx + 7, cy - 6, cx + 19, cy - 6), fill=GOLD["dark"], width=1)
        # Petit chargeur (rectangle au-dessus du canon)
        d.rectangle((cx + 8, cy - 9, cx + 14, cy - 6), fill=METAL["dark"])
    else:
        # Arme laser classique (T0 et T1)
        d.rectangle((cx + 6, cy - 6, cx + 16, cy - 2),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((cx + 14, cy - 5, cx + 16, cy - 3),
                    fill=pal["glow"] if is_t1 else ACCENT["warning"])

    # === [Layer 6] ANTENNE dorsale (T1) ===
    if is_t1:
        d.line((cx - 2, cy - 18, cx - 2, cy - 24), fill=METAL["darkest"], width=1)
        d.ellipse((cx - 3, cy - 25, cx - 1, cy - 23), fill=pal["glow"])
        # Accents dorés subtils T1 : bord doré bas de la visière + ceinture mince
        d.line((cx - 6, cy - 10, cx + 6, cy - 10), fill=GOLD["light"], width=1)
        d.line((cx - 10, cy, cx + 10, cy), fill=GOLD["dark"], width=1)

    # === [Layer 7] Accessoires premium (T2) ===
    if is_t2:
        # AILES dorées sur les côtés du casque (façon Mercury)
        d.polygon([(cx - 7, cy - 16), (cx - 13, cy - 18), (cx - 7, cy - 13)],
                  fill=GOLD["light"], outline=ACCENT["outline"])
        d.polygon([(cx + 7, cy - 16), (cx + 13, cy - 18), (cx + 7, cy - 13)],
                  fill=GOLD["light"], outline=ACCENT["outline"])
        # Reflet sur les ailes
        d.line((cx - 7, cy - 15, cx - 12, cy - 17), fill=GOLD["highlight"], width=1)
        d.line((cx + 7, cy - 15, cx + 12, cy - 17), fill=GOLD["highlight"], width=1)

        # BOUCLIER rond doré (sur le bras gauche du perso = côté gauche du sprite)
        d.ellipse((cx - 18, cy - 4, cx - 10, cy + 4),
                  fill=GOLD["base"], outline=ACCENT["outline"])
        d.ellipse((cx - 16, cy - 2, cx - 12, cy + 2), fill=GOLD["light"])
        d.ellipse((cx - 15, cy - 1, cx - 13, cy + 1), fill=ACCENT["white"])

        # LISERÉ DORÉ sur les épaulettes (bords du torse)
        d.line((cx - 12, cy - 4, cx - 6, cy - 14), fill=GOLD["light"], width=1)
        d.line((cx + 12, cy - 4, cx + 6, cy - 14), fill=GOLD["light"], width=1)
        # Ceinture dorée
        d.line((cx - 10, cy, cx + 10, cy), fill=GOLD["light"], width=1)

    return drop_shadow(img, offset=(1, 2), blur=2, opacity=110)


# ===========================================================================
# 5. UNIT HEAVY — 64x64, tank chenillé
# ===========================================================================

def render_unit_heavy(side: str, tier: int = 0, pal_override: dict = None) -> Image.Image:
    """Heavy unit. Tiers (player only):
       0 = bleu base / silhouette de base
       1 = Emerald + plaque blindage frontale + radar dorsal + pods latéraux
       2 = Royal + mega-tourelle + 4 lance-roquettes + crête centrale + échappements"""
    W = H = 64
    pal = pal_override if pal_override is not None else side_palette(side, tier)
    is_t1 = tier == 1
    is_t2 = tier == 2
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2

    # === [Layer 1] CHENILLES ===
    for x_off in (-22, 14):
        d.rounded_rectangle((cx + x_off, cy - 22, cx + x_off + 8, cy + 22),
                            radius=2, fill=METAL["darkest"],
                            outline=ACCENT["outline"])
        for y in range(cy - 20, cy + 21, 4):
            d.line((cx + x_off + 1, y, cx + x_off + 7, y), fill=METAL["light"], width=1)

    # === [Layer 1.5] PODS LATÉRAUX (T1 seulement) — montés sur l'arrière des chenilles ===
    if is_t1:
        # Pod gauche
        d.rounded_rectangle((cx - 26, cy + 4, cx - 22, cy + 12), radius=1,
                            fill=pal["dark"], outline=ACCENT["outline"])
        d.ellipse((cx - 26, cy + 5, cx - 23, cy + 8), fill=pal["glow"])
        # Pod droit
        d.rounded_rectangle((cx + 22, cy + 4, cx + 26, cy + 12), radius=1,
                            fill=pal["dark"], outline=ACCENT["outline"])
        d.ellipse((cx + 23, cy + 5, cx + 26, cy + 8), fill=pal["glow"])

    # === [Layer 2] CHÂSSIS ===
    body = (cx - 14, cy - 16, cx + 14, cy + 16)
    rounded_rect_with_shading(d, body,
                              color_base=pal["base"], color_dark=METAL["darkest"],
                              color_light=pal["light"], radius=3,
                              outline=ACCENT["outline"])

    # === [Layer 3] PLAQUE DE BLINDAGE FRONTALE (T1 et T2) ===
    if is_t1 or is_t2:
        # Plaque rectangulaire ajoutée à l'avant du châssis (haut du sprite)
        d.rectangle((cx - 12, cy - 20, cx + 12, cy - 14),
                    fill=pal["dark"], outline=ACCENT["outline"])
        # Reflet sur la plaque
        d.line((cx - 11, cy - 19, cx + 11, cy - 19), fill=pal["light"], width=1)
        # 4 boulons décoratifs — dorés pour T1 (subtils), restent gris sinon
        bolt_color = GOLD["light"] if is_t1 else METAL["light"]
        for dx_ in (-10, -4, 4, 10):
            d.ellipse((cx + dx_ - 1, cy - 18, cx + dx_ + 1, cy - 16),
                      fill=bolt_color)
    if is_t1:
        # Bande dorée fine sur le bas de la plaque de blindage
        d.line((cx - 12, cy - 14, cx + 12, cy - 14), fill=GOLD["light"], width=1)

    # === [Layer 4] TOURELLE — taille selon tier ===
    if is_t2:
        # Mega-tourelle élargie
        turret(d, cx, cy, 12, pal, "up")
        # Crête centrale ailée (façon couronne sur le tank)
        d.polygon([(cx - 6, cy - 4), (cx, cy - 10), (cx + 6, cy - 4)],
                  fill=GOLD["light"], outline=ACCENT["outline"])
        d.ellipse((cx - 1, cy - 9, cx + 1, cy - 7), fill=ACCENT["white"])
    else:
        turret(d, cx, cy, 9, pal, "up")

    # === [Layer 5] RADAR DORSAL (T1 seulement) ===
    if is_t1:
        # Petit dôme radar à l'arrière (bas du sprite)
        d.ellipse((cx - 4, cy + 8, cx + 4, cy + 14),
                  fill=METAL["dark"], outline=ACCENT["outline"])
        d.ellipse((cx - 2, cy + 9, cx + 2, cy + 12), fill=pal["glow"])
        # Antenne au-dessus
        d.line((cx, cy + 8, cx, cy + 4), fill=METAL["darkest"], width=1)
    else:
        # Voyant arrière classique
        d.rectangle((cx - 4, cy + 12, cx + 4, cy + 14),
                    fill=GOLD["light"] if is_t2 else ACCENT["warning"])

    # === [Layer 6] 4 LANCE-ROQUETTES aux coins (T2 seulement) ===
    if is_t2:
        # 4 launchers cylindriques aux 4 coins du châssis
        for cx_l, cy_l in [(cx - 11, cy - 13), (cx + 9, cy - 13),
                            (cx - 11, cy + 9), (cx + 9, cy + 9)]:
            d.rectangle((cx_l - 1, cy_l - 1, cx_l + 3, cy_l + 4),
                        fill=METAL["darkest"], outline=ACCENT["outline"])
            # Pointe dorée de la roquette
            d.rectangle((cx_l - 1, cy_l - 1, cx_l + 3, cy_l + 1),
                        fill=GOLD["light"])

    # === [Layer 7] ÉCHAPPEMENTS DOUBLÉS (T2 seulement) ===
    if is_t2:
        # 2 cheminées d'échappement arrière (vues du dessus = petits ovales)
        d.ellipse((cx - 8, cy + 15, cx - 4, cy + 19),
                  fill=METAL["dark"], outline=ACCENT["outline"])
        d.ellipse((cx + 4, cy + 15, cx + 8, cy + 19),
                  fill=METAL["dark"], outline=ACCENT["outline"])
        # Reflet doré au sommet
        d.line((cx - 8, cy + 15, cx - 4, cy + 15), fill=GOLD["light"], width=1)
        d.line((cx + 4, cy + 15, cx + 8, cy + 15), fill=GOLD["light"], width=1)

    # === [Layer 8] Liseré + accents premium (T2) ===
    if is_t2:
        # Liseré doré sur les bordures du châssis
        d.line((cx - 13, cy - 15, cx + 13, cy - 15), fill=GOLD["light"], width=1)
        d.line((cx - 13, cy + 15, cx + 13, cy + 15), fill=GOLD["dark"], width=1)

    return drop_shadow(img, offset=(2, 2), blur=2, opacity=120)


# ===========================================================================
# 5a. UNIT SWARMER — 40x40, drone insectoïde rapide
# ===========================================================================
# Rapatrié depuis preview_swarmer_sniper.py + ajout param tier.

def render_unit_swarmer(side: str, tier: int = 0, pal_override: dict = None) -> Image.Image:
    """Swarmer unit. Tiers (player only):
       0 = 6 pattes / silhouette de base
       1 = Emerald + 8 pattes + antenne dorsale + mandibules allongées (Soldat)
       2 = Royal + 10 pattes + aiguillon arrière + ailes translucides + couronne + œil triple (Reine)"""
    W = H = 40
    pal = pal_override if pal_override is not None else side_palette(side, tier)
    is_t1 = tier == 1
    is_t2 = tier == 2
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2

    # === [Layer 0] AILES translucides (T2) — passent derrière le corps ===
    if is_t2:
        # 2 ailes en losange semi-transparentes (haut-gauche et haut-droite)
        wing_l = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        wld = ImageDraw.Draw(wing_l, "RGBA")
        wld.polygon([(cx - 2, cy - 4), (cx - 14, cy - 12), (cx - 18, cy - 6),
                     (cx - 10, cy - 2)],
                    fill=(pal["light"][0], pal["light"][1], pal["light"][2], 110),
                    outline=(255, 255, 255, 180))
        wld.polygon([(cx + 2, cy - 4), (cx + 14, cy - 12), (cx + 18, cy - 6),
                     (cx + 10, cy - 2)],
                    fill=(pal["light"][0], pal["light"][1], pal["light"][2], 110),
                    outline=(255, 255, 255, 180))
        img = Image.alpha_composite(img, wing_l)
        d = ImageDraw.Draw(img, "RGBA")

    # === [Layer 1] AIGUILLON arrière (T2) — queue pointue vers la gauche (arrière) ===
    if is_t2:
        d.polygon([(cx - 8, cy - 1), (cx - 8, cy + 1), (cx - 18, cy)],
                  fill=METAL["darkest"], outline=ACCENT["outline"])
        d.polygon([(cx - 16, cy), (cx - 18, cy - 1), (cx - 18, cy + 1)],
                  fill=GOLD["light"])  # pointe dorée

    # === [Layer 2] PATTES — nombre selon tier ===
    leg_len = 12
    if is_t2:
        # 10 pattes radiant
        leg_angles = (25, 65, 105, 145, 195, 235, 275, 315, 5, 165)
    elif is_t1:
        # 8 pattes radiant
        leg_angles = (35, 80, 125, 170, 215, 260, 305, 350)
    else:
        # 6 pattes (défaut)
        leg_angles = (35, 95, 145, 215, 265, 325)

    for angle_deg in leg_angles:
        rad = math.radians(angle_deg)
        x_end = int(cx + math.cos(rad) * leg_len)
        y_end = int(cy + math.sin(rad) * leg_len)
        d.line((cx, cy, x_end, y_end), fill=METAL["darkest"], width=2)
        # Tip — doré pour T2, gris sinon
        tip_color = GOLD["light"] if is_t2 else METAL["light"]
        d.ellipse((x_end - 1, y_end - 1, x_end + 1, y_end + 1), fill=tip_color)

    # === [Layer 3] CORPS hexagonal central ===
    r = 8
    hex_pts = []
    for i in range(6):
        ang = math.radians(60 * i + 30)
        hex_pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    d.polygon(hex_pts, fill=pal["base"], outline=ACCENT["outline"])

    # Reflet supérieur
    r2 = 4
    hl_pts = []
    for i in range(6):
        ang = math.radians(60 * i + 30)
        hl_pts.append((cx + math.cos(ang) * r2, cy - 2 + math.sin(ang) * r2))
    d.polygon(hl_pts, fill=pal["light"])

    # === [Layer 4] ŒIL frontal — simple ou triple selon tier ===
    if is_t2:
        # ŒIL TRIPLE (3 yeux côte à côte vers l'avant)
        for dy_ in (-3, 0, 3):
            d.ellipse((cx + 3, cy + dy_ - 1, cx + 7, cy + dy_ + 2),
                      fill=GOLD["light"], outline=ACCENT["outline"])
            d.ellipse((cx + 5, cy + dy_, cx + 6, cy + dy_ + 1), fill=ACCENT["outline"])
    else:
        # Œil simple
        d.ellipse((cx + 3, cy - 2, cx + 8, cy + 3),
                  fill=pal["glow"], outline=ACCENT["outline"])
        d.ellipse((cx + 5, cy, cx + 6, cy + 1), fill=ACCENT["outline"])

    # === [Layer 5] MANDIBULES — allongées pour T1/T2 ===
    if is_t1:
        # Mandibules allongées (16 au lieu de 12)
        d.line((cx + 8, cy - 1, cx + 16, cy - 4), fill=METAL["darkest"], width=1)
        d.line((cx + 8, cy + 2, cx + 16, cy + 5), fill=METAL["darkest"], width=1)
    elif is_t2:
        # Mandibules dorées allongées + recourbées
        d.line((cx + 8, cy - 1, cx + 16, cy - 5), fill=GOLD["base"], width=2)
        d.line((cx + 8, cy + 2, cx + 16, cy + 6), fill=GOLD["base"], width=2)
        d.ellipse((cx + 15, cy - 6, cx + 17, cy - 4), fill=GOLD["light"])
        d.ellipse((cx + 15, cy + 5, cx + 17, cy + 7), fill=GOLD["light"])
    else:
        # Mandibules courtes
        d.line((cx + 8, cy - 1, cx + 12, cy - 4), fill=METAL["darkest"], width=1)
        d.line((cx + 8, cy + 2, cx + 12, cy + 5), fill=METAL["darkest"], width=1)

    # === [Layer 6] ANTENNE dorsale (T1) ===
    if is_t1:
        # Antenne au sommet du corps hexagonal
        d.line((cx - 4, cy - 7, cx - 6, cy - 13), fill=METAL["darkest"], width=1)
        d.ellipse((cx - 7, cy - 14, cx - 5, cy - 12), fill=GOLD["light"])
        # Petite seconde antenne (tip doré)
        d.line((cx + 4, cy - 7, cx + 6, cy - 13), fill=METAL["darkest"], width=1)
        d.ellipse((cx + 5, cy - 14, cx + 7, cy - 12), fill=GOLD["light"])
        # Accent doré T1 : anneau hexagonal mince autour du corps
        d.polygon(hex_pts, fill=None, outline=GOLD["dark"])

    # === [Layer 7] COURONNE dorée (T2) ===
    if is_t2:
        # 3 pointes dorées au sommet du corps
        for dx_ in (-4, 0, 4):
            d.polygon([(cx + dx_ - 1, cy - 7), (cx + dx_ + 1, cy - 7),
                       (cx + dx_, cy - 12)], fill=GOLD["light"])
        # Base de la couronne (anneau doré sur le sommet)
        d.line((cx - 6, cy - 7, cx + 6, cy - 7), fill=GOLD["dark"], width=1)
        # Contour hexagonal doré (signature royale)
        d.polygon(hex_pts, fill=None, outline=GOLD["light"])

    return drop_shadow(img, offset=(1, 2), blur=2, opacity=100)


# ===========================================================================
# 5b. UNIT SNIPER — 56x56, mech bipédique longue portée
# ===========================================================================
# Rapatrié depuis preview_swarmer_sniper.py + ajout param tier.

def render_unit_sniper(side: str, tier: int = 0, pal_override: dict = None) -> Image.Image:
    """Sniper unit. Tiers (player only):
       0 = canon simple / silhouette de base
       1 = Emerald + canon allongé + bipied stabilisateur + casque renforcé (Tireur)
       2 = Royal + double-canon parallèle + cape camouflage + plumes dorées + ceinture munitions (Maître)"""
    W = H = 56
    pal = pal_override if pal_override is not None else side_palette(side, tier)
    is_t1 = tier == 1
    is_t2 = tier == 2
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2

    # === [Layer 0] CAPE de camouflage (T2) — passe derrière le perso ===
    if is_t2:
        cape_pts = [
            (cx - 12, cy - 12), (cx + 12, cy - 12),
            (cx + 14, cy + 18), (cx - 14, cy + 18),
        ]
        d.polygon(cape_pts, fill=pal["dark"], outline=ACCENT["outline"])
        # Texture camouflage (taches de couleur intermédiaire)
        for px, py in [(cx - 6, cy - 4), (cx + 4, cy), (cx - 2, cy + 8),
                       (cx + 8, cy + 12), (cx - 10, cy + 14)]:
            d.ellipse((px - 3, py - 2, px + 3, py + 2), fill=pal["base"])
        # Liseré doré au bord
        d.line((cx - 14, cy + 18, cx + 14, cy + 18), fill=GOLD["light"], width=1)

    # === [Layer 1] JAMBES bipédiques ===
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

    # === [Layer 2] BIPIED stabilisateur (T1) — 2 supports diagonaux à la base ===
    if is_t1:
        # Bipied gauche
        d.line((cx - 10, cy + 20, cx - 16, cy + 26), fill=METAL["darkest"], width=2)
        d.ellipse((cx - 17, cy + 25, cx - 15, cy + 27), fill=METAL["light"])
        # Bipied droit
        d.line((cx + 10, cy + 20, cx + 16, cy + 26), fill=METAL["darkest"], width=2)
        d.ellipse((cx + 15, cy + 25, cx + 17, cy + 27), fill=METAL["light"])

    # === [Layer 3] CEINTURE MUNITIONS (T2) — passe en travers du torse ===
    if is_t2:
        # Bande de munitions en diagonale (de l'épaule gauche à la hanche droite)
        d.line((cx - 10, cy - 8, cx + 10, cy + 6), fill=GOLD["dark"], width=3)
        # Cartouches visibles
        for t in (0.2, 0.4, 0.6, 0.8):
            px = int(cx - 10 + (20 * t))
            py = int(cy - 8 + (14 * t))
            d.rectangle((px - 1, py - 1, px + 1, py + 2), fill=GOLD["light"])

    # === [Layer 4] CHÂSSIS vertical ===
    body = (cx - 10, cy - 16, cx + 10, cy + 8)
    rounded_rect_with_shading(d, body,
                              color_base=pal["base"], color_dark=METAL["darkest"],
                              color_light=pal["light"], radius=3,
                              outline=ACCENT["outline"])

    # Plaque pectorale
    d.rectangle((cx - 4, cy - 6, cx + 4, cy + 2), fill=pal["dark"])
    d.line((cx, cy - 6, cx, cy + 2), fill=ACCENT["outline"])

    # === [Layer 5] CASQUE RENFORCÉ (T1 et T2) — au-dessus du scope ===
    if is_t1 or is_t2:
        # Casque qui élargit le sommet du châssis
        d.rounded_rectangle((cx - 7, cy - 18, cx + 7, cy - 14), radius=2,
                            fill=pal["dark"], outline=ACCENT["outline"])
        # Reflet
        d.line((cx - 6, cy - 17, cx + 6, cy - 17), fill=pal["light"], width=1)

    # === [Layer 6] SCOPE/LUNETTE — taille selon tier ===
    if is_t2:
        # Scope premium plus gros + plumes dorées (2 latérales façon emplumage)
        d.rectangle((cx - 5, cy - 24, cx + 5, cy - 16),
                    fill=METAL["base"], outline=ACCENT["outline"])
        d.ellipse((cx - 3, cy - 23, cx + 3, cy - 18), fill=GOLD["light"])
        d.ellipse((cx - 1, cy - 22, cx + 1, cy - 20), fill=ACCENT["white"])
        # 2 plumes dorées sur le casque (style chef de guerre)
        d.polygon([(cx - 7, cy - 18), (cx - 14, cy - 24), (cx - 5, cy - 20)],
                  fill=GOLD["light"], outline=ACCENT["outline"])
        d.polygon([(cx + 7, cy - 18), (cx + 14, cy - 24), (cx + 5, cy - 20)],
                  fill=GOLD["light"], outline=ACCENT["outline"])
        # Reflets sur plumes
        d.line((cx - 7, cy - 19, cx - 13, cy - 23), fill=GOLD["highlight"], width=1)
        d.line((cx + 7, cy - 19, cx + 13, cy - 23), fill=GOLD["highlight"], width=1)
    else:
        # Scope classique
        d.rectangle((cx - 4, cy - 22, cx + 4, cy - 16),
                    fill=METAL["base"], outline=ACCENT["outline"])
        d.ellipse((cx - 2, cy - 21, cx + 2, cy - 17),
                  fill=pal["glow"] if is_t1 else ACCENT["warning"])
        d.ellipse((cx - 1, cy - 20, cx, cy - 19), fill=ACCENT["white"])

    # === [Layer 7] CANON(S) — simple/allongé/double selon tier ===
    if is_t2:
        # DOUBLE-CANON parallèle (signature Maître Tireur)
        # Canon supérieur
        d.rectangle((cx + 10, cy - 5, cx + 26, cy - 1),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.line((cx + 11, cy - 4, cx + 25, cy - 4), fill=GOLD["dark"], width=1)
        d.rectangle((cx + 24, cy - 5, cx + 26, cy - 1), fill=GOLD["light"])
        # Canon inférieur
        d.rectangle((cx + 10, cy + 1, cx + 26, cy + 5),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.line((cx + 11, cy + 2, cx + 25, cy + 2), fill=GOLD["dark"], width=1)
        d.rectangle((cx + 24, cy + 1, cx + 26, cy + 5), fill=GOLD["light"])
        # Boîtier qui réunit les 2 canons
        d.rectangle((cx + 8, cy - 6, cx + 12, cy + 6),
                    fill=METAL["dark"], outline=ACCENT["outline"])
    elif is_t1:
        # Canon allongé (28 au lieu de 26 = +2px)
        d.rectangle((cx + 10, cy - 3, cx + 28, cy + 1),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        # Liseré doré T1 sur le dessus du canon
        d.line((cx + 11, cy - 2, cx + 27, cy - 2), fill=GOLD["dark"], width=1)
        # Bouche du canon dorée T1 (subtil)
        d.rectangle((cx + 26, cy - 3, cx + 28, cy + 1), fill=GOLD["light"])
        # Stabilisateur
        d.rectangle((cx + 8, cy - 5, cx + 12, cy + 3),
                    fill=METAL["dark"], outline=ACCENT["outline"])
        # Petit insigne doré sur la plaque pectorale (grade)
        d.rectangle((cx - 1, cy - 4, cx + 1, cy - 2), fill=GOLD["light"])
    else:
        # Canon simple (défaut)
        d.rectangle((cx + 10, cy - 3, cx + 26, cy + 1),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.line((cx + 11, cy - 2, cx + 25, cy - 2), fill=METAL["light"], width=1)
        d.rectangle((cx + 24, cy - 3, cx + 26, cy + 1), fill=ACCENT["warning"])
        d.rectangle((cx + 8, cy - 5, cx + 12, cy + 3),
                    fill=METAL["dark"], outline=ACCENT["outline"])

    return drop_shadow(img, offset=(2, 2), blur=2, opacity=120)


# ===========================================================================
# 5c. FACTORY AIR — 128x128, hangar industriel à toit ouvert
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

def render_unit_air(side: str, tier: int = 0, pal_override: dict = None) -> Image.Image:
    """Air unit. Tiers (player only):
       0 = chasseur delta simple / silhouette de base
       1 = Emerald + ailes élargies + 4 missiles + réacteurs renforcés (Intercepteur)
       2 = Royal + ailes en X (canards avant) + 6 missiles + post-combustion + canopée bulle dorée"""
    W = H = 48
    pal = pal_override if pal_override is not None else side_palette(side, tier)
    is_t1 = tier == 1
    is_t2 = tier == 2
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2

    # === [Layer 0] OMBRE projetée ===
    shadow_layer = Image.new("RGBA", (W, H), TRANSPARENT)
    sd_shadow = ImageDraw.Draw(shadow_layer, "RGBA")
    sd_shadow.polygon(
        [(cx + 22, cy + 5), (cx - 14, cy + 14), (cx - 14, cy - 4)],
        fill=(0, 0, 0, 90),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, shadow_layer)
    d = ImageDraw.Draw(img, "RGBA")

    # === [Layer 1] POST-COMBUSTION (T2) — flammes longues derrière les réacteurs ===
    if is_t2:
        flame_layer = Image.new("RGBA", (W, H), TRANSPARENT)
        fd = ImageDraw.Draw(flame_layer, "RGBA")
        # Flamme supérieure (du réacteur sup vers la gauche)
        fd.polygon([(cx - 17, cy - 6), (cx - 17, cy - 2),
                    (cx - 24, cy - 4)],
                   fill=(GOLD["light"][0], GOLD["light"][1], GOLD["light"][2], 200))
        fd.polygon([(cx - 17, cy - 5), (cx - 17, cy - 3),
                    (cx - 22, cy - 4)],
                   fill=(255, 255, 255, 220))
        # Flamme inférieure
        fd.polygon([(cx - 17, cy + 2), (cx - 17, cy + 6),
                    (cx - 24, cy + 4)],
                   fill=(GOLD["light"][0], GOLD["light"][1], GOLD["light"][2], 200))
        fd.polygon([(cx - 17, cy + 3), (cx - 17, cy + 5),
                    (cx - 22, cy + 4)],
                   fill=(255, 255, 255, 220))
        flame_layer = flame_layer.filter(ImageFilter.GaussianBlur(1))
        img = Image.alpha_composite(img, flame_layer)
        d = ImageDraw.Draw(img, "RGBA")

    # === [Layer 2] AILE PRINCIPALE — taille selon tier ===
    if is_t1 or is_t2:
        # Aile élargie (envergure plus grande, +4px sur les bords)
        wing = [
            (cx + 22, cy),               # pointe avant (+2px)
            (cx - 18, cy - 18),          # arrière-gauche-haut élargi
            (cx - 8, cy),                # creux central
            (cx - 18, cy + 18),          # arrière-gauche-bas élargi
        ]
    else:
        # Aile delta standard
        wing = [
            (cx + 20, cy),
            (cx - 16, cy - 14),
            (cx - 8, cy),
            (cx - 16, cy + 14),
        ]
    d.polygon(wing, fill=pal["base"], outline=ACCENT["outline"])
    d.line((wing[0][0], wing[0][1], wing[1][0], wing[1][1]),
           fill=pal["light"], width=1)

    # === [Layer 3] CANARDS AVANT (T2) — petites ailettes triangulaires sur le nez ===
    if is_t2:
        # Canard supérieur (sur le nez avant)
        d.polygon([(cx + 12, cy - 1), (cx + 18, cy - 8), (cx + 18, cy - 5)],
                  fill=pal["dark"], outline=ACCENT["outline"])
        # Canard inférieur
        d.polygon([(cx + 12, cy + 1), (cx + 18, cy + 8), (cx + 18, cy + 5)],
                  fill=pal["dark"], outline=ACCENT["outline"])
        # Liseré doré sur les canards
        d.line((cx + 12, cy - 1, cx + 18, cy - 8), fill=GOLD["light"], width=1)
        d.line((cx + 12, cy + 1, cx + 18, cy + 8), fill=GOLD["light"], width=1)

    # === [Layer 4] FUSELAGE central ===
    d.polygon(
        [(cx + 18, cy - 1), (cx + 18, cy + 1),
         (cx - 12, cy + 4), (cx - 12, cy - 4)],
        fill=pal["dark"], outline=ACCENT["outline"],
    )

    # === [Layer 5] COCKPIT — bulle dorée pour T2, ovale glow sinon ===
    if is_t2:
        # Canopée bulle plus grosse (dôme premium)
        d.ellipse((cx + 2, cy - 4, cx + 14, cy + 4),
                  fill=pal["glow"], outline=ACCENT["outline"])
        d.ellipse((cx + 2, cy - 4, cx + 14, cy + 4),
                  fill=None, outline=GOLD["light"], width=1)
        # Reflet blanc
        d.ellipse((cx + 5, cy - 3, cx + 9, cy), fill=ACCENT["white"])
    else:
        d.ellipse((cx + 4, cy - 3, cx + 14, cy + 3),
                  fill=pal["glow"], outline=ACCENT["outline"])
        d.ellipse((cx + 6, cy - 2, cx + 9, cy), fill=ACCENT["white"])

    # === [Layer 6] MISSILES — 2 / 4 / 6 selon tier ===
    if is_t2:
        # 6 missiles : 3 par aile (paire interne, médiane, externe)
        for dy_pair in (-10, 10):  # haut et bas
            # Missile externe (le plus loin du fuselage)
            d.rectangle((cx - 6, cy + dy_pair - 1, cx + 6, cy + dy_pair + 1),
                        fill=METAL["darkest"], outline=ACCENT["outline"])
            d.rectangle((cx + 4, cy + dy_pair - 1, cx + 6, cy + dy_pair + 1),
                        fill=GOLD["light"])
            # Missile médian
            d.rectangle((cx - 4, cy + (dy_pair * 4 // 5) - 1,
                         cx + 8, cy + (dy_pair * 4 // 5) + 1),
                        fill=METAL["darkest"], outline=ACCENT["outline"])
            d.rectangle((cx + 6, cy + (dy_pair * 4 // 5) - 1,
                         cx + 8, cy + (dy_pair * 4 // 5) + 1),
                        fill=GOLD["light"])
            # Missile interne (proche du fuselage)
            d.rectangle((cx - 2, cy + (dy_pair * 3 // 5) - 1,
                         cx + 10, cy + (dy_pair * 3 // 5) + 1),
                        fill=METAL["darkest"], outline=ACCENT["outline"])
            d.rectangle((cx + 8, cy + (dy_pair * 3 // 5) - 1,
                         cx + 10, cy + (dy_pair * 3 // 5) + 1),
                        fill=GOLD["light"])
    elif is_t1:
        # 4 missiles : 2 par aile (paire interne + paire externe)
        # Pointes dorées (subtil grade T1)
        for dy_pair in (-10, 10):
            # Missile externe
            d.rectangle((cx - 4, cy + dy_pair, cx + 8, cy + dy_pair + 2),
                        fill=METAL["darkest"], outline=ACCENT["outline"])
            d.rectangle((cx + 6, cy + dy_pair, cx + 8, cy + dy_pair + 2),
                        fill=GOLD["light"])
            # Missile interne
            d.rectangle((cx - 2, cy + (dy_pair * 3 // 5),
                         cx + 10, cy + (dy_pair * 3 // 5) + 2),
                        fill=METAL["darkest"], outline=ACCENT["outline"])
            d.rectangle((cx + 8, cy + (dy_pair * 3 // 5),
                         cx + 10, cy + (dy_pair * 3 // 5) + 2),
                        fill=GOLD["light"])
    else:
        # 2 missiles (défaut)
        d.rectangle((cx - 4, cy - 10, cx + 8, cy - 8),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((cx + 6, cy - 10, cx + 8, cy - 8), fill=ACCENT["warning"])
        d.rectangle((cx - 4, cy + 8, cx + 8, cy + 10),
                    fill=METAL["darkest"], outline=ACCENT["outline"])
        d.rectangle((cx + 6, cy + 8, cx + 8, cy + 10), fill=ACCENT["warning"])

    # === [Layer 7] RÉACTEURS — renforcés pour T1/T2 ===
    if is_t1 or is_t2:
        # Réacteurs plus gros (élargis de 2px)
        d.rectangle((cx - 18, cy - 7, cx - 10, cy - 1),
                    fill=METAL["dark"], outline=ACCENT["outline"])
        d.rectangle((cx - 18, cy + 1, cx - 10, cy + 7),
                    fill=METAL["dark"], outline=ACCENT["outline"])
        # Glow à la sortie
        glow_color = GOLD["light"] if is_t2 else pal["glow"]
        d.rectangle((cx - 19, cy - 6, cx - 17, cy - 2), fill=glow_color)
        d.rectangle((cx - 19, cy + 2, cx - 17, cy + 6), fill=glow_color)
    else:
        # Réacteurs standard
        d.rectangle((cx - 16, cy - 6, cx - 10, cy - 2),
                    fill=METAL["dark"], outline=ACCENT["outline"])
        d.rectangle((cx - 17, cy - 5, cx - 16, cy - 3), fill=pal["glow"])
        d.rectangle((cx - 16, cy + 2, cx - 10, cy + 6),
                    fill=METAL["dark"], outline=ACCENT["outline"])
        d.rectangle((cx - 17, cy + 3, cx - 16, cy + 5), fill=pal["glow"])

    # === [Layer 8] EMPENNAGE stabilisateur ===
    d.polygon([(cx - 10, cy - 1), (cx - 10, cy + 1), (cx - 14, cy)],
              fill=METAL["light"])

    # === [Layer 9] LISERÉ DORÉ sur les ailes (T1 subtil, T2 double) ===
    if is_t2:
        d.line((wing[0][0], wing[0][1], wing[1][0], wing[1][1]),
               fill=GOLD["light"], width=1)
        d.line((wing[0][0], wing[0][1], wing[3][0], wing[3][1]),
               fill=GOLD["dark"], width=1)
    elif is_t1:
        # Liseré doré subtil sur le bord d'attaque supérieur seulement
        d.line((wing[0][0], wing[0][1], wing[1][0], wing[1][1]),
               fill=GOLD["dark"], width=1)

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
# 10. MEDIC — unité K9 quadrupède animée (4 frames) + factory hôpital
# ===========================================================================
# Convention spécifique au médic :
# - L'unité est dessinée en vue 3/4 (camera légèrement au-dessus + de côté),
#   contrairement au reste du roster qui est pure top-down. C'est un choix
#   design assumé : le médic doit casser le moule pour être instantanément
#   identifiable comme support.
# - 4 frames de course en trot diagonal (F0 + F2 = appuis, F1 + F3 = suspension).
# - Le code de game.js cycle les frames quand l'unité bouge (~10 fps).

_MED = {
    "cross":      ( 34, 197,  94, 255),
    "cross_dark": ( 21, 128,  61, 255),
    "cross_glow": (134, 239, 172, 255),
    "white":      (243, 244, 246, 255),
    "white_dark": (209, 213, 219, 255),
}

# Décalages d'animation (4 frames de trot diagonal)
_MEDIC_BODY_Y_BOB = [0, -2, 0, -2]            # corps soulevé en suspension
_MEDIC_LEG_X_PHASE = {
    "front_near": [+3,  0, -3, 0],
    "back_near":  [-3,  0, +3, 0],
    "front_far":  [-3,  0, +3, 0],
    "back_far":   [+3,  0, -3, 0],
}
_MEDIC_LEG_Y_LIFT = [0, -3, 0, -3]


def _medic_render_leg(d, base_x, base_y, x_off, y_off, is_far=False):
    """Patte en 2 segments + paw, plus sombre/petite si arrière-plan."""
    upper = METAL["darkest"] if not is_far else (40, 50, 65, 255)
    lower = METAL["dark"] if not is_far else (40, 50, 65, 255)
    paw_col = METAL["base"] if not is_far else METAL["dark"]
    leg_w = 2 if not is_far else 1
    d.line((base_x, base_y, base_x + x_off, base_y + 4 + y_off),
           fill=upper, width=leg_w + 1)
    d.line((base_x + x_off, base_y + 4 + y_off, base_x + x_off, base_y + 8 + y_off),
           fill=lower, width=leg_w)
    pr = 1 if is_far else 2
    d.ellipse((base_x + x_off - pr, base_y + 8 + y_off - pr // 2,
               base_x + x_off + pr, base_y + 8 + y_off + pr),
              fill=paw_col, outline=ACCENT["outline"] if not is_far else None)


def render_unit_medic(side: str, frame: int = 0, pal_override: dict = None) -> Image.Image:
    """Médic K9 quadrupède en vue 3/4. `frame` ∈ [0, 3] pour le cycle de course."""
    frame = max(0, min(3, int(frame)))
    W = H = 48
    pal = pal_override if pal_override is not None else side_palette(side, 0)
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2
    body_y_off = _MEDIC_BODY_Y_BOB[frame]

    # Ombre au sol (ne suit pas le bob)
    shadow = Image.new("RGBA", (W, H), TRANSPARENT)
    sd = ImageDraw.Draw(shadow, "RGBA")
    sd.ellipse((cx - 14, cy + 11, cx + 12, cy + 17),
               fill=(0, 0, 0, 90 if body_y_off == 0 else 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, shadow)
    d = ImageDraw.Draw(img, "RGBA")

    # Pattes lointaines (derrière le corps, plus sombres)
    far_y = cy - 2 + body_y_off
    _medic_render_leg(d, cx + 6, far_y, _MEDIC_LEG_X_PHASE["front_far"][frame],
                      _MEDIC_LEG_Y_LIFT[frame], is_far=True)
    _medic_render_leg(d, cx - 8, far_y, _MEDIC_LEG_X_PHASE["back_far"][frame],
                      _MEDIC_LEG_Y_LIFT[frame], is_far=True)

    # Corps en 3/4 : flanc (dark) sous le dos (base)
    body_top, body_bottom = cy - 4 + body_y_off, cy + 6 + body_y_off
    body_left, body_right = cx - 12, cx + 10
    d.rounded_rectangle((body_left + 2, body_top + 4, body_right - 2, body_bottom),
                        radius=3, fill=pal["dark"], outline=ACCENT["outline"])
    d.rounded_rectangle((body_left, body_top, body_right - 2, body_top + 7),
                        radius=3, fill=pal["base"], outline=ACCENT["outline"])
    d.line((body_left + 1, body_top + 7, body_right - 3, body_top + 7),
           fill=pal["light"], width=1)
    d.line((body_left + 2, body_top + 1, body_right - 6, body_top + 1),
           fill=pal["light"], width=1)

    # Module médical (panneau blanc + croix verte) sur le dos
    panel_x0, panel_x1 = cx - 6, cx + 4
    panel_y0, panel_y1 = body_top + 1, body_top + 7
    d.rounded_rectangle((panel_x0, panel_y0, panel_x1, panel_y1), radius=1,
                        fill=_MED["white"], outline=ACCENT["outline"])
    mid_x = (panel_x0 + panel_x1) // 2
    mid_y = (panel_y0 + panel_y1) // 2
    d.rectangle((panel_x0 + 1, mid_y, panel_x1 - 1, mid_y + 1), fill=_MED["cross"])
    d.rectangle((mid_x, panel_y0 + 1, mid_x + 1, panel_y1 - 1), fill=_MED["cross"])

    # Pattes proches (devant, plus grosses)
    near_y = cy + 3 + body_y_off
    _medic_render_leg(d, cx + 6, near_y, _MEDIC_LEG_X_PHASE["front_near"][frame],
                      _MEDIC_LEG_Y_LIFT[frame], is_far=False)
    _medic_render_leg(d, cx - 8, near_y, _MEDIC_LEG_X_PHASE["back_near"][frame],
                      _MEDIC_LEG_Y_LIFT[frame], is_far=False)

    # Tête à l'avant droit (3/4, regard +X) + museau + LED scanner + oreilles
    head_x0, head_x1 = cx + 9, cx + 17
    head_y0, head_y1 = cy - 5 + body_y_off, cy + 4 + body_y_off
    d.rounded_rectangle((head_x0, head_y0, head_x1, head_y1), radius=3,
                        fill=pal["base"], outline=ACCENT["outline"])
    d.rectangle((head_x1, head_y0 + 3, head_x1 + 2, head_y1 - 2),
                fill=pal["dark"], outline=ACCENT["outline"])
    d.rectangle((head_x0 + 4, head_y0 + 2, head_x1 - 1, head_y0 + 5),
                fill=METAL["darkest"])
    d.rectangle((head_x0 + 4, head_y0 + 3, head_x1 - 2, head_y0 + 4),
                fill=_MED["cross_glow"])
    d.point((head_x1 - 3, head_y0 + 3), fill=ACCENT["white"])
    d.polygon([(head_x0 + 1, head_y0), (head_x0 + 3, head_y0 - 3),
               (head_x0 + 4, head_y0 + 1)], fill=pal["dark"],
              outline=ACCENT["outline"])
    d.polygon([(head_x1 - 4, head_y0), (head_x1 - 2, head_y0 - 3),
               (head_x1 - 1, head_y0 + 1)], fill=pal["dark"],
              outline=ACCENT["outline"])

    # Antenne arrière + LED verte (remplace la queue)
    tail_x, tail_y = body_left - 2, body_top + 2
    d.line((tail_x + 2, tail_y, tail_x - 2, tail_y - 3),
           fill=METAL["darkest"], width=1)
    d.ellipse((tail_x - 3, tail_y - 4, tail_x - 1, tail_y - 2),
              fill=_MED["cross_glow"])

    # Halo de soin diffus
    halo = Image.new("RGBA", (W, H), TRANSPARENT)
    hd = ImageDraw.Draw(halo, "RGBA")
    hd.ellipse((cx - 20, cy - 4, cx + 20, cy + 18),
               outline=(*_MED["cross_glow"][:3], 70), width=2)
    halo = halo.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(halo, img)
    return img


def render_factory_medic(side: str, pal_override: dict = None) -> Image.Image:
    """Factory médic : hôpital de campagne avec grosse croix verte centrale."""
    W = H = 128
    pal = pal_override if pal_override is not None else side_palette(side)
    img, d = new_canvas(W, H)
    d.rounded_rectangle((6, 8, W - 6, H - 6), radius=10,
                        fill=METAL["darkest"], outline=ACCENT["outline"], width=1)

    sub_img, sd = new_canvas(W, H)
    body = (12, 14, W - 12, H - 12)
    rounded_rect_with_shading(sd, body,
                              color_base=_MED["white"], color_dark=_MED["white_dark"],
                              color_light=ACCENT["white"], radius=8,
                              outline=ACCENT["outline"])
    sd.rounded_rectangle(body, radius=8, outline=pal["base"], width=2)
    rivets(sd, body, METAL["darkest"], spacing=20)

    band_top = (16, 18, W - 16, 30)
    sd.rounded_rectangle(band_top, radius=4,
                         fill=pal["dark"], outline=ACCENT["outline"])
    for cx_t in range(28, W - 28, 14):
        sd.rectangle((cx_t - 1, 22, cx_t + 1, 26), fill=_MED["cross_glow"])
        sd.rectangle((cx_t - 2, 23, cx_t + 2, 25), fill=_MED["cross_glow"])

    cross_box = (W // 2 - 22, H // 2 - 22, W // 2 + 22, H // 2 + 22)
    sd.rounded_rectangle(cross_box, radius=4,
                         fill=_MED["white"], outline=ACCENT["outline"], width=2)
    cx_c, cy_c = W // 2, H // 2
    sd.rectangle((cx_c - 18, cy_c - 5, cx_c + 18, cy_c + 5), fill=_MED["cross"])
    sd.rectangle((cx_c - 5, cy_c - 18, cx_c + 5, cy_c + 18), fill=_MED["cross"])
    sd.line((cx_c - 18, cy_c + 5, cx_c + 18, cy_c + 5),
            fill=_MED["cross_dark"], width=1)
    sd.line((cx_c + 5, cy_c - 18, cx_c + 5, cy_c + 18),
            fill=_MED["cross_dark"], width=1)
    sd.line((cx_c - 18, cy_c - 5, cx_c + 18, cy_c - 5),
            fill=_MED["cross_glow"], width=1)

    for cx_d, cy_d in [(28, 44), (W - 28, 44), (28, H - 44), (W - 28, H - 44)]:
        sd.ellipse((cx_d - 8, cy_d - 8, cx_d + 8, cy_d + 8),
                   fill=_MED["white"], outline=ACCENT["outline"])
        sd.rectangle((cx_d - 4, cy_d - 1, cx_d + 4, cy_d + 1), fill=_MED["cross"])
        sd.rectangle((cx_d - 1, cy_d - 4, cx_d + 1, cy_d + 4), fill=_MED["cross"])

    aura = Image.new("RGBA", (W, H), TRANSPARENT)
    ad = ImageDraw.Draw(aura, "RGBA")
    ad.ellipse((W // 2 - 56, H // 2 - 56, W // 2 + 56, H // 2 + 56),
               outline=(*_MED["cross_glow"][:3], 110), width=3)
    ad.ellipse((W // 2 - 50, H // 2 - 50, W // 2 + 50, H // 2 + 50),
               outline=(*_MED["cross_glow"][:3], 70), width=2)
    aura = aura.filter(ImageFilter.GaussianBlur(3))

    antenna(sd, 24, 18, 10, _MED["cross_glow"])
    antenna(sd, W - 24, 18, 10, _MED["cross_glow"])

    for cx_l, cy_l in [(20, 24), (W - 20, 24), (20, H - 24), (W - 20, H - 24)]:
        sd.ellipse((cx_l - 2, cy_l - 2, cx_l + 2, cy_l + 2),
                   fill=_MED["cross_glow"], outline=ACCENT["outline"])

    gate_w = 24
    sd.rectangle((W // 2 - gate_w // 2, H - 14, W // 2 + gate_w // 2, H - 6),
                 fill=METAL["darkest"], outline=ACCENT["outline"])
    sd.rectangle((W // 2 - gate_w // 2 + 3, H - 12, W // 2 + gate_w // 2 - 3, H - 8),
                 fill=_MED["cross_glow"])

    if side == "enemy":
        sub_img = sub_img.transpose(Image.FLIP_TOP_BOTTOM)
    img = Image.alpha_composite(img, aura)
    img = Image.alpha_composite(img, sub_img)
    return drop_shadow(img, offset=(2, 3), blur=4, opacity=110)


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
    # === Boutique : skins player tier 1 (Steel/Rare) et tier 2 (Royal Blue/Epic) ===
    ("unit-light-player-t1.png",   render_unit_light,   ("player", 1)),
    ("unit-light-player-t2.png",   render_unit_light,   ("player", 2)),
    ("unit-heavy-player-t1.png",   render_unit_heavy,   ("player", 1)),
    ("unit-heavy-player-t2.png",   render_unit_heavy,   ("player", 2)),
    ("unit-swarmer-player-t1.png", render_unit_swarmer, ("player", 1)),
    ("unit-swarmer-player-t2.png", render_unit_swarmer, ("player", 2)),
    ("unit-sniper-player-t1.png",  render_unit_sniper,  ("player", 1)),
    ("unit-sniper-player-t2.png",  render_unit_sniper,  ("player", 2)),
    ("unit-air-player-t1.png",     render_unit_air,     ("player", 1)),
    ("unit-air-player-t2.png",     render_unit_air,     ("player", 2)),
    # === Skins enemy tier 1 (rouge chromé) et tier 2 (bordeaux profond) — désert ===
    ("unit-light-enemy-t1.png",    render_unit_light,   ("enemy", 1)),
    ("unit-light-enemy-t2.png",    render_unit_light,   ("enemy", 2)),
    ("unit-heavy-enemy-t1.png",    render_unit_heavy,   ("enemy", 1)),
    ("unit-heavy-enemy-t2.png",    render_unit_heavy,   ("enemy", 2)),
    ("unit-swarmer-enemy-t1.png",  render_unit_swarmer, ("enemy", 1)),
    ("unit-swarmer-enemy-t2.png",  render_unit_swarmer, ("enemy", 2)),
    ("unit-sniper-enemy-t1.png",   render_unit_sniper,  ("enemy", 1)),
    ("unit-sniper-enemy-t2.png",   render_unit_sniper,  ("enemy", 2)),
    ("unit-air-enemy-t1.png",      render_unit_air,     ("enemy", 1)),
    ("unit-air-enemy-t2.png",      render_unit_air,     ("enemy", 2)),
    # === Médic : factory + 4 frames d'animation par camp ===
    ("factory-medic-player.png", render_factory_medic,  ("player",)),
    ("factory-medic-enemy.png",  render_factory_medic,  ("enemy",)),
    ("unit-medic-player-0.png",  render_unit_medic,     ("player", 0)),
    ("unit-medic-player-1.png",  render_unit_medic,     ("player", 1)),
    ("unit-medic-player-2.png",  render_unit_medic,     ("player", 2)),
    ("unit-medic-player-3.png",  render_unit_medic,     ("player", 3)),
    ("unit-medic-enemy-0.png",   render_unit_medic,     ("enemy", 0)),
    ("unit-medic-enemy-1.png",   render_unit_medic,     ("enemy", 1)),
    ("unit-medic-enemy-2.png",   render_unit_medic,     ("enemy", 2)),
    ("unit-medic-enemy-3.png",   render_unit_medic,     ("enemy", 3)),
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
