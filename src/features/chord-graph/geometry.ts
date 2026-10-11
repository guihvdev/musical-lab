import type { Chord, ChordKind } from '@/core/harmony';

export const CENTER = 500;
export const RING_RADIUS: Record<Chord['ring'], number> = { 0: 440, 1: 342, 2: 250, 3: 192 };
export const NODE_RADIUS: Record<ChordKind, number> = { maj: 36, min: 36, dom: 29, dim: 27 };
/** Raio dos nós do anel de vocabulário (espaçados de 18°, ver layoutVocabulary). */
const VOCAB_RADIUS = 23;

export const nodeRadius = (c: Chord) => (c.ring === 3 ? VOCAB_RADIUS : NODE_RADIUS[c.kind]);

export type Point = [number, number];

/** Ângulo (rad) de um slot com `rotation` no topo; cada slot vale 15°. */
export const angle = (slot: number, rotation: number) => (((slot - rotation) * 15 - 90) * Math.PI) / 180;

export function chordPosition(c: Chord, rotation: number): Point {
  const a = angle(c.slot, rotation);
  const r = RING_RADIUS[c.ring];
  return [CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)];
}

const f = (n: number) => n.toFixed(1);

/** Curva quadrática puxada para o centro e levemente deslocada para separar ida e volta. */
export function edgePath(a: Chord, pa: Point, b: Chord, pb: Point): string {
  const [x0, y0] = pa;
  const [x1, y1] = pb;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L = Math.hypot(dx, dy) || 1;
  let cx = mx + (CENTER - mx) * 0.32;
  let cy = my + (CENTER - my) * 0.32;
  cx += (-dy / L) * 10;
  cy += (dx / L) * 10;

  // recua as pontas até a borda de cada nó
  const shrink = (px: number, py: number, r: number): Point => {
    const vx = cx - px;
    const vy = cy - py;
    const l = Math.hypot(vx, vy) || 1;
    return [px + (vx / l) * r, py + (vy / l) * r];
  };
  const [sx, sy] = shrink(x0, y0, nodeRadius(a) + 2);
  const [ex, ey] = shrink(x1, y1, nodeRadius(b) + 5);
  return `M${f(sx)},${f(sy)} Q${f(cx)},${f(cy)} ${f(ex)},${f(ey)}`;
}

/** Faixa anular que cobre as 6 posições do campo harmônico. */
export function keyBandPath(keySlot: number, rotation: number): string {
  const a0 = angle(keySlot - 2.5, rotation);
  const a1 = angle(keySlot + 3.5, rotation);
  const R1 = RING_RADIUS[0] + 46;
  const R0 = RING_RADIUS[0] - 46;
  const P = (r: number, a: number) => `${f(CENTER + r * Math.cos(a))},${f(CENTER + r * Math.sin(a))}`;
  return `M${P(R1, a0)} A${R1},${R1} 0 0 1 ${P(R1, a1)} L${P(R0, a1)} A${R0},${R0} 0 0 0 ${P(R0, a0)} Z`;
}
