import type { ChordKind } from './theory';

/** Qualidades de acorde. As quatro primeiras formam os anéis fixos do grafo; as demais são vocabulário dos estudos. */
export type Quality = 'maj' | 'min' | 'dom7' | 'dim7' | 'maj7' | 'm7' | 'm7b5' | '6' | 'm6' | '9' | '13' | '7b9';

/** [semitons a partir da fundamental, grau] — o grau define a letra da nota na grafia. */
export type Step = readonly [number, number];

export interface QualityDef {
  /** Família de cor (anel e variável CSS). */
  family: ChordKind;
  /** Sufixo no nome do acorde. */
  suffix: string;
  /** Sufixo na cifra romana (a caixa do numeral já indica maior/menor). */
  numeral: string;
  /** Notas em ordem crescente de semitons. */
  steps: readonly Step[];
}

export const QUALITIES: Record<Quality, QualityDef> = {
  maj: { family: 'maj', suffix: '', numeral: '', steps: [[0, 1], [4, 3], [7, 5]] },
  min: { family: 'min', suffix: 'm', numeral: '', steps: [[0, 1], [3, 3], [7, 5]] },
  dom7: { family: 'dom', suffix: '7', numeral: '7', steps: [[0, 1], [4, 3], [7, 5], [10, 7]] },
  dim7: { family: 'dim', suffix: '°', numeral: '°7', steps: [[0, 1], [3, 3], [6, 5], [9, 7]] },
  maj7: { family: 'maj', suffix: 'Δ7', numeral: 'Δ7', steps: [[0, 1], [4, 3], [7, 5], [11, 7]] },
  m7: { family: 'min', suffix: 'm7', numeral: '7', steps: [[0, 1], [3, 3], [7, 5], [10, 7]] },
  m7b5: { family: 'dim', suffix: 'ø7', numeral: 'ø7', steps: [[0, 1], [3, 3], [6, 5], [10, 7]] },
  '6': { family: 'maj', suffix: '6', numeral: '6', steps: [[0, 1], [4, 3], [7, 5], [9, 6]] },
  m6: { family: 'min', suffix: 'm6', numeral: '6', steps: [[0, 1], [3, 3], [7, 5], [9, 6]] },
  '9': { family: 'dom', suffix: '9', numeral: '9', steps: [[0, 1], [2, 9], [4, 3], [7, 5], [10, 7]] },
  '13': { family: 'dom', suffix: '13', numeral: '13', steps: [[0, 1], [2, 9], [4, 3], [9, 13], [10, 7]] },
  '7b9': { family: 'dom', suffix: '7b9', numeral: '7b9', steps: [[0, 1], [1, 9], [4, 3], [7, 5], [10, 7]] },
};

/** Qualidade de cada nó dos anéis fixos. */
export const BASE_QUALITY: Record<ChordKind, Quality> = { maj: 'maj', min: 'min', dom: 'dom7', dim: 'dim7' };
