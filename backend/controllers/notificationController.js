import Notification from '../models/Notification.js';

// @route   GET api/notifications
// @desc    Get all notifications for current user
// @access  Private
export const getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: notifications.length,
            data: notifications
        });
    } catch (err) {
        next(err);
    }
};

// @route   PUT api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
export const markRead = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            const err = new Error('Notification not found');
            err.statusCode = 404;
            throw err;
        }

        // Ensure user owns notification
        if (notification.user.toString() !== req.user.id) {
            const err = new Error('Not authorized to access this notification');
            err.statusCode = 401;
            throw err;
        }

        notification.read = true;
        await notification.save();

        res.json({
            success: true,
            data: notification
        });
    } catch (err) {
        next(err);
    }
};

// @route   PUT api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
export const markAllRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, read: false },
            { $set: { read: true } }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (err) {
        next(err);
    }
};

// @route   DELETE api/notifications/:id
// @desc    Delete notification
// @access  Private
export const deleteNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            const err = new Error('Notification not found');
            err.statusCode = 404;
            throw err;
        }

        if (notification.user.toString() !== req.user.id) {
            const err = new Error('Not authorized to access this notification');
            err.statusCode = 401;
            throw err;
        }

        await notification.deleteOne();

        res.json({
            success: true,
            message: 'Notification removed'
        });
    } catch (err) {
        next(err);
    }
};

// Helper function to create notification (for internal use)
export const createNotification = async ({ user, type, title, message, category, actionUrl }) => {
    try {
        await Notification.create({
            user,
            type,
            title,
            message,
            category,
            actionUrl
        });
    } catch (err) {
        console.error('Error creating notification:', err);
    }
};

// @route   POST api/notifications/seed
// @desc    Seed notifications for testing (Clear old, add Jan-Feb 2026)
// @access  Private
export const seedNotifications = async (req, res, next) => {
    try {
        // 1. Delete all notifications for current user
        await Notification.deleteMany({ user: req.user.id });

        // 2. Create new notifications for Jan 1, 2026 - Feb 15, 2026
        const notifications = [
            {
                user: req.user.id,
                type: 'success',
                title: 'Service Completed',
                message: 'Service SRV20260001 has been completed successfully.',
                category: 'service',
                actionUrl: '/services/SRV20260001',
                createdAt: new Date('2026-02-14T10:30:00Z'), // Feb 14
                read: false
            },
            {
                user: req.user.id,
                type: 'info',
                title: 'New Service Assignment',
                message: 'Technician Rajesh has been assigned to your request.',
                category: 'service',
                actionUrl: '/services/SRV20260002',
                createdAt: new Date('2026-02-10T09:15:00Z'), // Feb 10
                read: true
            },
            {
                user: req.user.id,
                type: 'warning',
                title: 'Payment Reminder',
                message: 'Payment for service SRV20260003 is pending.',
                category: 'payment',
                actionUrl: '/services/SRV20260003',
                createdAt: new Date('2026-01-25T16:45:00Z'), // Jan 25
                read: true
            },
            {
                user: req.user.id,
                type: 'success',
                title: 'Feedback Received',
                message: 'Thank you for your feedback! We are glad you liked our service.',
                category: 'feedback',
                createdAt: new Date('2026-01-15T14:20:00Z'), // Jan 15
                read: true
            },
            {
                user: req.user.id,
                type: 'info',
                title: 'System Maintenance',
                message: 'Scheduled maintenance on Jan 10, 2026 from 2 AM to 4 AM.',
                category: 'system',
                createdAt: new Date('2026-01-05T12:00:00Z'), // Jan 5
                read: true
            }
        ];

        await Notification.insertMany(notifications);

        res.json({
            success: true,
            message: 'Notifications seeded for 2026',
            count: notifications.length
        });
    } catch (err) {
        next(err);
    }
};
