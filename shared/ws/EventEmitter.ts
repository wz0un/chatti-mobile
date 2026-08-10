/**
 * Minimal typed event emitter — same `on/off/emit` semantics as the mobile
 * services (src/services/ChatService.js, DirectMessageService.js).
 */

export type Listener<T> = (data: T) => void;

export class EventEmitter<Events extends object = Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<Listener<unknown>>>();

  on<Event extends keyof Events>(event: Event, callback: Listener<Events[Event]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as Listener<unknown>);
  }

  off<Event extends keyof Events>(event: Event, callback: Listener<Events[Event]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(callback as Listener<unknown>);
  }

  emit<Event extends keyof Events>(event: Event, data: Events[Event]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const callback of set) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${String(event)} listener:`, error);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
