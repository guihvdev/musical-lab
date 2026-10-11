/* Gravação pelo microfone (MediaRecorder), com nível de entrada para o medidor. */

/** Formatos em ordem de preferência; o navegador escolhe o primeiro que grava (Safari: mp4). */
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];
const EXT: Record<string, string> = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a' };

export interface Recording {
  /** Para e devolve o arquivo gravado. */
  stop(): Promise<File>;
  /** Para e descarta. */
  cancel(): void;
}

export type RecordFailure = 'unsupported' | 'denied' | 'no-device' | 'failed';

export class RecordError extends Error {
  readonly reason: RecordFailure;
  constructor(reason: RecordFailure) {
    super(reason);
    this.reason = reason;
  }
}

export const canRecord = () => !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

const fileName = (ext: string) => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `gravacao-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}h${pad(d.getMinutes())}.${ext}`;
};

/**
 * Começa a gravar. `onLevel` recebe o nível RMS (0–1) a cada quadro de animação.
 * Sem cancelamento de eco, supressão de ruído ou ganho automático: eles deformam música.
 */
export async function startRecording(onLevel: (level: number) => void): Promise<Recording> {
  if (!canRecord()) throw new RecordError('unsupported');
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch (err) {
    const name = (err as DOMException)?.name;
    throw new RecordError(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'no-device' : 'failed');
  }

  const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.addEventListener('dataavailable', (e) => e.data.size && chunks.push(e.data));

  // medidor de nível
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  let raf = 0;
  const meter = () => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    onLevel(Math.sqrt(sum / buf.length));
    raf = requestAnimationFrame(meter);
  };
  meter();

  const release = () => {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    ctx.close();
  };

  recorder.start(1000);

  return {
    stop: () =>
      new Promise<File>((resolve) => {
        recorder.addEventListener(
          'stop',
          () => {
            release();
            const type = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
            resolve(new File(chunks, fileName(EXT[type] ?? 'webm'), { type }));
          },
          { once: true },
        );
        recorder.stop();
      }),
    cancel: () => {
      if (recorder.state !== 'inactive') recorder.stop();
      release();
    },
  };
}
