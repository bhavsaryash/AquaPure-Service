import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Wrench,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  BarChart3,
  Activity
} from 'lucide-react';
import { adminAPI } from '../../utils/api';

interface DashboardData {
  overview: {
    totalClients: number;
    totalEmployees: number;
    activeServices: number;
    monthlyRevenue: number;
    completedServices: number;
    pendingServices: number;
    averageRating: number;
    amcSubscriptions: number;
  };
  recentServices: any[];
  topEmployees: any[];
  monthlyStats: {
    labels: string[];
    services: number[];
    revenue: number[];
  };
}

const AdminOverview: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const data = await adminAPI.getStats();
      setDashboardData(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data. Please check your connection or try again.');
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'assigned':
        return <Calendar className="h-5 w-5 text-purple-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize";

    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'in_progress':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'assigned':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Database Connection Error</h3>
        <p className="text-gray-500 mt-2">{error}</p>
        <button
          onClick={() => { setLoading(true); fetchDashboardData(); }}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-xl shadow-lg text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
            <p className="text-red-100">
              System overview and management console
            </p>
          </div>
          <div className="bg-white bg-opacity-20 p-4 rounded-full">
            <Activity className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.overview?.totalClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Employees</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.overview?.totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Wrench className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Services</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.overview?.activeServices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{dashboardData?.overview?.monthlyRevenue?.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed Services</p>
              <p className="text-2xl font-bold text-green-600">{dashboardData?.overview?.completedServices}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Services</p>
              <p className="text-2xl font-bold text-yellow-600">{dashboardData?.overview?.pendingServices}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Average Rating</p>
              <p className="text-2xl font-bold text-blue-600">{dashboardData?.overview?.averageRating}</p>
            </div>
            <Star className="h-8 w-8 text-yellow-500 fill-current" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">AMC Subscriptions</p>
              <p className="text-2xl font-bold text-purple-600">{dashboardData?.overview?.amcSubscriptions}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Recent Services & Top Employees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Services */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Services</h3>
            <a href="/admin/services" className="text-sm font-medium text-red-600 hover:text-red-500">
              View all
            </a>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {dashboardData?.recentServices?.map((service) => (
                <div key={service._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(service.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{service.serviceId}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {service.serviceType} - {service.user?.name || 'Unknown Client'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Technician: {service.assignedEmployee?.user?.name || 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={getStatusBadge(service.status)}>
                      {service.status.replace('_', ' ')}
                    </span>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      ₹{(service.costBreakdown?.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Employees */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
            <a href="/admin/employees" className="text-sm font-medium text-red-600 hover:text-red-500">
              View all
            </a>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {dashboardData?.topEmployees?.map((employee, index) => (
                <div key={employee._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="bg-red-100 p-2 rounded-full">
                      <span className="text-red-600 font-bold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{employee.user.name}</p>
                      <p className="text-xs text-gray-500">
                        {employee.completedServices} services completed
                      </p>
                      <div className="flex items-center mt-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                        <span className="text-xs text-gray-600">{employee.averageRating}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ₹{employee.revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Performance Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Performance</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Services</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Revenue (₹000s)</span>
            </div>
          </div>
        </div>

        <div className="h-64 flex items-end justify-between space-x-4">
          {dashboardData?.monthlyStats?.labels?.map((month, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex items-end justify-center space-x-1 mb-2" style={{ height: '200px' }}>
                <div
                  className="bg-red-500 rounded-t"
                  style={{
                    width: '20px',
                    height: `${(dashboardData.monthlyStats.services[index] / 120) * 200}px`
                  }}
                ></div>
                <div
                  className="bg-blue-500 rounded-t"
                  style={{
                    width: '20px',
                    height: `${(dashboardData.monthlyStats.revenue[index] / 350000) * 200}px`
                  }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow duration-200">
          <div className="bg-blue-100 p-3 rounded-full mx-auto mb-3 w-fit">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Manage Clients</h4>
          <p className="text-xs text-gray-500">View and manage client accounts</p>
        </button>

        <button className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow duration-200">
          <div className="bg-green-100 p-3 rounded-full mx-auto mb-3 w-fit">
            <UserCheck className="h-6 w-6 text-green-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Manage Employees</h4>
          <p className="text-xs text-gray-500">Add and manage technicians</p>
        </button>

        <button className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow duration-200">
          <div className="bg-orange-100 p-3 rounded-full mx-auto mb-3 w-fit">
            <Wrench className="h-6 w-6 text-orange-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Service Management</h4>
          <p className="text-xs text-gray-500">Assign and track services</p>
        </button>

        <button className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow duration-200">
          <div className="bg-purple-100 p-3 rounded-full mx-auto mb-3 w-fit">
            <BarChart3 className="h-6 w-6 text-purple-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Reports</h4>
          <p className="text-xs text-gray-500">View detailed analytics</p>
        </button>
      </div>
    </div>
  );
};

export default AdminOverview;