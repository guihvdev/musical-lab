export const SVG_NS = 'http://www.w3.org/2000/svg';

type Attrs = Record<string, string | number>;

/** Cria um elemento SVG com atributos e, opcionalmente, o anexa a `parent`. */
export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  parent?: Node,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

/** Converte um trecho de markup estático em um elemento. */
export function html<T extends Element = HTMLElement>(markup: string): T {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as T;
}

/** querySelector que falha alto se o elemento não existir. */
export function qs<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const e = root.querySelector<T>(selector);
  if (!e) throw new Error(`Elemento não encontrado: ${selector}`);
  return e;
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
