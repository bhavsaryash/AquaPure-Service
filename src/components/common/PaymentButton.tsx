import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface PaymentButtonProps {
    amount: number;
    currency?: string;
    receipt?: string;
    onSuccess: (details: any) => void;
    onFailure?: (error: any) => void;
    onBeforePayment?: () => boolean | Promise<boolean>;
    buttonText?: string;
    className?: string;
    description?: string;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
    amount,
    onSuccess,
    onFailure,
    onBeforePayment,
    buttonText = 'Pay Now',
    className = 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
}) => {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const handlePayment = async () => {
        setLoading(true);
        try {
            if (onBeforePayment) {
                const proceed = await onBeforePayment();
                if (!proceed) {
                    setLoading(false);
                    return;
                }
            }
            if (!amount || amount <= 0) {
                toast.success('No payment required');
                onSuccess({ paymentSkipped: true });
                setLoading(false);
                return;
            }

            // Mock opening payment gateway
            setTimeout(() => {
                setLoading(false);
                setShowModal(true);
            }, 500);

        } catch (error: any) {
            console.error('Payment Error', error);
            setLoading(false);
            toast.error(error.message || 'Something went wrong');
            if (onFailure) onFailure(error);
        }
    };

    const confirmMockPayment = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setShowModal(false);
            toast.success('Payment successful');
            onSuccess({
                razorpay_order_id: `mock_order_${Date.now()}`,
                razorpay_payment_id: `mock_payment_${Date.now()}`,
                razorpay_signature: `mock_signature_${Date.now()}`,
                isMocked: true,
                amount: amount,
            });
        }, 1500);
    };

    return (
        <>
            {showModal && (
                 <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
                     <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200 text-center">
                         <div className="mb-4 text-green-600">
                             <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                             </svg>
                         </div>
                         <h2 className="text-2xl font-bold mb-2 text-gray-800">Secure Payment</h2>
                         <p className="mb-6 text-gray-500">This is a simulated payment page. Proceed to complete your purchase securely.</p>
                         
                         <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="flex justify-between items-center text-lg">
                                <span className="text-gray-600">Total Amount:</span>
                                <span className="font-bold text-gray-900">₹{amount}</span>
                            </div>
                         </div>

                         <div className="flex justify-center gap-4">
                            <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors">
                                Cancel
                            </button>
                            <button type="button" onClick={confirmMockPayment} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2 min-w-[140px]" disabled={loading}>
                                {loading ? (
                                    <>
                                        <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                        Processing
                                    </>
                                ) : (
                                    'Pay Securely'
                                )}
                            </button>
                         </div>
                     </div>
                 </div>
            )}

            {(loading && !showModal) && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
                            <div>
                                <div className="text-sm font-semibold text-gray-900">
                                    Initializing...
                                </div>
                                <div className="text-xs text-gray-600">Please wait a moment.</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={handlePayment}
                disabled={loading}
                className={`${className} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {loading ? 'Processing...' : buttonText}
            </button>
        </>
    );
};

export default PaymentButton;
