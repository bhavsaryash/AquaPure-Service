import express from 'express';
import {
    getSystemStats,
    getReportData,
    getAllUsers,
    getEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    assignServiceRequest,
    getAllRequests,
    updateServiceRequest
} from '../controllers/adminController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', protect, admin, getSystemStats);
router.get('/reports/:type', protect, admin, getReportData); // Add reports route
router.get('/users', protect, admin, getAllUsers);

// Service Requests
router.get('/requests', protect, admin, getAllRequests);
router.put('/requests/:id', protect, admin, updateServiceRequest);

// Employee Management
router.route('/employees')
    .get(protect, admin, getEmployees)
    .post(protect, admin, createEmployee);

router.route('/employees/:id')
    .put(protect, admin, updateEmployee)
    .delete(protect, admin, deleteEmployee);

// Service Assignment
router.post('/services/assign', protect, admin, assignServiceRequest);

export default router;
