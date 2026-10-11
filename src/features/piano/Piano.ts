import './piano.css';
import { KIND_COLOR, chordById } from '@/core/harmony';
import { bus, state, subscribe } from '@/core/store';
import { playNote } from '@/shared/audio/synth';
import { html, qs } from '@/shared/dom';

const LOW = 36; // C2
const HIGH = 84; // C6
const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);

/** Teclado na tela: mostra voicing (mão direita), baixo e notas MIDI ao vivo; toca ao clicar. */
export function mountPiano(parent: Node): void {
  const root = html(`<div class="kbwrap"><div class="kb"></div></div>`);
  const kb = qs(root, '.kb');
  const keys = new Map<number, HTMLDivElement>();

  const whiteCount = Array.from({ length: HIGH - LOW + 1 }, (_, i) => LOW + i).filter((m) => !isBlack(m)).length;
  const W = 100 / whiteCount;
  let wi = 0;
  for (let m = LOW; m <= HIGH; m++) {
    const d = document.createElement('div');
    if (!isBlack(m)) {
      d.className = 'wk' + (m % 12 === 0 ? ' c0' : '');
      if (m % 12 === 0) d.dataset.o = 'C' + (m / 12 - 1);
      wi++;
    } else {
      d.className = 'bk';
      d.style.left = `calc(${wi * W}% - ${W * 0.31}%)`;
      d.style.width = W * 0.62 + '%';
    }
    d.appendChild(document.createElement('span'));
    d.addEventListener('pointerdown', () => playNote(m));
    kb.appendChild(d);
    keys.set(m, d);
  }

  function paint(): void {
    const c = state.current ? chordById[state.current] : null;
    keys.forEach((d) => {
      d.classList.remove('rh', 'bs', 'live');
      d.style.removeProperty('--kc');
      d.firstChild!.textContent = '';
    });
    if (c) {
      const color = `var(${KIND_COLOR[c.kind]})`;
      const label = (m: number) => {
        const i = c.pcs.indexOf(m % 12);
        return i >= 0 ? c.noteNames[i] : '';
      };
      const mark = (m: number, cls: string) => {
        const d = keys.get(m);
        if (!d) return;
        d.classList.add(cls);
        d.style.setProperty('--kc', color);
        d.firstChild!.textContent = label(m);
      };
      state.voicing?.forEach((m) => mark(m, 'rh'));
      if (state.bass !== null) mark(state.bass, 'bs');
    }
    state.liveNotes.forEach((m) => keys.get(m)?.classList.add('live'));
  }

  subscribe(paint);
  bus.on('live-notes', paint);

  parent.appendChild(root);
}
