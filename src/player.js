// Cross-platform sound playback.
//
// We deliberately shell out to the OS-native player instead of pulling in an
// audio dependency: it keeps the hook fast to start and the package free of
// native modules. The child is spawned detached and unref'd so the sound keeps
// playing even after this short-lived process exits — a hook must not block
// Claude Code any longer than necessary.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

/** Quote a path for a POSIX `sh -c` command line (single-quote escaping). */
function shQuote(p) {
  return `'${String(p).replace(/'/g, `'\\''`)}'`;
}

/** Escape a path for embedding inside a PowerShell single-quoted string. */
function psQuote(p) {
  return String(p).replace(/'/g, `''`);
}

/**
 * Build the [command, args] pair that plays `file` on the current platform.
 * Returns null if we don't know how to play sound here.
 */
function playerFor(file) {
  switch (process.platform) {
    case 'win32': {
      // SoundPlayer plays WAV synchronously; -NoProfile avoids slow startup and
      // stray profile output. The child outlives us thanks to detach+unref.
      const psCommand =
        `$p = New-Object System.Media.SoundPlayer '${psQuote(file)}'; $p.PlaySync();`;
      return ['powershell', ['-NoProfile', '-NonInteractive', '-Command', psCommand]];
    }
    case 'darwin':
      return ['afplay', [file]];
    default: {
      // Linux/other: try common players in order, using whichever exists.
      const chain =
        `paplay ${shQuote(file)} || ` +
        `aplay -q ${shQuote(file)} || ` +
        `ffplay -nodisp -autoexit -loglevel quiet ${shQuote(file)} || ` +
        `play -q ${shQuote(file)}`;
      return ['sh', ['-c', chain]];
    }
  }
}

/**
 * Play a sound file without blocking. Never throws — playback is best-effort;
 * a notifier must never break the tool that invoked it.
 *
 * @param {string} file Absolute path to an audio file (WAV recommended).
 * @param {{ wait?: boolean }} [opts] When wait=true, resolves after the child
 *        exits (used by `claude-bell test` so the CLI reports real errors).
 * @returns {Promise<boolean>} true if a player was launched, false otherwise.
 */
export function playSound(file, opts = {}) {
  return new Promise((resolve) => {
    try {
      if (!file || !existsSync(file)) return resolve(false);
      const spec = playerFor(file);
      if (!spec) return resolve(false);
      const [cmd, args] = spec;

      if (opts.wait) {
        const child = spawn(cmd, args, { stdio: 'ignore' });
        child.on('error', () => resolve(false));
        child.on('close', (code) => resolve(code === 0));
        return;
      }

      const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
      child.on('error', () => resolve(false));
      child.unref();
      resolve(true);
    } catch {
      resolve(false);
    }
  });
}
