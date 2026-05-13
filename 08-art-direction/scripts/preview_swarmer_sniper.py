"""Génère des PNG de PREVIEW pour les nouvelles unités Swarmer + Sniper.

Sortie : 08-art-direction/preview/  (volontairement séparé de sprites/
afin que le user valide les designs avant intégration dans le jeu).

Lancer depuis la racine du repo :
    python3 08-art-direction/scripts/preview_swarmer_sniper.py
"""

import math
import sys
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from palette import (
    new_canvas, side_palette, drop_shadow,
    rounded_rect_with_shading,
    METAL, ACCENT,
)


# ---------------------------------------------------------------------------
# SWARMER — 40x40, drone insectoïde rapide
# ---------------------------------------------------------------------------

def render_unit_swarmer(side: str):
    W = H = 40
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    cx, cy = W // 2, H // 2

    # 6 pattes/spikes radiant autour du corps (insectoïde)
    leg_len = 12
    for angle_deg in (35, 95, 145, 215, 265, 325):
        rad = math.radians(angle_deg)
        x_end = int(cx + math.cos(rad) * leg_len)
        y_end = int(cy + math.sin(rad) * leg_len)
        d.line((cx, cy, x_end, y_end), fill=METAL["darkest"], width=2)
        # Pointe métallique au bout
        d.ellipse((x_end - 1, y_end - 1, x_end + 1, y_end + 1),
                  fill=METAL["light"])

    # Corps hexagonal central
    r = 8
    hex_pts = []
    for i in range(6):
        ang = math.radians(60 * i + 30)
        hex_pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    d.polygon(hex_pts, fill=pal["base"], outline=ACCENT["outline"])

    # Reflet supérieur (petit hex centré-haut)
    r2 = 4
    hl_pts = []
    for i in range(6):
        ang = math.radians(60 * i + 30)
        hl_pts.append((cx + math.cos(ang) * r2, cy - 2 + math.sin(ang) * r2))
    d.polygon(hl_pts, fill=pal["light"])

    # Œil / capteur frontal (vers +X)
    d.ellipse((cx + 3, cy - 2, cx + 8, cy + 3),
              fill=pal["glow"], outline=ACCENT["outline"])
    # Pupille
    d.ellipse((cx + 5, cy, cx + 6, cy + 1), fill=ACCENT["outline"])

    # Petites mandibules avant
    d.line((cx + 8, cy - 1, cx + 12, cy - 4), fill=METAL["darkest"], width=1)
    d.line((cx + 8, cy + 2, cx + 12, cy + 5), fill=METAL["darkest"], width=1)

    return drop_shadow(img, offset=(1, 2), blur=2, opacity=100)


# ---------------------------------------------------------------------------
# SNIPER — 56x56, mech bipédique longue portée
# ---------------------------------------------------------------------------

def render_unit_sniper(side: str):
    W = H = 56
    pal = side_palette(side)
    img, d = new_canvas(W, H)

    cx, cy = W // 2, H // 2

    # Jambes bipédiques (2 colonnes blindées à la base)
    leg_top_y = cy + 6
    leg_bottom_y = cy + 22
    for dx in (-7, 7):
        d.rectangle(
            (cx + dx - 3, leg_top_y, cx + dx + 3, leg_bottom_y),
            fill=METAL["dark"], outline=ACCENT["outline"],
        )
        # Reflet sur la jambe
        d.rectangle((cx + dx - 2, leg_top_y + 1, cx + dx - 1, leg_bottom_y - 2),
                    fill=METAL["light"])
        # Pied / patin
        d.ellipse(
            (cx + dx - 5, leg_bottom_y - 2, cx + dx + 5, leg_bottom_y + 4),
            fill=METAL["darkest"], outline=ACCENT["outline"],
        )

    # Châssis vertical étroit
    body = (cx - 10, cy - 16, cx + 10, cy + 8)
    rounded_rect_with_shading(
        d, body,
        color_base=pal["base"], color_dark=METAL["darkest"],
        color_light=pal["light"], radius=3, outline=ACCENT["outline"],
    )

    # Plaque pectorale (détail décoratif)
    d.rectangle((cx - 4, cy - 6, cx + 4, cy + 2), fill=pal["dark"])
    d.line((cx, cy - 6, cx, cy + 2), fill=ACCENT["outline"])

    # Lunette / scope au sommet
    d.rectangle((cx - 4, cy - 22, cx + 4, cy - 16),
                fill=METAL["base"], outline=ACCENT["outline"])
    # Voyant warning (la "lentille" du scope)
    d.ellipse((cx - 2, cy - 21, cx + 2, cy - 17), fill=ACCENT["warning"])
    d.ellipse((cx - 1, cy - 20, cx, cy - 19), fill=ACCENT["white"])

    # LONG canon avant (signature visuelle "sniper")
    barrel_y0 = cy - 3
    barrel_y1 = cy + 1
    d.rectangle((cx + 10, barrel_y0, cx + 26, barrel_y1),
                fill=METAL["darkest"], outline=ACCENT["outline"])
    # Reflet supérieur du canon
    d.line((cx + 11, barrel_y0 + 1, cx + 25, barrel_y0 + 1),
           fill=METAL["light"])
    # Bouche du canon (muzzle warning)
    d.rectangle((cx + 24, barrel_y0, cx + 26, barrel_y1),
                fill=ACCENT["warning"])
    # Renfort entre châssis et canon (stabilisateur)
    d.rectangle((cx + 8, cy - 5, cx + 12, cy + 3),
                fill=METAL["dark"], outline=ACCENT["outline"])

    return drop_shadow(img, offset=(2, 2), blur=2, opacity=120)


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    repo_root = THIS_DIR.parent.parent
    out_dir = repo_root / "08-art-direction" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)

    to_render = [
        ("unit-swarmer-player.png", render_unit_swarmer, "player"),
        ("unit-swarmer-enemy.png",  render_unit_swarmer, "enemy"),
        ("unit-sniper-player.png",  render_unit_sniper,  "player"),
        ("unit-sniper-enemy.png",   render_unit_sniper,  "enemy"),
    ]

    for name, fn, side in to_render:
        img = fn(side)
        out = out_dir / name
        img.save(out, format="PNG")
        print(f"  {name:28s} {img.size[0]:>3}x{img.size[1]:<3}  → {out.relative_to(repo_root)}")

    print(f"\n{len(to_render)} preview(s) générée(s) dans {out_dir.relative_to(repo_root)}/")
    print("→ Validez les designs avant de copier vers 08-art-direction/sprites/")


if __name__ == "__main__":
    main()
