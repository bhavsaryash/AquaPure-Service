import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const testPaymentFlow = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/service_app_test';
        // Note: We don't strictly need DB for payment controller unit test unless we want to test model updates.
        // Let's test the API endpoints directly or via controller functions.

        console.log("--- Testing Payment Controller ---\n");

        const paymentController = await import('./backend/controllers/paymentController.js');

        // 1. Test Create Order
        const reqOrder = {
            body: {
                amount: 500, // 500 INR
                currency: 'INR',
                receipt: 'test_receipt_123'
            },
            user: { id: 'test_user_id' } // Mock user
        };

        const resOrder = {
            json: function (data) {
                console.log('Create Order Response:', data);
                this.data = data;
                return this;
            },
            status: function (code) {
                console.log('Order Status:', code);
                return this;
            }
        };

        const next = (err) => console.error('Next Error:', err);

        console.log("1. Calling createOrder...");
        await paymentController.createOrder(reqOrder, resOrder, next);

        if (!resOrder.data || !resOrder.data.success) {
            console.error('Order creation failed. Check Razorpay keys.');
            // Skip verification if creation failed (likely due to missing keys in env)
            if (!process.env.RAZORPAY_KEY_ID) {
                console.log("SKIPPING VERIFICATION: No Razorpay keys found.");
                process.exit(0);
            }
            process.exit(1);
        }

        const orderId = resOrder.data.data.id;
        console.log(`Order ID created: ${orderId}`);

        // 2. Test Verify Payment
        // Generate mock signature
        const paymentId = 'pay_test_123456';
        const secret = process.env.RAZORPAY_KEY_SECRET || 'secret12345';

        const body = orderId + "|" + paymentId;
        const signature = crypto
            .createHmac('sha256', secret)
            .update(body.toString())
            .digest('hex');

        const reqVerify = {
            body: {
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature
            }
        };

        const resVerify = {
            json: function (data) {
                console.log('Verify Payment Response:', data);
                if (data.success) {
                    console.log("VERIFICATION SUCCESSFUL");
                }
                return this;
            },
            status: function (code) {
                console.log('Verify Status:', code);
                return this;
            }
        };

        console.log("\n2. Calling verifyPayment...");
        await paymentController.verifyPayment(reqVerify, resVerify, next);

        process.exit(0);
    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exit(1);
    }
};

testPaymentFlow();
