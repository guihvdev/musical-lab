import { baseGraph, chordById, suggestionsFor, type HarmonyGraph, type LayerState, type Suggestion } from '@/core/harmony';
import { nextInProgression, scaleFor, type ActiveScale, type ResolvedStudy } from '@/core/study';
import { EventBus } from '@/shared/events';
import { loadLayers, loadLibrary, type SavedProgression } from './persistence';

export interface AppState {
  /** Classe de altura da tônica maior. */
  key: number;
  /** Id do acorde atual. */
  current: string | null;
  /** Trilha de acordes escolhidos. */
  progression: string[];
  /** Posição do acorde atual na trilha (-1 = vazia). */
  position: number;
  /** Notas MIDI da mão direita. */
  voicing: number[] | null;
  /** Nota MIDI do baixo. */
  bass: number | null;
  layers: LayerState;
  playing: boolean;
  bpm: number;
  /** Notas pressionadas no teclado MIDI. */
  liveNotes: Set<number>;

  /** Estudo ativo (null = modo Livre) e a variação escolhida. */
  studyId: string | null;
  variantId: string | null;
  /** Estudo interpretado para o tom atual; refeito a cada troca de modo, variação ou tom. */
  study: ResolvedStudy | null;
  /** Progressão-modelo em uso e os ids com que foi carregada na trilha. */
  activeProgression: number;
  loadedProgression: string[] | null;
  /** Nós e arestas ativos (fixos + vocabulário do estudo). */
  graph: HarmonyGraph;

  /** Modo foco: só o grafo e o teclado ficam visíveis. */
  focus: boolean;
  /** Progressões salvas pelo usuário. */
  library: SavedProgression[];
  /** Id da progressão salva aberta na trilha para edição (null = trilha livre). */
  editing: string | null;

  /** Derivados em cada render. */
  suggestions: Suggestion[];
  scale: ActiveScale | null;
}

export const state: AppState = {
  key: 0,
  current: null,
  progression: [],
  position: -1,
  voicing: null,
  bass: null,
  layers: loadLayers(),
  playing: false,
  bpm: 84,
  liveNotes: new Set(),
  studyId: null,
  variantId: null,
  study: null,
  activeProgression: 0,
  loadedProgression: null,
  graph: baseGraph,
  focus: false,
  library: loadLibrary(),
  editing: null,
  suggestions: [],
  scale: null,
};

type Listener = (s: AppState) => void;
const listeners = new Set<Listener>();

/** Registra uma função chamada a cada render. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Recalcula os derivados e redesenha todas as features inscritas. */
export function render(): void {
  const { study, current } = state;
  state.suggestions = suggestionsFor(current, {
    graph: state.graph,
    layers: state.layers,
    fieldKey: study?.fieldKey ?? state.key,
    next: study
      ? nextInProgression(study.progressions[state.activeProgression], state.progression, state.position, current)
      : undefined,
    focus: study?.focus,
  });
  state.scale = study && current ? scaleFor(study, chordById[current]) : null;
  listeners.forEach((fn) => fn(state));
}

/** Eventos efêmeros que não justificam um render completo. */
export const bus = new EventBus<{
  /** Destaca a aresta do acorde atual até `to` (hover). */
  'edge-focus': { to: string; on: boolean };
  /** Notas MIDI pressionadas mudaram. */
  'live-notes': Set<number>;
}>();
