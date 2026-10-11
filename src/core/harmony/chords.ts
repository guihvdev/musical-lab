/*
 * Grafo de acordes: 3 anéis concêntricos.
 *  - anel 0: maiores e relativos menores, alternados pelo ciclo de quintas (24 posições)
 *  - anel 1: dominantes (V7) de cada acorde do anel 0
 *  - anel 2: diminutos (vii°7) entre cada par maior/relativo
 */
import { FLATS, INTERVALS, MAJ, MAJ_NAMES, MIN_NAMES, SHARPS, mod24, spell, type ChordKind } from './theory';
import type { TransitionKind } from './transitions';

interface ChordBase {
  id: string;
  kind: ChordKind;
  root: number;
  /** Posição angular (0–23, aceita frações). */
  slot: number;
  ring: 0 | 1 | 2;
  name: string;
  /** Índice no ciclo de quintas (0 = F … 11 = Bb). */
  group: number;
  pcs: number[];
  noteNames: string[];
}
export interface TriadChord extends ChordBase {
  kind: 'maj' | 'min';
  ring: 0;
}
export interface DominantChord extends ChordBase {
  kind: 'dom';
  ring: 1;
  target: string;
}
export interface DiminishedChord extends ChordBase {
  kind: 'dim';
  ring: 2;
  /** [maior, relativo menor] */
  targets: [string, string];
}
export type Chord = TriadChord | DominantChord | DiminishedChord;

export interface Transition {
  from: string;
  to: string;
  type: TransitionKind;
}

type ChordSeed = Omit<TriadChord, 'pcs' | 'noteNames'> | Omit<DominantChord, 'pcs' | 'noteNames'> | Omit<DiminishedChord, 'pcs' | 'noteNames'>;

/* ---------- Nós ---------- */
const seeds: ChordSeed[] = [];
MAJ.forEach((r, i) => {
  const mr = (r + 9) % 12;
  seeds.push({ id: 'M' + r, kind: 'maj', root: r, slot: 2 * i, ring: 0, name: MAJ_NAMES[i], group: i });
  seeds.push({ id: 'm' + mr, kind: 'min', root: mr, slot: 2 * i + 1, ring: 0, name: MIN_NAMES[i], group: i });
});
MAJ.forEach((r, i) => {
  const mr = (r + 9) % 12;
  const dr = (r + 11) % 12;
  seeds.push({ id: 'VM' + r, kind: 'dom', root: (r + 7) % 12, slot: 2 * i, ring: 1, target: 'M' + r, name: spell((r + 7) % 12, i) + '7', group: i });
  seeds.push({ id: 'Vm' + mr, kind: 'dom', root: (mr + 7) % 12, slot: 2 * i + 1, ring: 1, target: 'm' + mr, name: spell((mr + 7) % 12, i) + '7', group: i });
  seeds.push({ id: 'd' + r, kind: 'dim', root: dr, slot: 2 * i + 0.5, ring: 2, targets: ['M' + r, 'm' + r], name: (r === 6 ? 'E#' : spell(dr, i)) + '°', group: i });
});

function noteNamesFor(s: ChordSeed, pcs: number[]): string[] {
  const triad = s.kind === 'maj' || s.kind === 'min';
  const names = s.name.includes('b')
    ? FLATS
    : s.name.includes('#')
      ? SHARPS
      : triad
        ? s.group >= 1 && s.group <= 7
          ? SHARPS
          : FLATS
        : SHARPS;
  return pcs.map((p) => names[p]);
}

export const chords: Chord[] = seeds.map((s) => {
  const pcs = INTERVALS[s.kind].map((x) => (x + s.root) % 12);
  return { ...s, pcs, noteNames: noteNamesFor(s, pcs) } as Chord;
});

export const chordById: Record<string, Chord> = Object.fromEntries(chords.map((c) => [c.id, c]));

/** Anel externo indexado por slot (0–23). */
export const outerRing: TriadChord[] = [];
/** Dominantes indexadas por slot (0–23). */
export const dominantBySlot: DominantChord[] = [];
chords.forEach((c) => {
  if (c.ring === 0) outerRing[c.slot] = c;
  if (c.kind === 'dom') dominantBySlot[c.slot] = c;
});

/* ---------- Arestas ---------- */
export const transitions: Transition[] = [];
export const transitionsFrom: Record<string, Transition[]> = {};
const seen = new Set<string>();

/** Adiciona uma aresta; a primeira classificação de um par prevalece. */
function link(from: string, to: string, type: TransitionKind): void {
  const k = from + '>' + to;
  if (from === to || seen.has(k)) return;
  seen.add(k);
  const t: Transition = { from, to, type };
  transitions.push(t);
  (transitionsFrom[from] ??= []).push(t);
}

chords.forEach((c) => {
  if (c.kind === 'dom') link(c.id, c.target, 'res');
  if (c.kind === 'dim') c.targets.forEach((t) => link(c.id, t, 'res'));
});
outerRing.forEach((c) => {
  [-1, 1, -2, 2].forEach((d) => link(c.id, outerRing[mod24(c.slot + d)].id, 'dia'));
  link(c.id, outerRing[mod24(c.slot + (c.kind === 'maj' ? 3 : -3))].id, 'dia');
});
outerRing.forEach((c) => [0, -1, 1, -2, 2].forEach((d) => link(c.id, dominantBySlot[mod24(c.slot + d)].id, 'sec')));
dominantBySlot.forEach((c) => link(c.id, dominantBySlot[mod24(c.slot - 2)].id, 'cad'));
outerRing.forEach((c) => {
  link(c.id, 'd' + ((c.root + 2) % 12), 'dim');
  link(c.id, 'd' + c.root, 'dim');
});
for (let r = 0; r < 12; r++) {
  link('M' + r, 'm' + ((r + 5) % 12), 'emp');
  link('M' + r, 'M' + ((r + 8) % 12), 'emp');
  link('M' + r, 'M' + ((r + 10) % 12), 'emp');
  link('M' + r, 'm' + r, 'emp');
  link('m' + r, 'M' + r, 'emp');
  const sub = 'VM' + ((r + 6) % 12);
  link(sub, 'M' + r, 'tt');
  link(sub, 'm' + r, 'tt');
}
