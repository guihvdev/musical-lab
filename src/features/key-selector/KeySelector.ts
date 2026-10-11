import './key-selector.css';
import { MAJ, chordById } from '@/core/harmony';
import { setKey, subscribe } from '@/core/store';
import { html, qs } from '@/shared/dom';

/** Grade com os 12 tons maiores, de C a F pelo ciclo de quintas. */
export function mountKeySelector(parent: Node): void {
  const root = html(`<section class="sec"><h2>Tom</h2><div class="keys12"></div></section>`);
  const grid = qs(root, '.keys12');

  const buttons = [...MAJ.slice(1), MAJ[0]].map((r) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.r = String(r);
    b.textContent = chordById['M' + r].name;
    b.addEventListener('click', () => setKey(r));
    grid.appendChild(b);
    return b;
  });

  subscribe((s) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.r) === s.key)));
  });

  parent.appendChild(root);
}
