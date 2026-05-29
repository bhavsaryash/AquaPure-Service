import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add the item name'],
        trim: true
    },
    sku: {
        type: String,
        required: [true, 'Please add the SKU'],
        unique: true,
        uppercase: true,
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Please add the category'],
        enum: ['filter', 'membrane', 'pump', 'electrical', 'plumbing', 'other'],
        default: 'other'
    },
    quantity: {
        type: Number,
        required: [true, 'Please add the quantity'],
        default: 0,
        min: 0
    },
    unit: {
        type: String,
        required: [true, 'Please add the unit (e.g., pcs, mtr, box)'],
        default: 'pcs'
    },
    price: {
        type: Number,
        required: [true, 'Please add the price per unit'],
        min: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 5
    },
    description: {
        type: String,
        trim: true
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

export default mongoose.model('Inventory', inventorySchema);
