import './audio-import.css';
import { chordById, keyNames, numeral } from '@/core/harmony';
import type { AnalysisStage, AudioAnalysis } from '@/core/audio-analysis';
import { MAX_SAVED, bus, createFromChords, editingSaved, ensureChord, isDirty, type SavedChord } from '@/core/store';
import { escapeHtml, html, qs } from '@/shared/dom';
import type { WorkerMessage } from './analysis.worker';
import { MAX_SECONDS, decodeToMono } from './decode';
import { RecordError, canRecord, startRecording, type RecordFailure, type Recording } from './record';
import { createTimeline, formatTime } from './timeline';

const RECORD_ERRORS: Record<RecordFailure, string> = {
  unsupported: 'Este navegador não permite gravar aqui (é preciso HTTPS ou localhost).',
  denied: 'Sem permissão para usar o microfone. Libere o acesso nas configurações do site e tente de novo.',
  'no-device': 'Nenhum microfone encontrado.',
  failed: 'Não foi possível começar a gravar.',
};
/** Gravações mais curtas que isso não têm batidas suficientes para a análise. */
const MIN_RECORD_SECONDS = 3;

const STAGES: Record<AnalysisStage | 'decodificando', [string, number]> = {
  decodificando: ['Decodificando o áudio…', 0.1],
  espectro: ['Calculando o cromagrama…', 0.3],
  batidas: ['Encontrando as batidas…', 0.65],
  acordes: ['Reconhecendo os acordes…', 0.9],
};

/** Andamento dentro da faixa do controle de bpm (50–160), dobrando ou dividindo pela metade. */
function foldBpm(bpm: number): number {
  let b = bpm;
  while (b > 160) b /= 2;
  while (b < 50) b *= 2;
  return Math.round(b);
}

/**
 * Diálogo "Gerar trilha de áudio": analisa um arquivo no navegador (Web Worker), mostra os acordes numa linha
 * do tempo sincronizada com o áudio para revisão e cria uma progressão salva com o trecho escolhido.
 * O áudio vem de um arquivo ou de uma gravação pelo microfone. Abre pelo evento `audio-import` do barramento
 * (com `record: true`, já começa gravando).
 */
export function mountAudioImport(): void {
  const dialog = html<HTMLDialogElement>(`
    <dialog class="ai-dialog" aria-labelledby="ai-title">
      <div class="lib-head">
        <h2 id="ai-title">Gerar trilha de áudio</h2>
        <button class="lib-x" type="button" aria-label="Fechar">×</button>
      </div>

      <section class="ai-pick">
        <label class="ai-drop">
          <input class="ai-file-input" type="file" accept="audio/*">
          <b>Solte um arquivo de áudio aqui</b>
          <span>ou clique para escolher · mp3, wav, ogg, m4a · até ${MAX_SECONDS / 60} min</span>
        </label>
        <div class="ai-or"><span>ou</span></div>
        <button class="btn ai-rec-btn" data-action="record" type="button"><i class="ai-dot"></i> Gravar agora <kbd>R</kbd></button>
        <p class="ai-note">A análise roda no seu navegador: o áudio não é enviado a lugar nenhum. O resultado é aproximado (funciona melhor com harmonia clara e pouca distorção), então revise antes de importar.</p>
        <p class="ai-error" role="alert"></p>
      </section>

      <section class="ai-rec" hidden>
        <div class="ai-rec-head">
          <i class="ai-dot"></i>
          <span class="ai-rec-status" role="status"></span>
          <span class="ai-rec-time">0:00</span>
        </div>
        <div class="ai-meter" aria-hidden="true"><i></i></div>
        <p class="ai-note">Toque ou deixe a música tocando perto do microfone. Ao parar, a gravação é analisada como um arquivo.</p>
        <div class="ai-rec-actions">
          <button class="btn pri" data-action="rec-stop" type="button" disabled>■ Parar e analisar</button>
          <button class="btn" data-action="rec-cancel" type="button">Descartar</button>
        </div>
      </section>

      <section class="ai-busy" hidden>
        <p class="ai-stage" role="status"></p>
        <div class="ai-bar"><i></i></div>
        <button class="btn" data-action="cancel" type="button">Cancelar</button>
      </section>

      <section class="ai-review" hidden>
        <div class="ai-summary">
          <span class="ai-file"></span>
          <span class="ai-meta"></span>
        </div>
        <audio class="ai-audio" controls preload="auto"></audio>
        <div class="ai-timeline" tabindex="-1"></div>
        <div class="ai-detail"></div>
        <div class="ai-row">
          <span class="ai-lbl">Trecho</span>
          <span class="ai-range-v"></span>
          <button class="btn" data-action="start" type="button" title="Começa na posição atual do áudio">Início aqui</button>
          <button class="btn" data-action="end" type="button" title="Termina na posição atual do áudio">Fim aqui</button>
          <button class="btn" data-action="all" type="button">Música toda</button>
        </div>
        <div class="ai-row">
          <span class="ai-lbl">Trilha</span>
          <label><input type="radio" name="ai-mode" value="timed" checked> Manter durações <small>(1 acorde a cada 2 tempos)</small></label>
          <label><input type="radio" name="ai-mode" value="changes"> Só as mudanças</label>
          <label class="ai-bpm-l">bpm <input class="ai-bpm" type="number" min="50" max="160" step="1"></label>
        </div>
        <div class="ai-foot">
          <label class="ai-name-l">Nome <input class="ai-name" type="text" maxlength="80" spellcheck="false"></label>
          <span class="ai-count" role="status"></span>
          <button class="btn" data-action="other" type="button">Outro arquivo</button>
          <button class="btn pri" data-action="create" type="button">Criar progressão</button>
        </div>
      </section>
    </dialog>`);

  const pick = qs(dialog, '.ai-pick');
  const rec = qs(dialog, '.ai-rec');
  const recStatus = qs(dialog, '.ai-rec-status');
  const recTime = qs(dialog, '.ai-rec-time');
  const recMeter = qs(dialog, '.ai-meter i');
  const recStop = qs<HTMLButtonElement>(dialog, '[data-action="rec-stop"]');
  const busy = qs(dialog, '.ai-busy');
  const review = qs(dialog, '.ai-review');
  const drop = qs(dialog, '.ai-drop');
  const fileInput = qs<HTMLInputElement>(dialog, '.ai-file-input');
  const error = qs(dialog, '.ai-error');
  const stageLabel = qs(dialog, '.ai-stage');
  const bar = qs(dialog, '.ai-bar i');
  const fileLabel = qs(dialog, '.ai-file');
  const meta = qs(dialog, '.ai-meta');
  const audio = qs<HTMLAudioElement>(dialog, '.ai-audio');
  const detail = qs(dialog, '.ai-detail');
  const rangeLabel = qs(dialog, '.ai-range-v');
  const bpmInput = qs<HTMLInputElement>(dialog, '.ai-bpm');
  const nameInput = qs<HTMLInputElement>(dialog, '.ai-name');
  const count = qs(dialog, '.ai-count');
  const createBtn = qs<HTMLButtonElement>(dialog, '[data-action="create"]');
  const timeline = createTimeline(qs(dialog, '.ai-timeline'), audio, select);

  // WebM do MediaRecorder (Chrome) vem sem duração no cabeçalho: buscar o fim uma vez faz o navegador
  // descobri-la; sem isso a barra do player e o salto pelos blocos não funcionam
  audio.addEventListener('loadedmetadata', () => {
    if (audio.duration !== Infinity) return;
    audio.addEventListener('durationchange', () => (audio.currentTime = 0), { once: true });
    audio.currentTime = 1e101;
  });

  let result: AudioAnalysis | null = null;
  let selected = -1;
  let range: [number, number] = [0, 0];
  let worker: Worker | null = null;
  let job = 0;
  let audioUrl = '';

  let recording: Recording | null = null;
  let recTimer: ReturnType<typeof setInterval> | undefined;
  let recStart = 0;

  const show = (step: 'pick' | 'rec' | 'busy' | 'review') => {
    pick.hidden = step !== 'pick';
    rec.hidden = step !== 'rec';
    busy.hidden = step !== 'busy';
    review.hidden = step !== 'review';
  };
  const stage = (s: keyof typeof STAGES) => {
    stageLabel.textContent = STAGES[s][0];
    bar.style.width = `${STAGES[s][1] * 100}%`;
  };

  /* ---------- Arquivo → análise ---------- */
  function reset(): void {
    cancelRecording();
    job++;
    worker?.terminate();
    worker = null;
    result = null;
    audio.pause();
    audio.removeAttribute('src');
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = '';
    show('pick');
  }

  async function analyze(file: File): Promise<void> {
    reset();
    error.textContent = '';
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)$/i.test(file.name)) {
      error.textContent = 'Escolha um arquivo de áudio.';
      return;
    }
    const id = job;
    show('busy');
    stage('decodificando');
    let samples: Float32Array;
    try {
      ({ samples } = await decodeToMono(file));
    } catch (err) {
      if (id !== job) return;
      show('pick');
      error.textContent =
        err instanceof RangeError
          ? `O áudio tem mais de ${MAX_SECONDS / 60} minutos. Recorte um trecho antes de enviar.`
          : 'Não foi possível ler esse arquivo (formato não suportado pelo navegador?).';
      return;
    }
    if (id !== job) return;

    worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      if (id !== job) return;
      const msg = e.data;
      if (msg.type === 'stage') return stage(msg.stage);
      worker?.terminate();
      worker = null;
      if (msg.type === 'error') {
        show('pick');
        error.textContent = 'A análise falhou: ' + msg.message;
        return;
      }
      audioUrl = URL.createObjectURL(file);
      audio.src = audioUrl;
      loadResult(msg.result, file.name);
    };
    worker.postMessage(samples, [samples.buffer]);
  }

  function loadResult(r: AudioAnalysis, fileName: string): void {
    // acordes de vocabulário (tétrades) precisam existir nesta thread para cor, nome e importação
    r.segments.forEach((s) => {
      if (s.id) ensureChord(s.id, s.name);
      s.alternatives.forEach((a) => ensureChord(a.id, a.name));
    });
    result = r;
    selected = -1;
    range = [0, r.duration];
    const { major, relative } = keyNames(r.key);
    const cents = Math.round(r.tuning * 100);
    fileLabel.textContent = fileName;
    meta.textContent = `${formatTime(r.duration)} · tom provável ${r.minor ? relative : major} · ${Math.round(r.bpm)} bpm detectados${Math.abs(cents) >= 10 ? ` · afinação ${cents > 0 ? '+' : ''}${cents} cents` : ''}`;
    bpmInput.value = String(foldBpm(r.bpm));
    nameInput.value = fileName.replace(/\.[^.]+$/, '').slice(0, 80);
    show('review');
    update();
  }

  /* ---------- Gravação ---------- */
  function cancelRecording(): void {
    clearInterval(recTimer);
    recording?.cancel();
    recording = null;
  }

  async function record(): Promise<void> {
    reset();
    error.textContent = '';
    const id = job;
    show('rec');
    recStatus.textContent = 'Pedindo acesso ao microfone…';
    recTime.textContent = '0:00';
    recMeter.style.width = '0';
    recStop.disabled = true;
    try {
      const r = await startRecording((level) => {
        // −60 dB … 0 dB → 0 … 100%
        const db = 20 * Math.log10(level || 1e-6);
        recMeter.style.width = `${Math.max(0, Math.min(1, (db + 60) / 60)) * 100}%`;
        recMeter.classList.toggle('hot', level > 0.7);
      });
      if (id !== job || !dialog.open) return r.cancel();
      recording = r;
    } catch (err) {
      if (id !== job) return;
      show('pick');
      error.textContent = RECORD_ERRORS[err instanceof RecordError ? err.reason : 'failed'];
      return;
    }
    recStart = performance.now();
    recStatus.textContent = 'Gravando';
    recStop.disabled = false;
    recStop.focus();
    recTimer = setInterval(() => {
      const s = (performance.now() - recStart) / 1000;
      recTime.textContent = formatTime(s);
      if (s >= MAX_SECONDS) stopRecording();
    }, 250);
  }

  async function stopRecording(): Promise<void> {
    const r = recording;
    if (!r) return;
    recording = null;
    clearInterval(recTimer);
    const seconds = (performance.now() - recStart) / 1000;
    const id = job;
    recStop.disabled = true;
    recStatus.textContent = 'Finalizando…';
    const file = await r.stop();
    if (id !== job) return; // diálogo fechado ou gravação descartada enquanto finalizava
    if (seconds < MIN_RECORD_SECONDS || !file.size) {
      show('pick');
      error.textContent = `Gravação curta demais: grave pelo menos ${MIN_RECORD_SECONDS} segundos.`;
      return;
    }
    analyze(file);
  }

  /* ---------- Revisão ---------- */
  function select(i: number): void {
    if (!result) return;
    selected = i;
    audio.currentTime = result.segments[i].start;
    update();
  }

  /** Acordes que vão para a trilha, conforme o trecho e o modo escolhidos. */
  function trailChords(): SavedChord[] {
    if (!result) return [];
    const { segments, beats, bpm } = result;
    const [r0, r1] = range;
    const mode = qs<HTMLInputElement>(dialog, '[name="ai-mode"]:checked').value;
    const ids: string[] = [];
    if (mode === 'changes') {
      segments.forEach((s) => {
        if (s.id && s.end > r0 && s.start < r1 && s.id !== ids.at(-1)) ids.push(s.id);
      });
    } else {
      // a trilha toca 2 tempos por acorde no bpm salvo: cada acorde cobre o mesmo tempo da música
      const saved = Number(bpmInput.value) || foldBpm(bpm);
      const step = Math.max(1, Math.round((2 * bpm) / saved));
      let seg = 0;
      const first = beats.findIndex((t) => t >= r0 - 0.05);
      for (let b = Math.max(0, first); b < beats.length - 1; b += step) {
        if (beats[b] >= r1) break;
        while (seg < segments.length - 1 && segments[seg].beatEnd <= b) seg++;
        const id = segments[seg].id;
        if (id) ids.push(id);
      }
    }
    return ids.map((id) => {
      const c = chordById[id];
      return { id, name: c.name, fn: numeral(c, result!.key) };
    });
  }

  function update(): void {
    if (!result) return;
    const { segments, duration } = result;
    timeline.render(segments, selected, range, duration);
    rangeLabel.textContent = `${formatTime(range[0])} – ${formatTime(range[1])}`;

    const s = segments[selected];
    detail.innerHTML = s
      ? `<span class="ai-lbl">${formatTime(s.start)}–${formatTime(s.end)}</span>
         <b class="ai-cur">${escapeHtml(s.name)}</b>
         <span class="ai-alt-l">trocar por</span>
         ${s.alternatives
           .map((a) => `<button class="btn" type="button" data-alt="${a.id}">${escapeHtml(a.name)}</button>`)
           .join('')}
         <button class="btn" type="button" data-alt="">Sem acorde</button>`
      : '<span class="ai-hint">Clique num bloco para ouvir aquele trecho e trocar o acorde por outra leitura provável.</span>';

    const n = trailChords().length;
    const over = n > MAX_SAVED;
    count.textContent = over ? `${n} acordes: o máximo é ${MAX_SAVED}. Reduza o trecho ou use “Só as mudanças”.` : `${n} acordes`;
    count.classList.toggle('over', over);
    createBtn.disabled = over || n === 0;
  }

  detail.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-alt]');
    const s = result?.segments[selected];
    if (!b || !s) return;
    const alt = b.dataset.alt || null;
    // a leitura atual vira alternativa, para poder voltar atrás
    const previous = s.id ? { id: s.id, name: s.name } : null;
    s.alternatives = s.alternatives.filter((a) => a.id !== alt);
    if (previous) s.alternatives.unshift(previous);
    s.alternatives = s.alternatives.slice(0, 4);
    s.id = alt;
    s.name = alt ? chordById[alt].name : '—';
    update();
  });

  qs(dialog, '[data-action="start"]').addEventListener('click', () => {
    range = [Math.min(audio.currentTime, range[1] - 1), range[1]];
    update();
  });
  qs(dialog, '[data-action="end"]').addEventListener('click', () => {
    range = [range[0], Math.max(audio.currentTime, range[0] + 1)];
    update();
  });
  qs(dialog, '[data-action="all"]').addEventListener('click', () => {
    if (result) range = [0, result.duration];
    update();
  });
  dialog.querySelectorAll('[name="ai-mode"]').forEach((r) => r.addEventListener('change', update));
  bpmInput.addEventListener('input', update);
  bpmInput.addEventListener('change', () => {
    bpmInput.value = String(Math.min(160, Math.max(50, Math.round(Number(bpmInput.value) || 84))));
    update();
  });

  createBtn.addEventListener('click', () => {
    if (!result) return;
    const chords = trailChords();
    if (!chords.length || chords.length > MAX_SAVED) return;
    if (isDirty() && !confirm(`Descartar as alterações não salvas em "${editingSaved()!.name}"?`)) return;
    createFromChords(nameInput.value, chords, { key: result.key, bpm: Number(bpmInput.value) || foldBpm(result.bpm) });
    dialog.close();
  });
  qs(dialog, '[data-action="other"]').addEventListener('click', () => {
    reset();
    fileInput.click();
  });
  qs(dialog, '[data-action="cancel"]').addEventListener('click', reset);
  const recordBtn = qs<HTMLButtonElement>(dialog, '[data-action="record"]');
  recordBtn.hidden = !canRecord();
  recordBtn.addEventListener('click', record);
  recStop.addEventListener('click', stopRecording);
  qs(dialog, '[data-action="rec-cancel"]').addEventListener('click', reset);

  /* ---------- Entrada do arquivo ---------- */
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    fileInput.value = '';
    if (f) analyze(f);
  });
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const f = e.dataTransfer?.files[0];
    if (f) analyze(f);
  });

  /* ---------- Abrir / fechar ---------- */
  qs(dialog, '.lib-x').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  // fechar mantém o resultado para revisar depois; só para o áudio (e descarta uma gravação em curso)
  dialog.addEventListener('close', () => {
    audio.pause();
    if (!rec.hidden) reset();
  });
  bus.on('audio-import', ({ record: now }) => {
    if (!dialog.open) dialog.showModal();
    if (now && canRecord() && !recording) record();
  });

  document.body.appendChild(dialog);
}
