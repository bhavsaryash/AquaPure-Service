import React, { useEffect, useMemo, useState } from 'react';
import { amcAPI } from '../../utils/api';
import { Calendar, Filter, Search, User, Droplets, Download } from 'lucide-react';
import { paymentAPI } from '../../utils/api';

interface Subscription {
  _id: string;
  user: { _id: string; name: string; email: string; phone?: string };
  plan: { _id: string; name: string; price: number; durationInMonths: number };
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
  servicesRemaining: number;
  createdAt: string;
}

const AMCSubscriptionsAdmin: React.FC = () => {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await amcAPI.getSubscriptionsAdmin();
      setSubs(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load AMC subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.user.name.toLowerCase().includes(q) ||
        (s.user.email || '').toLowerCase().includes(q) ||
        (s.plan.name || '').toLowerCase().includes(q)
      );
    });
  }, [subs, statusFilter, search]);

  const handleDownload = async (id: string) => {
    try {
      await paymentAPI.downloadInvoice(id, 'amc');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Droplets className="h-6 w-6 text-red-600" />
            AMC Subscriptions
          </h1>
          <p className="text-sm text-gray-600">
            Overview of all client AMC subscriptions, status, and validity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search client or plan..."
              className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filtered.length}</span> of{' '}
              <span className="font-semibold">{subs.length}</span> subscriptions
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm text-gray-500"
                    >
                      No subscriptions match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center mr-3">
                            <User className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {s.user.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {s.user.email}
                              {s.user.phone ? ` · ${s.user.phone}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{s.plan.name}</div>
                        <div className="text-xs text-gray-500">
                          ₹{s.plan.price} · {s.plan.durationInMonths} months
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span>
                            {new Date(s.startDate).toLocaleDateString()} –{' '}
                            {new Date(s.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {s.servicesRemaining} left
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            s.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : s.status === 'expired'
                              ? 'bg-gray-100 text-gray-800'
                              : s.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleDownload(s._id)}
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-900 text-xs font-medium"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Invoice
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AMCSubscriptionsAdmin;

