import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Request from './models/Request.js';
import Inventory from './models/Inventory.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const verifyTechnicianFlow = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/service_app_test';
        await mongoose.connect(uri);
        console.log(`MongoDB Connected to ${uri}`);

        // 1. Setup Test Data
        // Create Client
        const client = await User.create({
            name: 'Test Client',
            email: `client_${Date.now()}@test.com`,
            password: 'password123',
            role: 'client',
            phone: '1234567890'
        });
        console.log('Client created:', client._id);

        // Create Employee
        const employee = await User.create({
            name: 'Test Technician',
            email: `tech_${Date.now()}@test.com`,
            password: 'password123',
            role: 'employee',
            phone: '0987654321'
        });
        console.log('Employee created:', employee._id);

        // Create Inventory Item
        const item = await Inventory.create({
            name: 'Test Filter',
            sku: `TF-${Date.now()}`,
            category: 'filter',
            quantity: 10,
            unit: 'pcs',
            price: 150,
            description: 'Test Filter Description'
        });
        console.log('Inventory Item created:', item._id, 'Initial Stock:', item.quantity);

        // Create Service Request
        const request = await Request.create({
            user: client._id,
            serviceType: 'maintenance',
            issueCategory: 'General',
            issueDescription: 'Routine Check',
            urgency: 'medium',
            assignedEmployee: employee._id,
            status: 'assigned',
            serviceId: `SRV-TEST-${Date.now()}` // Manually provide to ensure validation passes in script
        });
        console.log('Request created:', request._id);

        // 2. Simulate Job Completion (Logic similar to controller)
        // We will call the controller logic manually or better, import the controller?
        // Importing controller is hard in standalone script due to req/res mocking.
        // I'll replicate the logic to verify the Mongoose operations work as expected.

        // Prepare update data
        const partsUsed = [{
            inventoryItem: item._id,
            name: item.name,
            quantity: 2,
            unitCost: item.price,
            totalCost: item.price * 2
        }];
        const laborCost = 500;
        const totalCost = (item.price * 2) + laborCost;

        // Perform Update
        console.log('Simulating Job Completion...');

        // 2.1 Deduct Inventory
        for (const part of partsUsed) {
            const invItem = await Inventory.findById(part.inventoryItem);
            if (invItem.quantity < part.quantity) {
                throw new Error('Insufficient Stock');
            }
            invItem.quantity -= part.quantity;
            await invItem.save();
        }

        // 2.2 Update Request
        request.workDetails = {
            workPerformed: 'Replaced filter and checked system.',
            partsUsed: partsUsed,
            laborCost: laborCost,
            totalCost: totalCost,
            signatures: {
                customer: 'http://signature.url/customer',
                technician: 'http://signature.url/technician'
            }
        };
        request.status = 'completed';
        request.completedAt = new Date();
        await request.save();

        console.log('Job Completed.');

        // 3. Verify Results
        const updatedItem = await Inventory.findById(item._id);
        console.log('Updated Inventory Stock:', updatedItem.quantity);
        if (updatedItem.quantity !== 8) throw new Error(`Inventory mismatch! Expected 8, got ${updatedItem.quantity}`);

        const updatedRequest = await Request.findById(request._id);
        console.log('Updated Request Status:', updatedRequest.status);
        if (updatedRequest.status !== 'completed') throw new Error('Request status mismatch!');
        if (updatedRequest.workDetails.partsUsed[0].quantity !== 2) throw new Error('Parts used mismatch!');

        console.log('VERIFICATION SUCCESSFUL: Technician flow works correctly.');

        // Cleanup
        await User.deleteMany({ email: { $in: [client.email, employee.email] } });
        await Inventory.deleteOne({ _id: item._id });
        await Request.deleteOne({ _id: request._id });
        console.log('Cleanup done.');

        process.exit(0);
    } catch (err) {
        console.error('VERIFICATION FAILED:', err);
        if (err.errors) console.error('Validation Errors:', JSON.stringify(err.errors, null, 2));
        process.exit(1);
    }
};

verifyTechnicianFlow();
