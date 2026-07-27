// Shared DSP primitives for claude-bell's synthesized sound themes.
//
// Everything here is plain-math synthesis (sine/noise), no audio libraries —
// keeps the package dependency-free. Regenerate all themes with:
//     npm run gen-sounds

export const SAMPLE_RATE = 44100;

/** Musical note frequencies (Hz). */
export const N = {
  E3: 164.81, F3: 174.61, A3: 220.0, C4: 261.63,
  A4: 440.0, F4: 349.23, G4: 392.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25,
  G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.51, G6: 1567.98,
};

/** Encode Float samples in [-1, 1] to a 16-bit PCM mono WAV Buffer. */
export function encodeWav(samples) {
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

/**
 * Add `src` into `dest` starting at `startSample`, scaled by `gain`.
 * Mutates and returns `dest`.
 */
export function mixInto(dest, src, gain, startSample = 0) {
  for (let i = 0; i < src.length && startSample + i < dest.length; i++) {
    dest[startSample + i] += src[i] * gain;
  }
  return dest;
}

/**
 * One-pole lowpass-filtered white-noise burst with exponential amplitude
 * decay. `cutoff` in (0,1]: lower = darker/duller, higher = brighter/hissier.
 */
export function renderNoiseBurst(dur, decayTau, cutoff = 0.35) {
  const count = Math.round(dur * SAMPLE_RATE);
  const out = new Float64Array(count);
  let lp = 0;
  for (let i = 0; i < count; i++) {
    const white = Math.random() * 2 - 1;
    lp += cutoff * (white - lp);
    out[i] = lp * Math.exp(-(i / SAMPLE_RATE) / decayTau);
  }
  return out;
}

const SAW_DETUNE_CENTS = [-9, -4.5, 0, 4.5, 9]; // 5-voice unison spread
const detuneRatio = (cents) => 2 ** (cents / 1200);

/** Band-limited-ish sawtooth via additive harmonics, amplitude 1/n. */
function sawApprox(freq, t, harmonics) {
  let s = 0;
  for (let n = 1; n <= harmonics; n++) s += Math.sin(2 * Math.PI * freq * n * t) / n;
  return s * (2 / Math.PI);
}

/**
 * Detuned "supersaw-lite" pad note whose harmonic content ramps in over
 * `sweep` seconds (simulating a filter opening) from `minHarmonics` to
 * `maxHarmonics`.
 */
export function padSample(freq, t, attack, decayTau, sweep, maxHarmonics = 7, minHarmonics = 2) {
  const bright = Math.min(1, t / sweep);
  const harmonics = Math.round(minHarmonics + bright * (maxHarmonics - minHarmonics));
  const a = Math.min(1, t / attack);
  const env = a * Math.exp(-t / decayTau);
  let s = 0;
  for (const cents of SAW_DETUNE_CENTS) s += sawApprox(freq * detuneRatio(cents), t, harmonics);
  return (s / SAW_DETUNE_CENTS.length) * env;
}

/**
 * Render pad notes (each may be a chord: an array of freqs sharing one
 * onset), mixed into a shared ring-out buffer.
 * @param {Array<{freqs:number[], onset:number, gain?:number, attack?:number, decayTau?:number, sweep?:number, maxHarmonics?:number}>} chords
 */
export function renderPad(chords) {
  const RING_TAIL = 6;
  let totalLen = 0;
  for (const c of chords) {
    const decayTau = c.decayTau ?? 0.35;
    totalLen = Math.max(totalLen, c.onset + decayTau * RING_TAIL);
  }
  const count = Math.ceil(totalLen * SAMPLE_RATE) + 1;
  const buf = new Float64Array(count);
  for (const c of chords) {
    const attack = c.attack ?? 0.02;
    const decayTau = c.decayTau ?? 0.35;
    const sweep = c.sweep ?? 0.15;
    const maxHarmonics = c.maxHarmonics ?? 7;
    const gain = c.gain ?? 0.2;
    const startSample = Math.round(c.onset * SAMPLE_RATE);
    for (const freq of c.freqs) {
      for (let idx = startSample; idx < count; idx++) {
        const t = (idx - startSample) / SAMPLE_RATE;
        buf[idx] += padSample(freq, t, attack, decayTau, sweep, maxHarmonics) * gain;
      }
    }
  }
  return Array.from(buf);
}

/**
 * Classic 2-operator FM: a carrier phase-modulated by a modulator whose
 * index decays over time (bright/clangy attack settling into a purer tone).
 * `modRatio` need not be an integer — non-integer ratios give inharmonic,
 * metallic timbres.
 */
export function fmSample(freq, t, modRatio, indexStart, indexDecayTau, ampDecayTau, attack = 0.002) {
  const idx = indexStart * Math.exp(-t / indexDecayTau);
  const modulator = Math.sin(2 * Math.PI * freq * modRatio * t) * idx;
  const carrier = Math.sin(2 * Math.PI * freq * t + modulator);
  const a = Math.min(1, t / attack);
  const env = a * Math.exp(-t / ampDecayTau);
  return carrier * env;
}

/**
 * Render FM notes into one mixed (ring-out) buffer — same onset-scheduling
 * pattern as renderPad/renderChime.
 * @param {Array<{freq:number, onset:number, modRatio:number, indexStart:number, indexDecayTau:number, ampDecayTau:number, attack?:number, gain?:number}>} notes
 */
export function renderFM(notes) {
  const RING_TAIL = 6;
  let totalLen = 0;
  for (const n of notes) totalLen = Math.max(totalLen, n.onset + n.ampDecayTau * RING_TAIL);
  const count = Math.ceil(totalLen * SAMPLE_RATE) + 1;
  const buf = new Float64Array(count);
  for (const n of notes) {
    const attack = n.attack ?? 0.002;
    const gain = n.gain ?? 0.3;
    const startSample = Math.round(n.onset * SAMPLE_RATE);
    for (let idx = startSample; idx < count; idx++) {
      const t = (idx - startSample) / SAMPLE_RATE;
      buf[idx] += fmSample(
        n.freq,
        t,
        n.modRatio,
        n.indexStart,
        n.indexDecayTau,
        n.ampDecayTau,
        attack,
      ) * gain;
    }
  }
  return buf;
}
