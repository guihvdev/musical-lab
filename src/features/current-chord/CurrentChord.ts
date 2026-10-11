import './current-chord.css';
import { KIND_COLOR, chordById } from '@/core/harmony';
import { chordFunction, chordName, chordNotes, isInKey, subscribe } from '@/core/store';
import { html, qs } from '@/shared/dom';

/** Cartão com nome, função e notas do acorde atual. */
export function mountCurrentChord(parent: Node): void {
  const root = html(`
    <section class="sec">
      <h2>Acorde atual</h2>
      <div class="now">
        <div class="nm">—</div>
        <div class="meta"><div class="num"></div><div class="notes"></div></div>
      </div>
    </section>`);
  const nm = qs(root, '.nm');
  const num = qs(root, '.num');
  const notes = qs(root, '.notes');

  subscribe((s) => {
    const cur = s.current ? chordById[s.current] : null;
    nm.textContent = cur ? chordName(cur) : '—';
    nm.style.color = cur ? `var(${KIND_COLOR[cur.kind]})` : '';
    num.textContent = cur
      ? chordFunction(cur) + (isInKey(cur) ? '' : ' · fora do tom')
      : 'Escolha um acorde no grafo';
    notes.textContent = cur ? chordNotes(cur).join(' – ') : '';
  });

  parent.appendChild(root);
}
