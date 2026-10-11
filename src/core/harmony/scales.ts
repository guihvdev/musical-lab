import type { Step } from './qualities';
import { spellInterval } from './spelling';

/** [semitons, grau, nota de cor?] — notas de cor (ex.: blue note) recebem destaque próprio no teclado. */
export type ScaleStep = Step | readonly [number, number, 'blue'];

export interface ScaleDef {
  name: string;
  steps: readonly ScaleStep[];
}

/** Biblioteca de escalas por intervalos. Modos novos podem usar estas ou declarar as suas. */
export const SCALES = {
  ionian: { name: 'jônio', steps: [[0, 1], [2, 2], [4, 3], [5, 4], [7, 5], [9, 6], [11, 7]] },
  dorian: { name: 'dórico', steps: [[0, 1], [2, 2], [3, 3], [5, 4], [7, 5], [9, 6], [10, 7]] },
  phrygian: { name: 'frígio', steps: [[0, 1], [1, 2], [3, 3], [5, 4], [7, 5], [8, 6], [10, 7]] },
  lydian: { name: 'lídio', steps: [[0, 1], [2, 2], [4, 3], [6, 4], [7, 5], [9, 6], [11, 7]] },
  mixolydian: { name: 'mixolídio', steps: [[0, 1], [2, 2], [4, 3], [5, 4], [7, 5], [9, 6], [10, 7]] },
  aeolian: { name: 'eólio', steps: [[0, 1], [2, 2], [3, 3], [5, 4], [7, 5], [8, 6], [10, 7]] },
  locrian: { name: 'lócrio', steps: [[0, 1], [1, 2], [3, 3], [5, 4], [6, 5], [8, 6], [10, 7]] },
  pentatonicMajor: { name: 'pentatônica maior', steps: [[0, 1], [2, 2], [4, 3], [7, 5], [9, 6]] },
  pentatonicMinor: { name: 'pentatônica menor', steps: [[0, 1], [3, 3], [5, 4], [7, 5], [10, 7]] },
  pentatonicDominant: { name: 'pentatônica dominante', steps: [[0, 1], [2, 2], [4, 3], [7, 5], [10, 7]] },
  // a blue note (b5) é grafada como #4 para evitar Cb/Fb nos tons com bemóis
  bluesMinor: { name: 'blues menor', steps: [[0, 1], [3, 3], [5, 4], [6, 4, 'blue'], [7, 5], [10, 7]] },
  diminishedHalfWhole: { name: 'diminuta semitom-tom', steps: [[0, 1], [1, 2], [3, 2], [4, 3], [6, 4], [7, 5], [9, 6], [10, 7]] },
  diminishedWholeHalf: { name: 'diminuta tom-semitom', steps: [[0, 1], [2, 2], [3, 3], [5, 4], [6, 5], [8, 6], [9, 6], [11, 7]] },
} satisfies Record<string, ScaleDef>;

export interface ScaleNote {
  pc: number;
  name: string;
  tonic: boolean;
  blue: boolean;
}

export function spellScale(def: ScaleDef, rootName: string, rootPc: number): ScaleNote[] {
  return def.steps.map(([s, d, flag]) => ({
    pc: (rootPc + s) % 12,
    name: spellInterval(rootName, s, d),
    tonic: s === 0,
    blue: flag === 'blue',
  }));
}
