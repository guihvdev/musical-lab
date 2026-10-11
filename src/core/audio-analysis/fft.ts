/** FFT complexa radix-2 iterativa; `magnitudes` devolve |X[k]| de um quadro real já janelado. */
export class FFT {
  private readonly rev: Uint32Array;
  private readonly cos: Float64Array;
  private readonly sin: Float64Array;
  private readonly re: Float64Array;
  private readonly im: Float64Array;
  readonly size: number;

  constructor(size: number) {
    this.size = size;
    if (size & (size - 1)) throw new Error('FFT: tamanho precisa ser potência de 2');
    const bits = Math.log2(size);
    this.rev = new Uint32Array(size);
    for (let i = 0; i < size; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.rev[i] = r;
    }
    this.cos = new Float64Array(size / 2);
    this.sin = new Float64Array(size / 2);
    for (let i = 0; i < size / 2; i++) {
      this.cos[i] = Math.cos((-2 * Math.PI * i) / size);
      this.sin[i] = Math.sin((-2 * Math.PI * i) / size);
    }
    this.re = new Float64Array(size);
    this.im = new Float64Array(size);
  }

  /** |X[k]| para k = 0 … size/2, escritos em `out`. */
  magnitudes(frame: ArrayLike<number>, out: Float32Array): void {
    const { size: n, rev, re, im, cos, sin } = this;
    for (let i = 0; i < n; i++) {
      re[rev[i]] = frame[i];
      im[rev[i]] = 0;
    }
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const step = n / len;
      for (let i = 0; i < n; i += len) {
        for (let j = 0; j < half; j++) {
          const wr = cos[j * step];
          const wi = sin[j * step];
          const a = i + j;
          const b = a + half;
          const xr = re[b] * wr - im[b] * wi;
          const xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr;
          im[b] = im[a] - xi;
          re[a] += xr;
          im[a] += xi;
        }
      }
    }
    for (let k = 0; k <= n / 2; k++) out[k] = Math.hypot(re[k], im[k]);
  }
}

export function hann(size: number): Float64Array {
  const w = new Float64Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size);
  return w;
}

/** Espectrograma de magnitude: `frames` quadros × `bins` (até `maxBin`), em linha. */
export interface Spectrogram {
  data: Float32Array;
  frames: number;
  bins: number;
  hop: number;
  size: number;
}

export function stft(samples: Float32Array, size: number, hop: number, maxBin = size / 2): Spectrogram {
  const fft = new FFT(size);
  const win = hann(size);
  const frames = Math.max(1, Math.floor((samples.length - size) / hop) + 1);
  const bins = maxBin + 1;
  const data = new Float32Array(frames * bins);
  const frame = new Float64Array(size);
  const mags = new Float32Array(size / 2 + 1);
  for (let f = 0; f < frames; f++) {
    const off = f * hop;
    for (let i = 0; i < size; i++) frame[i] = (samples[off + i] ?? 0) * win[i];
    fft.magnitudes(frame, mags);
    data.set(mags.subarray(0, bins), f * bins);
  }
  return { data, frames, bins, hop, size };
}
