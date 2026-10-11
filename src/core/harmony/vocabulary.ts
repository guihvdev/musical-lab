/* Acordes de vocabulário (anel 3): criados sob demanda e herdando as transições de um nó fixo. */
import { chordById, pcsOf, registerChord, type VocabChord } from './chords';
import { QUALITIES, type Quality } from './qualities';
import { spellChord } from './spelling';

export const vocabId = (quality: Quality, root: number) => `v:${quality}:${root}`;

/**
 * Nó fixo equivalente em função: maj7/6 → tríade maior; m7/m6/m7b5 → tríade menor (o ø7 age como ii);
 * dominantes estendidas → V7 que resolve na tríade maior uma quinta abaixo.
 */
function baseFor(quality: Quality, root: number): string {
  switch (QUALITIES[quality].family) {
    case 'maj':
      return 'M' + root;
    case 'dom':
      return 'VM' + ((root + 5) % 12);
    default:
      return 'm' + root;
  }
}

/** Obtém (ou cria) o acorde de vocabulário e atualiza o nome para a grafia do tom atual. */
export function vocabChord(quality: Quality, root: number, name: string): VocabChord {
  const id = vocabId(quality, root);
  const existing = chordById[id] as VocabChord | undefined;
  if (existing) {
    if (existing.name !== name) {
      existing.name = name;
      existing.noteNames = spellChord(name, quality);
    }
    return existing;
  }
  const base = baseFor(quality, root);
  const c: VocabChord = {
    id,
    kind: QUALITIES[quality].family,
    root,
    slot: chordById[base].slot,
    ring: 3,
    name,
    quality,
    base,
    pcs: pcsOf(quality, root),
    noteNames: spellChord(name, quality),
  };
  registerChord(c);
  return c;
}
