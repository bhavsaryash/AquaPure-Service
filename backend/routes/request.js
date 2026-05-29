import express from 'express';
import { body } from 'express-validator';
import protect from '../middleware/auth.js'; // Assuming you have an auth middleware
import {
    createRequest,
    getAssignedRequests,
    getMyRequests,
    getRequestById,
    updateRequestStatus,
    submitFeedback,
    recordRequestPayment,
    cancelRequest
} from '../controllers/requestController.js';

const router = express.Router();

router.use(protect); // Protect all routes

// Configure upload middleware
import upload from '../middleware/upload.js';

router.post(
    '/',
    [
        upload.array('photos', 5), // Allow up to 5 photos
        body('serviceType', 'Service type is required').not().isEmpty(),
        body('issueCategory', 'Issue category is required').not().isEmpty(),
        body('issueDescription', 'Description is required').not().isEmpty()
    ],
    createRequest
);

router.get('/assigned', getAssignedRequests);
router.get('/my-requests', getMyRequests);
router.get('/:id', getRequestById);
router.put('/:id/status', updateRequestStatus);
router.put('/:id/cancel', cancelRequest);
router.post('/:id/payment', recordRequestPayment);
router.post('/:id/feedback', submitFeedback); // Added feedback route

export default router;
