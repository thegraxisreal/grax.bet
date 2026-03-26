// Web Audio API sound effects — no external files needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

function resumeCtx() {
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Play a short tone */
export function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.18,
  startTime?: number
) {
  const ctx = resumeCtx();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + (startTime ?? 0));
  gainNode.gain.setValueAtTime(0, ctx.currentTime + (startTime ?? 0));
  gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + (startTime ?? 0) + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + (startTime ?? 0) + duration
  );

  osc.start(ctx.currentTime + (startTime ?? 0));
  osc.stop(ctx.currentTime + (startTime ?? 0) + duration);
}



export function playWireCut() {
  try {
    playTone(1450, 0.08, "triangle", 0.12);
    playTone(1850, 0.04, "triangle", 0.08, 0.02);
  } catch { /* silent fail */ }
}

export function playExplosion() {
  try {
    playTone(92, 0.45, "sawtooth", 0.22);
    playTone(60, 0.55, "sawtooth", 0.2, 0.03);

    const ctx = resumeCtx();
    const size = Math.floor(ctx.sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 420;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.35, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    src.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(ctx.destination);
    src.start();
  } catch { /* silent fail */ }
}

export function playCashoutWin() {
  try {
    [440, 554, 659, 880].forEach((freq, i) => playTone(freq, 0.2, "triangle", 0.15, i * 0.08));
  } catch { /* silent fail */ }
}
export function playCardDeal() {
  // Short papery swish: noise burst
  try {
    const ctx = resumeCtx();
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 3000;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start();
  } catch { /* silent fail */ }
}

export function playChipClick() {
  try {
    playTone(800, 0.08, "triangle", 0.15);
    playTone(1200, 0.05, "triangle", 0.08, 0.04);
  } catch { /* silent fail */ }
}

export function playWin() {
  try {
    // Ascending arpeggio
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => playTone(freq, 0.25, "sine", 0.18, i * 0.1));
  } catch { /* silent fail */ }
}

export function playBlackjack() {
  try {
    // More dramatic fanfare
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => playTone(freq, 0.3, "sine", 0.2, i * 0.09));
    setTimeout(() => {
      [1047, 1319].forEach((freq, i) => playTone(freq, 0.4, "triangle", 0.15, i * 0.12));
    }, 500);
  } catch { /* silent fail */ }
}

export function playLose() {
  try {
    playTone(300, 0.2, "sawtooth", 0.12);
    playTone(220, 0.3, "sawtooth", 0.1, 0.18);
  } catch { /* silent fail */ }
}

export function playBust() {
  try {
    playTone(400, 0.15, "sawtooth", 0.15);
    playTone(260, 0.25, "sawtooth", 0.12, 0.12);
  } catch { /* silent fail */ }
}

export function playWheelSpin() {
  // Rising hum as wheel accelerates
  try {
    const ctx = resumeCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 2.5);
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 5);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.06, ctx.currentTime + 4.2);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 5);
  } catch { /* silent fail */ }
}

export function playBallClatter(duration = 4.5) {
  // Rapid ticking that slows down — simulates ball bouncing in pockets
  try {
    const ctx = resumeCtx();
    const totalTicks = 32;
    for (let i = 0; i < totalTicks; i++) {
      // Exponential spacing — fast at start, slow at end
      const t = (Math.pow(i / totalTicks, 2.2)) * duration;
      const bufSize = Math.floor(ctx.sampleRate * 0.018);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufSize; j++) {
        data[j] = (Math.random() * 2 - 1) * (1 - j / bufSize);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      const vol = 0.08 + (i / totalTicks) * 0.12;
      g.gain.setValueAtTime(vol, ctx.currentTime + t);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2200 + Math.random() * 800;
      src.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      src.start(ctx.currentTime + t);
      src.stop(ctx.currentTime + t + 0.02);
    }
  } catch { /* silent fail */ }
}

export function playRouletteWin() {
  try {
    // Coins cascading
    const notes = [659, 784, 880, 1047, 1319, 1568];
    notes.forEach((freq, i) => playTone(freq, 0.3, "sine", 0.16, i * 0.08));
    setTimeout(() => {
      [1047, 1319, 1568].forEach((freq, i) => playTone(freq, 0.4, "triangle", 0.13, i * 0.1));
    }, 600);
  } catch { /* silent fail */ }
}

export function playRouletteLose() {
  try {
    playTone(280, 0.25, "sawtooth", 0.11);
    playTone(200, 0.35, "sawtooth", 0.09, 0.2);
    playTone(150, 0.4, "sawtooth", 0.07, 0.48);
  } catch { /* silent fail */ }
}

// ── Slots sounds ────────────────────────────────────────────────────────────

/** Mechanical whoosh when reels start spinning */
export function playSlotsReel() {
  try {
    const ctx = resumeCtx();
    // Rising noise burst — like a mechanical lever pull
    const bufSize = Math.floor(ctx.sampleRate * 0.18);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(i / bufSize, 0.6) * (1 - i / bufSize);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start();

    // Add a low mechanical hum underneath
    const osc = ctx.createOscillator();
    const oscG = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.18);
    oscG.gain.setValueAtTime(0.04, ctx.currentTime);
    oscG.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);
    osc.connect(oscG);
    oscG.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch { /* silent fail */ }
}

/** Mechanical click/thunk when a reel stops (call once per reel, staggered) */
export function playReelStop() {
  try {
    const ctx = resumeCtx();
    // Sharp transient: triangle wave thump + noise burst
    playTone(160, 0.08, "triangle", 0.22);
    playTone(90, 0.12, "sine", 0.14, 0.01);

    const bufSize = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize) * 0.6;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start();
  } catch { /* silent fail */ }
}

/** Ascending win chime — played on any winning spin */
export function playSlotsWin() {
  try {
    // 4-note ascending arpeggio with triangle wave (bright, bell-like)
    const notes = [523, 659, 880, 1175];
    notes.forEach((freq, i) => playTone(freq, 0.35, "triangle", 0.16, i * 0.09));
    // Follow-up shimmer
    setTimeout(() => {
      [1175, 1568].forEach((freq, i) => playTone(freq, 0.25, "sine", 0.1, i * 0.08));
    }, 450);
  } catch { /* silent fail */ }
}

/** Big win celebration horn — played on 5-of-a-kind or jackpot */
export function playSlotsBigWin() {
  try {
    // Fanfare: bold ascending notes
    const fanfare = [392, 523, 659, 784, 1047, 1319];
    fanfare.forEach((freq, i) => playTone(freq, 0.4, "sine", 0.2, i * 0.08));
    // Triumphant follow-up chord
    setTimeout(() => {
      [523, 659, 784].forEach((freq, i) => {
        playTone(freq, 0.6, "triangle", 0.14, i * 0.02);
      });
      [1047, 1319, 1568].forEach((freq, i) => {
        playTone(freq, 0.5, "sine", 0.12, 0.1 + i * 0.03);
      });
    }, 580);
    // Coin rain effect: rapid light ticks
    for (let k = 0; k < 14; k++) {
      const t = 0.7 + k * 0.07;
      playTone(1400 + Math.random() * 400, 0.06, "triangle", 0.06, t);
    }
  } catch { /* silent fail */ }
}
