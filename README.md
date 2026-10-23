# ThinkRaga prototype

A one-screen prototype of ThinkRaga (thinkraga.com), a gamified vocal practice app for Hindustani
classical music. Its job is to prove that real-time pitch detection in the browser is accurate and
responsive on iPhone Safari and Android Chrome.

Pick your Sa, switch on the tanpura, then sing the **Sa Re Ga** exercise. Each swara locks after
1.5 s in tune (within 30 cents); a note ends after 10 s with whatever it earned. You get 0-100 per
note, 1-3 stars, a round score and your best round (saved in the browser).

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests for the music logic (vitest)
npm run lint
npm run build
```

Microphone access needs a secure context. `localhost` works on a computer, but a phone opening
`http://<your-computer-ip>:3000` is blocked by the browser, so test on the phone via Vercel.

## Test on a phone (Vercel preview)

1. Push the repo to GitHub.
2. Import it at https://vercel.com/new (defaults work for Next.js) and deploy. Every push to a
   branch or pull request gets its own `https://….vercel.app` preview URL.
3. Open that URL on the phone, tap **Tap to start** and allow the microphone.
4. Tap **Debug** to compare against a tuner app: sample rate, raw Hz, clarity, input level (RMS) and
   frames per second. The FFT size (2048 / 4096) and the silence gate are adjustable there; if
   detection ignores a quiet voice, lower the gate.

Use headphones: a tanpura played from the speaker leaks into the microphone and confuses detection.

## How it works

- `src/lib/music/` is pure TypeScript with no browser APIs: `swara.ts` (Hz, cents and swaras, ET and
  just tuning), `scoring.ts` (hold tracking, scores, stars) and `exercises.ts`.
- `src/lib/audio/` is the Web Audio side: one shared `AudioContext`, the mic into an `AnalyserNode`,
  pitch detection with [pitchy](https://github.com/ianprime0509/pitchy) (McLeod method), median +
  EMA smoothing, and the tanpura drone (a recording, with a synth fallback).
- `src/hooks/usePitchStream.ts` runs detection every frame and keeps the latest reading in a ref
  and a ring buffer; only a coarse snapshot (about 15 times a second) reaches React state.
- All pitch is in cents relative to the user's Sa, never absolute Western notes.

## Known limitations

- **Tanpura recording:** one recording in C#3, transposed by changing playback speed, so it sounds
  less natural the further your Sa is from C#3. Per-note recordings are the planned fix.
- **Bluetooth headphones:** with the mic open, iOS may switch to a call-quality route or move
  playback to the phone speaker. Wired headphones are the most reliable.
- **Strict scoring:** only the madhya saptak is accepted, and the score formula (see `scoring.ts`)
  is deliberately demanding. The tolerances and hold times are constants.
- **Quiet microphones:** the default silence gate may be too high for some devices; see Debug.
- **Hardware not covered by automated tests:** the audio pipeline was exercised with synthetic tones
  in a desktop browser. Real-voice accuracy on phones is what this prototype is for.
- No backend, accounts, service worker or offline support yet. The manifest uses a placeholder SVG
  icon; iOS home-screen icons need real PNGs.

## Credits

The tanpura recording is cut from "Tanpura 10" by sankalp (CC0), see
[public/audio/CREDITS.md](public/audio/CREDITS.md).
