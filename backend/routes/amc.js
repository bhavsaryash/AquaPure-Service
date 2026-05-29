import express from 'express';
import {
    getPlans,
    getAllPlansAdmin,
    createPlan,
    updatePlan,
    deletePlan,
    subscribeToPlan,
    getMySubscription,
    getAllSubscriptionsAdmin
} from '../controllers/amcController.js';
import protect from '../middleware/auth.js';
import admin from '../middleware/admin.js';

const router = express.Router();

router.get('/plans', getPlans);
router.get('/plans/all', protect, admin, getAllPlansAdmin);
router.post('/plans', protect, admin, createPlan);
router.put('/plans/:id', protect, admin, updatePlan);
router.delete('/plans/:id', protect, admin, deletePlan);

router.post('/subscribe', protect, subscribeToPlan);
router.get('/my-subscription', protect, getMySubscription);
router.get('/subscriptions', protect, admin, getAllSubscriptionsAdmin);

export default router;
