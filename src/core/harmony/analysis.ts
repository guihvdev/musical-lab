/* Análise relativa ao tom: pertencimento, grau e cifra romana. */
import { chordById, outerRing, type Chord } from './chords';
import { QUALITIES } from './qualities';
import { DEGREES, mod24 } from './theory';

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/** `key` é a classe de altura da tônica maior. */
export const keySlot = (key: number) => chordById['M' + key].slot;

/** Janela de 6 posições do anel externo que forma o campo harmônico do tom. */
export function keyWindow(key: number): Set<number> {
  const k = keySlot(key);
  return new Set([-2, -1, 0, 1, 2, 3].map((d) => mod24(k + d)));
}

export function inKey(c: Chord, key: number): boolean {
  // vocabulário: todas as notas na escala maior do tom
  if (c.ring === 3) return c.pcs.every((p) => MAJOR_SCALE.includes((p - key + 12) % 12));
  const w = keyWindow(key);
  if (c.ring === 0) return w.has(c.slot);
  if (c.kind === 'dom') return w.has(chordById[c.target].slot);
  return c.targets.some((t) => w.has(chordById[t].slot));
}

function degree(c: Chord, key: number): string {
  let d: string = DEGREES[(c.root - key + 12) % 12];
  if (c.kind === 'min' || (c.ring === 3 && c.kind === 'dim')) d = d.replace(/[IV]+/, (s) => s.toLowerCase());
  return d;
}

export function numeral(c: Chord, key: number): string {
  if (c.ring === 0) return degree(c, key);
  if (c.ring === 3) return degree(c, key) + QUALITIES[c.quality].numeral;
  if (c.kind === 'dom') {
    const d = degree(chordById[c.target], key);
    return d === 'I' ? 'V7' : 'V7/' + d;
  }
  const w = keyWindow(key);
  const maj = chordById[c.targets[0]];
  const min = chordById[c.targets[1]];
  const t = w.has(min.slot) && !w.has(maj.slot) ? min : maj;
  const d = degree(t, key);
  return d === 'I' ? 'vii°7' : 'vii°7/' + d;
}

/** Tônica maior e relativa menor do tom. */
export function keyNames(key: number): { major: string; relative: string } {
  const major = chordById['M' + key];
  return { major: major.name, relative: outerRing[mod24(major.slot + 1)].name };
}
