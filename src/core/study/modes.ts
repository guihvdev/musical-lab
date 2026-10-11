/*
 * Modos de estudo. O motor (engine.ts) só interpreta estes objetos:
 * para criar um modo novo, acrescente um objeto ao array — nenhum código específico é necessário.
 */
import { SCALES } from '@/core/harmony';
import type { StudyMode } from './types';

export const STUDY_MODES: readonly StudyMode[] = [
  {
    id: 'blues-12',
    name: 'Blues de 12 compassos',
    category: 'Estilos',
    level: 'iniciante',
    description:
      'Três acordes de sétima e uma forma de 12 compassos. Decore a forma e deixe a escala blues conversar com cada mudança.',
    suggestedKey: 'F',
    layers: ['std', 'res', 'sec', 'cad'],
    vocabulary: ['I7', 'IV7', 'V7', 'ii7', 'VI7'],
    focus: ['I7', 'IV7', 'V7'],
    progressions: [
      { name: 'Blues de 12 compassos', chords: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'] },
      { name: 'Quick change', chords: ['I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'] },
      { name: 'Turnaround I–VI–ii–V', chords: ['I7', 'VI7', 'ii7', 'V7'] },
    ],
    scales: [{ scale: SCALES.bluesMinor, root: 'key' }],
    variants: [
      { id: 'blues-menor', name: 'Blues menor' },
      { id: 'penta-maior', name: 'Pentatônica maior', scales: [{ scale: SCALES.pentatonicMajor, root: 'key' }] },
    ],
    tips: [
      'Conte os 12 compassos em voz alta até a forma ficar automática.',
      'A nota blue (b5) está em azul no teclado: use-a de passagem entre a 4ª e a 5ª, nunca parada.',
      'No IV7, mire a 3ª do acorde: ela é a b7 do tom e soa muito blues.',
      'Repita uma frase curta sobre a mudança de acorde e ouça como ela ganha outra cor.',
      'Na pentatônica maior o som fica mais doce; alterne com a blues menor dentro do mesmo chorus.',
    ],
  },
  {
    id: 'jazz-ii-v-i',
    name: 'Jazz – ii–V–I',
    category: 'Estilos',
    level: 'intermediário',
    description:
      'A cadência mais importante do jazz. Sinta o ii preparar, o V criar tensão e o I resolver, e troque de escala junto com o acorde.',
    suggestedKey: 'Bb',
    layers: ['std', 'res', 'dia', 'sec', 'cad', 'tt'],
    vocabulary: ['IΔ7', 'ii7', 'iii7', 'IVΔ7', 'V7', 'vi7', 'viiø7', 'iiø7', 'V7b9', 'i7'],
    focus: ['ii7', 'V7', 'IΔ7'],
    progressions: [
      { name: 'ii–V–I maior', chords: ['ii7', 'V7', 'IΔ7', 'IΔ7'] },
      { name: 'ii–V–i menor', chords: ['iiø7', 'V7b9', 'i7', 'i7'] },
      {
        name: 'Rhythm changes (parte A)',
        chords: ['IΔ7', 'vi7', 'ii7', 'V7', 'IΔ7', 'vi7', 'ii7', 'V7', 'IΔ7', 'I7', 'IVΔ7', '#iv°7', 'IΔ7', 'VI7', 'ii7', 'V7'],
      },
    ],
    scales: [
      { on: { qualities: ['m7b5'] }, scale: SCALES.locrian, root: 'chord' },
      { on: { qualities: ['7b9'] }, scale: SCALES.diminishedHalfWhole, root: 'chord' },
      { on: { families: ['dom'] }, scale: SCALES.mixolydian, root: 'chord' },
      { on: { families: ['min'] }, scale: SCALES.dorian, root: 'chord' },
      { on: { qualities: ['dim7'] }, scale: SCALES.diminishedWholeHalf, root: 'chord' },
      { scale: SCALES.ionian, root: 'chord' },
    ],
    tips: [
      'Do ii para o V, a 7ª do ii desce meio tom e vira a 3ª do V: toque essa nota-guia.',
      'Mixolídio sobre o V7, dórico sobre o ii: é a mesma coleção de notas, mude só o alvo.',
      'Ligue o substituto trítono e experimente trocar o V7 pelo subV7 antes do I.',
      'No ii–V–i menor, a b9 do V7b9 puxa forte para a 5ª do i.',
    ],
  },
  {
    id: 'bossa-nova',
    name: 'Bossa nova',
    category: 'Estilos',
    level: 'intermediário',
    description:
      'Sétimas, nonas e treze com movimento suave entre os acordes. Toque leve e deixe as notas comuns segurarem a linha.',
    suggestedKey: 'F',
    layers: ['std', 'res', 'dia', 'sec', 'dim', 'tt'],
    vocabulary: ['IΔ7', 'ii7', 'iii7', 'IVΔ7', 'vi7', 'V9', 'V13', 'II9', 'VI7b9'],
    focus: ['IΔ7', '#I°7', 'ii7', 'V13'],
    progressions: [
      { name: 'I–#I°–ii–V', chords: ['IΔ7', '#I°7', 'ii7', 'V13'] },
      { name: 'I–II7–ii–subV (estilo Garota de Ipanema)', chords: ['IΔ7', 'IΔ7', 'II9', 'II9', 'ii7', 'bII7', 'IΔ7', 'bII7'] },
      { name: 'iii–VI–ii–V', chords: ['iii7', 'VI7b9', 'ii7', 'V9', 'IΔ7'] },
    ],
    scales: [
      { on: { functions: ['IVΔ7'] }, scale: SCALES.lydian, root: 'chord' },
      { on: { qualities: ['7b9'] }, scale: SCALES.diminishedHalfWhole, root: 'chord' },
      { on: { families: ['dom'] }, scale: SCALES.mixolydian, root: 'chord' },
      { on: { families: ['min'] }, scale: SCALES.dorian, root: 'chord' },
      { on: { qualities: ['dim7'] }, scale: SCALES.diminishedWholeHalf, root: 'chord' },
      { scale: SCALES.ionian, root: 'chord' },
    ],
    tips: [
      'O diminuto de passagem (#I°7) liga o I ao ii por semitom no baixo.',
      'Nas dominantes, mire a 9ª e a 13ª: são as cores da bossa.',
      'Mantenha as notas comuns entre os acordes e mova só o que precisa.',
      'O subV7 (bII7) desce cromaticamente até o I: ouça o baixo deslizar.',
    ],
  },
  {
    id: 'modos-gregos',
    name: 'Escalas – modos gregos',
    category: 'Escalas',
    level: 'intermediário',
    description:
      'Cada modo é a escala maior vista a partir de outra nota. Escolha o modo, ouça o campo harmônico destacado e improvise em torno da tônica marcada.',
    suggestedKey: 'C',
    layers: ['std', 'res', 'dia'],
    focus: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'viiø7'],
    progressions: [{ name: 'Vamp I–IV', chords: ['I', 'IV'] }],
    scales: [{ scale: SCALES.ionian, root: 'key' }],
    variants: [
      { id: 'jonio', name: 'Jônio', field: 'I' },
      {
        id: 'dorico',
        name: 'Dórico',
        field: 'bVII',
        focus: ['i', 'ii', 'bIII', 'IV', 'v', 'viø7', 'bVII'],
        progressions: [{ name: 'Vamp i7–IV7', chords: ['i7', 'IV7'] }],
        scales: [{ scale: SCALES.dorian, root: 'key' }],
      },
      {
        id: 'frigio',
        name: 'Frígio',
        field: 'bVI',
        focus: ['i', 'bII', 'bIII', 'iv', 'vø7', 'bVI', 'bvii'],
        progressions: [{ name: 'Vamp i–bII', chords: ['i', 'bII'] }],
        scales: [{ scale: SCALES.phrygian, root: 'key' }],
      },
      {
        id: 'lidio',
        name: 'Lídio',
        field: 'V',
        focus: ['I', 'II', 'iii', '#ivø7', 'V', 'vi', 'vii'],
        progressions: [{ name: 'Vamp I–II', chords: ['I', 'II'] }],
        scales: [{ scale: SCALES.lydian, root: 'key' }],
      },
      {
        id: 'mixolidio',
        name: 'Mixolídio',
        field: 'IV',
        focus: ['I', 'ii', 'iiiø7', 'IV', 'v', 'vi', 'bVII'],
        progressions: [{ name: 'I–bVII–IV–I', chords: ['I', 'bVII', 'IV', 'I'] }],
        scales: [{ scale: SCALES.mixolydian, root: 'key' }],
      },
      {
        id: 'eolio',
        name: 'Eólio',
        field: 'bIII',
        focus: ['i', 'iiø7', 'bIII', 'iv', 'v', 'bVI', 'bVII'],
        progressions: [{ name: 'i–bVI–bVII–i', chords: ['i', 'bVI', 'bVII', 'i'] }],
        scales: [{ scale: SCALES.aeolian, root: 'key' }],
      },
      {
        id: 'locrio',
        name: 'Lócrio',
        field: 'bII',
        focus: ['iø7', 'bII', 'biii', 'iv', 'bV', 'bVI', 'bvii'],
        progressions: [{ name: 'Vamp iø7–bII', chords: ['iø7', 'bII'] }],
        scales: [{ scale: SCALES.locrian, root: 'key' }],
      },
    ],
    tips: [
      'Repouse na tônica marcada no teclado: é ela que define o modo, não as notas.',
      'Procure a nota característica: 6ª maior no dórico, b2 no frígio, #4 no lídio, b7 no mixolídio.',
      'Use o vamp de dois acordes e evite resolver no tom maior relativo.',
      'Troque de modo sem mudar o tom e compare a cor de cada um.',
    ],
  },
  {
    id: 'penta-ciclo',
    name: 'Pentatônicas sobre o ciclo',
    category: 'Escalas',
    level: 'iniciante',
    description:
      'Uma pentatônica para cada acorde: maior sobre os maiores, menor sobre os menores, dominante sobre os de sétima. Siga o ciclo e sinta a escala mudar com a harmonia.',
    suggestedKey: 'C',
    layers: ['std', 'res', 'dia', 'sec'],
    focus: ['I', 'IV', 'V7', 'ii', 'vi'],
    progressions: [
      { name: 'Ciclo diatônico', chords: ['I', 'IV', 'vii°', 'iii', 'vi', 'ii', 'V7', 'I'] },
      { name: 'I–vi–ii–V', chords: ['I', 'vi', 'ii', 'V7'] },
    ],
    scales: [
      { on: { families: ['min'] }, scale: SCALES.pentatonicMinor, root: 'chord' },
      { on: { families: ['dom'] }, scale: SCALES.pentatonicDominant, root: 'chord' },
      // sobre o diminuto, a pentatônica menor a partir da sua b3
      { on: { families: ['dim'] }, scale: SCALES.pentatonicMinor, root: 'chord', interval: [3, 3] },
      { scale: SCALES.pentatonicMajor, root: 'chord' },
    ],
    tips: [
      'Cinco notas, sem semitons: qualquer nota da escala soa bem sobre o acorde.',
      'Ao trocar de acorde, procure a nota mais próxima da nova pentatônica.',
      'As notas-alvo (do acorde) são os melhores pontos de chegada das frases.',
      'Toque a mesma frase transposta para cada acorde do ciclo.',
    ],
  },
];

export const findMode = (id: string | null | undefined) => STUDY_MODES.find((m) => m.id === id) ?? null;
