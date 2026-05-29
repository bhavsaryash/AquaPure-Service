import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Request from './models/Request.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const testEmailNotifications = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/service_app_test';
        await mongoose.connect(uri);
        console.log(`MongoDB Connected to ${uri}`);

        // 1. Setup Data
        const admin = await User.create({
            name: 'Admin User',
            email: `admin_${Date.now()}@test.com`,
            password: 'password123',
            role: 'admin',
            phone: '1111111111'
        });

        const client = await User.create({
            name: 'Client User',
            email: `client_${Date.now()}@test.com`,
            password: 'password123',
            role: 'client',
            phone: '2222222222'
        });

        const tech = await User.create({
            name: 'Tech User',
            email: `tech_${Date.now()}@test.com`,
            password: 'password123',
            role: 'employee',
            phone: '3333333333'
        });

        // 2. Create Request (Should trigger email to Client and Admin)
        // We can't easily call the controller directly without mocking req/res.
        // Instead, we will manually invoke the email logic or just rely on manual verification
        // BUT, given the environment, let's verify using the CONTROLLER logic if possible, 
        // OR simply create a request via API if server is running.
        // Since I have `run_command`, I can try to hit the API if the server is up.
        // The server IS running on port 5000.

        // Let's use fetch/axios to hit the running server? 
        // No, I will just replicate the logic here to ensure `sendEmail` works in this script context
        // and trusts that the controller integration I just wrote does the same.
        // Actually, testing the controller integration is better.

        // Let's rely on the fact that I just wrote the code.
        // I will write a script that imports the controller and mocks req/res.

        console.log("\n--- Testing Controller Email Logic ---\n");

        // Mock SendEmail (We can't easily structure mock in this single file without complexity)
        // So we will just run the controller function and see real Ethereal logs.

        const { createRequest, updateRequestStatus } = await import('./controllers/requestController.js');

        // Mock Req/Res for Create
        const reqCreate = {
            body: {
                serviceType: 'maintenance',
                issueCategory: 'General',
                issueDescription: 'Test Email',
                urgency: 'medium',
                contactPreference: 'email'
            },
            user: { id: client._id, name: client.name, email: client.email, role: client.role },
            files: []
        };

        const resCreate = {
            status: function (code) {
                console.log(`Response Status: ${code}`);
                return this;
            },
            json: function (data) {
                console.log('Request Created Details:', data.data.serviceId);
                this.data = data.data;
                return this;
            }
        };
        const next = (err) => console.error('Next Error:', err);

        console.log("1. Calling createRequest...");
        await createRequest(reqCreate, resCreate, next);

        // 3. Update Request (Assign)
        const reqAssign = {
            params: { id: resCreate.data._id },
            body: { status: 'assigned' },
            user: { id: admin._id, role: admin.role }
        };
        // Reuse res object

        console.log("\n2. Calling updateRequestStatus (Assign)...");
        await updateRequestStatus(reqAssign, resCreate, next);

        // 4. Update Request (Complete)
        const reqComplete = {
            params: { id: resCreate.data._id },
            body: {
                status: 'completed',
                workDetails: {
                    laborCost: 100,
                    totalCost: 100
                }
            },
            user: { id: admin._id, role: admin.role }
        };

        console.log("\n3. Calling updateRequestStatus (Complete)...");
        await updateRequestStatus(reqComplete, resCreate, next);

        console.log("\n--- Tests Finished. Check logs above for 'Preview URL' to verify emails. ---");

        // Cleanup
        await User.deleteMany({ email: { $in: [admin.email, client.email, tech.email] } });
        await Request.deleteMany({ _id: resCreate.data._id });

        process.exit(0);

    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exit(1);
    }
};

testEmailNotifications();
