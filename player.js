/**
 * ============================================================================
 * SONORA — Web Audio Synthesizer & Player Engine
 * ============================================================================
 *
 * Implements an interactive terminal-style web audio player utilizing the
 * browser's native Web Audio API (AudioContext, GainNode, OscillatorNode) to
 * procedurally generate ambient melodic synth arpeggios for each track.
 *
 * Architecture:
 *   - Procedural Web Audio API sound synthesis (sine wave oscillator sequence)
 *   - Reactive DOM rendering (album art color gradient, dynamic track queue)
 *   - Procedural animated audio visualizer bar generator
 *   - Responsive playback controls (play/pause, seek, volume, shuffle, repeat)
 *
 * @author Yatnesh Agarwal
 * @license MIT
 */

/**
 * Procedural track definitions with frequencies (Hz) for melodic synthesis.
 * @type {Array<{title: string, artist: string, album: string, duration: number, color: string, notes: number[]}>}
 */
const tracks = [
  {title:'Midnight Protocol', artist:'Orion Vale', album:'Signals from Elsewhere', duration:222, color:'linear-gradient(130deg,#081f25 5%,#175353 48%,#ffd554 49%,#bc6549 61%,#18291e 63%)', notes:[146.83,174.61,220,196]},
  {title:'Static Bloom', artist:'Mira Fenn', album:'Soft Machine', duration:198, color:'linear-gradient(135deg,#371c45,#f06a9b 48%,#fcdb75 49%,#51346a)', notes:[261.63,329.63,392,523.25]},
  {title:'Glass Memory', artist:'NOVA/9', album:'Archive One', duration:247, color:'linear-gradient(135deg,#192b62,#5bbde9 49%,#d9f3f4 50%,#244150)', notes:[130.81,164.81,196,246.94]},
  {title:'Afterimage', artist:'Kian Dusk', album:'Open Circuit', duration:197, color:'linear-gradient(135deg,#4c321c,#ff7651 42%,#dfff48 43%,#18332e)', notes:[196,246.94,293.66,369.99]}
  {
    title: 'Midnight Protocol',
    artist: 'Orion Vale',
    album: 'Signals from Elsewhere',
    duration: 222,
    color: 'linear-gradient(130deg,#081f25 5%,#175353 48%,#ffd554 49%,#bc6549 61%,#18291e 63%)',
    notes: [146.83, 174.61, 220.00, 196.00] // D3, F3, A3, G3
  },
  {
    title: 'Static Bloom',
    artist: 'Mira Fenn',
    album: 'Soft Machine',
    duration: 198,
    color: 'linear-gradient(135deg,#371c45,#f06a9b 48%,#fcdb75 49%,#51346a)',
    notes: [261.63, 329.63, 392.00, 523.25] // C4, E4, G4, C5
  },
  {
    title: 'Glass Memory',
    artist: 'NOVA/9',
    album: 'Archive One',
    duration: 247,
    color: 'linear-gradient(135deg,#192b62,#5bbde9 49%,#d9f3f4 50%,#244150)',
    notes: [130.81, 164.81, 196.00, 246.94] // C3, E3, G3, B3
  },
  {
    title: 'Afterimage',
    artist: 'Kian Dusk',
    album: 'Open Circuit',
    duration: 197,
    color: 'linear-gradient(135deg,#4c321c,#ff7651 42%,#dfff48 43%,#18332e)',
    notes: [196.00, 246.94, 293.66, 369.99] // G3, B3, D4, F#4
  }
];
let current=0, playing=false, elapsed=0, timer, ctx, gain, oscillator, repeat=false;
const $=s=>document.querySelector(s), list=$('#trackList'), play=$('#play'), seek=$('#seek');
function fmt(n){return `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`}
function makeWave(){const w=$('#waveform');w.innerHTML='';Array.from({length:74},(_,i)=>{let b=document.createElement('i');b.className='bar';b.style.height=`${8+Math.abs(Math.sin(i*2.2))*31}px`;b.style.animationDelay=`${i%7*.08}s`;w.append(b)})}
function render(){let t=tracks[current];$('#trackTitle').textContent=t.title;$('#trackArtist').innerHTML=`${t.artist} <span>—</span> ${t.album}`;$('#albumArt').style.background=t.color;$('#albumArt .art-type').innerHTML=t.title.toUpperCase().split(' ').join('<br><span>')+'</span>';$('#albumArt .art-no').textContent=String(current+1).padStart(2,'0');$('#duration').textContent=fmt(t.duration);seek.max=t.duration;elapsed=0;seek.value=0;$('#elapsed').textContent='0:00';list.innerHTML=tracks.map((x,i)=>`<article class="track ${i===current?'current':''}" data-index="${i}"><span class="track-no">${String(i+1).padStart(2,'0')}</span><span class="mini-art" style="--art:${x.color}"></span><span class="track-title">${x.title}</span><span class="track-meta">${x.artist}</span><span class="track-time">${fmt(x.duration)}</span></article>`).join('');}
function audio(on){if(!on){if(oscillator){oscillator.stop();oscillator=null}return}ctx??=new AudioContext();gain??=ctx.createGain();gain.connect(ctx.destination);gain.gain.value=+$('#volume').value*.13;let step=0; const sound=()=>{if(!playing)return; oscillator=ctx.createOscillator();let g=ctx.createGain();oscillator.type='sine';oscillator.frequency.value=tracks[current].notes[step++%4];g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.32,ctx.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.42);oscillator.connect(g).connect(gain);oscillator.start();oscillator.stop(ctx.currentTime+.45);setTimeout(sound,500)};sound()}
function toggle(){playing=!playing;play.textContent=playing?'Ⅱ':'▶';play.setAttribute('aria-label',playing?'Pause track':'Play track');document.querySelectorAll('.bar').forEach(x=>x.classList.toggle('playing',playing));if(playing){audio(true);timer=setInterval(()=>{elapsed++;seek.value=elapsed;$('#elapsed').textContent=fmt(elapsed);if(elapsed>=tracks[current].duration) next()},1000)}else{clearInterval(timer);audio(false)}}
function setTrack(i,auto=playing){if(playing)toggle();current=(i+tracks.length)%tracks.length;render();if(auto)toggle()}
function next(){setTrack(repeat ? current : current+1,true)}
list.addEventListener('click',e=>{let row=e.target.closest('.track');if(row)setTrack(+row.dataset.index,true)});play.onclick=toggle;$('#next').onclick=next;$('#previous').onclick=()=>setTrack(current-1,true);$('#repeat').onclick=e=>{repeat=!repeat;e.currentTarget.classList.toggle('active',repeat)};$('#shuffle').onclick=e=>{e.currentTarget.classList.toggle('active');setTrack(Math.floor(Math.random()*tracks.length),true)};seek.oninput=()=>{elapsed=+seek.value;$('#elapsed').textContent=fmt(elapsed)};$('#volume').oninput=e=>{if(gain)gain.gain.value=+e.target.value*.13};
makeWave();render();

// ----------------------------------------------------------------------------
// Runtime Audio & Player State
// ----------------------------------------------------------------------------
let current = 0;          // Active track index
let playing = false;      // Playback active flag
let elapsed = 0;          // Playback progress in seconds
let timer = null;         // 1-second interval timer ID
let ctx = null;           // Web Audio AudioContext instance
let gain = null;          // Master GainNode
let oscillator = null;    // Active OscillatorNode instance
let repeat = false;       // Repeat mode flag

// DOM Element Selectors
const $ = s => document.querySelector(s);
const list = $('#trackList');
const play = $('#play');
const seek = $('#seek');

/**
 * Formats seconds into MM:SS string representation.
 * @param {number} n - Total seconds
 * @returns {string} Formatted timestamp
 */
function fmt(n) {
  return `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
}

/**
 * Generates dynamic visualizer bars in the DOM with staggered CSS animations.
 */
function makeWave() {
  const w = $('#waveform');
  w.innerHTML = '';
  Array.from({ length: 74 }, (_, i) => {
    const b = document.createElement('i');
    b.className = 'bar';
    b.style.height = `${8 + Math.abs(Math.sin(i * 2.2)) * 31}px`;
    b.style.animationDelay = `${(i % 7) * 0.08}s`;
    w.append(b);
  });
}

/**
 * Updates DOM to reflect the currently active track metadata and queue state.
 */
function render() {
  const t = tracks[current];
  $('#trackTitle').textContent = t.title;
  $('#trackArtist').innerHTML = `${t.artist} <span>—</span> ${t.album}`;
  $('#albumArt').style.background = t.color;
  $('#albumArt .art-type').innerHTML = t.title.toUpperCase().split(' ').join('<br><span>') + '</span>';
  $('#albumArt .art-no').textContent = String(current + 1).padStart(2, '0');
  $('#duration').textContent = fmt(t.duration);

  seek.max = t.duration;
  elapsed = 0;
  seek.value = 0;
  $('#elapsed').textContent = '0:00';

  // Render track queue rows
  list.innerHTML = tracks.map((x, i) => `
    <article class="track ${i === current ? 'current' : ''}" data-index="${i}">
      <span class="track-no">${String(i + 1).padStart(2, '0')}</span>
      <span class="mini-art" style="--art:${x.color}"></span>
      <span class="track-title">${x.title}</span>
      <span class="track-meta">${x.artist}</span>
      <span class="track-time">${fmt(x.duration)}</span>
    </article>
  `).join('');
}

/**
 * Web Audio API Synthesis Engine:
 * Generates an evolving procedural synthesizer arpeggio loop based on the track's note sequence.
 * @param {boolean} on - Whether to turn audio synthesis on or off
 */
function audio(on) {
  if (!on) {
    if (oscillator) {
      try { oscillator.stop(); } catch {}
      oscillator = null;
    }
    return;
  }

  // Initialize Web Audio context lazily on user gesture
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  gain ??= ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.value = +$('#volume').value * 0.13;

  let step = 0;
  const sound = () => {
    if (!playing) return;
    try {
      oscillator = ctx.createOscillator();
      const noteGain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = tracks[current].notes[step++ % 4];

      // Audio envelope shaping: quick attack and smooth exponential decay
      noteGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      noteGain.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);

      oscillator.connect(noteGain).connect(gain);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.45);
      setTimeout(sound, 500);
    } catch {}
  };

  sound();
}

/**
 * Toggles play and pause state, updating timers and UI controls.
 */
function toggle() {
  playing = !playing;
  play.textContent = playing ? 'Ⅱ' : '▶';
  play.setAttribute('aria-label', playing ? 'Pause track' : 'Play track');
  document.querySelectorAll('.bar').forEach(x => x.classList.toggle('playing', playing));

  if (playing) {
    audio(true);
    timer = setInterval(() => {
      elapsed++;
      seek.value = elapsed;
      $('#elapsed').textContent = fmt(elapsed);
      if (elapsed >= tracks[current].duration) {
        next();
      }
    }, 1000);
  } else {
    clearInterval(timer);
    audio(false);
  }
}

/**
 * Selects a track by index and refreshes UI.
 * @param {number} i - Track index
 * @param {boolean} [auto=playing] - Whether to continue playback immediately
 */
function setTrack(i, auto = playing) {
  if (playing) toggle();
  current = (i + tracks.length) % tracks.length;
  render();
  if (auto) toggle();
}

/**
 * Advances to the next track, observing repeat mode.
 */
function next() {
  setTrack(repeat ? current : current + 1, true);
}

// ----------------------------------------------------------------------------
// Event Listeners & Initialization
// ----------------------------------------------------------------------------
list.addEventListener('click', e => {
  const row = e.target.closest('.track');
  if (row) setTrack(+row.dataset.index, true);
});

play.onclick = toggle;
$('#next').onclick = next;
$('#previous').onclick = () => setTrack(current - 1, true);

$('#repeat').onclick = e => {
  repeat = !repeat;
  e.currentTarget.classList.toggle('active', repeat);
};

$('#shuffle').onclick = e => {
  e.currentTarget.classList.toggle('active');
  setTrack(Math.floor(Math.random() * tracks.length), true);
};

seek.oninput = () => {
  elapsed = +seek.value;
  $('#elapsed').textContent = fmt(elapsed);
};

$('#volume').oninput = e => {
  if (gain) {
    gain.gain.value = +e.target.value * 0.13;
  }
};

// Initialize visualizer and interface
makeWave();
render();
