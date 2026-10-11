import { inKey } from './analysis';
import { chordById, type Chord, type Transition } from './chords';
import type { HarmonyGraph } from './graph';
import { TRANSITION_INDEX, type LayerState } from './transitions';

/** 'next' = leva ao próximo acorde da progressão-modelo; 'focus' = leva a uma função em foco do estudo. */
export type SuggestionTag = 'next' | 'focus';

export interface Suggestion {
  transition: Transition;
  chord: Chord;
  tag?: SuggestionTag;
}

export interface SuggestionContext {
  graph: HarmonyGraph;
  layers: LayerState;
  /** Tom usado para o pertencimento (no estudo de modos, o tom maior do campo). */
  fieldKey: number;
  next?: ReadonlySet<string>;
  focus?: ReadonlySet<string>;
}

const MAX_SUGGESTIONS = 12;
const TAG_SCORE: Record<SuggestionTag, number> = { next: 2, focus: 1 };

/** Próximos acordes a partir de `id`: prioridade do estudo, depois tipo de transição, depois pertencimento ao tom. */
export function suggestionsFor(id: string | null, ctx: SuggestionContext): Suggestion[] {
  if (!id) return [];
  const score = (s: Suggestion) => (s.tag ? TAG_SCORE[s.tag] : 0);
  return (ctx.graph.from[id] ?? [])
    .filter((t) => ctx.layers[t.type])
    .map((t): Suggestion => {
      const tag = ctx.next?.has(t.to) ? 'next' : ctx.focus?.has(t.to) ? 'focus' : undefined;
      return { transition: t, chord: chordById[t.to], tag };
    })
    .sort(
      (a, b) =>
        score(b) - score(a) ||
        TRANSITION_INDEX[a.transition.type] - TRANSITION_INDEX[b.transition.type] ||
        Number(inKey(b.chord, ctx.fieldKey)) - Number(inKey(a.chord, ctx.fieldKey)),
    )
    .slice(0, MAX_SUGGESTIONS);
}
