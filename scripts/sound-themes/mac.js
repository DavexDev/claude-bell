// mac theme — warm bell/chime tones.
//
// Each note is additive: a fundamental plus slightly inharmonic upper
// partials (ratios just off whole numbers, like a real bell) that decay
// faster than the fundamental. Notes are scheduled by onset time and mixed
// into a shared buffer instead of being concatenated, so they ring past
// their nominal duration and overlap the next note — the "ta-da" feel of a
// real chime instead of a hard-cut beep.

import { SAMPLE_RATE, N } from './synth.js';

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

export const MAC_SOUNDS = {
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
