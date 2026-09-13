# SONORA — Terminal Music Player 🎵

> A sleek, keyboard-driven dual-mode music player: an interactive ANSI CLI for macOS/Linux terminals and a futuristic Web Hi-Fi synth player.

---

## 🌟 Overview

SONORA offers two distinct experiences in a single repository:

1. **Terminal CLI Player (`app.js`)**:
   - Runs directly in your terminal with rich ANSI escape colors, interactive ASCII artwork, real-time waveform animation, and progress bars.
   - Built with native Node.js (`readline`, `child_process`) requiring zero heavy runtime dependencies.
   - Leverages native audio streaming (`afplay` on macOS).

2. **Web Audio Synth Player (`index.html`, `player.js`, `style.css`)**:
   - Modern cyberpunk/terminal-inspired web interface with dynamic CSS waveforms and album art gradients.
   - Powered by Web Audio API synthesizers (`AudioContext`, `createGain`, `createOscillator`).

---

## 🚀 Quick Start

### 1. Terminal Mode

```bash
# Navigate to repository
cd MUSICPLAYER

# Run the terminal player
node app.js
```

### 2. Web Player Mode

Simply open `index.html` in any modern web browser or serve it locally:

```bash
npx serve .
# or
python3 -m http.server 8000
```

---

## ⌨️ Terminal Keybindings

| Key | Action |
| --- | --- |
| `↑` / `k` | Move cursor up in queue |
| `↓` / `j` | Move cursor down in queue |
| `Space` | Toggle Play / Pause |
| `←` / `→` | Seek backward / forward (10s) |
| `n` | Next track |
| `p` | Previous track |
| `s` | Toggle Shuffle |
| `r` | Toggle Repeat track |
| `q` / `Ctrl+C` | Quit player safely |

---

## 📁 Project Structure

```
├── app.js            # Node.js CLI terminal audio player
├── index.html        # Web player UI structure
├── player.js         # Web player Web Audio API synth engine
├── style.css         # Modern terminal UI styling & animations
├── music/            # Audio storage directory
│   └── README.md     # Instructions for adding local MP3 tracks
└── README.md         # Repository documentation
```

---

## 📜 License

MIT License. Designed with ♥ for terminal enthusiasts.

