import express from 'express';
import { createOrder, verifyPayment, downloadInvoice } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/create-order', protect, createOrder);
router.post('/verify', paymentLimiter, protect, verifyPayment);
router.get('/invoice/:serviceId', protect, downloadInvoice);

export default router;
