// Install / uninstall claude-bell hooks into a Claude Code settings.json.
//
// We *merge* our entries into whatever is already there and never overwrite
// unrelated config. A timestamped backup is written before any change, and our
// own entries are tagged by the play.js path so uninstall removes only ours.

import {
  readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute, forward-slashed path to the hook entrypoint (works on all OSes). */
const PLAY_JS = join(__dirname, 'play.js').replace(/\\/g, '/');
const NODE = process.execPath.replace(/\\/g, '/');

/** The hook events we register and the matcher to use for each. */
const HOOK_EVENTS = [
  { event: 'Stop', matcher: '' },
  { event: 'Notification', matcher: '' },
  { event: 'SubagentStop', matcher: '' },
];

/** Resolve the target settings.json path for the requested scope. */
export function settingsPathFor({ project = false } = {}) {
  const base = project ? join(process.cwd(), '.claude') : join(homedir(), '.claude');
  return join(base, 'settings.json');
}

function buildCommand(event) {
  return `"${NODE}" "${PLAY_JS}" ${event}`;
}

/** True if a hook block belongs to claude-bell (matched by the play.js path). */
function isOurBlock(block) {
  const hooks = Array.isArray(block?.hooks) ? block.hooks : [];
  return hooks.some((h) => {
    const cmd = typeof h?.command === 'string' ? h.command : '';
    return cmd.includes(PLAY_JS)
      || (cmd.includes('play.js') && cmd.toLowerCase().includes('claude-bell'));
  });
}

function readSettings(path) {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, 'utf8');
  if (!text.trim()) return {};
  // Throws on malformed JSON — the caller aborts rather than clobbering.
  return JSON.parse(text);
}

function backup(path) {
  if (!existsSync(path)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = `${path}.bak-${stamp}`;
  copyFileSync(path, dest);
  return dest;
}

function writeSettings(path, settings) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

/**
 * Install the claude-bell hooks. Idempotent: re-installing replaces our own
 * blocks and leaves everything else untouched.
 * @returns {{ path: string, backup: string|null, events: string[] }}
 */
export function install({ project = false } = {}) {
  const path = settingsPathFor({ project });
  const settings = readSettings(path);
  const backupPath = backup(path);

  if (!settings.hooks || typeof settings.hooks !== 'object') settings.hooks = {};

  for (const { event, matcher } of HOOK_EVENTS) {
    const existing = Array.isArray(settings.hooks[event]) ? settings.hooks[event] : [];
    const others = existing.filter((block) => !isOurBlock(block));
    others.push({
      matcher,
      hooks: [{ type: 'command', command: buildCommand(event) }],
    });
    settings.hooks[event] = others;
  }

  writeSettings(path, settings);
  return { path, backup: backupPath, events: HOOK_EVENTS.map((h) => h.event) };
}

/**
 * Remove only the claude-bell hooks, preserving all other settings.
 * @returns {{ path: string, backup: string|null, removed: number, existed: boolean }}
 */
export function uninstall({ project = false } = {}) {
  const path = settingsPathFor({ project });
  if (!existsSync(path)) return { path, backup: null, removed: 0, existed: false };

  const settings = readSettings(path);
  const backupPath = backup(path);
  let removed = 0;

  if (settings.hooks && typeof settings.hooks === 'object') {
    for (const event of Object.keys(settings.hooks)) {
      const arr = settings.hooks[event];
      if (!Array.isArray(arr)) continue;
      const kept = arr.filter((block) => {
        const ours = isOurBlock(block);
        if (ours) removed += 1;
        return !ours;
      });
      if (kept.length) settings.hooks[event] = kept;
      else delete settings.hooks[event];
    }
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  }

  writeSettings(path, settings);
  return { path, backup: backupPath, removed, existed: true };
}
