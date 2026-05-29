import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './backend/models/User.js';
import Request from './backend/models/Request.js';
import Employee from './backend/models/Employee.js';

dotenv.config({ path: './backend/.env' });

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // 1. Create Admin User (if not exists)
        let admin = await User.findOne({ email: 'admin@test.com' });
        if (!admin) {
            admin = await User.create({
                name: 'Admin User',
                email: 'admin@test.com',
                password: 'password123',
                role: 'admin',
                phone: '9999999999'
            });
            console.log('Admin created');
        } else {
            // Update role to admin just in case
            admin.role = 'admin';
            await admin.save();
            console.log('Admin loaded');
        }

        // 2. Test Create Employee (via Controller Logic Simulation)
        console.log('\n--- Testing Employee Creation ---');
        // We will simulate the controller logic here as we can't easily call controller functions without req/res mocking
        // Ideally we should use supertest, but for quick verify:

        const empEmail = `emp_${Date.now()}@test.com`;
        const empUser = await User.create({
            name: 'Test Technician',
            email: empEmail,
            phone: '8888888888',
            password: 'password123',
            role: 'technician'
        });

        const empProfile = await Employee.create({
            user: empUser._id,
            employeeId: `EMP${Date.now()}`,
            specialization: 'RO Repair',
            experience: 5,
            location: 'Bangalore'
        });
        console.log('Employee Created:', empProfile.employeeId);

        // 3. Test Service Request Assignment
        console.log('\n--- Testing Service Assignment ---');
        // Create a dummy request
        const request = await Request.create({
            user: admin._id, // Assign to admin as customer for simplicity
            serviceType: 'repair',
            issueCategory: 'Water Leakage',
            issueDescription: 'Test Issue',
            status: 'pending'
        });
        console.log('Request Created:', request.serviceId);

        // Assign
        request.assignedEmployee = empProfile._id;
        request.status = 'assigned';
        await request.save();
        console.log(`Request assigned to employee ${empProfile.employeeId}`);

        // Verify assignment
        const updatedRequest = await Request.findById(request._id).populate('assignedEmployee');
        if (updatedRequest.assignedEmployee.employeeId === empProfile.employeeId) {
            console.log('SUCCESS: Service assigned correctly.');
        } else {
            console.error('FAILURE: Service assignment failed.');
        }

        // Cleanup
        await Request.deleteOne({ _id: request._id });
        await Employee.deleteOne({ _id: empProfile._id });
        await User.deleteOne({ _id: empUser._id });
        console.log('\n--- Cleanup Done ---');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
};

runTest();
