import { chordById, inKey } from '@/core/harmony';
import { detectBeats } from './beats';
import { recognizeChords } from './chords';
import { estimateKey } from './key';
import { SAMPLE_RATE, chromagram, type Chromagram } from './spectrum';
import type { AnalysisStage, AudioAnalysis, ChordSegment } from './types';

/**
 * Tom a partir dos acordes reconhecidos: batidas cujo acorde pertence ao tom, com bônus para a tônica maior e
 * a relativa menor. Mais estável que o perfil de croma, que tende a escolher a dominante.
 */
function keyFromChords(segments: ChordSegment[]): { key: number; minor: boolean } {
  let best = { score: -1, key: 0, minor: false };
  for (let k = 0; k < 12; k++) {
    let score = 0;
    let major = 0;
    let minor = 0;
    for (const s of segments) {
      if (!s.id) continue;
      const c = chordById[s.id];
      const beats = s.beatEnd - s.beatStart;
      if (inKey(c, k)) score += beats;
      if (c.root === k && (c.kind === 'maj' || c.quality === 'maj7')) major += beats;
      if (c.root === (k + 9) % 12 && c.kind === 'min') minor += beats;
    }
    score += 0.5 * (major + minor);
    if (score > best.score) best = { score, key: k, minor: minor > major };
  }
  return best;
}

/** Média dos quadros de croma de cada batida (o quadro mais próximo quando a batida é curta demais). */
function beatSync(chroma: Chromagram, boundaries: number[]) {
  const n = boundaries.length - 1;
  const treble = new Float32Array(n * 12);
  const bass = new Float32Array(n * 12);
  const energy = new Float32Array(n);
  let f = 0;
  for (let b = 0; b < n; b++) {
    const [t0, t1] = [boundaries[b], boundaries[b + 1]];
    while (f < chroma.frames - 1 && chroma.frameTime(f) < t0) f++;
    let g = f;
    const frames: number[] = [];
    while (g < chroma.frames && chroma.frameTime(g) < t1) frames.push(g++);
    if (!frames.length) frames.push(Math.min(f, chroma.frames - 1));
    for (const fr of frames) {
      for (let i = 0; i < 12; i++) {
        treble[b * 12 + i] += chroma.treble[fr * 12 + i] / frames.length;
        bass[b * 12 + i] += chroma.bass[fr * 12 + i] / frames.length;
      }
      energy[b] += chroma.energy[fr] / frames.length;
    }
  }
  return { treble, bass, energy };
}

/**
 * Analisa áudio mono a `SAMPLE_RATE` Hz: batidas, tom e acordes por batida.
 * `onStage` é chamado antes de cada etapa (para a barra de progresso).
 */
export function analyzeAudio(samples: Float32Array, onStage: (stage: AnalysisStage) => void = () => {}): AudioAnalysis {
  const duration = samples.length / SAMPLE_RATE;
  // normaliza o pico
  let peak = 0;
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  if (peak > 0) for (let i = 0; i < samples.length; i++) samples[i] /= peak;

  onStage('espectro');
  const chroma = chromagram(samples);

  onStage('batidas');
  const { times, bpm } = detectBeats(samples, duration);
  const boundaries = [...(times[0] > 0.15 ? [0] : []), ...times, duration];
  if (boundaries[0] !== 0) boundaries[0] = 0;

  onStage('acordes');
  const sync = beatSync(chroma, boundaries);
  const profile = new Float64Array(12);
  for (let b = 0; b < sync.energy.length; b++) {
    const row = sync.treble.subarray(b * 12, b * 12 + 12);
    const norm = Math.hypot(...row) || 1;
    for (let i = 0; i < 12; i++) profile[i] += (row[i] / norm) * sync.energy[b];
  }
  // 1ª passada com o tom do perfil de croma; se os acordes apontarem outro tom, refaz com ele
  const first = estimateKey(profile);
  let segments = recognizeChords(first.key, boundaries, sync.treble, sync.bass, sync.energy);
  const { key, minor } = keyFromChords(segments);
  if (key !== first.key) segments = recognizeChords(key, boundaries, sync.treble, sync.bass, sync.energy);

  return { duration, bpm, key, minor, tuning: chroma.tuning, beats: boundaries, segments };
}
