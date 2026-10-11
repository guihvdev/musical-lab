import { SAMPLE_RATE } from '@/core/audio-analysis';

/** Duração máxima aceita (a análise e a linha do tempo ficam pesadas além disso). */
export const MAX_SECONDS = 12 * 60;

/**
 * Decodifica o arquivo e o reamostra para mono a `SAMPLE_RATE` Hz renderizando num OfflineAudioContext
 * (o destino de 1 canal já soma os canais).
 */
export async function decodeToMono(file: File): Promise<{ samples: Float32Array; duration: number }> {
  const data = await file.arrayBuffer();
  const audio = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(data);
  if (audio.duration > MAX_SECONDS) throw new RangeError('longo');
  const ctx = new OfflineAudioContext(1, Math.ceil(audio.duration * SAMPLE_RATE), SAMPLE_RATE);
  const src = ctx.createBufferSource();
  src.buffer = audio;
  src.connect(ctx.destination);
  src.start();
  const rendered = await ctx.startRendering();
  return { samples: rendered.getChannelData(0), duration: audio.duration };
}
