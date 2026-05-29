import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle,
  TrendingUp,
  MapPin,
  User,
  Phone,
  Star,
  Wrench,
  Target
} from 'lucide-react';
import { employeeAPI } from '../../utils/api';
import JobCompletionModal from './JobCompletionModal';
import { toast } from 'react-hot-toast';
import LiveLocationControl from './LiveLocationControl';
import { useNavigate } from 'react-router-dom';

interface DashboardData {
  overview: {
    todayAssignments: number;
    completedToday: number;
    pendingAssignments: number;
    monthlyTarget: number;
    monthlyCompleted: number;
    averageRating: number | string;
    totalRevenue: number;
  };
  todaySchedule: any[];
  recentFeedback: any[];
  weeklyStats: {
    servicesCompleted: number;
    averageTime: number;
    customerSatisfaction: number | string;
    revenue: number;
  };
}

const EmployeeOverview: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await employeeAPI.getDashboard(); // Updated to use imported employeeAPI from props or import
      setDashboardData(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await employeeAPI.updateStatus(id, 'in_progress');
      toast.success('Assignment started');
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to start assignment:', error);
      toast.error('Failed to start assignment');
    }
  };

  const handleComplete = (job: any) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: any) => {
    if (!selectedJob?._id) return;
    await employeeAPI.completeService(selectedJob._id, data);
    toast.success('Job marked as completed!');
    setIsModalOpen(false);
    setSelectedJob(null);
    await fetchDashboardData();
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
        return <Clock className="h-5 w-5 text-gray-500" />;
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
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl shadow-lg text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Good morning!</h2>
            <p className="text-orange-100">
              You have {dashboardData?.overview?.todayAssignments || 0} assignments scheduled for today
            </p>
          </div>
          <div className="bg-white bg-opacity-20 p-4 rounded-full">
            <Wrench className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      <LiveLocationControl />

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Today's Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.overview?.todayAssignments || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.overview?.completedToday || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.overview?.averageRating || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Monthly Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData?.overview?.monthlyTarget
                  ? Math.round((dashboardData.overview.monthlyCompleted / dashboardData.overview.monthlyTarget) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
          <a href="/employee/assignments" className="text-sm font-medium text-orange-600 hover:text-orange-500">
            View all assignments
          </a>
        </div>

        <div className="p-6">
          {dashboardData?.todaySchedule?.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.todaySchedule.map((assignment) => (
                <div key={assignment._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(assignment.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">{assignment.serviceId}</p>
                        <span className={getStatusBadge(assignment.status)}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 capitalize">
                        {assignment.serviceType} - {assignment.preferredTime || 'Any time'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-900">{assignment.user?.name || 'Unknown Client'}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <MapPin className="h-3 w-3 mr-1" />
                        {assignment.address?.line1 || 'No Address'}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Phone className="h-3 w-3 mr-1" />
                        {assignment.user?.phone || 'N/A'}
                      </div>
                    </div>

                    {assignment.status === 'assigned' && (
                      <button
                        onClick={() => handleStart(assignment._id)}
                        className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                      >
                        Start
                      </button>
                    )}
                    {assignment.status === 'in_progress' && (
                      <button
                        onClick={() => handleComplete(assignment)}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Assignments Today</h4>
              <p className="text-sm text-gray-500">
                Enjoy your free day or check for new assignments
              </p>
            </div>
          )}
        </div>
      </div>

      <JobCompletionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedJob(null);
        }}
        onSubmit={handleModalSubmit}
        serviceType={selectedJob?.serviceType || ''}
      />

      {/* Performance Overview & Recent Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-6 w-6 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">This Week's Performance</h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Services Completed</span>
              <span className="text-lg font-bold text-gray-900">{dashboardData?.weeklyStats?.servicesCompleted}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Average Service Time</span>
              <span className="text-lg font-bold text-gray-900">{dashboardData?.weeklyStats?.averageTime} min</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Customer Satisfaction</span>
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                <span className="text-lg font-bold text-gray-900">{dashboardData?.weeklyStats?.customerSatisfaction}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Revenue Generated</span>
              <span className="text-lg font-bold text-gray-900">₹{dashboardData?.weeklyStats?.revenue?.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-orange-500 mr-2" />
              <span className="text-sm font-medium text-orange-800">Great performance this week!</span>
            </div>
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Star className="h-6 w-6 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Customer Feedback</h3>
          </div>

          <div className="space-y-4">
            {dashboardData?.recentFeedback?.map((feedback) => (
              <div key={feedback.id} className="border-l-4 border-orange-400 pl-4 py-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">{feedback.customerName}</p>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                    <span className="text-sm font-medium">{feedback.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{feedback.comment}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{feedback.serviceType}</span>
                  <span>{new Date(feedback.date).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>

          {dashboardData?.recentFeedback?.length === 0 && (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Recent Feedback</h4>
              <p className="text-sm text-gray-500">
                Complete more services to receive customer feedback
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Target Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Target Progress</h3>
          <span className="text-sm text-gray-500">
            {dashboardData?.overview?.monthlyCompleted} / {dashboardData?.overview?.monthlyTarget} services
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-orange-600 h-3 rounded-full transition-all duration-300"
            style={{
              width: `${(dashboardData?.overview?.monthlyCompleted / dashboardData?.overview?.monthlyTarget) * 100}%`
            }}
          ></div>
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>
            {dashboardData?.overview?.monthlyTarget - dashboardData?.overview?.monthlyCompleted} services remaining
          </span>
          <span>
            {Math.round((dashboardData?.overview?.monthlyCompleted / dashboardData?.overview?.monthlyTarget) * 100)}% complete
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          onClick={() => navigate('/employee/assignments')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow duration-200"
        >
          <div className="bg-orange-100 p-3 rounded-full mx-auto mb-3 w-fit">
            <Calendar className="h-6 w-6 text-orange-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">View Assignments</h4>
          <p className="text-xs text-gray-500">Check all your service assignments</p>
        </button>

        <button 
          onClick={() => navigate('/employee/performance')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow duration-200"
        >
          <div className="bg-blue-100 p-3 rounded-full mx-auto mb-3 w-fit">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Performance</h4>
          <p className="text-xs text-gray-500">View detailed performance metrics</p>
        </button>

        <button 
          onClick={() => navigate('/employee/profile')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow duration-200"
        >
          <div className="bg-green-100 p-3 rounded-full mx-auto mb-3 w-fit">
            <User className="h-6 w-6 text-green-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">Profile</h4>
          <p className="text-xs text-gray-500">Update your profile information</p>
        </button>
      </div>
    </div>
  );
};

export default EmployeeOverview;