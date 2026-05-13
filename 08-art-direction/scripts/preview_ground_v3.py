"""Génère le tile-ground v3 : plaine de sable lisse, tileable.

Changements vs v2 :
- Pas de damier (qui donnait un effet échiquier)
- Pas de plaques métalliques bleues (sortaient de la palette sable)
- Pas de 120 cailloux disséminés (visuellement bruité)
- À la place : variations de tons doux par blobs blurrés (palette GROUND uniquement),
  quelques ripples de sable, une poignée de grains discrets

Garantie de tileabilité : les patches sont "wrappés" sur les 4 bords (ghost copies).

Sortie : 08-art-direction/preview/tile-ground-v3.png
"""

import math
import random
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from palette import new_canvas, vertical_gradient, GROUND


def draw_tiled_patch(pd, x, y, r, color, W, H):
    """Dessine une ellipse + ses 8 ghosts (toutes les directions) pour tileabilité."""
    for dx in (-W, 0, W):
        for dy in (-H, 0, H):
            pd.ellipse((x + dx - r, y + dy - r, x + dx + r, y + dy + r),
                       fill=color)


def render_tile_ground_v3() -> Image.Image:
    W = H = 128

    # Base : gradient sable vertical (de base → dark)
    img = vertical_gradient(W, H, GROUND["base"], GROUND["dark"]).convert("RGBA")

    # Couche de patches doux (variations de tons), avec blur → transitions douces
    rng = random.Random(7)
    patches = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(patches)

    # ~12 patches : moitié clairs (light), moitié sombres (darkest)
    for _ in range(14):
        x = rng.randint(0, W - 1)
        y = rng.randint(0, H - 1)
        r = rng.randint(18, 36)
        if rng.random() < 0.5:
            c = (GROUND["light"][0], GROUND["light"][1], GROUND["light"][2], 55)
        else:
            c = (GROUND["darkest"][0], GROUND["darkest"][1], GROUND["darkest"][2], 40)
        draw_tiled_patch(pd, x, y, r, c, W, H)

    # Blur fort pour transitions douces (sable lissé par le vent)
    patches = patches.filter(ImageFilter.GaussianBlur(radius=10))
    img = Image.alpha_composite(img, patches)

    # Couche détails fins
    d = ImageDraw.Draw(img)

    # Quelques ripples de sable (lignes sinusoïdales très subtiles)
    rng_r = random.Random(13)
    ripple_color = (GROUND["darkest"][0], GROUND["darkest"][1],
                    GROUND["darkest"][2], 70)
    for _ in range(5):
        # Origine bien à l'intérieur (marge > amplitude)
        x0 = rng_r.randint(5, W - 45)
        y0 = rng_r.randint(8, H - 8)
        length = rng_r.randint(25, 40)
        amp = rng_r.uniform(1.5, 3.0)
        phase = rng_r.uniform(0, math.pi)
        prev = None
        for dx in range(0, length, 1):
            y = y0 + amp * math.sin(dx / 5 + phase)
            cur = (x0 + dx, y)
            if prev:
                d.line((prev[0], prev[1], cur[0], cur[1]),
                       fill=ripple_color, width=1)
            prev = cur

    # Une petite poignée de grains (15, pas 120) — pour ne pas refaire le bruit
    rng_g = random.Random(21)
    for _ in range(15):
        x = rng_g.randint(2, W - 3)
        y = rng_g.randint(2, H - 3)
        c = GROUND["light"] if rng_g.random() > 0.5 else GROUND["darkest"]
        d.point((x, y), fill=c)

    return img


def main():
    repo_root = THIS_DIR.parent.parent
    out_dir = repo_root / "08-art-direction" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)
    img = render_tile_ground_v3()
    out = out_dir / "tile-ground-v3.png"
    img.save(out, format="PNG")
    print(f"  tile-ground-v3.png             {img.size[0]:>4}x{img.size[1]:<4}  → {out.relative_to(repo_root)}")


if __name__ == "__main__":
    main()
