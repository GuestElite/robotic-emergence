"""Palette & helpers partagés pour la génération de sprites Émergence V0.

Style cible : top-down 2D chunky, léger relief 3D, inspiré de Robotic Emergence
(2010). Pas du pixel art strict — formes nettes, ombrage simple, bords propres.
"""

from PIL import Image, ImageDraw, ImageFilter


# ---------------------------------------------------------------------------
# PALETTE
# ---------------------------------------------------------------------------

# Joueur (gauche) — bleu/cyan
PLAYER = {
    "dark":    (29,  78, 137, 255),   # #1D4E89
    "base":    (59, 130, 246, 255),   # #3B82F6
    "light":   ( 6, 182, 212, 255),   # #06B6D4
    "glow":    (125, 211, 252, 255),  # #7DD3FC
}

# Player skin tier 1 ⭐ "Steel" (Rare) — bleu acier chromé + 1-2 bandes dorées
# Famille bleue (le joueur reste identifiable), monte en grade par chrome + doré.
PLAYER_T1 = {
    "dark":  ( 30,  58,  95, 255),   # #1E3A5F bleu acier foncé
    "base":  ( 74, 123, 168, 255),   # #4A7BA8 bleu chromé medium
    "light": (164, 188, 216, 255),   # #A4BCD8 argenté bleuté
    "glow":  (147, 197, 253, 255),   # #93C5FD cyan clair (yeux/voyants)
}

# Player skin tier 2 ⭐⭐ "Royal Blue" (Epic) — bleu marine profond + glow doré + accents premium
# Plus le tier monte, plus le bleu fonce et plus les dorures sont visibles.
PLAYER_T2 = {
    "dark":  ( 13,  29,  58, 255),   # #0D1D3A bleu marine quasi noir
    "base":  ( 30,  58, 138, 255),   # #1E3A8A bleu marine profond
    "light": ( 59,  91, 170, 255),   # #3B5BAA bleu intermédiaire (reflet)
    "glow":  (251, 191,  36, 255),   # #FBBF24 doré (yeux/voyants premium)
}

# Doré pur (utilisé pour les accents additifs du tier 2 : liseré, ornements)
GOLD = {
    "dark":    (146, 100,  18, 255), # #926412 or sombre
    "base":    (217, 161,  35, 255), # #D9A123 or moyen
    "light":   (251, 191,  36, 255), # #FBBF24 or vif
    "highlight":(254, 240, 138, 255),# #FEF08A or pâle (reflet)
}


def player_palette(tier: int = 0) -> dict:
    """Renvoie la palette joueur pour le tier donné (0 = défaut, 1 = Emerald, 2 = Royal)."""
    return {0: PLAYER, 1: PLAYER_T1, 2: PLAYER_T2}[tier]


# Ennemi (droite) — rouge/orange
ENEMY = {
    "dark":    (153,  27,  27, 255),  # #991B1B
    "base":    (239,  68,  68, 255),  # #EF4444
    "light":   (249, 115,  22, 255),  # #F97316
    "glow":    (253, 186, 116, 255),  # #FDBA74
}

# Enemy skin tier 1 — rouge acier chromé + accents dorés subtils (Rare)
ENEMY_T1 = {
    "dark":  (108,  29,  29, 255),   # #6C1D1D rouge bordeaux foncé
    "base":  (180,  74,  62, 255),   # #B44A3E rouge brique chromé
    "light": (224, 156, 134, 255),   # #E09C86 rouge clair patiné
    "glow":  (253, 186, 116, 255),   # #FDBA74 orange (yeux/voyants)
}

# Enemy skin tier 2 — rouge bordeaux profond + glow doré + accents premium (Epic)
ENEMY_T2 = {
    "dark":  ( 60,  10,  10, 255),   # #3C0A0A bordeaux quasi-noir
    "base":  (110,  25,  25, 255),   # #6E1919 bordeaux profond
    "light": (170,  55,  55, 255),   # #AA3737 rouge bordeaux intermédiaire
    "glow":  (251, 191,  36, 255),   # #FBBF24 doré (yeux/voyants premium)
}


def enemy_palette(tier: int = 0) -> dict:
    """Renvoie la palette enemy pour le tier donné (0 = défaut, 1 = chrome, 2 = bordeaux)."""
    return {0: ENEMY, 1: ENEMY_T1, 2: ENEMY_T2}[tier]

# Métal / structure (commun)
METAL = {
    "darkest": ( 30,  41,  59, 255),  # #1E293B
    "dark":    ( 51,  65,  85, 255),  # #334155
    "base":    ( 71,  85, 105, 255),  # #475569
    "light":   (100, 116, 139, 255),  # #64748B
    "highlight":(148,163, 184, 255),  # #94A3B8
}

# Sol / décors
GROUND = {
    "darkest": (107,  78,  53, 255),  # #6B4E35
    "dark":    (168, 139, 107, 255),  # #A88B6B
    "base":    (201, 168, 116, 255),  # #C9A874
    "light":   (224, 196, 152, 255),  # #E0C498
    "crack":   ( 77,  56,  36, 255),  # crevasses
}

ACCENT = {
    "shadow":  (0, 0, 0, 110),        # ombre portée semi-transparente
    "outline": (15, 23, 42, 255),     # contour foncé (≠ noir pur)
    "white":   (240, 245, 255, 255),
    "warning": (250, 204,  21, 255),  # antennes / lumières
}

TRANSPARENT = (0, 0, 0, 0)


def side_palette(side: str, tier: int = 0) -> dict:
    """Renvoie la palette du camp (player|enemy).
    Tier ∈ {0, 1, 2} sélectionne la skin (Common/Rare/Epic) — appliqué aux 2 camps."""
    if side == "player":
        return player_palette(tier)
    return enemy_palette(tier)


# ---------------------------------------------------------------------------
# HELPERS DE DESSIN
# ---------------------------------------------------------------------------

def new_canvas(w: int, h: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    """Crée un canvas RGBA transparent + son ImageDraw."""
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    return img, ImageDraw.Draw(img, "RGBA")


def vertical_gradient(w: int, h: int, top: tuple, bottom: tuple) -> Image.Image:
    """Génère un gradient vertical RGBA top→bottom."""
    img = Image.new("RGBA", (w, h), TRANSPARENT)
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        a = int(top[3] + (bottom[3] - top[3]) * t)
        for x in range(w):
            px[x, y] = (r, g, b, a)
    return img


def rounded_rect_with_shading(
    draw: ImageDraw.ImageDraw,
    box: tuple,
    color_base: tuple,
    color_dark: tuple,
    color_light: tuple,
    radius: int = 4,
    outline: tuple = None,
):
    """Rectangle arrondi avec bandes claire (haut) et sombre (bas) — fake 3D."""
    x0, y0, x1, y1 = box
    # Corps principal
    draw.rounded_rectangle(box, radius=radius, fill=color_base, outline=outline, width=1)
    # Bande claire (haut, ~20% de la hauteur)
    bh = max(2, (y1 - y0) // 5)
    draw.rounded_rectangle((x0 + 1, y0 + 1, x1 - 1, y0 + bh), radius=radius, fill=color_light)
    # Bande sombre (bas, ~25% de la hauteur)
    bd = max(2, (y1 - y0) // 4)
    draw.rounded_rectangle((x0 + 1, y1 - bd, x1 - 1, y1 - 1), radius=radius, fill=color_dark)


def rivets(draw: ImageDraw.ImageDraw, box: tuple, color: tuple, spacing: int = 12):
    """Petites pastilles décoratives le long du périmètre d'un rectangle."""
    x0, y0, x1, y1 = box
    r = 1
    for x in range(x0 + spacing, x1 - spacing + 1, spacing):
        draw.ellipse((x - r, y0 + 2 - r, x + r, y0 + 2 + r), fill=color)
        draw.ellipse((x - r, y1 - 2 - r, x + r, y1 - 2 + r), fill=color)
    for y in range(y0 + spacing, y1 - spacing + 1, spacing):
        draw.ellipse((x0 + 2 - r, y - r, x0 + 2 + r, y + r), fill=color)
        draw.ellipse((x1 - 2 - r, y - r, x1 - 2 + r, y + r), fill=color)


def turret(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int,
           side_pal: dict, barrel_dir: str = "up"):
    """Tourelle vue de dessus : socle gris + dôme coloré + double canon.

    barrel_dir ∈ {up, down, left, right}
    """
    # Socle (cercle gris foncé)
    s = size
    draw.ellipse((cx - s, cy - s, cx + s, cy + s),
                 fill=METAL["dark"], outline=ACCENT["outline"])
    # Dôme coloré
    d = int(s * 0.7)
    draw.ellipse((cx - d, cy - d, cx + d, cy + d),
                 fill=side_pal["base"], outline=ACCENT["outline"])
    # Reflet
    rr = max(1, d // 3)
    draw.ellipse((cx - d // 2, cy - d // 2,
                  cx - d // 2 + rr, cy - d // 2 + rr),
                 fill=side_pal["glow"])
    # Canons (2 tubes parallèles)
    bl = int(s * 1.4)  # longueur
    bw = max(1, s // 4)  # demi-épaisseur
    offset = max(1, s // 3)
    if barrel_dir == "up":
        for dx in (-offset, offset):
            draw.rectangle((cx + dx - bw, cy - bl, cx + dx + bw, cy),
                           fill=METAL["darkest"], outline=ACCENT["outline"])
    elif barrel_dir == "down":
        for dx in (-offset, offset):
            draw.rectangle((cx + dx - bw, cy, cx + dx + bw, cy + bl),
                           fill=METAL["darkest"], outline=ACCENT["outline"])
    elif barrel_dir == "left":
        for dy in (-offset, offset):
            draw.rectangle((cx - bl, cy + dy - bw, cx, cy + dy + bw),
                           fill=METAL["darkest"], outline=ACCENT["outline"])
    elif barrel_dir == "right":
        for dy in (-offset, offset):
            draw.rectangle((cx, cy + dy - bw, cx + bl, cy + dy + bw),
                           fill=METAL["darkest"], outline=ACCENT["outline"])


def antenna(draw: ImageDraw.ImageDraw, x: int, y: int, length: int,
            tip_color: tuple = None):
    """Petite antenne verticale + voyant lumineux."""
    if tip_color is None:
        tip_color = ACCENT["warning"]
    draw.line((x, y, x, y - length), fill=METAL["darkest"], width=1)
    draw.ellipse((x - 1, y - length - 1, x + 1, y - length + 1), fill=tip_color)


def drop_shadow(img: Image.Image, offset: tuple = (2, 3), blur: int = 3,
                opacity: int = 90) -> Image.Image:
    """Ajoute une ombre portée sous le sprite (élargit le canvas en mémoire)."""
    w, h = img.size
    pad = blur * 2 + max(offset)
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), TRANSPARENT)
    # Couche ombre
    shadow = Image.new("RGBA", img.size, TRANSPARENT)
    alpha = img.split()[3]
    shadow_color = Image.new("RGBA", img.size, (0, 0, 0, opacity))
    shadow.paste(shadow_color, mask=alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas.paste(shadow, (pad + offset[0], pad + offset[1]), shadow)
    canvas.paste(img, (pad, pad), img)
    # On recoupe au format d'origine (l'ombre déborde et c'est OK pour V0)
    return canvas.crop((pad, pad, pad + w, pad + h))
