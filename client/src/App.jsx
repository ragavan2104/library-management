import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FirebaseAuthProvider, useFirebaseAuth } from './context/FirebaseOnlyAuthContext';

// Import components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import LoginFirebase from './pages/auth/LoginFirebase';
import ForcePasswordChangeFirebase from './components/auth/ForcePasswordChangeFirebase';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import BookDetails from './pages/BookDetails';
import MyBooks from './pages/MyBooks';
import Users from './pages/Users';
import BorrowHistory from './pages/BorrowHistory';
import Profile from './pages/Profile';
import CreateUserByAdminFirebase from './components/admin/CreateUserByAdminFirebase';
import AdminDashboard from './components/dashboard/AdminDashboard';
import FirebaseSetup from './components/setup/FirebaseSetup';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, initializing } = useFirebaseAuth();

  if (loading || initializing) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Main App Layout
const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64 mt-16">
          {children}
        </main>
      </div>
    </div>
  );
};

// Auth Layout
const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <FirebaseAuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginFirebase />} />
            <Route path="/force-password-change" element={<ForcePasswordChangeFirebase />} />
            <Route path="/setup" element={<FirebaseSetup />} />

            {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/books"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Books />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/books/:id"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <BookDetails />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-books"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <MyBooks />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <AppLayout>
                        <Users />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/create-user"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AppLayout>
                        <CreateUserByAdminFirebase />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/borrow-history"
                  element={
                    <ProtectedRoute allowedRoles={['librarian', 'admin']}>
                      <AppLayout>
                        <BorrowHistory />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <Profile />
                      </AppLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>

              {/* Toast notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
            </div>
        </Router>
      </FirebaseAuthProvider>
  );
}

export default App;
