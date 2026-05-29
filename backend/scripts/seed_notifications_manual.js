import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedNotifications = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Find the client user (assuming it's the one we've been working with, or just the first non-admin/employee)
        // Or better, let's just seed for ALL users to be safe, or just the first one.
        // Let's try to find a user with role 'client' or just the first user.
        const user = await User.findOne({ email: 'client@example.com' });

        let userId;
        if (user) {
            userId = user._id;
            console.log(`Found user: ${user.email}`);
        } else {
            const anyUser = await User.findOne();
            if (anyUser) {
                userId = anyUser._id;
                console.log(`User client@example.com not found, using first user: ${anyUser.email}`);
            } else {
                console.log('No users found to seed notifications for.');
                process.exit(1);
            }
        }

        // 1. Delete all notifications for this user
        await Notification.deleteMany({ user: userId });
        console.log('Cleared existing notifications for user');

        // 2. Create new notifications for Jan 1, 2026 - Feb 15, 2026
        const notifications = [
            {
                user: userId,
                type: 'success',
                title: 'Service Completed',
                message: 'Service SRV20260001 has been completed successfully.',
                category: 'service',
                actionUrl: '/services/SRV20260001',
                createdAt: new Date('2026-02-14T10:30:00Z'), // Feb 14
                read: false
            },
            {
                user: userId,
                type: 'info',
                title: 'New Service Assignment',
                message: 'Technician Rajesh has been assigned to your request.',
                category: 'service',
                actionUrl: '/services/SRV20260002',
                createdAt: new Date('2026-02-10T09:15:00Z'), // Feb 10
                read: true
            },
            {
                user: userId,
                type: 'warning',
                title: 'Payment Reminder',
                message: 'Payment for service SRV20260003 is pending.',
                category: 'payment',
                actionUrl: '/services/SRV20260003',
                createdAt: new Date('2026-01-25T16:45:00Z'), // Jan 25
                read: true
            },
            {
                user: userId,
                type: 'success',
                title: 'Feedback Received',
                message: 'Thank you for your feedback! We are glad you liked our service.',
                category: 'feedback',
                createdAt: new Date('2026-01-15T14:20:00Z'), // Jan 15
                read: true
            },
            {
                user: userId,
                type: 'info',
                title: 'System Maintenance',
                message: 'Scheduled maintenance on Jan 10, 2026 from 2 AM to 4 AM.',
                category: 'system',
                createdAt: new Date('2026-01-05T12:00:00Z'), // Jan 5
                read: true
            }
        ];

        await Notification.insertMany(notifications);
        console.log(`Seeded ${notifications.length} notifications successfully`);

        process.exit();
    } catch (error) {
        console.error('Error seeding notifications:', error);
        process.exit(1);
    }
};

seedNotifications();
