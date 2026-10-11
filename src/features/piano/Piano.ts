import './piano.css';
import { KIND_COLOR, chordById } from '@/core/harmony';
import { bus, chordNotes, state, subscribe } from '@/core/store';
import { playNote } from '@/shared/audio/synth';
import { html, qs } from '@/shared/dom';

const LOW = 36; // C2
const HIGH = 84; // C6
const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(m % 12);

/**
 * Teclado na tela: voicing (mão direita), baixo e notas MIDI ao vivo; toca ao clicar.
 * Com um estudo ativo, ganha a camada da escala do momento (pontos), com tônica, nota blue e notas-alvo.
 */
export function mountPiano(parent: Node): void {
  const root = html(`
    <div class="piano">
      <div class="scale-bar" hidden>
        <span class="scale-title"></span>
        <span class="scale-notes"></span>
        <span class="scale-legend">
          <span><i class="dot"></i>escala</span>
          <span><i class="dot tn"></i>tônica</span>
          <span><i class="dot tg"></i>nota-alvo</span>
          <span class="lg-blue"><i class="dot bl"></i>nota blue</span>
        </span>
      </div>
      <div class="kbwrap"><div class="kb"></div></div>
    </div>`);
  const kb = qs(root, '.kb');
  const bar = qs(root, '.scale-bar');
  const barTitle = qs(root, '.scale-title');
  const barNotes = qs(root, '.scale-notes');
  const legendBlue = qs(root, '.lg-blue');
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
    const scale = state.scale;
    keys.forEach((d) => {
      d.classList.remove('rh', 'bs', 'live', 'sc', 'tn', 'bl', 'tg');
      d.style.removeProperty('--kc');
      d.firstChild!.textContent = '';
    });
    if (c) {
      const color = `var(${KIND_COLOR[c.kind]})`;
      const names = chordNotes(c);
      root.style.setProperty('--tg', color);
      const label = (m: number) => {
        const i = c.pcs.indexOf(m % 12);
        return i >= 0 ? names[i] : '';
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
    if (scale) {
      const byPc = new Map(scale.notes.map((n) => [n.pc, n]));
      keys.forEach((d, m) => {
        const n = byPc.get(m % 12);
        if (!n) return;
        d.classList.add('sc');
        if (n.tonic) d.classList.add('tn');
        if (n.blue) d.classList.add('bl');
        if (c?.pcs.includes(n.pc)) d.classList.add('tg');
      });
    }
    state.liveNotes.forEach((m) => keys.get(m)?.classList.add('live'));
  }

  function paintBar(): void {
    const scale = state.scale;
    bar.hidden = !scale;
    if (!scale) return;
    const c = state.current ? chordById[state.current] : null;
    barTitle.innerHTML = `<b>Escala</b> ${scale.title}`;
    barNotes.innerHTML = scale.notes
      .map((n) => {
        const cls = [n.tonic && 'tn', n.blue && 'bl', c?.pcs.includes(n.pc) && 'tg'].filter(Boolean).join(' ');
        return `<span class="${cls}">${n.name}</span>`;
      })
      .join(' ');
    legendBlue.hidden = !scale.hasBlue;
  }

  subscribe(() => {
    paint();
    paintBar();
  });
  bus.on('live-notes', paint);

  parent.appendChild(root);
}
