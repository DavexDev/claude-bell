// Config loading and resolution for claude-bell.
//
// Merges the bundled defaults (config.default.json) with the user's optional
// overrides at ~/.claude/claude-bell.config.json. Everything is resolved
// against the package root so sounds bundled with the package are found no
// matter where the CLI is invoked from.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the installed package root (parent of src/). */
export const packageRoot = join(__dirname, '..');

/** Directory holding the bundled .wav files. */
export const bundledSoundsDir = join(packageRoot, 'sounds');

/** Path to the user's optional config override. */
export const userConfigPath = join(homedir(), '.claude', 'claude-bell.config.json');

/** Path to the bundled default config. */
export const defaultConfigPath = join(packageRoot, 'config.default.json');

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Shallow-per-key deep merge: user values override defaults, nested objects merge. */
function deepMerge(base, override) {
  if (!isPlainObject(override)) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = isPlainObject(value) && isPlainObject(out[key])
      ? deepMerge(out[key], value)
      : value;
  }
  return out;
}

/**
 * Load the effective config (defaults merged with the user's overrides).
 * Falls back to a hard-coded minimal config if the bundled default is missing.
 */
export function loadConfig() {
  const defaults = readJson(defaultConfigPath) ?? {
    enabled: true,
    sounds: {},
    events: {},
  };
  const user = existsSync(userConfigPath) ? readJson(userConfigPath) : null;
  return user ? deepMerge(defaults, user) : defaults;
}

/**
 * Resolve a sound *name* (a key in config.sounds) to an absolute file path.
 * Values may be bare filenames (looked up in the bundled sounds dir) or
 * absolute paths to the user's own audio files. Returns null if unresolved.
 */
export function resolveSoundPath(config, soundName) {
  const value = config?.sounds?.[soundName];
  if (!value || typeof value !== 'string') return null;
  const path = isAbsolute(value) ? value : join(bundledSoundsDir, value);
  return existsSync(path) ? path : null;
}

/**
 * Given an event key (e.g. "Stop" or "Notification.permission_prompt"),
 * return the resolved absolute sound path, or null if muted/unmapped/missing.
 */
export function resolveSoundForEvent(config, eventKey) {
  if (!config?.enabled) return null;
  const soundName = config?.events?.[eventKey];
  if (!soundName) return null;
  return resolveSoundPath(config, soundName);
}
