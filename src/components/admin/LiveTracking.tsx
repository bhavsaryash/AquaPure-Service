import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, MapPin, RefreshCw, Radio } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import marker2x from 'leaflet/dist/images/marker-icon-2x.png';
import marker1x from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet default marker icons for Vite builds
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker1x,
  shadowUrl: markerShadow,
});

type LiveLocation = {
  employeeId: string;
  name?: string;
  role?: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  serviceId?: string | null;
  updatedAt: string;
};

type TrailPoint = { lat: number; lng: number; updatedAt: string };

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

function fmtAge(updatedAt: string) {
  const ms = Date.now() - new Date(updatedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function ageMs(updatedAt: string) {
  const ms = Date.now() - new Date(updatedAt).getTime();
  return Number.isFinite(ms) ? Math.max(0, ms) : Number.POSITIVE_INFINITY;
}

type Freshness = 'fresh' | 'warm' | 'stale';
function getFreshness(updatedAt: string): Freshness {
  const ms = ageMs(updatedAt);
  if (ms <= 30_000) return 'fresh';
  if (ms <= 120_000) return 'warm';
  return 'stale';
}

const markerColor: Record<Freshness, string> = {
  fresh: '#16a34a', // green-600
  warm: '#f59e0b', // amber-500
  stale: '#6b7280', // gray-500
};

const markerRing: Record<Freshness, string> = {
  fresh: 'rgba(22,163,74,0.35)',
  warm: 'rgba(245,158,11,0.35)',
  stale: 'rgba(107,114,128,0.30)',
};

function makeDotIcon(freshness: Freshness, selected: boolean) {
  const color = markerColor[freshness];
  const ring = markerRing[freshness];
  const size = selected ? 18 : 14;
  const ringSize = selected ? 34 : 28;
  const ringOffset = (ringSize - size) / 2;
  const html = `
    <div style="
      position: relative;
      width: ${ringSize}px;
      height: ${ringSize}px;
    ">
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 9999px;
        background: ${ring};
        box-shadow: 0 8px 20px rgba(0,0,0,0.18);
      "></div>
      <div style="
        position: absolute;
        left: ${ringOffset}px;
        top: ${ringOffset}px;
        width: ${size}px;
        height: ${size}px;
        border-radius: 9999px;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.95);
      "></div>
    </div>
  `;
  return L.divIcon({
    className: '',
    html,
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize / 2, ringSize / 2],
    popupAnchor: [0, -ringSize / 2],
  });
}

const DEFAULT_CENTER: [number, number] = [19.076, 72.8777]; // Mumbai-ish fallback

const Recenter: React.FC<{ center: [number, number] | null; enabled: boolean }> = ({ center, enabled }) => {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !center) return;
    map.setView(center, Math.max(map.getZoom(), 13), { animate: true });
  }, [center, enabled, map]);
  return null;
};

const LiveTracking: React.FC = () => {
  const [locations, setLocations] = useState<Record<string, LiveLocation>>({});
  const [trails, setTrails] = useState<Record<string, TrailPoint[]>>({});
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [followSelected, setFollowSelected] = useState(true);
  const [showTrails, setShowTrails] = useState(true);

  const list = useMemo(() => {
    return Object.values(locations).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [locations]);

  const selected = selectedEmployeeId ? locations[selectedEmployeeId] : null;
  const mapCenter: [number, number] | null = selected
    ? [selected.lat, selected.lng]
    : list.length
      ? [list[0].lat, list[0].lng]
      : null;

  const connect = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setStatus('error');
      setError('Missing auth token. Please log in again.');
      return;
    }

    sourceRef.current?.close();
    setStatus('connecting');
    setError(null);

    const url = `${API_BASE}/live/locations/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    sourceRef.current = es;

    es.addEventListener('open', () => {
      setStatus('connected');
    });

    es.addEventListener('snapshot', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data || '{}');
        const next: Record<string, LiveLocation> = {};
        for (const loc of data.locations || []) next[loc.employeeId] = loc;
        setLocations(next);
        setTrails(data.trails || {});
      } catch {
        // ignore
      }
    });

    es.addEventListener('location', (e: MessageEvent) => {
      try {
        const loc = JSON.parse(e.data) as LiveLocation;
        setLocations(prev => ({ ...prev, [loc.employeeId]: loc }));
        setTrails(prev => {
          const list = prev[loc.employeeId] || [];
          const next = [...list, { lat: loc.lat, lng: loc.lng, updatedAt: loc.updatedAt }].slice(-50);
          return { ...prev, [loc.employeeId]: next };
        });
      } catch {
        // ignore
      }
    });

    es.addEventListener('error', () => {
      setStatus('error');
      setError('Live connection dropped. Try reconnect.');
    });
  };

  useEffect(() => {
    connect();
    return () => sourceRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-red-600" />
            Live Tracking
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            View real-time technician location pings as they update from the employee app.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              status === 'connected'
                ? 'bg-green-100 text-green-800'
                : status === 'connecting'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting' : 'Disconnected'}
          </span>

          <button
            onClick={connect}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Reconnect
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Map</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Click a marker to select</span>
            <label className="ml-2 inline-flex items-center gap-2 text-xs text-gray-700 select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                checked={followSelected}
                onChange={(e) => setFollowSelected(e.target.checked)}
              />
              Follow selected
            </label>
            <label className="ml-2 inline-flex items-center gap-2 text-xs text-gray-700 select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                checked={showTrails}
                onChange={(e) => setShowTrails(e.target.checked)}
              />
              Show trails
            </label>
            {selected && (
              <button
                onClick={() => setSelectedEmployeeId(null)}
                className="text-xs font-medium text-red-700 hover:text-red-800"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        <div className="h-[420px]">
          <MapContainer
            center={mapCenter || DEFAULT_CENTER}
            zoom={mapCenter ? 13 : 5}
            scrollWheelZoom
            className="h-full w-full"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Recenter center={mapCenter} enabled={followSelected && !!selected} />

            {showTrails &&
              Object.entries(trails).map(([employeeId, points]) => {
                if (!points || points.length < 2) return null;
                const selected = employeeId === selectedEmployeeId;
                return (
                  <Polyline
                    key={employeeId}
                    positions={points.map(p => [p.lat, p.lng] as [number, number])}
                    pathOptions={{
                      color: selected ? '#dc2626' : '#94a3b8',
                      weight: selected ? 5 : 3,
                      opacity: selected ? 0.95 : 0.65,
                    }}
                  />
                );
              })}

            {list.map((loc) => (
              <Marker
                key={loc.employeeId}
                position={[loc.lat, loc.lng]}
                icon={makeDotIcon(getFreshness(loc.updatedAt), selectedEmployeeId === loc.employeeId)}
                eventHandlers={{
                  click: () => setSelectedEmployeeId(loc.employeeId),
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">{loc.name || loc.employeeId}</div>
                    <div className="text-xs text-gray-600 capitalize">{loc.role || 'employee'}</div>
                    <div className="text-xs text-gray-700">
                      {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                    </div>
                    <div className="text-xs text-gray-700">Last: {fmtAge(loc.updatedAt)}</div>
                    {loc.serviceId && <div className="text-xs text-gray-700">Service: {loc.serviceId}</div>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Active pings</h2>
          <span className="text-sm text-gray-500">{list.length} employee(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordinates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accuracy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last update</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                    No live locations yet. Ask an employee to start live location sharing.
                  </td>
                </tr>
              ) : (
                list.map(loc => (
                  <tr
                    key={loc.employeeId}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedEmployeeId === loc.employeeId ? 'bg-red-50' : ''}`}
                    onClick={() => setSelectedEmployeeId(loc.employeeId)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{loc.name || loc.employeeId}</div>
                      <div className="text-xs text-gray-500 capitalize">{loc.role || 'employee'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {loc.accuracy == null || Number.isNaN(Number(loc.accuracy)) ? '—' : `${Math.round(Number(loc.accuracy))}m`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {loc.serviceId || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div title={loc.updatedAt}>{fmtAge(loc.updatedAt)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;

