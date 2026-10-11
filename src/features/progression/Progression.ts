import './progression.css';
import { chordById, numeral } from '@/core/harmony';
import { clearProgression, jumpTo, setBpm, state, subscribe, undo } from '@/core/store';
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
      <div class="chips" aria-label="Trilha de acordes tocados"></div>
    </div>`);
  const play = qs<HTMLButtonElement>(root, '[data-action="play"]');
  const bpmValue = qs(root, '.bpm-v');
  const chips = qs(root, '.chips');

  play.addEventListener('click', togglePlayback);
  onPlaybackChange((playing) => (play.textContent = playing ? '■ Parar' : '▶ Tocar trilha'));
  qs(root, '[data-action="undo"]').addEventListener('click', undo);
  qs(root, '[data-action="clear"]').addEventListener('click', clearProgression);
  qs<HTMLInputElement>(root, '#bpm').addEventListener('input', (e) => {
    setBpm(Number((e.target as HTMLInputElement).value));
    bpmValue.textContent = String(state.bpm);
  });

  subscribe((s) => {
    chips.innerHTML = '';
    if (!s.progression.length) {
      chips.innerHTML = '<span class="empty">A trilha registra cada acorde escolhido.</span>';
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
      chip.innerHTML = `<b>${c.name}</b><small>${numeral(c, s.key)}</small>`;
      chip.addEventListener('click', () => jumpTo(i));
      chips.appendChild(chip);
    });
    chips.querySelector('.chip.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  parent.appendChild(root);
}
