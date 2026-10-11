import './app.css';
import { mountChordGraph } from '@/features/chord-graph';
import { mountCurrentChord } from '@/features/current-chord';
import { mountKeySelector } from '@/features/key-selector';
import { mountMidiStatus } from '@/features/midi';
import { mountPiano } from '@/features/piano';
import { mountProgression } from '@/features/progression';
import { initShortcuts } from '@/features/shortcuts';
import { mountSuggestions } from '@/features/suggestions';
import { mountTransitionLayers } from '@/features/transition-layers';
import { loadProgression } from '@/core/store';
import { html, qs } from '@/shared/dom';

/** Progressão de exemplo em Dó: I – vi – V7/ii – ii – V7 – I */
const EXAMPLE_PROGRESSION = ['M0', 'm9', 'Vm2', 'm2', 'VM0', 'M0'];

/* Layout: próximos acordes à esquerda, grafo circular no centro, painel de decisão à direita, trilha + teclado embaixo */
const TEMPLATE = `
  <div class="app">
    <header>
      <h1>Teia <span>Harmônica</span></h1>
      <div class="tag">Escolha um acorde, veja para onde ele pode ir, toque o próximo.</div>
    </header>
    <aside class="next-col"></aside>
    <div class="stage"></div>
    <aside class="side">
      <p class="hint"><kbd>1</kbd>–<kbd>9</kbd> toca a sugestão · <kbd>Espaço</kbd> repete · <kbd>⌫</kbd> desfaz · <kbd>[</kbd> <kbd>]</kbd> muda o tom por quintas</p>
    </aside>
    <section class="dock">
      <div class="legend">
        <span><i style="background:var(--maj)"></i>Maior</span>
        <span><i style="background:var(--min)"></i>Menor relativo</span>
        <span><i style="background:var(--dom)"></i>Dominante (V7)</span>
        <span><i style="background:var(--dim)"></i>Diminuto (vii°7)</span>
        <span>Teclado: faixa inferior = baixo (mão esquerda), tecla cheia = voicing (mão direita), com condução de vozes automática</span>
      </div>
    </section>
  </div>`;

export function mountApp(container: HTMLElement): void {
  const app = html(TEMPLATE);
  const header = qs(app, 'header');
  const side = qs(app, '.side');
  const hint = qs(side, '.hint');
  const dock = qs(app, '.dock');
  const legend = qs(dock, '.legend');

  mountMidiStatus(header);
  mountSuggestions(qs(app, '.next-col'));
  mountChordGraph(qs(app, '.stage'));

  const sidePanel = document.createDocumentFragment();
  mountKeySelector(sidePanel);
  mountCurrentChord(sidePanel);
  mountTransitionLayers(sidePanel);
  side.insertBefore(sidePanel, hint);

  const dockPanel = document.createDocumentFragment();
  mountProgression(dockPanel);
  mountPiano(dockPanel);
  dock.insertBefore(dockPanel, legend);

  initShortcuts();
  container.appendChild(app);

  loadProgression(EXAMPLE_PROGRESSION);
}
