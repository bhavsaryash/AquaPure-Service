import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import connectDB from './config/db.js';
import requestRoutes from './routes/request.js';
import adminRoutes from './routes/admin.js';
import inventoryRoutes from './routes/inventory.js';
import amcRoutes from './routes/amc.js';
import notificationRoutes from './routes/notificationRoutes.js';
import employeeRoutes from './routes/employee.js';
import liveRoutes from './routes/live.js';
import errorHandler from './middleware/errorHandler.js';
import setupTrackingSocket from './socket/tracking.js';

import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setupTrackingSocket(io);

// CORS (normalize comma-separated origins, trim spaces)
const allowedOrigins =
  process.env.CLIENT_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean) || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ];

app.use(
  cors({
    origin: true, // Allow all origins for debugging
    credentials: true
  })
);

// Security headers
app.use(helmet());

// Request logging (skip during tests)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: (Number(process.env.RATE_LIMIT_WINDOW_MIN) || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/services', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/inventory', inventoryRoutes);
import transactionRoutes from './routes/transaction.js';
// ...
app.use('/api/amc', amcRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/live', liveRoutes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server after DB connection
connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

export default app;

