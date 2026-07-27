// hud theme — FM-synthesized sci-fi console blips.
//
// 2-operator FM gives metallic, evolving tones (the modulation index decays
// over each note, so it starts clangy and settles) — a different digital
// character than retro's chip voices or mac's additive bell. The error sound
// layers in filtered noise "static" for a glitchy warning feel.

import {
  N, renderFM, renderNoiseBurst, mixInto,
} from './synth.js';

export const HUD_SOUNDS = {
  // Task done: two ascending blips, the second settling into a cleaner tone
  // (lower modRatio + index = less clangy).
  complete: renderFM([
    {
      freq: N.C6, onset: 0.00, modRatio: 1.41, indexStart: 6, indexDecayTau: 0.04, ampDecayTau: 0.18, gain: 0.35,
    },
    {
      freq: N.E6, onset: 0.10, modRatio: 2.0, indexStart: 4, indexDecayTau: 0.05, ampDecayTau: 0.22, gain: 0.30,
    },
  ]),
  // Waiting for approval: repeated alert ping.
  waiting: renderFM([
    {
      freq: N.A5, onset: 0.00, modRatio: 1.5, indexStart: 5, indexDecayTau: 0.03, ampDecayTau: 0.12, gain: 0.32,
    },
    {
      freq: N.A5, onset: 0.28, modRatio: 1.5, indexStart: 5, indexDecayTau: 0.03, ampDecayTau: 0.12, gain: 0.32,
    },
  ]),
  // Idle / your turn: soft, near-sine standby tone.
  idle: renderFM([
    {
      freq: N.A4, onset: 0, modRatio: 2.0, indexStart: 1.5, indexDecayTau: 0.15, ampDecayTau: 0.5, attack: 0.02, gain: 0.22,
    },
  ]),
  // Subagent finished: tiny clangy blip, very fast decay.
  subagent: renderFM([
    {
      freq: N.G6, onset: 0, modRatio: 3.01, indexStart: 8, indexDecayTau: 0.02, ampDecayTau: 0.08, gain: 0.30,
    },
  ]),
  // Error / command failed: harsh low FM clang plus glitchy static.
  error: (() => {
    const buf = renderFM([
      {
        freq: N.F3, onset: 0, modRatio: 1.99, indexStart: 10, indexDecayTau: 0.06, ampDecayTau: 0.30, gain: 0.38,
      },
    ]);
    mixInto(buf, renderNoiseBurst(0.45, 0.35, 0.75), 0.12, 0);
    return Array.from(buf);
  })(),
};
