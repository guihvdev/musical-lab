import './study-panel.css';
import { KIND_COLOR, chordById } from '@/core/harmony';
import { chordName, loadStudyProgression, pick, setVariant, subscribe } from '@/core/store';
import { sameIds, type ResolvedStudy } from '@/core/study';
import { html, qs } from '@/shared/dom';

/** Nomes da progressão sem repetições consecutivas: "F7 · Bb7 · F7 · C7". */
const preview = (ids: string[]) =>
  ids
    .filter((id, i) => id !== ids[i - 1])
    .map((id) => chordName(chordById[id]))
    .join(' · ');

/** Painel do estudo ativo: descrição, variação, funções em foco, progressões-modelo e dicas. */
export function mountStudyPanel(parent: Node): void {
  const root = html(`<section class="sec study-panel" hidden><h2>Estudo</h2><div class="study-card"></div></section>`);
  const card = qs(root, '.study-card');
  let shown: ResolvedStudy | null = null;
  let focusButtons: { id: string; el: HTMLButtonElement }[] = [];
  let progButtons: HTMLButtonElement[] = [];

  function build(study: ResolvedStudy): void {
    const { mode, variant } = study;
    card.innerHTML = `
      <div class="study-head">
        <span class="study-meta">${mode.category} · ${mode.level}</span>
        <h3>${mode.name}</h3>
        <p class="study-desc">${mode.description}</p>
      </div>
      ${
        mode.variants && mode.variants.length > 1
          ? `<div class="study-variants" role="group" aria-label="Variação">${mode.variants
              .map((v) => `<button type="button" data-v="${v.id}" aria-pressed="${v.id === variant?.id}">${v.name}</button>`)
              .join('')}</div>`
          : ''
      }
      <div class="study-row"><span class="study-lbl">Foco</span><div class="study-focus"></div></div>
      <div class="study-row"><span class="study-lbl">Progressões</span><div class="study-progs"></div></div>
      <ul class="study-tips">${study.tips.map((t) => `<li>${t}</li>`).join('')}</ul>`;

    card.querySelectorAll<HTMLButtonElement>('[data-v]').forEach((b) =>
      b.addEventListener('click', () => setVariant(b.dataset.v!)),
    );

    const focusWrap = qs(card, '.study-focus');
    focusButtons = study.focusList.map(({ symbol, id }) => {
      const c = chordById[id];
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'study-fn';
      el.innerHTML = `<b style="color:var(${KIND_COLOR[c.kind]})">${chordName(c)}</b><small>${symbol}</small>`;
      el.addEventListener('click', () => pick(id));
      focusWrap.appendChild(el);
      return { id, el };
    });

    const progWrap = qs(card, '.study-progs');
    progButtons = study.progressions.map((p, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'study-prog';
      el.title = 'Carregar na trilha';
      el.innerHTML = `<span class="sp-name">${p.name}</span><span class="sp-chords">${preview(p.ids)}</span>`;
      el.addEventListener('click', () => loadStudyProgression(i));
      progWrap.appendChild(el);
      return el;
    });
  }

  subscribe((s) => {
    root.hidden = !s.study;
    if (!s.study) {
      shown = null;
      return;
    }
    if (s.study !== shown) {
      shown = s.study;
      build(s.study);
    }
    const loaded = sameIds(s.progression, s.loadedProgression);
    progButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(loaded && i === s.activeProgression)));
    focusButtons.forEach(({ id, el }) => el.classList.toggle('on', id === s.current));
  });

  parent.appendChild(root);
}
