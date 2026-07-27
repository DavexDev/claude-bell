// glass theme — minimal, near-inaudible taps.
//
// Pure noise, no oscillators at all: every event is one or two short
// filtered-noise clicks. Kept deliberately quiet and short — for people who
// find even the mac chime too much.

import { SAMPLE_RATE, renderNoiseBurst } from './synth.js';

/**
 * Render click taps into one mixed buffer.
 * @param {Array<{onset:number, dur:number, decayTau:number, cutoff:number, gain:number}>} taps
 */
function renderGlass(taps) {
  let totalLen = 0;
  for (const t of taps) totalLen = Math.max(totalLen, t.onset + t.dur);
  const count = Math.ceil(totalLen * SAMPLE_RATE) + 1;
  const buf = new Float64Array(count);
  for (const t of taps) {
    const burst = renderNoiseBurst(t.dur, t.decayTau, t.cutoff);
    const startSample = Math.round(t.onset * SAMPLE_RATE);
    for (let i = 0; i < burst.length; i++) {
      const idx = startSample + i;
      if (idx < count) buf[idx] += burst[i] * t.gain;
    }
  }
  return Array.from(buf);
}

export const GLASS_SOUNDS = {
  // Task done: two ascending-brightness taps.
  complete: renderGlass([
    { onset: 0.00, dur: 0.03, decayTau: 0.010, cutoff: 0.55, gain: 0.22 },
    { onset: 0.07, dur: 0.03, decayTau: 0.012, cutoff: 0.65, gain: 0.26 },
  ]),
  // Waiting for approval: two identical light knocks.
  waiting: renderGlass([
    { onset: 0.00, dur: 0.025, decayTau: 0.009, cutoff: 0.45, gain: 0.20 },
    { onset: 0.12, dur: 0.025, decayTau: 0.009, cutoff: 0.45, gain: 0.20 },
  ]),
  // Idle / your turn: one soft, dull, slightly longer tick.
  idle: renderGlass([
    { onset: 0, dur: 0.05, decayTau: 0.020, cutoff: 0.25, gain: 0.14 },
  ]),
  // Subagent finished: one ultra-short, bright, quiet tick.
  subagent: renderGlass([
    { onset: 0, dur: 0.015, decayTau: 0.006, cutoff: 0.60, gain: 0.16 },
  ]),
  // Error / command failed: two low, dull taps.
  error: renderGlass([
    { onset: 0.00, dur: 0.035, decayTau: 0.015, cutoff: 0.18, gain: 0.24 },
    { onset: 0.06, dur: 0.045, decayTau: 0.020, cutoff: 0.15, gain: 0.26 },
  ]),
};
