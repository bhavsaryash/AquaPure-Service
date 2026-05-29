import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Download,
  Star,
  Clock,
  CheckCircle,
  Droplets
} from 'lucide-react';
import { adminAPI } from '../../utils/api';

interface ReportData {
  overview: {
    totalRevenue: number;
    totalServices: number;
    averageRating: number;
    clientGrowth: number;
    employeeUtilization: number;
    amcRenewalRate: number;
  };
  monthlyTrends: {
    labels: string[];
    revenue: number[];
    services: number[];
    clients: number[];
  };
  serviceBreakdown: {
    maintenance: number;
    repair: number;
    installation: number;
  };
  topPerformers: {
    name: string;
    services: number;
    rating: number;
    revenue: number;
  }[];
  clientAnalytics: {
    totalClients: number;
    activeAMC: number;
    newThisMonth: number;
    churnRate: number;
  };
  financialSummary: {
    totalRevenue: number;
    amcRevenue: number;
    serviceRevenue: number;
    pendingPayments: number;
    profitMargin: number;
  };
  amcAnalytics?: {
    active: number;
    expired: number;
    total: number;
    revenuePeriod: number;
    revenueLast6Months: { labels: string[]; revenue: number[]; subscriptions: number[] };
    topPlans: { planId: string; name: string; price: number; subscriptions: number }[];
    expiringSoon: Array<{
      _id: string;
      endDate: string;
      servicesRemaining: number;
      user: { name: string; email: string; phone?: string };
      plan: { name: string };
    }>;
  };
}

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState('overview');

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod, selectedReport]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getReports(selectedReport, { period: selectedPeriod });
      setReportData(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      setLoading(false);
    }
  };

  const reportTypes = [
    { value: 'overview', label: 'Business Overview', icon: BarChart3 },
    { value: 'financial', label: 'Financial Report', icon: DollarSign },
    { value: 'performance', label: 'Employee Performance', icon: TrendingUp },
    { value: 'client', label: 'Client Analytics', icon: Users },
    { value: 'amc', label: 'AMC Analytics', icon: Droplets }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive business insights and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {reportTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setSelectedReport(type.value)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${selectedReport === type.value
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
          >
            <type.icon className={`h-6 w-6 mx-auto mb-2 ${selectedReport === type.value ? 'text-red-600' : 'text-gray-400'
              }`} />
            <p className="text-sm font-medium">{type.label}</p>
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{reportData?.overview?.totalRevenue?.toLocaleString()}
              </p>
              <p className="text-xs text-green-600">+12.5% from last month</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Services Completed</p>
              <p className="text-2xl font-bold text-gray-900">{reportData?.overview?.totalServices}</p>
              <p className="text-xs text-blue-600">+8.3% from last month</p>
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
              <p className="text-2xl font-bold text-gray-900">{reportData?.overview?.averageRating}</p>
              <p className="text-xs text-yellow-600">+0.2 from last month</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Client Growth</p>
              <p className="text-2xl font-bold text-gray-900">{reportData?.overview?.clientGrowth}%</p>
              <p className="text-xs text-purple-600">+2.1% from last month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Revenue (₹000s)</span>
              </div>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between space-x-2">
            {reportData?.monthlyTrends?.labels?.map((month, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="bg-red-500 rounded-t w-full"
                  style={{
                    height: `${(reportData.monthlyTrends.revenue[index] / 350000) * 200}px`,
                    minHeight: '20px'
                  }}
                ></div>
                <span className="text-sm text-gray-600 mt-2">{month}</span>
                <span className="text-xs text-gray-500">
                  ₹{(reportData.monthlyTrends.revenue[index] / 1000).toFixed(0)}k
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Type Breakdown</h3>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Maintenance</span>
                <span className="text-sm text-gray-500">{reportData?.serviceBreakdown?.maintenance} services</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${((reportData?.serviceBreakdown?.maintenance || 0) / 89) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Repair</span>
                <span className="text-sm text-gray-500">{reportData?.serviceBreakdown?.repair} services</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${((reportData?.serviceBreakdown?.repair || 0) / 89) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Installation</span>
                <span className="text-sm text-gray-500">{reportData?.serviceBreakdown?.installation} services</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${((reportData?.serviceBreakdown?.installation || 0) / 89) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AMC Analytics (extra section) */}
      {selectedReport === 'amc' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AMC Revenue (last 6 months)</h3>
            <div className="h-64 flex items-end justify-between space-x-2">
              {reportData?.amcAnalytics?.revenueLast6Months?.labels?.map((m, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    className="bg-blue-600 rounded-t w-full"
                    style={{
                      height: `${Math.max(12, (reportData.amcAnalytics!.revenueLast6Months.revenue[idx] / Math.max(1, Math.max(...reportData.amcAnalytics!.revenueLast6Months.revenue))) * 200)}px`
                    }}
                  />
                  <span className="text-sm text-gray-600 mt-2">{m}</span>
                  <span className="text-xs text-gray-500">
                    ₹{(reportData.amcAnalytics!.revenueLast6Months.revenue[idx] / 1000).toFixed(0)}k
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top AMC Plans</h3>
            <div className="space-y-3">
              {(reportData?.amcAnalytics?.topPlans || []).map((p) => (
                <div key={p.planId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">₹{p.price}</div>
                  </div>
                  <div className="text-sm font-bold text-gray-900">{p.subscriptions}</div>
                </div>
              ))}
              {(!reportData?.amcAnalytics?.topPlans || reportData.amcAnalytics.topPlans.length === 0) && (
                <div className="text-sm text-gray-500">No AMC subscriptions yet.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expiring Soon (next 30 days)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(reportData?.amcAnalytics?.expiringSoon || []).map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <div className="font-medium">{s.user?.name}</div>
                        <div className="text-xs text-gray-500">{s.user?.email}</div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{s.plan?.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {new Date(s.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{s.servicesRemaining}</td>
                    </tr>
                  ))}
                  {(!reportData?.amcAnalytics?.expiringSoon || reportData.amcAnalytics.expiringSoon.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                        No upcoming expiries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Top Performers & Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>

          <div className="space-y-4">
            {reportData?.topPerformers?.map((performer, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="bg-red-100 p-2 rounded-full mr-3">
                    <span className="text-red-600 font-bold text-sm">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{performer.name}</p>
                    <p className="text-xs text-gray-500">{performer.services} services</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center mb-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                    <span className="text-sm font-medium">{performer.rating}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    ₹{performer.revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-green-800">Total Revenue</span>
              <span className="text-lg font-bold text-green-900">
                ₹{reportData?.financialSummary?.totalRevenue?.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-800">AMC Revenue</span>
              <span className="text-lg font-bold text-blue-900">
                ₹{reportData?.financialSummary?.amcRevenue?.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-purple-800">Service Revenue</span>
              <span className="text-lg font-bold text-purple-900">
                ₹{reportData?.financialSummary?.serviceRevenue?.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm font-medium text-yellow-800">Pending Payments</span>
              <span className="text-lg font-bold text-yellow-900">
                ₹{reportData?.financialSummary?.pendingPayments?.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-t-2 border-gray-200">
              <span className="text-sm font-medium text-gray-800">Profit Margin</span>
              <span className="text-lg font-bold text-gray-900">
                {reportData?.financialSummary?.profitMargin}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 p-4 rounded-full w-fit mx-auto mb-3">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">{reportData?.overview?.employeeUtilization}%</h4>
            <p className="text-sm text-gray-500">Employee Utilization</p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 p-4 rounded-full w-fit mx-auto mb-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">{reportData?.overview?.amcRenewalRate}%</h4>
            <p className="text-sm text-gray-500">AMC Renewal Rate</p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 p-4 rounded-full w-fit mx-auto mb-3">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">{reportData?.clientAnalytics?.newThisMonth}</h4>
            <p className="text-sm text-gray-500">New Clients This Month</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;