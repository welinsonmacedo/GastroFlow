import { EventType, EventPayloads } from './eventTypes';
import { logger } from '../logger/logger';

type EventCallback<T extends EventType> = (payload: EventPayloads[T]) => void;

class EventBus {
  private listeners: { [K in EventType]?: EventCallback<K>[] } = {};

  on<T extends EventType>(event: T, callback: EventCallback<T>) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);
    
    // Retorna função de unsubscribe
    return () => this.off(event, callback);
  }

  off<T extends EventType>(event: T, callback: EventCallback<T>) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter(cb => cb !== callback) as any;
  }

  emit<T extends EventType>(event: T, payload: EventPayloads[T]) {
    logger.debug(`[EventBus] Emitting ${event}`, payload);
    if (!this.listeners[event]) return;
    
    this.listeners[event]!.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        logger.error(`[EventBus] Error in listener for ${event}`, error);
      }
    });
  }
}

export const eventBus = new EventBus();
