/* Roda a análise fora da thread principal: recebe as amostras mono e devolve as etapas e o resultado. */
import { analyzeAudio, type AnalysisStage, type AudioAnalysis } from '@/core/audio-analysis';

export type WorkerMessage =
  | { type: 'stage'; stage: AnalysisStage }
  | { type: 'done'; result: AudioAnalysis }
  | { type: 'error'; message: string };

const scope = self as unknown as {
  onmessage: (e: MessageEvent<Float32Array>) => void;
  postMessage: (m: WorkerMessage) => void;
};

scope.onmessage = (e) => {
  try {
    const result = analyzeAudio(e.data, (stage) => scope.postMessage({ type: 'stage', stage }));
    scope.postMessage({ type: 'done', result });
  } catch (err) {
    scope.postMessage({ type: 'error', message: String(err) });
  }
};
