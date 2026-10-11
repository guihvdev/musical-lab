import { defaultLayers, type LayerState } from '@/core/harmony';

const LAYERS_KEY = 'teia-layers';

export function loadLayers(): LayerState {
  const layers = defaultLayers();
  try {
    const saved = JSON.parse(localStorage.getItem(LAYERS_KEY) ?? 'null') as Partial<LayerState> | null;
    if (saved) Object.assign(layers, saved);
  } catch {
    /* armazenamento indisponível: usa o padrão */
  }
  return layers;
}

export function saveLayers(layers: LayerState): void {
  try {
    localStorage.setItem(LAYERS_KEY, JSON.stringify(layers));
  } catch {
    /* ignora */
  }
}
