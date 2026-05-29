import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        const email = 'admin@aquapure.com';
        const password = 'admin123';

        // Check if admin exists
        const existingAdmin = await User.findOne({ email });

        if (existingAdmin) {
            console.log('Admin user already exists');
            process.exit(0);
        }

        // Create admin
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new User({
            name: 'System Admin',
            email: email,
            password: hashedPassword,
            phone: '1234567890', // Dummy phone for admin
            role: 'admin'
        });

        await admin.save();
        console.log(`Admin user created successfully:\nEmail: ${email}\nPassword: ${password}`);

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
