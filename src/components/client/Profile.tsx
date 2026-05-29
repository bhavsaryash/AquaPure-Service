import {
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle,
  Edit,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  User,
  Wrench,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { amcAPI, clientAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    },
    roDetails: {
      brand: '',
      model: '',
      capacity: '',
      serialNumber: '',
      installationDate: '',
      warrantyExpiry: ''
    },
    amcDetails: {
      isActive: false,
      startDate: '',
      endDate: '',
      amount: 0,
      servicesIncluded: 0,
      servicesUsed: 0
    }
  });

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      const profileResponse = await clientAPI.getProfile();
      const userData = profileResponse.data || {};

      let amcStatusData = {
        isActive: false,
        startDate: '',
        endDate: '',
        amount: 0,
        servicesIncluded: 0,
        servicesUsed: 0
      };

      try {
        const amcResponse = await amcAPI.getMySubscription();
        if (amcResponse.data) {
          // Backward compatibility: use amcResponse.data.active if available, else fallback
          const sub = amcResponse.data.active || (amcResponse.data.status ? amcResponse.data : null);
          
          if (sub) {
            const servicesIncluded = sub.plan?.servicesIncluded || 0;
            const servicesUsed = servicesIncluded - (sub.servicesRemaining || 0);

            amcStatusData = {
              isActive: sub.status === 'active',
              startDate: sub.startDate,
              endDate: sub.endDate,
              amount: sub.plan?.price || 0,
              servicesIncluded: servicesIncluded,
              servicesUsed: servicesUsed >= 0 ? servicesUsed : 0
            };
          }
        }
      } catch (err) {
        // AMC subscription likely perfectly fine if not found
      }

      setProfileData({
        name: userData.name || user?.name || '',
        email: userData.email || user?.email || '',
        phone: userData.phone || user?.phone || '',
        address: userData.address || {
          street: '',
          city: '',
          state: '',
          pincode: ''
        },
        roDetails: {
          brand: userData.roDetails?.brand || '',
          model: userData.roDetails?.model || '',
          capacity: userData.roDetails?.capacity || '',
          serialNumber: userData.roDetails?.serialNumber || '',
          installationDate: userData.roDetails?.installationDate ? new Date(userData.roDetails.installationDate).toISOString().split('T')[0] : '',
          warrantyExpiry: userData.roDetails?.warrantyExpiry ? new Date(userData.roDetails.warrantyExpiry).toISOString().split('T')[0] : ''
        },
        amcDetails: amcStatusData
      });
    } catch (error) {
      console.error('Failed to fetch profile', error);
      toast.error('Failed to load profile details');
    }
  };

  const handleInputChange = (field: string, value: any, section?: string) => {
    if (section) {
      setProfileData(prev => ({
        ...prev,
        [section]: {
          ...(prev as any)[section],
          [field]: value
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await clientAPI.updateProfile({
        name: profileData.name,
        phone: profileData.phone,
        address: profileData.address,
        roDetails: profileData.roDetails
      });
      
      updateUser({ ...user!, name: profileData.name, phone: profileData.phone });
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    fetchProfileData();
    setIsEditing(false);
  };

  const getWarrantyStatus = () => {
    const warrantyDate = new Date(profileData.roDetails.warrantyExpiry);
    const today = new Date();
    const daysLeft = Math.ceil((warrantyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 90) {
      return { status: 'active', color: 'text-green-600 bg-green-100', text: `${daysLeft} days left` };
    } else if (daysLeft > 0) {
      return { status: 'expiring', color: 'text-yellow-600 bg-yellow-100', text: `Expires in ${daysLeft} days` };
    } else {
      return { status: 'expired', color: 'text-red-600 bg-red-100', text: 'Expired' };
    }
  };

  const getAMCStatus = () => {
    if (!profileData.amcDetails.isActive) {
      return { status: 'inactive', color: 'text-gray-600 bg-gray-100', text: 'Not Active' };
    }
    
    const endDate = new Date(profileData.amcDetails.endDate);
    const today = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 30) {
      return { status: 'active', color: 'text-green-600 bg-green-100', text: `Active (${daysLeft} days left)` };
    } else if (daysLeft > 0) {
      return { status: 'expiring', color: 'text-yellow-600 bg-yellow-100', text: `Expires in ${daysLeft} days` };
    } else {
      return { status: 'expired', color: 'text-red-600 bg-red-100', text: 'Expired' };
    }
  };

  const warrantyStatus = getWarrantyStatus();
  const amcStatus = getAMCStatus();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-4 rounded-full">
              <User className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profileData.name}</h1>
              <p className="text-sm text-gray-500">Client Profile</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            {isEditing ? (
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            ) : (
              <div className="flex items-center text-gray-900">
                <User className="h-4 w-4 mr-2 text-gray-500" />
                {profileData.name}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            {isEditing ? (
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            ) : (
              <div className="flex items-center text-gray-900">
                <Mail className="h-4 w-4 mr-2 text-gray-500" />
                {profileData.email}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            {isEditing ? (
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            ) : (
              <div className="flex items-center text-gray-900">
                <Phone className="h-4 w-4 mr-2 text-gray-500" />
                {profileData.phone}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Address Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
            {isEditing ? (
              <input
                type="text"
                value={profileData.address.street}
                onChange={(e) => handleInputChange('street', e.target.value, 'address')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            ) : (
              <div className="flex items-center text-gray-900">
                <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                {profileData.address.street}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            {isEditing ? (
              <input
                type="text"
                value={profileData.address.city}
                onChange={(e) => handleInputChange('city', e.target.value, 'address')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            ) : (
              <p className="text-gray-900">{profileData.address.city}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            {isEditing ? (
              <input
                type="text"
                value={profileData.address.state}
                onChange={(e) => handleInputChange('state', e.target.value, 'address')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            ) : (
              <p className="text-gray-900">{profileData.address.state}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code</label>
            {isEditing ? (
              <input
                type="text"
                value={profileData.address.pincode}
                onChange={(e) => handleInputChange('pincode', e.target.value, 'address')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            ) : (
              <p className="text-gray-900">{profileData.address.pincode}</p>
            )}
          </div>
        </div>
      </div>

      {/* RO System Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Wrench className="h-6 w-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">RO System Details</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
            {isEditing ? (
              <input
                type="text"
                value={profileData.roDetails.brand}
                onChange={(e) => handleInputChange('brand', e.target.value, 'roDetails')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profileData.roDetails.brand}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            {isEditing ? (
              <input
                type="text"
                value={profileData.roDetails.model}
                onChange={(e) => handleInputChange('model', e.target.value, 'roDetails')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            ) : (
              <p className="text-gray-900">{profileData.roDetails.model}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Capacity (Liters)</label>
            {isEditing ? (
              <input
                type="number"
                value={profileData.roDetails.capacity}
                onChange={(e) => handleInputChange('capacity', e.target.value, 'roDetails')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            ) : (
              <p className="text-gray-900">{profileData.roDetails.capacity}L</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
            {isEditing ? (
              <input
                type="text"
                value={profileData.roDetails.serialNumber}
                onChange={(e) => handleInputChange('serialNumber', e.target.value, 'roDetails')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            ) : (
              <p className="text-gray-900 font-mono text-sm">{profileData.roDetails.serialNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Installation Date</label>
            {isEditing ? (
              <input
                type="date"
                value={profileData.roDetails.installationDate}
                onChange={(e) => handleInputChange('installationDate', e.target.value, 'roDetails')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            ) : (
              <p className="text-gray-900">{new Date(profileData.roDetails.installationDate).toLocaleDateString('en-IN')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Warranty Status</label>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${warrantyStatus.color}`}>
              {warrantyStatus.status === 'active' ? (
                <CheckCircle className="h-4 w-4 mr-1" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-1" />
              )}
              {warrantyStatus.text}
            </div>
          </div>
        </div>
      </div>

      {/* AMC Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <Shield className="h-6 w-6 text-green-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">AMC Details</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AMC Status</label>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${amcStatus.color}`}>
              {amcStatus.status === 'active' ? (
                <CheckCircle className="h-4 w-4 mr-1" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-1" />
              )}
              {amcStatus.text}
            </div>
          </div>

          {profileData.amcDetails.isActive && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan Amount</label>
                <p className="text-gray-900 font-semibold">₹{profileData.amcDetails.amount.toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
                <p className="text-gray-900">{new Date(profileData.amcDetails.endDate).toLocaleDateString('en-IN')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Services Included</label>
                <p className="text-gray-900">{profileData.amcDetails.servicesIncluded} services</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Services Used</label>
                <div className="flex items-center">
                  <p className="text-gray-900 mr-2">{profileData.amcDetails.servicesUsed} / {profileData.amcDetails.servicesIncluded}</p>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-20">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(profileData.amcDetails.servicesUsed / profileData.amcDetails.servicesIncluded) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Services Remaining</label>
                <p className="text-green-600 font-semibold">
                  {profileData.amcDetails.servicesIncluded - profileData.amcDetails.servicesUsed} services
                </p>
              </div>
            </>
          )}
        </div>

        {!profileData.amcDetails.isActive && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-800">No Active AMC</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Subscribe to our Annual Maintenance Contract for regular service and priority support.
                </p>
                <button className="mt-2 inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                  Subscribe to AMC
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Security */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Security</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Password</p>
              <p className="text-sm text-gray-500">Last updated 30 days ago</p>
            </div>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Change Password
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Enable 2FA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;