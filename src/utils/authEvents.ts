
// Simple event emitter for auth changes
type AuthEventType = 'logout';

const listeners: Record<string, Function[]> = {};

export const authEvents = {
    on: (event: AuthEventType, callback: Function) => {
        if (!listeners[event]) {
            listeners[event] = [];
        }
        listeners[event].push(callback);
    },
    off: (event: AuthEventType, callback: Function) => {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter(cb => cb !== callback);
    },
    emit: (event: AuthEventType) => {
        if (!listeners[event]) return;
        listeners[event].forEach(cb => cb());
    }
};
