#!/usr/bin/env node
/** SONORA — a keyboard-driven terminal music player (no browser required). */
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const songs = [
  ['Chammak Challo', 'Akon & Hamsika Iyer', 'Ra.One', 220, '01-chammak-challo.mp3'],
  ['Teri Meri Kahaani', 'Arijit Singh & Palak Muchhal', 'Gabbar Is Back', 321, '02-teri-meri-kahaani.mp3'],
  ['Tujhe Dekha To', 'Kumar Sanu & Lata Mangeshkar', 'Dilwale Dulhania Le Jayenge', 321, '03-tujhe-dekha-to.mp3'],
  ['Dheere Dheere', 'Yo Yo Honey Singh', 'Dheere Dheere', 234, '04-dheere-dheere.mp3'],
];

let selected = 0, playing = false, elapsed = 0, shuffle = false, repeat = false;
let audioProcess = null, message = 'PLACE YOUR MP3 FILES IN ./music TO PLAY';
const esc = '\x1b[';
const color = { reset:'\x1b[0m', lime:'\x1b[38;5;154m', dim:'\x1b[38;5;245m', white:'\x1b[97m', cyan:'\x1b[38;5;80m', orange:'\x1b[38;5;209m', dark:'\x1b[48;5;235m' };
const pad = (text, n) => String(text).slice(0, n).padEnd(n);
const clock = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
const bar = (value, total, width = 44) => {
  const filled = Math.round((value / total) * width);
  return `${color.lime}${'━'.repeat(filled)}${color.dim}${'━'.repeat(width - filled)}${color.reset}`;
};

function draw() {
  const [title, artist, album, duration] = songs[selected];
  const progress = Math.min(elapsed, duration);
  const wave = '▁▂▄▆█▇▄▂▃▅▇█▅▃▁▂▄▆█▆▄▂▁';
  const rows = songs.map((song, i) => {
    const current = i === selected;
    const marker = current ? `${color.lime}${playing ? '▶' : '◆'}${color.reset}` : ' ';
    const number = String(i + 1).padStart(2, '0');
    const text = `${marker} ${number}  ${pad(song[0], 23)}  ${color.dim}${pad(song[1], 15)}${color.reset} ${clock(song[3])}`;
    return current ? `${color.dark}${color.white} ${pad(text.replace(/\x1b\[[0-9;]*m/g, ''), 66)} ${color.reset}` : `  ${text}`;
  }).join('\n');
  const status = playing ? `${color.lime}● PLAYING${color.reset}` : `${color.orange}○ PAUSED${color.reset}`;
  const ui = `
${color.lime}╔════════════════════════════════════════════════════════════════════╗${color.reset}
${color.lime}║${color.reset}  ${color.white}S O N O R A${color.reset}  ${color.dim}/// TERMINAL MUSIC PLAYER${color.reset}                         ${color.lime}║${color.reset}
${color.lime}╚════════════════════════════════════════════════════════════════════╝${color.reset}

  ${status}  ${color.dim}AUDIO ENGINE ONLINE · 4 TRACKS${color.reset}
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
  process.stdout.write(`${esc}2J${esc}H${ui}`);
}

function audioPath(song) { return path.join(__dirname, 'music', song[4]); }
function stopAudio() {
  if (audioProcess) { audioProcess.kill('SIGKILL'); audioProcess = null; }
}
function startAudio() {
  const file = audioPath(songs[selected]);
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
    audioProcess.on('exit', () => {
      if (!audioProcess) return;
      audioProcess = null;
      if (playing) repeat ? startAudio() : next();
    });
    return true;
  } catch {
    playing = false; message = 'AUDIO ERROR: could not start afplay'; draw(); return false;
  }
}
function choose(index, shouldPlay = playing) {
  stopAudio(); selected = (index + songs.length) % songs.length; elapsed = 0; playing = shouldPlay;
  if (playing) startAudio(); else { message = `READY: music/${songs[selected][4]}`; draw(); }
}
function next() { choose(shuffle ? Math.floor(Math.random() * songs.length) : selected + 1); }

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
  if (elapsed >= songs[selected][3]) elapsed = songs[selected][3];
  draw();
}, 1000);

process.stdin.on('keypress', (_, key) => {
  if (key.ctrl && key.name === 'c' || key.name === 'q') quit();
  else if (key.name === 'up' || key.name === 'k') choose(selected - 1, false);
  else if (key.name === 'down' || key.name === 'j') choose(selected + 1, false);
  else if (key.name === 'space') {
    if (!playing) { playing = true; if (!audioProcess) startAudio(); else audioProcess.kill('SIGCONT'); }
    else { playing = false; if (audioProcess) audioProcess.kill('SIGSTOP'); message = 'PAUSED'; draw(); }
  }
  else if (key.name === 'right') { elapsed = Math.min(elapsed + 10, songs[selected][3]); draw(); }
  else if (key.name === 'left') { elapsed = Math.max(elapsed - 10, 0); draw(); }
  else if (key.name === 'n') next();
  else if (key.name === 'p') choose(selected - 1);
  else if (key.name === 's') { shuffle = !shuffle; draw(); }
  else if (key.name === 'r') { repeat = !repeat; draw(); }
});

function quit() {
  clearInterval(ticker);
  stopAudio();
  process.stdin.setRawMode(false);
  process.stdout.write(`${esc}?25h${esc}0m\nGoodbye from SONORA.\n`);
  process.exit(0);
}
