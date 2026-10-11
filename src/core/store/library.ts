/* Progressões salvas: CRUD da biblioteca e da progressão aberta para edição na trilha. */
import { QUALITIES, chordById, vocabChord, type Quality } from '@/core/harmony';
import { sameIds } from '@/core/study';
import { loadProgression, restoreContext } from './actions';
import { saveLibrary, type SavedChord, type SavedProgression } from './persistence';
import { chordFunction, chordName } from './selectors';
import { render, state } from './state';

export type { SavedChord, SavedProgression };

const newId = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);

export const findSaved = (id: string | null) => state.library.find((p) => p.id === id) ?? null;

/** Progressão salva aberta na trilha. */
export const editingSaved = () => findSaved(state.editing);

/** A trilha difere da versão salva da progressão em edição. */
export function isDirty(): boolean {
  const p = editingSaved();
  return !!p && !sameIds(state.progression, p.chords.map((c) => c.id));
}

/**
 * Garante que o acorde exista no registro. Acordes de vocabulário (`v:qualidade:raiz`) só são criados
 * quando um estudo os usa; ao abrir ou baixar uma progressão salva fora do estudo, são recriados aqui.
 */
export function ensureChord(id: string, name: string): boolean {
  if (chordById[id]) return true;
  const m = /^v:([^:]+):(\d{1,2})$/.exec(id);
  if (!m || !(m[1] in QUALITIES) || Number(m[2]) > 11) return false;
  vocabChord(m[1] as Quality, Number(m[2]), name);
  return true;
}

function persist(): void {
  saveLibrary(state.library);
  render();
}

/** Acordes da trilha com a grafia e a função exibidas agora. */
function snapshot(): SavedChord[] {
  return state.progression.map((id) => {
    const c = chordById[id];
    return { id, name: chordName(c), fn: chordFunction(c) };
  });
}

function context() {
  return { key: state.key, studyId: state.studyId, variantId: state.variantId, bpm: state.bpm };
}

function nextName(): string {
  const names = new Set(state.library.map((p) => p.name));
  let n = state.library.length + 1;
  while (names.has(`Progressão ${n}`)) n++;
  return `Progressão ${n}`;
}

function create(name: string, chords: SavedChord[]): SavedProgression {
  const now = Date.now();
  const p: SavedProgression = { id: newId(), name, chords, ...context(), createdAt: now, updatedAt: now };
  state.library.unshift(p);
  return p;
}

/* ---------- Progressão em edição ---------- */

/** Salva a trilha: atualiza a progressão em edição ou cria uma nova e passa a editá-la. */
export function saveTrail(): void {
  const p = editingSaved();
  if (p) Object.assign(p, { chords: snapshot(), ...context(), updatedAt: Date.now() });
  else state.editing = create(nextName(), snapshot()).id;
  persist();
}

/** Salva a trilha como uma progressão nova (cópia da que está em edição). */
export function saveTrailAsNew(): void {
  const current = editingSaved();
  state.editing = create(current ? `${current.name} (cópia)` : nextName(), snapshot()).id;
  persist();
}

/** Para de editar; a trilha continua como está. */
export function closeEditing(): void {
  state.editing = null;
  render();
}

/** Começa uma progressão vazia e já a abre para edição. */
export function createSaved(): void {
  state.editing = create(nextName(), []).id;
  state.loadedProgression = null;
  state.progression = [];
  state.position = -1;
  state.current = null;
  persist();
}

/** Abre uma progressão salva na trilha, no tom e estudo em que foi escrita. */
export function openSaved(id: string): void {
  const p = findSaved(id);
  if (!p) return;
  restoreContext(p.studyId, p.variantId, p.key);
  state.bpm = p.bpm;
  state.editing = p.id;
  state.voicing = null;
  loadProgression(p.chords.filter((c) => ensureChord(c.id, c.name)).map((c) => c.id));
}

/* ---------- Biblioteca ---------- */

export function renameSaved(id: string, name: string): void {
  const p = findSaved(id);
  const clean = name.trim().slice(0, 80);
  if (!p || !clean || clean === p.name) return;
  p.name = clean;
  p.updatedAt = Date.now();
  persist();
}

export function duplicateSaved(id: string): void {
  const p = findSaved(id);
  if (!p) return;
  const now = Date.now();
  const copy: SavedProgression = { ...p, id: newId(), name: `${p.name} (cópia)`, chords: p.chords.map((c) => ({ ...c })), createdAt: now, updatedAt: now };
  state.library.splice(state.library.indexOf(p) + 1, 0, copy);
  persist();
}

export function deleteSaved(id: string): void {
  state.library = state.library.filter((p) => p.id !== id);
  if (state.editing === id) state.editing = null;
  persist();
}

/* ---------- Importação ---------- */

const isStr = (x: unknown): x is string => typeof x === 'string';

/** Valida uma progressão vinda de arquivo; acordes desconhecidos são descartados. */
function parseSaved(x: unknown): SavedProgression | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (!isStr(o.name) || !Array.isArray(o.chords)) return null;
  const chords = o.chords
    .map((c): SavedChord | null => {
      const r = (isStr(c) ? { id: c } : c) as Partial<SavedChord> | null;
      if (!r || !isStr(r.id)) return null;
      const name = isStr(r.name) ? r.name : (chordById[r.id]?.name ?? r.id);
      return ensureChord(r.id, name) ? { id: r.id, name, fn: isStr(r.fn) ? r.fn : '' } : null;
    })
    .filter((c) => c !== null);
  const key = Number.isInteger(o.key) && (o.key as number) >= 0 && (o.key as number) < 12 ? (o.key as number) : 0;
  const bpm = typeof o.bpm === 'number' && o.bpm >= 50 && o.bpm <= 160 ? o.bpm : 84;
  const now = Date.now();
  return {
    id: newId(),
    name: o.name.trim().slice(0, 80) || 'Progressão importada',
    chords,
    key,
    studyId: isStr(o.studyId) ? o.studyId : null,
    variantId: isStr(o.variantId) ? o.variantId : null,
    bpm,
    createdAt: typeof o.createdAt === 'number' ? o.createdAt : now,
    updatedAt: now,
  };
}

/**
 * Importa o conteúdo de um arquivo JSON exportado (uma progressão, uma lista ou `{ progressions: [...] }`).
 * Retorna quantas progressões entraram na biblioteca.
 */
export function importSaved(data: unknown): number {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { progressions?: unknown }).progressions)
      ? (data as { progressions: unknown[] }).progressions
      : [data];
  const parsed = list.map(parseSaved).filter((p) => p !== null);
  if (!parsed.length) return 0;
  state.library.unshift(...parsed);
  persist();
  return parsed.length;
}
