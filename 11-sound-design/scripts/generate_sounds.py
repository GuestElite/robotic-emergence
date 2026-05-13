"""Synthèse procédurale de tous les sons du jeu (V0 placeholder).

Génère des WAV 16-bit mono à 22050 Hz dans :
  11-sound-design/sfx/     — effets courts
  11-sound-design/music/   — musique de fond bouclable

Pur stdlib (wave / struct / math / random) — aucune dépendance externe.
Si la qualité ne convient pas, on remplacera par des fichiers CC0 (freesound.org,
opengameart.org, etc.) plus tard.

Lancer depuis la racine du repo :
    python3 11-sound-design/scripts/generate_sounds.py
"""

import math
import random
import struct
import sys
import wave
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent.parent
SFX_DIR = REPO_ROOT / "11-sound-design" / "sfx"
MUSIC_DIR = REPO_ROOT / "11-sound-design" / "music"

SAMPLE_RATE = 22050


# ---------------------------------------------------------------------------
# Helpers de synthèse
# ---------------------------------------------------------------------------

def write_wav(path: Path, samples, sample_rate: int = SAMPLE_RATE):
    """Écrit une liste de floats [-1, 1] en WAV 16-bit signé mono."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        data = bytearray()
        for s in samples:
            v = max(-1.0, min(1.0, s))
            v16 = int(v * 32767)
            data += struct.pack("<h", v16)
        w.writeframes(bytes(data))


def sine(freq: float, duration: float, amp: float = 1.0):
    n = int(duration * SAMPLE_RATE)
    return [amp * math.sin(2 * math.pi * freq * i / SAMPLE_RATE) for i in range(n)]


def square(freq: float, duration: float, amp: float = 1.0):
    n = int(duration * SAMPLE_RATE)
    out = []
    for i in range(n):
        v = math.sin(2 * math.pi * freq * i / SAMPLE_RATE)
        out.append(amp if v >= 0 else -amp)
    return out


def sweep(freq_start: float, freq_end: float, duration: float, amp: float = 1.0,
          square_wave: bool = False):
    """Sweep de fréquence linéaire."""
    n = int(duration * SAMPLE_RATE)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / max(n - 1, 1)
        f = freq_start + (freq_end - freq_start) * t
        phase += 2 * math.pi * f / SAMPLE_RATE
        v = math.sin(phase)
        if square_wave:
            v = 1.0 if v >= 0 else -1.0
        out.append(amp * v)
    return out


def noise(duration: float, amp: float = 1.0, seed=None):
    n = int(duration * SAMPLE_RATE)
    rng = random.Random(seed) if seed is not None else random
    return [amp * (rng.random() * 2 - 1) for _ in range(n)]


def envelope_ad(samples, attack_s: float = 0.005, release_s: float = None):
    """Enveloppe attack-release (fade in/out). release_s par défaut = reste de la durée."""
    n = len(samples)
    a = max(1, int(attack_s * SAMPLE_RATE))
    if release_s is None:
        r = n - a
    else:
        r = max(1, int(release_s * SAMPLE_RATE))
    out = []
    for i, s in enumerate(samples):
        if i < a:
            amp = i / a
        elif i >= n - r:
            amp = max(0.0, (n - i) / r)
        else:
            amp = 1.0
        out.append(s * amp)
    return out


def exp_decay(samples, decay_rate: float = 8.0):
    """Décroissance exponentielle (decay_rate = vitesse, 8 = rapide)."""
    n = len(samples)
    return [s * math.exp(-decay_rate * i / n) for i, s in enumerate(samples)]


def mix(*tracks):
    """Mixe plusieurs pistes (pad les plus courtes à 0)."""
    if not tracks:
        return []
    max_len = max(len(t) for t in tracks)
    out = [0.0] * max_len
    for t in tracks:
        for i in range(len(t)):
            out[i] += t[i]
    # Soft clip (tanh-like)
    return [math.tanh(s) for s in out]


def delay(samples, delay_s: float, feedback: float = 0.4, mix_amount: float = 0.5):
    """Ajoute un écho simple."""
    delay_n = int(delay_s * SAMPLE_RATE)
    out = list(samples) + [0.0] * delay_n
    for i in range(len(samples)):
        if i + delay_n < len(out):
            out[i + delay_n] += samples[i] * mix_amount
        if i + 2 * delay_n < len(out):
            out[i + 2 * delay_n] += samples[i] * mix_amount * feedback
    return [math.tanh(s) for s in out]


def lowpass(samples, window: int = 8):
    """Lowpass très basique (moyenne glissante)."""
    out = []
    acc = 0.0
    buf = []
    for s in samples:
        buf.append(s)
        acc += s
        if len(buf) > window:
            acc -= buf.pop(0)
        out.append(acc / len(buf))
    return out


# ---------------------------------------------------------------------------
# SFX — Tirs d'unités
# ---------------------------------------------------------------------------

def sfx_unit_light_shoot():
    """Laser zap court et aigu, 0.15s."""
    s = sweep(1800, 700, 0.15, amp=0.55, square_wave=False)
    s = exp_decay(s, decay_rate=6)
    return envelope_ad(s, attack_s=0.003, release_s=0.05)


def sfx_unit_heavy_shoot():
    """Canon lourd basse fréquence + bruit, 0.4s."""
    bass = sine(75, 0.4, amp=0.7)
    bass = exp_decay(bass, decay_rate=4)
    n = noise(0.4, amp=0.45, seed=1)
    n = lowpass(n, window=15)
    n = exp_decay(n, decay_rate=8)
    s = mix(bass, n)
    return envelope_ad(s, attack_s=0.002, release_s=0.1)


def sfx_unit_swarmer_shoot():
    """Chirp rapide et aigu, 0.08s — comme un insecte qui tire."""
    s = sweep(2800, 1400, 0.08, amp=0.45)
    s = exp_decay(s, decay_rate=12)
    return envelope_ad(s, attack_s=0.002, release_s=0.02)


def sfx_unit_sniper_shoot():
    """Boom long avec écho — signature 'tir précis longue portée'."""
    bass = sine(120, 0.25, amp=0.6)
    bass = exp_decay(bass, decay_rate=5)
    crack = noise(0.08, amp=0.5, seed=2)
    crack = exp_decay(crack, decay_rate=20)
    body = mix(bass, crack)
    body = envelope_ad(body, attack_s=0.001, release_s=0.08)
    # Écho lointain
    full = delay(body, delay_s=0.18, feedback=0.5, mix_amount=0.4)
    return full


# ---------------------------------------------------------------------------
# SFX — Environnement / impacts
# ---------------------------------------------------------------------------

def sfx_unit_death():
    """Mort d'un robot : explosion + descente tonale 'sad', 0.5s."""
    expl = noise(0.5, amp=0.55, seed=3)
    expl = lowpass(expl, window=6)
    expl = exp_decay(expl, decay_rate=5)
    descent = sweep(450, 80, 0.5, amp=0.3)
    descent = exp_decay(descent, decay_rate=2.5)
    s = mix(expl, descent)
    return envelope_ad(s, attack_s=0.002, release_s=0.12)


def sfx_unit_crash_rampart():
    """Vraie explosion : punch grave + burst noise large bande + rumble long."""
    # 1. Punch initial très grave (55Hz, attaque ultra rapide)
    punch = sine(55, 0.18, amp=0.9)
    punch = exp_decay(punch, decay_rate=7)
    # 2. Body de l'explosion (white noise, decay rapide)
    body = noise(0.5, amp=0.8, seed=4)
    body = exp_decay(body, decay_rate=5.5)
    # 3. Crépitement mid (noise high-pass approximé par différence)
    crackle_src = noise(0.3, amp=0.55, seed=44)
    crackle = []
    prev = 0.0
    for s in crackle_src:
        crackle.append(s - prev)
        prev = s
    crackle = exp_decay(crackle, decay_rate=9)
    # 4. Sub-bass rumble long (40Hz qui traîne après l'impact)
    rumble = sine(40, 0.75, amp=0.5)
    rumble = exp_decay(rumble, decay_rate=2.8)
    # 5. Sweep descendant pour l'effet "ça s'écroule"
    drop = sweep(200, 45, 0.35, amp=0.45)
    drop = exp_decay(drop, decay_rate=4)
    # Mix complet
    s = mix(punch, body, crackle, rumble, drop)
    return envelope_ad(s, attack_s=0.0005, release_s=0.18)


def sfx_effect_lightning():
    """Foudre : crack initial + rumble basse profond + queue longue, ~1.5s."""
    # Crack initial (court mais punchy)
    crack = noise(0.08, amp=0.9, seed=5)
    crack = envelope_ad(crack, attack_s=0.001, release_s=0.05)
    # Double rumble (48Hz + 72Hz) qui décroît lentement → impression de tonnerre roulant
    rumble = mix(sine(48, 1.3, amp=0.50), sine(72, 1.3, amp=0.32))
    rumble = exp_decay(rumble, decay_rate=1.6)
    # Tail de bruit filtré (vent / écho lointain) plus long
    tail = noise(1.1, amp=0.38, seed=6)
    tail = lowpass(tail, window=30)
    tail = exp_decay(tail, decay_rate=1.8)
    # Ajout d'un sub-rumble très grave qui traîne jusqu'à la fin (terre qui tremble)
    sub = sine(36, 1.4, amp=0.30)
    sub = exp_decay(sub, decay_rate=1.2)
    # Assemblage : crack devant, le reste décalé pour donner un effet d'écho
    crack_padded = list(crack) + [0.0] * int(1.45 * SAMPLE_RATE)
    rumble_padded = [0.0] * int(0.05 * SAMPLE_RATE) + list(rumble)
    tail_padded = [0.0] * int(0.10 * SAMPLE_RATE) + list(tail)
    sub_padded = [0.0] * int(0.04 * SAMPLE_RATE) + list(sub)
    s = mix(crack_padded, rumble_padded, tail_padded, sub_padded)
    return envelope_ad(s, attack_s=0.001, release_s=0.25)


# ---------------------------------------------------------------------------
# Musique de fond
# ---------------------------------------------------------------------------

def bgm_epic(duration: float = 30.0):
    """Musique de fond 'épique' en ré mineur :
    - sub-bass drone D2 (chaleur)
    - pad d'open 5ths (D3 + A3) avec respiration LFO
    - heartbeat à 70 BPM (kick filtré)
    - mélodie 8 notes au-dessus (D4 → D5 climax → D4 résolution)

    Fade in / fade out 2s aux extrémités → boucle sans pop.
    """
    n = int(duration * SAMPLE_RATE)
    out = [0.0] * n

    BPM = 70
    beat_s = 60.0 / BPM  # 0.857s par temps

    # ----- Couche 1 : Sub-bass drone (D2 = 73.42Hz) -----
    for i in range(n):
        t = i / SAMPLE_RATE
        out[i] += 0.13 * math.sin(2 * math.pi * 73.42 * t)

    # ----- Couche 2 : Open 5th pad (D3 + A3) avec LFO de respiration -----
    for i in range(n):
        t = i / SAMPLE_RATE
        pad_lfo = 0.65 + 0.35 * math.sin(2 * math.pi * 0.08 * t)
        d3 = 0.11 * math.sin(2 * math.pi * 146.83 * t)
        a3 = 0.10 * math.sin(2 * math.pi * 220.00 * t + 0.7)
        # Légère 8ve aiguë pour brillance
        d4_soft = 0.04 * math.sin(2 * math.pi * 293.66 * t + 1.3)
        out[i] += (d3 + a3 + d4_soft) * pad_lfo

    # ----- Couche 3 : Heartbeat (1 kick par temps, 70 BPM) -----
    kick_dur_s = 0.18
    kick_n = int(kick_dur_s * SAMPLE_RATE)
    total_beats = int(duration / beat_s)
    for beat in range(total_beats):
        start = int(beat * beat_s * SAMPLE_RATE)
        for i in range(kick_n):
            if start + i >= n:
                break
            # Pitch envelope (descend de 110 vers 50Hz au cours du kick)
            f = 110 - 60 * (i / kick_n)
            phase = 2 * math.pi * f * i / SAMPLE_RATE
            decay = math.exp(-14 * i / kick_n)
            out[start + i] += 0.20 * math.sin(phase) * decay

    # ----- Couche 4 : Mélodie en ré mineur -----
    # Structure 8 notes × 3 temps chacune = 24 temps × 0.857s = 20.6s
    # Démarre à t=3s pour laisser l'intro respirer
    melody_notes = [
        (293.66, 3),  # D4
        (349.23, 3),  # F4 (tierce mineure)
        (440.00, 3),  # A4 (quinte)
        (587.33, 3),  # D5 (octave — climax)
        (523.25, 3),  # C5 (descente)
        (440.00, 3),  # A4
        (349.23, 3),  # F4
        (293.66, 3),  # D4 (résolution)
    ]
    cursor = 3.0  # intro 3s avant la mélodie
    for freq, beats in melody_notes:
        note_dur = beats * beat_s
        start = int(cursor * SAMPLE_RATE)
        note_n = int(note_dur * SAMPLE_RATE)
        attack_n = int(0.15 * SAMPLE_RATE)
        release_n = int(0.4 * SAMPLE_RATE)
        for i in range(note_n):
            if start + i >= n:
                break
            t_local = i / SAMPLE_RATE
            # Vibrato léger
            vib = 1 + 0.008 * math.sin(2 * math.pi * 4.5 * t_local)
            # Enveloppe ADSR
            if i < attack_n:
                env = i / attack_n
            elif i > note_n - release_n:
                env = max(0.0, (note_n - i) / release_n)
            else:
                env = 1.0
            # Onde : fondamentale + harmonique 2 (riche, pas trop pure)
            w = (0.7 * math.sin(2 * math.pi * freq * vib * t_local) +
                 0.18 * math.sin(2 * math.pi * 2 * freq * vib * t_local))
            out[start + i] += 0.22 * w * env
        cursor += note_dur

    # ----- Fade in/out 2s pour bouclage propre -----
    fade_n = int(2.0 * SAMPLE_RATE)
    for i in range(fade_n):
        out[i] *= i / fade_n
        out[-i - 1] *= i / fade_n

    # Soft clip pour éviter le clipping dur
    return [math.tanh(s) for s in out]


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    sfx = [
        ("unit-light-shoot.wav",     sfx_unit_light_shoot),
        ("unit-heavy-shoot.wav",     sfx_unit_heavy_shoot),
        ("unit-swarmer-shoot.wav",   sfx_unit_swarmer_shoot),
        ("unit-sniper-shoot.wav",    sfx_unit_sniper_shoot),
        ("unit-death.wav",           sfx_unit_death),
        ("unit-crash-rampart.wav",   sfx_unit_crash_rampart),
        ("effect-lightning.wav",     sfx_effect_lightning),
    ]
    # NB: la musique de fond utilise maintenant "Pathfinder" de Scott Buckley
    # (CC-BY 4.0) téléchargée dans music/bgm-pathfinder.mp3. La fonction
    # bgm_epic() est conservée plus haut au cas où on voudrait refaire un fallback
    # synthétique, mais elle n'est plus appelée par défaut.
    music = []

    print("== SFX ==")
    for name, fn in sfx:
        samples = fn()
        out = SFX_DIR / name
        write_wav(out, samples)
        dur = len(samples) / SAMPLE_RATE
        size_kb = out.stat().st_size / 1024
        print(f"  {name:30s} {dur:5.2f}s  {size_kb:>5.1f} KB  → {out.relative_to(REPO_ROOT)}")

    print("\n== MUSIC ==")
    for name, fn in music:
        samples = fn()
        out = MUSIC_DIR / name
        write_wav(out, samples)
        dur = len(samples) / SAMPLE_RATE
        size_kb = out.stat().st_size / 1024
        print(f"  {name:30s} {dur:5.1f}s  {size_kb:>5.1f} KB  → {out.relative_to(REPO_ROOT)}")

    print(f"\nGénération terminée.")
    print(f"→ Double-clique sur les .wav depuis le Finder pour les écouter.")


if __name__ == "__main__":
    main()
