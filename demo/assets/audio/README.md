# Battle SFX — homm3_bright style pack

9 SFX for BR gameplay feedback. **Procedurally synthesized in pure Node** (no ffmpeg / no third-party samples), so license is unambiguous.

## Files
| File | Purpose | Duration | Size |
|---|---|---|---|
| `shoot.wav` | Light-weapon shot (crack + short chirp) | 0.12s | ~5 KB |
| `hit_flesh.wav` | Bullet hits body (low thud + damped noise) | 0.16s | ~7 KB |
| `hit_metal.wav` | Bullet hits armor (bright metallic ring) | 0.25s | ~11 KB |
| `step_grass.wav` | Footstep on grass (soft filtered noise) | 0.09s | ~4 KB |
| `step_dirt.wav` | Footstep on dirt (muffled thud + noise) | 0.11s | ~5 KB |
| `explosion.wav` | Explosion / AoE skill (rumble + burst + sparkle) | 0.65s | ~28 KB |
| `storm_alert.wav` | Storm-ring warning (two 760 Hz beeps) | 0.32s | ~14 KB |
| `kill_confirmed.wav` | Kill confirmation (ascending C-E-G triad) | 0.27s | ~12 KB |
| `victory.wav` | #1 victory fanfare (C-major arpeggio + held chord) | 0.95s | ~41 KB |

Format: 22050 Hz, 16-bit PCM, mono WAV. Directly playable via HTML5 `<audio>` or Web Audio API decodeAudioData.

## Usage (Developer)
```js
const sfx = new Audio('demo/assets/audio/shoot.wav');
sfx.volume = 0.4; sfx.play();
```

For lower latency + overlap (repeat firing), preload via Web Audio API:
```js
const ctx = new AudioContext();
const buf = await ctx.decodeAudioData(await (await fetch('.../shoot.wav')).arrayBuffer());
// Per-shot:
const src = ctx.createBufferSource();
src.buffer = buf;
src.connect(ctx.destination); src.start();
```

## LICENSE
**CC0 (Public Domain).** Procedurally generated via `_build_sfx.mjs` using pure DSP primitives (noise/tone/chirp + filters + ADSR). No sampled audio, no third-party libraries, no attribution required.

Re-generate (after tuning recipes in the script):
```
node demo/assets/audio/_build_sfx.mjs
```

## Notes / tuning
- All files normalized to **-3 dBFS** peak (headroom for game mixer).
- `shoot.wav` intentionally short + HP-filtered to keep it tight on mobile speakers. Too boomy = fatiguing.
- `step_grass` / `step_dirt` separated so Developer can select by tile biome under the player — pure `step_grass` on grass (most of map), `step_dirt` on dirt patches. Makes the world feel grounded.
- `storm_alert` is deliberately square-wave harsh — easy to hear over gunfire.
- `kill_confirmed` is triad (not single beep) so it reads as "reward" not "notification."
- `victory` length < 1s on purpose — longer fanfares irritate on repeated plays during testing.

## If you want higher quality / real samples
Swap for CC0 samples from:
- https://freesound.org (filter → CC0)
- https://opengameart.org (filter → CC0)
- https://sonniss.com/gameaudiogdc (free AAA bundles each GDC)

Put those in this folder with matching filenames, update this README with source URLs.
