import { MAJ, TRANSITION_TYPES, baseGraph, bassOf, chordById, keyFromName, voice, type TransitionKind } from '@/core/harmony';
import { findMode, resolveStudy, sameIds } from '@/core/study';
import { playChord } from '@/shared/audio/synth';
import { loadLayers, saveLayers, saveStudy } from './persistence';
import { render, state } from './state';

const MAX_PROGRESSION = 40;
/** Limite da trilha ao editar uma progressão salva (sem descartar o começo). */
export const MAX_SAVED = 128;

/** Torna `id` o acorde atual, recalculando o voicing com condução de vozes. */
export function setCurrent(id: string, play: boolean): void {
  const c = chordById[id];
  state.voicing = voice(c, state.voicing);
  state.bass = bassOf(c);
  state.current = id;
  if (play) playChord(state.voicing, state.bass);
  render();
}

/** Descarta o que vem depois da posição atual e acrescenta `id` à trilha. */
export function pushToProgression(id: string): void {
  if (state.position < state.progression.length - 1) {
    state.progression = state.progression.slice(0, state.position + 1);
  }
  state.progression.push(id);
  if (state.progression.length > MAX_PROGRESSION) state.progression.shift();
  state.position = state.progression.length - 1;
}

/** Insere `id` logo depois da posição atual (edição de progressão salva: nada é descartado). */
function insertAfterPosition(id: string): void {
  if (state.progression.length >= MAX_SAVED) return;
  state.progression.splice(state.position + 1, 0, id);
  state.position++;
}

/** Escolhe um acorde (grafo, lista ou atalho). */
export function pick(id: string, play = true): void {
  if (id === state.current && (state.editing || state.position === state.progression.length - 1)) {
    setCurrent(id, play);
    return;
  }
  if (state.editing) insertAfterPosition(id);
  else pushToProgression(id);
  setCurrent(id, play);
}

/** Volta para um acorde já registrado na trilha. */
export function jumpTo(index: number): void {
  state.position = index;
  setCurrent(state.progression[index], true);
}

export function undo(): void {
  // editando, desfaz só o acorde selecionado (o recém-inserido), sem cortar o resto
  if (state.editing) return removeChord();
  if (state.progression.length <= 1) {
    state.progression = [];
    state.position = -1;
    state.current = null;
    render();
    return;
  }
  state.progression = state.progression.slice(0, Math.max(1, state.position));
  state.position = state.progression.length - 1;
  setCurrent(state.progression[state.position], true);
}

/* ---------- Edição da trilha (acorde selecionado) ---------- */

function emptyTrail(): void {
  state.progression = [];
  state.position = -1;
  state.current = null;
  state.voicing = null;
  state.bass = null;
}

/** Remove o acorde selecionado; o anterior passa a ser o atual. */
export function removeChord(): void {
  const i = state.position;
  if (i < 0) return;
  state.progression.splice(i, 1);
  if (!state.progression.length) {
    emptyTrail();
    render();
    return;
  }
  state.position = Math.max(0, i - 1);
  setCurrent(state.progression[state.position], true);
}

/** Troca o acorde selecionado de lugar com o vizinho (−1 = para trás). */
export function moveChord(dir: 1 | -1): void {
  const i = state.position;
  const j = i + dir;
  if (i < 0 || j < 0 || j >= state.progression.length) return;
  const p = state.progression;
  [p[i], p[j]] = [p[j], p[i]];
  state.position = j;
  render();
}

/** Repete o acorde selecionado logo depois dele. */
export function duplicateChord(): void {
  const id = state.progression[state.position];
  if (!id) return;
  if (state.editing) insertAfterPosition(id);
  else {
    state.progression.splice(state.position + 1, 0, id);
    if (state.progression.length > MAX_PROGRESSION) state.progression.shift();
    else state.position++;
  }
  render();
}

/** Limpa a trilha mantendo só o acorde atual. */
export function clearProgression(): void {
  state.progression = state.current ? [state.current] : [];
  state.position = state.progression.length - 1;
  render();
}

/** Repete o acorde atual. */
export function replay(): void {
  if (state.current && state.voicing && state.bass !== null) playChord(state.voicing, state.bass);
}

export function setKey(root: number): void {
  const trailIsModel = sameIds(state.progression, state.loadedProgression);
  state.key = root;
  if (!state.studyId) return render();
  rebuildStudy();
  // a trilha ainda é a progressão-modelo: transpõe junto
  if (trailIsModel) loadStudyProgression(state.activeProgression);
  else render();
}

/** Move o tom pelo ciclo de quintas (+1 = uma quinta acima). */
export function shiftKey(dir: 1 | -1): void {
  const i = MAJ.indexOf(state.key as (typeof MAJ)[number]);
  setKey(MAJ[(i + (dir === 1 ? 1 : 11)) % 12]);
}

export function setLayer(k: TransitionKind, on: boolean): void {
  state.layers[k] = on;
  if (!state.studyId) saveLayers(state.layers);
  render();
}

/** Liga/desliga o modo foco (só grafo e teclado). */
export function setFocus(on = !state.focus): void {
  state.focus = on;
  render();
}

/** Substitui a trilha (sem tocar), terminando no último acorde com voicing conduzido. */
export function loadProgression(ids: string[]): void {
  state.progression = [];
  ids.forEach((id) => {
    state.progression.push(id);
    state.voicing = voice(chordById[id], state.voicing);
  });
  state.position = state.progression.length - 1;
  const last = ids.at(-1);
  state.current = last ?? null;
  state.bass = last ? bassOf(chordById[last]) : null;
  render();
}

export function setBpm(bpm: number): void {
  state.bpm = bpm;
}

/* ---------- Estudos ---------- */

function rebuildStudy(): void {
  const mode = findMode(state.studyId);
  state.study = mode ? resolveStudy(mode, state.variantId, state.key) : null;
  state.graph = state.study?.graph ?? baseGraph;
}

function applyStudyLayers(layers: readonly TransitionKind[]): void {
  TRANSITION_TYPES.forEach((t) => (state.layers[t.k] = layers.includes(t.k)));
}

/** Carrega uma progressão-modelo do estudo na trilha. */
export function loadStudyProgression(index: number): void {
  const prog = state.study?.progressions[index];
  if (!prog) return;
  // carregar um modelo substitui a trilha: deixa de editar a progressão salva
  state.editing = null;
  state.activeProgression = index;
  state.loadedProgression = [...prog.ids];
  loadProgression(prog.ids);
}

/**
 * Ativa um estudo (ou o modo Livre com `null`): aplica camadas e tom sugerido, monta vocabulário e
 * focos, e carrega a 1ª progressão na trilha.
 */
export function activateStudy(id: string | null, variantId: string | null = null): void {
  const mode = findMode(id);
  if (!mode) {
    state.studyId = state.variantId = null;
    rebuildStudy();
    state.layers = loadLayers();
    state.loadedProgression = null;
    // um acorde de vocabulário volta para o seu nó fixo
    const cur = state.current ? chordById[state.current] : null;
    if (cur?.ring === 3) state.current = cur.base;
    saveStudy(null);
    render();
    return;
  }
  state.studyId = mode.id;
  state.variantId = mode.variants?.some((v) => v.id === variantId) ? variantId : (mode.variants?.[0]?.id ?? null);
  state.key = keyFromName(mode.suggestedKey);
  rebuildStudy();
  applyStudyLayers(state.study!.layers);
  saveStudy({ id: mode.id, variant: state.variantId });
  // editando uma progressão salva, o estudo vira só a lente: a trilha fica como está
  if (state.editing) {
    state.loadedProgression = null;
    render();
  } else loadStudyProgression(0);
}

/** Troca a variação do estudo (ex.: o modo grego); recarrega a progressão se a variação tiver as suas. */
export function setVariant(variantId: string): void {
  const mode = findMode(state.studyId);
  const variant = mode?.variants?.find((v) => v.id === variantId);
  if (!mode || !variant) return;
  state.variantId = variantId;
  rebuildStudy();
  if (variant.layers) applyStudyLayers(variant.layers);
  saveStudy({ id: mode.id, variant: variantId });
  if (variant.progressions && !state.editing) loadStudyProgression(0);
  else render();
}

/**
 * Restaura estudo, variação e tom de uma progressão salva sem carregar progressão-modelo nem redesenhar
 * (quem chama carrega a trilha em seguida).
 */
export function restoreContext(studyId: string | null, variantId: string | null, key: number): void {
  const mode = findMode(studyId);
  const changed = (mode?.id ?? null) !== state.studyId || (mode !== null && variantId !== state.variantId);
  state.key = key;
  state.loadedProgression = null;
  if (!mode) {
    if (changed) {
      state.studyId = state.variantId = null;
      state.layers = loadLayers();
      saveStudy(null);
    }
    rebuildStudy();
    return;
  }
  state.studyId = mode.id;
  state.variantId = mode.variants?.some((v) => v.id === variantId) ? variantId : (mode.variants?.[0]?.id ?? null);
  rebuildStudy();
  if (changed) applyStudyLayers(state.study!.layers);
  saveStudy({ id: mode.id, variant: state.variantId });
}
