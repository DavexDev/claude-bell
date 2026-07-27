// marimba theme — acoustic mallet-strike percussion.
//
// Each note is a short noise "thock" (the mallet strike) plus a tonal wooden
// body: inharmonic partials that decay much faster than mac's bell, for a
// percussive rather than ringing character. The only "organic" timbre among
// claude-bell's themes.

import {
  SAMPLE_RATE, N, renderNoiseBurst, mixInto,
} from './synth.js';

const MARIMBA_PARTIALS = [
  { ratio: 1.00, gain: 1.00, decayMul: 1.00 },
  { ratio: 3.93, gain: 0.22, decayMul: 0.35 },
  { ratio: 9.20, gain: 0.10, decayMul: 0.15 },
];

function marimbaSample(freq, t, attack, decayTau) {
  const a = Math.min(1, t / attack);
  let s = 0;
  for (const p of MARIMBA_PARTIALS) {
    const env = a * Math.exp(-t / (decayTau * p.decayMul));
    s += Math.sin(2 * Math.PI * freq * p.ratio * t) * p.gain * env;
  }
  return s;
}

/**
 * Render mallet-strike notes (tonal body + noise transient) into one mixed
 * buffer.
 * @param {Array<{freq:number, onset:number, gain?:number, attack?:number, decayTau?:number, transientGain?:number}>} notes
 */
function renderMarimba(notes) {
  const RING_TAIL = 6;
  let totalLen = 0;
  for (const n of notes) {
    const decayTau = n.decayTau ?? 0.25;
    totalLen = Math.max(totalLen, n.onset + decayTau * RING_TAIL);
  }
  const count = Math.ceil(totalLen * SAMPLE_RATE) + 1;
  const buf = new Float64Array(count);
  for (const n of notes) {
    const attack = n.attack ?? 0.002;
    const decayTau = n.decayTau ?? 0.25;
    const gain = n.gain ?? 0.45;
    const transientGain = n.transientGain ?? 0.15;
    const startSample = Math.round(n.onset * SAMPLE_RATE);
    for (let idx = startSample; idx < count; idx++) {
      const t = (idx - startSample) / SAMPLE_RATE;
      buf[idx] += marimbaSample(n.freq, t, attack, decayTau) * gain;
    }
    mixInto(buf, renderNoiseBurst(0.02, 0.006, 0.5), transientGain, startSample);
  }
  return Array.from(buf);
}

export const MARIMBA_SOUNDS = {
  // Task done: ascending run.
  complete: renderMarimba([
    {
      freq: N.C5, onset: 0.00, gain: 0.50, decayTau: 0.22, transientGain: 0.15,
    },
    {
      freq: N.E5, onset: 0.09, gain: 0.50, decayTau: 0.22, transientGain: 0.15,
    },
    {
      freq: N.G5, onset: 0.18, gain: 0.55, decayTau: 0.28, transientGain: 0.15,
    },
  ]),
  // Waiting for approval: alternating strikes.
  waiting: renderMarimba([
    {
      freq: N.A4, onset: 0.00, gain: 0.45, decayTau: 0.18, transientGain: 0.15,
    },
    {
      freq: N.C5, onset: 0.12, gain: 0.45, decayTau: 0.18, transientGain: 0.15,
    },
    {
      freq: N.A4, onset: 0.30, gain: 0.40, decayTau: 0.16, transientGain: 0.15,
    },
    {
      freq: N.C5, onset: 0.42, gain: 0.40, decayTau: 0.20, transientGain: 0.15,
    },
  ]),
  // Idle / your turn: single soft low note, gentle mallet.
  idle: renderMarimba([
    {
      freq: N.F4, onset: 0, gain: 0.30, attack: 0.004, decayTau: 0.40, transientGain: 0.08,
    },
  ]),
  // Subagent finished: single short high note, crisp "tock".
  subagent: renderMarimba([
    {
      freq: N.B4, onset: 0, gain: 0.40, attack: 0.001, decayTau: 0.10, transientGain: 0.18,
    },
  ]),
  // Error / command failed: two descending low strikes, prominent dull thud.
  error: renderMarimba([
    {
      freq: N.A3, onset: 0.00, gain: 0.50, decayTau: 0.20, transientGain: 0.22,
    },
    {
      freq: N.E3, onset: 0.16, gain: 0.50, decayTau: 0.30, transientGain: 0.22,
    },
  ]),
};
