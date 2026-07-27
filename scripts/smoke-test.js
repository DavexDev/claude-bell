#!/usr/bin/env node
// Lightweight smoke tests — no audio playback, no settings mutation.
// Verifies config resolution and event-key mapping. Run: npm test

import assert from 'node:assert';
import { existsSync } from 'node:fs';
import {
  loadConfig, resolveSoundForEvent, resolveSoundPath, themes,
} from '../src/config.js';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

const config = loadConfig();

check('config is enabled by default', () => {
  assert.strictEqual(config.enabled, true);
});

check('all bundled sound files exist', () => {
  for (const name of Object.keys(config.sounds)) {
    const file = resolveSoundPath(config, name);
    assert.ok(file && existsSync(file), `missing sound: ${name}`);
  }
});

check('all sound files exist for every bundled theme', () => {
  for (const theme of themes) {
    const themedConfig = { ...config, theme };
    for (const name of Object.keys(config.sounds)) {
      const file = resolveSoundPath(themedConfig, name);
      assert.ok(file && existsSync(file), `missing sound: ${theme}/${name}`);
    }
  }
});

check('Stop maps to the complete sound', () => {
  const file = resolveSoundForEvent(config, 'Stop');
  assert.ok(file && file.endsWith('complete.wav'));
});

check('Notification.permission_prompt maps to waiting', () => {
  const file = resolveSoundForEvent(config, 'Notification.permission_prompt');
  assert.ok(file && file.endsWith('waiting.wav'));
});

check('Notification.idle_prompt maps to idle', () => {
  const file = resolveSoundForEvent(config, 'Notification.idle_prompt');
  assert.ok(file && file.endsWith('idle.wav'));
});

check('SubagentStop maps to subagent', () => {
  const file = resolveSoundForEvent(config, 'SubagentStop');
  assert.ok(file && file.endsWith('subagent.wav'));
});

check('PostToolUseFailure maps to the error sound', () => {
  const file = resolveSoundForEvent(config, 'PostToolUseFailure');
  assert.ok(file && file.endsWith('error.wav'));
});

check('unmapped event resolves to null', () => {
  assert.strictEqual(resolveSoundForEvent(config, 'PreToolUse'), null);
});

check('disabled config mutes everything', () => {
  const muted = { ...config, enabled: false };
  assert.strictEqual(resolveSoundForEvent(muted, 'Stop'), null);
});

console.log(`\n${passed} checks passed.`);
