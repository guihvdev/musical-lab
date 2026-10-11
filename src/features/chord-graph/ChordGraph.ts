import './chord-graph.css';
import {
  KIND_COLOR,
  TRANSITION_TYPES,
  baseGraph,
  chordById,
  keySlot,
  mod24,
  type Chord,
  type HarmonyGraph,
  type Transition,
} from '@/core/harmony';
import { bus, chordFunction, chordName, fieldKey, keyLabel, pick, state, subscribe } from '@/core/store';
import { prefersReducedMotion, svgEl } from '@/shared/dom';
import { CENTER, RING_RADIUS, chordPosition, edgePath, keyBandPath, nodeRadius, type Point } from './geometry';

interface NodeView {
  chord: Chord;
  g: SVGGElement;
  label: SVGTextElement;
  title: SVGTitleElement;
  badge: SVGGElement;
  badgeText: SVGTextElement;
  pos: Point;
}

const fontSizeFor = (c: Chord, name: string) =>
  c.ring === 0 ? (name.length > 3 ? 26 : 30) : c.ring === 3 ? (name.length > 4 ? 14 : 16) : name.length > 3 ? 21 : 24;

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
  const gStudyEdges = svgEl('g', {}, svg);
  const gCenter = svgEl('g', {}, svg);
  const ctrKey = svgEl('text', { class: 'ctr-key', x: CENTER, y: 400 }, gCenter);
  const ctrName = svgEl('text', { class: 'ctr-name', x: CENTER, y: 535 }, gCenter);
  const ctrNum = svgEl('text', { class: 'ctr-num', x: CENTER, y: 590 }, gCenter);
  const gNodes = svgEl('g', {}, svg);
  const gVocab = svgEl('g', {}, svg);

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
  svgEl('circle', { class: 'ringguide vocab', cx: CENTER, cy: CENTER, r: RING_RADIUS[3] }, gGuide);

  const edgeView = (t: Transition, parentEl: SVGGElement): [Transition, SVGPathElement] => [
    t,
    svgEl('path', { class: 'edge t-' + t.type, style: `stroke:var(--e-${t.type})` }, parentEl),
  ];

  function nodeView(c: Chord, parentEl: SVGGElement): NodeView {
    const r = nodeRadius(c);
    const g = svgEl('g', { class: `node ${c.kind}${c.ring === 3 ? ' vocab' : ''}`, tabindex: 0, role: 'button' }, parentEl);
    svgEl('circle', { class: 'halo', r: r + 6, style: `fill:var(${KIND_COLOR[c.kind]})`, filter: 'url(#glow)' }, g);
    svgEl('circle', { class: 'focus-ring', r: r + (c.ring === 3 ? 4 : 7) }, g);
    svgEl('circle', { class: 'ring', r }, g);
    const label = svgEl('text', { y: 1 }, g);
    const badge = svgEl('g', { class: 'badge', transform: `translate(${r * 0.72},${-r * 0.72})` }, g);
    badge.style.display = 'none';
    svgEl('circle', { r: c.ring === 3 ? 9 : 11 }, badge);
    const badgeText = svgEl('text', { y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, badge);
    const title = svgEl('title', {}, g);

    g.addEventListener('click', () => pick(c.id));
    g.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        pick(c.id);
      }
    });
    g.addEventListener('mouseenter', () => bus.emit('edge-focus', { to: c.id, on: true }));
    g.addEventListener('mouseleave', () => bus.emit('edge-focus', { to: c.id, on: false }));

    const view: NodeView = { chord: c, g, label, title, badge, badgeText, pos: [CENTER, CENTER] };
    setLabel(view);
    return view;
  }

  /** Nome exibido: muda com a grafia do tom do estudo (ex.: C#7 → Db7 em Db maior). */
  function setLabel(v: NodeView): void {
    const name = chordName(v.chord);
    if (v.label.textContent === name) return;
    v.label.textContent = name;
    v.label.setAttribute('font-size', String(fontSizeFor(v.chord, name)));
    v.title.textContent = name;
    v.g.setAttribute('aria-label', name);
  }

  const baseEdgeViews = baseGraph.transitions.map((t) => edgeView(t, gEdges));
  const baseNodeViews = new Map<string, NodeView>();
  baseGraph.chords.forEach((c) => baseNodeViews.set(c.id, nodeView(c, gNodes)));

  /* Parte dinâmica: anel de vocabulário e arestas do estudo, refeitos quando o grafo ativo muda */
  let shownGraph: HarmonyGraph = baseGraph;
  let vocabViews = new Map<string, NodeView>();
  let studyEdgeViews: [Transition, SVGPathElement][] = [];
  const baseTransitions = new Set(baseGraph.transitions);

  const nodeViewOf = (id: string) => baseNodeViews.get(id) ?? vocabViews.get(id);
  const allNodeViews = () => [...baseNodeViews.values(), ...vocabViews.values()];
  const allEdgeViews = () => [...baseEdgeViews, ...studyEdgeViews];

  function rebuildStudyLayer(graph: HarmonyGraph): void {
    gVocab.replaceChildren();
    gStudyEdges.replaceChildren();
    vocabViews = new Map(
      graph.chords.filter((c) => c.ring === 3).map((c) => [c.id, nodeView(c, gVocab)] as [string, NodeView]),
    );
    studyEdgeViews = graph.transitions.filter((t) => !baseTransitions.has(t)).map((t) => edgeView(t, gStudyEdges));
    baseNodeViews.forEach(setLabel);
    vocabViews.forEach(setLabel);
    svg.classList.toggle('has-vocab', vocabViews.size > 0);
  }

  /* ---------- Layout e rotação ---------- */
  let rotation = keySlot(fieldKey()) + 0.5;
  let shownField = fieldKey();
  let anim = 0;

  function layout(): void {
    allNodeViews().forEach((v) => {
      v.pos = chordPosition(v.chord, rotation);
      v.g.setAttribute('transform', `translate(${v.pos[0].toFixed(1)},${v.pos[1].toFixed(1)})`);
    });
    allEdgeViews().forEach(([t, path]) => {
      const a = nodeViewOf(t.from)!;
      const b = nodeViewOf(t.to)!;
      path.setAttribute('d', edgePath(a.chord, a.pos, b.chord, b.pos));
    });
    band.setAttribute('d', keyBandPath(keySlot(fieldKey()), rotation));
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
    const hit = allEdgeViews().find(([t]) => t.from === state.current && t.to === to);
    hit?.[1].classList.toggle('focus', on);
  });

  subscribe((s) => {
    const field = fieldKey();
    if (s.graph !== shownGraph) {
      shownGraph = s.graph;
      rebuildStudyLayer(s.graph);
      layout();
    }
    if (field !== shownField) {
      shownField = field;
      rotateTo(keySlot(field) + 0.5);
    }

    const cur = s.current ? chordById[s.current] : null;
    svg.classList.toggle('has-cur', !!cur);

    const suggIndex = new Map(s.suggestions.map((sg, i) => [sg.chord.id, i]));
    allNodeViews().forEach((v) => {
      const id = v.chord.id;
      v.g.classList.toggle('cur', id === s.current);
      v.g.classList.toggle('sugg', suggIndex.has(id));
      v.g.classList.toggle('focus', !!s.study?.focus.has(id));
      const i = suggIndex.get(id);
      if (i !== undefined && i < 9) {
        v.badge.style.display = '';
        v.badgeText.textContent = String(i + 1);
      } else v.badge.style.display = 'none';
    });

    allEdgeViews().forEach(([t, path]) => {
      const visible = s.layers[t.type];
      const hot = t.from === s.current && visible;
      path.classList.toggle('off', !visible);
      path.classList.toggle('hot', hot);
      path.classList.remove('focus');
      if (hot) path.setAttribute('marker-end', `url(#ar-${t.type})`);
      else path.removeAttribute('marker-end');
    });

    ctrKey.textContent = keyLabel();
    ctrName.textContent = cur ? chordName(cur) : '';
    ctrNum.textContent = cur ? chordFunction(cur) : '';
  });

  layout();
}
