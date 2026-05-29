import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  Wrench,
  UserCheck,
  X
} from 'lucide-react';
import { adminAPI } from '../../utils/api';

interface Service {
  _id: string;
  serviceId: string;
  serviceType: string;
  status: string;
  urgency?: string;
  preferredDate?: string;
  preferredTime?: string;
  address?: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
  user?: {
    name: string;
    phone: string;
  };
  assignedEmployee?: {
    _id: string;
    user: {
      name: string;
      phone: string;
    }
  };
  issueDescription: string;
  costBreakdown?: {
    totalAmount: number;
    paymentStatus: string;
    paymentMethod?: string;
  };
  feedback?: {
    rating: number;
    comment: string;
  };
}

interface Employee {
  _id: string;
  user: {
    name: string;
  };
}

const ServiceManagement: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Assignment Modal State
  // Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEditService, setSelectedEditService] = useState<Service | null>(null);
  const [editFormData, setEditFormData] = useState({
    status: '',
    urgency: '',
    issueDescription: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchEmployees();
  }, []);

  const fetchServices = async () => {
    try {
      const data = await adminAPI.getServices();
      setServices(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await adminAPI.getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleAssignClick = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSelectedEmployeeId('');
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedServiceId || !selectedEmployeeId) return;

    setAssignLoading(true);
    try {
      await adminAPI.assignService(selectedServiceId, selectedEmployeeId);
      await fetchServices();
      setShowAssignModal(false);
      setSelectedServiceId(null);
      setSelectedEmployeeId('');
    } catch (error) {
      console.error('Failed to assign service:', error);
      alert('Failed to assign service');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleEditClick = (service: Service) => {
    setSelectedEditService(service);
    setEditFormData({
      status: service.status || 'pending',
      urgency: service.urgency || 'low',
      issueDescription: service.issueDescription || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedEditService) return;

    setEditLoading(true);
    try {
      await adminAPI.updateService(selectedEditService._id, editFormData);
      await fetchServices();
      setShowEditModal(false);
      setSelectedEditService(null);
    } catch (error) {
      console.error('Failed to update service:', error);
      alert('Failed to update service');
    } finally {
      setEditLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'assigned':
        return <UserCheck className="h-5 w-5 text-purple-500" />;
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
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
      case 'assigned':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize";

    switch (priority) {
      case 'high':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'low':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const filteredServices = services.filter(service => {
    const clientName = service.user?.name || '';
    const empName = service.assignedEmployee?.user?.name || '';

    const matchesSearch = service.serviceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
    const matchesType = typeFilter === 'all' || service.serviceType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track all service requests
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Service
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{services.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {services.filter(s => s.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <UserCheck className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Assigned</p>
              <p className="text-2xl font-bold text-gray-900">
                {services.filter(s => s.status === 'assigned').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {services.filter(s => s.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {services.filter(s => s.status === 'completed').length}
              </p>
            </div>
          </div>
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
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">All Types</option>
              <option value="maintenance">Maintenance</option>
              <option value="repair">Repair</option>
              <option value="installation">Installation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Service List */}
      <div className="space-y-4">
        {filteredServices.map((service) => (
          <div key={service._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
                {service.urgency && <span className={getPriorityBadge(service.urgency)}>
                  {service.urgency}
                </span>}
                <span className={getStatusBadge(service.status)}>
                  {service.status.replace('_', ' ')}
                </span>
                {service.costBreakdown && <span className="text-lg font-bold text-gray-900">
                  ₹{service.costBreakdown.totalAmount?.toLocaleString() || 0}
                </span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">{service.user?.name}</p>
                  <div className="flex items-center mt-1">
                    <Phone className="h-3 w-3 mr-1" />
                    <span className="text-xs">{service.user?.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span className="text-xs">
                      {service.address
                        ? `${service.address.line1}, ${service.address.city}`
                        : 'No Address'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                <div>
                  {service.preferredDate ? (
                    <>
                      <p className="font-medium">Scheduled</p>
                      <p>{new Date(service.preferredDate).toLocaleDateString('en-IN')}</p>
                      <p className="text-xs">{service.preferredTime || 'Any time'}</p>
                    </>
                  ) : (
                    <p>Not Scheduled</p>
                  )}
                </div>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                {service.assignedEmployee ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{service.assignedEmployee.user.name}</p>
                      <div className="flex items-center mt-1">
                        <Phone className="h-3 w-3 mr-1" />
                        <span className="text-xs">{service.assignedEmployee.user.phone}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 text-yellow-500" />
                    <div>
                      <p className="font-medium text-yellow-600">Unassigned</p>
                      <p className="text-xs">Needs technician assignment</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">{service.issueDescription}</p>
            </div>

            {service.feedback && (
              <div className="bg-green-50 rounded-lg p-3 mb-4">
                <div className="flex items-center mb-1">
                  <span className="text-sm font-medium text-green-800">Customer Feedback:</span>
                  <div className="flex items-center ml-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-xs ${star <= service.feedback!.rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-green-700">{service.feedback.comment}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-4">
                {service.costBreakdown && (
                  <>
                    <span className={`text-xs px-2 py-1 rounded-full ${service.costBreakdown.paymentStatus === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      Payment: {service.costBreakdown.paymentStatus.toUpperCase()}
                    </span>
                    {service.costBreakdown.paymentMethod && (
                      <span className="text-xs text-gray-500 capitalize">
                        via {service.costBreakdown.paymentMethod}
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {!service.assignedEmployee && service.status !== 'cancelled' && (
                  <button
                    onClick={() => handleAssignClick(service.serviceId)}
                    className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Assign
                  </button>
                )}

                <button 
                  onClick={() => handleEditClick(service)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Services Found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No services have been created yet'
              }
            </p>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Assign Technician</h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Technician</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.user.name} ({emp._id.substring(0, 4)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignSubmit}
                  disabled={!selectedEmployeeId || assignLoading}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                >
                  {assignLoading ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEditService && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Service Request</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={editFormData.urgency}
                  onChange={(e) => setEditFormData({ ...editFormData, urgency: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Issue Description</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={4}
                  value={editFormData.issueDescription}
                  onChange={(e) => setEditFormData({ ...editFormData, issueDescription: e.target.value })}
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={editLoading}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagement;