// arcade theme — analog synthwave pad stabs.
//
// Detuned "supersaw-lite" chords whose harmonic content brightens over the
// attack (simulating a filter opening), unlike retro's hard-edged chiptune
// voices — warmer, wider, more 80s-synth than 8-bit game.

import { N, renderPad } from './synth.js';

export const ARCADE_SOUNDS = {
  // Task done: rising 2-chord stab.
  complete: renderPad([
    {
      freqs: [N.A4, N.C5, N.E5], onset: 0.00, attack: 0.02, decayTau: 0.35, sweep: 0.15, gain: 0.20,
    },
    {
      freqs: [N.C5, N.E5, N.G5], onset: 0.22, attack: 0.02, decayTau: 0.35, sweep: 0.15, gain: 0.20,
    },
  ]),
  // Waiting for approval: urgent dyad stab, repeated once, faster sweep.
  waiting: renderPad([
    {
      freqs: [N.A5, N.D5], onset: 0.00, attack: 0.015, decayTau: 0.22, sweep: 0.08, gain: 0.22,
    },
    {
      freqs: [N.A5, N.D5], onset: 0.30, attack: 0.015, decayTau: 0.22, sweep: 0.08, gain: 0.22,
    },
  ]),
  // Idle / your turn: sustained ambient pad glow, slow sweep.
  idle: renderPad([
    {
      freqs: [N.A4, N.C5], onset: 0, attack: 0.05, decayTau: 0.9, sweep: 0.5, gain: 0.15,
    },
  ]),
  // Subagent finished: single high quick stab.
  subagent: renderPad([
    {
      freqs: [N.C6], onset: 0, attack: 0.008, decayTau: 0.12, sweep: 0.04, gain: 0.20,
    },
  ]),
  // Error / command failed: two descending, deliberately muted/duller chords.
  error: renderPad([
    {
      freqs: [N.A3, N.C4], onset: 0.00, attack: 0.02, decayTau: 0.30, sweep: 0.2, maxHarmonics: 4, gain: 0.22,
    },
    {
      freqs: [N.E3, N.A3], onset: 0.18, attack: 0.02, decayTau: 0.35, sweep: 0.25, maxHarmonics: 4, gain: 0.22,
    },
  ]),
};
