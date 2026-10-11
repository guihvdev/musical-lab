/* Leituras derivadas do estado, compartilhadas pelas features. */
import { inKey, keyNames, numeral, spellChord, tonicName, type Chord } from '@/core/harmony';
import { studyLabel } from '@/core/study';
import { state } from './state';

/** Tom usado para pertencimento e rotação (campo do modo nos modos gregos). */
export const fieldKey = () => state.study?.fieldKey ?? state.key;

/** Nome do acorde na grafia do tom do estudo. */
export const chordName = (c: Chord) => studyLabel(state.study, c);

/** Função do acorde: o grau usado pelo estudo ou a cifra romana calculada. */
export const chordFunction = (c: Chord) => state.study?.functions.get(c.id) ?? numeral(c, state.key);

/** Notas do acorde na grafia do nome exibido. */
export const chordNotes = (c: Chord) => (state.study?.labels.has(c.id) ? spellChord(chordName(c), c.quality) : c.noteNames);

export const isInKey = (c: Chord) => inKey(c, fieldKey());

/** Rótulo do tom no centro do grafo. */
export function keyLabel(): string {
  const { study, key } = state;
  // estudos com campo próprio (modos gregos) nomeiam o modo: "D Dórico"
  if (study?.variant && (study.variant.field ?? study.mode.field)) return `${tonicName(key)} ${study.variant.name}`;
  const { major, relative } = keyNames(key);
  return `Tom de ${major} · ${relative}`;
}
