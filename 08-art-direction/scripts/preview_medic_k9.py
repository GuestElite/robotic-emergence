"""Preview Médic K9 — vue 3/4, 4 pattes visibles, cycle de course (4 frames).

Perspective : vue 3/4 (camera légèrement au-dessus + de côté). Le chien fait
face à +X (droite). On voit le dos + le flanc gauche du robot. Les 4 pattes
sont visibles : les 2 proches (avant-bas du sprite) en gros plan, les 2
lointaines (arrière-haut du sprite) partiellement masquées par le corps.

Animation : trot diagonal classique sur 4 frames (~12fps in-game).
    F0 : diagonale A en appui (front-right + back-left avancées)
    F1 : suspension (corps levé, pattes regroupées)
    F2 : diagonale B en appui (front-left + back-right avancées)
    F3 : suspension (corps levé)

Sorties dans 08-art-direction/preview/medic/k9/ :
    - k9-frame-0.png  ...  k9-frame-3.png   (48x48 chacune)
    - k9-run.gif                            (animation x4 zoomée, 100ms/frame)
    - k9-sheet.png                          (planche des 4 frames côte à côte zoomée)
"""

import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

THIS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(THIS_DIR))

from palette import (
    METAL, ACCENT, TRANSPARENT, side_palette,
    new_canvas, antenna, drop_shadow,
)

MED = {
    "cross":      ( 34, 197,  94, 255),
    "cross_dark": ( 21, 128,  61, 255),
    "cross_glow": (134, 239, 172, 255),
    "white":      (243, 244, 246, 255),
    "white_dark": (209, 213, 219, 255),
}

OUT_DIR = THIS_DIR.parent / "preview" / "medic" / "k9"

# === Animation params =====================================================
NB_FRAMES = 4
# Décalage Y du corps par frame (- = corps soulevé = suspension)
BODY_Y_BOB = [0, -2, 0, -2]
# Décalage X des pattes : trot diagonal.
# Convention : index [front_near, back_near, front_far, back_far]
# Diagonale A (frame 0) : front_near (FR) avance, back_near (BR) recule,
#                         front_far (FL) recule,  back_far (BL) avance.
# Diagonale B (frame 2) : inverse.
LEG_X_PHASE = {
    # leg_id : per-frame x offset (px)
    "front_near": [+3,  0, -3, 0],   # diag A : avance / suspension / recule / suspension
    "back_near":  [-3,  0, +3, 0],   # opposite (diag B)
    "front_far":  [-3,  0, +3, 0],   # diag B (pair de la diagonale arrière-proche)
    "back_far":   [+3,  0, -3, 0],   # diag A
}
# Décalage Y des pattes : on lève le pied uniquement en suspension (frames 1, 3)
LEG_Y_LIFT = [0, -3, 0, -3]


def render_leg(d, base_x, base_y, x_off, y_off, is_far=False):
    """Dessine une patte en 2 segments + paw.
    is_far : patte arrière-plan (couleurs plus sombres + plus petite)."""
    upper = METAL["darkest"] if not is_far else (40, 50, 65, 255)
    lower = METAL["dark"] if not is_far else (40, 50, 65, 255)
    paw_col = METAL["base"] if not is_far else METAL["dark"]
    leg_w = 2 if not is_far else 1
    # Cuisse (segment haut, attaché au corps)
    d.line((base_x, base_y, base_x + x_off, base_y + 4 + y_off),
           fill=upper, width=leg_w + 1)
    # Tibia (segment bas, vers la patte)
    d.line((base_x + x_off, base_y + 4 + y_off, base_x + x_off, base_y + 8 + y_off),
           fill=lower, width=leg_w)
    # Paw (rond au bout)
    pr = 1 if is_far else 2
    d.ellipse((base_x + x_off - pr, base_y + 8 + y_off - pr // 2,
               base_x + x_off + pr, base_y + 8 + y_off + pr),
              fill=paw_col, outline=ACCENT["outline"] if not is_far else None)


def render_k9_frame(frame_idx: int, side: str = "player") -> Image.Image:
    W = H = 48
    pal = side_palette(side, 0)
    img, d = new_canvas(W, H)
    cx, cy = W // 2, H // 2

    body_y_off = BODY_Y_BOB[frame_idx]

    # ── [Layer 0] Ombre au sol (sous le chien, fixe, ne suit PAS le bob) ──
    shadow = Image.new("RGBA", (W, H), TRANSPARENT)
    sd = ImageDraw.Draw(shadow, "RGBA")
    sd.ellipse((cx - 14, cy + 11, cx + 12, cy + 17),
               fill=(0, 0, 0, 90 if body_y_off == 0 else 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, shadow)
    d = ImageDraw.Draw(img, "RGBA")

    # ── [Layer 1] Pattes lointaines (derrière le corps) ──
    # Position attache au corps (top-left/top-right en 3/4)
    far_front_x = cx + 6   # front-far = avant-haut = monté à droite du corps
    far_back_x  = cx - 8   # back-far  = arrière-haut = monté à gauche du corps
    far_y       = cy - 2 + body_y_off
    render_leg(d, far_front_x, far_y,
               LEG_X_PHASE["front_far"][frame_idx],
               LEG_Y_LIFT[frame_idx], is_far=True)
    render_leg(d, far_back_x, far_y,
               LEG_X_PHASE["back_far"][frame_idx],
               LEG_Y_LIFT[frame_idx], is_far=True)

    # ── [Layer 2] Corps en 3/4 (capsule allongée + flanc visible) ──
    body_top    = cy - 4 + body_y_off
    body_bottom = cy + 6 + body_y_off
    body_left   = cx - 12
    body_right  = cx + 10
    # Flanc latéral (rectangle plus sombre sous le dos — donne le volume 3D)
    flank = (body_left + 2, body_top + 4, body_right - 2, body_bottom)
    d.rounded_rectangle(flank, radius=3,
                        fill=pal["dark"], outline=ACCENT["outline"])
    # Dos (rectangle clair plus haut, légèrement décalé en arrière pour 3/4)
    back = (body_left, body_top, body_right - 2, body_top + 7)
    d.rounded_rectangle(back, radius=3,
                        fill=pal["base"], outline=ACCENT["outline"])
    # Bord avant-arrière de transition dos→flanc (liseré clair = arête)
    d.line((body_left + 1, body_top + 7, body_right - 3, body_top + 7),
           fill=pal["light"], width=1)
    # Reflet sur le dos (côté gauche du dos, où la lumière tombe)
    d.line((body_left + 2, body_top + 1, body_right - 6, body_top + 1),
           fill=pal["light"], width=1)

    # ── [Layer 3] Module médical sur le dos (panneau blanc + croix verte) ──
    panel_x0 = cx - 6
    panel_x1 = cx + 4
    panel_y0 = body_top + 1
    panel_y1 = body_top + 7
    d.rounded_rectangle((panel_x0, panel_y0, panel_x1, panel_y1), radius=1,
                        fill=MED["white"], outline=ACCENT["outline"])
    # Croix verte
    mid_x = (panel_x0 + panel_x1) // 2
    mid_y = (panel_y0 + panel_y1) // 2
    d.rectangle((panel_x0 + 1, mid_y, panel_x1 - 1, mid_y + 1), fill=MED["cross"])
    d.rectangle((mid_x, panel_y0 + 1, mid_x + 1, panel_y1 - 1), fill=MED["cross"])

    # ── [Layer 4] Pattes proches (devant le corps, plus grosses) ──
    near_front_x = cx + 6    # avant-bas (proche caméra, devant)
    near_back_x  = cx - 8    # arrière-bas (proche caméra, derrière)
    near_y       = cy + 3 + body_y_off
    render_leg(d, near_front_x, near_y,
               LEG_X_PHASE["front_near"][frame_idx],
               LEG_Y_LIFT[frame_idx], is_far=False)
    render_leg(d, near_back_x, near_y,
               LEG_X_PHASE["back_near"][frame_idx],
               LEG_Y_LIFT[frame_idx], is_far=False)

    # ── [Layer 5] Tête à l'avant droit (3/4, regard +X) ──
    head_x0 = cx + 9
    head_x1 = cx + 17
    head_y0 = cy - 5 + body_y_off
    head_y1 = cy + 4 + body_y_off
    # Crâne (rond légèrement bombé)
    d.rounded_rectangle((head_x0, head_y0, head_x1, head_y1), radius=3,
                        fill=pal["base"], outline=ACCENT["outline"])
    # Museau (petite extension à droite, plus sombre)
    d.rectangle((head_x1, head_y0 + 3, head_x1 + 2, head_y1 - 2),
                fill=pal["dark"], outline=ACCENT["outline"])
    # Scanner LED frontal (œil vert horizontal)
    led_y = head_y0 + 4 + body_y_off - body_y_off  # = head_y0 + 4
    d.rectangle((head_x0 + 4, head_y0 + 2, head_x1 - 1, head_y0 + 5),
                fill=METAL["darkest"])
    d.rectangle((head_x0 + 4, head_y0 + 3, head_x1 - 2, head_y0 + 4),
                fill=MED["cross_glow"])
    # Petit reflet blanc dans la LED
    d.point((head_x1 - 3, head_y0 + 3), fill=ACCENT["white"])
    # Oreilles (2 petits triangles vers le haut)
    d.polygon([(head_x0 + 1, head_y0), (head_x0 + 3, head_y0 - 3),
               (head_x0 + 4, head_y0 + 1)], fill=pal["dark"],
              outline=ACCENT["outline"])
    d.polygon([(head_x1 - 4, head_y0), (head_x1 - 2, head_y0 - 3),
               (head_x1 - 1, head_y0 + 1)], fill=pal["dark"],
              outline=ACCENT["outline"])

    # ── [Layer 6] Queue/antenne à l'arrière (petit module au bout du corps) ──
    tail_x = body_left - 2
    tail_y = body_top + 2
    # Antenne fine + LED verte au bout (pas une vraie queue, plus high-tech)
    d.line((tail_x + 2, tail_y, tail_x - 2, tail_y - 3),
           fill=METAL["darkest"], width=1)
    d.ellipse((tail_x - 3, tail_y - 4, tail_x - 1, tail_y - 2),
              fill=MED["cross_glow"])

    # ── [Layer 7] Halo de soin (anneau vert diffus, statique sur sprite) ──
    halo = Image.new("RGBA", (W, H), TRANSPARENT)
    hd = ImageDraw.Draw(halo, "RGBA")
    hd.ellipse((cx - 20, cy - 4, cx + 20, cy + 18),
               outline=(*MED["cross_glow"][:3], 70), width=2)
    halo = halo.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(halo, img)

    return img


# =============================================================================
# Export : 4 frames PNG + GIF animé + planche
# =============================================================================

def render_sheet(frames):
    """Planche horizontale des 4 frames zoomées x4 avec labels."""
    upx = 4
    pad = 16
    label_h = 22
    cell = 48 * upx
    sheet_w = cell * NB_FRAMES + pad * (NB_FRAMES + 1)
    sheet_h = cell + label_h + pad * 2
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (240, 244, 250, 255))
    sd = ImageDraw.Draw(sheet)

    labels = ["F0 — diagonale A", "F1 — suspension", "F2 — diagonale B", "F3 — suspension"]
    for i, (img, label) in enumerate(zip(frames, labels)):
        x = pad + i * (cell + pad)
        y_label = pad
        y = y_label + label_h
        sd.text((x + 4, y_label + 4), label, fill=(15, 23, 42))
        sd.rectangle((x - 2, y - 2, x + cell + 2, y + cell + 2),
                     outline=(180, 188, 198, 255), width=1)
        up = img.resize((cell, cell), Image.NEAREST)
        sheet.paste(up, (x, y), up)
    return sheet


def render_gif(frames, path: Path, scale: int = 4, duration_ms: int = 100):
    """Export GIF animé à partir des frames (zoom x4, fond beige neutre)."""
    bg = (240, 244, 250, 255)
    enlarged = []
    for f in frames:
        u = f.resize((48 * scale, 48 * scale), Image.NEAREST)
        canvas = Image.new("RGBA", u.size, bg)
        canvas = Image.alpha_composite(canvas, u)
        enlarged.append(canvas.convert("P", palette=Image.ADAPTIVE))
    enlarged[0].save(path, save_all=True, append_images=enlarged[1:],
                     duration=duration_ms, loop=0, optimize=True, disposal=2)


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    frames = [render_k9_frame(i, "player") for i in range(NB_FRAMES)]
    for i, img in enumerate(frames):
        path = OUT_DIR / f"k9-frame-{i}.png"
        img.save(path)
        print(f"  {path.name}  {img.size}")

    sheet = render_sheet(frames)
    sheet.save(OUT_DIR / "k9-sheet.png")
    print(f"  k9-sheet.png  {sheet.size}")

    render_gif(frames, OUT_DIR / "k9-run.gif")
    print(f"  k9-run.gif  (animated)")
