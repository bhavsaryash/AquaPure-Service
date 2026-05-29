import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        const admin = await User.findOne({ email: 'admin@aquapure.com' });

        if (admin) {
            console.log('Admin user found:', admin.email);
            console.log('Role:', admin.role);
        } else {
            console.log('Admin user NOT found');
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkAdmin();
