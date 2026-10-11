/* Batidas: força de ataque (fluxo espectral), andamento por autocorrelação e fase por programação dinâmica (Ellis, 2007). */
import { stft } from './fft';
import { SAMPLE_RATE } from './spectrum';

const SIZE = 1024;
const HOP = 128; // ~11,6 ms
const FPS = SAMPLE_RATE / HOP;
const MIN_BPM = 60;
const MAX_BPM = 180;

export interface Beats {
  /** Instantes das batidas, em segundos (crescentes). */
  times: number[];
  bpm: number;
}

/** Força de ataque por quadro: soma do aumento de log-magnitude, sem a média local, normalizada. */
function onsetEnvelope(samples: Float32Array): Float32Array {
  const spec = stft(samples, SIZE, HOP);
  const { data, frames, bins } = spec;
  const env = new Float32Array(frames);
  const prev = new Float32Array(bins);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let k = 1; k < bins; k++) {
      const v = Math.log1p(100 * data[f * bins + k]);
      if (f) sum += Math.max(0, v - prev[k]);
      prev[k] = v;
    }
    env[f] = sum;
  }
  // tira a média móvel (~0,4 s) e retifica
  const w = Math.round(0.2 * FPS);
  const out = new Float32Array(frames);
  let acc = 0;
  for (let f = 0; f < Math.min(frames, w); f++) acc += env[f];
  for (let f = 0; f < frames; f++) {
    if (f + w < frames) acc += env[f + w];
    if (f - w - 1 >= 0) acc -= env[f - w - 1];
    const n = Math.min(frames - 1, f + w) - Math.max(0, f - w) + 1;
    out[f] = Math.max(0, env[f] - acc / n);
  }
  let sd = 0;
  for (let f = 0; f < frames; f++) sd += out[f] * out[f];
  sd = Math.sqrt(sd / (frames || 1));
  if (sd > 0) for (let f = 0; f < frames; f++) out[f] /= sd;
  return out;
}

/** Período da batida em quadros: autocorrelação ponderada por uma preferência log-gaussiana em torno de 120 bpm. */
function estimatePeriod(env: Float32Array): number {
  const minLag = Math.floor((60 / MAX_BPM) * FPS);
  const maxLag = Math.ceil((60 / MIN_BPM) * FPS);
  const ac = new Float64Array(maxLag + 2);
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let i = lag; i < env.length; i++) s += env[i] * env[i - lag];
    ac[lag] = s / (env.length - lag || 1);
  }
  let best = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const prior = Math.exp(-0.5 * (Math.log2(lag / FPS / 0.5) / 1.0) ** 2);
    const score = ac[lag] * prior;
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  // refinamento por parábola
  const a = ac[best - 1];
  const b = ac[best];
  const c = ac[best + 1];
  const den = a - 2 * b + c;
  return den < 0 ? best + (0.5 * (a - c)) / den : best;
}

/** Fase: maximiza ataque nas batidas + regularidade em torno do período. */
function trackBeats(env: Float32Array, period: number): number[] {
  const n = env.length;
  const score = new Float64Array(n);
  const back = new Int32Array(n).fill(-1);
  const tightness = 100;
  const lo = Math.round(period / 2);
  const hi = Math.round(period * 2);
  for (let t = 0; t < n; t++) {
    let best = 0;
    let arg = -1;
    for (let tau = t - hi; tau <= t - lo; tau++) {
      if (tau < 0) continue;
      const v = score[tau] - tightness * Math.log((t - tau) / period) ** 2;
      if (v > best || arg < 0) {
        best = v;
        arg = tau;
      }
    }
    score[t] = env[t] + (arg >= 0 ? best : 0);
    back[t] = arg;
  }
  // a última batida: melhor pontuação no último período
  let end = n - 1;
  for (let t = Math.max(0, n - Math.round(period)); t < n; t++) if (score[t] > score[end]) end = t;
  const beats: number[] = [];
  for (let t = end; t >= 0; t = back[t]) beats.push(t);
  return beats.reverse();
}

export function detectBeats(samples: Float32Array, duration: number): Beats {
  const env = onsetEnvelope(samples);
  const period = estimatePeriod(env);
  let frames = trackBeats(env, period);
  // sem ataques (pad, silêncio): grade regular no período estimado
  if (frames.length < 4) frames = Array.from({ length: Math.floor(env.length / period) }, (_, i) => Math.round(i * period));
  const offset = SIZE / 2 / SAMPLE_RATE;
  const times = frames.map((f) => f / FPS + offset).filter((t) => t < duration);

  const gaps = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b);
  const bpm = gaps.length ? 60 / gaps[gaps.length >> 1] : (60 * FPS) / period;
  return { times, bpm };
}
