/** Trecho com o mesmo acorde (ou sem acorde), em batidas consecutivas. */
export interface ChordSegment {
  start: number;
  end: number;
  /** Índices das batidas [início, fim). */
  beatStart: number;
  beatEnd: number;
  /** Id do acorde (null = sem acorde). */
  id: string | null;
  name: string;
  /** Outras leituras prováveis, da mais para a menos provável. */
  alternatives: { id: string; name: string }[];
}

export interface AudioAnalysis {
  duration: number;
  bpm: number;
  /** Tônica maior estimada e o modo percebido. */
  key: number;
  minor: boolean;
  tuning: number;
  /** Instantes das batidas; a primeira é 0 e há uma batida final = duração. */
  beats: number[];
  segments: ChordSegment[];
}

export type AnalysisStage = 'espectro' | 'batidas' | 'acordes';
