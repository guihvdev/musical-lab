import './library.css';
import {
  bus,
  closeEditing,
  createSaved,
  deleteSaved,
  duplicateSaved,
  editingSaved,
  findSaved,
  importSaved,
  isDirty,
  openSaved,
  renameSaved,
  saveTrail,
  saveTrailAsNew,
  state,
  subscribe,
  type SavedProgression,
} from '@/core/store';
import { escapeHtml, html, qs } from '@/shared/dom';
import { contextLabel, downloadLibrary, downloadSaved, type ExportFormat } from './export';

/** Nomes sem repetições consecutivas: "F7 → Bb7 → F7 → C7". */
const preview = (p: SavedProgression) =>
  p.chords
    .filter((c, i) => c.id !== p.chords[i - 1]?.id)
    .map((c) => c.name)
    .join(' → ');

const date = (t: number) => new Date(t).toLocaleDateString('pt-BR');

/** Pede confirmação antes de descartar alterações não salvas da progressão em edição. */
function canDiscard(): boolean {
  return !isDirty() || confirm(`Descartar as alterações não salvas em "${editingSaved()!.name}"?`);
}

/**
 * Progressões salvas: barra acima da trilha (salvar, nome e estado da progressão em edição) e
 * diálogo "Minhas progressões" (abrir, renomear, duplicar, baixar, excluir, importar).
 */
export function mountLibrary(parent: Node): void {
  const bar = html(`
    <div class="lib-bar">
      <div class="lib-edit" hidden>
        <span class="lib-lbl" title="Acordes escolhidos entram depois do selecionado; ⌫ remove o selecionado">Editando</span>
        <input class="lib-name" type="text" maxlength="80" aria-label="Nome da progressão" spellcheck="false">
        <span class="lib-dirty" hidden>não salva</span>
      </div>
      <div class="lib-actions">
        <button class="btn" data-action="save" type="button" title="Salvar (Ctrl+S)">Salvar trilha</button>
        <button class="btn" data-action="save-new" type="button" hidden>Salvar como nova</button>
        <button class="btn" data-action="close" type="button" hidden>Fechar</button>
        <button class="btn lib-rec" data-action="record" type="button" title="Gravar pelo microfone e gerar a trilha (R)"><i aria-hidden="true"></i> Gravar</button>
        <button class="btn" data-action="library" type="button">Minhas progressões <span class="lib-count"></span></button>
      </div>
    </div>`);
  const dialog = html<HTMLDialogElement>(`
    <dialog class="lib-dialog" aria-labelledby="lib-title">
      <div class="lib-head">
        <h2 id="lib-title">Minhas progressões</h2>
        <button class="lib-x" type="button" aria-label="Fechar">×</button>
      </div>
      <div class="lib-tools">
        <button class="btn pri" data-action="new" type="button">+ Nova progressão</button>
        <button class="btn" data-action="audio" type="button">Gerar de áudio…</button>
        <button class="btn" data-action="import" type="button">Importar JSON</button>
        <button class="btn" data-action="export-all" type="button">Baixar todas</button>
        <input class="lib-file" type="file" accept=".json,application/json" hidden>
      </div>
      <p class="lib-msg" role="status"></p>
      <ul class="lib-list"></ul>
      <p class="empty lib-empty">Nenhuma progressão salva. Monte uma trilha no grafo e clique em <b>Salvar trilha</b>, ou comece uma nova.</p>
    </dialog>`);

  const edit = qs(bar, '.lib-edit');
  const nameInput = qs<HTMLInputElement>(bar, '.lib-name');
  const dirty = qs(bar, '.lib-dirty');
  const saveBtn = qs<HTMLButtonElement>(bar, '[data-action="save"]');
  const saveNewBtn = qs<HTMLButtonElement>(bar, '[data-action="save-new"]');
  const closeBtn = qs<HTMLButtonElement>(bar, '[data-action="close"]');
  const count = qs(bar, '.lib-count');
  const list = qs(dialog, '.lib-list');
  const empty = qs(dialog, '.lib-empty');
  const msg = qs(dialog, '.lib-msg');
  const file = qs<HTMLInputElement>(dialog, '.lib-file');

  /* ---------- Barra ---------- */
  saveBtn.addEventListener('click', saveTrail);
  saveNewBtn.addEventListener('click', saveTrailAsNew);
  closeBtn.addEventListener('click', () => canDiscard() && closeEditing());
  qs(bar, '[data-action="library"]').addEventListener('click', openDialog);
  qs(bar, '[data-action="record"]').addEventListener('click', () => bus.emit('audio-import', { record: true }));

  const commitName = () => {
    if (state.editing) renameSaved(state.editing, nameInput.value);
    nameInput.value = editingSaved()?.name ?? '';
  };
  nameInput.addEventListener('change', commitName);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') nameInput.blur();
    if (e.key === 'Escape') {
      nameInput.value = editingSaved()?.name ?? '';
      nameInput.blur();
    }
  });

  addEventListener('beforeunload', (e) => {
    if (isDirty()) e.preventDefault();
  });

  /* ---------- Diálogo ---------- */
  let renaming: string | null = null;
  let confirmDelete: string | null = null;

  function openDialog(): void {
    renaming = confirmDelete = null;
    msg.textContent = '';
    renderList();
    dialog.showModal();
  }

  function renderList(): void {
    const { library, editing } = state;
    empty.hidden = library.length > 0;
    list.innerHTML = library
      .map((p) => {
        const name =
          p.id === renaming
            ? `<input class="li-rename" type="text" maxlength="80" value="${escapeHtml(p.name)}" aria-label="Novo nome">`
            : `<span class="li-name">${escapeHtml(p.name)}</span>`;
        return `
          <li class="lib-item${p.id === editing ? ' on' : ''}" data-id="${p.id}">
            <div class="li-main">
              ${name}
              <span class="li-meta">${contextLabel(p)} · ${p.chords.length} acordes · ${p.bpm} bpm · ${date(p.updatedAt)}${p.id === editing ? ' · <b>em edição</b>' : ''}</span>
              <span class="li-chords">${escapeHtml(preview(p)) || '<i>vazia</i>'}</span>
            </div>
            <div class="li-actions">
              <button class="btn pri" data-act="open" type="button">${p.id === editing ? 'Reabrir' : 'Abrir'}</button>
              <button class="btn" data-act="rename" type="button">Renomear</button>
              <button class="btn" data-act="dup" type="button">Duplicar</button>
              <span class="li-dl" role="group" aria-label="Baixar">
                <span>Baixar</span>
                <button class="btn" data-act="mid" type="button" title="Arquivo MIDI (voicings com condução de vozes)">MIDI</button>
                <button class="btn" data-act="txt" type="button" title="Cifra em texto, com as funções">TXT</button>
                <button class="btn" data-act="json" type="button" title="JSON reimportável">JSON</button>
              </span>
              <button class="btn danger" data-act="del" type="button">${p.id === confirmDelete ? 'Confirmar exclusão' : 'Excluir'}</button>
            </div>
          </li>`;
      })
      .join('');

    const input = list.querySelector<HTMLInputElement>('.li-rename');
    if (input) {
      input.focus();
      input.select();
      const id = renaming!;
      let done = false;
      const finish = (commit: boolean) => {
        if (done) return;
        done = true;
        renaming = null;
        if (commit) renameSaved(id, input.value);
        renderList();
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') {
          e.preventDefault(); // não fecha o diálogo
          finish(false);
        }
      });
      input.addEventListener('blur', () => finish(true));
    }
  }

  list.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-act]');
    const id = btn?.closest<HTMLElement>('.lib-item')?.dataset.id;
    const p = findSaved(id ?? null);
    if (!btn || !p) return;
    const act = btn.dataset.act!;
    if (act !== 'del') confirmDelete = null;

    switch (act) {
      case 'open':
        if (p.id === state.editing || canDiscard()) {
          openSaved(p.id);
          dialog.close();
        }
        return;
      case 'rename':
        renaming = p.id;
        break;
      case 'dup':
        duplicateSaved(p.id);
        msg.textContent = `"${p.name}" duplicada.`;
        break;
      case 'mid':
      case 'txt':
      case 'json':
        downloadSaved(p, act as ExportFormat);
        return;
      case 'del':
        if (confirmDelete !== p.id) {
          confirmDelete = p.id;
          break;
        }
        confirmDelete = null;
        deleteSaved(p.id);
        msg.textContent = `"${p.name}" excluída.`;
        break;
    }
    renderList();
  });

  qs(dialog, '.lib-x').addEventListener('click', () => dialog.close());
  // clique no fundo (fora da caixa) fecha
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  qs(dialog, '[data-action="new"]').addEventListener('click', () => {
    if (!canDiscard()) return;
    createSaved();
    dialog.close();
  });
  qs(dialog, '[data-action="export-all"]').addEventListener('click', () => {
    if (state.library.length) downloadLibrary(state.library);
  });
  qs(dialog, '[data-action="import"]').addEventListener('click', () => file.click());
  qs(dialog, '[data-action="audio"]').addEventListener('click', () => {
    dialog.close();
    bus.emit('audio-import', { record: false });
  });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f) return;
    try {
      const n = importSaved(JSON.parse(await f.text()));
      msg.textContent = n ? `${n} ${n === 1 ? 'progressão importada' : 'progressões importadas'}.` : 'Nenhuma progressão válida no arquivo.';
    } catch {
      msg.textContent = 'Não foi possível ler o arquivo (JSON inválido).';
    }
    renderList();
  });

  subscribe((s) => {
    const p = editingSaved();
    edit.hidden = !p;
    saveNewBtn.hidden = closeBtn.hidden = !p;
    saveBtn.textContent = p ? 'Salvar' : 'Salvar trilha';
    saveBtn.disabled = !p && !s.progression.length;
    if (p && document.activeElement !== nameInput) nameInput.value = p.name;
    const changed = isDirty();
    dirty.hidden = !changed;
    saveBtn.classList.toggle('pri', changed);
    count.textContent = s.library.length ? `(${s.library.length})` : '';
  });

  parent.appendChild(bar);
  document.body.appendChild(dialog);
}
