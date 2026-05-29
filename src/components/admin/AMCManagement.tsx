import React, { useMemo, useState, useEffect } from 'react';
import { Plus, X, Save, AlertTriangle, Eye, EyeOff, Trash2 } from 'lucide-react';
import { amcAPI } from '../../utils/api';
import AMCPlanCard from '../common/AMCPlanCard';

interface AMCPlan {
    _id: string;
    name: string;
    price: number;
    durationInMonths: number;
    servicesIncluded: number;
    description: string;
    features: string[];
    isActive: boolean;
}

const AMCManagement: React.FC = () => {
    const [plans, setPlans] = useState<AMCPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<AMCPlan | null>(null);
    const [showInactive, setShowInactive] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        durationInMonths: 12,
        servicesIncluded: 3,
        description: '',
        features: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const response = await amcAPI.getAllPlansAdmin();
            setPlans(response.data);
        } catch (err) {
            console.error('Failed to fetch plans:', err);
        } finally {
            setLoading(false);
        }
    };

    const visiblePlans = useMemo(() => {
        return showInactive ? plans : plans.filter(p => p.isActive);
    }, [plans, showInactive]);

    const handleOpenModal = (plan?: AMCPlan) => {
        if (plan) {
            setEditingPlan(plan);
            setFormData({
                name: plan.name,
                price: plan.price,
                durationInMonths: plan.durationInMonths,
                servicesIncluded: plan.servicesIncluded,
                description: plan.description,
                features: plan.features.join('\n')
            });
        } else {
            setEditingPlan(null);
            setFormData({
                name: '',
                price: 0,
                durationInMonths: 12,
                servicesIncluded: 3,
                description: '',
                features: ''
            });
        }
        setError('');
        setIsModalOpen(true);
    };

    const handleToggleActive = async (plan: AMCPlan) => {
        setSubmitting(true);
        setError('');
        try {
            await amcAPI.updatePlan(plan._id, { isActive: !plan.isActive });
            await fetchPlans();
        } catch (err: any) {
            setError(err.message || 'Failed to update plan');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (plan: AMCPlan) => {
        const ok = window.confirm(`Delete plan "${plan.name}"? This cannot be undone.`);
        if (!ok) return;
        setSubmitting(true);
        setError('');
        try {
            await amcAPI.deletePlan(plan._id);
            await fetchPlans();
        } catch (err: any) {
            setError(err.message || 'Failed to delete plan');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            // Convert features string to array
            const featuresArray = formData.features.split('\n').filter(f => f.trim() !== '');

            const payload = {
                ...formData,
                features: featuresArray
            };

            if (editingPlan) {
                await amcAPI.updatePlan(editingPlan._id, payload);
            } else {
                await amcAPI.createPlan(payload);
            }
            setIsModalOpen(false);
            fetchPlans();
        } catch (err: any) {
            setError(err.message || 'Failed to save plan');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">AMC Plans</h2>
                    <p className="text-gray-500">Manage Annual Maintenance Contract plans</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowInactive(v => !v)}
                        className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm"
                    >
                        {showInactive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {showInactive ? 'Hide inactive' : 'Show inactive'}
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Create New Plan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visiblePlans.map((plan) => (
                    <div key={plan._id} className="relative group">
                        {!plan.isActive && (
                            <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                Inactive
                            </div>
                        )}
                        <AMCPlanCard
                            plan={plan}
                            renderAction={() => (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenModal(plan)}
                                        className="w-full py-2 px-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 text-sm"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleActive(plan)}
                                        disabled={submitting}
                                        className={`w-full py-2 px-3 rounded-lg font-medium text-sm ${plan.isActive
                                            ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                            }`}
                                    >
                                        {plan.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(plan)}
                                        disabled={submitting}
                                        className="col-span-2 w-full py-2 px-3 rounded-lg font-medium text-sm bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 inline-flex items-center justify-center"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </button>
                                </div>
                            )}
                        />
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingPlan ? 'Edit AMC Plan' : 'Create New Plan'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-red-500"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-red-500"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months) *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-red-500"
                                        value={formData.durationInMonths}
                                        onChange={e => setFormData({ ...formData, durationInMonths: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Services Included *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-red-500"
                                        value={formData.servicesIncluded}
                                        onChange={e => setFormData({ ...formData, servicesIncluded: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                <textarea
                                    required
                                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-red-500"
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Features (One per line)</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-red-500"
                                    rows={4}
                                    placeholder="Priority Support&#10;Free Spares&#10;Quarterly Visits"
                                    value={formData.features}
                                    onChange={e => setFormData({ ...formData, features: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center disabled:opacity-50"
                                >
                                    {submitting ? (
                                        'Saving...'
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Plan
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AMCManagement;
