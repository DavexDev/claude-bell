#!/usr/bin/env node
// Generates the bundled notification sounds as royalty-free WAV files.
//
// Six themes are produced, all 16-bit PCM mono @ 44.1kHz. Each theme's
// synthesis lives in scripts/sound-themes/<name>.js; shared DSP primitives
// (encodeWav, the note table, noise/pad/FM helpers) live in
// scripts/sound-themes/synth.js.
//
// Regenerate with: npm run gen-sounds

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { encodeWav } from './sound-themes/synth.js';
import { MAC_SOUNDS } from './sound-themes/mac.js';
import { RETRO_SOUNDS } from './sound-themes/retro.js';
import { GLASS_SOUNDS } from './sound-themes/glass.js';
import { ARCADE_SOUNDS } from './sound-themes/arcade.js';
import { MARIMBA_SOUNDS } from './sound-themes/marimba.js';
import { HUD_SOUNDS } from './sound-themes/hud.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'sounds');

const THEMES = {
  mac: MAC_SOUNDS,
  retro: RETRO_SOUNDS,
  glass: GLASS_SOUNDS,
  arcade: ARCADE_SOUNDS,
  marimba: MARIMBA_SOUNDS,
  hud: HUD_SOUNDS,
};

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
