import Inventory from '../models/Inventory.js';

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private (Admin/Employee)
export const getInventory = async (req, res) => {
    try {
        const { category, lowStock } = req.query;
        let query = {};

        if (category) {
            query.category = category;
        }

        if (lowStock === 'true') {
            // Find items where quantity is less than or equal to threshold
            query.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
        }

        const items = await Inventory.find(query).sort({ name: 1 });

        res.status(200).json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get single inventory item
// @route   GET /api/inventory/:id
// @access  Private (Admin/Employee)
export const getInventoryItem = async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Add new inventory item
// @route   POST /api/inventory
// @access  Private (Admin only)
export const addItem = async (req, res) => {
    try {
        const { name, sku, category, quantity, unit, price, lowStockThreshold, description } = req.body;

        const itemExists = await Inventory.findOne({ sku });

        if (itemExists) {
            return res.status(400).json({
                success: false,
                message: 'Item with this SKU already exists'
            });
        }

        const item = await Inventory.create({
            name,
            sku,
            category,
            quantity,
            unit,
            price,
            lowStockThreshold,
            description,
            lastUpdatedBy: req.user._id
        });

        res.status(201).json({
            success: true,
            data: item
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (Admin only)
export const updateItem = async (req, res) => {
    try {
        let item = await Inventory.findById(req.params.id);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Add user who updated it
        req.body.lastUpdatedBy = req.user._id;

        item = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: item
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private (Admin only)
export const deleteItem = async (req, res) => {
    try {
        const item = await Inventory.findById(req.params.id);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        await item.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};
