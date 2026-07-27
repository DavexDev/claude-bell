#!/usr/bin/env node
// claude-bell CLI: install / uninstall hooks, test playback, manage config.

import {
  readFileSync, writeFileSync, existsSync, mkdirSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { install, uninstall, settingsPathFor } from '../src/installer.js';
import {
  loadConfig, resolveSoundPath, userConfigPath, defaultConfigPath, packageRoot, themes,
} from '../src/config.js';
import { playSound } from '../src/player.js';

const argv = process.argv.slice(2);
const command = argv[0];
const flags = new Set(argv.filter((a) => a.startsWith('--') && !a.includes('=')));
const positionals = argv.slice(1).filter((a) => !a.startsWith('--'));
const project = flags.has('--project');
const errors = flags.has('--errors');

/** Value of a `--name=value` flag, or null if not passed. */
function flagValue(name) {
  const arg = argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : null;
}

function pkgVersion() {
  try {
    return JSON.parse(readFileSync(`${packageRoot}/package.json`, 'utf8')).version;
  } catch {
    return '0.0.0';
  }
}

const HELP = `claude-bell — sound notifications for Claude Code

Usage:
  claude-bell install [--project] [--errors]   Register hooks in settings.json (global by default)
  claude-bell uninstall [--project]            Remove claude-bell's hooks
  claude-bell test [sound] [--theme=name]       Play a sound to check audio (default: complete)
  claude-bell theme [name]                      Show/switch the sound theme
  claude-bell config                            Create/print the user config file
  claude-bell help                              Show this help
  claude-bell version                           Show the version

Flags:
  --project     Write to ./.claude/settings.json instead of the global ~/.claude one.
  --errors      Also play a sound when a Bash command fails (PostToolUseFailure).
                Off by default because tool failures can be frequent/noisy.
  --theme=name  With "test", preview a theme without switching your saved one.

Sounds: complete, waiting, idle, subagent, error (or any key in your config's "sounds").
Themes: ${themes.join(', ')} (default: mac).

Config: ${userConfigPath}
  Point "sounds" entries at your own .wav files, remap "events", or set
  "enabled": false to mute everything. See config.default.json for the shape.`;

function doInstall() {
  const res = install({ project, errors });
  console.log(`✔ Installed claude-bell hooks into:\n  ${res.path}`);
  console.log(`  Events: ${res.events.join(', ')}`);
  if (errors) console.log('  Error sound enabled for failed Bash commands.');
  if (res.backup) console.log(`  Backup saved: ${res.backup}`);
  console.log('\nRestart or start a new Claude Code session to load the hooks.');
}

function doUninstall() {
  const res = uninstall({ project });
  if (!res.existed) {
    console.log(`No settings file found at:\n  ${res.path}\nNothing to remove.`);
    return;
  }
  console.log(`✔ Removed ${res.removed} claude-bell hook block(s) from:\n  ${res.path}`);
  if (res.backup) console.log(`  Backup saved: ${res.backup}`);
}

async function doTest() {
  const name = positionals[0] || 'complete';
  const themeOverride = flagValue('theme');
  if (themeOverride && !themes.includes(themeOverride)) {
    console.error(`✘ Unknown theme "${themeOverride}". Available: ${themes.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const config = loadConfig();
  if (themeOverride) config.theme = themeOverride;
  const file = resolveSoundPath(config, name);
  if (!file) {
    console.error(`✘ No sound named "${name}" found (check config "sounds").`);
    process.exitCode = 1;
    return;
  }
  console.log(`♪ Playing "${name}": ${file}`);
  const ok = await playSound(file, { wait: true });
  if (!ok) {
    console.error('✘ Could not play the sound. Is an audio player available on this system?');
    if (process.platform === 'linux') {
      console.error('  On Linux install one of: pulseaudio-utils (paplay), alsa-utils (aplay), ffmpeg, or sox.');
    }
    process.exitCode = 1;
  }
}

function doTheme() {
  const name = positionals[0];
  if (!name) {
    const config = loadConfig();
    console.log(`Current theme: ${config.theme || 'mac'}`);
    console.log(`Available themes: ${themes.join(', ')}`);
    console.log('\nSwitch with: claude-bell theme <name>');
    return;
  }
  if (!themes.includes(name)) {
    console.error(`✘ Unknown theme "${name}". Available: ${themes.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  let userConfig = {};
  if (existsSync(userConfigPath)) {
    try {
      userConfig = JSON.parse(readFileSync(userConfigPath, 'utf8'));
    } catch {
      userConfig = {};
    }
  } else {
    mkdirSync(dirname(userConfigPath), { recursive: true });
  }
  userConfig.theme = name;
  writeFileSync(userConfigPath, `${JSON.stringify(userConfig, null, 2)}\n`, 'utf8');

  console.log(`✔ Theme set to "${name}":\n  ${userConfigPath}`);
  console.log('\nTry it now:  claude-bell test');
  console.log('Takes effect in your next Claude Code session.');
}

function doConfig() {
  if (!existsSync(userConfigPath)) {
    mkdirSync(dirname(userConfigPath), { recursive: true });
    const defaults = readFileSync(defaultConfigPath, 'utf8');
    writeFileSync(userConfigPath, defaults, 'utf8');
    console.log(`✔ Created user config from defaults:\n  ${userConfigPath}`);
  } else {
    console.log(`User config:\n  ${userConfigPath}`);
  }
  console.log('\nCurrent effective config:');
  console.log(JSON.stringify(loadConfig(), null, 2));
}

async function main() {
  switch (command) {
    case 'install': return doInstall();
    case 'uninstall': return doUninstall();
    case 'test': return doTest();
    case 'theme': return doTheme();
    case 'config': return doConfig();
    case 'version':
    case '--version':
    case '-v':
      return void console.log(pkgVersion());
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      return void console.log(HELP);
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`✘ ${err?.message || err}`);
  process.exitCode = 1;
});
