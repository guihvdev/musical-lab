export type TransitionKind = 'res' | 'dia' | 'sec' | 'cad' | 'dim' | 'emp' | 'tt' | 'std';

export interface TransitionType {
  k: TransitionKind;
  label: string;
  desc: string;
  /** Ligada por padrão. */
  on: boolean;
}

/** Ordem = prioridade nas sugestões. */
export const TRANSITION_TYPES: readonly TransitionType[] = [
  { k: 'res', label: 'Resolução', desc: 'resolve', on: true },
  { k: 'dia', label: 'Diatônico', desc: 'vizinho no ciclo', on: true },
  { k: 'sec', label: 'Dominante secundária', desc: 'prepara outro acorde', on: true },
  { k: 'cad', label: 'Cadeia de dominantes', desc: 'dominante da dominante', on: true },
  { k: 'dim', label: 'Diminuto de passagem', desc: 'passagem cromática', on: true },
  { k: 'emp', label: 'Empréstimo modal', desc: 'do tom homônimo menor', on: true },
  { k: 'tt', label: 'Substituto trítono', desc: 'subV7', on: false },
  // só existe com um estudo ativo: liga os acordes consecutivos das progressões-modelo
  { k: 'std', label: 'Caminho do estudo', desc: 'progressão-modelo', on: false },
];

export const TRANSITION_INDEX = Object.fromEntries(TRANSITION_TYPES.map((t, i) => [t.k, i])) as Record<
  TransitionKind,
  number
>;

export const transitionType = (k: TransitionKind) => TRANSITION_TYPES[TRANSITION_INDEX[k]];

export type LayerState = Record<TransitionKind, boolean>;

export const defaultLayers = (): LayerState =>
  Object.fromEntries(TRANSITION_TYPES.map((t) => [t.k, t.on])) as LayerState;
