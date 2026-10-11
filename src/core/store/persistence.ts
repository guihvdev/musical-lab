import { defaultLayers, type LayerState } from '@/core/harmony';
import { readJSON, writeJSON } from '@/shared/storage';

const LAYERS_KEY = 'teia-layers';
const STUDY_KEY = 'teia-study';

/** Camadas do modo Livre (as dos estudos vêm do próprio modo e não são salvas). */
export function loadLayers(): LayerState {
  const saved = readJSON<Partial<LayerState> | null>(LAYERS_KEY, null);
  return { ...defaultLayers(), ...saved };
}

export function saveLayers(layers: LayerState): void {
  writeJSON(LAYERS_KEY, layers);
}

export interface SavedStudy {
  id: string;
  variant: string | null;
}

export function loadStudy(): SavedStudy | null {
  const saved = readJSON<SavedStudy | null>(STUDY_KEY, null);
  return saved && typeof saved.id === 'string' ? saved : null;
}

export function saveStudy(study: SavedStudy | null): void {
  writeJSON(STUDY_KEY, study);
}

/* ---------- Progressões salvas ---------- */

const LIBRARY_KEY = 'teia-progressions';

/** Acorde salvo: o id e a grafia/função exibidas no momento em que foi salvo. */
export interface SavedChord {
  id: string;
  name: string;
  fn: string;
}

export interface SavedProgression {
  id: string;
  name: string;
  chords: SavedChord[];
  /** Contexto em que foi escrita: tom, estudo e variação, andamento. */
  key: number;
  studyId: string | null;
  variantId: string | null;
  bpm: number;
  createdAt: number;
  updatedAt: number;
}

export function loadLibrary(): SavedProgression[] {
  const saved = readJSON<unknown>(LIBRARY_KEY, []);
  return Array.isArray(saved) ? (saved as SavedProgression[]) : [];
}

export function saveLibrary(library: SavedProgression[]): void {
  writeJSON(LIBRARY_KEY, library);
}
