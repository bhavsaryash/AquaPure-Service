import React, { useState, useEffect } from 'react';
import { amcAPI, paymentAPI } from '../../utils/api';
import AMCPlanCard from '../common/AMCPlanCard';
import PaymentButton from '../common/PaymentButton';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/** Razorpay order receipt: max 40 chars, alphanumeric (backend sanitizes). */
function buildAmcReceipt(planId: string) {
    const tail = planId.replace(/[^a-fA-F0-9]/g, '').slice(-10) || 'plan';
    return `amc${tail}${Date.now().toString(36)}`.slice(0, 40);
}

interface AMCPlan {
    _id: string;
    name: string;
    price: number;
    durationInMonths: number;
    servicesIncluded: number;
    description: string;
    features: string[];
}

interface Subscription {
    _id: string;
    plan: AMCPlan;
    startDate: string;
    endDate: string;
    status: string;
    servicesRemaining: number;
}

interface SubscriptionData {
    active: Subscription | null;
    history: Subscription[];
}

const AMCSubscription: React.FC = () => {
    const { user } = useAuth();
    const [plans, setPlans] = useState<AMCPlan[]>([]);
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [plansRes, subRes] = await Promise.all([
                amcAPI.getPlans(),
                amcAPI.getMySubscription().catch(() => ({ data: null }))
            ]);
            setPlans(plansRes.data);

            // Handle new response structure { active: ..., history: ... }
            if (subRes.data && (subRes.data.active !== undefined || subRes.data.history !== undefined)) {
                setSubscription(subRes.data);
            } else {
                // Fallback if backend not updated or returns old format (though we updated it)
                // If old format was single object, wrap it
                setSubscription({
                    active: subRes.data?.status === 'active' ? subRes.data : null,
                    history: subRes.data ? [subRes.data] : []
                });
            }
        } catch (err) {
            console.error('Failed to fetch AMC data:', err);
        } finally {
            setLoading(false);
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
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Annual Maintenance Contracts</h2>
                <p className="text-gray-500">Protect your water purifier with our comprehensive service plans.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 mr-2" />
                    ) : (
                        <AlertCircle className="h-5 w-5 mr-2" />
                    )}
                    {message.text}
                </div>
            )}

            {/* Active Subscription Section */}
            {subscription?.active && (
                <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-6 border border-green-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                        <div>
                            <span className="text-sm font-semibold text-green-600 uppercase tracking-wider">Current Plan</span>
                            <div className="flex items-center mt-1">
                                <h3 className="text-3xl font-bold text-gray-900 mr-3">{subscription.active.plan.name}</h3>
                                <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-semibold capitalize">
                                    {subscription.active.status}
                                </span>
                            </div>
                        </div>
                        <div className="mt-4 md:mt-0">
                            {/* Request AMC Service Button */}
                            <button
                                onClick={() => window.location.href = '/client/request?type=amc'}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                                Request AMC Service
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-gray-500 text-sm">Services Remaining</p>
                            <div className="flex items-end mt-1">
                                <span className="text-3xl font-bold text-gray-900">{subscription.active.servicesRemaining}</span>
                                <span className="text-gray-400 text-sm mb-1 ml-1">/ {subscription.active.plan.servicesIncluded}</span>
                            </div>
                            {/* Simple Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${(subscription.active.servicesRemaining / subscription.active.plan.servicesIncluded) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-gray-500 text-sm">Next Service Due</p>
                            <p className="text-xl font-semibold text-gray-900 mt-1">
                                {/* Estimation Logic: Start Date + (Total - Remaining) * (Duration / Total) months ?? 
                                    Or just simplified: Start Date + 3 months per service? 
                                    Let's assume quarterly for now or visually generic. 
                                    Actually, better to base on duration / included. 
                                */}
                                {(() => {
                                    const totalMonths = subscription.active.plan.durationInMonths;
                                    const totalServices = subscription.active.plan.servicesIncluded;
                                    const servicesUsed = totalServices - subscription.active.servicesRemaining;
                                    const intervalMonths = totalMonths / totalServices;

                                    // Calculate next due date
                                    const startDate = new Date(subscription.active.startDate);
                                    const nextDueDate = new Date(startDate);
                                    nextDueDate.setMonth(startDate.getMonth() + (servicesUsed + 1) * intervalMonths);

                                    // If past end date, define as Expiry
                                    if (nextDueDate > new Date(subscription.active.endDate)) {
                                        return 'Plan Expiring Soon';
                                    }

                                    return nextDueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                })()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Estimated Date</p>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-gray-500 text-sm">Valid Until</p>
                            <p className="text-xl font-semibold text-gray-900 mt-1">
                                {new Date(subscription.active.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            {/* Renewal Prompt if within 30 days */}
                            {(() => {
                                const endDate = new Date(subscription.active.endDate);
                                const diffDays = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                if (diffDays < 30 && diffDays > 0) {
                                    return <span className="text-xs font-bold text-orange-600 mt-1 block">Renew in {diffDays} days</span>;
                                }
                                return null;
                            })()}
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                            <p className="text-sm text-gray-500">Need Help?</p>
                            <a href="/contact" className="text-green-600 font-medium hover:underline mt-1 text-sm">Contact Support</a>
                        </div>
                    </div>
                </div>
            )}

            {/* Subscription History */}
            {subscription?.history && subscription.history.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Subscription History</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {subscription.history.map((sub: any) => (
                                    <tr key={sub._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {sub.plan?.name || 'Unknown Plan'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(sub.startDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(sub.endDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => paymentAPI.downloadInvoice(sub._id, 'amc')}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Available Plans */}
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Available Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div className="relative" key={plan._id}>
                            <AMCPlanCard
                                plan={plan}
                                isCurrent={subscription?.active?.plan?._id === plan._id}
                                renderAction={(planData) => (
                                    <PaymentButton
                                        amount={planData.price}
                                        receipt={buildAmcReceipt(planData._id)}
                                        description={`Subscription to ${planData.name}`}
                                        prefill={
                                            user
                                                ? {
                                                      name: user.name,
                                                      email: user.email,
                                                      contact: user.phone || ''
                                                  }
                                                : undefined
                                        }
                                        onSuccess={(details) => {
                                            // Call subscribe with payment details
                                            amcAPI.subscribe(planData._id, details)
                                                .then(() => {
                                                    setMessage({ type: 'success', text: 'Successfully subscribed to AMC plan!' });
                                                    fetchData();
                                                })
                                                .catch(err => {
                                                    setMessage({ type: 'error', text: err.message || 'Subscription failed' });
                                                });
                                        }}
                                        buttonText="Activate"
                                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700`}
                                    />
                                )}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AMCSubscription;
