import './transition-layers.css';
import { TRANSITION_TYPES } from '@/core/harmony';
import { setLayer, state, subscribe } from '@/core/store';
import { html, qs } from '@/shared/dom';

/** Liga/desliga cada tipo de transição. No modo Livre persiste no localStorage; nos estudos parte do modo. */
export function mountTransitionLayers(parent: Node): void {
  const root = html(`<section class="sec"><h2>Camadas de transição</h2><div class="layers"></div></section>`);
  const wrap = qs(root, '.layers');

  const items = TRANSITION_TYPES.map((t) => {
    const label = document.createElement('label');
    label.htmlFor = 'ly-' + t.k;
    label.innerHTML =
      `<input type="checkbox" id="ly-${t.k}" ${state.layers[t.k] ? 'checked' : ''}>` +
      `<i style="background:var(--e-${t.k})"></i>${t.label}`;
    const input = qs<HTMLInputElement>(label, 'input');
    input.addEventListener('change', () => setLayer(t.k, input.checked));
    wrap.appendChild(label);
    return { t, label, input };
  });

  // estudos trocam as camadas; "Caminho do estudo" só existe com um estudo ativo
  subscribe((s) => {
    items.forEach(({ t, label, input }) => {
      input.checked = s.layers[t.k];
      label.hidden = t.k === 'std' && !s.study;
    });
  });

  parent.appendChild(root);
}
