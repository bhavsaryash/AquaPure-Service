import express from 'express';
import {
    getNotifications,
    markRead,
    markAllRead,
    deleteNotification,
    seedNotifications
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.delete('/:id', deleteNotification);
router.post('/seed', seedNotifications);

export default router;
