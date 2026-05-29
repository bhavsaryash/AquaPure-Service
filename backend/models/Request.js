import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        serviceId: {
            type: String,
            required: true,
            unique: true
        },
        serviceType: {
            type: String,
            required: [true, 'Please select a service type'],
            enum: ['maintenance', 'repair', 'installation', 'amc_renewal']
        },
        issueCategory: {
            type: String,
            required: [true, 'Please select an issue category']
        },
        issueDescription: {
            type: String,
            required: [true, 'Please provide a description of the issue']
        },
        urgency: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },
        preferredDate: {
            type: Date
        },
        preferredTime: {
            type: String
        },
        contactPreference: {
            type: String,
            enum: ['phone', 'email'],
            default: 'phone'
        },
        additionalNotes: {
            type: String
        },
        address: {
            line1: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
            lat: { type: Number },
            lng: { type: Number }
        },
        status: {
            type: String,
            enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
            default: 'pending'
        },
        assignedEmployee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee'
        },
        photos: [String], // URLs to photos
        workDetails: {
            workPerformed: String,
            partsUsed: [{
                inventoryItem: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Inventory'
                },
                name: String,
                quantity: Number,
                unitCost: Number,
                totalCost: Number
            }],
            laborCost: Number,
            totalCost: Number,
            beforePhotos: [String],
            afterPhotos: [String],
            signatures: {
                customer: String, // Base64 or URL
                technician: String
            }
        },
        feedback: {
            rating: { type: Number, min: 1, max: 5 },
            comment: String,
            submittedAt: Date
        },
        costBreakdown: {
            totalAmount: Number,
            paymentStatus: {
                type: String,
                enum: ['pending', 'paid', 'partially_paid', 'booking_paid'],
                default: 'pending'
            },
            paymentMethod: String,
            bookingFee: { type: Number, default: 0 },
            transactionId: String,
            paymentDate: Date,
            gatewayResponse: Object
        }
    },
    {
        timestamps: true
    }
);

// Generate serviceId before saving
requestSchema.pre('validate', async function (next) {
    if (!this.isNew) return next();

    // Format: SRV-YYYYMMDD-XXXX
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.constructor.countDocuments({
        createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
    });

    this.serviceId = `SRV${date}${String(count + 1).padStart(4, '0')}`;
    next();
});

const Request = mongoose.model('Request', requestSchema);

export default Request;
