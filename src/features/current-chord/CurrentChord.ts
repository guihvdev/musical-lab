import './current-chord.css';
import { KIND_COLOR, chordById, inKey, numeral } from '@/core/harmony';
import { subscribe } from '@/core/store';
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
    nm.textContent = cur ? cur.name : '—';
    nm.style.color = cur ? `var(${KIND_COLOR[cur.kind]})` : '';
    num.textContent = cur
      ? numeral(cur, s.key) + (inKey(cur, s.key) ? '' : ' · fora do tom')
      : 'Escolha um acorde no grafo';
    notes.textContent = cur ? cur.noteNames.join(' – ') : '';
  });

  parent.appendChild(root);
}
