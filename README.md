# musical-lab

## Teia Harmônica

Grafo circular de acordes: escolha um acorde, veja para onde ele pode ir e toque o próximo.
Vite + TypeScript (vanilla), sem dependências de runtime.

```bash
npm install
npm run dev       # servidor de desenvolvimento
npm run build     # typecheck + build de produção em dist/
npm run preview   # serve o build
```

### Estrutura (feature-based)

```
src/
├── main.ts                  # entrada: estilos globais + mountApp
├── app/                     # composição do layout e progressão inicial
├── styles/                  # tokens (cores, fontes) e reset/base
├── shared/                  # utilitários genéricos, sem regra de negócio
│   ├── dom.ts               #   helpers de DOM/SVG
│   ├── events.ts            #   event bus tipado
│   └── audio/synth.ts       #   sintetizador Web Audio
├── core/
│   ├── harmony/             # domínio: teoria, grafo de acordes/transições, análise, voicing
│   └── store/               # estado global, ações e persistência (localStorage)
└── features/
    ├── chord-graph/         # grafo SVG circular, rotação por tom, destaque de arestas
    ├── key-selector/        # grade dos 12 tons
    ├── current-chord/       # cartão do acorde atual
    ├── suggestions/         # lista de próximos acordes (1–9)
    ├── transition-layers/   # liga/desliga tipos de transição
    ├── progression/         # trilha de acordes + reprodução com bpm
    ├── piano/               # teclado na tela (voicing, baixo, notas MIDI)
    ├── midi/                # status e detecção de acordes via Web MIDI
    └── shortcuts/           # atalhos de teclado
```

Cada feature expõe sua API pública por `index.ts`, importa o próprio CSS e se inscreve no
store (`subscribe`) para redesenhar. Interações efêmeras (hover de aresta, notas MIDI ao vivo)
passam pelo `bus`, sem render completo.
