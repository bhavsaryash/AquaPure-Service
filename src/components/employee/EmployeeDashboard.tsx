import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EmployeeLayout from './EmployeeLayout';
import EmployeeOverview from './EmployeeOverview';
import ServiceAssignments from './ServiceAssignments';
import ServiceForm from './ServiceForm';
import Performance from './Performance';
import EmployeeProfile from './EmployeeProfile';

const EmployeeDashboard: React.FC = () => {
  return (
    <EmployeeLayout>
      <Routes>
        <Route path="/" element={<EmployeeOverview />} />
        <Route path="/assignments" element={<ServiceAssignments />} />
        <Route path="/service/:serviceId" element={<ServiceForm />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/profile" element={<EmployeeProfile />} />
      </Routes>
    </EmployeeLayout>
  );
};

export default EmployeeDashboard;