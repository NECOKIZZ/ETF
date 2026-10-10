# Product walkthrough video

A 2:52 walkthrough of Median Markets for new users: what the game is, and how to use every page.
Script and shot list: [`SCRIPT.md`](SCRIPT.md). The render goes to `out/walkthrough.mp4`, which is
not committed (too big for git): share the video from a release or video host instead.

## How it's made
1. **Real app, mock data.** `capture/capture.mts` runs the real web app (the Champion PR branch, with
   Champion shown live) in Chromium and drives it like a person would: cursor, clicks, typing,
   smooth scrolling. Every `/api/*` call is answered from `capture/mock.mts` (rounds, ETFs, prices,
   entries, leaderboard), and `capture/inject.js` adds a mock test wallet (with a confirm sheet),
   a simulated clock so a week-long round plays out in seconds (the league chart moves live). The
   app runs on its BNB Chain (mainnet) config; chain reads are answered by the mock too, so no
   real funds move. Each scene is recorded with the
   Chrome screencast into `video/clips/`.
2. **Voice.** Kokoro `af_heart` (feminine) via `hyperframes tts`, one line per scene
   (`video/audio/vo-lines.txt`), normalised to −16 LUFS.
3. **Music.** `music/make_music.py` synthesises a 120 BPM pop bed from scratch (no samples, no
   licence needed). It sits about 16 dB under the voice.
4. **Composition.** `video/build.py` lays the clips, title cards, the Champion infrastructure
   diagram, chapter chips, callouts and audio on one timeline (`video/template.html.in` →
   `video/index.html`), rendered with [HyperFrames](https://hyperframes.heygen.com).

## Rebuild
```bash
# 1. The app, Champion branch, Champion live
cd <ETF checkout on claude/gifted-gates-ge67us>
NEXT_PUBLIC_CHAMPION_URL=https://www.bnbchain.org/en/bnb-agent-studio \
NEXT_PUBLIC_CHAMPION_WALLET=0xc4a3916b2e8f0d47a1b53e9c02f7d6a85e1b4c39 pnpm build
pnpm next start -p 3100

# 2. Here
cd demo/walkthrough && npm install
SITE=https://<your live domain> npx tsx capture/capture.mts       # all scenes → video/clips/
cd video && ./prepare.sh       # voiceover, music, speed-fitted clips → assets/
python3 build.py && npx hyperframes render -o ../out/walkthrough.mp4 -f 30 -q high
```
`SITE` is the address shown in the Agents page's copy-paste message (the app itself runs
locally). Set it to the live domain before recording.

Everything on screen is demo data: no real rounds, wallets or prices.
