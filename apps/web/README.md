# PETROCORE — Instruments of Time

A cinematic, fully scroll-driven brand website for a fictional luxury watch maison.
The hero is a **scroll-scrubbed "video"**: a sequence of AI-generated cinematic
stills is cross-dissolved on a `<canvas>` so the timepiece turns and reveals
detail as you scroll — the same technique Apple uses on its product pages.

## ✨ Features

- **Scroll-scrub hero** — a `<canvas>` cross-fades through cinematic frames bound
  to scroll position (`js/main.js`). Smoothed with `requestAnimationFrame` lerp.
- **Live stage caption** that updates as the timepiece turns (The Case → The Dial → …).
- **Pinned horizontal collection** — a sticky section that scrolls sideways as you scroll down.
- **Reveal-on-view** animations, animated counters, line-by-line text reveals.
- **Animated preloader**, scroll progress bar, shrinking glass navbar.
- **Magnetic custom cursor** + spotlight hover on craft cards (pointer devices).
- Fully responsive and respects `prefers-reduced-motion`.

## 🎬 The visuals

All imagery was generated with **Higgsfield** (`soul_2` text-to-image model) as a
day-of-a-timepiece sequence: case → profile → dial → movement → lume → wrist.

> **Note on hosting the images:** the build sandbox's network policy blocks the
> Higgsfield CDN host, so the frames are *referenced by URL* rather than vendored
> into `assets/frames/`. A visitor's browser loads them fine. To self-host, download
> each URL in `js/frames.js` into `assets/frames/` and swap the paths.

> **On "real MPEG video":** Higgsfield's text-to-**video** models require a paid
> plan (the account here is on the free tier), so instead of a single `.mp4` the
> hero plays a **scroll-scrubbed frame sequence** — which is actually the more
> premium, interactive version of "a video that changes with scroll." Once the
> account is upgraded, drop an `.mp4` in and the same scroll logic can drive
> `video.currentTime` instead of canvas frames.

## 🗂 Structure

```
index.html        — markup + section copy
css/style.css     — design system, layout, animations
js/frames.js      — ordered list of cinematic frame URLs (the "video")
js/main.js        — scroll engine: scrubber, reveals, counters, cursor, pinned scroll
```

## 🚀 Run locally

```bash
cd Petrocore
python3 -m http.server 8000   # or: npx serve .
# open http://localhost:8000
```

No build step, no dependencies — plain HTML/CSS/JS.
