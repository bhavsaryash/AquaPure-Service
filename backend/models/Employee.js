import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    employeeId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'on_leave'],
        default: 'active'
    },
    specialization: {
        type: String,
        required: true
    },
    experience: {
        type: Number,
        default: 0
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    location: {
        type: String, // Service Area
        default: ''
    },
    salary: {
        type: Number,
        default: 0
    },
    performance: {
        completedServices: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        monthlyTarget: { type: Number, default: 0 },
        monthlyCompleted: { type: Number, default: 0 }
    },
    emergencyContact: {
        name: String,
        phone: String,
        relation: String
    }
}, {
    timestamps: true
});

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
