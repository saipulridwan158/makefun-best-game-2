// STARBLOOM — procedural WebAudio sound. No audio files: every sound is
// synthesised on the fly so the whole game stays offline static files.

let ctx = null;
let masterGain = null;
let muted = false;

export function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(ctx.destination);
}

export function toggleMute() {
  muted = !muted;
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.35;
  return muted;
}

function tone({ freq = 440, freqEnd = null, type = 'square', dur = 0.15, vol = 0.5, delay = 0 }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.3, vol = 0.5, filterFreq = 800, delay = 0 }) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, t0);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter).connect(gain).connect(masterGain);
  src.start(t0);
}

export const sfx = {
  shoot: () => tone({ freq: 880, freqEnd: 220, type: 'square', dur: 0.08, vol: 0.25 }),
  hit: () => noise({ dur: 0.08, vol: 0.3, filterFreq: 1200 }),
  explode: () => { noise({ dur: 0.35, vol: 0.55, filterFreq: 600 }); tone({ freq: 200, freqEnd: 40, type: 'sawtooth', dur: 0.3, vol: 0.4 }); },
  pickup: () => { tone({ freq: 660, type: 'sine', dur: 0.1, vol: 0.4 }); tone({ freq: 990, type: 'sine', dur: 0.12, vol: 0.4, delay: 0.07 }); },
  dash: () => tone({ freq: 300, freqEnd: 900, type: 'sawtooth', dur: 0.15, vol: 0.3 }),
  hurt: () => { tone({ freq: 160, freqEnd: 60, type: 'sawtooth', dur: 0.25, vol: 0.5 }); noise({ dur: 0.2, vol: 0.4, filterFreq: 400 }); },
  waveClear: () => [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.25, vol: 0.4, delay: i * 0.12 })),
  gameOver: () => [440, 330, 262, 175].forEach((f, i) => tone({ freq: f, type: 'sawtooth', dur: 0.4, vol: 0.45, delay: i * 0.22 })),
  ui: () => tone({ freq: 520, type: 'triangle', dur: 0.08, vol: 0.3 }),
};
