import React from 'react';
import { Check, Shield } from 'lucide-react';

interface AMCPlanProps {
    plan: {
        _id: string;
        name: string;
        price: number;
        durationInMonths: number;
        servicesIncluded: number;
        description: string;
        features?: string[];
    };
    onAction?: (id: string) => void;
    actionLabel?: string;
    isCurrent?: boolean;
    renderAction?: (plan: any) => React.ReactNode;
}

const AMCPlanCard: React.FC<AMCPlanProps> = ({ plan, onAction, actionLabel, isCurrent, renderAction }) => {
    return (
        <div className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-transform hover:scale-105 ${isCurrent ? 'border-green-500 ring-2 ring-green-200' : 'border-transparent hover:border-red-100'
            }`}>
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                        {isCurrent && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                                Current Plan
                            </span>
                        )}
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg">
                        <Shield className="h-6 w-6 text-red-600" />
                    </div>
                </div>

                <div className="mb-6">
                    <span className="text-3xl font-bold text-gray-900">₹{plan.price}</span>
                    <span className="text-gray-500"> / {plan.durationInMonths} months</span>
                </div>

                <p className="text-gray-600 mb-6 text-sm">{plan.description}</p>

                <ul className="space-y-3 mb-8">
                    <li className="flex items-center text-sm text-gray-600">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                        {plan.servicesIncluded} Free Services
                    </li>
                    {plan.features && plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                            <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                        </li>
                    ))}
                </ul>

                {onAction && !isCurrent && (
                    <button
                        onClick={() => onAction(plan._id)}
                        disabled={isCurrent}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${isCurrent
                            ? 'bg-green-100 text-green-800 cursor-default'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {actionLabel || 'Select Plan'}
                    </button>
                )}

                {renderAction && !isCurrent && renderAction(plan)}

                {isCurrent && (
                    <div className="w-full py-2 px-4 rounded-lg font-medium text-center bg-green-100 text-green-800">
                        Active Plan
                    </div>
                )}
            </div>
        </div>
    );
};

export default AMCPlanCard;
