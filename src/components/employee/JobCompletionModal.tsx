import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash, AlertCircle } from 'lucide-react';
import { inventoryAPI } from '../../utils/api';

interface InventoryItem {
    _id: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
}

interface PartUsed {
    inventoryItem: string;
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
}

interface JobCompletionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    serviceType: string;
}

const JobCompletionModal: React.FC<JobCompletionModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    serviceType
}) => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [partsUsed, setPartsUsed] = useState<PartUsed[]>([]);
    const [laborCost, setLaborCost] = useState<number>(0);
    const [workPerformed, setWorkPerformed] = useState('');
    const [signatures, setSignatures] = useState({ customer: '', technician: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchInventory();
        }
    }, [isOpen]);

    const fetchInventory = async () => {
        try {
            setLoadingInventory(true);
            const res = await inventoryAPI.getAll();
            setInventory(res.data);
        } catch (err) {
            console.error('Failed to fetch inventory', err);
        } finally {
            setLoadingInventory(false);
        }
    };

    const addPart = (item: InventoryItem) => {
        const existing = partsUsed.find(p => p.inventoryItem === item._id);
        if (existing) {
            if (existing.quantity >= item.quantity) {
                setError(`Cannot add more ${item.name}. Stock limit reached.`);
                return;
            }
            setPartsUsed(partsUsed.map(p =>
                p.inventoryItem === item._id
                    ? { ...p, quantity: p.quantity + 1, totalCost: (p.quantity + 1) * p.unitCost }
                    : p
            ));
        } else {
            setPartsUsed([...partsUsed, {
                inventoryItem: item._id,
                name: item.name,
                quantity: 1,
                unitCost: item.price,
                totalCost: item.price
            }]);
        }
        setError('');
    };

    const removePart = (id: string) => {
        setPartsUsed(partsUsed.filter(p => p.inventoryItem !== id));
    };

    const updateQuantity = (id: string, qty: number) => {
        if (qty < 1) return;
        const item = inventory.find(i => i._id === id);
        if (!item) return;

        if (qty > item.quantity) {
            setError(`Insufficient stock for ${item.name}. Only ${item.quantity} available.`);
            return;
        }

        setPartsUsed(partsUsed.map(p =>
            p.inventoryItem === id
                ? { ...p, quantity: qty, totalCost: qty * p.unitCost }
                : p
        ));
        setError('');
    };

    const calculateTotal = () => {
        const partsTotal = partsUsed.reduce((sum, p) => sum + p.totalCost, 0);
        return partsTotal + laborCost;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!workPerformed) {
            setError('Please describe the work performed');
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                status: 'completed',
                workDetails: {
                    workPerformed,
                    partsUsed,
                    laborCost,
                    totalCost: calculateTotal(),
                    signatures
                }
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to complete job');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredInventory = inventory.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">Complete Job</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {error && (
                        <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            {error}
                        </div>
                    )}

                    {/* Parts Selection */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4 border-r pr-4">
                            <h3 className="font-semibold text-gray-900 mb-2">Add Parts</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search parts inventory..."
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="h-64 overflow-y-auto border rounded-lg divide-y">
                                {loadingInventory ? (
                                    <p className="p-4 text-center text-gray-500">Loading inventory...</p>
                                ) : filteredInventory.length === 0 ? (
                                    <p className="p-4 text-center text-gray-500">No parts found</p>
                                ) : (
                                    filteredInventory.map(item => (
                                        <div key={item._id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                            <div>
                                                <p className="font-medium text-gray-900">{item.name}</p>
                                                <p className="text-sm text-gray-500">SKU: {item.sku} | Stock: {item.quantity}</p>
                                                <p className="text-sm font-semibold text-gray-700">₹{item.price}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => addPart(item)}
                                                disabled={item.quantity === 0}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Plus className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 mb-2">Used Parts & Costs</h3>

                            {partsUsed.length > 0 ? (
                                <div className="space-y-3">
                                    {partsUsed.map(part => (
                                        <div key={part.inventoryItem} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium">{part.name}</p>
                                                <div className="flex items-center mt-1 space-x-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={part.quantity}
                                                        onChange={(e) => updateQuantity(part.inventoryItem, parseInt(e.target.value))}
                                                        className="w-16 border rounded px-2 py-1 text-sm"
                                                    />
                                                    <span className="text-sm text-gray-500">x ₹{part.unitCost}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <span className="font-bold">₹{part.totalCost}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removePart(part.inventoryItem)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="pt-4 border-t flex justify-between items-center">
                                        <span className="font-medium">Total Parts Cost:</span>
                                        <span className="font-bold">₹{partsUsed.reduce((sum, p) => sum + p.totalCost, 0)}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No parts added yet</p>
                            )}

                            <div className="pt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Labor Cost (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                    value={laborCost}
                                    onChange={e => setLaborCost(parseFloat(e.target.value) || 0)}
                                />
                            </div>

                            <div className="bg-red-50 p-4 rounded-lg flex justify-between items-center text-red-900">
                                <span className="font-bold text-lg">Grand Total</span>
                                <span className="font-bold text-2xl">₹{calculateTotal()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Job Details */}
                    <div className="space-y-4 border-t pt-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Work Performed Report *</label>
                            <textarea
                                required
                                rows={3}
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                placeholder="Describe the service details..."
                                value={workPerformed}
                                onChange={e => setWorkPerformed(e.target.value)}
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name (Signature)</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded px-3 py-2 font-handwriting"
                                    placeholder="Type to sign"
                                    value={signatures.customer}
                                    onChange={e => setSignatures({ ...signatures, customer: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Technician Name (Signature)</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded px-3 py-2 font-handwriting"
                                    placeholder="Type to sign"
                                    value={signatures.technician}
                                    onChange={e => setSignatures({ ...signatures, technician: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                            {submitting ? 'Completing Job...' : 'Complete Job & Generate Receipt'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default JobCompletionModal;
