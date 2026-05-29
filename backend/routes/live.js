import express from 'express';
import jwt from 'jsonwebtoken';
import { protect, authorize, admin as adminOnly } from '../middleware/auth.js';
import { getAllLocations, getAllTrails, getTrail, onLocation, upsertLocation } from '../services/locationHub.js';

const router = express.Router();

// SSE-friendly auth: allow token via query string (EventSource can't set headers).
const protectSse = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  const token = headerToken || queryToken;

  if (!token) return res.status(401).json({ message: 'Authorization token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Employee/technician posts location updates (called from the employee app).
router.post(
  '/locations/update',
  protect,
  authorize('technician', 'employee'),
  (req, res) => {
    const { lat, lng, accuracy, heading, speed, serviceId } = req.body || {};

    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ message: 'lat and lng must be numbers' });
    }

    const record = upsertLocation(req.user.id, {
      name: req.user.name,
      role: req.user.role,
      lat: latNum,
      lng: lngNum,
      accuracy: accuracy == null ? null : Number(accuracy),
      heading: heading == null ? null : Number(heading),
      speed: speed == null ? null : Number(speed),
      serviceId: serviceId ?? null,
    });

    return res.json({ ok: true, location: record });
  }
);

// Admin fetch snapshot (useful for initial UI load).
router.get('/locations', protect, adminOnly, (_req, res) => {
  return res.json({ locations: getAllLocations() });
});

// Admin fetch all trails snapshot (optional).
router.get('/locations/trails', protect, adminOnly, (_req, res) => {
  return res.json({ trails: getAllTrails() });
});

// Admin fetch single employee trail (optional).
router.get('/locations/:employeeId/trail', protect, adminOnly, (req, res) => {
  return res.json({ employeeId: req.params.employeeId, trail: getTrail(req.params.employeeId) });
});

// Admin live stream (Server-Sent Events).
router.get('/locations/stream', protectSse, adminOnly, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // initial snapshot
  send('snapshot', { locations: getAllLocations(), trails: getAllTrails() });

  const unsubscribe = onLocation((location) => {
    send('location', location);
  });

  // keep-alive ping (some proxies close idle connections)
  const ping = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    unsubscribe();
  });
});

// Geocode a postal address (Nominatim). Used by client map for ETA / route to home.
// Browser cannot call Nominatim directly due to CORS; keep usage modest per OSM policy.
router.get('/geocode', protect, async (req, res, next) => {
  try {
    const q = req.query.q;
    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.status(400).json({ message: 'Query parameter q is required' });
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q.trim())}`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': process.env.NOMINATIM_USER_AGENT || 'AquaPure/1.0 (student project)',
        Accept: 'application/json'
      }
    });

    if (!r.ok) {
      return res.status(502).json({ message: 'Geocoding service unavailable' });
    }

    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const hit = data[0];
    return res.json({
      lat: parseFloat(hit.lat),
      lng: parseFloat(hit.lon),
      displayName: hit.display_name
    });
  } catch (err) {
    console.error('Geocode API Error:', err);
    next(err);
  }
});

// Reverse Geocode (GPS coords to address text)
router.get('/reverse-geocode', protect, async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': process.env.NOMINATIM_USER_AGENT || 'AquaPure/1.0 (student project)',
        Accept: 'application/json'
      }
    });

    if (!r.ok) {
      return res.status(502).json({ message: 'Reverse geocoding service unavailable' });
    }

    const data = await r.json();
    if (data.error) {
      return res.status(404).json({ message: 'Location not found' });
    }

    return res.json({
      address: {
        line1: data.address.road || data.address.suburb || data.address.neighbourhood || '',
        city: data.address.city || data.address.town || data.address.village || data.address.state_district || '',
        state: data.address.state || '',
        pincode: data.address.postcode || ''
      },
      displayName: data.display_name
    });
  } catch (err) {
    console.error('Reverse Geocode API Error:', err);
    next(err);
  }
});

export default router;

