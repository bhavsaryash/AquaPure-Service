import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Shield,
  Wrench,
  Phone,
  TrendingUp
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { amcAPI, clientAPI } from '../../utils/api';

const ClientOverview: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await clientAPI.getServices();
      const requests = res.data || [];

      // Calculate Stats
      const totalServices = requests.length;
      const pendingServices = requests.filter((r: any) => r.status === 'pending' || r.status === 'in_progress').length;
      const runningServices = requests.filter((r: any) =>
        ['pending', 'assigned', 'in_progress'].includes(r.status)
      );

      let isActive = false;
      let amcStatus = 'inactive';
      let endDate = null;
      let servicesIncluded = 0;
      let servicesUsed = 0;

      try {
        const amcRes = await amcAPI.getMySubscription();
        if (amcRes.data) {
          const sub = amcRes.data;
          isActive = sub.status === 'active';
          amcStatus = sub.status;
          endDate = sub.endDate;
          servicesIncluded = sub.plan?.servicesPerYear || 0;
          servicesUsed = sub.servicesUsed || 0;
        }
      } catch (err) {
        // AMC not found or expired
      }

      const activeData = {
        overview: {
          totalServices,
          pendingServices,
          amcStatus, 
          isAMCActive: isActive,
          nextServiceDate: null, // Depending on AMC
          lastServiceDate: requests[0]?.completedDate || 'N/A'
        },
        runningServices,
        amcDetails: {
          isActive,
          endDate,
          servicesIncluded,
          servicesUsed,
        }
      };

      setDashboardData(activeData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const getAMCStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'expiring': return 'text-yellow-600 bg-yellow-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getServiceStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl shadow-lg text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
            <p className="text-green-100">
              Your RO system is well-maintained and running smoothly
            </p>
          </div>
          <div className="bg-white bg-opacity-20 p-4 rounded-full">
            <Wrench className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Services</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.overview?.totalServices || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Running Services</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.runningServices?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">AMC Status</p>
              <p className={`text-sm font-bold capitalize inline-flex items-center px-2.5 py-0.5 rounded-full ${getAMCStatusColor(dashboardData?.overview?.amcStatus)}`}>
                {dashboardData?.overview?.amcStatus || 'inactive'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Next Service</p>
              <p className="text-sm font-bold text-gray-900">
                {dashboardData?.overview?.nextServiceDate
                  ? new Date(dashboardData.overview.nextServiceDate).toLocaleDateString('en-IN')
                  : 'Not scheduled'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Running Services List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Running Services</h3>
          <button onClick={() => navigate('/client/services')} className="text-sm font-medium text-green-600 hover:text-green-500">
            View all
          </button>
        </div>

        <div className="p-6">
          {dashboardData?.runningServices?.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.runningServices.map((service: any) => (
                <div key={service._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center space-x-4">
                    {getServiceStatusIcon(service.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{service.serviceId}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {service.serviceType} - {new Date(service.createdAt).toLocaleDateString('en-IN')}
                      </p>
                      <p className="text-xs text-orange-600 font-medium mt-1 uppercase tracking-wide">
                        {service.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {service.assignedEmployee ? (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-medium text-gray-900">Technician: {service.assignedEmployee.user.name}</p>
                        <div className="flex items-center justify-end text-xs text-gray-500">
                          <Phone className="h-3 w-3 mr-1" />
                          {service.assignedEmployee.user.phone}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 italic">Assigning Technician...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-100 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Running Services</h4>
              <p className="text-sm text-gray-500 mb-4">
                All your services are completed. Need help?
              </p>
              <button onClick={() => navigate('/client/request')} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                Request Service
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button onClick={() => navigate('/client/request')} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow duration-200">
          <div className="bg-green-100 p-3 rounded-full mx-auto mb-3 w-fit">
            <Wrench className="h-6 w-6 text-green-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Request Service</h4>
          <p className="text-xs text-gray-500">Schedule a new service visit</p>
        </button>

        <button onClick={() => window.location.href = 'tel:9558641805'} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow duration-200">
          <div className="bg-blue-100 p-3 rounded-full mx-auto mb-3 w-fit">
            <Phone className="h-6 w-6 text-blue-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Emergency Call</h4>
          <p className="text-xs text-gray-500">24/7 emergency support</p>
        </button>

        <button onClick={() => navigate('/client/services')} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow duration-200">
          <div className="bg-purple-100 p-3 rounded-full mx-auto mb-3 w-fit">
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Service History</h4>
          <p className="text-xs text-gray-500">View past services</p>
        </button>
      </div>
    </div>
  );
};

export default ClientOverview;