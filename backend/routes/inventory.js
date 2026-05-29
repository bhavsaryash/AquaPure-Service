import express from 'express';
import {
    getInventory,
    getInventoryItem,
    addItem,
    updateItem,
    deleteItem
} from '../controllers/inventoryController.js';
import protect from '../middleware/auth.js';
import admin from '../middleware/admin.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/')
    .get(getInventory)
    .post(admin, addItem);

router.route('/:id')
    .get(getInventoryItem)
    .put(admin, updateItem)
    .delete(admin, deleteItem);

export default router;
