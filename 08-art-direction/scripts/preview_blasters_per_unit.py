"""Génère une preview comparative des 4 styles de projectiles par classe d'unité :
- Light    : blaster standard (10×4 px)
- Heavy    : blaster épais / lent (18×8 px, gros halo)
- Swarmer  : mini blaster rapide (6×3 px, halo minimal)
- Sniper   : laser fin et long (26×2 px) — pas un bolt rond mais un trait précis

Chaque ligne affiche : label + design isolé player + design isolé enemy
+ filmstrip réduit de 3 frames de la trajectoire.

Sortie : 08-art-direction/preview/blaster-preview-units.png
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

THIS_DIR = Path(__file__).resolve().parent


# ---------------------------------------------------------------------------
# Themes de couleur (player bleu, enemy rouge)
# ---------------------------------------------------------------------------

THEMES = {
    "player": {
        "halo_outer": (80, 180, 255),
        "halo_inner": (140, 220, 255),
        "core":       (220, 245, 255),
        "core_inner": (240, 250, 255),
        "trail":      (120, 220, 255),
    },
    "enemy": {
        "halo_outer": (255, 80, 50),
        "halo_inner": (255, 140, 90),
        "core":       (255, 220, 180),
        "core_inner": (255, 240, 220),
        "trail":      (255, 140, 90),
    },
}


# ---------------------------------------------------------------------------
# Profils par classe d'unité (taille + comportement visuel)
# ---------------------------------------------------------------------------

UNIT_PROFILES = {
    "light": {
        "label":      "LIGHT — blaster standard",
        "subtitle":   "core 5×2 · halo 16×8 · trail 3 segments · vitesse normale",
        "core_w": 5, "core_h": 2,
        "halo_w": 16, "halo_h": 8,
        "halo_blur": 2,
        "trail_count": 3, "trail_spacing": 4,
        "is_laser": False,
    },
    "heavy": {
        "label":      "HEAVY — gros blaster lourd",
        "subtitle":   "core 9×4 · halo 24×12 · trail 4 segments épais · vitesse lente",
        "core_w": 9, "core_h": 4,
        "halo_w": 24, "halo_h": 12,
        "halo_blur": 3,
        "trail_count": 4, "trail_spacing": 5,
        "trail_thick": True,
        "is_laser": False,
    },
    "swarmer": {
        "label":      "SWARMER — mini blaster rapide",
        "subtitle":   "core 3×1 · halo 8×4 · pas de trail · très rapide",
        "core_w": 3, "core_h": 1,
        "halo_w": 8, "halo_h": 4,
        "halo_blur": 1,
        "trail_count": 0, "trail_spacing": 0,
        "is_laser": False,
    },
    "sniper": {
        "label":      "SNIPER — laser fin et long",
        "subtitle":   "trait 26×2 (pas un bolt) · halo allongé · trail unique long · ultra rapide",
        "core_w": 26, "core_h": 1,
        "halo_w": 32, "halo_h": 4,
        "halo_blur": 2,
        "trail_count": 1, "trail_spacing": 12,
        "trail_long": True,
        "is_laser": True,
    },
}


# ---------------------------------------------------------------------------
# Helpers de dessin d'un bolt
# ---------------------------------------------------------------------------

def draw_bolt(img, cx, cy, profile, theme):
    """Dessine un bolt à (cx, cy) avec halo + core selon le profil."""
    # Halo extérieur (couche large floutée)
    halo_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo_layer)
    hw, hh = profile["halo_w"], profile["halo_h"]
    ho = theme["halo_outer"]
    hd.ellipse((cx - hw, cy - hh, cx + hw, cy + hh), fill=(ho[0], ho[1], ho[2], 120))
    halo_layer = halo_layer.filter(ImageFilter.GaussianBlur(profile["halo_blur"]))
    img = Image.alpha_composite(img, halo_layer)
    d = ImageDraw.Draw(img)
    # Halo intérieur (plus saturé, moins large)
    hi = theme["halo_inner"]
    d.ellipse((cx - hw // 2, cy - hh // 2, cx + hw // 2, cy + hh // 2),
              fill=(hi[0], hi[1], hi[2], 220))
    # Core
    cw, ch = profile["core_w"], profile["core_h"]
    co = theme["core"]
    d.ellipse((cx - cw, cy - ch, cx + cw, cy + ch),
              fill=(co[0], co[1], co[2], 255))
    # Core inner (laser : trait blanc précis ; sinon ovale brillant)
    ci = theme["core_inner"]
    if profile.get("is_laser"):
        # Trait blanc pur au milieu (signature laser)
        d.rectangle((cx - cw + 2, cy, cx + cw - 2, cy),
                    fill=(ci[0], ci[1], ci[2], 255))
    else:
        d.ellipse((cx - cw + 2, cy - ch + 1, cx + cw - 2, cy + ch - 1),
                  fill=(ci[0], ci[1], ci[2], 255))
    return img


def draw_trail(img, bolt_x, bolt_y, profile, theme):
    """Dessine la trainée derrière le bolt."""
    count = profile["trail_count"]
    if count == 0:
        return img
    spacing = profile["trail_spacing"]
    tr = theme["trail"]
    trail_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    tl = ImageDraw.Draw(trail_layer)
    for t in range(count):
        tx = bolt_x - profile["core_w"] - 2 - t * spacing
        alpha = max(0, 180 - t * 45)
        if profile.get("trail_long"):
            # Sniper : un long trait fading
            tl.rectangle((tx - 8, bolt_y, tx, bolt_y),
                         fill=(tr[0], tr[1], tr[2], alpha))
        elif profile.get("trail_thick"):
            # Heavy : segments épais
            tl.ellipse((tx - 3, bolt_y - 2, tx + 3, bolt_y + 2),
                       fill=(tr[0], tr[1], tr[2], alpha))
        else:
            # Light : segments fins
            tl.ellipse((tx - 2, bolt_y - 1, tx + 2, bolt_y + 1),
                       fill=(tr[0], tr[1], tr[2], alpha))
    trail_layer = trail_layer.filter(ImageFilter.GaussianBlur(1))
    return Image.alpha_composite(img, trail_layer)


# ---------------------------------------------------------------------------
# Composition globale
# ---------------------------------------------------------------------------

def render_units_comparison():
    """Image globale comparant les 4 styles de projectiles."""
    W, H = 720, 460
    img = Image.new("RGBA", (W, H), (15, 23, 42, 255))
    d = ImageDraw.Draw(img)

    # Titre principal
    d.text((16, 12), "Projectiles par classe d'unité — Player (bleu) vs Enemy (rouge)",
           fill=(240, 245, 255, 255))
    d.line((16, 32, W - 16, 32), fill=(60, 80, 110, 255))

    # 4 rangées (light/heavy/swarmer/sniper)
    row_h = 100
    row_y_start = 44
    profiles_order = ["light", "heavy", "swarmer", "sniper"]

    for i, unit_id in enumerate(profiles_order):
        profile = UNIT_PROFILES[unit_id]
        y_top = row_y_start + i * row_h

        # Label + subtitle à gauche
        d.text((20, y_top + 16), profile["label"], fill=(240, 245, 255, 255))
        d.text((20, y_top + 34), profile["subtitle"], fill=(160, 180, 210, 255))

        # Séparateur subtil entre rangées
        if i > 0:
            d.line((16, y_top - 2, W - 16, y_top - 2), fill=(40, 55, 80, 255))

        # Player (haut de la rangée) — design isolé + 3 frames de trajectoire
        cy_player = y_top + 58
        # Design isolé (gauche)
        img = draw_bolt(img, 310, cy_player, profile, THEMES["player"])
        # Filmstrip 3 frames
        for f in range(3):
            fx = 410 + f * 80
            # Trail derrière le bolt
            img = draw_trail(img, fx, cy_player, profile, THEMES["player"])
            # Bolt
            img = draw_bolt(img, fx, cy_player, profile, THEMES["player"])
        d = ImageDraw.Draw(img)

        # Enemy (légèrement décalé verticalement pour différencier de player)
        cy_enemy = y_top + 78
        # Design isolé (gauche)
        img = draw_bolt(img, 360, cy_enemy, profile, THEMES["enemy"])
        d = ImageDraw.Draw(img)

        # Labels colonnes (haut une seule fois)
        if i == 0:
            d.text((296, y_top - 4), "design", fill=(140, 160, 190, 255))
            d.text((410, y_top - 4), "trajectoire ↓",
                   fill=(140, 160, 190, 255))

    return img


def main():
    repo_root = THIS_DIR.parent.parent
    out_dir = repo_root / "08-art-direction" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)
    img = render_units_comparison()
    out = out_dir / "blaster-preview-units.png"
    img.save(out, format="PNG")
    print(f"  blaster-preview-units.png  {img.size[0]}x{img.size[1]}  → {out.relative_to(repo_root)}")


if __name__ == "__main__":
    main()
