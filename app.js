#!/usr/bin/env node
/** SONORA — a keyboard-driven terminal music player (no browser required). */
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
 * Default Track Catalog.
 * Each entry tuple structure:
 *   [0] Title (string)
 *   [1] Artist(s) (string)
 *   [2] Album / Soundtrack (string)
 *   [3] Duration in seconds (number)
 *   [4] Filename in ./music folder (string)
 *
 * @type {Array<[string, string, string, number, string]>}
 */
const songs = [
  ['Chammak Challo', 'Akon & Hamsika Iyer', 'Ra.One', 220, '01-chammak-challo.mp3'],
  ['Teri Meri Kahaani', 'Arijit Singh & Palak Muchhal', 'Gabbar Is Back', 321, '02-teri-meri-kahaani.mp3'],
  ['Tujhe Dekha To', 'Kumar Sanu & Lata Mangeshkar', 'Dilwale Dulhania Le Jayenge', 321, '03-tujhe-dekha-to.mp3'],
  ['Dheere Dheere', 'Yo Yo Honey Singh', 'Dheere Dheere', 234, '04-dheere-dheere.mp3'],
];

let selected = 0, playing = false, elapsed = 0, shuffle = false, repeat = false;
let audioProcess = null, message = 'PLACE YOUR MP3 FILES IN ./music TO PLAY';
// ----------------------------------------------------------------------------
// Runtime State Management
// ----------------------------------------------------------------------------
let selected = 0;       // Currently active/highlighted song index
let playing = false;     // Playback status flag
let elapsed = 0;       // Elapsed playback time in seconds
let shuffle = false;     // Shuffle mode toggle
let repeat = false;      // Loop current track toggle
let audioProcess = null;// Child process reference for native audio player
let message = 'PLACE YOUR MP3 FILES IN ./music TO PLAY';

// ANSI escape sequence constants for terminal rendering
const esc = '\x1b[';
const color = { reset:'\x1b[0m', lime:'\x1b[38;5;154m', dim:'\x1b[38;5;245m', white:'\x1b[97m', cyan:'\x1b[38;5;80m', orange:'\x1b[38;5;209m', dark:'\x1b[48;5;235m' };
const color = {
  reset:  '\x1b[0m',
  lime:   '\x1b[38;5;154m',
  dim:    '\x1b[38;5;245m',
  white:  '\x1b[97m',
  cyan:   '\x1b[38;5;80m',
  orange: '\x1b[38;5;209m',
  dark:   '\x1b[48;5;235m'
};

// ----------------------------------------------------------------------------
// Formatting & Layout Helpers
// ----------------------------------------------------------------------------

/**
 * Truncates or pads a string to fit a fixed terminal column width.
 * @param {string|number} text - The input string to format
 * @param {number} n - Target width in characters
 * @returns {string} Fixed-width padded string
 */
const pad = (text, n) => String(text).slice(0, n).padEnd(n);

/**
 * Formats a duration in seconds into MM:SS format.
 * @param {number} n - Time in seconds
 * @returns {string} Formatted timestamp string (e.g. "3:42")
 */
const clock = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

/**
 * Generates an ASCII horizontal progress bar.
 * @param {number} value - Current position in seconds
 * @param {number} total - Total duration in seconds
 * @param {number} [width=44] - Total character length of the bar
 * @returns {string} ANSI-colored progress bar string
 */
const bar = (value, total, width = 44) => {
  const filled = Math.round((value / total) * width);
  return `${color.lime}${'━'.repeat(filled)}${color.dim}${'━'.repeat(width - filled)}${color.reset}`;
};

// ----------------------------------------------------------------------------
// Terminal Rendering Engine
// ----------------------------------------------------------------------------

/**
 * Renders the complete terminal user interface.
 * Clears the active screen buffer and draws header, status, ASCII art,
 * track details, progress bar, queue, and shortcut legends.
 */
function draw() {
  const [title, artist, album, duration] = songs[selected];
  const progress = Math.min(elapsed, duration);
  const wave = '▁▂▄▆█▇▄▂▃▅▇█▅▃▁▂▄▆█▆▄▂▁';

  // Format track list entries with cursor markers
  const rows = songs.map((song, i) => {
    const current = i === selected;
    const marker = current ? `${color.lime}${playing ? '▶' : '◆'}${color.reset}` : ' ';
    const number = String(i + 1).padStart(2, '0');
    const text = `${marker} ${number}  ${pad(song[0], 23)}  ${color.dim}${pad(song[1], 15)}${color.reset} ${clock(song[3])}`;
    return current ? `${color.dark}${color.white} ${pad(text.replace(/\x1b\[[0-9;]*m/g, ''), 66)} ${color.reset}` : `  ${text}`;
    return current
      ? `${color.dark}${color.white} ${pad(text.replace(/\x1b\[[0-9;]*m/g, ''), 66)} ${color.reset}`
      : `  ${text}`;
  }).join('\n');
  const status = playing ? `${color.lime}● PLAYING${color.reset}` : `${color.orange}○ PAUSED${color.reset}`;

  const status = playing
    ? `${color.lime}● PLAYING${color.reset}`
    : `${color.orange}○ PAUSED${color.reset}`;

  const ui = `
${color.lime}╔════════════════════════════════════════════════════════════════════╗${color.reset}
${color.lime}║${color.reset}  ${color.white}S O N O R A${color.reset}  ${color.dim}/// TERMINAL MUSIC PLAYER${color.reset}                         ${color.lime}║${color.reset}
${color.lime}╚════════════════════════════════════════════════════════════════════╝${color.reset}

  ${status}  ${color.dim}AUDIO ENGINE ONLINE · 4 TRACKS${color.reset}
  ${status}  ${color.dim}AUDIO ENGINE ONLINE · ${songs.length} TRACKS${color.reset}
  ${color.dim}${message}${color.reset}

  ${color.lime}NOW PLAYING${color.reset}  ${color.dim}────────────────────────────────────────────────────${color.reset}

  ${color.cyan}      ▄▄▄▄▄▄▄${color.reset}
  ${color.cyan}   ▄▄${color.lime}  01  ${color.cyan}▄▄${color.reset}     ${color.white}${title.toUpperCase()}${color.reset}
  ${color.cyan}  ▄${color.lime}   ◉◉   ${color.cyan}▄${color.reset}    ${artist} ${color.dim}— ${album}${color.reset}
  ${color.cyan}   ▀▀${color.lime}  SONORA ${color.cyan}▀▀${color.reset}

  ${color.dim}${wave}${color.reset}
  ${clock(progress)}  ${bar(progress, duration)}  ${clock(duration)}

  ${color.lime}QUEUE${color.reset}        ${color.dim}TITLE                    ARTIST          TIME${color.reset}
  ${color.dim}──────────────────────────────────────────────────────────────────${color.reset}
${rows}

  ${color.dim}↑/↓ or J/K${color.reset} select     ${color.dim}SPACE${color.reset} play/pause     ${color.dim}←/→${color.reset} seek
  ${color.dim}N/P${color.reset} next/previous     ${color.dim}S${color.reset} shuffle ${shuffle ? color.lime + 'ON' : color.dim + 'OFF'}${color.reset}     ${color.dim}R${color.reset} repeat ${repeat ? color.lime + 'ON' : color.dim + 'OFF'}${color.reset}     ${color.dim}Q${color.reset} quit
`;

  // Write clear screen escape + home cursor + UI buffer
  process.stdout.write(`${esc}2J${esc}H${ui}`);
}

function audioPath(song) { return path.join(__dirname, 'music', song[4]); }
// ----------------------------------------------------------------------------
// Audio Playback Controller
// ----------------------------------------------------------------------------

/**
 * Resolves absolute filesystem path for a track's audio file.
 * @param {[string, string, string, number, string]} song - Song data tuple
 * @returns {string} Absolute path to audio file
 */
function audioPath(song) {
  return path.join(__dirname, 'music', song[4]);
}

/**
 * Terminates any active background audio player process.
 */
function stopAudio() {
  if (audioProcess) { audioProcess.kill('SIGKILL'); audioProcess = null; }
  if (audioProcess) {
    audioProcess.kill('SIGKILL');
    audioProcess = null;
  }
}

/**
 * Initiates audio playback for the currently selected song.
 * Uses native macOS 'afplay' process.
 * @returns {boolean} True if playback started successfully, false otherwise
 */
function startAudio() {
  const file = audioPath(songs[selected]);

  // Verify file existence in local storage
  if (!fs.existsSync(file)) {
    playing = false;
    message = `MISSING: music/${songs[selected][4]}`;
    draw();
    return false;
  }

  stopAudio();
  try {
    audioProcess = spawn('afplay', [file], { stdio: 'ignore' });
    message = `PLAYING: music/${songs[selected][4]}`;
    audioProcess.on('error', () => { playing = false; message = 'AUDIO ERROR: afplay is required (macOS)'; draw(); });

    audioProcess.on('error', () => {
      playing = false;
      message = 'AUDIO ERROR: afplay is required (macOS)';
      draw();
    });

    audioProcess.on('exit', () => {
      if (!audioProcess) return;
      audioProcess = null;
      if (playing) repeat ? startAudio() : next();
      if (playing) {
        repeat ? startAudio() : next();
      }
    });

    return true;
  } catch {
    playing = false; message = 'AUDIO ERROR: could not start afplay'; draw(); return false;
    playing = false;
    message = 'AUDIO ERROR: could not start afplay';
    draw();
    return false;
  }
}

/**
 * Selects a track in the playlist by index and optionally triggers playback.
 * @param {number} index - Index of track to activate
 * @param {boolean} [shouldPlay=playing] - Whether to start playback immediately
 */
function choose(index, shouldPlay = playing) {
  stopAudio(); selected = (index + songs.length) % songs.length; elapsed = 0; playing = shouldPlay;
  if (playing) startAudio(); else { message = `READY: music/${songs[selected][4]}`; draw(); }
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
function next() { choose(shuffle ? Math.floor(Math.random() * songs.length) : selected + 1); }

/**
 * Advances to the next track, accounting for shuffle mode.
 */
function next() {
  choose(shuffle ? Math.floor(Math.random() * songs.length) : selected + 1);
}

// ----------------------------------------------------------------------------
// Terminal Lifecycle & Raw Mode Initialization
// ----------------------------------------------------------------------------

if (!process.stdout.isTTY) {
  console.error('SONORA needs an interactive terminal. Run: node app.js');
  process.exit(1);
}

// Configure raw keyboard input stream
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

// Hide terminal cursor for clean UI display
process.stdout.write(`${esc}?25l`);
draw();

// Global 1-second interval ticker for updating elapsed time & progress UI
const ticker = setInterval(() => {
  if (!playing) return;
  elapsed++;
  if (elapsed >= songs[selected][3]) elapsed = songs[selected][3];
  if (elapsed >= songs[selected][3]) {
    elapsed = songs[selected][3];
  }
  draw();
}, 1000);

// ----------------------------------------------------------------------------
// Keypress Event Listener
// ----------------------------------------------------------------------------
process.stdin.on('keypress', (_, key) => {
  if (key.ctrl && key.name === 'c' || key.name === 'q') quit();
  else if (key.name === 'up' || key.name === 'k') choose(selected - 1, false);
  else if (key.name === 'down' || key.name === 'j') choose(selected + 1, false);
  else if (key.name === 'space') {
    if (!playing) { playing = true; if (!audioProcess) startAudio(); else audioProcess.kill('SIGCONT'); }
    else { playing = false; if (audioProcess) audioProcess.kill('SIGSTOP'); message = 'PAUSED'; draw(); }
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
        audioProcess.kill('SIGCONT'); // Resume paused afplay process
      }
    } else {
      playing = false;
      if (audioProcess) {
        audioProcess.kill('SIGSTOP'); // Pause afplay process via signal
      }
      message = 'PAUSED';
      draw();
    }
  } else if (key.name === 'right') {
    elapsed = Math.min(elapsed + 10, songs[selected][3]);
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
  }
  else if (key.name === 'right') { elapsed = Math.min(elapsed + 10, songs[selected][3]); draw(); }
  else if (key.name === 'left') { elapsed = Math.max(elapsed - 10, 0); draw(); }
  else if (key.name === 'n') next();
  else if (key.name === 'p') choose(selected - 1);
  else if (key.name === 's') { shuffle = !shuffle; draw(); }
  else if (key.name === 'r') { repeat = !repeat; draw(); }
});

/**
 * Restores terminal state, clears intervals, terminates child processes, and exits.
 */
function quit() {
  clearInterval(ticker);
  stopAudio();
  process.stdin.setRawMode(false);
  process.stdout.write(`${esc}?25h${esc}0m\nGoodbye from SONORA.\n`);
  process.exit(0);
}
