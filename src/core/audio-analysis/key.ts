/* Tom pelo perfil de Krumhansl–Kessler sobre o croma médio da música. */

const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function correlation(a: ArrayLike<number>, b: ArrayLike<number>, shift: number): number {
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < 12; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= 12;
  mb /= 12;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < 12; i++) {
    const x = a[(i + shift) % 12] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

export interface KeyEstimate {
  /** Tônica maior (convenção de `state.key`): um tom menor vira o relativo maior. */
  key: number;
  tonic: number;
  minor: boolean;
}

export function estimateKey(profile: ArrayLike<number>): KeyEstimate {
  let best = { score: -Infinity, tonic: 0, minor: false };
  for (let r = 0; r < 12; r++) {
    const maj = correlation(profile, MAJOR, r);
    const min = correlation(profile, MINOR, r);
    if (maj > best.score) best = { score: maj, tonic: r, minor: false };
    if (min > best.score) best = { score: min, tonic: r, minor: true };
  }
  return { key: best.minor ? (best.tonic + 3) % 12 : best.tonic, tonic: best.tonic, minor: best.minor };
}
