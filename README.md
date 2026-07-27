<p align="center">
  <img src="https://raw.githubusercontent.com/DavexDev/claude-bell/main/assets/logo.png" alt="claude-bell logo" width="110">
</p>

<h1 align="center">claude-bell</h1>

<p align="center">
  Sound notifications for <a href="https://claude.com/claude-code">Claude Code</a> — hear a sound the moment Claude needs you, no more staring at the terminal.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@davexdev/claude-bell"><img src="https://img.shields.io/npm/v/@davexdev/claude-bell?color=8b5cf6" alt="npm version"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-8b5cf6" alt="platforms">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-8b5cf6" alt="license MIT"></a>
</p>

| Sound | Plays when |
|-------|------------|
| ✅ complete | A task **finishes** (Claude stops responding) |
| ⏳ waiting | Claude is **waiting for your approval** to run a tool |
| 💤 idle | Claude is **idle**, waiting for your next prompt |
| 🤖 subagent | A **subagent finishes** |
| ❌ error | A **terminal command fails** *(optional — off by default)* |

It works by registering [Claude Code hooks](https://code.claude.com/docs/en/hooks-guide) that run a tiny, dependency-free Node script to play a sound. Cross-platform: **Windows, macOS, Linux**.

Six sound themes are bundled — pick whichever fits your taste:

| Theme | Feel |
|-------|------|
| `mac` *(default)* | Polished bell/chime tones — warm, inharmonic partials that ring out naturally, like a system notification. |
| `retro` | Chiptune pulse/triangle tones — classic game-console voices, punchy and playful. |
| `glass` | Minimal, near-inaudible taps — filtered-noise clicks with no tone at all, for when even a chime is too much. |
| `arcade` | Synthwave pad stabs — detuned analog-style oscillators with a filter-sweep brightening, warm 80s retro-futurism (not chiptune). |
| `marimba` | Acoustic mallet strikes — a noise transient plus inharmonic wooden partials, the most "real instrument" of the bunch. |
| `hud` | FM-synthesized sci-fi blips — metallic, evolving tones with glitchy static on errors, straight off a starship console. |

```bash
npx @davexdev/claude-bell theme retro   # switch
npx @davexdev/claude-bell test          # hear it
```

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
  "theme": "mac",
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

- **`theme`** = which bundled sound pack to use for bare filenames — one of `mac`, `retro`, `glass`, `arcade`, `marimba`, `hud` (see the table above). Ignored for absolute paths. Switch it with `claude-bell theme <name>`.
- **`sounds`** = named sounds → a file (a bundled `.wav` name looked up in the current theme, or an absolute path to your own).
- **`events`** = a Claude Code event → the name of the sound to play.

> Your config is **merged over the defaults**, so you only need to include the keys you want to change. Changes apply in the **next** Claude Code session (`test` reflects them immediately).

### Recipes — "I want to…"

| Goal | How |
|------|-----|
| **Switch the whole vibe** | `claude-bell theme retro` (or edit `"theme"` in your config). |
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
| `test [sound] [--theme=name]` | Play a sound now to check audio. Names: `complete`, `waiting`, `idle`, `subagent`, `error`. Default: `complete`. `--theme` previews a theme without saving it. |
| `theme [name]` | Show the current/available themes, or switch to one (`mac`, `retro`, `glass`, `arcade`, `marimba`, `hud`). |
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

The bundled sounds are synthesized tones — royalty-free, no third-party audio.
Each theme's synthesis lives in `scripts/sound-themes/<name>.js` (shared DSP
helpers in `scripts/sound-themes/synth.js`); `scripts/gen-sounds.js` renders
them all to `sounds/<theme>/*.wav`.

## License

[MIT](LICENSE)
