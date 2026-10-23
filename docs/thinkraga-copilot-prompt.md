# ThinkRaga prototype: Copilot build prompt

> How to use: follow the ThinkRaga setup guide. Scaffold the project with create-next-app first, open the `thinkraga` folder in VS Code, open Copilot Chat in **Agent** mode, pick the strongest Claude model, and paste everything below the line. Copilot builds one step at a time and stops so you can run, check and commit.

---

You are building the first prototype of **ThinkRaga** (thinkraga.com), a gamified vocal practice app for Hindustani (Indian classical) music. This prototype is ONE screen whose only job is to prove that real-time pitch detection in the browser is accurate and responsive on iPhone Safari and Android Chrome. Keep it small, clean and well structured, because it will grow into the real product.

## What the user does

1. Opens the app on a phone. Sees a short welcome line and a "Tap to start" button (audio must be unlocked by a tap on iOS).
2. Picks their **Sa** (tonic) from a dropdown of note names with Hz, from G2 to D4 (for example "C#3 · 138.6 Hz"), plus a fine-tune slider of -50 to +50 cents. Default C#3 (138.59 Hz). Saved to localStorage.
3. Turns on the **tanpura drone** (toggle + volume slider). It plays at the chosen Sa.
4. Starts the exercise **"Sa Re Ga"**: the app asks for Sa, then Re, then Ga (shuddha, madhya saptak).
5. For each target note the screen shows:
   - the target swara in large type (Devanagari and Latin: "सा Sa", "रे Re", "ग Ga"),
   - a live scrolling **pitch line** (canvas) over horizontal swara guide lines for the whole octave, with the target band highlighted,
   - a tuning indicator: detected swara, cents offset, "sharp" / "flat" arrow, colored green (within 15 cents), amber (within 30), grey otherwise,
   - a progress ring that fills while the voice stays within the tolerance band.
6. A note **locks** after 1.5 s total time in tune (the ring pauses, it does not reset, when they drift). After 10 s without locking, the note ends with whatever it earned.
7. At the end: a results card with a score 0-100 and 1-3 stars per note, a round score, and "Try again". Keep the best round score in localStorage.
8. A small "Use headphones for best results" hint is always visible.

## Tech stack (use exactly this)

- Next.js (latest stable, App Router) + TypeScript (strict) + Tailwind CSS. **This folder is already scaffolded** with `create-next-app --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`. Do not re-run create-next-app; replace the starter page and build on this project.
- `pitchy` for pitch detection (McLeod Pitch Method).
- `zustand` for app state (settings, exercise state).
- `vitest` for unit tests of the pure music logic.
- No backend, no database, no auth, no API routes in this prototype.
- Deploy target: Vercel.
- Add a basic PWA web manifest (`app/manifest.ts`) with name "ThinkRaga", theme color, and placeholder icons. No service worker yet.

## Project structure

```
src/
  app/
    layout.tsx            # fonts, metadata, viewport (no user zoom on the practice screen)
    page.tsx              # the practice screen
    manifest.ts
  components/
    StartGate.tsx         # "Tap to start" that unlocks AudioContext + mic
    SaPicker.tsx
    DroneControls.tsx
    TargetNote.tsx
    PitchCanvas.tsx       # canvas pitch line, driven by requestAnimationFrame
    TuningMeter.tsx
    HoldRing.tsx
    ResultsCard.tsx
  lib/
    audio/
      context.ts          # singleton AudioContext, resume on gesture
      mic.ts              # getUserMedia + AnalyserNode
      pitch.ts            # pitchy wrapper: frame -> { hz, clarity, rms }
      smoothing.ts        # median-of-5 + EMA
      drone.ts            # tanpura drone (see below)
    music/
      swara.ts            # PURE: Hz <-> cents <-> swara, tables, tuning systems
      scoring.ts          # PURE: hold logic, note score, stars, round score
      exercises.ts        # exercise definitions (Sa Re Ga for now)
    store.ts              # zustand store
  hooks/
    usePitchStream.ts     # starts mic, runs detection loop, exposes latest reading via ref + store
tests/
  swara.test.ts
  scoring.test.ts
```

`lib/music/*` must not import any browser API, so it can be unit tested and reused later in a Capacitor app.

## Music domain rules (`lib/music/swara.ts`)

- All pitch is measured in **cents relative to the user's Sa**, never as absolute Western notes: `cents = 1200 * log2(hz / saHz)`.
- Octave (saptak) = `Math.floor(cents / 1200)`: -1 mandra, 0 madhya, 1 taar. Position within octave = `((cents % 1200) + 1200) % 1200`.
- Twelve swaras with short codes. Lower case = komal, `M` = tivra Ma:

| Code | Name | Equal temperament (cents) | Just ratio |
|---|---|---|---|
| S | Shadja (Sa) | 0 | 1/1 |
| r | Komal Rishabh | 100 | 16/15 |
| R | Shuddha Rishabh (Re) | 200 | 9/8 |
| g | Komal Gandhar | 300 | 6/5 |
| G | Shuddha Gandhar (Ga) | 400 | 5/4 |
| m | Shuddha Madhyam (Ma) | 500 | 4/3 |
| M | Tivra Madhyam | 600 | 45/32 |
| P | Pancham (Pa) | 700 | 3/2 |
| d | Komal Dhaivat | 800 | 8/5 |
| D | Shuddha Dhaivat (Dha) | 900 | 5/3 |
| n | Komal Nishad | 1000 | 9/5 |
| N | Shuddha Nishad (Ni) | 1100 | 15/8 |

- Support two tuning systems, `"et"` (default) and `"just"` (cents = 1200*log2(ratio)). Export:
  - `hzToCents(hz, saHz)`, `centsToHz(cents, saHz)`
  - `nearestSwara(cents, tuning) -> { code, octave, targetCents, offsetCents }` (offset in -600..600, wrap correctly near Sa of the next octave)
  - `swaraCents(code, tuning, octave = 0)`
  - `NOTE_OPTIONS`: note names G2..D4 with Hz (A4 = 440 Hz equal temperament) for the Sa picker.
  - Devanagari labels: सा रे ग म प ध नि (komal/tivra marked in the UI with an underline / overline later; a simple "(k)" / "(t)" suffix is fine for now).

## Audio pipeline

- `context.ts`: create ONE AudioContext lazily inside the Start tap handler; call `resume()`. Always read `audioContext.sampleRate`; never assume 44100 (iOS often runs at 48000).
- `mic.ts`: `getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })`. Connect the source to an `AnalyserNode` with `fftSize = 2048` (make it configurable, 4096 for low voices). Do NOT connect the mic to `destination`.
- `pitch.ts`: use `PitchDetector.forFloat32Array(analyser.fftSize)` from pitchy; each frame call `analyser.getFloatTimeDomainData(buf)` then `detector.findPitch(buf, sampleRate)`. Compute RMS. Return null when clarity < 0.9, RMS below a silence threshold (start at 0.01), or hz outside 60-1200.
- `smoothing.ts`: median of the last 5 valid readings (kills octave glitches), then an exponential moving average (alpha 0.35) for drawing. Expose both raw and smoothed.
- `usePitchStream.ts`: run detection in a `requestAnimationFrame` loop. Store the latest reading in a ref and a small ring buffer (last ~4 s) for the canvas. Do NOT put every reading into React state; only push coarse updates (detected swara, cents) into zustand at most ~15 times a second. Clean up tracks and loops on unmount.
- `PitchCanvas.tsx`: draw on a `<canvas>` sized for devicePixelRatio. Y axis = cents relative to Sa, showing roughly -200 to 1400 cents, with labelled guide lines for the 7 shuddha swaras and lighter lines for komal/tivra. X axis = last 4 s of time. Highlight the target band (target ± tolerance).

## Tanpura drone (`lib/audio/drone.ts`)

Build it so the source can be swapped later:

```ts
interface Drone { start(saHz: number): void; stop(): void; setSa(saHz: number): void; setVolume(v: number): void; }
```

- Implement `SynthDrone` now with the classic 4-string tanpura tuning, relative to the chosen (madhya) Sa: mandra Pa = 0.75 × Sa, Sa = 1 × Sa, Sa = 1 × Sa, kharaj Sa = 0.5 × Sa, plucked in that order. Make the first string switchable to mandra Ma (0.6667 × Sa) or Ni (0.9375 × Sa) for ragas without Pa. Each "pluck" is a sawtooth (or a small PeriodicWave with rich harmonics) through a lowpass filter (~1800 Hz) with a gain envelope (fast attack ~20 ms, long decay ~2.5 s). Re-pluck one string every ~0.9 s in sequence, scheduled with `AudioContext.currentTime` (lookahead scheduler, not setInterval drift). Add a gentle `DynamicsCompressor` and master gain.
- Leave a `SampleDrone` stub with a TODO: loops a recorded tanpura `AudioBuffer` with `loop = true` and `playbackRate = targetSa / recordedSa`.
- The drone goes to `destination` only; it must never be routed into the analyser.
- Changing Sa while playing retunes smoothly (`setTargetAtTime`).

## Scoring (`lib/music/scoring.ts`)

Pure functions, fed by timestamped readings:

- Tolerance bands (configurable constants): `perfect = 15`, `close = 30`, `wrong = 50` cents.
- `HoldTracker`: given readings `{ t, cents }` and a target, accumulate time where `|offset| <= close` into `heldMs`; `locked` when `heldMs >= 1500`; `timedOut` at 10000 ms since the note started. Also collect offsets of in-band readings.
- Note score 0-100: `accuracy = clamp(100 * (1 - meanAbsOffset / 50))`, `stability = clamp(1 - stdDev / 40, 0.5, 1)`, `score = round(accuracy * stability * (heldMs / 1500 capped at 1))`.
- Stars: 3 if score >= 85, 2 if >= 70, 1 if >= 50, else 0.
- Round score = mean of note scores.

## Tests (vitest)

- `swara.test.ts`: 138.59 Hz with Sa 138.59 -> S, 0 cents; Sa * 9/8 -> R, ET offset about +4 cents, just offset 0; Sa * 2 -> S octave 1; Sa / 2 -> S octave -1; 3 cents below upper Sa maps to S octave 1 with offset -3 (wrap). Komal and tivra detection.
- `scoring.test.ts`: steady in-tune readings lock at 1.5 s with score near 100 and 3 stars; readings 40 cents off never lock; drifting in and out pauses rather than resets; timeout at 10 s.

## UI and style

- Mobile first (375 px wide), works in portrait, large touch targets, dark theme by default with a warm saffron/indigo accent. Calm, focused, no clutter: this is a riyaz (practice) tool.
- The practice screen fits one phone screen without scrolling while singing.
- Show a clear error state if mic permission is denied, with how to re-enable it on iOS and Android.
- Small debug panel (toggle with a "Debug" link): sample rate, fftSize, raw Hz, clarity, RMS, frames per second. I will use it to compare with a tuner app.

## Working rules for you (Copilot)

- Build in this order and stop after each step to let me run it: (1) scaffold + Sa picker + store, (2) swara.ts + tests, (3) mic + pitch stream + debug panel, (4) pitch canvas + tuning meter, (5) drone, (6) scoring + tests + exercise flow + results.
- TypeScript strict, no `any`. Small components. Comments only where the music or audio logic is non-obvious.
- Mark browser-only components with `"use client"`; never touch `window`, `navigator` or `AudioContext` during server render.
- Don't add libraries beyond the ones listed without asking me.
- After finishing, write a short README: how to run, how to test on a phone via Vercel preview, and the known limitations.
