#!/usr/bin/env node
// Generates the bundled notification sounds as royalty-free WAV files.
//
// These are simple synthesized tone sequences (16-bit PCM mono, 44.1 kHz) with
// a short attack/decay envelope so they don't click. Regenerate with:
//     npm run gen-sounds

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

/**
 * Render a sequence of notes to a Float array in [-1, 1].
 * @param {Array<{ freq: number|null, dur: number, gain?: number }>} notes
 */
function renderNotes(notes) {
  const samples = [];
  for (const { freq, dur, gain = 0.6 } of notes) {
    const count = Math.round(dur * SAMPLE_RATE);
    for (let i = 0; i < count; i++) {
      if (freq == null) { samples.push(0); continue; }
      const t = i / SAMPLE_RATE;
      // Attack/decay envelope: 8 ms attack, cosine decay over the note.
      const attack = Math.min(1, t / 0.008);
      const decay = 0.5 * (1 + Math.cos((Math.PI * i) / count));
      const env = attack * (0.35 + 0.65 * decay);
      samples.push(Math.sin(2 * Math.PI * freq * t) * gain * env);
    }
  }
  return samples;
}

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

// One recognizable, distinct motif per event.
const SOUNDS = {
  // Task done: bright rising arpeggio C-E-G.
  complete: [
    { freq: N.C5, dur: 0.11 },
    { freq: N.E5, dur: 0.11 },
    { freq: N.G5, dur: 0.20 },
  ],
  // Waiting for approval: urgent-ish two-note ping, repeated.
  waiting: [
    { freq: N.A5, dur: 0.10 },
    { freq: N.D5, dur: 0.10 },
    { freq: null, dur: 0.06 },
    { freq: N.A5, dur: 0.10 },
    { freq: N.D5, dur: 0.16 },
  ],
  // Idle / your turn: soft single low tone.
  idle: [
    { freq: N.A4, dur: 0.30, gain: 0.4 },
  ],
  // Subagent finished: quick high blip.
  subagent: [
    { freq: N.C6, dur: 0.09, gain: 0.45 },
  ],
  // Error / command failed: low descending two-tone ("uh-oh").
  error: [
    { freq: N.A3, dur: 0.16, gain: 0.55 },
    { freq: N.E3, dur: 0.26, gain: 0.55 },
  ],
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, notes] of Object.entries(SOUNDS)) {
  const wav = encodeWav(renderNotes(notes));
  const file = join(OUT_DIR, `${name}.wav`);
  writeFileSync(file, wav);
  console.log(`wrote ${file} (${wav.length} bytes)`);
}
console.log('Done.');
