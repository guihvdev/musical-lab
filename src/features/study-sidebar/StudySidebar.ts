import './study-sidebar.css';
import { activateStudy, subscribe } from '@/core/store';
import { STUDY_MODES, findMode, type StudyCategory } from '@/core/study';
import { html, qs } from '@/shared/dom';
import { readJSON, writeJSON } from '@/shared/storage';

const CATEGORIES: readonly StudyCategory[] = ['Estilos', 'Escalas', 'Técnicas'];
const COLLAPSED_KEY = 'teia-studies-collapsed';
const MOBILE = '(max-width: 960px)';

/** Busca sem acento e sem caixa. */
const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Sidebar "Estudos": fixa à esquerda no desktop (recolhível) e gaveta no celular.
 * `shell` recebe a sidebar como primeiro filho; `header` recebe o botão que a abre/recolhe.
 */
export function mountStudySidebar(shell: HTMLElement, header: HTMLElement): void {
  const aside = html(`
    <aside class="studies" id="studies" aria-label="Estudos">
      <div class="studies-head">
        <h2>Estudos</h2>
        <button class="studies-close" type="button" aria-label="Recolher estudos">‹</button>
      </div>
      <input class="studies-search" type="search" placeholder="Buscar estudo" aria-label="Buscar estudo por nome">
      <nav class="studies-list">
        <button class="study-item" type="button" data-id="">
          <span class="si-name">Livre</span><span class="si-meta">sem estudo</span>
        </button>
        ${CATEGORIES.map((cat) => {
          const modes = STUDY_MODES.filter((m) => m.category === cat);
          if (!modes.length) return '';
          return `<section class="studies-cat"><h3>${cat}</h3>${modes
            .map(
              (m) => `<button class="study-item" type="button" data-id="${m.id}" title="${m.description}">
                <span class="si-name">${m.name}</span><span class="si-meta lvl-${m.level}">${m.level}</span>
              </button>`,
            )
            .join('')}</section>`;
        }).join('')}
      </nav>
      <p class="empty studies-empty" hidden>Nenhum estudo com esse nome.</p>
    </aside>`);
  const backdrop = html(`<div class="studies-backdrop"></div>`);
  const toggle = html<HTMLButtonElement>(`
    <button class="studies-toggle" type="button" aria-controls="studies">
      <span aria-hidden="true">☰</span> Estudos<span class="st-active"></span>
    </button>`);
  const search = qs<HTMLInputElement>(aside, '.studies-search');
  const empty = qs(aside, '.studies-empty');
  const activeLabel = qs(toggle, '.st-active');
  const items = [...aside.querySelectorAll<HTMLButtonElement>('.study-item')];

  shell.prepend(aside, backdrop);
  header.prepend(toggle);

  /* ---------- Abrir / recolher ---------- */
  const mobile = matchMedia(MOBILE);
  let collapsed = readJSON(COLLAPSED_KEY, false);
  let drawerOpen = false;

  function sync(): void {
    shell.classList.toggle('studies-collapsed', collapsed);
    shell.classList.toggle('drawer-open', drawerOpen);
    const expanded = mobile.matches ? drawerOpen : !collapsed;
    toggle.setAttribute('aria-expanded', String(expanded));
    // gaveta fechada fica fora da ordem de foco
    aside.inert = mobile.matches && !drawerOpen;
  }

  function setDrawer(open: boolean): void {
    drawerOpen = open;
    sync();
    if (open) search.focus();
    else toggle.focus();
  }

  function toggleSidebar(): void {
    if (mobile.matches) return setDrawer(!drawerOpen);
    collapsed = !collapsed;
    writeJSON(COLLAPSED_KEY, collapsed);
    sync();
  }

  toggle.addEventListener('click', toggleSidebar);
  qs(aside, '.studies-close').addEventListener('click', toggleSidebar);
  backdrop.addEventListener('click', () => setDrawer(false));
  aside.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobile.matches && drawerOpen) setDrawer(false);
  });
  mobile.addEventListener('change', () => {
    drawerOpen = false;
    sync();
  });

  /* ---------- Busca e escolha ---------- */
  search.addEventListener('input', () => {
    const q = normalize(search.value.trim());
    let any = false;
    items.forEach((b) => {
      const match = !q || normalize(qs(b, '.si-name').textContent ?? '').includes(q);
      b.hidden = !match;
      any ||= match;
    });
    aside.querySelectorAll<HTMLElement>('.studies-cat').forEach((sec) => {
      sec.hidden = ![...sec.querySelectorAll<HTMLElement>('.study-item')].some((b) => !b.hidden);
    });
    empty.hidden = any;
  });

  items.forEach((b) =>
    b.addEventListener('click', () => {
      activateStudy(b.dataset.id || null);
      if (mobile.matches) setDrawer(false);
    }),
  );

  subscribe((s) => {
    items.forEach((b) => b.setAttribute('aria-current', String((b.dataset.id || null) === s.studyId)));
    const mode = findMode(s.studyId);
    activeLabel.textContent = mode ? ` · ${mode.name}` : '';
  });

  sync();
}
