import mongoose from 'mongoose';
import AMCPlan from '../models/AMCPlan.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const plans = [
    {
        name: 'Basic Care',
        price: 1999,
        durationInMonths: 12,
        servicesIncluded: 2,
        description: 'Essential maintenance for your peace of mind',
        features: [
            '2 Scheduled Services',
            'Filter Cleaning',
            'Priority Support'
        ]
    },
    {
        name: 'Standard Shield',
        price: 3499,
        durationInMonths: 12,
        servicesIncluded: 3,
        description: 'Comprehensive coverage for regular usage',
        features: [
            '3 Scheduled Services',
            'Filter Replacement (1 Set)',
            'Membrane Cleaning',
            'Emergency Visit Included'
        ]
    },
    {
        name: 'Premium Protection',
        price: 5999,
        durationInMonths: 12,
        servicesIncluded: 4,
        description: 'All-inclusive care for zero worries',
        features: [
            '4 Quarterly Services',
            'All Filters Replacement',
            'Membrane Replacement',
            'Unlimited Emergency Visits',
            'Spare Parts Coverage (upto ₹1000)'
        ]
    }
];

const seedPlans = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Check if plans exist
        const count = await AMCPlan.countDocuments();
        if (count > 0) {
            console.log('Plans already exist. Skipping seed.');
            process.exit();
        }

        await AMCPlan.insertMany(plans);
        console.log('AMC Plans Seeded Successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding plans:', error);
        process.exit(1);
    }
};

seedPlans();
