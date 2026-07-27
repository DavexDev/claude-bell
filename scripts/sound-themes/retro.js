// retro theme — chiptune pulse/triangle voices.
//
// Pulse (square) notes use a duty cycle for tone color, like the classic
// two-pulse-channel sound chips; the triangle voice is quantized to 32 steps
// the way an 8-bit console's triangle channel is a stepped staircase, not a
// smooth wave. Notes are concatenated (no overlap/ring — chiptune voices cut
// cleanly) with a short linear attack/release just to avoid clicks, and
// optional pitch bend for the classic "power-up"/"game-over" swoop.

import { SAMPLE_RATE, N } from './synth.js';

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

export const RETRO_SOUNDS = {
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
