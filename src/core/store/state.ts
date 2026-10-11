import { suggestionsFor, type LayerState, type Suggestion } from '@/core/harmony';
import { EventBus } from '@/shared/events';
import { loadLayers } from './persistence';

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
  /** Derivado em cada render a partir de `current`, `layers` e `key`. */
  suggestions: Suggestion[];
  /** Notas pressionadas no teclado MIDI. */
  liveNotes: Set<number>;
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
  suggestions: [],
  liveNotes: new Set(),
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
  state.suggestions = suggestionsFor(state.current, state.layers, state.key);
  listeners.forEach((fn) => fn(state));
}

/** Eventos efêmeros que não justificam um render completo. */
export const bus = new EventBus<{
  /** Destaca a aresta do acorde atual até `to` (hover). */
  'edge-focus': { to: string; on: boolean };
  /** Notas MIDI pressionadas mudaram. */
  'live-notes': Set<number>;
}>();
