#!/usr/bin/env node
/**
 * ============================================================================
 * SONORA — Keyboard-Driven Terminal Music Player
 * ============================================================================
 *
 * An interactive, lightweight music player built entirely with Node.js built-ins.
 * It renders high-contrast ANSI UI frames in raw terminal mode and manages native
 * audio playback without requiring heavy dependencies or external web runtimes.
 *
 * Features:
 *   - Native ANSI terminal UI with interactive track queue & live progress bar
 *   - Animated dynamic VU equalizer waveform visualizer that dances during playback
 *   - Multiple selectable ANSI aesthetic color themes (Cyber Lime, Matrix, Amber, Synthwave)
 *   - In-app interactive help overlay modal ('?' or 'H' key)
 *   - Dynamic library scanning: automatically discovers .mp3, .wav, .m4a in ./music
 *   - Interactive volume control with visual meter & mute toggle (+, -, m)
 *   - Signal-based audio control (afplay on macOS, SIGSTOP/SIGCONT/SIGKILL)
 *   - Interactive raw keyboard event handling (Vim-style j/k, arrow keys, space)
 *   - Configurable playback modes: repeat track, shuffle queue
 *   - Clean terminal lifecycle management (cursor toggling, buffer cleanup)
 *
 * @author Yatnesh Agarwal
 * @license MIT
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Supported audio file extensions for local directory auto-discovery.
 * @type {Set<string>}
 */
const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg']);

/**
 * Default fallback catalog used when ./music contains no custom audio tracks.
 * Tuple format: [title, artist, album, estimatedDurationSecs, filename]
 *
 * @type {Array<[string, string, string, number, string]>}
 */
const DEFAULT_SONGS = [
  ['Chammak Challo', 'Akon & Hamsika Iyer', 'Ra.One', 220, '01-chammak-challo.mp3'],
  ['Teri Meri Kahaani', 'Arijit Singh & Palak Muchhal', 'Gabbar Is Back', 321, '02-teri-meri-kahaani.mp3'],
  ['Tujhe Dekha To', 'Kumar Sanu & Lata Mangeshkar', 'Dilwale Dulhania Le Jayenge', 321, '03-tujhe-dekha-to.mp3'],
  ['Dheere Dheere', 'Yo Yo Honey Singh', 'Dheere Dheere', 234, '04-dheere-dheere.mp3'],
];

/**
 * ANSI Color Palette Presets for Custom Aesthetic Themes.
 */
const THEMES = [
  {
    name: 'CYBER LIME',
    accent: '\x1b[38;5;154m',
    highlight: '\x1b[38;5;80m',
    dim: '\x1b[38;5;245m',
    white: '\x1b[97m',
    warning: '\x1b[38;5;209m',
    dark: '\x1b[48;5;235m'
  },
  {
    name: 'MATRIX GREEN',
    accent: '\x1b[38;5;46m',
    highlight: '\x1b[38;5;82m',
    dim: '\x1b[38;5;240m',
    white: '\x1b[97m',
    warning: '\x1b[38;5;190m',
    dark: '\x1b[48;5;234m'
  },
  {
    name: 'AMBER CRT',
    accent: '\x1b[38;5;214m',
    highlight: '\x1b[38;5;220m',
    dim: '\x1b[38;5;240m',
    white: '\x1b[97m',
    warning: '\x1b[38;5;202m',
    dark: '\x1b[48;5;236m'
  },
  {
    name: 'SYNTHWAVE NEON',
    accent: '\x1b[38;5;199m',
    highlight: '\x1b[38;5;51m',
    dim: '\x1b[38;5;243m',
    white: '\x1b[97m',
    warning: '\x1b[38;5;213m',
    dark: '\x1b[48;5;235m'
  }
];

let themeIndex = 0;
const curTheme = () => THEMES[themeIndex];

/**
 * Animated VU Equalizer Waveform Frames.
 */
const WAVES = [
  '▁▂▄▆█▇▄▂▃▅▇█▅▃▁▂▄▆█▆▄▂▁',
  '▃▅▇█▅▃▁▂▄▆█▇▄▂▁▂▄▆█▆▄▂▃',
  '█▇▄▂▃▅▇█▅▃▁▂▄▆█▆▄▂▁▂▄▆█',
  '▄▆█▆▄▂▁▂▄▆█▇▄▂▃▅▇█▅▃▁▂▄'
];
let waveFrame = 0;

/**
 * Scans the local `./music` directory to automatically detect audio tracks.
 * Parses filenames into human-readable titles, artists, and clean queue items.
 *
 * @returns {Array<[string, string, string, number, string]>} Active playlist
 */
function scanMusicDirectory() {
  const musicDir = path.join(__dirname, 'music');
  if (!fs.existsSync(musicDir)) {
    try { fs.mkdirSync(musicDir, { recursive: true }); } catch {}
    return [...DEFAULT_SONGS];
  }

  try {
    const files = fs.readdirSync(musicDir);
    const audioFiles = files.filter(f => SUPPORTED_EXTENSIONS.has(path.extname(f).toLowerCase()));

    if (audioFiles.length === 0) {
      return [...DEFAULT_SONGS];
    }

    return audioFiles.map(filename => {
      const ext = path.extname(filename);
      const base = path.basename(filename, ext).replace(/^[0-9]+[_\s.-]+/, '');
      const parts = base.split(/\s*[-–—]\s*/);

      let title = base;
      let artist = 'Local Artist';
      let album = 'Local Library';

      if (parts.length >= 2) {
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }

      return [title, artist, album, 240, filename];
    });
  } catch (err) {
    return [...DEFAULT_SONGS];
  }
}

/**
 * Active track catalog loaded from disk or defaults.
 */
let songs = scanMusicDirectory();

// ----------------------------------------------------------------------------
// Runtime State Management
// ----------------------------------------------------------------------------
let selected = 0;        // Currently active/highlighted song index
let playing = false;      // Playback status flag
let elapsed = 0;        // Elapsed playback time in seconds
let shuffle = false;      // Shuffle mode toggle
let repeat = false;       // Loop current track toggle
let volume = 80;          // Volume percentage (0 - 100)
let muted = false;        // Mute toggle flag
let previousVolume = 80;  // Previous volume level prior to mute
let showHelp = false;     // In-app help modal overlay flag
let audioProcess = null; // Child process reference for native audio player
let message = 'PLACE YOUR AUDIO FILES IN ./music TO PLAY';

// ANSI escape sequence constants
const esc = '\x1b[';
const resetColor = '\x1b[0m';
const redColor = '\x1b[38;5;196m';

// ----------------------------------------------------------------------------
// Formatting & Layout Helpers
// ----------------------------------------------------------------------------

const pad = (text, n) => String(text).slice(0, n).padEnd(n);
const clock = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

const bar = (value, total, width = 44) => {
  const th = curTheme();
  const filled = Math.max(0, Math.min(width, Math.round((value / total) * width)));
  return `${th.accent}${'━'.repeat(filled)}${th.dim}${'━'.repeat(width - filled)}${resetColor}`;
};

const volumeMeter = () => {
  const th = curTheme();
  if (muted) {
    return `${redColor}[MUTED]${resetColor}`;
  }
  const blocks = Math.round((volume / 100) * 10);
  const visual = '■'.repeat(blocks) + '·'.repeat(10 - blocks);
  return `${th.highlight}VOL: ${String(volume).padStart(3)}% [${th.accent}${visual}${th.highlight}]${resetColor}`;
};

// ----------------------------------------------------------------------------
// Terminal Rendering Engine
// ----------------------------------------------------------------------------

function draw() {
  const th = curTheme();

  if (showHelp) {
    const helpBox = `
${th.accent}╔════════════════════════════════════════════════════════════════════╗${resetColor}
${th.accent}║${resetColor}  ${th.white}S O N O R A${resetColor}  ${th.dim}/// KEYBOARD REFERENCE GUIDE${resetColor}                      ${th.accent}║${resetColor}
${th.accent}╚════════════════════════════════════════════════════════════════════╝${resetColor}

  ${th.white}PLAYBACK CONTROLS${resetColor}
  ${th.highlight}SPACE${resetColor}       Toggle Play / Pause
  ${th.highlight}← / →${resetColor}       Seek Backward / Forward 10 seconds
  ${th.highlight}N / P${resetColor}       Next Track / Previous Track
  ${th.highlight}S / R${resetColor}       Toggle Shuffle / Toggle Repeat

  ${th.white}NAVIGATION & QUEUE${resetColor}
  ${th.highlight}↑/↓, J/K${resetColor}    Move selection cursor up / down
  ${th.highlight}L${resetColor}           Rescan and reload ./music directory

  ${th.white}AUDIO & APPEARANCE${resetColor}
  ${th.highlight}+ / -${resetColor}       Adjust Volume (5% increments)
  ${th.highlight}M${resetColor}           Toggle Audio Mute
  ${th.highlight}T${resetColor}           Cycle Color Theme (${th.name})
  ${th.highlight}? / H${resetColor}       Toggle this Help Screen
  ${th.highlight}Q / Ctrl+C${resetColor}  Exit Sonora gracefully

  ${th.dim}Press '?' or 'H' to return to player.${resetColor}
`;
    process.stdout.write(`${esc}2J${esc}H${helpBox}`);
    return;
  }

  const [title, artist, album, duration] = songs[selected] || ['No Track', 'Unknown', 'None', 0, ''];
  const progress = Math.min(elapsed, duration || 1);
  const wave = playing ? WAVES[waveFrame] : WAVES[0];

  const rows = songs.map((song, i) => {
    const current = i === selected;
    const marker = current ? `${th.accent}${playing ? '▶' : '◆'}${resetColor}` : ' ';
    const number = String(i + 1).padStart(2, '0');
    const text = `${marker} ${number}  ${pad(song[0], 23)}  ${th.dim}${pad(song[1], 15)}${resetColor} ${clock(song[3])}`;
    return current
      ? `${th.dark}${th.white} ${pad(text.replace(/\x1b\[[0-9;]*m/g, ''), 66)} ${resetColor}`
      : `  ${text}`;
  }).join('\n');

  const status = playing
    ? `${th.accent}● PLAYING${resetColor}`
    : `${th.warning}○ PAUSED${resetColor}`;

  const ui = `
${th.accent}╔════════════════════════════════════════════════════════════════════╗${resetColor}
${th.accent}║${resetColor}  ${th.white}S O N O R A${resetColor}  ${th.dim}/// ${pad(th.name, 14)}${resetColor}        ${volumeMeter()} ${th.accent}║${resetColor}
${th.accent}╚════════════════════════════════════════════════════════════════════╝${resetColor}

  ${status}  ${th.dim}AUDIO ENGINE ONLINE · ${songs.length} TRACK(S) DISCOVERED${resetColor}
  ${th.dim}${message}${resetColor}

  ${th.accent}NOW PLAYING${resetColor}  ${th.dim}────────────────────────────────────────────────────${resetColor}

  ${th.highlight}      ▄▄▄▄▄▄▄${resetColor}
  ${th.highlight}   ▄▄${th.accent}  ${String(selected + 1).padStart(2, '0')}  ${th.highlight}▄▄${resetColor}     ${th.white}${title.toUpperCase()}${resetColor}
  ${th.highlight}  ▄${th.accent}   ◉◉   ${th.highlight}▄${resetColor}    ${artist} ${th.dim}— ${album}${resetColor}
  ${th.highlight}   ▀▀${th.accent}  SONORA ${th.highlight}▀▀${resetColor}

  ${th.dim}${wave}${resetColor}
  ${clock(progress)}  ${bar(progress, duration || 1)}  ${clock(duration)}

  ${th.accent}QUEUE${resetColor}        ${th.dim}TITLE                    ARTIST          TIME${resetColor}
  ${th.dim}──────────────────────────────────────────────────────────────────${resetColor}
${rows}

  ${th.dim}↑/↓ or J/K${resetColor} select     ${th.dim}SPACE${resetColor} play/pause     ${th.dim}←/→${resetColor} seek     ${th.dim}?${resetColor} help
  ${th.dim}+/-${resetColor} volume         ${th.dim}M${resetColor} mute toggle        ${th.dim}T${resetColor} theme (${th.name})
  ${th.dim}N/P${resetColor} next/prev       ${th.dim}S${resetColor} shuffle ${shuffle ? th.accent + 'ON' : th.dim + 'OFF'}${resetColor}       ${th.dim}R${resetColor} repeat ${repeat ? th.accent + 'ON' : th.dim + 'OFF'}${resetColor}       ${th.dim}Q${resetColor} quit
`;

  process.stdout.write(`${esc}2J${esc}H${ui}`);
}

// ----------------------------------------------------------------------------
// Audio Playback Controller
// ----------------------------------------------------------------------------

function audioPath(song) {
  return path.join(__dirname, 'music', song[4]);
}

function stopAudio() {
  if (audioProcess) {
    audioProcess.kill('SIGKILL');
    audioProcess = null;
  }
}

function getVolumeLevel() {
  if (muted) return 0;
  return Number((volume / 100).toFixed(2));
}

function startAudio() {
  if (!songs[selected]) return false;
  const file = audioPath(songs[selected]);

  if (!fs.existsSync(file)) {
    playing = false;
    message = `MISSING: music/${songs[selected][4]}`;
    draw();
    return false;
  }

  stopAudio();
  try {
    const volArg = String(getVolumeLevel());
    audioProcess = spawn('afplay', ['-v', volArg, file], { stdio: 'ignore' });
    message = `PLAYING: music/${songs[selected][4]}`;

    audioProcess.on('error', () => {
      playing = false;
      message = 'AUDIO ERROR: afplay is required (macOS)';
      draw();
    });

    audioProcess.on('exit', () => {
      if (!audioProcess) return;
      audioProcess = null;
      if (playing) {
        repeat ? startAudio() : next();
      }
    });

    return true;
  } catch {
    playing = false;
    message = 'AUDIO ERROR: could not start afplay';
    draw();
    return false;
  }
}

function choose(index, shouldPlay = playing) {
  stopAudio();
  selected = (index + songs.length) % songs.length;
  elapsed = 0;
  playing = shouldPlay;

  if (playing) {
    startAudio();
  } else {
    message = `READY: music/${songs[selected][4]}`;
    draw();
  }
}

function next() {
  choose(shuffle ? Math.floor(Math.random() * songs.length) : selected + 1);
}

function reloadLibrary() {
  songs = scanMusicDirectory();
  selected = Math.min(selected, Math.max(0, songs.length - 1));
  message = `LIBRARY RELOADED: ${songs.length} track(s)`;
  draw();
}

function changeVolume(delta) {
  if (muted) muted = false;
  volume = Math.max(0, Math.min(100, volume + delta));
  message = `VOLUME: ${volume}%`;
  if (playing && audioProcess) {
    startAudio();
  } else {
    draw();
  }
}

function toggleMute() {
  if (!muted) {
    previousVolume = volume;
    muted = true;
    message = 'AUDIO MUTED';
  } else {
    muted = false;
    volume = previousVolume || 50;
    message = `VOLUME RESTORED: ${volume}%`;
  }
  if (playing && audioProcess) {
    startAudio();
  } else {
    draw();
  }
}

function cycleTheme() {
  themeIndex = (themeIndex + 1) % THEMES.length;
  message = `THEME SWITCHED: ${curTheme().name}`;
  draw();
}

// ----------------------------------------------------------------------------
// Terminal Lifecycle & Raw Mode Initialization
// ----------------------------------------------------------------------------

if (!process.stdout.isTTY) {
  console.error('SONORA needs an interactive terminal. Run: node app.js');
  process.exit(1);
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

process.stdout.write(`${esc}?25l`);
draw();

const ticker = setInterval(() => {
  if (!playing) return;
  elapsed++;
  waveFrame = (waveFrame + 1) % WAVES.length;
  if (songs[selected] && elapsed >= songs[selected][3]) {
    elapsed = songs[selected][3];
  }
  draw();
}, 1000);

process.stdin.on('keypress', (_, key) => {
  if (key.ctrl && key.name === 'c' || key.name === 'q') {
    quit();
  } else if (key.name === 'up' || key.name === 'k') {
    choose(selected - 1, false);
  } else if (key.name === 'down' || key.name === 'j') {
    choose(selected + 1, false);
  } else if (key.name === 'space') {
    if (!playing) {
      playing = true;
      if (!audioProcess) {
        startAudio();
      } else {
        audioProcess.kill('SIGCONT');
      }
    } else {
      playing = false;
      if (audioProcess) {
        audioProcess.kill('SIGSTOP');
      }
      message = 'PAUSED';
      draw();
    }
  } else if (key.name === 'right') {
    if (songs[selected]) elapsed = Math.min(elapsed + 10, songs[selected][3]);
    draw();
  } else if (key.name === 'left') {
    elapsed = Math.max(elapsed - 10, 0);
    draw();
  } else if (key.name === 'n') {
    next();
  } else if (key.name === 'p') {
    choose(selected - 1);
  } else if (key.name === 's') {
    shuffle = !shuffle;
    draw();
  } else if (key.name === 'r') {
    repeat = !repeat;
    draw();
  } else if (key.name === 'l') {
    reloadLibrary();
  } else if (key.name === 't') {
    cycleTheme();
  } else if (key.name === 'question' || key.sequence === '?' || key.name === 'h') {
    showHelp = !showHelp;
    draw();
  } else if (key.name === 'plus' || key.sequence === '+' || key.sequence === '=') {
    changeVolume(5);
  } else if (key.name === 'minus' || key.sequence === '-') {
    changeVolume(-5);
  } else if (key.name === 'm') {
    toggleMute();
  }
});

function quit() {
  clearInterval(ticker);
  stopAudio();
  process.stdin.setRawMode(false);
  process.stdout.write(`${esc}?25h${esc}0m\nGoodbye from SONORA.\n`);
  process.exit(0);
}
