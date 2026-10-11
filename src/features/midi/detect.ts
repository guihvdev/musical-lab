import { chords, inKey, voice, type Chord } from '@/core/harmony';
import { bus, pushToProgression, render, state } from '@/core/store';

/** Reconhece o acorde nas notas pressionadas e o registra na trilha. */
export function detectChord(): void {
  bus.emit('live-notes', state.liveNotes);
  const live = state.liveNotes;
  if (live.size < 3) return;

  const pcs = new Set([...live].map((m) => m % 12));
  const exact = (c: Chord) => c.pcs.length === pcs.size && c.pcs.every((p) => pcs.has(p));
  // V7 sem a quinta
  const loose = (c: Chord) => c.kind === 'dom' && pcs.size === 3 && [0, 4, 10].every((x) => pcs.has((c.root + x) % 12));

  let found = chords.filter(exact);
  if (!found.length) found = chords.filter(loose);
  if (!found.length) return;

  // prioriza o que estava sugerido e depois o que pertence ao tom
  const suggested = new Set(state.suggestions.map((s) => s.chord.id));
  found.sort(
    (a, b) =>
      Number(suggested.has(b.id)) - Number(suggested.has(a.id)) ||
      Number(inKey(b, state.key)) - Number(inKey(a, state.key)),
  );

  const best = found[0];
  if (best.id === state.current) return;

  const lowest = Math.min(...live);
  pushToProgression(best.id);
  state.current = best.id;
  state.voicing = [...live].filter((m) => m !== lowest).sort((a, b) => a - b);
  state.bass = lowest;
  if (state.voicing.length < 2) state.voicing = voice(best, null);
  render();
}
