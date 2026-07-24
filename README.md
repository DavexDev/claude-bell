# 🔔 claude-bell

Sound notifications for [Claude Code](https://claude.com/claude-code). Hear a sound the moment Claude needs you — no more staring at the terminal.

| Sound | Plays when |
|-------|------------|
| ✅ complete | A task **finishes** (Claude stops responding) |
| ⏳ waiting | Claude is **waiting for your approval** to run a tool |
| 💤 idle | Claude is **idle**, waiting for your next prompt |
| 🤖 subagent | A **subagent finishes** |
| ❌ error | A **terminal command fails** *(optional — off by default)* |

It works by registering [Claude Code hooks](https://code.claude.com/docs/en/hooks-guide) that run a tiny, dependency-free Node script to play a sound. Cross-platform: **Windows, macOS, Linux**.

---

## Requirements

- **[Node.js](https://nodejs.org) 16 or newer** (`node --version` to check)
- **Claude Code** installed
- **Linux only:** an audio player — one of `paplay` (pulseaudio-utils), `aplay` (alsa-utils), `ffplay` (ffmpeg), or `play` (sox). macOS and Windows work out of the box.

---

## Quick start

```bash
# 1. Register the sound hooks (global — applies to every project)
npx @davexdev/claude-bell install

# 2. Check your speakers work
npx @davexdev/claude-bell test

# 3. Start a NEW Claude Code session — that's it 🎉
```

> ⚠️ **Hooks load when a session starts.** After installing, open a **new** Claude Code session; already-open sessions won't play sounds until restarted.

---

## Installation

### Option A — no install (recommended to start)

```bash
npx @davexdev/claude-bell install
```

`npx` downloads and runs it on the fly — nothing stays installed globally.

### Option B — install globally (shorter command)

```bash
npm install -g @davexdev/claude-bell
claude-bell install
```

After a global install the command is just `claude-bell`.

### What `install` does

- Writes the hooks into your **user** settings: `~/.claude/settings.json`
  (so **every** Claude Code session notifies you).
- **Backs up** your settings first (`settings.json.bak-<timestamp>`).
- **Only adds** claude-bell's entries — your existing settings and hooks are untouched.
- Is **safe to run again** (re-running replaces only claude-bell's entries, never duplicates).

### Install options

| Command | Effect |
|---------|--------|
| `install` | Global — writes to `~/.claude/settings.json` (all projects). |
| `install --project` | This project only — writes to `./.claude/settings.json`. |
| `install --errors` | Also play a sound when a **terminal (Bash) command fails**. Off by default (see below). |

You can combine flags, e.g. `install --project --errors`.

### Verify it works

1. Open a **new** Claude Code session.
2. Ask it something small (e.g. *"list the files here"*).
3. When it finishes → you should hear the **complete** sound. 🔔

Not hearing anything? See [Troubleshooting](#troubleshooting).

---

## The error sound (optional)

By default there is **no** sound for failures, because tool failures are common
and would be noisy (a `grep` with no matches, a failing test — all exit non-zero).

Turn it on explicitly:

```bash
npx @davexdev/claude-bell install --errors
```

This adds a `PostToolUseFailure` hook **scoped to Bash**, so you get an audible
cue only when a terminal command fails. To turn it back off, run `uninstall`
then `install` again without `--errors`.

---

## Configuration

Everything is optional — the defaults just work. To customize:

```bash
npx @davexdev/claude-bell config
```

This creates `~/.claude/claude-bell.config.json` (and prints your current settings). Open it in any editor and change what you like:

```json
{
  "enabled": true,
  "sounds": {
    "complete": "complete.wav",
    "waiting": "waiting.wav",
    "idle": "idle.wav",
    "subagent": "subagent.wav",
    "error": "error.wav"
  },
  "events": {
    "Stop": "complete",
    "Notification.permission_prompt": "waiting",
    "Notification.idle_prompt": "idle",
    "Notification.agent_completed": "complete",
    "SubagentStop": "subagent",
    "PostToolUseFailure": "error"
  }
}
```

- **`sounds`** = named sounds → a file (a bundled `.wav`, or an absolute path to your own).
- **`events`** = a Claude Code event → the name of the sound to play.

> Your config is **merged over the defaults**, so you only need to include the keys you want to change. Changes apply in the **next** Claude Code session (`test` reflects them immediately).

### Recipes — "I want to…"

| Goal | How |
|------|-----|
| **Use my own sound** for task-done | Set `"complete": "C:/Users/me/Music/tada.wav"` (Windows) or `"/home/me/tada.wav"` (macOS/Linux) under `sounds`. Use an **absolute path**. |
| **Silence one situation** (e.g. subagents) | Delete its line from `events` (remove `"SubagentStop": ...`). |
| **Change which sound an event uses** | Repoint it, e.g. `"Stop": "idle"` to play the soft tone when a task finishes. |
| **Mute everything temporarily** | Set `"enabled": false`. |
| **Same sound for all notifications** | Add a single `"Notification": "waiting"` key (used as a fallback when a specific `Notification.*` key isn't set). |

### Event keys

| Key | Fires when |
|-----|------------|
| `Stop` | Claude finishes responding (task done) |
| `Notification.permission_prompt` | Claude asks to run a tool and needs approval |
| `Notification.idle_prompt` | Claude is idle, waiting for your next prompt |
| `Notification.agent_completed` | A background session finished or failed |
| `SubagentStop` | A subagent (Task) finished |
| `PostToolUseFailure` | A Bash command failed *(only active with `install --errors`)* |

---

## Command reference

| Command | What it does |
|---------|--------------|
| `install [--project] [--errors]` | Register the hooks (global by default). |
| `uninstall [--project]` | Remove **only** claude-bell's hooks; everything else stays. |
| `test [sound]` | Play a sound now to check audio. Names: `complete`, `waiting`, `idle`, `subagent`, `error`. Default: `complete`. |
| `config` | Create/print your user config file. |
| `help` | Show usage. |
| `version` | Print the version. |

(Prefix with `npx @davexdev/claude-bell` if you didn't install globally.)

---

## Troubleshooting

**No sound at all in a Claude Code session?** Walk through this:

1. **Did you start a _new_ session** after installing? Hooks load at session start.
2. **Does `test` make a sound?**
   ```bash
   npx @davexdev/claude-bell test
   ```
   - **No sound from `test`** → it's a system audio issue (volume/output device), or on Linux you're missing a player (see [Requirements](#requirements)).
   - **`test` works but sessions are silent** → enable the debug log (next step).
3. **Turn on the debug log** to see whether the hook is firing. Set `"debug": true` in `~/.claude/claude-bell.config.json`, start a new session, do a task, then check:
   ```
   ~/.claude/claude-bell.log
   ```
   Each event appends a line like:
   ```
   2026-01-01T00:00:00.000Z event=Stop file=.../complete.wav played=true
   ```
   - **A line with `played=true`** → it's working (turn `debug` back to `false`).
   - **A line with `played=false`** → the sound file couldn't be played (bad path, or missing Linux player).
   - **No new lines** → Claude Code isn't running the hook. Re-run `install` and confirm you started a fresh session.

---

## How it works

`install` writes hook entries into your `settings.json`:

```json
{
  "hooks": {
    "Stop": [
      { "matcher": "", "hooks": [
        { "type": "command", "command": "\"node\" \".../src/play.js\" Stop" }
      ] }
    ]
  }
}
```

On each event, Claude Code runs `play.js`, which reads the event JSON on stdin,
looks up the mapped sound in your config, and plays it with the OS-native player:

- **Windows** — PowerShell `System.Media.SoundPlayer`
- **macOS** — `afplay`
- **Linux** — the first available of `paplay`, `aplay`, `ffplay`, `play`

Playback is **synchronous** (the hook waits the ~0.5–1s it takes to play the short
sound) so Claude Code's hook runner doesn't reap the audio process early. Any error
is swallowed and the process exits `0`, so the notifier can never break Claude Code.

---

## Limitations

- **No sound for in-line errors.** Claude Code has no dedicated hook for general
  errors. `install --errors` covers **Bash command failures** (via
  `PostToolUseFailure`); other kinds of failures aren't signaled.
- **Volume isn't adjustable** on Windows (`SoundPlayer` has no volume control) —
  use quieter source files if needed.
- **Linux** needs one of the audio players listed in [Requirements](#requirements).

---

## Development

```bash
git clone https://github.com/DavexDev/claude-bell.git
cd claude-bell
npm link              # exposes the `claude-bell` command locally
npm test              # smoke tests (no audio, no settings changes)
npm run gen-sounds    # regenerate the bundled WAV files
```

The bundled sounds are synthesized tones generated by `scripts/gen-sounds.js`
(royalty-free, no third-party audio).

## License

[MIT](LICENSE)
