import { chordById, transitionsFrom, type Chord, type Transition } from './chords';
import { inKey } from './analysis';
import { TRANSITION_INDEX, type LayerState } from './transitions';

export interface Suggestion {
  transition: Transition;
  chord: Chord;
}

const MAX_SUGGESTIONS = 12;

/** Próximos acordes a partir de `id`, por tipo de transição e depois pertencimento ao tom. */
export function suggestionsFor(id: string | null, layers: LayerState, key: number): Suggestion[] {
  if (!id) return [];
  return (transitionsFrom[id] ?? [])
    .filter((t) => layers[t.type])
    .map((t) => ({ transition: t, chord: chordById[t.to] }))
    .sort(
      (a, b) =>
        TRANSITION_INDEX[a.transition.type] - TRANSITION_INDEX[b.transition.type] ||
        Number(inKey(b.chord, key)) - Number(inKey(a.chord, key)),
    )
    .slice(0, MAX_SUGGESTIONS);
}
