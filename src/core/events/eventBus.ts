type EventCallback<T = any> = (payload: T) => void;

export class EventBus {
  private static events: Record<string, EventCallback[]> = {};

  static subscribe<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback as EventCallback);
    return () => {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    };
  }

  static publish<T>(event: string, payload: T): void {
    if (!this.events[event]) return;
    this.events[event].forEach((callback) => callback(payload));
  }
}
