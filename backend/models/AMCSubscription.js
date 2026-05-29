import mongoose from 'mongoose';

const amcSubscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AMCPlan',
        required: true
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'pending', 'cancelled'],
        default: 'active'
    },
    servicesRemaining: {
        type: Number,
        required: true
    },
    history: [{
        action: { type: String, enum: ['subscribed', 'renewed', 'cancelled', 'service_used'] },
        date: { type: Date, default: Date.now },
        notes: String
    }],
    transactions: [{
        transactionId: String,
        amount: Number,
        date: { type: Date, default: Date.now },
        status: { type: String, enum: ['success', 'failed'], default: 'success' },
        gatewayResponse: Object
    }]
}, {
    timestamps: true
});

// Calculate status based on date
amcSubscriptionSchema.pre('save', function (next) {
    if (this.endDate < new Date()) {
        this.status = 'expired';
    }
    next();
});

export default mongoose.model('AMCSubscription', amcSubscriptionSchema);
