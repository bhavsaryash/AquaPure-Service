import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { socket, connectSocket } from '../../utils/socket';
import { liveAPI } from '../../utils/api';

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

function navigatorArrowIcon(degrees: number) {
  return L.divIcon({
    className: 'navigator-arrow-marker',
    html: `<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
      <div style="transform:rotate(${degrees}deg);width:38px;height:38px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.45));">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="38" height="38">
          <path fill="#2563eb" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round" d="M12 2 L21 20 L12 16.5 L3 20 Z"/>
        </svg>
      </div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
}

const homeIcon = L.divIcon({
  className: 'custom-home-icon',
  html: `<div style="background-color:#16a34a;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.45);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const MAX_TRAIL = 80;
const ROUTE_THROTTLE_MS = 10_000;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatDuration(seconds: number) {
  const m = Math.max(1, Math.round(seconds / 60));
  if (m < 60) return `~${m} min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `~${h} hr ${mm} min` : `~${h} hr`;
}

function formatDistanceKm(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

async function fetchOsrmRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<{ coordinates: [number, number][]; durationSec: number; distanceM: number }> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Route request failed');
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates) throw new Error('No route');
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );
  return {
    coordinates,
    durationSec: route.duration,
    distanceM: route.distance
  };
}

function FitMapBounds({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      const p = positions[0] as [number, number];
      map.setView(p, 14);
      return;
    }
    const b = L.latLngBounds(positions as [number, number][]);
    map.fitBounds(b, { padding: [48, 48], maxZoom: 15 });
  }, [positions, map]);
  return null;
}

export interface LiveTrackerAddress {
  line1: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
}

interface LiveTrackerMapProps {
  serviceId: string;
  initialLocation?: { lat: number; lng: number };
  destinationAddress?: LiveTrackerAddress | null;
}

const LiveTrackerMap: React.FC<LiveTrackerMapProps> = ({
  serviceId,
  initialLocation,
  destinationAddress
}) => {
  const [employeeLocation, setEmployeeLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [eta, setEta] = useState<{ durationSec: number; distanceM: number; mode: 'osrm' | 'straight' } | null>(
    null
  );
  const [routeError, setRouteError] = useState<string | null>(null);
  const [socketHeading, setSocketHeading] = useState<number | null>(null);

  const lastOsrmAtRef = useRef(0);
  const routeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setEmployeeLocation(initialLocation ?? null);
    setTrail([]);
    setRouteCoords(null);
    setEta(null);
    setRouteError(null);
    setSocketHeading(null);
    lastOsrmAtRef.current = 0;
  }, [serviceId, initialLocation]);

  const trailBearing = useMemo(() => {
    if (trail.length < 2) return null;
    const a = trail[trail.length - 2];
    const b = trail[trail.length - 1];
    return bearingDeg({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] });
  }, [trail]);

  const displayHeading = socketHeading ?? trailBearing ?? 0;
  const technicianIcon = useMemo(() => navigatorArrowIcon(displayHeading), [displayHeading]);

  const addressQuery = useMemo(() => {
    if (!destinationAddress) return '';
    const { line1, city, state, pincode } = destinationAddress;
    if (!line1?.trim() && !city?.trim()) return '';
    return `${line1}, ${city}, ${state} ${pincode}, India`.replace(/\s+/g, ' ').trim();
  }, [destinationAddress]);

  const fallbackQuery = useMemo(() => {
    if (!destinationAddress) return '';
    const { city, state, pincode } = destinationAddress;
    if (!city?.trim() && !pincode?.trim()) return '';
    return `${city}, ${state} ${pincode}, India`.replace(/\s+/g, ' ').trim();
  }, [destinationAddress]);

  useEffect(() => {
    if (destinationAddress?.lat && destinationAddress?.lng) {
      setDestCoords({ lat: destinationAddress.lat, lng: destinationAddress.lng });
      setGeoError(null);
      return;
    }

    if (!addressQuery) {
      setDestCoords(null);
      setGeoError(null);
      return;
    }

    let cancelled = false;
    setGeoLoading(true);
    setGeoError(null);

    const tryGeocode = async () => {
      try {
        const res: { lat: number; lng: number } = await liveAPI.geocode(addressQuery);
        if (cancelled) return;
        setDestCoords({ lat: res.lat, lng: res.lng });
        setGeoError(null); // Clear errors purely
      } catch (e: any) {
        if (cancelled) return;
        // Try fallback if primary fails and is different
        if (fallbackQuery && fallbackQuery !== addressQuery) {
          try {
            const fallbackRes: { lat: number; lng: number } = await liveAPI.geocode(fallbackQuery);
            if (cancelled) return;
            setDestCoords({ lat: fallbackRes.lat, lng: fallbackRes.lng });
            setGeoError("Approximate location (Street address not found)");
            return;
          } catch (fallbackError) {
            if (cancelled) return;
            setGeoError('Could not find your exact address or city on the map');
            setDestCoords(null);
          }
        } else {
          setGeoError(e.message || 'Could not find your address on the map');
          setDestCoords(null);
        }
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    };
    
    tryGeocode();

    return () => {
      cancelled = true;
    };
  }, [addressQuery, fallbackQuery, destinationAddress?.lat, destinationAddress?.lng]);

  useEffect(() => {
    if (!employeeLocation || !destCoords) {
      setRouteCoords(null);
      setEta(null);
      setRouteError(null);
      return;
    }

    const from = employeeLocation;
    const to = destCoords;
    const km = haversineKm(from, to);
    const straightEta = {
      durationSec: (km / 25) * 3600,
      distanceM: km * 1000,
      mode: 'straight' as const
    };

    if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);

    routeDebounceRef.current = setTimeout(async () => {
      const now = Date.now();
      const tooSoon =
        lastOsrmAtRef.current > 0 && now - lastOsrmAtRef.current < ROUTE_THROTTLE_MS;

      if (tooSoon) {
        setEta(straightEta);
        return;
      }

      lastOsrmAtRef.current = Date.now();

      try {
        const osrm = await fetchOsrmRoute(from, to);
        setRouteCoords(osrm.coordinates);
        setEta({
          durationSec: osrm.durationSec,
          distanceM: osrm.distanceM,
          mode: 'osrm'
        });
        setRouteError(null);
      } catch {
        setRouteCoords(null);
        setEta(straightEta);
        setRouteError('Road route unavailable; straight-line estimate shown.');
      }
    }, 450);

    return () => {
      if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
    };
  }, [employeeLocation?.lat, employeeLocation?.lng, destCoords?.lat, destCoords?.lng]);

  useEffect(() => {
    connectSocket();
    socket.emit('client_subscribe_location', { serviceId });

    const handleLocationUpdate = (data: {
      serviceId?: string;
      lat: number;
      lng: number;
      heading?: number | null;
    }) => {
      if (String(data.serviceId) !== String(serviceId)) return;
      const next = { lat: data.lat, lng: data.lng };
      setEmployeeLocation(next);
      if (typeof data.heading === 'number' && Number.isFinite(data.heading)) {
        setSocketHeading(data.heading);
      }
      setTrail((prev) => {
        const last = prev[prev.length - 1];
        const nextPoint: [number, number] = [next.lat, next.lng];
        if (last && last[0] === nextPoint[0] && last[1] === nextPoint[1]) return prev;
        return [...prev, nextPoint].slice(-MAX_TRAIL);
      });
    };

    socket.on('location_updated', handleLocationUpdate);

    return () => {
      socket.off('location_updated', handleLocationUpdate);
    };
  }, [serviceId]);

  const mapCenter = useMemo((): LatLngExpression => {
    if (destCoords) return [destCoords.lat, destCoords.lng];
    if (employeeLocation) return [employeeLocation.lat, employeeLocation.lng];
    return [20.5937, 78.9629];
  }, [destCoords, employeeLocation]);

  const boundsPositions: LatLngExpression[] = useMemo(() => {
    const pts: LatLngExpression[] = [];
    if (destCoords) pts.push([destCoords.lat, destCoords.lng]);
    if (employeeLocation) pts.push([employeeLocation.lat, employeeLocation.lng]);
    return pts;
  }, [destCoords, employeeLocation]);

  const statusLine = useMemo(() => {
    if (geoLoading) return 'Looking up your address…';
    if (geoError) return geoError;
    if (!employeeLocation) return 'Waiting for technician location…';
    if (!destCoords) return 'Add a service address to see time and distance to your home.';
    if (!eta) return 'Calculating route…';
    const basis = eta.mode === 'osrm' ? 'Driving estimate' : 'Straight-line estimate';
    return `${basis}: ${formatDistanceKm(eta.distanceM)} · ${formatDuration(eta.durationSec)}`;
  }, [geoLoading, geoError, employeeLocation, destCoords, eta]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        <span className="font-medium text-slate-800">Tracking</span>
        <span className="text-slate-600">{statusLine}</span>
      </div>
      {routeError && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">{routeError}</p>
      )}

      <div
        className="rounded-lg overflow-hidden border border-gray-300 shadow-sm bg-gray-100"
        style={{ height: '380px', width: '100%' }}
      >
        <MapContainer
          key={serviceId}
          center={mapCenter}
          zoom={destCoords || employeeLocation ? 13 : 5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitMapBounds positions={boundsPositions.length ? boundsPositions : [mapCenter]} />

          {destCoords && (
            <Marker position={[destCoords.lat, destCoords.lng]} icon={homeIcon}>
              <Popup>Your service address</Popup>
            </Marker>
          )}

          {trail.length > 1 && (
            <Polyline
              positions={trail}
              pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
            />
          )}

          {routeCoords && routeCoords.length > 1 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: '#1d4ed8', weight: 5, opacity: 0.9 }}
            />
          )}

          {employeeLocation && (
            <Marker position={[employeeLocation.lat, employeeLocation.lng]} icon={technicianIcon}>
              <Popup>Technician — direction of travel</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block text-blue-600 font-bold" aria-hidden>
            ↑
          </span>{' '}
          Technician (arrow = direction)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-green-600 border border-white shadow" /> Your address
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-8 h-0.5 bg-blue-200" /> Path travelled
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-8 h-1 bg-blue-800 opacity-90" /> Driving route
        </span>
      </div>
    </div>
  );
};

export default LiveTrackerMap;
