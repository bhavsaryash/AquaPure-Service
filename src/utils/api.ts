import { createClient } from '@supabase/supabase-js';
import { authEvents } from './authEvents';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Auth token management
let authToken: string | null = localStorage.getItem('authToken');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = () => authToken;

// API request helper
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  // Always get the latest token from localStorage to ensure we have it even after login without refresh
  const currentToken = localStorage.getItem('authToken');

  const headers: HeadersInit = {
    ...(currentToken && { Authorization: `Bearer ${currentToken}` }),
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    (headers as any)['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    headers,
    ...options,
  };

  // DEBUG LOG
  if (endpoint !== '/auth/login') {
    console.log(`API Request to ${endpoint} with token:`, currentToken ? 'Yes' : 'No');
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        setAuthToken(null);
        // Don't force redirect here, let the app state handle it
        // window.location.href = '/login'; 
        const errorData = await response.json().catch(() => ({}));
        authEvents.emit('logout');
        throw new Error(errorData.message || 'Authentication failed');
      }

      const errorData = await response.json().catch(() => ({}));
      const base = errorData.message || `HTTP error! status: ${response.status}`;
      const extra = errorData.detail || errorData.error;
      throw new Error(extra ? `${base}: ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : base);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.token) {
      setAuthToken(response.token);
    }

    return response;
  },

  register: async (userData: any) => {
    return await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },

  forgotPassword: async (email: string) => {
    return await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token: string, password: string) => {
    return await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  refreshToken: async () => {
    const response = await apiRequest('/auth/refresh-token', {
      method: 'POST',
    });

    if (response.token) {
      setAuthToken(response.token);
    }

    return response;
  },
};

// Admin API
export const adminAPI = {
  getStats: async () => {
    return await apiRequest('/admin/stats');
  },

  getEmployees: async () => {
    return await apiRequest('/admin/employees');
  },

  createEmployee: async (employeeData: any) => {
    return await apiRequest('/admin/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  },

  getReports: async (type: string, filters: any = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return await apiRequest(`/admin/reports/${type}?${queryParams}`);
  },

  updateEmployee: async (id: string, employeeData: any) => {
    return await apiRequest(`/admin/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    });
  },

  deleteEmployee: async (id: string) => {
    return await apiRequest(`/admin/employees/${id}`, {
      method: 'DELETE',
    });
  },

  getUsers: async () => {
    return await apiRequest('/admin/users'); // Replaces createClient/updateClient for now
  },

  // Placeholder/Future endpoints maintained but commented or aligned if possible
  // getClients: ... (We use getUsers)

  getServices: async () => {
    return await apiRequest('/admin/requests');
  },

  updateService: async (id: string, serviceData: any) => {
    return await apiRequest(`/admin/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData)
    });
  },

  assignService: async (serviceId: string, employeeId: string) => {
    return await apiRequest('/admin/services/assign', {
      method: 'POST',
      body: JSON.stringify({ serviceId, employeeId }),
    });
  },


};

// Client API
export const clientAPI = {
  getDashboard: async () => {
    return await apiRequest('/services/my-requests'); // Dashboard often needs stats, but for now reuse valid endpoint or fix backend
  },

  getProfile: async () => {
    return await apiRequest('/auth/me'); // Assuming auth/me exists or similar
  },

  updateProfile: async (profileData: any) => {
    return await apiRequest('/auth/updatedetails', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  getServices: async () => {
    return await apiRequest('/services/my-requests');
  },

  createServiceRequest: async (serviceData: any) => {
    return await apiRequest('/services', {
      method: 'POST',
      body: serviceData instanceof FormData ? serviceData : JSON.stringify(serviceData),
    });
  },

  getServiceHistory: async () => {
    return await apiRequest('/services/my-requests');
  },

  payForService: async (requestId: string, paymentDetails: any) => {
    return await apiRequest(`/services/${requestId}/payment`, {
      method: 'POST',
      body: JSON.stringify({ paymentDetails }),
    });
  },

  cancelServiceRequest: async (serviceId: string) => {
    return await apiRequest(`/services/${serviceId}/cancel`, {
      method: 'PUT',
    });
  },

  submitFeedback: async (serviceId: string, feedbackData: any) => {
    return await apiRequest(`/services/${serviceId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  },

  downloadReceipt: async (serviceId: string) => {
    return await apiRequest(`/payment/invoice/${serviceId}`);
  },
};

export const liveAPI = {
  geocode: async (q: string) => {
    return await apiRequest(`/live/geocode?q=${encodeURIComponent(q)}`);
  },
  reverseGeocode: async (lat: number, lng: number) => {
    return await apiRequest(`/live/reverse-geocode?lat=${lat}&lng=${lng}`);
  }
};

// Employee API
export const employeeAPI = {
  getDashboard: async () => {
    return await apiRequest('/employee/dashboard');
  },

  getProfile: async () => {
    return await apiRequest('/auth/me');
  },

  getAssignments: async () => {
    return await apiRequest('/services/assigned');
  },

  getService: async (serviceId: string) => {
    return await apiRequest(`/services/${serviceId}`);
  },

  updateStatus: async (id: string, status: string, workDetails?: any) => {
    return await apiRequest(`/services/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, workDetails })
    });
  },

  submitFeedback: async (id: string, data: { rating: number; comment: string }) => {
    return await apiRequest(`/services/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  completeService: async (serviceId: string, serviceData: any) => {
    return await apiRequest(`/services/${serviceId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'completed',
        workDetails: serviceData.workDetails // Wrapper to match controller expectation
      }),
    });
  },

  getPerformance: async () => {
    return await apiRequest('/employee/performance');
  },

  updateProfile: async (profileData: any) => {
    return await apiRequest('/auth/updatedetails', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// Common API
export const commonAPI = {
  getNotifications: async () => {
    return await apiRequest('/notifications');
  },

  markNotificationRead: async (notificationId: string) => {
    return await apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  markAllNotificationsRead: async () => {
    return await apiRequest('/notifications/read-all', {
      method: 'PUT',
    });
  },

  deleteNotification: async (notificationId: string) => {
    return await apiRequest(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },

  seedNotifications: async () => {
    return await apiRequest('/notifications/seed', {
      method: 'POST',
    });
  },

  uploadFile: async (file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return await apiRequest('/upload', {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: formData,
    });
  },
};

// Inventory API
export const inventoryAPI = {
  getAll: async (params?: any) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return await apiRequest(`/inventory${queryString}`);
  },

  getOne: async (id: string) => {
    return await apiRequest(`/inventory/${id}`);
  },

  create: async (data: any) => {
    return await apiRequest('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return await apiRequest(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return await apiRequest(`/inventory/${id}`, {
      method: 'DELETE',
    });
  },
};

// AMC API
export const amcAPI = {
  getPlans: async () => {
    return await apiRequest('/amc/plans');
  },
  getAllPlansAdmin: async () => {
    return await apiRequest('/amc/plans/all');
  },
  getSubscriptionsAdmin: async (params?: any) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return await apiRequest(`/amc/subscriptions${query}`);
  },

  createPlan: async (data: any) => {
    return await apiRequest('/amc/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updatePlan: async (id: string, data: any) => {
    return await apiRequest(`/amc/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deletePlan: async (id: string) => {
    return await apiRequest(`/amc/plans/${id}`, {
      method: 'DELETE',
    });
  },

  subscribe: async (planId: string, paymentDetails?: any) => {
    return await apiRequest('/amc/subscribe', {
      method: 'POST',
      body: JSON.stringify({ planId, paymentDetails }),
    });
  },

  getMySubscription: async () => {
    return await apiRequest('/amc/my-subscription');
  },
};

// Payment API
export const paymentAPI = {
  createOrder: async (amount: number, currency: string = 'INR', receipt: string) => {
    return await apiRequest('/transaction/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount, currency, receipt }),
    });
  },

  verifyPayment: async (paymentData: any) => {
    return await apiRequest('/transaction/verify', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  downloadInvoice: async (serviceId: string, type: 'service' | 'amc' = 'service') => {
    // Direct download link logic or fetch blob
    // Let's use fetch to get blob and trigger download
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/transaction/invoice/${serviceId}?type=${type}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to download invoice');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${type}-${serviceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
};



// Error handling utility
export const handleAPIError = (error: any) => {
  if (error.message === 'Authentication failed') {
    // Already handled in apiRequest
    return;
  }

  // Log error for debugging
  console.error('API Error:', error);

  // You can add toast notifications or other error handling here
  return error.message || 'An unexpected error occurred';
};

// Request interceptor for automatic token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Auto-refresh token on 401 errors
export const setupTokenRefresh = () => {
  // This would be called on app initialization
  // Implementation depends on your specific token refresh strategy
};

export default {
  auth: authAPI,
  admin: adminAPI,
  client: clientAPI,
  employee: employeeAPI,
  common: commonAPI,
  inventory: inventoryAPI,
  amc: amcAPI,
  payment: paymentAPI,
  handleAPIError,
};