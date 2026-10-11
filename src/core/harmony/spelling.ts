/* Grafia de notas por intervalo: a letra vem do grau, o acidente do semitom (Bb em F maior, não A#). */
import { QUALITIES, type Quality } from './qualities';
import { FLATS, MAJ, MAJ_NAMES, SHARPS } from './theory';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11] as const;

interface ParsedNote {
  letter: number;
  acc: number;
}

function parseNote(name: string): ParsedNote {
  const m = /^([A-G])(#{1,2}|b{1,2})?/.exec(name);
  if (!m) throw new Error(`Nota inválida: ${name}`);
  const acc = m[2] ? (m[2][0] === '#' ? m[2].length : -m[2].length) : 0;
  return { letter: LETTERS.indexOf(m[1] as (typeof LETTERS)[number]), acc };
}

/** Fundamental de um nome de acorde ("Bb7" → "Bb", "E#°" → "E#"). */
export function rootOf(chordName: string): string {
  const m = /^[A-G](#|b)?/.exec(chordName);
  if (!m) throw new Error(`Acorde inválido: ${chordName}`);
  return m[0];
}

/**
 * Nome da nota `semis` semitons acima de `rootName`, no grau `degree` (1 = uníssono, 3 = terça, 9 = nona…).
 * Acidentes duplos caem na grafia simples da família da fundamental.
 */
export function spellInterval(rootName: string, semis: number, degree: number): string {
  const r = parseNote(rootName);
  const rootPc = (LETTER_PC[r.letter] + r.acc + 12) % 12;
  const target = (rootPc + semis) % 12;
  const letter = (r.letter + degree - 1) % 7;
  let acc = (target - LETTER_PC[letter] + 12) % 12;
  if (acc > 6) acc -= 12;
  if (Math.abs(acc) <= 1) return LETTERS[letter] + (acc === 1 ? '#' : acc === -1 ? 'b' : '');
  return (r.acc > 0 ? SHARPS : FLATS)[target];
}

/** Notas de um acorde a partir do nome, na mesma ordem dos semitons da qualidade. */
export function spellChord(chordName: string, quality: Quality): string[] {
  const root = rootOf(chordName);
  return QUALITIES[quality].steps.map(([s, d]) => spellInterval(root, s, d));
}

/** Nome da tônica de um tom maior (classe de altura). */
export const tonicName = (key: number) => MAJ_NAMES[MAJ.indexOf(key as (typeof MAJ)[number])];

/** Classe de altura de um nome de tom ("Bb" → 10). */
export function keyFromName(name: string): number {
  const i = MAJ_NAMES.indexOf(name as (typeof MAJ_NAMES)[number]);
  if (i < 0) throw new Error(`Tom inválido: ${name}`);
  return MAJ[i];
}
