import './transition-layers.css';
import { TRANSITION_TYPES } from '@/core/harmony';
import { setLayer, state } from '@/core/store';
import { html, qs } from '@/shared/dom';

/** Liga/desliga cada tipo de transição (persistido no localStorage). */
export function mountTransitionLayers(parent: Node): void {
  const root = html(`<section class="sec"><h2>Camadas de transição</h2><div class="layers"></div></section>`);
  const wrap = qs(root, '.layers');

  TRANSITION_TYPES.forEach((t) => {
    const label = document.createElement('label');
    label.htmlFor = 'ly-' + t.k;
    label.innerHTML =
      `<input type="checkbox" id="ly-${t.k}" ${state.layers[t.k] ? 'checked' : ''}>` +
      `<i style="background:var(--e-${t.k})"></i>${t.label}`;
    qs<HTMLInputElement>(label, 'input').addEventListener('change', (ev) =>
      setLayer(t.k, (ev.target as HTMLInputElement).checked),
    );
    wrap.appendChild(label);
  });

  parent.appendChild(root);
}
