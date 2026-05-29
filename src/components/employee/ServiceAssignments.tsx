import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, User, Phone, Wrench, AlertCircle, CheckCircle, Search, Filter } from 'lucide-react';
import { employeeAPI } from '../../utils/api';
import JobCompletionModal from './JobCompletionModal';
import { toast } from 'react-hot-toast';

interface ServiceAssignment {
  _id: string; // Changed from id to _id to match MongoDB
  serviceId: string;
  user: {
    name: string;
    phone: string;
  };
  address?: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
  serviceType: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  preferredDate: string;
  preferredTime: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled'; // Changed dashes to underscores
  issueDescription: string;
  // estimatedDuration: string; // Not in backend yet
  // roModel: string; // Not in backend yet
  feedback?: {
    rating: number;
    comment: string;
    submittedAt: string;
  };
}

const ServiceAssignments: React.FC = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<ServiceAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [selectedJob, setSelectedJob] = useState<ServiceAssignment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await employeeAPI.getAssignments();
      const data = res.data || [];
      const normalized: ServiceAssignment[] = data.map((item: any) => ({
        _id: item._id,
        serviceId: item.serviceId,
        user: {
          name: item.user?.name || 'Unknown',
          phone: item.user?.phone || 'N/A',
        },
        address: item.address,
        serviceType: item.serviceType,
        urgency: item.urgency,
        preferredDate: item.preferredDate,
        preferredTime: item.preferredTime,
        status: item.status,
        issueDescription: item.issueDescription,
        feedback: item.feedback,
      }));
      setAssignments(normalized);
    } catch (error) {
      console.error('Failed to fetch assignments', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const updateAssignmentStatus = async (id: string, newStatus: string) => {
    try {
      await employeeAPI.updateStatus(id, newStatus);
      setAssignments(prev => prev.map(assignment =>
        assignment._id === id ? { ...assignment, status: newStatus as any } : assignment
      ));
      toast.success(`Job status updated to ${newStatus}`);
      if (newStatus === 'in_progress') {
        navigate(`/employee/service/${id}`);
      }
    } catch (error) {
      console.error('Failed to update status', error);
      toast.error('Failed to update status');
    }
  };

  const handleCompleteJob = (job: ServiceAssignment) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: any) => {
    if (!selectedJob) return;
    try {
      await employeeAPI.completeService(selectedJob._id, data);
      setAssignments(prev => prev.map(assignment =>
        assignment._id === selectedJob._id ? { ...assignment, status: 'completed' } : assignment
      ));
      toast.success('Job marked as completed!');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to complete job', error);
      toast.error('Failed to complete job');
      throw error; // Let modal handle error display if needed
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <Wrench className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (assignment.address &&
        `${assignment.address.line1} ${assignment.address.city}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
      assignment.serviceType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || assignment.urgency === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return <div className="p-8 text-center">Loading assignments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Assignments</h1>
            <p className="text-gray-600 mt-1">Manage your daily service assignments and track progress</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Today: {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Priority</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'You have no service assignments at the moment.'}
            </p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => (
            <div key={assignment._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        {assignment.user?.name || 'Unknown Client'}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {assignment.user?.phone || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {assignment.preferredTime}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(assignment.urgency)}`}>
                        {assignment.urgency.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(assignment.status)}`}>
                        {getStatusIcon(assignment.status)}
                        {assignment.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                        {assignment.address
                          ? `${assignment.address.line1}, ${assignment.address.city}, ${assignment.address.state} - ${assignment.address.pincode}`
                          : 'No Address'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm"><span className="font-medium">Service Type:</span> {assignment.serviceType}</p>
                      <p className="text-sm"><span className="font-medium">Date:</span> {new Date(assignment.preferredDate).toLocaleDateString('en-IN')}</p>
                      <p className="text-sm"><span className="font-medium">ID:</span> {assignment.serviceId}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Issue:</span> {assignment.issueDescription}
                    </p>
                  </div>

                  {assignment.status === 'completed' && assignment.feedback && (
                    <div className="bg-orange-50 rounded-lg p-3 mb-4 border border-orange-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-orange-800">Customer Feedback:</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} className={`w-3 h-3 ${star <= (assignment.feedback?.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 italic">"{assignment.feedback.comment}"</p>
                    </div>
                  )}

                  {assignment.status !== 'completed' && assignment.status !== 'cancelled' && (
                    <div className="flex gap-2">
                      {assignment.status === 'assigned' && (
                        <button
                          onClick={() => updateAssignmentStatus(assignment._id, 'in_progress')}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                        >
                          Start Service
                        </button>
                      )}
                      {assignment.status === 'in_progress' && (
                        <>
                          <button
                            type="button"
                            onClick={() => navigate(`/employee/service/${assignment._id}`)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Open job & live location
                          </button>
                          <button
                            onClick={() => handleCompleteJob(assignment)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Mark Complete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <JobCompletionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        serviceType={selectedJob?.serviceType || ''}
      />
    </div>
  );
};

export default ServiceAssignments;