import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Star,
  Eye,
  User,
  Phone,
  Wrench
} from 'lucide-react';
import PDFGenerator from '../common/PDFGenerator';
import { useAuth } from '../../contexts/AuthContext';
import PaymentButton from '../common/PaymentButton';
import FeedbackModal from '../common/FeedbackModal'; // Import FeedbackModal
import LiveTrackerMap from '../common/LiveTrackerMap';
import toast from 'react-hot-toast';
import { paymentAPI, clientAPI } from '../../utils/api';

interface Service {
  _id: string;
  serviceId: string;
  serviceType: string;
  status: string;
  scheduledDate?: string;
  completedDate?: string;
  preferredDate?: string;
  preferredTime?: string;
  issueDescription?: string;
  urgency?: string;
  assignedEmployee?: {
    user: {
      name: string;
      phone: string;
    }
  };
  workDetails?: {
    workPerformed: string;
    partsUsed: Array<{ name: string; quantity: number; cost?: number; unitCost?: number }>;
    laborCost: number;
    totalCost: number;
    beforePhotos: string[];
    afterPhotos: string[];
    signatures?: {
      customer: string;
      technician: string;
    };
  };
  address?: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
  feedback?: {
    rating: number;
    comment: string;
    submittedAt: string;
  };
  costBreakdown?: {
    totalAmount: number;
    paymentStatus: string;
    paymentMethod: string;
    bookingFee?: number;
  };
}

const ServiceHistory: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({});
  const { user } = useAuth();

  // Feedback Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackServiceId, setFeedbackServiceId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

  useEffect(() => {
    fetchServiceHistory();
  }, []);

  const handleCancelRequest = async (serviceId: string, id: string) => {
    if (!window.confirm(`Are you sure you want to cancel the service request ${serviceId}?`)) {
      return;
    }

    try {
      setIsCancelling(id);
      await clientAPI.cancelServiceRequest(id);
      toast.success('Request cancelled successfully');
      setSelectedService(null);
      await fetchServiceHistory();
    } catch (err: any) {
      console.error('Failed to cancel request:', err);
      toast.error(err.message || 'Failed to cancel the service request');
    } finally {
      setIsCancelling(null);
    }
  };

  const handlePaymentSuccess = async (requestId: string, details: any) => {
    try {
      const res = await clientAPI.payForService(requestId, {
        razorpay_order_id: details.razorpay_order_id,
        razorpay_payment_id: details.razorpay_payment_id,
        razorpay_signature: details.razorpay_signature,
        amount: details.amount,
      });

      const updated = res.data;
      setServices(prev => prev.map(s => (s._id === requestId ? updated : s)));
      if (selectedService?._id === requestId) setSelectedService(updated);

      toast.success(res.idempotent ? 'Payment already recorded' : 'Payment recorded successfully');
    } catch (e: any) {
      toast.error(e.message || 'Failed to record payment');
    }
  };

  const fetchServiceHistory = async () => {
    try {
      const data = await clientAPI.getServiceHistory();
      setServices(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch service history:', error);
      setLoading(false);
      // Optional: set error state to show to user
    }
  };

  const openFeedbackModal = (serviceId: string) => {
    setFeedbackServiceId(serviceId);
    setIsFeedbackModalOpen(true);
  };

  const handleFeedbackSuccess = () => {
    toast.success('Feedback submitted successfully!');
    fetchServiceHistory(); // Refresh to show updated rating
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'cancelled':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
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
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.serviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.assignedEmployee?.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    const matchesStatus = statusFilter === 'all' || service.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const generateReceiptData = (service: Service) => {
    const addressString = service.address
      ? `${service.address.line1}, ${service.address.city}, ${service.address.state} - ${service.address.pincode}`
      : 'Address not provided';

    return {
      serviceId: service.serviceId,
      customerName: user?.name || 'Customer Name',
      customerPhone: user?.phone || 'Not Provided',
      customerAddress: addressString,
      serviceDate: service.completedDate || new Date().toISOString(),
      serviceType: service.serviceType,
      employeeName: service.assignedEmployee?.user.name || 'Not Assigned',
      workPerformed: service.workDetails?.workPerformed || 'N/A',
      partsUsed: service.workDetails?.partsUsed || [],
      laborCost: service.workDetails?.laborCost || 0,
      totalCost: service.workDetails?.totalCost || 0,
      paymentMethod: service.costBreakdown?.paymentMethod || 'N/A',
      paymentStatus: service.costBreakdown?.paymentStatus || 'Pending',
      nextServiceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months from now
      signatures: service.workDetails?.signatures
    };
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service History</h1>
          <p className="mt-1 text-sm text-gray-500">
            View all your past service records and receipts
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search services..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {filteredServices.map((service) => (
          <div key={service._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{service.serviceId}</h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {service.serviceType} Service
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={getStatusBadge(service.status)}>
                    {service.status.replace('_', ' ')}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    ₹{(service.costBreakdown?.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {service.scheduledDate ? 'Scheduled Date' : 'Requested Date'}
                    </p>
                    <p>
                      {service.scheduledDate 
                        ? new Date(service.scheduledDate).toLocaleDateString('en-IN') 
                        : service.preferredDate 
                          ? new Date(service.preferredDate).toLocaleDateString('en-IN') 
                          : 'Flexible / Not Scheduled'
                      }
                    </p>
                    <p className="text-xs">
                      {service.scheduledDate 
                        ? new Date(service.scheduledDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) 
                        : service.preferredTime || ''
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{service.assignedEmployee?.user.name || 'Unassigned'}</p>
                    <div className="flex items-center mt-1">
                      <Phone className="h-3 w-3 mr-1" />
                      <span className="text-xs">{service.assignedEmployee?.user.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Star className="h-4 w-4 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Your Rating</p>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${service.feedback && star <= service.feedback.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                            }`}
                        />
                      ))}
                      <span className="ml-1 text-xs">({service.feedback?.rating || 0})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Details / Issue Description */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                {(service.status === 'pending' || service.status === 'assigned') ? (
                  <>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Issue Description</h4>
                    <p className="text-sm text-gray-700">{service.issueDescription || 'No description provided.'}</p>
                    {service.urgency && (
                      <p className="text-xs text-red-600 mt-2 font-medium">Urgency: {(service.urgency).toUpperCase()}</p>
                    )}
                  </>
                ) : (
                  <>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Work Performed</h4>
                    <p className="text-sm text-gray-700">{service.workDetails?.workPerformed || 'N/A'}</p>
                  </>
                )}

                {(service.workDetails?.partsUsed && service.workDetails.partsUsed.length > 0) && (
                  <div className="mt-3">
                    <h5 className="text-xs font-medium text-gray-900 mb-2">Parts Used</h5>
                    <div className="space-y-1">
                      {service.workDetails?.partsUsed.map((part, index) => {
                        const partCost = part.unitCost || part.cost || 0;
                        return (
                          <div key={index} className="flex items-center justify-between text-xs text-gray-600">
                            <span>{part.name} (x{part.quantity})</span>
                            <span>₹{(partCost * part.quantity).toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Feedback */}
              {service.feedback ? (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Your Feedback</h4>
                  <p className="text-sm text-blue-800">{service.feedback.comment}</p>
                </div>
              ) : (
                service.status === 'completed' && (
                  <div className="mb-4">
                    <button
                      onClick={() => openFeedbackModal(service._id)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                    >
                      Rate this service
                    </button>
                  </div>
                )
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${service.costBreakdown?.paymentStatus === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    Payment: {(service.costBreakdown?.paymentStatus || 'Pending').toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    via {service.costBreakdown?.paymentMethod || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {service.status === 'completed' && service.costBreakdown?.paymentStatus !== 'paid' && service.workDetails?.totalCost && service.workDetails.totalCost > 0 && (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-1">
                        {[100, 200, 500, 1000, 2000].map(amount => (
                          <button
                            key={amount}
                            onClick={() => setPaymentAmounts(prev => ({ ...prev, [service.serviceId]: amount }))}
                            className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 transition-colors"
                          >
                            ₹{amount}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">₹</span>
                          <input
                            type="number"
                            value={paymentAmounts[service.serviceId] !== undefined ? paymentAmounts[service.serviceId] : service.workDetails.totalCost}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setPaymentAmounts(prev => ({
                                ...prev,
                                [service.serviceId]: isNaN(val) ? 0 : val
                              }));
                            }}
                            className="w-24 pl-5 pr-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Amount"
                          />
                        </div>
                        <PaymentButton
                          amount={paymentAmounts[service.serviceId] !== undefined ? paymentAmounts[service.serviceId] : service.workDetails.totalCost}
                          receipt={service.serviceId}
                          description={`Payment for ${service.serviceType} Service`}
                          onSuccess={(details) => handlePaymentSuccess(service._id, details)}
                          buttonText="Pay Now"
                          className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        />
                      </div>
                    </div>
                  )}

                  {service.costBreakdown?.paymentStatus === 'paid' && (
                    <>
                      <button
                        disabled
                        className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 opacity-90 cursor-default"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Paid
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await paymentAPI.downloadInvoice(service.serviceId);
                            toast.success('Invoice downloaded');
                          } catch (e) {
                            toast.error('Failed to download invoice');
                          }
                        }}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Invoice
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setSelectedService(service)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </button>

                  <PDFGenerator
                    receipt={generateReceiptData(service)}
                    onDownload={() => console.log('Receipt downloaded for', service.serviceId)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Services Found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'You haven\'t had any services yet'
              }
            </p>
          </div>
        )}
      </div>

      {/* Service Detail Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Service Details - {selectedService.serviceId}
                </h3>
                <button
                  onClick={() => setSelectedService(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">Service Type:</span>
                    <p className="capitalize">{selectedService.serviceType}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Status:</span>
                    <p className="capitalize">{selectedService.status}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">
                      {selectedService.scheduledDate ? 'Scheduled:' : 'Requested:'}
                    </span>
                    <p>
                      {selectedService.scheduledDate 
                        ? new Date(selectedService.scheduledDate).toLocaleString('en-IN') 
                        : selectedService.preferredDate 
                          ? `${new Date(selectedService.preferredDate).toLocaleDateString('en-IN')} ${selectedService.preferredTime || ''}`.trim()
                          : 'Not Scheduled'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Completed:</span>
                    <p>{selectedService.completedDate ? new Date(selectedService.completedDate).toLocaleString('en-IN') : 'Not Completed'}</p>
                  </div>
                </div>

                {selectedService.status === 'in_progress' && selectedService.assignedEmployee && (
                  <div className="mt-4">
                    <span className="font-medium text-gray-500 mb-2 block">Live technician tracking</span>
                    <p className="text-xs text-gray-500 mb-2">
                      After the technician starts the job, their live position, direction, and route to your address appear here (same idea as navigation in Google Maps).
                    </p>
                    <LiveTrackerMap
                      serviceId={selectedService._id}
                      destinationAddress={selectedService.address}
                    />
                  </div>
                )}

                <div>
                  <span className="font-medium text-gray-500">Technician:</span>
                  <p>{selectedService.assignedEmployee?.user.name || 'Unassigned'} {(selectedService.assignedEmployee?.user.phone ? `- ${selectedService.assignedEmployee.user.phone}` : '')}</p>
                </div>

                {(selectedService.status === 'pending' || selectedService.status === 'assigned') ? (
                  <div>
                    <span className="font-medium text-gray-500">Issue Description:</span>
                    <p className="mt-1">{selectedService.issueDescription || 'No description provided.'}</p>
                    {selectedService.urgency && (
                      <p className="text-xs text-red-600 mt-1 font-medium">Urgency: {(selectedService.urgency).toUpperCase()}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="font-medium text-gray-500">Work Performed:</span>
                    <p className="mt-1">{selectedService.workDetails?.workPerformed || 'N/A'}</p>
                  </div>
                )}

                <div>
                  <span className="font-medium text-gray-500">Cost Breakdown:</span>
                  <div className="mt-2 bg-gray-50 p-3 rounded">
                    <div className="flex justify-between text-sm">
                      <span>Labor Cost:</span>
                      <span>₹{(selectedService.workDetails?.laborCost || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Parts Cost:</span>
                      <span>₹{(selectedService.workDetails?.partsUsed || []).reduce((total, part) => total + ((part.unitCost || part.cost || 0) * part.quantity), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium border-t pt-2 mt-2">
                      <span>Total:</span>
                      <span>₹{(selectedService.workDetails?.totalCost || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 space-x-3">
                {(selectedService.status === 'pending' || selectedService.status === 'assigned') && (
                  <button
                    onClick={() => handleCancelRequest(selectedService.serviceId, selectedService._id)}
                    disabled={isCancelling === selectedService._id}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 font-medium transition-colors"
                  >
                    {isCancelling === selectedService._id ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedService(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
                <PDFGenerator
                  receipt={generateReceiptData(selectedService)}
                  onDownload={() => {
                    console.log('Receipt downloaded for', selectedService.serviceId);
                    setSelectedService(null);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackServiceId && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          requestId={feedbackServiceId}
          onSuccess={handleFeedbackSuccess}
        />
      )}
    </div>
  );
};

export default ServiceHistory;