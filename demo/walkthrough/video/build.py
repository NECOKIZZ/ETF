"""Builds video/index.html (the HyperFrames composition) from the scene list below.

Clip and voiceover lengths are read from the files, so re-recording a clip or
regenerating a line only needs `python3 build.py` before rendering.
"""

import json
import subprocess
from pathlib import Path

HERE = Path(__file__).parent


def dur(p):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(HERE / p)])
    return round(float(out), 3)


# (id, kind, source, chapter label, voiceover line, vo offset, callout)
SCENES = [
    ("intro", "html", 15.0, None, "01", 0.8, None),
    ("landing", "video", None, ("Home", "/"), "02", 0.5, None),
    ("guide", "video", None, ("Beginner's guide", "first visit"), "03", 0.3, None),
    ("league", "video", None, ("The league", "/league"), "04", 0.5, (11.5, 9.0, "Top half wins", "The top half of ETFs split the bottom half's $5 tickets. Closer to the best return, bigger share.")),
    ("etf", "video", None, ("ETF page", "/etf/…"), "05", 0.3, None),
    ("back", "video", None, ("Back or buy", "on any ETF page"), "06", 0.3, (1.0, 13.5, "Two ways in", "Back the team: a $5 ticket that wins with it.  Buy the ETF: own the same stocks.")),
    ("create", "video", None, ("Create an ETF", "/create"), "07", 0.4, (2.5, 15.0, "The rules", "3–10 stocks · up to 20% crypto · basket ≥ $10 · $5 ticket · stocks come back after the round")),
    ("champion", "video", None, ("Champion", "/agents"), "08", 0.4, None),
    ("infra", "html", 9.6, None, None, 0, None),
    ("champion_etf", "video", None, ("Champion's ETF", "✓ Official"), None, 0, None),
    ("agents", "video", None, ("Your own agent", "/agents"), "09", 0.3, None),
    ("me", "video", None, ("My entries", "/me"), "10", 0.3, None),
    ("results", "video", None, ("Results & verify", "/round/6"), None, 0, (0.2, 3.4, "Verifiable", "Settlement inputs are hashed on-chain. Anyone can recompute the payouts.")),
    ("leaderboard", "video", None, ("Leaderboard", "/leaderboard"), None, 0, None),
    ("outro", "html", 9.8, None, "11", 0.6, None),
]

t = 0.0
timeline = []
for sid, kind, src, chap, vo, vo_off, call in SCENES:
    d = src if kind == "html" else dur(f"assets/{sid}.mp4")
    timeline.append(dict(id=sid, kind=kind, start=round(t, 3), dur=d, chap=chap, vo=vo, vo_off=vo_off, call=call))
    t += d
TOTAL = round(t, 3)

vo_lines = {l.split("|")[0]: l.split("|")[1].strip() for l in (HERE / "audio/vo-lines.txt").read_text().splitlines() if "|" in l}

clips, overlays, audio = [], [], []
for s in timeline:
    if s["kind"] == "video":
        clips.append(
            f'<video id="v-{s["id"]}" class="clip footage" src="assets/{s["id"]}.mp4" data-start="{s["start"]}" data-duration="{s["dur"]}" data-track-index="1" muted playsinline></video>'
        )
    if s["chap"]:
        name, path = s["chap"]
        overlays.append(
            f'<div id="chap-{s["id"]}" class="clip chapter" data-start="{s["start"] + 0.25}" data-duration="{round(s["dur"] - 0.35, 3)}" data-track-index="3">'
            f'<span class="dot"></span><b>{name}</b><span class="path">{path}</span></div>'
        )
    if s["call"]:
        off, d, title, body = s["call"]
        overlays.append(
            f'<div id="call-{s["id"]}" class="clip callout" data-start="{round(s["start"] + off, 3)}" data-duration="{d}" data-track-index="4">'
            f'<div class="t-label">{title}</div><p>{body}</p></div>'
        )
    if s["vo"]:
        vd = dur(f"audio/vo{s['vo']}.wav")
        audio.append(
            f'<audio id="vo-{s["vo"]}" class="clip" src="audio/vo{s["vo"]}.wav" data-start="{round(s["start"] + s["vo_off"], 3)}" data-duration="{vd}" data-track-index="10" data-volume="1"></audio>'
        )

app_start = timeline[1]["start"]
app_end = timeline[-1]["start"]
meta = {s["id"]: {"start": s["start"], "dur": s["dur"], "kind": s["kind"], "call": bool(s["call"])} for s in timeline}

html = (HERE / "template.html.in").read_text()
html = (
    html.replace("{{TOTAL}}", str(TOTAL))
    .replace("{{CLIPS}}", "\n      ".join(clips))
    .replace("{{OVERLAYS}}", "\n      ".join(overlays))
    .replace("{{AUDIO}}", "\n      ".join(audio))
    .replace("{{APP_START}}", str(app_start))
    .replace("{{APP_DUR}}", str(round(app_end - app_start, 3)))
    .replace("{{INTRO}}", json.dumps(meta["intro"]))
    .replace("{{META}}", json.dumps(meta))
)
for sid in ("intro", "infra", "outro"):
    html = html.replace("{{%s_START}}" % sid.upper(), str(meta[sid]["start"])).replace("{{%s_DUR}}" % sid.upper(), str(meta[sid]["dur"]))
(HERE / "index.html").write_text(html)
print(f"total {TOTAL:.1f} s ({int(TOTAL // 60)}:{TOTAL % 60:04.1f})")
for s in timeline:
    print(f"  {s['start']:7.2f}  {s['dur']:6.2f}  {s['id']}" + (f"  vo{s['vo']}" if s["vo"] else ""))
