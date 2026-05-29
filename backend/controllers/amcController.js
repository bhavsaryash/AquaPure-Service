import AMCPlan from '../models/AMCPlan.js';
import AMCSubscription from '../models/AMCSubscription.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import { verifyRazorpaySignature } from '../utils/razorpayVerify.js';

// @desc    Get all AMC plans
// @route   GET /api/amc/plans
// @access  Public
export const getPlans = async (req, res) => {
    try {
        const plans = await AMCPlan.find({ isActive: true });
        res.status(200).json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get all AMC plans (including inactive)
// @route   GET /api/amc/plans/all
// @access  Private (Admin only)
export const getAllPlansAdmin = async (_req, res) => {
    try {
        const plans = await AMCPlan.find({}).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Create new AMC plan
// @route   POST /api/amc/plans
// @access  Private (Admin only)
export const createPlan = async (req, res) => {
    try {
        const plan = await AMCPlan.create(req.body);
        res.status(201).json({
            success: true,
            data: plan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Update AMC plan
// @route   PUT /api/amc/plans/:id
// @access  Private (Admin only)
export const updatePlan = async (req, res) => {
    try {
        const plan = await AMCPlan.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        res.status(200).json({
            success: true,
            data: plan
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Delete AMC plan
// @route   DELETE /api/amc/plans/:id
// @access  Private (Admin only)
export const deletePlan = async (req, res) => {
    try {
        const plan = await AMCPlan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        await plan.deleteOne();
        return res.status(200).json({ success: true, data: {} });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Subscribe to a plan
// @route   POST /api/amc/subscribe
// @access  Private (Client)
export const subscribeToPlan = async (req, res) => {
    try {
        const { planId, paymentDetails } = req.body;
        const plan = await AMCPlan.findById(planId);

        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        // Verify Payment (if provided) + enforce idempotency
        if (paymentDetails) {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, isMocked } = paymentDetails;
            
            if (isMocked) {
                console.log("Mock payment received, bypassing signature verification");
            } else {
                const ok = verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });
                if (!ok) {
                    return res.status(400).json({ success: false, message: 'Invalid payment signature' });
                }
            }

            const existingTx = await PaymentTransaction.findOne({ razorpay_payment_id });
            if (existingTx?.contextType && existingTx.contextType !== 'amc') {
                return res.status(409).json({ success: false, message: 'Payment already used for another transaction' });
            }
            if (existingTx?.contextType === 'amc' && existingTx.contextId) {
                const existingSub = await AMCSubscription.findById(existingTx.contextId).populate('plan');
                if (existingSub) {
                    return res.status(200).json({ success: true, data: existingSub, idempotent: true });
                }
            }
        } else {
            // For now, allow without payment for testing if env var says so, or strictly require it?
            // Let's assume strict requirement if plan price > 0
            if (plan.price > 0) {
                return res.status(400).json({ success: false, message: 'Payment required' });
            }
        }

        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + plan.durationInMonths);

        const userId = req.user.id || req.user._id;

        const subscription = await AMCSubscription.create({
            user: userId,
            plan: planId,
            startDate,
            endDate,
            status: 'active',
            servicesRemaining: plan.servicesIncluded,
            history: [{
                action: 'subscribed',
                date: new Date(),
                notes: `Subscribed to ${plan.name}. Payment ID: ${paymentDetails?.razorpay_payment_id || 'N/A'}`
            }],
            transactions: paymentDetails ? [{
                transactionId: paymentDetails.razorpay_payment_id,
                amount: plan.price,
                date: new Date(),
                status: 'success',
                gatewayResponse: paymentDetails
            }] : []
        });

        if (paymentDetails?.razorpay_payment_id) {
            await PaymentTransaction.findOneAndUpdate(
                { razorpay_payment_id: paymentDetails.razorpay_payment_id },
                {
                    user: userId,
                    provider: 'razorpay',
                    razorpay_order_id: paymentDetails.razorpay_order_id,
                    razorpay_payment_id: paymentDetails.razorpay_payment_id,
                    razorpay_signature: paymentDetails.razorpay_signature,
                    amount: plan.price,
                    currency: 'INR',
                    status: 'linked',
                    verifiedAt: new Date(),
                    contextType: 'amc',
                    contextId: subscription._id,
                    raw: paymentDetails
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        res.status(201).json({
            success: true,
            data: subscription
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get my subscription history
// @route   GET /api/amc/my-subscription
// @access  Private (Client)
export const getMySubscription = async (req, res) => {
    try {
        // Find all subscriptions for user, sorted by date
        const userId = req.user.id || req.user._id;
        const subscriptions = await AMCSubscription.find({
            user: userId
        })
            .populate('plan')
            .sort({ createdAt: -1 });

        const activeSubscription = subscriptions.find(sub => sub.status === 'active');

        res.status(200).json({
            success: true,
            data: {
                active: activeSubscription || null,
                history: subscriptions
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get all AMC subscriptions (admin)
// @route   GET /api/amc/subscriptions
// @access  Private (Admin)
export const getAllSubscriptionsAdmin = async (req, res) => {
    try {
        const { status, planId } = req.query;

        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (planId) {
            filter.plan = planId;
        }

        const subs = await AMCSubscription.find(filter)
            .populate('user', 'name email phone')
            .populate('plan', 'name price durationInMonths')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: subs.length,
            data: subs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};
