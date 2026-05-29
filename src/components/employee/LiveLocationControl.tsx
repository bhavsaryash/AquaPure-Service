import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, MapPin, Play, Square } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

async function postLocation(payload: any) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE}/live/locations/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to send location');
  return data;
}

const LiveLocationControl: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const stop = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setEnabled(false);
  };

  const start = async () => {
    setError(null);

    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported on this device/browser.');
      return;
    }

    try {
      const perm = await (navigator as any).permissions?.query?.({ name: 'geolocation' as any });
      if (perm?.state === 'denied') {
        setError('Location permission is blocked. Enable it in your browser settings.');
        return;
      }
    } catch {
      // ignore (permissions API not supported)
    }

    setEnabled(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await postLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          });
          setLastSentAt(new Date().toISOString());
        } catch (e: any) {
          setError(e?.message || 'Failed to send location');
        }
      },
      (err) => {
        setError(err.message || 'Unable to read location');
        stop();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000,
      }
    );
  };

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-600" />
            <h3 className="text-sm font-semibold text-gray-900">Live Location Sharing</h3>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            When enabled, your device will send GPS pings to Admin Live Tracking.
          </p>
          {lastSentAt && (
            <p className="text-xs text-gray-500 mt-1" title={lastSentAt}>
              Last sent: {new Date(lastSentAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        {enabled ? (
          <button
            onClick={stop}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        ) : (
          <button
            onClick={start}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700"
          >
            <Play className="h-4 w-4" />
            Start
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
    </div>
  );
};

export default LiveLocationControl;

