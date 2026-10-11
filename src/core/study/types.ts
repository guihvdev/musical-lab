import type { ChordKind, MAJ_NAMES, Quality, ScaleDef, TransitionKind } from '@/core/harmony';

export type StudyCategory = 'Estilos' | 'Escalas' | 'Técnicas';
export type StudyLevel = 'iniciante' | 'intermediário' | 'avançado';
export type KeyName = (typeof MAJ_NAMES)[number];

/**
 * Funções harmônicas são sempre graus relativos ao tom, nunca nomes fixos:
 * "I7", "ii7", "IVΔ7", "viiø7", "#iv°7", "bII7", "V13", "VI7b9", "i6"…
 */
export type FunctionSymbol = string;

export interface ScaleRule {
  /** Acordes onde a regra vale (todas as condições informadas precisam bater). Sem `on`, vale para qualquer acorde. */
  on?: {
    functions?: readonly FunctionSymbol[];
    qualities?: readonly Quality[];
    families?: readonly ChordKind[];
  };
  scale: ScaleDef;
  /** Raiz da escala: tônica do tom ou fundamental do acorde atual. */
  root: 'key' | 'chord';
  /** Desloca a raiz por [semitons, grau]; padrão: uníssono. */
  interval?: readonly [number, number];
}

export interface StudyProgression {
  name: string;
  chords: readonly FunctionSymbol[];
}

export interface StudyMode {
  id: string;
  name: string;
  category: StudyCategory;
  level: StudyLevel;
  /** 1–2 frases, em tom de professor. */
  description: string;
  suggestedKey: KeyName;
  /** Tipos de aresta ligados ao ativar. */
  layers: readonly TransitionKind[];
  /** Acordes extras do estilo; os que não existem nos anéis fixos formam o anel de vocabulário. */
  vocabulary?: readonly FunctionSymbol[];
  /** Funções destacadas no grafo. */
  focus: readonly FunctionSymbol[];
  /** 1 a 3 progressões-modelo, carregáveis na trilha. */
  progressions: readonly StudyProgression[];
  /** Regras de escala para a mão direita; a primeira que bater com o acorde atual vale. */
  scales: readonly ScaleRule[];
  /** 3 a 5 frases curtas mostradas enquanto o modo está ativo. */
  tips: readonly string[];
  /** Grau do tom maior cujo campo harmônico é destacado (modos gregos). Padrão: "I". */
  field?: FunctionSymbol;
  /** Variações selecionáveis; cada uma sobrescreve só os campos que declara. */
  variants?: readonly StudyVariant[];
}

export type StudyVariant = { id: string; name: string } & Partial<
  Pick<StudyMode, 'layers' | 'vocabulary' | 'focus' | 'progressions' | 'scales' | 'tips' | 'field'>
>;
