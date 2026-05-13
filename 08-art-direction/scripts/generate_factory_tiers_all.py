"""Génère TOUS les sprites de factory tier II et III pour TOUS les biomes.

Sorties :
- 08-art-direction/sprites/factory-{type}-player-t{2|3}.png  (universel)
- 08-art-direction/sprites/factory-{type}-enemy-t{2|3}.png   (desert)
- 12-biomes/jungle/sprites/factory-{type}-enemy-t{2|3}.png   (jungle)
- 12-biomes/snow/sprites/factory-{type}-enemy-t{2|3}.png     (snow)

5 types × 2 tiers × 4 variantes = 40 sprites au total.

Importe les render functions depuis preview_factories_all_tiers.py et
preview_factory_light_tiers.py — celles-ci utilisent désormais l'argument
optionnel `pal` pour overrider la palette ennemi (utilisé pour jungle/snow).
"""

import sys
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

REPO_ROOT = THIS_DIR.parent.parent

# Palettes biome enemy (player garde la palette PLAYER bleue universelle)
ENEMY_JUNGLE = {
    "dark":  (31,  74,  31, 255),
    "base":  (79,  123, 58, 255),
    "light": (124, 179, 66, 255),
    "glow":  (164, 255, 56, 255),
}
ENEMY_SNOW = {
    "dark":  (26,  37,  48,  255),
    "base":  (45,  63,  82,  255),
    "light": (74,  97,  120, 255),
    "glow":  (91,  225, 255, 255),
}

from preview_factories_all_tiers import (
    render_factory_heavy_t2, render_factory_heavy_t3,
    render_factory_swarmer_t2, render_factory_swarmer_t3,
    render_factory_sniper_t2, render_factory_sniper_t3,
    render_factory_air_t2, render_factory_air_t3,
)
from preview_factory_light_tiers import (
    render_factory_light_t2, render_factory_light_t3,
)


RENDER_FNS = {
    "light":   (render_factory_light_t2,   render_factory_light_t3),
    "heavy":   (render_factory_heavy_t2,   render_factory_heavy_t3),
    "swarmer": (render_factory_swarmer_t2, render_factory_swarmer_t3),
    "sniper":  (render_factory_sniper_t2,  render_factory_sniper_t3),
    "air":     (render_factory_air_t2,     render_factory_air_t3),
}


def main():
    base_sprites = REPO_ROOT / "08-art-direction" / "sprites"
    jungle_sprites = REPO_ROOT / "12-biomes" / "jungle" / "sprites"
    snow_sprites = REPO_ROOT / "12-biomes" / "snow" / "sprites"

    count = 0
    for type_id, (t2_fn, t3_fn) in RENDER_FNS.items():
        for tier_n, fn in [(2, t2_fn), (3, t3_fn)]:
            # ── PLAYER (universel, va dans 08-art-direction/sprites/)
            img = fn("player")
            path = base_sprites / f"factory-{type_id}-player-t{tier_n}.png"
            img.save(path, format="PNG")
            print(f"  {path.relative_to(REPO_ROOT)}")
            count += 1

            # ── ENEMY DESERT (08-art-direction/sprites/)
            img = fn("enemy")
            path = base_sprites / f"factory-{type_id}-enemy-t{tier_n}.png"
            img.save(path, format="PNG")
            print(f"  {path.relative_to(REPO_ROOT)}")
            count += 1

            # ── ENEMY JUNGLE (palette JUNGLE)
            img = fn("enemy", pal=ENEMY_JUNGLE)
            path = jungle_sprites / f"factory-{type_id}-enemy-t{tier_n}.png"
            img.save(path, format="PNG")
            print(f"  {path.relative_to(REPO_ROOT)}")
            count += 1

            # ── ENEMY SNOW (palette SNOW)
            img = fn("enemy", pal=ENEMY_SNOW)
            path = snow_sprites / f"factory-{type_id}-enemy-t{tier_n}.png"
            img.save(path, format="PNG")
            print(f"  {path.relative_to(REPO_ROOT)}")
            count += 1

    print(f"\n{count} sprites générés.")


if __name__ == "__main__":
    main()
