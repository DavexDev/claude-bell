#!/usr/bin/env node
// Hook entrypoint for claude-bell.
//
// Claude Code invokes this on a hook event, e.g.:
//     node /path/to/src/play.js Stop
// and passes the event's JSON payload on stdin. For Notification events, the
// payload's `notification_type` (e.g. "permission_prompt", "idle_prompt")
// refines the event key so different situations can map to different sounds.
//
// Contract: this must NEVER break Claude Code. Any error is swallowed and the
// process exits 0.

import { loadConfig, resolveSoundForEvent } from './config.js';
import { playSound } from './player.js';

/** Read all of stdin (the hook JSON) with a hard timeout, tolerant of no input. */
function readStdin(timeoutMs = 500) {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(data);
    };
    const timer = setTimeout(finish, timeoutMs);
    timer.unref?.();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
  });
}

/**
 * Derive the config event key from the CLI arg (the hook event name) and the
 * hook payload. Notification events are keyed as "Notification.<type>".
 */
function eventKeyFrom(eventName, payload) {
  if (eventName === 'Notification') {
    const type = payload?.notification_type;
    return type ? `Notification.${type}` : 'Notification';
  }
  return eventName;
}

async function main() {
  const eventName = process.argv[2];
  if (!eventName) return;

  const raw = await readStdin();
  let payload = {};
  if (raw && raw.trim()) {
    try { payload = JSON.parse(raw); } catch { /* ignore malformed payloads */ }
  }

  const config = loadConfig();
  const eventKey = eventKeyFrom(eventName, payload);

  // Try the specific key first, then fall back to the bare event name so a user
  // can map e.g. all Notifications to one sound with a single "Notification" key.
  const file =
    resolveSoundForEvent(config, eventKey) ??
    (eventKey !== eventName ? resolveSoundForEvent(config, eventName) : null);

  if (file) await playSound(file);
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
