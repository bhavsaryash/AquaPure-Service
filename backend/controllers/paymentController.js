import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import PaymentTransaction from '../models/PaymentTransaction.js';
import { verifyRazorpaySignature } from '../utils/razorpayVerify.js';

dotenv.config();

function getRazorpayInstance() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        const missing = [];
        if (!keyId) missing.push('RAZORPAY_KEY_ID');
        if (!keySecret) missing.push('RAZORPAY_KEY_SECRET');
        throw new Error(`Missing Razorpay credentials in backend/.env: ${missing.join(', ')}`);
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
}

/** Razorpay SDK throws `{ statusCode, error }`, not `Error` — normalize for logging and API responses */
function getRazorpayFailurePayload(err) {
    if (!err) return { detail: 'Unknown error' };
    const e = err.error || err;
    const description = e.description || e.reason || e.message || (typeof e === 'string' ? e : null);
    const code = e.code || err.statusCode;
    if (description) return { detail: String(description), code: code ? String(code) : undefined };
    try {
        return { detail: JSON.stringify(e), code: code ? String(code) : undefined };
    } catch {
        return { detail: String(err.message || err), code: undefined };
    }
}

// @route   POST api/payment/create-order
// @desc    Create a Razorpay order
// @access  Private
export const createOrder = async (req, res, next) => {
    try {
        const instance = getRazorpayInstance();
        const { amount, currency = 'INR', receipt } = req.body;
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) {
            return res.status(400).json({ message: 'amount must be a positive number' });
        }
        // Razorpay Orders API: receipt max 40 chars, alphanumeric + _-
        const receiptClean = String(receipt).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
        if (!receiptClean || receiptClean.length < 4) {
            return res.status(400).json({ message: 'receipt must be 4–40 chars (letters, numbers, _ or -)' });
        }
        if (currency && typeof currency !== 'string') {
            return res.status(400).json({ message: 'currency must be a string' });
        }

        const options = {
            amount: Math.round(amt * 100), // Amount in smallest currency unit (paise)
            currency,
            receipt: receiptClean
        };

        const order = await instance.orders.create(options);

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        const { detail, code } = getRazorpayFailurePayload(error);
        console.error('Razorpay create-order failed:', detail, code || '', error);
        res.status(502).json({
            message: 'Payment initiation failed',
            detail,
            code
        });
    }
};

// @route   POST api/payment/verify
// @desc    Verify Razorpay payment signature
// @access  Private
export const verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing Razorpay fields' });
        }
        const ok = verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });
        if (!ok) {
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        // Persist verification (idempotent by razorpay_payment_id)
        const tx = await PaymentTransaction.findOneAndUpdate(
            { razorpay_payment_id },
            {
                user: req.user.id,
                provider: 'razorpay',
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                status: 'verified',
                verifiedAt: new Date(),
                raw: req.body
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                transactionId: tx._id,
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            }
        });
    } catch (error) {
        next(error);
    }
};

// @route   GET api/payment/invoice/:serviceId
// @desc    Download Invoice PDF
// @access  Private
// @route   GET api/payment/invoice/:id
// @desc    Download Invoice PDF
// @access  Private
export const downloadInvoice = async (req, res, next) => {
    try {
        const { id } = req.params; // Changed from serviceId to id to be generic
        const { type } = req.query; // 'service' or 'amc'

        // Determine if we are looking for a Service Request or AMC Subscription
        // Note: The route param is :id, but in routes/payment.js it might be :serviceId. 
        // We should check routes/payment.js to match param name or just use req.params values.
        // Let's assume the router uses :serviceId or we update it.
        // For now, let's use the value found in req.params (which is likely serviceId based on previous code)
        // BUT the previous code used `const { serviceId } = req.params;`.
        // We should just use `req.params.serviceId` as the ID.

        const resourceId = req.params.serviceId || id;

        let invoiceData;

        if (type === 'amc') {
            const AMCSubscription = (await import('../models/AMCSubscription.js')).default;
            // Needed for population
            const AMCPlan = (await import('../models/AMCPlan.js')).default;

            const subscription = await AMCSubscription.findById(resourceId).populate('user plan');

            if (!subscription) {
                return res.status(404).json({ message: 'Subscription not found' });
            }

            invoiceData = {
                invoiceNumber: `INV-AMC-${subscription._id.toString().slice(-6).toUpperCase()}`,
                date: subscription.createdAt,
                customer: {
                    name: subscription.user.name,
                    email: subscription.user.email,
                    phone: subscription.user.phone,
                    address: subscription.user.address // Assuming user has address
                },
                items: [{
                    description: `AMC Plan: ${subscription.plan.name}`,
                    quantity: 1,
                    price: subscription.plan.price
                }],
                totalAmount: subscription.plan.price,
                status: 'Paid'
            };

        } else {
            // Default to Service Request
            const Request = (await import('../models/Request.js')).default;
            const request = await Request.findOne({ serviceId: resourceId }).populate('user');
            // If not found by serviceId, try _id
            const requestObj = request || await Request.findById(resourceId).populate('user');

            if (!requestObj) {
                return res.status(404).json({ message: 'Service request not found' });
            }

            invoiceData = {
                invoiceNumber: `INV-${requestObj.serviceId}`,
                date: requestObj.updatedAt,
                customer: {
                    name: requestObj.user.name,
                    email: requestObj.user.email,
                    phone: requestObj.user.phone,
                    address: requestObj.address
                },
                items: [
                    ...(requestObj.costBreakdown?.laborCost ? [{
                        description: `Service Charges (${requestObj.serviceType})`,
                        quantity: 1,
                        price: requestObj.costBreakdown?.laborCost || 0
                    }] : []),
                    ...(requestObj.costBreakdown?.partsCost > 0 ? [{
                        description: 'Parts/Spares',
                        quantity: 1,
                        price: requestObj.costBreakdown.partsCost
                    }] : [])
                ],
                totalAmount: requestObj.costBreakdown?.totalCost || 0,
                status: 'Paid'
            };
        }

        // Generate PDF
        const PDFDocument = (await import('pdfkit')).default;
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${invoiceData.invoiceNumber}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Invoice Number: ${invoiceData.invoiceNumber}`);
        doc.text(`Date: ${new Date(invoiceData.date).toLocaleDateString()}`);
        doc.moveDown();

        // Customer Details
        doc.text(`To: ${invoiceData.customer.name}`);
        doc.text(`Email: ${invoiceData.customer.email}`);
        if (invoiceData.customer.phone) doc.text(`Phone: ${invoiceData.customer.phone}`);
        doc.moveDown();

        // Items Table Header
        const tableTop = 250;
        doc.font('Helvetica-Bold');
        doc.text('Description', 50, tableTop);
        doc.text('Amount', 400, tableTop, { align: 'right' });
        doc.font('Helvetica');

        let y = tableTop + 25;
        doc.moveTo(50, y - 10).lineTo(550, y - 10).stroke();

        invoiceData.items.forEach(item => {
            doc.text(item.description, 50, y);
            doc.text(`₹${item.price}`, 400, y, { align: 'right' });
            y += 25;
        });

        doc.moveTo(50, y).lineTo(550, y).stroke();

        // Total
        doc.moveDown();
        doc.font('Helvetica-Bold');
        doc.text(`Total Amount: ₹${invoiceData.totalAmount}`, 350, y + 20, { align: 'right' });

        // Footer
        doc.fontSize(10).text('Thank you for your business!', 50, 700, { align: 'center', bottom: 50 });

        doc.end();

    } catch (error) {
        console.error('Invoice generation error:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
};
