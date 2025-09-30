type EventCallback = (data: any) => void;

class BookingEventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Erreur dans le callback de l'événement ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

// Instance globale pour les événements de réservation
export const bookingEvents = new BookingEventEmitter();

// Types d'événements disponibles
export const BOOKING_EVENTS = {
  CREATED: 'bookingCreated',
  UPDATED: 'bookingUpdated',
  DELETED: 'bookingDeleted',
  PAYMENT_COMPLETED: 'paymentCompleted',
  PAYMENT_FAILED: 'paymentFailed'
} as const;

export type BookingEventType = typeof BOOKING_EVENTS[keyof typeof BOOKING_EVENTS];