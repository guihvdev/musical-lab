import { pick, replay, saveTrail, setFocus, shiftKey, state, undo } from '@/core/store';

/**
 * 1–9 toca a sugestão · Espaço repete · Backspace desfaz · [ ] muda o tom por quintas ·
 * F liga/desliga o modo foco (Esc sai) · Ctrl/⌘+S salva a trilha.
 * Ignorado em campos de formulário, em diálogos e com modificadores.
 */
export function initShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    const target = e.target as Element;
    if (target.matches('input, textarea, select') || target.closest('dialog')) return;

    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (state.editing || state.progression.length) saveTrail();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (/^[1-9]$/.test(e.key)) {
      const s = state.suggestions[Number(e.key) - 1];
      if (s) {
        e.preventDefault();
        pick(s.chord.id);
      }
    } else if (e.key === ' ' && (target === document.body || target.classList.contains('graph'))) {
      e.preventDefault();
      replay();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      undo();
    } else if (e.key === ']' || e.key === '[') {
      shiftKey(e.key === ']' ? 1 : -1);
    } else if (e.key === 'f' || e.key === 'F') {
      setFocus();
    } else if (e.key === 'Escape' && state.focus) {
      setFocus(false);
    }
  });
}
