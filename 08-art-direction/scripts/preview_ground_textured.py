"""Génère le nouveau tile-ground texturé seamless (sans dégradé baked dans la tile).

Le dégradé final viendra d'un overlay peint au canvas dans drawGround() — c'est
ce qui évite les bandes horizontales lors du tilage. La tile elle-même doit donc
être uniformément colorée avec juste un peu de texture organique pour casser
l'apparence "couleur unie".

Approche : couleur de base sable + ~120 petits points (grain de sable) avec
variations subtiles autour de la couleur de base. Les points sont placés à
distance des bords pour rester tileables visuellement (les seams sont invisibles
car aucun élément ne traverse les bords).

Sortie : 08-art-direction/preview/tile-ground-textured.png
"""

import random
import sys
from pathlib import Path
from PIL import Image, ImageDraw

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from palette import new_canvas, GROUND


def render_tile_ground_textured():
    W = H = 128
    base = GROUND["base"]
    img = Image.new("RGBA", (W, H), base)
    d = ImageDraw.Draw(img)

    rng = random.Random(42)  # seed fixe → reproductible

    # Grains de sable : ~120 micro-points avec variation de luminosité subtile
    for _ in range(120):
        x = rng.randint(0, W - 1)
        y = rng.randint(0, H - 1)
        # Variation de luminosité ±18 sur chaque canal (subtle)
        delta = rng.randint(-18, 18)
        c = (
            max(0, min(255, base[0] + delta)),
            max(0, min(255, base[1] + delta - 3)),
            max(0, min(255, base[2] + delta - 6)),
            255,
        )
        d.point((x, y), fill=c)

    # Une vingtaine de "groupes de grains" légèrement plus visibles
    # (paires de pixels qui donnent une impression de minuscules cailloux)
    for _ in range(20):
        x = rng.randint(2, W - 3)
        y = rng.randint(2, H - 3)
        # Légèrement plus sombre pour faire "petit caillou"
        c_dark = (
            max(0, base[0] - 25),
            max(0, base[1] - 28),
            max(0, base[2] - 30),
            255,
        )
        d.point((x, y), fill=c_dark)
        d.point((x + 1, y), fill=c_dark)

    # ~10 petites taches plus claires (reflet de soleil)
    for _ in range(10):
        x = rng.randint(2, W - 3)
        y = rng.randint(2, H - 3)
        c_light = (
            min(255, base[0] + 20),
            min(255, base[1] + 18),
            min(255, base[2] + 15),
            255,
        )
        d.point((x, y), fill=c_light)

    return img


def main():
    repo_root = THIS_DIR.parent.parent
    out_dir = repo_root / "08-art-direction" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)
    img = render_tile_ground_textured()
    out = out_dir / "tile-ground-textured.png"
    img.save(out, format="PNG")
    print(f"  tile-ground-textured.png  {img.size[0]:>3}x{img.size[1]:<3}  → {out.relative_to(repo_root)}")


if __name__ == "__main__":
    main()
