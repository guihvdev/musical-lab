/* Sintetizador simples: triângulo + seno oitavado, filtro passa-baixa, compressor e reverb por convolução. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const VOLUME = 0.7;

type AudioContextCtor = typeof AudioContext;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const AC: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!AC) return null;

  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = VOLUME;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3;

  const conv = ctx.createConvolver();
  const len = ctx.sampleRate * 2.2;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  conv.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.22;

  master.connect(comp);
  master.connect(conv);
  conv.connect(wet);
  wet.connect(comp);
  comp.connect(ctx.destination);
  return ctx;
}

/** Garante um contexto ativo (navegadores suspendem até haver interação). */
function ready(): AudioContext | null {
  const c = audio();
  if (c && c.state === 'suspended') void c.resume();
  return c;
}

function note(c: AudioContext, out: AudioNode, midi: number, t: number, dur: number, vel: number): void {
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const g = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(6000, f * 8), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2), t + 1.2);

  const o1 = c.createOscillator();
  const o2 = c.createOscillator();
  const g2 = c.createGain();
  o1.type = 'triangle';
  o1.frequency.value = f;
  o2.type = 'sine';
  o2.frequency.value = f * 2;
  g2.gain.value = 0.22;
  o2.detune.value = 4;

  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.006);
  g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  o1.connect(g);
  o2.connect(g2);
  g2.connect(g);
  g.connect(lp);
  lp.connect(out);

  o1.start(t);
  o2.start(t);
  o1.stop(t + dur + 0.05);
  o2.stop(t + dur + 0.05);
}

/** Toca uma nota isolada (teclado na tela). */
export function playNote(midi: number, dur = 1.6, vel = 0.16): void {
  const c = ready();
  if (!c || !master) return;
  note(c, master, midi, c.currentTime + 0.01, dur, vel);
}

/** Toca um acorde: baixo + voicing levemente arpejado. */
export function playChord(voicing: number[], bass: number, dur = 2.6): void {
  const c = ready();
  if (!c || !master) return;
  const t = c.currentTime + 0.02;
  note(c, master, bass, t, dur + 0.4, 0.2);
  voicing.forEach((m, i) => note(c, master!, m, t + 0.012 + i * 0.016, dur, 0.11));
}
