import User from '../models/User.js';
import Request from '../models/Request.js';
import bcrypt from 'bcryptjs';
import { createNotification } from './notificationController.js';

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getSystemStats = async (req, res) => {
    try {
        const User = (await import('../models/User.js')).default;
        const Request = (await import('../models/Request.js')).default;
        const AMCSubscription = (await import('../models/AMCSubscription.js')).default;
        const Employee = (await import('../models/Employee.js')).default;

        const totalUsers = await User.countDocuments({ role: 'client' });
        const totalEmployees = await Employee.countDocuments();
        const totalRequests = await Request.countDocuments();
        const pendingRequests = await Request.countDocuments({ status: 'pending' });
        const completedRequests = await Request.countDocuments({ status: 'completed' });
        const activeServices = await Request.countDocuments({ status: { $in: ['assigned', 'in_progress'] } });
        const amcSubscriptions = await AMCSubscription.countDocuments({ status: 'active' });

        // Calculate total revenue from completed requests
        const revenue = await Request.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: "$costBreakdown.totalAmount" } } }
        ]);

        const totalRevenue = revenue.length > 0 ? revenue[0].total : 0;

        // Recent Services
        const recentServices = await Request.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name')
            .populate('assignedEmployee', 'name');

        // Top Employees (by completed services)
        // This is a simplified version. Ideally aggregate on Request collection.
        const topEmployeesAggregation = await Request.aggregate([
            { $match: { status: 'completed', assignedEmployee: { $exists: true } } },
            {
                $group: {
                    _id: "$assignedEmployee",
                    completedServices: { $sum: 1 },
                    revenue: { $sum: "$costBreakdown.totalAmount" },
                    averageRating: { $avg: "$feedback.rating" }
                }
            },
            { $sort: { completedServices: -1 } },
            { $limit: 3 }
        ]);

        const topEmployees = await Employee.populate(topEmployeesAggregation, { path: '_id', populate: { path: 'user', select: 'name' } });

        // Format for frontend: map _id to user/employee object structure
        const formattedTopEmployees = topEmployees.map(emp => ({
            _id: emp._id._id,
            user: emp._id.user,
            completedServices: emp.completedServices,
            revenue: emp.revenue,
            averageRating: emp.averageRating ? emp.averageRating.toFixed(1) : 'N/A'
        }));


        // Monthly Stats (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const monthlyStatsAggregation = await Request.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 },
                    revenue: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "completed"] }, "$costBreakdown.totalAmount", 0]
                        }
                    }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const labels = [];
        const serviceCounts = [];
        const revenueCounts = [];

        // Fill in missing months
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - 5 + i);
            const monthIndex = d.getMonth();
            const year = d.getFullYear();

            const stats = monthlyStatsAggregation.find(s => s._id === monthIndex + 1);

            labels.push(monthNames[monthIndex]);
            serviceCounts.push(stats ? stats.count : 0);
            revenueCounts.push(stats ? stats.revenue : 0);
        }

        res.json({
            overview: {
                totalClients: totalUsers,
                totalEmployees,
                activeServices,
                monthlyRevenue: totalRevenue, // Total Revenue for now, or calculate specifically for this month
                completedServices: completedRequests,
                pendingServices: pendingRequests,
                averageRating: 4.5, // Placeholder for now
                amcSubscriptions
            },
            recentServices,
            topEmployees: formattedTopEmployees,
            monthlyStats: {
                labels,
                services: serviceCounts,
                revenue: revenueCounts
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get distinct reports
// @route   GET /api/admin/reports/:type
// @access  Private/Admin
export const getReportData = async (req, res) => {
    try {
        const { type } = req.params;
        const { period } = req.query; // week, month, year

        const Request = (await import('../models/Request.js')).default;
        const AMCSubscription = (await import('../models/AMCSubscription.js')).default;
        const AMCPlan = (await import('../models/AMCPlan.js')).default;

        const now = new Date();
        const start = new Date(now);
        if (period === 'week') {
            start.setDate(now.getDate() - 7);
        } else if (period === 'quarter') {
            start.setMonth(now.getMonth() - 3);
        } else if (period === 'year') {
            start.setFullYear(now.getFullYear() - 1);
        } else {
            // default month
            start.setMonth(now.getMonth() - 1);
        }

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const totalRevenue = await Request.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: "$costBreakdown.totalAmount" } } }
        ]);

        const realRevenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;
        const totalServices = await Request.countDocuments({ status: 'completed' });

        // Service revenue in selected period
        const serviceRevenuePeriodAgg = await Request.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: start } } },
            { $group: { _id: null, total: { $sum: "$costBreakdown.totalAmount" } } }
        ]);
        const serviceRevenuePeriod = serviceRevenuePeriodAgg.length ? serviceRevenuePeriodAgg[0].total : 0;

        // AMC revenue: sum plan.price for subscriptions created in selected period (most reliable)
        const amcRevenuePeriodAgg = await AMCSubscription.aggregate([
            { $match: { createdAt: { $gte: start } } },
            {
                $lookup: {
                    from: 'amcplans',
                    localField: 'plan',
                    foreignField: '_id',
                    as: 'planDoc'
                }
            },
            { $unwind: "$planDoc" },
            { $group: { _id: null, total: { $sum: "$planDoc.price" } } }
        ]);
        const amcRevenuePeriod = amcRevenuePeriodAgg.length ? amcRevenuePeriodAgg[0].total : 0;

        // Monthly AMC revenue (last 6 months)
        const amcMonthlyAgg = await AMCSubscription.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $lookup: {
                    from: 'amcplans',
                    localField: 'plan',
                    foreignField: '_id',
                    as: 'planDoc'
                }
            },
            { $unwind: "$planDoc" },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    revenue: { $sum: "$planDoc.price" },
                    subscriptions: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // Monthly service revenue (last 6 months)
        const serviceMonthlyAgg = await Request.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    revenue: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "completed"] }, "$costBreakdown.totalAmount", 0]
                        }
                    },
                    services: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const labels = [];
        const revenueSeries = [];
        const servicesSeries = [];
        const clientsSeries = [];
        const amcRevenueSeries = [];
        const amcSubsSeries = [];

        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - 5 + i);
            const monthIndex = d.getMonth();
            const year = d.getFullYear();
            labels.push(monthNames[monthIndex]);

            const svc = serviceMonthlyAgg.find(s => s._id.month === monthIndex + 1 && s._id.year === year);
            const amc = amcMonthlyAgg.find(a => a._id.month === monthIndex + 1 && a._id.year === year);

            revenueSeries.push((svc?.revenue || 0) + (amc?.revenue || 0));
            servicesSeries.push(svc?.services || 0);
            clientsSeries.push(0); // placeholder; needs historical user creation data
            amcRevenueSeries.push(amc?.revenue || 0);
            amcSubsSeries.push(amc?.subscriptions || 0);
        }

        const activeAMC = await AMCSubscription.countDocuments({ status: 'active' });
        const expiredAMC = await AMCSubscription.countDocuments({ status: 'expired' });
        const totalAMC = await AMCSubscription.countDocuments({});

        const expiringSoon = await AMCSubscription.find({
            status: 'active',
            endDate: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) }
        })
            .populate('user', 'name email phone')
            .populate('plan', 'name')
            .sort({ endDate: 1 })
            .limit(10);

        const topPlansAgg = await AMCSubscription.aggregate([
            {
                $group: {
                    _id: "$plan",
                    subscriptions: { $sum: 1 }
                }
            },
            { $sort: { subscriptions: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'amcplans',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'planDoc'
                }
            },
            { $unwind: "$planDoc" },
            {
                $project: {
                    _id: 0,
                    planId: "$planDoc._id",
                    name: "$planDoc.name",
                    price: "$planDoc.price",
                    subscriptions: 1
                }
            }
        ]);

        const renewalRate = totalAMC ? Math.round((activeAMC / totalAMC) * 1000) / 10 : 0;

        const reportDataBase = {
            overview: {
                totalRevenue: (serviceRevenuePeriod + amcRevenuePeriod) || realRevenue,
                totalServices: totalServices,
                averageRating: 4.6,
                clientGrowth: 12.5,
                employeeUtilization: 85.2,
                amcRenewalRate: renewalRate
            },
            monthlyTrends: {
                labels,
                revenue: revenueSeries,
                services: servicesSeries,
                clients: clientsSeries
            },
            serviceBreakdown: {
                maintenance: await Request.countDocuments({ serviceType: 'maintenance' }),
                repair: await Request.countDocuments({ serviceType: 'repair' }),
                installation: await Request.countDocuments({ serviceType: 'installation' })
            },
            // ... retain other structures as mock for now to keep UI intact
            topPerformers: [
                { name: 'Demo Tech 1', services: 10, rating: 4.8, revenue: 15000 },
                { name: 'Demo Tech 2', services: 8, rating: 4.5, revenue: 12000 }
            ],
            clientAnalytics: {
                totalClients: 50,
                activeAMC: activeAMC,
                newThisMonth: 5,
                churnRate: 2
            },
            financialSummary: {
                totalRevenue: (serviceRevenuePeriod + amcRevenuePeriod) || realRevenue,
                amcRevenue: amcRevenuePeriod,
                serviceRevenue: serviceRevenuePeriod,
                pendingPayments: 5000,
                profitMargin: 30
            },
        };

        if (type === 'amc') {
            return res.json({
                ...reportDataBase,
                amcAnalytics: {
                    active: activeAMC,
                    expired: expiredAMC,
                    total: totalAMC,
                    revenuePeriod: amcRevenuePeriod,
                    revenueLast6Months: { labels, revenue: amcRevenueSeries, subscriptions: amcSubsSeries },
                    topPlans: topPlansAgg,
                    expiringSoon: expiringSoon.map(s => ({
                        _id: s._id,
                        endDate: s.endDate,
                        servicesRemaining: s.servicesRemaining,
                        user: s.user,
                        plan: s.plan
                    }))
                }
            });
        }

        // default: keep existing report types using the enriched base data
        return res.json(reportDataBase);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all employees
// @route   GET /api/admin/employees
// @access  Private/Admin
export const getEmployees = async (req, res) => {
    try {
        const Employee = (await import('../models/Employee.js')).default;
        const employees = await Employee.find({}).populate('user', '-password');
        res.json(employees);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create new employee
// @route   POST /api/admin/employees
// @access  Private/Admin
export const createEmployee = async (req, res) => {
    try {
        const { name, email, phone, password, specialization, experience, location, salary, emergencyContact, address } = req.body;
        const User = (await import('../models/User.js')).default;
        const Employee = (await import('../models/Employee.js')).default;

        // 1. Create User
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            role: 'technician',
            address
        });

        // 2. Create Employee Profile
        const employeeCount = await Employee.countDocuments();
        const employeeId = `EMP${String(employeeCount + 1).padStart(3, '0')}`;

        const employee = await Employee.create({
            user: user._id,
            employeeId,
            specialization,
            experience,
            location,
            salary,
            emergencyContact
        });

        const fullEmployee = await Employee.findById(employee._id).populate('user', '-password');
        res.status(201).json(fullEmployee);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update employee
// @route   PUT /api/admin/employees/:id
// @access  Private/Admin
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, specialization, experience, location, salary, status, address } = req.body;

        const Employee = (await import('../models/Employee.js')).default;
        const User = (await import('../models/User.js')).default;

        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Update User details
        const user = await User.findById(employee.user);
        if (user) {
            user.name = name || user.name;
            user.email = email || user.email;
            user.phone = phone || user.phone;
            if (address) user.address = address;

            // If password is provided (optional feature for admin to reset)
            // if (req.body.password) user.password = req.body.password;

            await user.save();
        }

        // Update Employee details
        employee.specialization = specialization || employee.specialization;
        employee.experience = experience || employee.experience;
        employee.location = location || employee.location;
        employee.salary = salary || employee.salary;
        employee.status = status || employee.status;

        await employee.save();

        const updatedEmployee = await Employee.findById(id).populate('user', '-password');
        res.json(updatedEmployee);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete employee
// @route   DELETE /api/admin/employees/:id
// @access  Private/Admin
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const Employee = (await import('../models/Employee.js')).default;
        const User = (await import('../models/User.js')).default;

        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Delete User and Employee
        await User.findByIdAndDelete(employee.user);
        await Employee.findByIdAndDelete(id);

        res.json({ message: 'Employee removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Assign service to employee
// @route   POST /api/admin/services/assign
// @access  Private/Admin
export const assignServiceRequest = async (req, res) => {
    try {
        const { serviceId, employeeId } = req.body;

        const Request = (await import('../models/Request.js')).default;
        const Employee = (await import('../models/Employee.js')).default;

        const request = await Request.findOne({ serviceId });
        if (!request) {
            return res.status(404).json({ message: 'Service Request not found' });
        }

        const employee = await Employee.findById(employeeId).populate('user');
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        request.assignedEmployee = employee._id;
        request.status = 'assigned';

        await request.save();

        // Notify Technician (User)
        await createNotification({
            user: employee.user?._id || employee.user,
            type: 'info',
            title: 'New Service Assignment',
            message: `You have been assigned service request ${request.serviceId}.`,
            category: 'service',
            actionUrl: `/employee/service/${request._id}`
        });

        res.json({ message: 'Service assigned successfully', request });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all users (consumers/clients)
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
    try {
        const User = (await import('../models/User.js')).default;
        const users = await User.find({ role: 'client' }).select('-password');
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all service requests
// @route   GET /api/admin/requests
// @access  Private/Admin
export const getAllRequests = async (req, res) => {
    try {
        const Request = (await import('../models/Request.js')).default;
        const requests = await Request.find({})
            .populate('user', 'name phone address')
            .populate({
                path: 'assignedEmployee',
                populate: { path: 'user', select: 'name phone' }
            })
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update service request by Admin
// @route   PUT /api/admin/requests/:id
// @access  Private/Admin
export const updateServiceRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, urgency, issueDescription } = req.body;

        const request = await Request.findById(id).populate('user', 'name phone address').populate({
            path: 'assignedEmployee',
            populate: { path: 'user', select: 'name phone' }
        });
        
        if (!request) {
            return res.status(404).json({ message: 'Service not found' });
        }

        if (status) request.status = status;
        if (urgency) request.urgency = urgency;
        if (issueDescription) request.issueDescription = issueDescription;

        await request.save();

        res.json({ message: 'Service updated successfully', request });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
