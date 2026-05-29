import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import AdminOverview from './AdminOverview';
import EmployeeManagement from './EmployeeManagement';
import ClientManagement from './ClientManagement';
import ServiceManagement from './ServiceManagement';
import InventoryManagement from './InventoryManagement';
import AMCManagement from './AMCManagement';
import Reports from './Reports';
import AMCSubscriptionsAdmin from './AMCSubscriptionsAdmin';

const AdminDashboard: React.FC = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<AdminOverview />} />
        <Route path="/employees" element={<EmployeeManagement />} />
        <Route path="/clients" element={<ClientManagement />} />
        <Route path="/services" element={<ServiceManagement />} />
        <Route path="/inventory" element={<InventoryManagement />} />
        <Route path="/amc" element={<AMCManagement />} />
        <Route path="/amc-subscriptions" element={<AMCSubscriptionsAdmin />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminDashboard;