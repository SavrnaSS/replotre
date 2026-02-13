type AdminStreamEvent = {
  type: string;
  payload?: Record<string, unknown>;
};

type Subscriber = (event: AdminStreamEvent) => void;

type StreamStore = {
  subscribers: Set<Subscriber>;
};

const globalStore = globalThis as typeof globalThis & {
  __adminStream?: StreamStore;
};

const store: StreamStore =
  globalStore.__adminStream ?? { subscribers: new Set<Subscriber>() };

if (!globalStore.__adminStream) {
  globalStore.__adminStream = store;
}

export function subscribeAdminStream(handler: Subscriber) {
  store.subscribers.add(handler);
  return () => store.subscribers.delete(handler);
}

export function publishAdminStream(type: string, payload?: Record<string, unknown>) {
  for (const subscriber of store.subscribers) {
    subscriber({ type, payload });
  }
}
