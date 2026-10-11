import './midi.css';
import { state } from '@/core/store';
import { html, qs } from '@/shared/dom';
import { detectChord } from './detect';

const DETECT_DELAY_MS = 45;

/** Indicador de conexão MIDI; escuta as entradas e destaca os acordes tocados. */
export function mountMidiStatus(parent: Node): void {
  const root = html(`
    <div class="midi" title="Conecte um teclado MIDI para destacar os acordes que você toca">
      <i></i><span>MIDI: verificando…</span>
    </div>`);
  const label = qs(root, 'span');
  parent.appendChild(root);

  const status = (text: string, on: boolean) => {
    label.textContent = 'MIDI: ' + text;
    root.classList.toggle('on', on);
  };

  let detectTimer: ReturnType<typeof setTimeout> | undefined;
  const onMessage = (ev: MIDIMessageEvent) => {
    if (!ev.data) return;
    const [st, note, vel] = ev.data;
    const cmd = st & 0xf0;
    if (cmd === 0x90 && vel > 0) state.liveNotes.add(note);
    else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) state.liveNotes.delete(note);
    else return;
    clearTimeout(detectTimer);
    detectTimer = setTimeout(detectChord, DETECT_DELAY_MS);
  };

  try {
    if (!navigator.requestMIDIAccess) {
      status('navegador sem suporte', false);
      return;
    }
    navigator.requestMIDIAccess().then(
      (access) => {
        const bind = () => {
          let n = 0;
          access.inputs.forEach((input) => {
            n++;
            input.onmidimessage = onMessage;
          });
          const s = n > 1 ? 's' : '';
          status(n ? `${n} entrada${s} conectada${s}` : 'conecte um teclado', n > 0);
        };
        bind();
        access.onstatechange = bind;
      },
      () => status('indisponível aqui', false),
    );
  } catch {
    status('indisponível aqui', false);
  }
}
