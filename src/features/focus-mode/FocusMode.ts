import './focus-mode.css';
import { setFocus, subscribe } from '@/core/store';
import { html } from '@/shared/dom';

/**
 * Modo foco: esconde tudo menos o grafo e o teclado (classe `focus-mode` no `shell`).
 * `header` recebe o botão que entra no modo; um botão flutuante sai dele.
 */
export function mountFocusMode(shell: HTMLElement, header: HTMLElement): void {
  const enter = html<HTMLButtonElement>(
    `<button class="focus-toggle" type="button" title="Modo foco (F)"><span aria-hidden="true">⛶</span> Foco</button>`,
  );
  const exit = html<HTMLButtonElement>(
    `<button class="focus-exit" type="button" title="Sair do modo foco (F ou Esc)">Sair do foco <kbd>F</kbd></button>`,
  );
  enter.addEventListener('click', () => setFocus(true));
  exit.addEventListener('click', () => setFocus(false));
  header.appendChild(enter);
  shell.appendChild(exit);

  let shown: boolean | null = null;
  subscribe((s) => {
    if (s.focus === shown) return;
    if (shown === false && s.focus) scrollTo({ top: 0 });
    shown = s.focus;
    shell.classList.toggle('focus-mode', s.focus);
    exit.hidden = !s.focus;
    // sem foco preso em botão: Espaço continua repetindo o acorde
    if (document.activeElement === exit || document.activeElement === enter) (document.activeElement as HTMLElement).blur();
  });
}
