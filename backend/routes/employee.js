import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getDashboardStats, getPerformanceStats } from '../controllers/employeeController.js';

const router = express.Router();

router.get('/dashboard', protect, authorize('technician', 'employee'), getDashboardStats);
router.get('/performance', protect, authorize('technician', 'employee'), getPerformanceStats);

export default router;
