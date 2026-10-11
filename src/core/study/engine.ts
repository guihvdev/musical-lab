/* Motor dos estudos: interpreta um StudyMode para o tom atual, sem código específico por modo. */
import {
  QUALITIES,
  chordById,
  chords,
  extendGraph,
  functionSemitones,
  keySlot,
  resolveFunction,
  rootOf,
  spellInterval,
  spellScale,
  tonicName,
  type BaseChord,
  type Chord,
  type HarmonyGraph,
  type ScaleNote,
  type TransitionKind,
  type VocabChord,
} from '@/core/harmony';
import type { FunctionSymbol, ScaleRule, StudyMode, StudyVariant } from './types';

export interface ResolvedProgression {
  name: string;
  symbols: readonly FunctionSymbol[];
  ids: string[];
}

export interface ResolvedStudy {
  mode: StudyMode;
  variant: StudyVariant | null;
  key: number;
  /** Tom maior cujo campo harmônico é destacado (difere de `key` nos modos gregos). */
  fieldKey: number;
  layers: readonly TransitionKind[];
  focus: Set<string>;
  focusList: { symbol: FunctionSymbol; id: string }[];
  /** Id → função (grau) com que o estudo se refere ao acorde. */
  functions: Map<string, FunctionSymbol>;
  /** Id → nome na grafia do tom, quando difere do nome fixo do nó. */
  labels: Map<string, string>;
  progressions: ResolvedProgression[];
  vocab: VocabChord[];
  graph: HarmonyGraph;
  tips: readonly string[];
  scaleRules: { rule: ScaleRule; ids: Set<string> | null }[];
}

export interface ActiveScale {
  title: string;
  rootName: string;
  notes: ScaleNote[];
  hasBlue: boolean;
}

export function resolveStudy(mode: StudyMode, variantId: string | null, key: number): ResolvedStudy {
  const variant = mode.variants?.find((v) => v.id === variantId) ?? mode.variants?.[0] ?? null;
  const pick = <K extends keyof StudyVariant & keyof StudyMode>(k: K) => (variant?.[k] ?? mode[k]) as StudyMode[K];

  const functions = new Map<string, FunctionSymbol>();
  const labels = keySpelledNames(key);
  const vocab = new Map<string, VocabChord>();
  const resolve = (symbol: FunctionSymbol): string => {
    const r = resolveFunction(symbol, key);
    const c = chordById[r.id];
    if (c.ring === 3) vocab.set(c.id, c);
    // o nome vindo do grau prevalece sobre a grafia genérica (bII7 em F = Gb7, não F#7)
    else if (!functions.has(r.id)) {
      if (c.name !== r.name) labels.set(c.id, r.name);
      else labels.delete(c.id);
    }
    if (!functions.has(r.id)) functions.set(r.id, symbol);
    return r.id;
  };

  const focusList = pick('focus').map((symbol) => ({ symbol, id: resolve(symbol) }));
  const progressions = pick('progressions').map((p) => ({ name: p.name, symbols: p.chords, ids: p.chords.map(resolve) }));
  (pick('vocabulary') ?? []).forEach(resolve);
  const scaleRules = pick('scales').map((rule) => ({
    rule,
    ids: rule.on?.functions ? new Set(rule.on.functions.map(resolve)) : null,
  }));

  const field = pick('field');
  const fieldKey = field ? (key + functionSemitones(field)) % 12 : key;
  const vocabList = [...vocab.values()];
  layoutVocabulary(vocabList, fieldKey);

  const paths: [string, string][] = [];
  progressions.forEach(({ ids }) =>
    ids.forEach((id, i) => {
      const next = ids[(i + 1) % ids.length];
      if (next !== id) paths.push([id, next]);
    }),
  );

  return {
    mode,
    variant,
    key,
    fieldKey,
    layers: pick('layers'),
    focus: new Set(focusList.map((f) => f.id)),
    focusList,
    functions,
    labels,
    progressions,
    vocab: vocabList,
    graph: extendGraph(vocabList, paths),
    tips: pick('tips'),
    scaleRules,
  };
}

/** Grau diatônico (letra) de cada distância cromática à tônica: I bII II bIII III IV #IV V bVI VI bVII VII. */
const DEGREE_LETTER = [1, 2, 2, 3, 3, 4, 4, 5, 6, 6, 7, 7];

/**
 * Nomes dos nós fixos na grafia do tom (Gb em Eb maior, não F#): tríades pelo grau, dominantes como
 * V da tríade-alvo, diminutos como sensível da tríade maior-alvo. Guarda só os que diferem do nome fixo.
 */
function keySpelledNames(key: number): Map<string, string> {
  const tonic = tonicName(key);
  const triadRoot = (c: BaseChord) => {
    const semis = (c.root - key + 12) % 12;
    return spellInterval(tonic, semis, DEGREE_LETTER[semis]);
  };
  const names = new Map<string, string>();
  for (const c of chords) {
    const root =
      c.ring === 0
        ? triadRoot(c)
        : c.kind === 'dom'
          ? spellInterval(triadRoot(chordById[c.target] as BaseChord), 7, 5)
          : spellInterval(triadRoot(chordById[c.targets[0]] as BaseChord), 11, 7);
    const name = root + QUALITIES[c.quality].suffix;
    if (name !== c.name) names.set(c.id, name);
  }
  return names;
}

/** Distância mínima entre acordes do anel de vocabulário, em posições (1 = 15°). */
const VOCAB_GAP = 1.2;

/** Espalha o anel de vocabulário sem sobreposição, centrado no campo do tom. */
function layoutVocabulary(vocab: VocabChord[], fieldKey: number): void {
  const k = keySlot(fieldKey);
  const items = vocab
    .map((c) => ({ c, rel: ((chordById[c.base].slot - k + 12) % 24 + 24) % 24 - 12 }))
    .sort((a, b) => a.rel - b.rel);
  const pos: number[] = [];
  items.forEach((it, i) => pos.push(i ? Math.max(it.rel, pos[i - 1] + VOCAB_GAP) : it.rel));
  const shift = items.reduce((s, it, i) => s + pos[i] - it.rel, 0) / (items.length || 1);
  items.forEach((it, i) => (it.c.slot = k + pos[i] - shift));
}

/** Nome do acorde no estudo (grafia do tom) ou o nome fixo do nó. */
export const studyLabel = (study: ResolvedStudy | null, c: Chord) => study?.labels.get(c.id) ?? c.name;

/** Escala da mão direita sobre o acorde `c`: a primeira regra que bater. */
export function scaleFor(study: ResolvedStudy, c: Chord): ActiveScale | null {
  for (const { rule, ids } of study.scaleRules) {
    const on = rule.on;
    if (ids && !ids.has(c.id)) continue;
    if (on?.qualities && !on.qualities.includes(c.quality)) continue;
    if (on?.families && !on.families.includes(c.kind)) continue;

    const [semis, degree] = rule.interval ?? [0, 1];
    const baseName = rule.root === 'key' ? tonicName(study.key) : rootOf(studyLabel(study, c));
    const basePc = rule.root === 'key' ? study.key : c.root;
    const rootName = spellInterval(baseName, semis, degree);
    const notes = spellScale(rule.scale, rootName, (basePc + semis) % 12);
    return { title: `${rootName} ${rule.scale.name}`, rootName, notes, hasBlue: notes.some((n) => n.blue) };
  }
  return null;
}

/**
 * Próximo(s) acorde(s) da progressão-modelo depois de `current`.
 * Com a trilha igual à progressão carregada, segue a posição; senão, considera toda ocorrência do acorde.
 */
export function nextInProgression(
  prog: ResolvedProgression | undefined,
  trail: readonly string[],
  position: number,
  current: string | null,
): Set<string> {
  const out = new Set<string>();
  if (!prog || !current) return out;
  const ids = prog.ids;
  const nextDistinct = (i: number) => {
    for (let k = 1; k <= ids.length; k++) {
      const id = ids[(i + k) % ids.length];
      if (id !== current) return id;
    }
    return null;
  };
  const add = (id: string | null) => id && out.add(id);
  if (sameIds(trail, ids) && ids[position] === current) add(nextDistinct(position));
  else ids.forEach((id, i) => id === current && add(nextDistinct(i)));
  return out;
}

export const sameIds = (a: readonly string[] | null, b: readonly string[] | null) =>
  !!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]);
