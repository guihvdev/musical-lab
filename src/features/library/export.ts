/* Arquivos para baixar uma progressão salva: MIDI (voicings conduzidos), cifra em texto e JSON reimportável. */
import { bassOf, chordById, keyNames, voice } from '@/core/harmony';
import { ensureChord, type SavedProgression } from '@/core/store';
import { findMode } from '@/core/study';

const APP = 'teia-harmonica';

/** Nome de arquivo sem acentos nem espaços: "Blues em F (cópia)" → "blues-em-f-copia". */
const slug = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'progressao';

function download(filename: string, data: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Acordes que existem no registro (recriando os de vocabulário). */
const playable = (p: SavedProgression) => p.chords.filter((c) => ensureChord(c.id, c.name));

/** "C / Am · Blues (Mixolídio)" */
export function contextLabel(p: SavedProgression): string {
  const { major, relative } = keyNames(p.key);
  const mode = findMode(p.studyId);
  const variant = mode?.variants?.find((v) => v.id === p.variantId);
  const study = mode ? ` · ${mode.name}${variant && mode.variants!.length > 1 ? ` (${variant.name})` : ''}` : '';
  return `${major} / ${relative}${study}`;
}

/* ---------- MIDI ---------- */

const PPQ = 480;
/** Dois tempos por acorde, como na reprodução da trilha. */
const CHORD_TICKS = PPQ * 2;

/** Quantidade de comprimento variável do SMF. */
function vlq(n: number): number[] {
  const bytes = [n & 0x7f];
  while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
  return bytes;
}

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const ascii = (s: string) => [...s].map((ch) => ch.charCodeAt(0));

/** SMF formato 0: baixo + voicing com condução de vozes, um acorde a cada dois tempos. */
function toMidi(p: SavedProgression): Uint8Array {
  const tempo = Math.round(60_000_000 / p.bpm);
  const name = ascii(slug(p.name));
  const ev: number[] = [
    0, 0xff, 0x03, ...vlq(name.length), ...name,
    0, 0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255,
    0, 0xff, 0x58, 4, 4, 2, 24, 8,
    0, 0xc0, 0,
  ];
  let voicing: number[] | null = null;
  playable(p).forEach(({ id }) => {
    const c = chordById[id];
    voicing = voice(c, voicing);
    const notes = [...new Set([bassOf(c), ...voicing])];
    notes.forEach((n, i) => ev.push(0, 0x90, n, i ? 78 : 92));
    notes.forEach((n, i) => ev.push(...vlq(i ? 0 : CHORD_TICKS), 0x80, n, 0));
  });
  ev.push(0, 0xff, 0x2f, 0);
  return new Uint8Array([
    ...ascii('MThd'), ...u32(6), 0, 0, 0, 1, PPQ >> 8, PPQ & 255,
    ...ascii('MTrk'), ...u32(ev.length), ...ev,
  ]);
}

/* ---------- Texto ---------- */

/** Cifra em compassos de quatro acordes, com a função embaixo de cada um. */
function toText(p: SavedProgression): string {
  const chords = playable(p);
  const width = Math.max(4, ...chords.map((c) => Math.max(c.name.length, c.fn.length))) + 2;
  const cell = (s: string) => ` ${s.padEnd(width - 1)}`;
  const rows: string[] = [];
  for (let i = 0; i < chords.length; i += 4) {
    const bar = chords.slice(i, i + 4);
    rows.push('|' + bar.map((c) => cell(c.name)).join('|') + '|');
    rows.push('|' + bar.map((c) => cell(c.fn)).join('|') + '|');
    rows.push('');
  }
  return [
    p.name,
    `Tom: ${contextLabel(p)} · ${p.bpm} bpm · ${chords.length} acordes`,
    '',
    ...(rows.length ? rows : ['(sem acordes)', '']),
    `Teia Harmônica · ${new Date(p.updatedAt).toLocaleDateString('pt-BR')}`,
    '',
  ].join('\n');
}

/* ---------- JSON ---------- */

const toJSON = (progressions: SavedProgression[]) =>
  JSON.stringify({ app: APP, version: 1, progressions }, null, 2);

export type ExportFormat = 'mid' | 'txt' | 'json';

export function downloadSaved(p: SavedProgression, format: ExportFormat): void {
  const base = slug(p.name);
  if (format === 'mid') download(`${base}.mid`, toMidi(p) as Uint8Array<ArrayBuffer>, 'audio/midi');
  else if (format === 'txt') download(`${base}.txt`, toText(p), 'text/plain;charset=utf-8');
  else download(`${base}.json`, toJSON([p]), 'application/json');
}

/** Toda a biblioteca em um JSON (backup). */
export function downloadLibrary(library: SavedProgression[]): void {
  download(`progressoes-${new Date().toISOString().slice(0, 10)}.json`, toJSON(library), 'application/json');
}
