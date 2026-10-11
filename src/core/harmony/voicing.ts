import type { Chord } from './chords';

/**
 * Escolhe a inversão (notas MIDI entre G3 e G5) com menor movimento em relação ao voicing anterior;
 * sem anterior, a mais próxima do C4.
 */
export function voice(c: Chord, prev: number[] | null): number[] {
  const pcs = c.pcs;
  const candidates: number[][] = [];
  for (let k = 0; k < pcs.length; k++) {
    const rot = pcs.slice(k).concat(pcs.slice(0, k));
    for (let base = 48; base <= 60; base += 12) {
      const notes: number[] = [];
      let last = -1;
      rot.forEach((pc) => {
        let m = base + pc;
        while (m <= last) m += 12;
        if (!notes.length) while (m < 55) m += 12;
        notes.push(m);
        last = m;
      });
      if (notes[0] >= 55 && notes[notes.length - 1] <= 79) candidates.push(notes);
    }
  }

  let best: number[] | null = null;
  let bestCost = 1e9;
  for (const cand of candidates) {
    const cost = prev
      ? cand.reduce((s, m) => s + Math.min(...prev.map((p) => Math.abs(p - m))), 0) +
        prev.reduce((s, p) => s + Math.min(...cand.map((m) => Math.abs(p - m))), 0) * 0.5
      : Math.abs(cand[0] - 60);
    if (cost < bestCost) {
      bestCost = cost;
      best = cand;
    }
  }
  return best ?? pcs.map((p) => 60 + p);
}

/** Baixo na fundamental, entre E2 e D#3. */
export const bassOf = (c: Chord) => 40 + ((c.root - 4 + 12) % 12);
