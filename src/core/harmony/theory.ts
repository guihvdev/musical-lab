/* Constantes de teoria musical. Classes de altura: 0 = C … 11 = B. */

/** Tônicas maiores ordenadas pelo ciclo de quintas, começando em F. */
export const MAJ = [5, 0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10] as const;
export const MAJ_NAMES = ['F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb'] as const;
export const MIN_NAMES = ['Dm', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm'] as const;

export const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

/** Grafia da classe de altura conforme a posição `group` no ciclo (sustenidos de G a F#). */
export const spell = (pc: number, group: number) => (group >= 1 && group <= 7 ? SHARPS : FLATS)[pc];

export type ChordKind = 'maj' | 'min' | 'dom' | 'dim';

/** Variável CSS da cor de cada tipo de acorde. */
export const KIND_COLOR: Record<ChordKind, string> = {
  maj: '--maj',
  min: '--min',
  dom: '--dom',
  dim: '--dim',
};

export const DEGREES = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'] as const;

/** Módulo das 24 posições do anel externo. */
export const mod24 = (s: number) => ((s % 24) + 24) % 24;
