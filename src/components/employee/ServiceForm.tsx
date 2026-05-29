import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { socket, connectSocket } from '../../utils/socket';
import { employeeAPI } from '../../utils/api';
import {
  Camera,
  Upload,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Phone,
  MapPin,
  Wrench,
  Package,
  DollarSign,
  FileText,
  Star
} from 'lucide-react';
import LiveTrackerMap from '../common/LiveTrackerMap';

const ServiceForm: React.FC = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState(null);
  
  // Tracking — auto-starts when job is in progress (client sees live map)
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const prevGeoRef = useRef<{ lat: number; lng: number } | null>(null);
  const autoStartDoneRef = useRef(false);

  const [formData, setFormData] = useState({
    workPerformed: '',
    partsUsed: [],
    laborCost: 0,
    totalCost: 0,
    customerSignature: '',
    beforePhotos: [],
    afterPhotos: [],
    nextServiceDate: '',
    recommendations: '',
    customerFeedback: '',
    paymentMethod: 'cash',
    paymentStatus: 'pending'
  });

  function bearingDeg(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
  ): number {
    const φ1 = (a.lat * Math.PI) / 180;
    const φ2 = (b.lat * Math.PI) / 180;
    const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    return ((θ * 180) / Math.PI + 360) % 360;
  }

  const stopSharingLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    prevGeoRef.current = null;
    setIsSharingLocation(false);
    toast.success('Location sharing stopped.');
  }, []);

  const startSharingLocation = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!serviceId) return;
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser.');
        return;
      }

      connectSocket();
      socket.emit('employee_join_room', { serviceId: serviceId });

      if (!opts?.silent) {
        toast.loading('Starting live location…', { id: 'loc-start' });
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          if (!opts?.silent) {
            toast.dismiss('loc-start');
          }
          setIsSharingLocation(true);
          const { latitude, longitude, heading, speed } = position.coords;
          let headingDeg: number | undefined;
          if (typeof heading === 'number' && !Number.isNaN(heading) && heading >= 0) {
            headingDeg = heading;
          } else if (prevGeoRef.current) {
            headingDeg = bearingDeg(prevGeoRef.current, { lat: latitude, lng: longitude });
          }
          prevGeoRef.current = { lat: latitude, lng: longitude };

          socket.emit('employee_update_location', {
            serviceId: serviceId,
            lat: latitude,
            lng: longitude,
            ...(headingDeg !== undefined ? { heading: headingDeg } : {}),
            ...(typeof speed === 'number' && !Number.isNaN(speed) ? { speed } : {})
          });
        },
        (error) => {
          if (!opts?.silent) {
            toast.dismiss('loc-start');
          }
          toast.error('Unable to read location: ' + error.message);
          setIsSharingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    },
    [serviceId]
  );

  useEffect(() => {
    autoStartDoneRef.current = false;
    fetchServiceDetails();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [serviceId]);

  useEffect(() => {
    if (!service || (service as any).status !== 'in_progress' || autoStartDoneRef.current) return;
    autoStartDoneRef.current = true;
    startSharingLocation({ silent: true });
    toast.success('Live location sharing started — the customer can track your route.', { duration: 4000 });
  }, [service, startSharingLocation]);

  const toggleLocationSharing = () => {
    if (isSharingLocation) {
      stopSharingLocation();
    } else {
      startSharingLocation();
    }
  };

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      const res = (await employeeAPI.getService(serviceId!)) as { data?: Record<string, unknown> };
      const req = res.data as Record<string, any> | undefined;
      if (!req) throw new Error('No service data');

      const normalized = {
        _id: req._id,
        serviceId: req.serviceId,
        serviceType: req.serviceType,
        status: req.status,
        priority: req.urgency || 'medium',
        issueDescription: req.issueDescription,
        address: req.address,
        client: {
          user: {
            name: req.user?.name || 'Customer',
            phone: req.user?.phone || '',
            email: req.user?.email || '',
            address: {
              street: req.address?.line1 || '',
              city: req.address?.city || '',
              state: req.address?.state || '',
              pincode: req.address?.pincode || '',
              lat: req.address?.lat,
              lng: req.address?.lng
            }
          }
        },
        costBreakdown: req.costBreakdown,
        workDetails: req.workDetails
      };

      setService(normalized as any);
      const total = req.workDetails?.totalCost ?? req.costBreakdown?.totalAmount ?? 0;
      setFormData((prev) => ({
        ...prev,
        totalCost: typeof total === 'number' ? total : 0,
        nextServiceDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }));
    } catch (error) {
      console.error('Failed to fetch service details:', error);
      toast.error('Could not load this service.');
      navigate('/employee/assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addPart = () => {
    const newPart = {
      id: Date.now(),
      name: '',
      quantity: 1,
      cost: 0
    };
    setFormData(prev => ({
      ...prev,
      partsUsed: [...prev.partsUsed, newPart]
    }));
  };

  const updatePart = (partId: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      partsUsed: prev.partsUsed.map(part => 
        part.id === partId ? { ...part, [field]: value } : part
      )
    }));
    calculateTotalCost();
  };

  const removePart = (partId: number) => {
    setFormData(prev => ({
      ...prev,
      partsUsed: prev.partsUsed.filter(part => part.id !== partId)
    }));
    calculateTotalCost();
  };

  const calculateTotalCost = () => {
    const partsCost = formData.partsUsed.reduce((total, part) => total + (part.cost * part.quantity), 0);
    const totalCost = partsCost + formData.laborCost;
    setFormData(prev => ({
      ...prev,
      totalCost
    }));
  };

  const handlePhotoUpload = (type: 'before' | 'after', files: FileList) => {
    const photoUrls = Array.from(files).map(file => URL.createObjectURL(file));
    setFormData(prev => ({
      ...prev,
      [`${type}Photos`]: [...prev[`${type}Photos`], ...photoUrls]
    }));
  };

  const completeService = async () => {
    setSaving(true);
    try {
      // Mock API call to complete service
      console.log('Completing service with data:', formData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate back to assignments
      navigate('/employee/assignments');
    } catch (error) {
      console.error('Failed to complete service:', error);
    } finally {
      setSaving(false);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{service?.serviceId}</h1>
            <p className="text-sm text-gray-500 capitalize">
              {service?.serviceType} Service — {(service as any)?.priority} priority
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
              <Clock className="h-4 w-4 mr-1" />
              {(service as any)?.status?.replace('_', ' ') || '—'}
            </span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center text-sm">
            <User className="h-4 w-4 mr-2 text-gray-500" />
            <div>
              <p className="font-medium">{service?.client?.user?.name}</p>
              <div className="flex items-center mt-1">
                <Phone className="h-3 w-3 mr-1 text-gray-400" />
                <span className="text-xs text-gray-600">{service?.client?.user?.phone}</span>
              </div>
            </div>
          </div>
          <div className="flex items-start text-sm">
            <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-0.5" />
            <div>
              <p>{service?.client?.user?.address?.street}</p>
              <p className="text-xs text-gray-600">
                {service?.client?.user?.address?.city}, {service?.client?.user?.address?.state} —{' '}
                {service?.client?.user?.address?.pincode}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Service Details</h2>
          
          <button
            type="button"
            onClick={toggleLocationSharing}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isSharingLocation ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <MapPin className="h-4 w-4 mr-2" />
            {isSharingLocation ? 'Stop sharing location' : 'Start live tracking'}
          </button>
        </div>
        
        {/* Live Navigation Route Map */}
        {isSharingLocation && (
          <div className="mb-6">
            <LiveTrackerMap
              serviceId={serviceId!}
              destinationAddress={
                service?.client?.user?.address
                  ? {
                      line1: (service as any).client.user.address.street || '',
                      city: (service as any).client.user.address.city || '',
                      state: (service as any).client.user.address.state || '',
                      pincode: (service as any).client.user.address.pincode || '',
                      lat: (service as any).client.user.address.lat,
                      lng: (service as any).client.user.address.lng
                    }
                  : null
              }
            />
          </div>
        )}
        
        {/* Work Performed */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Performed *
          </label>
          <textarea
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Describe the work performed in detail..."
            value={formData.workPerformed}
            onChange={(e) => handleInputChange('workPerformed', e.target.value)}
          />
        </div>

        {/* Parts Used */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Parts Used
            </label>
            <button
              type="button"
              onClick={addPart}
              className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-orange-600 bg-orange-100 hover:bg-orange-200"
            >
              <Package className="h-4 w-4 mr-1" />
              Add Part
            </button>
          </div>
          
          {formData.partsUsed.map((part, index) => (
            <div key={part.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                placeholder="Part name"
                className="border border-gray-300 rounded px-3 py-2 text-sm"
                value={part.name}
                onChange={(e) => updatePart(part.id, 'name', e.target.value)}
              />
              <input
                type="number"
                placeholder="Quantity"
                min="1"
                className="border border-gray-300 rounded px-3 py-2 text-sm"
                value={part.quantity}
                onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value))}
              />
              <input
                type="number"
                placeholder="Cost per unit"
                min="0"
                className="border border-gray-300 rounded px-3 py-2 text-sm"
                value={part.cost}
                onChange={(e) => updatePart(part.id, 'cost', parseFloat(e.target.value))}
              />
              <button
                type="button"
                onClick={() => removePart(part.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Labor Cost (₹)
            </label>
            <input
              type="number"
              min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={formData.laborCost}
              onChange={(e) => {
                handleInputChange('laborCost', parseFloat(e.target.value) || 0);
                calculateTotalCost();
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parts Cost (₹)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
              value={formData.partsUsed.reduce((total, part) => total + (part.cost * part.quantity), 0)}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Cost (₹)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 font-semibold"
              value={formData.totalCost}
              readOnly
            />
          </div>
        </div>

        {/* Photo Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Before Photos
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="before-photos"
                onChange={(e) => e.target.files && handlePhotoUpload('before', e.target.files)}
              />
              <label htmlFor="before-photos" className="cursor-pointer">
                <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload before photos</p>
              </label>
              {formData.beforePhotos.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {formData.beforePhotos.map((photo, index) => (
                    <img key={index} src={photo} alt="Before" className="h-16 w-16 object-cover rounded" />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              After Photos
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                id="after-photos"
                onChange={(e) => e.target.files && handlePhotoUpload('after', e.target.files)}
              />
              <label htmlFor="after-photos" className="cursor-pointer">
                <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload after photos</p>
              </label>
              {formData.afterPhotos.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {formData.afterPhotos.map((photo, index) => (
                    <img key={index} src={photo} alt="After" className="h-16 w-16 object-cover rounded" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next Service Date */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Next Service Date
          </label>
          <input
            type="date"
            className="w-full md:w-1/3 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            value={formData.nextServiceDate}
            onChange={(e) => handleInputChange('nextServiceDate', e.target.value)}
          />
        </div>

        {/* Recommendations */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recommendations
          </label>
          <textarea
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Any recommendations for the customer..."
            value={formData.recommendations}
            onChange={(e) => handleInputChange('recommendations', e.target.value)}
          />
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={formData.paymentMethod}
              onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Status
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={formData.paymentStatus}
              onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>

        {/* Customer Signature */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Customer Signature
          </label>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">Customer signature will be captured here</p>
            <div className="h-24 bg-white border border-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-400 text-sm">Signature Area</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/employee/assignments')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </button>
            
            <button
              type="button"
              onClick={completeService}
              disabled={saving || !formData.workPerformed}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Service
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceForm;