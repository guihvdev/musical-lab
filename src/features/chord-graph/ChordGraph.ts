import './chord-graph.css';
import {
  KIND_COLOR,
  TRANSITION_TYPES,
  chordById,
  chords,
  keyNames,
  keySlot,
  mod24,
  numeral,
  transitions,
  type Chord,
  type Transition,
} from '@/core/harmony';
import { bus, pick, state, subscribe } from '@/core/store';
import { prefersReducedMotion, svgEl } from '@/shared/dom';
import {
  CENTER,
  NODE_RADIUS,
  RING_RADIUS,
  chordPosition,
  edgePath,
  keyBandPath,
  type Point,
} from './geometry';

interface NodeView {
  chord: Chord;
  g: SVGGElement;
  badge: SVGGElement;
  badgeText: SVGTextElement;
  pos: Point;
}

/** Grafo circular de acordes e transições. */
export function mountChordGraph(parent: Node): void {
  const svg = svgEl('svg', {
    class: 'graph',
    viewBox: '0 0 1000 1000',
    role: 'img',
    'aria-label': 'Grafo circular de acordes e transições',
  }, parent);
  const defs = svgEl('defs', {}, svg);
  const gGuide = svgEl('g', {}, svg);
  const band = svgEl('path', { class: 'band' }, svg);
  const gEdges = svgEl('g', {}, svg);
  const gCenter = svgEl('g', {}, svg);
  const ctrKey = svgEl('text', { class: 'ctr-key', x: CENTER, y: 400 }, gCenter);
  const ctrName = svgEl('text', { class: 'ctr-name', x: CENTER, y: 535 }, gCenter);
  const ctrNum = svgEl('text', { class: 'ctr-num', x: CENTER, y: 590 }, gCenter);
  const gNodes = svgEl('g', {}, svg);

  /* Marcadores de seta por tipo de transição e brilho do nó atual */
  TRANSITION_TYPES.forEach((t) => {
    const m = svgEl('marker', {
      id: 'ar-' + t.k,
      viewBox: '0 0 10 10',
      refX: 8,
      refY: 5,
      markerWidth: 7,
      markerHeight: 7,
      orient: 'auto-start-reverse',
    }, defs);
    svgEl('path', { d: 'M0,1 L9,5 L0,9 z', style: `fill:var(--e-${t.k})` }, m);
  });
  const glow = svgEl('filter', { id: 'glow', x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
  svgEl('feGaussianBlur', { stdDeviation: 10 }, glow);

  ([0, 1, 2] as const).forEach((r) =>
    svgEl('circle', { class: 'ringguide', cx: CENTER, cy: CENTER, r: RING_RADIUS[r] }, gGuide),
  );

  const edgeViews: [Transition, SVGPathElement][] = transitions.map((t) => [
    t,
    svgEl('path', { class: 'edge t-' + t.type, style: `stroke:var(--e-${t.type})` }, gEdges),
  ]);

  const nodeViews = new Map<string, NodeView>();
  chords.forEach((c) => {
    const r = NODE_RADIUS[c.kind];
    const g = svgEl('g', { class: 'node ' + c.kind, tabindex: 0, role: 'button', 'aria-label': c.name }, gNodes);
    svgEl('circle', { class: 'halo', r: r + 6, style: `fill:var(${KIND_COLOR[c.kind]})`, filter: 'url(#glow)' }, g);
    svgEl('circle', { class: 'ring', r }, g);
    const fontSize = c.ring === 0 ? (c.name.length > 3 ? 26 : 30) : c.name.length > 3 ? 21 : 24;
    svgEl('text', { y: 1, 'font-size': fontSize }, g).textContent = c.name;
    const badge = svgEl('g', { class: 'badge', transform: `translate(${r * 0.72},${-r * 0.72})` }, g);
    badge.style.display = 'none';
    svgEl('circle', { r: 11 }, badge);
    const badgeText = svgEl('text', { y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, badge);
    svgEl('title', {}, g).textContent = c.name;

    g.addEventListener('click', () => pick(c.id));
    g.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        pick(c.id);
      }
    });
    g.addEventListener('mouseenter', () => bus.emit('edge-focus', { to: c.id, on: true }));
    g.addEventListener('mouseleave', () => bus.emit('edge-focus', { to: c.id, on: false }));

    nodeViews.set(c.id, { chord: c, g, badge, badgeText, pos: [CENTER, CENTER] });
  });

  /* ---------- Layout e rotação ---------- */
  let rotation = keySlot(state.key) + 0.5;
  let shownKey = state.key;
  let anim = 0;

  function layout(): void {
    nodeViews.forEach((v) => {
      v.pos = chordPosition(v.chord, rotation);
      v.g.setAttribute('transform', `translate(${v.pos[0].toFixed(1)},${v.pos[1].toFixed(1)})`);
    });
    edgeViews.forEach(([t, path]) => {
      const a = nodeViews.get(t.from)!;
      const b = nodeViews.get(t.to)!;
      path.setAttribute('d', edgePath(a.chord, a.pos, b.chord, b.pos));
    });
    band.setAttribute('d', keyBandPath(keySlot(state.key), rotation));
  }

  /** Gira o anel pelo caminho mais curto até `target` no topo. */
  function rotateTo(target: number): void {
    const from = rotation;
    let d = mod24(target - from);
    if (d > 12) d -= 24;
    if (prefersReducedMotion() || Math.abs(d) < 0.01) {
      rotation = target;
      layout();
      return;
    }
    const t0 = performance.now();
    const dur = 650;
    cancelAnimationFrame(anim);
    const step = (t: number) => {
      const u = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - u, 3);
      rotation = from + d * e;
      layout();
      if (u < 1) anim = requestAnimationFrame(step);
      else rotation = mod24(target);
    };
    anim = requestAnimationFrame(step);
  }

  /* ---------- Render ---------- */
  bus.on('edge-focus', ({ to, on }) => {
    if (!state.current) return;
    const hit = edgeViews.find(([t]) => t.from === state.current && t.to === to);
    hit?.[1].classList.toggle('focus', on);
  });

  subscribe((s) => {
    if (s.key !== shownKey) {
      shownKey = s.key;
      rotateTo(keySlot(s.key) + 0.5);
    }

    const cur = s.current ? chordById[s.current] : null;
    svg.classList.toggle('has-cur', !!cur);

    const suggIndex = new Map(s.suggestions.map((sg, i) => [sg.chord.id, i]));
    nodeViews.forEach((v, id) => {
      v.g.classList.toggle('cur', id === s.current);
      v.g.classList.toggle('sugg', suggIndex.has(id));
      const i = suggIndex.get(id);
      if (i !== undefined && i < 9) {
        v.badge.style.display = '';
        v.badgeText.textContent = String(i + 1);
      } else v.badge.style.display = 'none';
    });

    edgeViews.forEach(([t, path]) => {
      const visible = s.layers[t.type];
      const hot = t.from === s.current && visible;
      path.classList.toggle('off', !visible);
      path.classList.toggle('hot', hot);
      path.classList.remove('focus');
      if (hot) path.setAttribute('marker-end', `url(#ar-${t.type})`);
      else path.removeAttribute('marker-end');
    });

    const { major, relative } = keyNames(s.key);
    ctrKey.textContent = `Tom de ${major} · ${relative}`;
    ctrName.textContent = cur ? cur.name : '';
    ctrNum.textContent = cur ? numeral(cur, s.key) : '';
  });

  layout();
}
