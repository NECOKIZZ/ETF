"""Lively background bed for the walkthrough, synthesised from scratch (no samples, no licence).

120 BPM, C major pop progression (C G Am F), kick, clap, hats, bass, plucked chords
and a bright arpeggio. Sections thin out and build so it doesn't loop flatly.

    python3 make_music.py out.wav [seconds]
"""

import sys
import numpy as np
from scipy.signal import butter, lfilter
import soundfile as sf

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
LEN = float(sys.argv[2]) if len(sys.argv) > 2 else 200.0
OUT = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
rng = np.random.default_rng(7)

n = int(LEN * SR)
L = np.zeros(n)
R = np.zeros(n)


def place(sig, t, pan=0.0, gain=1.0):
    i = int(t * SR)
    if i >= n:
        return
    j = min(n, i + len(sig))
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt(0.5 * (1 - pan))
    R[i:j] += s * np.sqrt(0.5 * (1 + pan))


def env(dur, a=0.005, d=0.2):
    t = np.arange(int(dur * SR)) / SR
    e = np.minimum(1, t / a) * np.exp(-t / d)
    return e


def lp(x, fc, order=2):
    b, a = butter(order, min(fc, SR / 2 - 100) / (SR / 2), "low")
    return lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), "high")
    return lfilter(b, a, x)


def saw(freq, dur, detune=0.0):
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t)
    for d in (-detune, 0, detune):
        ph = (t * freq * (1 + d)) % 1
        out += 2 * ph - 1
    return out / 3


def kick():
    t = np.arange(int(0.35 * SR)) / SR
    f = 50 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) * 0.9


def clap():
    t = np.arange(int(0.25 * SR)) / SR
    noise = rng.standard_normal(len(t))
    e = np.exp(-t * 22) + 0.6 * np.exp(-((t - 0.012) ** 2) / 1e-5)
    return hp(lp(noise, 5000), 900) * e * 0.35


def hat(open_=False):
    dur = 0.18 if open_ else 0.05
    t = np.arange(int(dur * SR)) / SR
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * (18 if open_ else 70)) * 0.18


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


# C G Am F, voiced around middle C.
CHORDS = [[60, 64, 67, 72], [59, 62, 67, 71], [57, 60, 64, 69], [57, 60, 65, 69]]
ROOTS = [36, 43, 45, 41]
ARP = [[72, 76, 79, 84], [71, 74, 79, 83], [69, 72, 76, 81], [69, 72, 77, 81]]

K, C, H = kick(), clap(), hat()
HO = hat(True)

bars = int(LEN / BAR) + 1
for b in range(bars):
    t0 = b * BAR
    ci = b % 4
    # Energy: intro (bars 0-3) light, then full with a breakdown every 16 bars.
    intro = b < 4
    breakdown = (b % 16) in (12, 13)
    for beat in range(4):
        tb = t0 + beat * BEAT
        if not intro and not breakdown:
            place(K, tb, gain=0.9)
        if beat in (1, 3) and not intro:
            place(C, tb, pan=0.05)
        for k in range(2):
            place(H if k == 0 else HO, tb + k * BEAT / 2, pan=0.3, gain=0.8 if k else 0.6)
    # Bass: pumping eighths on the root.
    if not intro:
        for e8 in range(8):
            tn = t0 + e8 * BEAT / 2
            f = midi(ROOTS[ci] + (12 if e8 in (3, 7) else 0))
            s = lp(saw(f, BEAT / 2 * 0.9, 0.003), 600) * env(BEAT / 2 * 0.9, 0.004, 0.12)
            place(s, tn, gain=0.55 * (0.6 if breakdown else 1))
    # Plucked chords on the off-beats (house-style stabs).
    for beat in range(4):
        tn = t0 + beat * BEAT + BEAT / 2
        dur = BEAT * 0.45
        s = sum(saw(midi(m), dur, 0.006) for m in CHORDS[ci])
        s = lp(s, 2400) * env(dur, 0.003, 0.09)
        place(s, tn, pan=-0.25, gain=0.16)
    # Sparkly arpeggio, sixteenths, after the intro.
    if b >= 2:
        for s16 in range(16):
            tn = t0 + s16 * BEAT / 4
            m = ARP[ci][s16 % 4] + (12 if (s16 // 4) % 2 and b % 8 >= 4 else 0)
            t = np.arange(int(BEAT / 4 * SR)) / SR
            tone = np.sin(2 * np.pi * midi(m) * t) + 0.3 * np.sin(4 * np.pi * midi(m) * t)
            place(tone * env(BEAT / 4, 0.002, 0.06), tn, pan=0.35 * (1 if s16 % 2 else -1), gain=0.07)
    # Soft pad underneath.
    pad = sum(saw(midi(m - 12), BAR, 0.01) for m in CHORDS[ci][:3])
    pad = lp(pad, 900) * np.minimum(1, np.arange(int(BAR * SR)) / SR / 0.3)
    place(pad, t0, gain=0.035)

mix = np.stack([L, R], axis=1)
# Simple stereo room: short tapped delays.
for d, g in ((0.031, 0.18), (0.047, 0.14), (0.083, 0.09)):
    k = int(d * SR)
    mix[k:, 0] += mix[:-k, 1] * g
    mix[k:, 1] += mix[:-k, 0] * g
# Fade in/out and normalise.
fi, fo = int(1.5 * SR), int(4 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]
mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.2) * 0.85
sf.write(OUT, mix.astype(np.float32), SR)
print(OUT, LEN, "s")
