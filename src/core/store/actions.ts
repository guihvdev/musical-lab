import { MAJ, bassOf, chordById, voice, type TransitionKind } from '@/core/harmony';
import { playChord } from '@/shared/audio/synth';
import { saveLayers } from './persistence';
import { render, state } from './state';

const MAX_PROGRESSION = 40;

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

/** Escolhe um acorde (grafo, lista ou atalho). */
export function pick(id: string, play = true): void {
  if (id === state.current && state.position === state.progression.length - 1) {
    setCurrent(id, play);
    return;
  }
  pushToProgression(id);
  setCurrent(id, play);
}

/** Volta para um acorde já registrado na trilha. */
export function jumpTo(index: number): void {
  state.position = index;
  setCurrent(state.progression[index], true);
}

export function undo(): void {
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
  state.key = root;
  render();
}

/** Move o tom pelo ciclo de quintas (+1 = uma quinta acima). */
export function shiftKey(dir: 1 | -1): void {
  const i = MAJ.indexOf(state.key as (typeof MAJ)[number]);
  setKey(MAJ[(i + (dir === 1 ? 1 : 11)) % 12]);
}

export function setLayer(k: TransitionKind, on: boolean): void {
  state.layers[k] = on;
  saveLayers(state.layers);
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
