import mongoose from 'mongoose';

const amcPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a plan name'],
        trim: true,
        unique: true
    },
    price: {
        type: Number,
        required: [true, 'Please add a price'],
        min: 0
    },
    durationInMonths: {
        type: Number,
        required: [true, 'Please add duration in months'],
        min: 1,
        default: 12
    },
    servicesIncluded: {
        type: Number,
        required: [true, 'Please add number of services included'],
        min: 1
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    features: [{
        type: String
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model('AMCPlan', amcPlanSchema);
