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
function playTone(
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
