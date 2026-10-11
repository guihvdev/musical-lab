import { KIND_COLOR, chordById } from '@/core/harmony';
import type { ChordSegment } from '@/core/audio-analysis';
import { escapeHtml } from '@/shared/dom';

/** Pixels por segundo da faixa. */
const PPS = 26;
const RULER_STEP = 10;

export const formatTime = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export interface TimelineView {
  /** Redesenha os blocos, a seleção e o trecho escolhido. */
  render(segments: ChordSegment[], selected: number, range: [number, number], duration: number): void;
  destroy(): void;
}

/**
 * Faixa horizontal rolável com um bloco por trecho (cor do tipo de acorde, largura ∝ duração) e o cursor do
 * `<audio>`, que acompanha a reprodução e rola junto. Clicar num bloco chama `onSelect`.
 */
export function createTimeline(scroller: HTMLElement, audio: HTMLAudioElement, onSelect: (i: number) => void): TimelineView {
  scroller.innerHTML = `
    <div class="ai-track">
      <div class="ai-ruler"></div>
      <div class="ai-blocks"></div>
      <div class="ai-shade l"></div><div class="ai-shade r"></div>
      <div class="ai-head"></div>
    </div>`;
  const track = scroller.querySelector<HTMLElement>('.ai-track')!;
  const ruler = scroller.querySelector<HTMLElement>('.ai-ruler')!;
  const blocks = scroller.querySelector<HTMLElement>('.ai-blocks')!;
  const [shadeL, shadeR] = scroller.querySelectorAll<HTMLElement>('.ai-shade');
  const head = scroller.querySelector<HTMLElement>('.ai-head')!;

  blocks.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-i]');
    if (b) onSelect(Number(b.dataset.i));
  });

  let raf = 0;
  const moveHead = () => {
    const x = audio.currentTime * PPS;
    head.style.transform = `translateX(${x}px)`;
    // durante a reprodução, mantém o cursor à vista
    if (!audio.paused && (x < scroller.scrollLeft + 40 || x > scroller.scrollLeft + scroller.clientWidth - 80)) {
      scroller.scrollLeft = x - 60;
    }
  };
  const loop = () => {
    moveHead();
    if (!audio.paused) raf = requestAnimationFrame(loop);
  };
  const onPlay = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  };
  audio.addEventListener('play', onPlay);
  audio.addEventListener('seeked', moveHead);
  audio.addEventListener('timeupdate', moveHead);

  return {
    render(segments, selected, [r0, r1], duration) {
      track.style.width = `${Math.ceil(duration * PPS)}px`;
      ruler.innerHTML = Array.from(
        { length: Math.floor(duration / RULER_STEP) + 1 },
        (_, i) => `<span style="left:${i * RULER_STEP * PPS}px">${formatTime(i * RULER_STEP)}</span>`,
      ).join('');
      blocks.innerHTML = segments
        .map((s, i) => {
          const c = s.id ? chordById[s.id] : null;
          const w = (s.end - s.start) * PPS;
          const color = c ? `var(${KIND_COLOR[c.kind]})` : 'var(--faint)';
          return `<button type="button" class="ai-block${c ? '' : ' none'}${i === selected ? ' on' : ''}" data-i="${i}"
            style="left:${s.start * PPS}px;width:${Math.max(2, w - 2)}px;--c:${color}"
            title="${escapeHtml(s.name)} · ${formatTime(s.start)}–${formatTime(s.end)}"
            aria-label="${escapeHtml(s.name)}, ${formatTime(s.start)}">${w > 22 ? escapeHtml(s.name) : ''}</button>`;
        })
        .join('');
      shadeL.style.width = `${r0 * PPS}px`;
      shadeR.style.left = `${r1 * PPS}px`;
      shadeR.style.width = `${Math.max(0, (duration - r1) * PPS)}px`;
      moveHead();
    },
    destroy() {
      cancelAnimationFrame(raf);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('seeked', moveHead);
      audio.removeEventListener('timeupdate', moveHead);
    },
  };
}
