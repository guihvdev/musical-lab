import { chords, transitions, transitionsFrom, type Chord, type Transition, type VocabChord } from './chords';
import type { TransitionKind } from './transitions';

/** Conjunto de nós e arestas ativos (anéis fixos + vocabulário e caminhos do estudo). */
export interface HarmonyGraph {
  chords: Chord[];
  transitions: Transition[];
  from: Record<string, Transition[]>;
}

export const baseGraph: HarmonyGraph = { chords, transitions, from: transitionsFrom };

/**
 * Acrescenta acordes de vocabulário e caminhos de progressão ao grafo fixo.
 * Cada acorde de vocabulário herda as arestas (de ida e de volta) do seu nó base; os caminhos viram
 * arestas do tipo 'std' quando o par ainda não tem transição.
 */
export function extendGraph(vocab: VocabChord[], paths: readonly (readonly [string, string])[]): HarmonyGraph {
  if (!vocab.length && !paths.length) return baseGraph;

  const list = [...transitions];
  const from: Record<string, Transition[]> = {};
  for (const id in transitionsFrom) from[id] = [...transitionsFrom[id]];
  const seen = new Set(transitions.map((t) => t.from + '>' + t.to));
  const add = (a: string, b: string, type: TransitionKind) => {
    const k = a + '>' + b;
    if (a === b || seen.has(k)) return;
    seen.add(k);
    const t: Transition = { from: a, to: b, type };
    list.push(t);
    (from[a] ??= []).push(t);
  };

  const variants = new Map<string, string[]>();
  vocab.forEach((v) => variants.set(v.base, [...(variants.get(v.base) ?? []), v.id]));
  for (const t of transitions) {
    const sources = [t.from, ...(variants.get(t.from) ?? [])];
    const targets = [t.to, ...(variants.get(t.to) ?? [])];
    for (const a of sources) for (const b of targets) add(a, b, t.type);
  }
  paths.forEach(([a, b]) => add(a, b, 'std'));

  return { chords: [...chords, ...vocab], transitions: list, from };
}
