import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ClientLayout from './ClientLayout';
import ClientOverview from './ClientOverview';
import ServiceHistory from './ServiceHistory';
import ServiceRequest from './ServiceRequest';
import AMCSubscription from './AMCSubscription';
import Profile from './Profile';

const ClientDashboard: React.FC = () => {
  return (
    <ClientLayout>
      <Routes>
        <Route path="/" element={<ClientOverview />} />
        <Route path="/services" element={<ServiceHistory />} />
        <Route path="/request" element={<ServiceRequest />} />
        <Route path="/amc" element={<AMCSubscription />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </ClientLayout>
  );
};

export default ClientDashboard;