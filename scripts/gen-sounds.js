#!/usr/bin/env node
// Generates the bundled notification sounds as royalty-free WAV files.
//
// Two themes are produced, both 16-bit PCM mono @ 44.1kHz:
//   - mac:   polished bell/chime tones (inharmonic partials, natural ring-out)
//   - retro: chiptune pulse/triangle tones (classic game-console voices)
//
// Regenerate with: npm run gen-sounds

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'sounds');

const SAMPLE_RATE = 44100;

/** Musical note frequencies (Hz). */
const N = {
  E3: 164.81, A3: 220.0, C4: 261.63,
  A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25,
  G5: 783.99, A5: 880.0, C6: 1046.5,
};

/** Encode Float samples in [-1, 1] to a 16-bit PCM mono WAV Buffer. */
function encodeWav(samples) {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);        // fmt chunk size
  buffer.writeUInt16LE(1, 20);         // PCM
  buffer.writeUInt16LE(1, 22);         // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);         // block align
  buffer.writeUInt16LE(16, 34);        // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  let offset = 44;
  for (const s of samples) {
    const clamped = Math.max(-1, Math.min(1, s));
    buffer.writeInt16LE(Math.round(clamped * 32767), offset);
    offset += 2;
  }
  return buffer;
}

// ---------------------------------------------------------------------------
// mac theme — warm bell/chime tones.
//
// Each note is additive: a fundamental plus slightly inharmonic upper
// partials (ratios just off whole numbers, like a real bell) that decay
// faster than the fundamental. Notes are scheduled by onset time and mixed
// into a shared buffer instead of being concatenated, so they ring past
// their nominal duration and overlap the next note — the "ta-da" feel of a
// real chime instead of a hard-cut beep.
// ---------------------------------------------------------------------------

const BELL_PARTIALS = [
  { ratio: 1.00, gain: 1.00, decayMul: 1.00 },
  { ratio: 2.01, gain: 0.34, decayMul: 0.55 },
  { ratio: 3.99, gain: 0.16, decayMul: 0.32 },
  { ratio: 6.02, gain: 0.08, decayMul: 0.18 },
];

function bellSample(freq, t, attack, decayTau) {
  const a = Math.min(1, t / attack);
  let s = 0;
  for (const p of BELL_PARTIALS) {
    const env = a * Math.exp(-t / (decayTau * p.decayMul));
    s += Math.sin(2 * Math.PI * freq * p.ratio * t) * p.gain * env;
  }
  return s;
}

/**
 * Render bell notes into one mixed buffer.
 * @param {Array<{freq:number, onset:number, gain?:number, attack?:number, decayTau?:number}>} notes
 */
function renderChime(notes) {
  const RING_TAIL = 6; // render until e^-6 (~0.25%) of the envelope remains
  let totalLen = 0;
  for (const n of notes) {
    const decayTau = n.decayTau ?? 0.35;
    totalLen = Math.max(totalLen, n.onset + decayTau * RING_TAIL);
  }
  const count = Math.ceil(totalLen * SAMPLE_RATE) + 1;
  const buf = new Float64Array(count);
  for (const n of notes) {
    const attack = n.attack ?? 0.005;
    const decayTau = n.decayTau ?? 0.35;
    const gain = n.gain ?? 0.5;
    const startSample = Math.round(n.onset * SAMPLE_RATE);
    for (let idx = startSample; idx < count; idx++) {
      const t = (idx - startSample) / SAMPLE_RATE;
      buf[idx] += bellSample(n.freq, t, attack, decayTau) * gain;
    }
  }
  return Array.from(buf);
}

const MAC_SOUNDS = {
  // Task done: bright rising arpeggio, notes overlap and ring together.
  complete: renderChime([
    { freq: N.C5, onset: 0.00, gain: 0.45, decayTau: 0.28 },
    { freq: N.E5, onset: 0.09, gain: 0.45, decayTau: 0.30 },
    { freq: N.G5, onset: 0.18, gain: 0.50, decayTau: 0.45 },
    { freq: N.C6, onset: 0.27, gain: 0.30, decayTau: 0.55 },
  ]),
  // Waiting for approval: two crisp pings, repeated once, shorter ring so
  // the repeat stays clear instead of blurring together.
  waiting: renderChime([
    { freq: N.A5, onset: 0.00, gain: 0.45, decayTau: 0.14 },
    { freq: N.D5, onset: 0.11, gain: 0.45, decayTau: 0.16 },
    { freq: N.A5, onset: 0.32, gain: 0.45, decayTau: 0.14 },
    { freq: N.D5, onset: 0.43, gain: 0.45, decayTau: 0.20 },
  ]),
  // Idle / your turn: soft single low tone, long gentle decay.
  idle: renderChime([
    { freq: N.A4, onset: 0, gain: 0.35, attack: 0.010, decayTau: 0.55 },
  ]),
  // Subagent finished: quick high blip, almost no ring.
  subagent: renderChime([
    { freq: N.C6, onset: 0, gain: 0.40, attack: 0.003, decayTau: 0.10 },
  ]),
  // Error / command failed: low descending pair, warm but unmistakably "off".
  error: renderChime([
    { freq: N.A3, onset: 0.00, gain: 0.50, decayTau: 0.24 },
    { freq: N.E3, onset: 0.15, gain: 0.50, decayTau: 0.40 },
  ]),
};

// ---------------------------------------------------------------------------
// retro theme — chiptune pulse/triangle voices.
//
// Pulse (square) notes use a duty cycle for tone color, like the classic
// two-pulse-channel sound chips; the triangle voice is quantized to 32 steps
// the way an 8-bit console's triangle channel is a stepped staircase, not a
// smooth wave. Notes are concatenated (no overlap/ring — chiptune voices cut
// cleanly) with a short linear attack/release just to avoid clicks, and
// optional pitch bend for the classic "power-up"/"game-over" swoop.
// ---------------------------------------------------------------------------

function pulseSample(freq, t, duty) {
  const phase = (freq * t) % 1;
  return phase < duty ? 1 : -1;
}

function triangleSample(freq, t) {
  const phase = (freq * t) % 1;
  const raw = 4 * Math.abs(phase - 0.5) - 1;
  const steps = 32;
  return Math.round(raw * steps) / steps;
}

function retroEnvelope(t, dur, attack, release) {
  const a = Math.min(1, t / attack);
  const remaining = dur - t;
  const r = remaining < release ? Math.max(0, remaining / release) : 1;
  return a * r;
}

/**
 * Render chiptune notes back-to-back.
 * @param {Array<{freq:number|null, dur:number, gain?:number, wave?:'pulse'|'triangle', duty?:number, bend?:number}>} notes
 */
function renderRetro(notes) {
  const samples = [];
  for (const {
    freq, dur, gain = 0.5, wave = 'pulse', duty = 0.5, bend = 0,
  } of notes) {
    const count = Math.round(dur * SAMPLE_RATE);
    const attack = Math.min(0.004, dur / 4);
    const release = Math.min(0.015, dur / 3);
    for (let i = 0; i < count; i++) {
      if (freq == null) { samples.push(0); continue; }
      const t = i / SAMPLE_RATE;
      const f = freq * (1 + bend * (t / dur));
      const raw = wave === 'triangle' ? triangleSample(f, t) : pulseSample(f, t, duty);
      const env = retroEnvelope(t, dur, attack, release);
      samples.push(raw * gain * env);
    }
  }
  return samples;
}

const RETRO_SOUNDS = {
  // Task done: classic ascending "power-up" arpeggio, brighter duty cycle,
  // with a little upward flourish on the last note.
  complete: renderRetro([
    { freq: N.C5, dur: 0.075, gain: 0.35, duty: 0.5 },
    { freq: N.E5, dur: 0.075, gain: 0.35, duty: 0.5 },
    { freq: N.G5, dur: 0.075, gain: 0.35, duty: 0.5 },
    { freq: N.C6, dur: 0.16, gain: 0.35, duty: 0.5, bend: 0.06 },
  ]),
  // Waiting for approval: thinner, buzzier duty cycle for an "alert" blip,
  // repeated once.
  waiting: renderRetro([
    { freq: N.A5, dur: 0.09, gain: 0.32, duty: 0.25 },
    { freq: N.D5, dur: 0.09, gain: 0.32, duty: 0.25 },
    { freq: null, dur: 0.08, gain: 0 },
    { freq: N.A5, dur: 0.09, gain: 0.32, duty: 0.25 },
    { freq: N.D5, dur: 0.14, gain: 0.32, duty: 0.25 },
  ]),
  // Idle / your turn: soft low triangle tone — the "bass voice" of an 8-bit
  // chip, gentle and unobtrusive.
  idle: renderRetro([
    { freq: N.A4, dur: 0.30, gain: 0.30, wave: 'triangle' },
  ]),
  // Subagent finished: tiny high pulse blip, like a coin pickup.
  subagent: renderRetro([
    { freq: N.C6, dur: 0.06, gain: 0.32, duty: 0.5 },
  ]),
  // Error / command failed: descending pulse pair with a downward pitch
  // bend on the last note — the classic "game over" womp.
  error: renderRetro([
    { freq: N.A3, dur: 0.14, gain: 0.38, duty: 0.5 },
    { freq: N.E3, dur: 0.26, gain: 0.38, duty: 0.5, bend: -0.12 },
  ]),
};

const THEMES = { mac: MAC_SOUNDS, retro: RETRO_SOUNDS };

for (const [theme, sounds] of Object.entries(THEMES)) {
  const dir = join(OUT_DIR, theme);
  mkdirSync(dir, { recursive: true });
  for (const [name, samples] of Object.entries(sounds)) {
    const wav = encodeWav(samples);
    const file = join(dir, `${name}.wav`);
    writeFileSync(file, wav);
    console.log(`wrote ${file} (${wav.length} bytes)`);
  }
}
console.log('Done.');
