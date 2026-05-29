import { validationResult } from 'express-validator';
import Request from '../models/Request.js';
import User from '../models/User.js'; // Import User model for admin check
import Employee from '../models/Employee.js';
import sendEmail from '../utils/sendEmail.js';
import PaymentTransaction from '../models/PaymentTransaction.js';
import { verifyRazorpaySignature } from '../utils/razorpayVerify.js';

// @route   POST api/requests
// @desc    Create a new service request
// @access  Private
export const createRequest = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const err = new Error(errors.array()[0].msg);
            err.statusCode = 400;
            throw err;
        }

        const {
            serviceType,
            issueCategory,
            issueDescription,
            urgency,
            preferredDate,
            preferredTime,
            contactPreference,
            additionalNotes,
            address, 
            paymentDetails 
        } = req.body;

        let parsedAddress = address;
        if (typeof address === 'string') {
            try {
                parsedAddress = JSON.parse(address);
            } catch (e) {
                console.error('Error parsing address JSON:', e);
                // Fallback or throw error if address is strictly required as object
            }
        }

        // Process uploaded files
        let photoPaths = [];
        if (req.files && req.files.length > 0) {
            photoPaths = req.files.map(file => `/uploads/requests/${file.filename}`);
        }

        let parsedPaymentDetails = null;
        if (paymentDetails) {
            try {
                parsedPaymentDetails = typeof paymentDetails === 'string' ? JSON.parse(paymentDetails) : paymentDetails;
            } catch (e) {
                console.error('Error parsing payment details:', e);
            }
        }

        const costBreakdown = {
            paymentMethod: 'Cash',
            paymentStatus: 'pending',
            bookingFee: 0
        };

        if (parsedPaymentDetails && parsedPaymentDetails.razorpay_payment_id) {
            costBreakdown.paymentMethod = 'online';
            costBreakdown.paymentStatus = 'booking_paid';
            costBreakdown.bookingFee = 150;
            costBreakdown.transactionId = parsedPaymentDetails.razorpay_payment_id;
        }

        const newRequest = await Request.create({
            user: req.user.id,
            serviceType,
            issueCategory,
            issueDescription,
            urgency,
            preferredDate,
            preferredTime,
            contactPreference,
            additionalNotes,
            address: parsedAddress,
            photos: photoPaths,
            costBreakdown
        });

        // Record Payment Transaction if provided
        if (parsedPaymentDetails && parsedPaymentDetails.razorpay_payment_id) {
            await PaymentTransaction.create({
                user: req.user.id,
                provider: 'razorpay',
                razorpay_order_id: parsedPaymentDetails.razorpay_order_id || 'mock_order',
                razorpay_payment_id: parsedPaymentDetails.razorpay_payment_id,
                razorpay_signature: parsedPaymentDetails.razorpay_signature || 'mock_sig',
                amount: 150,
                currency: 'INR',
                status: 'linked',
                verifiedAt: new Date(),
                contextType: 'service',
                contextId: newRequest._id,
                raw: parsedPaymentDetails
            });
        }

        // NOTIFICATION: Email to User
        try {
            await sendEmail({
                email: req.user.email,
                subject: 'Service Request Received - AquaPure',
                message: `Dear ${req.user.name},\n\nWe have received your service request for ${serviceType}. Your Request ID is ${newRequest.serviceId}.\n\nOur team will assign a technician shortly.\n\nThank you,\nAquaPure Team`
            });
        } catch (emailErr) {
            console.error('Failed to send user confirmation email:', emailErr.message);
        }

        // NOTIFICATION: Email to Admin (Find first admin)
        try {
            const admin = await User.findOne({ role: 'admin' });
            if (admin) {
                await sendEmail({
                    email: admin.email,
                    subject: 'New Service Request',
                    message: `Admin,\n\nA new service request (${newRequest.serviceId}) has been created by ${req.user.name}.\nType: ${serviceType}\nCategory: ${issueCategory}\n\nPlease assign a technician.`
                });
            }
        } catch (emailErr) {
            console.error('Failed to send admin notification email:', emailErr.message);
        }

        res.status(201).json({
            success: true,
            data: newRequest
        });
    } catch (err) {
        next(err);
    }
};

// @route   GET api/requests/assigned
// @desc    Get requests assigned to the current employee
// @access  Private (Employee)
export const getAssignedRequests = async (req, res, next) => {
    try {
        const employee = await Employee.findOne({ user: req.user.id });
        if (!employee) {
            const err = new Error('Employee profile not found');
            err.statusCode = 404;
            throw err;
        }

        const requests = await Request.find({ assignedEmployee: employee._id })
            .sort({ createdAt: -1 })
            .populate('user', 'name phone address'); // Populate customer details

        res.json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (err) {
        next(err);
    }
};

// @route   GET api/requests/my-requests
// @desc    Get current user's service requests
// @access  Private
export const getMyRequests = async (req, res, next) => {
    try {
        const requests = await Request.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .populate({
                path: 'assignedEmployee',
                populate: {
                    path: 'user',
                    select: 'name phone'
                }
            });

        res.json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (err) {
        next(err);
    }
};

// @route   GET api/requests/:id
// @desc    Get single request details
// @access  Private
export const getRequestById = async (req, res, next) => {
    try {
        const request = await Request.findById(req.params.id)
            .populate('user', 'name phone email')
            .populate({
                path: 'assignedEmployee',
                populate: {
                    path: 'user',
                    select: 'name phone'
                }
            });

        if (!request) {
            const err = new Error('Request not found');
            err.statusCode = 404;
            throw err;
        }

        // Ensure user owns the request (unless admin/employee/technician)
        if (
            request.user.toString() !== req.user.id &&
            req.user.role !== 'admin' &&
            req.user.role !== 'employee' &&
            req.user.role !== 'technician'
        ) {
            const err = new Error('Not authorized to view this request');
            err.statusCode = 401;
            throw err;
        }

        res.json({
            success: true,
            data: request
        });
    } catch (err) {
        next(err);
    }
};

// @route   PUT api/requests/:id/status
// @desc    Update request status (and handle job completion)
// @access  Private (Employee/Admin)
export const updateRequestStatus = async (req, res, next) => {
    try {
        const { status, workDetails } = req.body;
        const request = await Request.findById(req.params.id)
            .populate('user', 'name email') // Populate user for emails
            .populate('assignedEmployee', 'name'); // Populate employee if needed

        if (!request) {
            const err = new Error('Request not found');
            err.statusCode = 404;
            throw err;
        }

        // Only assigned employee (via Employee profile) or admin can update
        if (req.user.role !== 'admin') {
            const employee = await Employee.findOne({ user: req.user.id });
            if (!employee) {
                const err = new Error('Employee profile not found');
                err.statusCode = 404;
                throw err;
            }

            const assignedEmployeeId = (request.assignedEmployee?._id || request.assignedEmployee)?.toString();
            if (assignedEmployeeId !== employee._id.toString()) {
                const err = new Error('Not authorized to update this request');
                err.statusCode = 401;
                throw err;
            }
        }

        // Job Completion Logic
        if (status === 'completed' && request.status !== 'completed') {
            // 1. Update Work Details
            if (workDetails) {
                request.workDetails = {
                    ...request.workDetails,
                    ...workDetails
                };
            }

            // 2. Deduct Inventory
            if (workDetails?.partsUsed && workDetails.partsUsed.length > 0) {
                const Inventory = (await import('../models/Inventory.js')).default;

                for (const part of workDetails.partsUsed) {
                    if (part.inventoryItem) {
                        const item = await Inventory.findById(part.inventoryItem);
                        if (item) {
                            if (item.quantity < part.quantity) {
                                throw new Error(`Insufficient stock for ${item.name}. Available: ${item.quantity}`);
                            }
                            item.quantity -= part.quantity;
                            await item.save();
                        }
                    }
                }
            }

            request.status = 'completed';

            // NOTIFICATION: Job Completed & Invoice
            try {
                // Generate Invoice PDF - TODO: Implement getInvoiceBuffer in invoiceController
                /*
                const invoiceData = {
                    invoiceNumber: `INV-${request.serviceId}`,
                    customerName: request.user.name,
                    customerEmail: request.user.email,
                    totalAmount: request.workDetails?.totalCost || 0,
                    items: request.workDetails?.partsUsed.map(p => ({
                        name: p.name,
                        description: `Quantity: ${p.quantity}`,
                        amount: p.cost * p.quantity
                    })) || []
                };

                // Add Labor Cost
                if (request.workDetails?.laborCost) {
                    invoiceData.items.push({
                        name: 'Labor Charges',
                        description: 'Service Labor',
                        amount: request.workDetails.laborCost
                    });
                }

                // Generate PDF Buffer (we need a helper in invoiceController that returns a buffer)
                const { getInvoiceBuffer } = await import('./invoiceController.js');
                const pdfBuffer = await getInvoiceBuffer(invoiceData); // Need to implement this in invoiceController

                await sendEmail({
                    email: request.user.email,
                    subject: 'Service Completed & Invoice - AquaPure',
                    message: `Dear ${request.user.name},\n\nYour service request ${request.serviceId} has been completed.\n\nPlease find your invoice attached.\n\nThank you,\nAquaPure Team`,
                    attachments: [
                        {
                            filename: `Invoice-${request.serviceId}.pdf`,
                            content: pdfBuffer,
                            contentType: 'application/pdf'
                        }
                    ]
                });
                */
            } catch (emailErr) {
                console.error('Failed to send invoice email:', emailErr);
            }

        } else if (status) {
            // Handle Assignment Notification
            if (status === 'assigned' && request.status !== 'assigned') {
                // Notify User
                try {
                    await sendEmail({
                        email: request.user.email,
                        subject: 'Technician Assigned - AquaPure',
                        message: `Dear ${request.user.name},\n\nA technician has been assigned to your request ${request.serviceId}. They will contact you shortly.\n\nThank you,\nAquaPure Team`
                    });
                } catch (emailErr) {
                    console.error('Failed to send assignment email:', emailErr.message);
                }
            }

            request.status = status;
        }

        await request.save();

        res.json({
            success: true,
            data: request
        });

    } catch (err) {
        next(err);
    }
};

// @route   POST api/requests/:id/payment
// @desc    Record online payment for a completed request (idempotent)
// @access  Private (Client/Admin)
export const recordRequestPayment = async (req, res, next) => {
    try {
        const { paymentDetails } = req.body || {};
        const request = await Request.findById(req.params.id).populate('user', 'name email');
        if (!request) {
            const err = new Error('Request not found');
            err.statusCode = 404;
            throw err;
        }

        // Only owner or admin
        if (req.user.role !== 'admin' && request.user._id.toString() !== req.user.id) {
            const err = new Error('Not authorized to pay for this request');
            err.statusCode = 403;
            throw err;
        }

        if (request.status !== 'completed') {
            const err = new Error('Payment allowed only after completion');
            err.statusCode = 400;
            throw err;
        }

        if (!paymentDetails?.razorpay_payment_id) {
            const err = new Error('paymentDetails is required');
            err.statusCode = 400;
            throw err;
        }

        const ok = verifyRazorpaySignature(paymentDetails);
        if (!ok) {
            const err = new Error('Invalid payment signature');
            err.statusCode = 400;
            throw err;
        }

        const existingTx = await PaymentTransaction.findOne({ razorpay_payment_id: paymentDetails.razorpay_payment_id });
        if (existingTx?.contextType && existingTx.contextType !== 'service') {
            const err = new Error('Payment already used for another transaction');
            err.statusCode = 409;
            throw err;
        }
        if (existingTx?.contextType === 'service' && existingTx.contextId) {
            // idempotent return
            const already = await Request.findById(existingTx.contextId);
            if (already) {
                return res.json({ success: true, data: already, idempotent: true });
            }
        }

        const amount = paymentDetails?.amount || request.workDetails?.totalCost || request.costBreakdown?.totalAmount || 0;

        request.costBreakdown = {
            ...(request.costBreakdown || {}),
            totalAmount: amount,
            paymentStatus: 'paid',
            paymentMethod: 'online',
            transactionId: paymentDetails.razorpay_payment_id,
            paymentDate: new Date(),
            gatewayResponse: paymentDetails
        };

        await request.save();

        await PaymentTransaction.findOneAndUpdate(
            { razorpay_payment_id: paymentDetails.razorpay_payment_id },
            {
                user: request.user._id,
                provider: 'razorpay',
                razorpay_order_id: paymentDetails.razorpay_order_id,
                razorpay_payment_id: paymentDetails.razorpay_payment_id,
                razorpay_signature: paymentDetails.razorpay_signature,
                amount,
                currency: 'INR',
                status: 'linked',
                verifiedAt: new Date(),
                contextType: 'service',
                contextId: request._id,
                raw: paymentDetails
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.json({ success: true, data: request });
    } catch (err) {
        next(err);
    }
};


// @route   POST api/requests/:id/feedback
// @desc    Submit feedback for a completed service
// @access  Private (Client)
export const submitFeedback = async (req, res, next) => {
    try {
        const { rating, comment } = req.body;
        const request = await Request.findById(req.params.id);

        if (!request) {
            const err = new Error('Request not found');
            err.statusCode = 404;
            throw err;
        }

        // Ensure user owns the request
        if (request.user.toString() !== req.user.id) {
            const err = new Error('Not authorized to give feedback for this request');
            err.statusCode = 401;
            throw err;
        }

        // Ensure request is completed
        if (request.status !== 'completed') {
            const err = new Error('Feedback can only be submitted for completed services');
            err.statusCode = 400;
            throw err;
        }

        // Update feedback
        request.feedback = {
            rating,
            comment,
            submittedAt: Date.now()
        };

        await request.save();

        res.json({
            success: true,
            data: request
        });
    } catch (err) {
        next(err);
    }
};

// @route   PUT api/requests/:id/cancel
// @desc    Cancel a service request
// @access  Private (Client)
export const cancelRequest = async (req, res, next) => {
    try {
        const request = await Request.findById(req.params.id);

        if (!request) {
            const err = new Error('Request not found');
            err.statusCode = 404;
            throw err;
        }

        // Ensure user owns the request
        if (request.user.toString() !== req.user.id) {
            const err = new Error('Not authorized to cancel this request');
            err.statusCode = 401;
            throw err;
        }

        // Only allow cancellation if pending or assigned
        if (request.status !== 'pending' && request.status !== 'assigned') {
            const err = new Error('Cannot cancel a request that is already in progress or completed');
            err.statusCode = 400;
            throw err;
        }

        request.status = 'cancelled';
        await request.save();

        res.json({
            success: true,
            data: request
        });
    } catch (err) {
        next(err);
    }
};
