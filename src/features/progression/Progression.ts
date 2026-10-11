import './progression.css';
import { chordById } from '@/core/harmony';
import {
  chordFunction,
  chordName,
  clearProgression,
  duplicateChord,
  jumpTo,
  moveChord,
  removeChord,
  setBpm,
  state,
  subscribe,
  undo,
} from '@/core/store';
import { html, qs } from '@/shared/dom';
import { onPlaybackChange, togglePlayback } from './playback';

/** Controles de reprodução e trilha de acordes tocados. */
export function mountProgression(parent: Node): void {
  const root = html(`
    <div class="trail">
      <div class="ctl">
        <button class="btn pri" data-action="play" type="button">▶ Tocar trilha</button>
        <button class="btn" data-action="undo" type="button">Desfazer</button>
        <button class="btn" data-action="clear" type="button">Limpar</button>
        <label class="bpm" for="bpm"><span class="bpm-v">${state.bpm}</span> bpm <input id="bpm" type="range" min="50" max="160" value="${state.bpm}"></label>
      </div>
      <div class="ctl edit-ctl" role="group" aria-label="Acorde selecionado">
        <button class="btn ico" data-action="left" type="button" aria-label="Mover acorde para trás" title="Mover para trás">←</button>
        <button class="btn ico" data-action="right" type="button" aria-label="Mover acorde para frente" title="Mover para frente">→</button>
        <button class="btn" data-action="dup" type="button" title="Repetir o acorde selecionado">Repetir</button>
        <button class="btn" data-action="remove" type="button" title="Remover o acorde selecionado">Remover</button>
      </div>
      <div class="chips" aria-label="Trilha de acordes tocados"></div>
    </div>`);
  const play = qs<HTMLButtonElement>(root, '[data-action="play"]');
  const bpm = qs<HTMLInputElement>(root, '#bpm');
  const bpmValue = qs(root, '.bpm-v');
  const left = qs<HTMLButtonElement>(root, '[data-action="left"]');
  const right = qs<HTMLButtonElement>(root, '[data-action="right"]');
  const dup = qs<HTMLButtonElement>(root, '[data-action="dup"]');
  const remove = qs<HTMLButtonElement>(root, '[data-action="remove"]');
  const chips = qs(root, '.chips');

  play.addEventListener('click', togglePlayback);
  onPlaybackChange((playing) => (play.textContent = playing ? '■ Parar' : '▶ Tocar trilha'));
  qs(root, '[data-action="undo"]').addEventListener('click', undo);
  qs(root, '[data-action="clear"]').addEventListener('click', clearProgression);
  bpm.addEventListener('input', () => {
    setBpm(Number(bpm.value));
    bpmValue.textContent = String(state.bpm);
  });
  left.addEventListener('click', () => moveChord(-1));
  right.addEventListener('click', () => moveChord(1));
  dup.addEventListener('click', duplicateChord);
  remove.addEventListener('click', removeChord);

  subscribe((s) => {
    // abrir uma progressão salva traz o andamento dela
    if (bpm.value !== String(s.bpm)) {
      bpm.value = String(s.bpm);
      bpmValue.textContent = String(s.bpm);
    }
    const n = s.progression.length;
    left.disabled = s.position <= 0;
    right.disabled = s.position < 0 || s.position >= n - 1;
    dup.disabled = remove.disabled = s.position < 0;

    chips.innerHTML = '';
    if (!n) {
      chips.innerHTML = s.editing
        ? '<span class="empty">Progressão vazia: escolha acordes no grafo para adicioná-los.</span>'
        : '<span class="empty">A trilha registra cada acorde escolhido.</span>';
      return;
    }
    s.progression.forEach((id, i) => {
      const c = chordById[id];
      if (i) {
        const arrow = document.createElement('span');
        arrow.className = 'arrow';
        arrow.textContent = '→';
        chips.appendChild(arrow);
      }
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip ' + c.kind + (i === s.position ? ' on' : '');
      chip.innerHTML = `<b>${chordName(c)}</b><small>${chordFunction(c)}</small>`;
      chip.addEventListener('click', () => jumpTo(i));
      chips.appendChild(chip);
    });
    chips.querySelector('.chip.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  parent.appendChild(root);
}
