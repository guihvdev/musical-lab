/** Barramento de eventos tipado para comunicação leve entre features. */
export class EventBus<Events extends Record<string, unknown>> {
  private handlers: { [K in keyof Events]?: Set<(payload: Events[K]) => void> } = {};

  on<K extends keyof Events>(type: K, fn: (payload: Events[K]) => void): () => void {
    const set = (this.handlers[type] ??= new Set());
    set.add(fn);
    return () => set.delete(fn);
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    this.handlers[type]?.forEach((fn) => fn(payload));
  }
}
