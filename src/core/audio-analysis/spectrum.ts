/* Cromagramas (agudo e baixo) a partir do espectrograma, com estimativa de afinação e supressão de percussão. */
import { stft, type Spectrogram } from './fft';

export const SAMPLE_RATE = 11025;
const SIZE = 4096; // ~0,37 s
const HOP = 1024; // ~93 ms
const TREBLE: [number, number] = [80, 1800];
const BASS: [number, number] = [40, 160];

export interface Chromagram {
  /** 12 valores por quadro. */
  treble: Float32Array;
  bass: Float32Array;
  /** Energia (soma de magnitude harmônica) por quadro. */
  energy: Float32Array;
  frames: number;
  /** Instante central de cada quadro, em segundos. */
  frameTime: (f: number) => number;
  /** Desvio de afinação estimado, em semitons (−0,5 … 0,5). */
  tuning: number;
}

const binFreq = (k: number) => (k * SAMPLE_RATE) / SIZE;
const midiOf = (f: number) => 69 + 12 * Math.log2(f / 440);

/** Mediana dos `n` primeiros valores (ordenação por inserção: janelas pequenas, sem alocar). */
function median(buf: Float32Array, n: number): number {
  for (let i = 1; i < n; i++) {
    const v = buf[i];
    let j = i - 1;
    while (j >= 0 && buf[j] > v) buf[j + 1] = buf[j--];
    buf[j + 1] = v;
  }
  return buf[n >> 1];
}

/** Desvio médio (circular) dos picos espectrais em relação à grade de 440 Hz. */
function estimateTuning(spec: Spectrogram): number {
  const { data, frames, bins } = spec;
  let sx = 0;
  let sy = 0;
  const lo = Math.ceil((TREBLE[0] * SIZE) / SAMPLE_RATE);
  const hi = Math.min(bins - 2, Math.floor((TREBLE[1] * SIZE) / SAMPLE_RATE));
  for (let f = 0; f < frames; f += 2) {
    const row = f * bins;
    let max = 0;
    for (let k = lo; k <= hi; k++) max = Math.max(max, data[row + k]);
    if (max <= 0) continue;
    for (let k = lo; k <= hi; k++) {
      const a = data[row + k - 1];
      const b = data[row + k];
      const c = data[row + k + 1];
      if (b < 0.1 * max || b <= a || b < c) continue;
      // pico interpolado por parábola
      const p = (0.5 * (a - c)) / (a - 2 * b + c || 1);
      const d = midiOf(binFreq(k + p));
      const ang = 2 * Math.PI * (d - Math.round(d));
      sx += b * Math.cos(ang);
      sy += b * Math.sin(ang);
    }
  }
  return sx || sy ? Math.atan2(sy, sx) / (2 * Math.PI) : 0;
}

/**
 * Máscara harmônica (HPSS simplificado): mediana no tempo = parte sustentada, mediana na frequência =
 * parte percussiva; cada célula fica com H² / (H² + P²) da magnitude.
 */
function harmonic(spec: Spectrogram): Float32Array {
  const { data, frames, bins } = spec;
  const out = new Float32Array(data.length);
  const T = 3; // ±3 quadros
  const F = 8; // ±8 bins
  const tb = new Float32Array(2 * T + 1);
  const fb = new Float32Array(2 * F + 1);
  for (let f = 0; f < frames; f++) {
    for (let k = 0; k < bins; k++) {
      let n = 0;
      for (let d = -T; d <= T; d++) {
        const g = f + d;
        if (g >= 0 && g < frames) tb[n++] = data[g * bins + k];
      }
      const h = median(tb, n);
      n = 0;
      for (let d = -F; d <= F; d++) {
        const j = k + d;
        if (j >= 0 && j < bins) fb[n++] = data[f * bins + j];
      }
      const p = median(fb, n);
      const h2 = h * h;
      const den = h2 + p * p;
      out[f * bins + k] = den > 0 ? (data[f * bins + k] * h2) / den : 0;
    }
  }
  return out;
}

/** Peso de cada bin na classe de altura mais próxima: cos² da distância (bins entre semitons quase não contam). */
function binMap(range: [number, number], tuning: number, bins: number) {
  const ks: number[] = [];
  const pcs: number[] = [];
  const ws: number[] = [];
  for (let k = 1; k < bins; k++) {
    const fq = binFreq(k);
    if (fq < range[0] || fq > range[1]) continue;
    const m = midiOf(fq) - tuning;
    const r = Math.round(m);
    ks.push(k);
    pcs.push(((r % 12) + 12) % 12);
    ws.push(Math.cos(Math.PI * (m - r)) ** 2);
  }
  return { ks, pcs, ws };
}

export function chromagram(samples: Float32Array): Chromagram {
  const maxBin = Math.ceil((TREBLE[1] * SIZE) / SAMPLE_RATE) + 2;
  const spec = stft(samples, SIZE, HOP, maxBin);
  const tuning = estimateTuning(spec);
  const mag = harmonic(spec);
  const { frames, bins } = spec;
  const tMap = binMap(TREBLE, tuning, bins);
  const bMap = binMap(BASS, tuning, bins);

  const treble = new Float32Array(frames * 12);
  const bass = new Float32Array(frames * 12);
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    const row = f * bins;
    for (let i = 0; i < tMap.ks.length; i++) {
      const v = mag[row + tMap.ks[i]];
      treble[f * 12 + tMap.pcs[i]] += v * tMap.ws[i];
      energy[f] += v;
    }
    for (let i = 0; i < bMap.ks.length; i++) bass[f * 12 + bMap.pcs[i]] += mag[row + bMap.ks[i]] * bMap.ws[i];
  }

  // compressão logarítmica relativa ao nível médio da música
  const compress = (c: Float32Array) => {
    let mean = 0;
    for (let i = 0; i < c.length; i++) mean += c[i];
    mean /= c.length || 1;
    if (mean > 0) for (let i = 0; i < c.length; i++) c[i] = Math.log1p((10 * c[i]) / mean);
  };
  compress(treble);
  compress(bass);

  return {
    treble,
    bass,
    energy,
    frames,
    frameTime: (f) => (f * HOP + SIZE / 2) / SAMPLE_RATE,
    tuning,
  };
}
