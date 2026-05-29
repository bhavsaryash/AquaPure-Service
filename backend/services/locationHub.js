import { EventEmitter } from 'events';

/**
 * In-memory live location store + broadcaster.
 * Note: This is intentionally simple (no DB). For production, persist to DB/Redis.
 */

const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

/** @type {Map<string, any>} */
const lastByEmployeeId = new Map();

/** @type {Map<string, Array<{ lat: number, lng: number, updatedAt: string }>>} */
const trailByEmployeeId = new Map();

const MAX_TRAIL_POINTS = 50;

export function upsertLocation(employeeId, payload) {
  const record = {
    employeeId,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  lastByEmployeeId.set(employeeId, record);

  const prevTrail = trailByEmployeeId.get(employeeId) || [];
  const nextTrail = [
    ...prevTrail,
    { lat: record.lat, lng: record.lng, updatedAt: record.updatedAt },
  ].slice(-MAX_TRAIL_POINTS);
  trailByEmployeeId.set(employeeId, nextTrail);

  emitter.emit('location', record);
  return record;
}

export function getAllLocations() {
  return Array.from(lastByEmployeeId.values()).sort((a, b) =>
    String(b.updatedAt).localeCompare(String(a.updatedAt))
  );
}

export function onLocation(listener) {
  emitter.on('location', listener);
  return () => emitter.off('location', listener);
}

export function getAllTrails() {
  const out = {};
  for (const [employeeId, trail] of trailByEmployeeId.entries()) {
    out[employeeId] = trail;
  }
  return out;
}

export function getTrail(employeeId) {
  return trailByEmployeeId.get(employeeId) || [];
}

