import React from 'react';
import { useFirebaseAuth } from '../context/FirebaseOnlyAuthContext';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import LibrarianDashboard from '../components/dashboard/LibrarianDashboard';
import StudentDashboard from '../components/dashboard/StudentDashboard';

const Dashboard = () => {
  const { user } = useFirebaseAuth();

  // Route to appropriate dashboard based on user role
  switch (user?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'librarian':
      return <LibrarianDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Your account role is not recognized.</p>
          </div>
        </div>
      );
  }
};

export default Dashboard;

