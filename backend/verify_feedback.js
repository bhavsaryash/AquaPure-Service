import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') }); // Adjusted path for .env in current dir (backend)

const API_URL = 'http://127.0.0.1:5000/api';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/service_app';

async function verifyFeedback() {
    console.log('--- Starting Feedback Verification ---');

    // 1. Register/Login User
    let token;
    let userId;
    const email = `test_feedback_${Date.now()}@example.com`;
    const password = 'password123';

    try {
        console.log(`1. Registering user: ${email}`);
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                email,
                password,
                phone: '1234567890',
                address: { street: '123 Test St', city: 'Test City', state: 'TS', zip: '12345' }
            })
        });
        const regData = await regRes.json();

        if (!regRes.ok) {
            throw new Error(`Registration failed: ${regData.message}`);
        }

        token = regData.token;
        console.log('   User registered and logged in.');

        // 2. Create Request
        console.log('2. Creating Service Request...');
        const reqRes = await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                serviceType: 'repair',
                issueCategory: 'Water leakage',
                issueDescription: 'Leaking from the bottom',
                urgency: 'high',
                preferredDate: new Date().toISOString(),
                preferredTime: '10:00 AM',
                address: {
                    line1: 'Test Address Line 1',
                    city: 'Test City',
                    state: 'Test State',
                    pincode: '123456'
                }
            })
        });
        const reqData = await reqRes.json();

        if (!reqRes.ok) {
            throw new Error(`Request creation failed: ${reqData.message}`);
        }

        const requestId = reqData.data._id;
        console.log(`   Request created: ${requestId}`);

        // 3. Update Status to 'completed' (Direct DB Update)
        console.log('3. Updating Request Status to "completed" in DB...');
        await mongoose.connect(MONGO_URI);
        const Request = (await import('./models/Request.js')).default;

        await Request.findByIdAndUpdate(requestId, {
            status: 'completed',
            completedDate: new Date()
        });
        console.log('   Request status updated.');

        // 4. Submit Feedback
        console.log('4. Submitting Feedback via API...');
        const feedbackRes = await fetch(`${API_URL}/services/${requestId}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                rating: 5,
                comment: 'Excellent service, very quick!'
            })
        });
        const feedbackData = await feedbackRes.json();

        if (!feedbackRes.ok) {
            throw new Error(`Feedback submission failed: ${feedbackData.message}`);
        }

        console.log('   Feedback submitted successfully.');
        console.log('   Response Data:', feedbackData.data.feedback);

        // 5. Verify Feedback in DB
        console.log('5. Verifying Feedback in DB...');
        const updatedRequest = await Request.findById(requestId);
        if (updatedRequest.feedback && updatedRequest.feedback.rating === 5) {
            console.log('SUCCESS: Feedback verified in database.');
        } else {
            console.error('FAILURE: Feedback not found or incorrect in database.');
            process.exit(1);
        }

    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('--- Verification Finished ---');
        process.exit(0);
    }
}

verifyFeedback();
