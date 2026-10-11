/*
 * Funções harmônicas em graus relativos ao tom: "I7", "ii7", "IVΔ7", "viiø7", "#iv°7", "bII7", "V13"…
 * Numeral maiúsculo = maior, minúsculo = menor; o sufixo define a qualidade.
 */
import { chordById } from './chords';
import { QUALITIES, type Quality } from './qualities';
import { spellInterval, tonicName } from './spelling';
import { vocabChord } from './vocabulary';

const NUMERAL_RE = /^([b#]?)(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(.*)$/;
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const NUMERAL_SEMIS = [0, 2, 4, 5, 7, 9, 11];

export interface ParsedFunction {
  /** Semitons acima da tônica. */
  semis: number;
  /** Grau diatônico 1–7 (define a letra da fundamental). */
  degree: number;
  quality: Quality;
}

function qualityFor(suffix: string, upper: boolean): Quality | null {
  switch (suffix) {
    case '':
      return upper ? 'maj' : 'min';
    case '7':
      return upper ? 'dom7' : 'm7';
    case 'Δ':
    case 'Δ7':
    case 'maj7':
      return 'maj7';
    case 'ø':
    case 'ø7':
    case 'm7b5':
      return 'm7b5';
    case '°':
    case '°7':
      return 'dim7';
    case '6':
      return upper ? '6' : 'm6';
    case '9':
    case '13':
    case '7b9':
      return upper ? (suffix as Quality) : null;
    default:
      return null;
  }
}

export function parseFunction(symbol: string): ParsedFunction {
  const m = NUMERAL_RE.exec(symbol);
  const upper = !!m && m[2] === m[2].toUpperCase();
  const quality = m && qualityFor(m[3], upper);
  if (!m || !quality) throw new Error(`Função harmônica desconhecida: ${symbol}`);
  const degree = NUMERALS.indexOf(m[2].toUpperCase());
  const acc = m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0;
  return { semis: (NUMERAL_SEMIS[degree] + acc + 12) % 12, degree: degree + 1, quality };
}

export interface ResolvedFunction {
  symbol: string;
  /** Id do nó no grafo (fixo ou de vocabulário). */
  id: string;
  /** Nome na grafia do tom. */
  name: string;
}

/** Converte um grau no acorde concreto do tom `key`, reaproveitando os nós fixos quando existem. */
export function resolveFunction(symbol: string, key: number): ResolvedFunction {
  const { semis, degree, quality } = parseFunction(symbol);
  const root = (key + semis) % 12;
  const name = spellInterval(tonicName(key), semis, degree) + QUALITIES[quality].suffix;
  let id: string;
  switch (quality) {
    case 'maj':
      id = 'M' + root;
      break;
    case 'min':
      id = 'm' + root;
      break;
    case 'dom7':
      id = 'VM' + ((root + 5) % 12);
      break;
    case 'dim7':
      id = 'd' + ((root + 1) % 12);
      break;
    default:
      id = vocabChord(quality, root, name).id;
  }
  if (!chordById[id]) throw new Error(`Nó inexistente para ${symbol}`);
  return { symbol, id, name };
}

/** Semitons de um grau em relação à tônica ("bVII" → 10). */
export const functionSemitones = (symbol: string) => parseFunction(symbol).semis;
