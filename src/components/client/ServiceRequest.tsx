import React, { useState } from 'react';
import {
  Camera,
  CheckCircle,
  Phone,
  Wrench,
  AlertTriangle,
  MapPin,
  Calendar,
  Clock,
  Info
} from 'lucide-react';
import PDFGenerator from '../common/PDFGenerator';
import { useAuth } from '../../contexts/AuthContext';
import { amcAPI, clientAPI, liveAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import PaymentButton from '../common/PaymentButton';

const ServiceRequest: React.FC = () => {
  const { user } = useAuth();

  // Parse query params for default service type
  const getInitialServiceType = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const type = params.get('type');
      if (type === 'amc') return 'amc_renewal'; // Or 'maintenance' if included in plan
      // Could also map other types if needed
    }
    return 'maintenance';
  };

  const [formData, setFormData] = useState({
    serviceType: getInitialServiceType(),
    issueCategory: '',
    issueDescription: '',
    urgency: 'medium',
    preferredDate: '',
    preferredTime: '',
    contactPreference: 'phone',
    additionalNotes: '',
    address: {
      line1: '',
      city: '',
      state: '',
      pincode: '',
      lat: undefined as number | undefined,
      lng: undefined as number | undefined
    },
    paymentPreference: 'Cash',
    onlinePaymentMethod: 'UPI'
  });

  const [selectedPhotos, setSelectedPhotos] = useState<Array<{ file: File; preview: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastSubmittedRequest, setLastSubmittedRequest] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [hasAMC, setHasAMC] = useState(false);
  const [amcPlanName, setAmcPlanName] = useState('');
  const [loadingAMC, setLoadingAMC] = useState(true);

  React.useEffect(() => {
    amcAPI.getMySubscription()
      .then(res => {
         const active = res.data?.active;
         if (active && active.plan && active.status === 'active') {
             const name = active.plan.name?.toLowerCase() || '';
             // Check if it's standard shield or premium protection
             if (name.includes('standard shield') || name.includes('premium protection')) {
                 setHasAMC(true);
                 setAmcPlanName(active.plan.name);
             }
         }
      })
      .catch(err => console.error("Error fetching AMC status:", err))
      .finally(() => setLoadingAMC(false));
  }, []);

  const bookingFee = hasAMC ? 0 : 150;

  const serviceTypes = [
    { value: 'maintenance', label: 'Regular Maintenance', description: 'Routine service and filter replacement' },
    { value: 'repair', label: 'Repair Service', description: 'Fix issues with your RO system' },
    { value: 'installation', label: 'New Installation', description: 'Install a new RO system' },
    { value: 'amc_renewal', label: 'AMC Renewal', description: 'Renew your Annual Maintenance Contract' }
  ];

  const issueCategories = [
    'Water not coming',
    'Poor water taste',
    'Water leakage',
    'Strange noise',
    'Low water pressure',
    'Filter replacement needed',
    'UV light not working',
    'Storage tank issue',
    'Electrical problem',
    'Other'
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Low', description: 'Can wait a few days', color: 'text-green-600 bg-green-100 border-green-200' },
    { value: 'medium', label: 'Medium', description: 'Within 2-3 days', color: 'text-yellow-600 bg-yellow-100 border-yellow-200' },
    { value: 'high', label: 'High', description: 'Within 24 hours', color: 'text-orange-600 bg-orange-100 border-orange-200' },
    { value: 'critical', label: 'Critical', description: 'Emergency - Same day', color: 'text-red-600 bg-red-100 border-red-200' }
  ];

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handlePhotoUpload = (files: FileList) => {
    const newPhotos = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setSelectedPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    toast.loading('Fetching precise location...', { id: 'loc-fetch' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.dismiss('loc-fetch');
        toast.success('Exact location captured securely!');
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        }));
        
        liveAPI.reverseGeocode(position.coords.latitude, position.coords.longitude)
          .then((data) => {
             if (data && data.address) {
                setFormData(prev => ({
                   ...prev,
                   address: {
                      ...prev.address,
                      line1: data.address.line1 || prev.address.line1,
                      city: data.address.city || prev.address.city,
                      state: data.address.state || prev.address.state,
                      pincode: data.address.pincode || prev.address.pincode
                   }
                }));
             }
          })
          .catch((err) => {
             console.error("Reverse geocoding failed", err);
          });
      },
      (error) => {
        toast.dismiss('loc-fetch');
        toast.error('Could not get your location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const validateForm = () => {
    setError(null);
    if (!formData.address.line1 || !formData.address.city || !formData.address.state || !formData.address.pincode) {
      setError('Please fill in all address fields');
      toast.error('Please fill in all address fields');
      return false;
    }
    return true;
  };

  const processSubmission = async (paymentDetails?: any) => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Create FormData object
      const data = new FormData();

      Object.keys(formData).forEach(key => {
        if (key === 'address') {
          data.append('address', JSON.stringify(formData.address));
        } else {
          data.append(key, (formData as any)[key]);
        }
      });

      if (paymentDetails && paymentDetails.razorpay_payment_id) {
          data.append('paymentDetails', JSON.stringify(paymentDetails));
      }

      // Append photos
      selectedPhotos.forEach(photo => {
        data.append('photos', photo.file);
      });

      const response = await clientAPI.createServiceRequest(data);

      setSubmitted(true);
      if (response && response.data) {
        setLastSubmittedRequest(response.data);
      } else {
        setLastSubmittedRequest(response);
      }

    } catch (error: any) {
      console.error('Failed to submit service request:', error);
      setError(error.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    const receiptData = {
      serviceId: lastSubmittedRequest?.serviceId || 'PENDING',
      customerName: user?.name || 'Valued Customer',
      customerPhone: user?.phone || (formData.contactPreference === 'phone' ? 'Provided in request' : 'N/A'),
      customerAddress: `${formData.address.line1}, ${formData.address.city}, ${formData.address.state} - ${formData.address.pincode}`,
      serviceDate: formData.preferredDate || new Date().toISOString(),
      serviceType: formData.serviceType,
      employeeName: 'Pending Assignment',
      workPerformed: 'Service Request Submitted',
      partsUsed: [],
      laborCost: 0,
      bookingFee: bookingFee,
      totalCost: bookingFee,
      paymentMethod: bookingFee > 0 ? 'Online Booking Fee' : 'Fee Waived (AMC)',
      paymentStatus: bookingFee > 0 ? 'Booking Paid' : 'Waived',
      nextServiceDate: undefined
    };

    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden text-center p-8">
          <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Your service request <span className="font-mono font-bold text-gray-900">{lastSubmittedRequest?.serviceId}</span> has been received.
            We will assign a technician shortly.
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left max-w-lg mx-auto border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Request Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Service Type</span>
                <span className="font-medium text-gray-900 capitalize">{formData.serviceType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location</span>
                <span className="font-medium text-gray-900 text-right">{formData.address.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Preferred Date</span>
                <span className="font-medium text-gray-900">
                  {formData.preferredDate ? new Date(formData.preferredDate).toLocaleDateString('en-IN') : 'Flexible'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <PDFGenerator receipt={receiptData} buttonText="Download Booking Invoice" />
            <button
              onClick={() => window.location.href = '/client/services'}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Track Status
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Request Service</h1>
          <p className="text-green-100 max-w-xl">
            Schedule a visit from our expert technicians. Fill out the form below and we'll take care of the rest.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white opacity-10 transform skew-x-12 translate-x-10"></div>
        <Wrench className="absolute right-10 bottom-8 h-24 w-24 text-green-800 opacity-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">

            {/* 1. Service Type */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
                <div className="bg-white p-2 rounded-lg shadow-sm mr-3">
                  <Wrench className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">1. Select Service Type</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {serviceTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${formData.serviceType === type.value
                      ? 'border-green-500 bg-green-50 shadow-sm'
                      : 'border-gray-100 hover:border-green-200 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="radio"
                      name="serviceType"
                      value={type.value}
                      checked={formData.serviceType === type.value}
                      onChange={(e) => handleInputChange('serviceType', e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-900">{type.label}</span>
                      {formData.serviceType === type.value && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* 2. Issue Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
                <div className="bg-white p-2 rounded-lg shadow-sm mr-3">
                  <Info className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">2. Describe the Issue</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.issueCategory}
                    onChange={(e) => handleInputChange('issueCategory', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 py-2.5 px-4 bg-gray-50 focus:bg-white transition-colors"
                    required
                  >
                    <option value="">Select a category...</option>
                    {issueCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Detailed Description</label>
                  <textarea
                    rows={4}
                    value={formData.issueDescription}
                    onChange={(e) => handleInputChange('issueDescription', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 py-3 px-4 bg-gray-50 focus:bg-white transition-colors"
                    placeholder="Please explain the problem in detail (e.g., 'Strange noise when turning on', 'Water tastes metallic')..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Photos (Optional)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      id="photo-upload"
                      onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer flex flex-col items-center">
                      <Camera className="h-10 w-10 text-gray-400 mb-3" />
                      <span className="text-sm font-medium text-gray-600">Click to upload photos</span>
                      <span className="text-xs text-gray-400 mt-1">Help our technicians understand the issue better</span>
                    </label>
                  </div>
                  {selectedPhotos.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {selectedPhotos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img src={photo.preview} alt="Preview" className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <span className="sr-only">Remove</span>
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Service Location (NEW) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-white p-2 rounded-lg shadow-sm mr-3">
                    <MapPin className="h-5 w-5 text-red-500" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">3. Service Location</h2>
                </div>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className={`inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    formData.address.lat 
                      ? 'text-green-700 bg-green-100 hover:bg-green-200' 
                      : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  {formData.address.lat ? 'Exact Coordinates Saved ✓' : 'Add Precise Location Pin (GPS)'}
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                  <input
                    type="text"
                    value={formData.address.line1}
                    onChange={(e) => handleInputChange('address.line1', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 py-2.5 px-4"
                    placeholder="House No, Building, Street Area"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 py-2.5 px-4"
                    placeholder="e.g. Ahmedabad"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange('address.state', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 py-2.5 px-4"
                    placeholder="e.g. Gujarat"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                  <input
                    type="text"
                    value={formData.address.pincode}
                    onChange={(e) => handleInputChange('address.pincode', e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 py-2.5 px-4"
                    placeholder="380001"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 4. Preference & Urgency */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
                <div className="bg-white p-2 rounded-lg shadow-sm mr-3">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">4. Timing & Urgency</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">How urgent is this?</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {urgencyLevels.map((level) => (
                      <label
                        key={level.value}
                        className={`cursor-pointer rounded-lg border px-3 py-3 text-center transition-all ${formData.urgency === level.value
                          ? level.color + ' ring-2 ring-offset-1 ring-green-500'
                          : 'border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        <input
                          type="radio"
                          name="urgency"
                          value={level.value}
                          checked={formData.urgency === level.value}
                          onChange={(e) => handleInputChange('urgency', e.target.value)}
                          className="sr-only"
                        />
                        <span className="font-semibold block text-sm">{level.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formData.preferredDate}
                        onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 py-2.5 px-4 pl-10"
                      />
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</label>
                    <div className="relative">
                      <select
                        value={formData.preferredTime}
                        onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500 py-2.5 px-4 pl-10 appearance-none bg-white"
                      >
                        <option value="">Any time</option>
                        <option value="9:00 AM - 12:00 PM">Morning (9 - 12)</option>
                        <option value="12:00 PM - 3:00 PM">Afternoon (12 - 3)</option>
                        <option value="3:00 PM - 6:00 PM">Evening (3 - 6)</option>
                      </select>
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Payment & Booking Confirmation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center">
                <div className="bg-white p-2 rounded-lg shadow-sm mr-3">
                  <span className="font-bold text-lg text-emerald-600">₹</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">5. Payment & Booking Confirmation</h2>
              </div>
              <div className="p-6 space-y-6">
                {!loadingAMC && hasAMC ? (
                   <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                     <div className="bg-green-100 p-2 rounded-full mr-3 text-green-600">
                       <CheckCircle className="h-5 w-5" />
                     </div>
                     <div>
                       <h4 className="text-sm font-bold text-green-900">Booking Fee Waived</h4>
                       <p className="text-sm text-green-800 mt-1">
                         Because you fall under the active <span className="font-bold">{amcPlanName}</span> plan, the standard ₹150 booking charge has been completely waived!
                       </p>
                     </div>
                   </div>
                ) : (
                   <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
                     <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600">
                       <Info className="h-5 w-5" />
                     </div>
                     <div>
                       <h4 className="text-sm font-bold text-blue-900">Standard Booking Charge</h4>
                       <p className="text-sm text-blue-800 mt-1">
                         A mandatory booking charge of <span className="font-bold">₹150</span> applies to confirm your service request securely online.
                       </p>
                     </div>
                   </div>
                )}
              </div>
            </div>

            {/* Error & Submit */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center mb-4">
                <AlertTriangle className="h-5 w-5 mr-2" />
                {error}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <PaymentButton 
                 amount={bookingFee}
                 onBeforePayment={async () => {
                     return validateForm();
                 }}
                 onSuccess={(details) => processSubmission(details)}
                 buttonText={bookingFee > 0 ? "Pay ₹150 Booking Fee & Confirm" : "Confirm Request Securely"}
                 className={`w-full md:w-auto px-8 py-3.5 rounded-lg shadow-md font-semibold text-lg flex items-center justify-center transition-all bg-green-600 text-white hover:bg-green-700`}
              />
            </div>

          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <Phone className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="font-semibold text-blue-900">Need Immediate Help?</h3>
            </div>
            <p className="text-blue-800 text-sm mb-4">
              For critical issues like major leaks or electrical hazards, please call our 24/7 emergency line directly.
            </p>
            <a href="tel:9558641805" className="block w-full bg-blue-600 text-white text-center py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Call +91-9558641805
            </a>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="bg-white border border-gray-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-500 mr-3 mt-0.5">1</div>
                <p className="text-sm text-gray-600">We receive your request and analyze the issue.</p>
              </li>
              <li className="flex items-start">
                <div className="bg-white border border-gray-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-500 mr-3 mt-0.5">2</div>
                <p className="text-sm text-gray-600">An expert technician is assigned to your location.</p>
              </li>
              <li className="flex items-start">
                <div className="bg-white border border-gray-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-500 mr-3 mt-0.5">3</div>
                <p className="text-sm text-gray-600">Technician visits at your preferred time to resolve the issue.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceRequest;