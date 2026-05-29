import Request from '../models/Request.js';
import Employee from '../models/Employee.js';

// @desc    Get employee dashboard statistics
// @route   GET /api/employee/dashboard
// @access  Private/Employee
export const getDashboardStats = async (req, res) => {
    try {
        // Find employee profile for current user
        const employee = await Employee.findOne({ user: req.user.id });
        if (!employee) {
            return res.status(404).json({ message: 'Employee profile not found' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // 1. Today's Assignments
        const todayAssignments = await Request.find({
            assignedEmployee: employee._id,
            preferredDate: { $gte: today, $lt: tomorrow },
            status: { $in: ['assigned', 'in_progress', 'completed'] }
        }).populate('user', 'name phone address').sort({ preferredTime: 1 });

        // 2. Overview Stats
        const completedToday = todayAssignments.filter(r => r.status === 'completed').length;
        const pendingAssignments = todayAssignments.filter(r => r.status === 'assigned').length;

        const monthlyCompleted = await Request.countDocuments({
            assignedEmployee: employee._id,
            status: 'completed',
            updatedAt: { $gte: startOfMonth }
        });

        // 3. Performance (Avg Rating & Revenue) - Aggregate
        const performanceStats = await Request.aggregate([
            {
                $match: {
                    assignedEmployee: employee._id,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: "$feedback.rating" },
                    totalRevenue: { $sum: "$costBreakdown.totalAmount" } // Assuming this field exists and is populated
                }
            }
        ]);

        const avgRating = performanceStats.length > 0 ? (performanceStats[0].avgRating || 0).toFixed(1) : 0;
        const totalRevenue = performanceStats.length > 0 ? performanceStats[0].totalRevenue || 0 : 0;

        // 4. Recent Feedback
        const recentFeedback = await Request.find({
            assignedEmployee: employee._id,
            "feedback.rating": { $exists: true }
        })
            .sort({ "feedback.submittedAt": -1 })
            .limit(5)
            .select('feedback serviceType user')
            .populate('user', 'name');

        // Format feedback
        const formattedFeedback = recentFeedback.map(r => ({
            id: r._id,
            customerName: r.user.name,
            rating: r.feedback.rating,
            comment: r.feedback.comment,
            date: r.feedback.submittedAt,
            serviceType: r.serviceType
        }));

        res.json({
            overview: {
                todayAssignments: todayAssignments.length,
                completedToday,
                pendingAssignments,
                monthlyTarget: 50, // Hardcoded target for now
                monthlyCompleted,
                averageRating: avgRating,
                totalRevenue
            },
            todaySchedule: todayAssignments,
            recentFeedback: formattedFeedback,
            // Weekly mock for now or calculate real
            weeklyStats: {
                servicesCompleted: 12, // Placeholder
                averageTime: 85,      // Placeholder
                customerSatisfaction: avgRating,
                revenue: totalRevenue / 4 // Rough estimate
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get employee detailed performance
// @route   GET /api/employee/performance
// @access  Private/Employee
export const getPerformanceStats = async (req, res) => {
    try {
        const employee = await Employee.findOne({ user: req.user.id });
        if (!employee) {
            return res.status(404).json({ message: 'Employee profile not found' });
        }

        // 1. Overall Stats
        const totalServices = await Request.countDocuments({
            assignedEmployee: employee._id,
            status: 'completed'
        });

        const performanceStats = await Request.aggregate([
            {
                $match: {
                    assignedEmployee: employee._id,
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: "$feedback.rating" },
                    totalRevenue: { $sum: "$costBreakdown.totalAmount" }
                }
            }
        ]);

        const avgRating = performanceStats.length > 0 ? (performanceStats[0].avgRating || 0).toFixed(1) : 0;
        const totalRevenue = performanceStats.length > 0 ? performanceStats[0].totalRevenue || 0 : 0;

        // 2. Monthly Stats (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const monthlyStatsAggregation = await Request.aggregate([
            {
                $match: {
                    assignedEmployee: employee._id,
                    status: 'completed',
                    updatedAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $month: "$updatedAt" },
                    services: { $sum: 1 },
                    revenue: { $sum: "$costBreakdown.totalAmount" },
                    rating: { $avg: "$feedback.rating" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Format monthly stats
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyStats = [];

        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - 5 + i);
            const monthIndex = d.getMonth();

            const stats = monthlyStatsAggregation.find(s => s._id === monthIndex + 1);

            monthlyStats.push({
                month: monthNames[monthIndex],
                services: stats ? stats.services : 0,
                revenue: stats ? stats.revenue : 0,
                rating: stats ? (stats.rating || 0).toFixed(1) : 0
            });
        }

        // 3. Recent Feedback (Reuse logic)
        const recentFeedback = await Request.find({
            assignedEmployee: employee._id,
            "feedback.rating": { $exists: true }
        })
            .sort({ "feedback.submittedAt": -1 })
            .limit(5)
            .select('feedback serviceType user')
            .populate('user', 'name');

        const formattedFeedback = recentFeedback.map(r => ({
            id: r._id,
            customerName: r.user.name,
            rating: r.feedback.rating,
            comment: r.feedback.comment,
            date: r.feedback.submittedAt,
            serviceType: r.serviceType
        }));


        res.json({
            overview: {
                totalServices,
                completedServices: totalServices,
                averageRating: avgRating,
                totalRevenue,
                averageServiceTime: 85, // Placeholder
                completionRate: 95 // Placeholder
            },
            monthlyStats,
            recentFeedback: formattedFeedback,
            achievements: [ // Mock for now
                {
                    id: 1,
                    title: 'Customer Favorite',
                    description: 'Maintained 4.5+ rating',
                    icon: 'heart',
                    earned: Number(avgRating) >= 4.5,
                    progress: (Number(avgRating) / 5) * 100
                }
            ],
            targets: { // Mock for now
                monthlyServices: { current: monthlyStats[monthlyStats.length - 1]?.services || 0, target: 50, percentage: 50 },
                customerSatisfaction: { current: Number(avgRating), target: 4.5, percentage: 100 },
                revenue: { current: totalRevenue, target: 100000, percentage: 60 }
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
