import { bassOf, chordById, voice } from '@/core/harmony';
import { render, state } from '@/core/store';
import { playChord } from '@/shared/audio/synth';

let timer: ReturnType<typeof setTimeout> | undefined;
let onChange: (playing: boolean) => void = () => {};

/** Recebe avisos quando a reprodução começa ou termina. */
export function onPlaybackChange(fn: (playing: boolean) => void): void {
  onChange = fn;
}

export function stopPlayback(): void {
  state.playing = false;
  clearTimeout(timer);
  onChange(false);
}

/** Toca a trilha do início, dois tempos por acorde. */
export function startPlayback(): void {
  if (!state.progression.length) return;
  state.playing = true;
  onChange(true);
  let i = 0;
  state.voicing = null;

  const step = () => {
    if (!state.playing) return;
    if (i >= state.progression.length) {
      stopPlayback();
      return;
    }
    state.position = i;
    const dur = (60 / state.bpm) * 2;
    const c = chordById[state.progression[i]];
    state.voicing = voice(c, state.voicing);
    state.bass = bassOf(c);
    state.current = c.id;
    playChord(state.voicing, state.bass, dur + 0.6);
    render();
    i++;
    timer = setTimeout(step, dur * 1000);
  };
  step();
}

export function togglePlayback(): void {
  if (state.playing) stopPlayback();
  else startPlayback();
}
