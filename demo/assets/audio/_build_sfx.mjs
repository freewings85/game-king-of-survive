// Procedural SFX generator. Pure Node — no ffmpeg needed.
// Writes uncompressed 16-bit mono WAV @ 22050 Hz to demo/assets/audio/*.wav.
// Goal: all 9 files < 100 KB each, BR gameplay feedback set.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SR = 22050;

// ── DSP primitives ───────────────────────────────────────────
function make(seconds) { return new Float32Array(Math.round(seconds * SR)); }

function add(dst, src, gain = 1, offset = 0) {
  const n = Math.min(dst.length - offset, src.length);
  for (let i = 0; i < n; i++) dst[i + offset] += src[i] * gain;
}

function tone(freq, seconds, type = 'sine') {
  const buf = make(seconds);
  const w = 2 * Math.PI * freq / SR;
  for (let i = 0; i < buf.length; i++) {
    const phase = w * i;
    if (type === 'sine')     buf[i] = Math.sin(phase);
    else if (type === 'square') buf[i] = Math.sin(phase) > 0 ? 1 : -1;
    else if (type === 'saw')    buf[i] = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
    else if (type === 'tri')    buf[i] = 2 * Math.abs(2 * ((phase / (2 * Math.PI)) % 1) - 1) - 1;
  }
  return buf;
}

function chirp(f0, f1, seconds, type = 'sine') {
  const buf = make(seconds);
  const n = buf.length;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = f0 + (f1 - f0) * t;
    phase += 2 * Math.PI * f / SR;
    if (type === 'sine')     buf[i] = Math.sin(phase);
    else if (type === 'square') buf[i] = Math.sin(phase) > 0 ? 1 : -1;
    else if (type === 'saw')    buf[i] = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
  }
  return buf;
}

function noise(seconds, seed = 1) {
  const buf = make(seconds);
  let s = seed;
  for (let i = 0; i < buf.length; i++) {
    s = (s * 16807) % 2147483647;
    buf[i] = (s / 2147483647) * 2 - 1;
  }
  return buf;
}

// Simple one-pole low-pass (mutable in-place)
function lowpass(buf, cutoff) {
  const a = Math.exp(-2 * Math.PI * cutoff / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y = (1 - a) * buf[i] + a * y;
    buf[i] = y;
  }
  return buf;
}
function highpass(buf, cutoff) {
  const a = Math.exp(-2 * Math.PI * cutoff / SR);
  let y = 0, xPrev = 0;
  for (let i = 0; i < buf.length; i++) {
    y = a * (y + buf[i] - xPrev);
    xPrev = buf[i];
    buf[i] = y;
  }
  return buf;
}

// ADSR envelope applied in-place (or returns new scaled buffer)
function adsr(buf, a, d, s, r, sustainLevel = 0.7) {
  const total = buf.length;
  const aN = Math.round(a * SR);
  const dN = Math.round(d * SR);
  const rN = Math.round(r * SR);
  const sN = Math.max(0, total - aN - dN - rN);
  let idx = 0;
  for (let i = 0; i < aN && idx < total; i++, idx++) buf[idx] *= i / aN;
  for (let i = 0; i < dN && idx < total; i++, idx++) buf[idx] *= 1 - (1 - sustainLevel) * (i / dN);
  for (let i = 0; i < sN && idx < total; i++, idx++) buf[idx] *= sustainLevel;
  for (let i = 0; i < rN && idx < total; i++, idx++) buf[idx] *= sustainLevel * (1 - i / rN);
  return buf;
}

function expDecay(buf, tau) {
  for (let i = 0; i < buf.length; i++) {
    buf[i] *= Math.exp(-i / (SR * tau));
  }
  return buf;
}

function gain(buf, g) {
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
  return buf;
}

// Soft-clip to prevent harsh clipping on sum
function softClip(buf) {
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    buf[i] = Math.tanh(x);
  }
  return buf;
}

// ── WAV writer ───────────────────────────────────────────────
function writeWav(filename, floatBuf) {
  const n = floatBuf.length;
  const bytesPerSample = 2;
  const dataSize = n * bytesPerSample;
  const buf = Buffer.alloc(44 + dataSize);
  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  // fmt chunk
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);            // chunk size
  buf.writeUInt16LE(1, 20);             // PCM
  buf.writeUInt16LE(1, 22);             // mono
  buf.writeUInt32LE(SR, 24);            // sample rate
  buf.writeUInt32LE(SR * bytesPerSample, 28); // byte rate
  buf.writeUInt16LE(bytesPerSample, 32);
  buf.writeUInt16LE(16, 34);            // bits per sample
  // data chunk
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  // find peak to normalize to -3 dBFS (0.707)
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(floatBuf[i]));
  const scale = peak > 0 ? (0.707 / peak) : 1;
  for (let i = 0; i < n; i++) {
    let v = Math.round(floatBuf[i] * scale * 32767);
    if (v > 32767) v = 32767;
    if (v < -32768) v = -32768;
    buf.writeInt16LE(v, 44 + i * 2);
  }
  fs.writeFileSync(filename, buf);
  const kb = (buf.length / 1024).toFixed(1);
  console.log(`  ${path.basename(filename)}: ${n} samples (${(n/SR).toFixed(3)}s), ${kb} KB`);
}

// ── SFX recipes ──────────────────────────────────────────────
function sfxShoot() {
  // Sharp crack: noise burst high-passed + very short downward chirp
  const dur = 0.12;
  const out = make(dur);
  const n = noise(dur, 42);
  highpass(n, 1200);
  expDecay(n, 0.035);
  gain(n, 0.9);
  add(out, n);
  const c = chirp(1400, 300, 0.06);
  expDecay(c, 0.025);
  gain(c, 0.5);
  add(out, c);
  softClip(out);
  return out;
}

function sfxHitFlesh() {
  // Low thud + filtered noise
  const dur = 0.16;
  const out = make(dur);
  const t = chirp(120, 50, 0.1, 'sine');
  expDecay(t, 0.05);
  gain(t, 0.9);
  add(out, t);
  const n = noise(0.06, 7);
  lowpass(n, 2400);
  expDecay(n, 0.025);
  gain(n, 0.5);
  add(out, n);
  return out;
}

function sfxHitMetal() {
  // Bright metallic ring: triangle at ~2.2 kHz + shorter noise attack
  const dur = 0.25;
  const out = make(dur);
  const core = tone(2200, dur, 'tri');
  expDecay(core, 0.08);
  gain(core, 0.55);
  add(out, core);
  const ring = tone(3400, dur, 'sine');
  expDecay(ring, 0.06);
  gain(ring, 0.35);
  add(out, ring);
  const n = noise(0.04, 11);
  highpass(n, 2500);
  expDecay(n, 0.015);
  gain(n, 0.6);
  add(out, n);
  softClip(out);
  return out;
}

function sfxStepGrass() {
  // Soft filtered noise brush
  const dur = 0.09;
  const out = noise(dur, 101);
  lowpass(out, 1800);
  highpass(out, 300);
  expDecay(out, 0.025);
  gain(out, 0.6);
  return out;
}

function sfxStepDirt() {
  // Muffled low thud + short noise
  const dur = 0.11;
  const out = make(dur);
  const n = noise(dur, 55);
  lowpass(n, 900);
  expDecay(n, 0.03);
  gain(n, 0.7);
  add(out, n);
  const thud = tone(110, 0.05, 'sine');
  expDecay(thud, 0.02);
  gain(thud, 0.4);
  add(out, thud);
  return out;
}

function sfxExplosion() {
  // Rumble + noise burst + high-end sparkle
  const dur = 0.65;
  const out = make(dur);
  // low rumble (sub + decay)
  const rumble = chirp(80, 40, dur, 'sine');
  expDecay(rumble, 0.18);
  gain(rumble, 1.0);
  add(out, rumble);
  // noise burst (crunch) — attack
  const burst = noise(0.35, 77);
  lowpass(burst, 3000);
  expDecay(burst, 0.08);
  gain(burst, 0.9);
  add(out, burst);
  // high sparkle tail
  const spark = noise(0.15, 13);
  highpass(spark, 4000);
  expDecay(spark, 0.04);
  gain(spark, 0.4);
  add(out, spark, 1, Math.round(0.04 * SR));
  softClip(out);
  return out;
}

function sfxStormAlert() {
  // Two warning beeps — square at 760 Hz, 120ms on, 80ms gap, 120ms on
  const beepDur = 0.12;
  const gap = 0.08;
  const total = beepDur * 2 + gap;
  const out = make(total);
  const b1 = tone(760, beepDur, 'square');
  adsr(b1, 0.008, 0.02, 0.9, 0.04, 0.9);
  gain(b1, 0.7);
  add(out, b1);
  const b2 = tone(760, beepDur, 'square');
  adsr(b2, 0.008, 0.02, 0.9, 0.04, 0.9);
  gain(b2, 0.7);
  add(out, b2, 1, Math.round((beepDur + gap) * SR));
  softClip(out);
  return out;
}

function sfxKillConfirmed() {
  // Ascending triad: C5 (523), E5 (659), G5 (784) — triangle, each ~90ms
  const each = 0.09;
  const total = each * 3;
  const out = make(total);
  const freqs = [523.25, 659.25, 783.99];
  for (let k = 0; k < 3; k++) {
    const b = tone(freqs[k], each, 'tri');
    adsr(b, 0.006, 0.02, 0.9, 0.03, 0.9);
    gain(b, 0.7);
    add(out, b, 1, Math.round(k * each * SR));
  }
  return out;
}

function sfxVictory() {
  // Fanfare: ascending arpeggio C E G C' then held C-major chord
  const notes = [
    { f: 523.25, t: 0.00, d: 0.12 },
    { f: 659.25, t: 0.10, d: 0.12 },
    { f: 783.99, t: 0.20, d: 0.12 },
    { f: 1046.5, t: 0.30, d: 0.55 },  // held top C
    { f: 523.25, t: 0.30, d: 0.55 },  // root held
    { f: 659.25, t: 0.30, d: 0.55 },  // third held
    { f: 783.99, t: 0.30, d: 0.55 },  // fifth held
  ];
  const total = 0.95;
  const out = make(total);
  for (const n of notes) {
    const b = tone(n.f, n.d, 'tri');
    adsr(b, 0.012, 0.05, 0.65, 0.12, 0.65);
    gain(b, 0.4);
    add(out, b, 1, Math.round(n.t * SR));
    // octave above, softer (harmonic shimmer)
    const h = tone(n.f * 2, n.d, 'sine');
    adsr(h, 0.012, 0.05, 0.5, 0.12, 0.5);
    gain(h, 0.2);
    add(out, h, 1, Math.round(n.t * SR));
  }
  softClip(out);
  return out;
}

// ── run ──────────────────────────────────────────────────────
const jobs = [
  ['shoot.wav',          sfxShoot],
  ['hit_flesh.wav',      sfxHitFlesh],
  ['hit_metal.wav',      sfxHitMetal],
  ['step_grass.wav',     sfxStepGrass],
  ['step_dirt.wav',      sfxStepDirt],
  ['explosion.wav',      sfxExplosion],
  ['storm_alert.wav',    sfxStormAlert],
  ['kill_confirmed.wav', sfxKillConfirmed],
  ['victory.wav',        sfxVictory],
];

console.log('[sfx] generating …');
for (const [name, fn] of jobs) {
  writeWav(path.join(__dirname, name), fn());
}
console.log('[sfx] done');
