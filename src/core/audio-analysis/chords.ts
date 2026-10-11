/*
 * Reconhecimento de acordes por batida: modelos de croma (com harmônicos) para os nós do grafo e as tétrades
 * de vocabulário, e suavização Viterbi que favorece permanecer no acorde, transições que são arestas do grafo
 * e acordes do tom.
 */
import { MAJ, FLATS, SHARPS, QUALITIES, chordById, inKey, transitionsFrom, vocabChord, type Chord, type Quality } from '@/core/harmony';
import type { ChordSegment } from './types';

/** Qualidades reconhecidas: as dos anéis fixos e as tétrades Δ7, m7, ø7. */
const QUALS = ['maj', 'min', 'dom7', 'dim7', 'maj7', 'm7', 'm7b5'] as const satisfies readonly Quality[];
/** Leve preferência pelas leituras mais simples: tétrades só vencem com a sétima clara. */
const PENALTY: Record<(typeof QUALS)[number], number> = { maj: 0, min: 0, dom7: 0.012, dim7: 0.02, maj7: 0.03, m7: 0.03, m7b5: 0.035 };
/** Harmônicos 1–4 de cada nota (uníssono, oitava, 12ª, 2 oitavas), com decaimento. */
const HARMONICS: readonly [number, number][] = [[0, 1], [0, 0.6], [7, 0.36], [0, 0.22]];

const BASS_BONUS = 0.12;
const NO_CHORD_SCORE = 0.62;
const SHARPNESS = 25;
const CHANGE_COST = 3;
const EDGE_BONUS = 1;
const KEY_BONUS = 0.8;
const NO_CHORD_COST = 2;

interface State {
  id: string | null;
  name: string;
  root: number;
  template: Float64Array;
  penalty: number;
  /** Nó fixo cujas arestas valem para o acorde (o próprio, ou o `base` do vocabulário). */
  graphId: string | null;
  inKey: boolean;
  /** Classes de altura ordenadas, para não repetir alternativas enarmônicas (°7). */
  pcsKey: string;
}

/** Grafia da fundamental no tom: sustenidos de G a F#, bemóis no resto (inclusive C). */
function rootName(pc: number, key: number): string {
  const g = MAJ.indexOf(key as (typeof MAJ)[number]);
  return (g >= 2 && g <= 7 ? SHARPS : FLATS)[pc];
}

function chordFor(q: (typeof QUALS)[number], r: number, key: number): Chord {
  switch (q) {
    case 'maj':
      return chordById['M' + r];
    case 'min':
      return chordById['m' + r];
    case 'dom7':
      return chordById['VM' + ((r + 5) % 12)];
    case 'dim7':
      return chordById['d' + ((r + 1) % 12)];
    default:
      return vocabChord(q, r, rootName(r, key) + QUALITIES[q].suffix);
  }
}

function template(c: Chord): Float64Array {
  const t = new Float64Array(12);
  QUALITIES[c.quality].steps.forEach(([semis]) => {
    const pc = (c.root + semis) % 12;
    const w = semis === 10 || semis === 11 || semis === 9 ? 0.85 : 1;
    HARMONICS.forEach(([off, h]) => (t[(pc + off) % 12] += w * h));
  });
  const norm = Math.hypot(...t);
  return t.map((v) => v / norm);
}

function buildStates(key: number): State[] {
  const states: State[] = [];
  for (let r = 0; r < 12; r++) {
    for (const q of QUALS) {
      const c = chordFor(q, r, key);
      states.push({
        id: c.id,
        name: c.name,
        root: r,
        template: template(c),
        penalty: PENALTY[q],
        graphId: c.ring === 3 ? c.base : c.id,
        inKey: inKey(c, key),
        pcsKey: [...c.pcs].sort((a, b) => a - b).join(','),
      });
    }
  }
  states.push({ id: null, name: '—', root: -1, template: new Float64Array(12), penalty: 0, graphId: null, inKey: false, pcsKey: '' });
  return states;
}

/** Pontuação de cada estado em cada batida (0 … ~1). `chroma`/`bass` têm 12 valores por batida. */
function scoreBeats(states: State[], chroma: Float32Array, bass: Float32Array, energy: Float32Array): Float64Array[] {
  const beats = energy.length;
  const sorted = [...energy].sort((a, b) => a - b);
  const quiet = 0.1 * (sorted[sorted.length >> 1] ?? 0);
  return Array.from({ length: beats }, (_, b) => {
    const c = chroma.subarray(b * 12, b * 12 + 12);
    const bs = bass.subarray(b * 12, b * 12 + 12);
    const cn = Math.hypot(...c) || 1;
    const bmax = Math.max(...bs) || 1;
    const silent = energy[b] <= quiet;
    return Float64Array.from(states, (s) => {
      if (s.id === null) return silent ? 1 : NO_CHORD_SCORE;
      let dot = 0;
      for (let i = 0; i < 12; i++) dot += (c[i] / cn) * s.template[i];
      return dot + BASS_BONUS * (bs[s.root] / bmax) - s.penalty - (silent ? 1 : 0);
    });
  });
}

/** Caminho mais provável de estados (log-domínio). */
function viterbi(states: State[], scores: Float64Array[]): number[] {
  const K = states.length;
  const T = scores.length;
  if (!T) return [];
  const edges = new Set<string>();
  for (const from in transitionsFrom) transitionsFrom[from].forEach((t) => edges.add(from + '>' + t.to));
  // custo de ir de i para j (0 = permanecer)
  const trans = new Float64Array(K * K);
  for (let i = 0; i < K; i++) {
    for (let j = 0; j < K; j++) {
      if (i === j) continue;
      const a = states[i];
      const b = states[j];
      if (a.id === null || b.id === null) trans[i * K + j] = -NO_CHORD_COST;
      else {
        let v = -CHANGE_COST;
        if (a.graphId === b.graphId || edges.has(a.graphId + '>' + b.graphId)) v += EDGE_BONUS;
        if (b.inKey) v += KEY_BONUS;
        trans[i * K + j] = v;
      }
    }
  }

  let prev = Float64Array.from(scores[0], (s) => SHARPNESS * s);
  const back: Int32Array[] = [];
  for (let t = 1; t < T; t++) {
    const cur = new Float64Array(K);
    const bp = new Int32Array(K);
    for (let j = 0; j < K; j++) {
      let best = -Infinity;
      let arg = 0;
      for (let i = 0; i < K; i++) {
        const v = prev[i] + trans[i * K + j];
        if (v > best) {
          best = v;
          arg = i;
        }
      }
      cur[j] = best + SHARPNESS * scores[t][j];
      bp[j] = arg;
    }
    back.push(bp);
    prev = cur;
  }
  let last = 0;
  for (let j = 1; j < K; j++) if (prev[j] > prev[last]) last = j;
  const path = [last];
  for (let t = T - 2; t >= 0; t--) path.push(back[t][path[path.length - 1]]);
  return path.reverse();
}

/**
 * Acordes por batida, agrupados em trechos. `boundaries` tem uma entrada a mais que as batidas
 * (início de cada uma + fim da última).
 */
export function recognizeChords(
  key: number,
  boundaries: number[],
  chroma: Float32Array,
  bass: Float32Array,
  energy: Float32Array,
): ChordSegment[] {
  const states = buildStates(key);
  const scores = scoreBeats(states, chroma, bass, energy);
  const path = viterbi(states, scores);
  const segments: ChordSegment[] = [];
  for (let b = 0; b < path.length; ) {
    let e = b + 1;
    while (e < path.length && path[e] === path[b]) e++;
    const s = states[path[b]];
    // alternativas: melhor pontuação média no trecho, sem repetir o mesmo conjunto de notas
    const mean = states.map((_, k) => {
      let sum = 0;
      for (let t = b; t < e; t++) sum += scores[t][k];
      return sum / (e - b);
    });
    const seen = new Set([s.pcsKey]);
    const alternatives = states
      .map((st, k) => ({ st, v: mean[k] }))
      .filter(({ st }) => st.id !== null)
      .sort((x, y) => y.v - x.v)
      .filter(({ st }) => !seen.has(st.pcsKey) && seen.add(st.pcsKey))
      .slice(0, 3)
      .map(({ st }) => ({ id: st.id!, name: st.name }));
    segments.push({ start: boundaries[b], end: boundaries[e], beatStart: b, beatEnd: e, id: s.id, name: s.name, alternatives });
    b = e;
  }
  return segments;
}
