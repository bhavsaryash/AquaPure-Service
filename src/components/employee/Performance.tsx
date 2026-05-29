import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  DollarSign,
  Award,
  Star,
  Clock
} from 'lucide-react';
import { employeeAPI } from '../../utils/api';

interface PerformanceData {
  overview: {
    totalServices: number;
    completedServices: number;
    averageRating: number | string;
    totalRevenue: number;
    averageServiceTime: number;
    completionRate: number;
  };
  monthlyStats: any[];
  recentFeedback: any[];
  achievements: any[];
  targets: {
    monthlyServices: { current: number; target: number; percentage: number };
    customerSatisfaction: { current: number; target: number; percentage: number };
    revenue: { current: number; target: number; percentage: number };
  };
}

const Performance: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedPeriod]);

  const fetchPerformanceData = async () => {
    try {
      const data = await employeeAPI.getPerformance();
      setPerformanceData(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
      setLoading(false);
    }
  };

  const getAchievementIcon = (iconType: string) => {
    switch (iconType) {
      case 'star':
        return <Star className="h-6 w-6 text-yellow-500" />;
      case 'clock':
        return <Clock className="h-6 w-6 text-blue-500" />;
      case 'heart':
        return <Award className="h-6 w-6 text-red-500" />;
      default:
        return <Award className="h-6 w-6 text-gray-500" />;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your service performance and achievements
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Services Completed</p>
              <p className="text-2xl font-bold text-gray-900">{performanceData?.overview?.completedServices || 0}</p>
              <p className="text-xs text-green-600">
                {performanceData?.overview?.completionRate || 0}% completion rate
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{performanceData?.overview?.averageRating || 0}</p>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${star <= Math.floor(Number(performanceData?.overview?.averageRating || 0))
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Revenue Generated</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{(performanceData?.overview?.totalRevenue || 0).toLocaleString()}
              </p>
              <p className="text-xs text-blue-600">This month</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Service Time</p>
              <p className="text-2xl font-bold text-gray-900">{performanceData?.overview?.averageServiceTime || 0}m</p>
              <p className="text-xs text-purple-600">Per service</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Targets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Targets</h3>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Services Completed</span>
              <span className="text-sm text-gray-500">
                {performanceData?.targets?.monthlyServices?.current || 0} / {performanceData?.targets?.monthlyServices?.target || 50}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${performanceData?.targets?.monthlyServices?.percentage || 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {performanceData?.targets?.monthlyServices?.percentage || 0}% of target achieved
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Customer Satisfaction</span>
              <span className="text-sm text-gray-500">
                {performanceData?.targets?.customerSatisfaction?.current || 0} / {performanceData?.targets?.customerSatisfaction?.target || 5}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(performanceData?.targets?.customerSatisfaction?.percentage || 0, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Target exceeded! {performanceData?.targets?.customerSatisfaction?.percentage || 0}%
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Revenue Target</span>
              <span className="text-sm text-gray-500">
                ₹{(performanceData?.targets?.revenue?.current || 0).toLocaleString()} / ₹{(performanceData?.targets?.revenue?.target || 0).toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${performanceData?.targets?.revenue?.percentage || 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {performanceData?.targets?.revenue?.percentage || 0}% of target achieved
            </p>
          </div>
        </div>
      </div>

      {/* Recent Feedback & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Feedback */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Customer Feedback</h3>

          <div className="space-y-4">
            {performanceData?.recentFeedback?.map((feedback) => (
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
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>

          <div className="space-y-4">
            {performanceData?.achievements?.map((achievement) => (
              <div key={achievement.id} className={`p-4 rounded-lg border ${achievement.earned ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}>
                <div className="flex items-center mb-2">
                  {getAchievementIcon(achievement.icon)}
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${achievement.earned ? 'text-green-800' : 'text-gray-700'
                      }`}>
                      {achievement.title}
                    </p>
                    <p className={`text-xs ${achievement.earned ? 'text-green-600' : 'text-gray-500'
                      }`}>
                      {achievement.description}
                    </p>
                  </div>
                </div>

                {achievement.earned ? (
                  <div className="flex items-center text-xs text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Earned on {new Date(achievement.date).toLocaleDateString('en-IN')}
                  </div>
                ) : (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                      <div
                        className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${achievement.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500">{achievement.progress}% complete</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Performance Trend</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Services</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Revenue</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Rating</span>
            </div>
          </div>
        </div>

        <div className="h-64 flex items-end justify-between space-x-4">
          {performanceData?.monthlyStats?.map((stat, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex items-end justify-center space-x-1 mb-2" style={{ height: '200px' }}>
                <div
                  className="bg-orange-500 rounded-t"
                  style={{
                    width: '20px',
                    height: `${(stat.services / 50) * 200}px`
                  }}
                ></div>
                <div
                  className="bg-blue-500 rounded-t"
                  style={{
                    width: '20px',
                    height: `${(stat.revenue / 70000) * 200}px`
                  }}
                ></div>
                <div
                  className="bg-yellow-500 rounded-t"
                  style={{
                    width: '20px',
                    height: `${(Number(stat.rating) / 5) * 200}px`
                  }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{stat.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Performance;