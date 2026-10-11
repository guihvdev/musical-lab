import './suggestions.css';
import { KIND_COLOR, transitionType } from '@/core/harmony';
import { bus, chordFunction, chordName, pick, subscribe } from '@/core/store';
import { html, qs } from '@/shared/dom';

const TAG_TITLE = { next: 'Próximo acorde da progressão-modelo', focus: 'Função em foco no estudo' } as const;

/** Lista numerada dos próximos acordes possíveis (atalhos 1–9). */
export function mountSuggestions(parent: Node): void {
  const root = html(`<section class="sec"><h2>Próximos acordes</h2><div class="list"></div></section>`);
  const list = qs(root, '.list');

  subscribe((s) => {
    list.innerHTML = '';
    if (!s.suggestions.length) {
      list.innerHTML = '<div class="empty">Nenhuma transição nas camadas ligadas.</div>';
      return;
    }
    s.suggestions.forEach(({ transition, chord, tag }, i) => {
      const t = transitionType(transition.type);
      const hasKey = i < 9;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sug' + (tag ? ' ' + tag : '');
      if (tag) b.title = TAG_TITLE[tag];
      b.innerHTML =
        `<span class="k ${hasKey ? '' : 'nok'}">${hasKey ? i + 1 : '·'}</span>` +
        `<span class="c" style="color:var(${KIND_COLOR[chord.kind]})">${chordName(chord)}</span>` +
        `<span class="t" title="${t.label}"><i style="background:var(--e-${t.k})"></i><span class="tl">${t.label}</span></span>` +
        `<span class="r">${chordFunction(chord)}</span>`;
      b.addEventListener('click', () => pick(chord.id));
      b.addEventListener('mouseenter', () => bus.emit('edge-focus', { to: chord.id, on: true }));
      b.addEventListener('mouseleave', () => bus.emit('edge-focus', { to: chord.id, on: false }));
      list.appendChild(b);
    });
  });

  parent.appendChild(root);
}
