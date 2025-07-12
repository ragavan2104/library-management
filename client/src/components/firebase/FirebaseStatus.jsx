import React from 'react';
import { useFirebaseAuth } from '../../context/FirebaseAuthContext';
import { CheckCircleIcon, XCircleIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const FirebaseStatus = () => {
  const { isAuthenticated, user, loading } = useFirebaseAuth();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Firebase Authentication Status</h3>
      
      <div className="space-y-3">
        <div className="flex items-center">
          {isAuthenticated ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
          )}
          <span className={isAuthenticated ? 'text-green-700' : 'text-red-700'}>
            {isAuthenticated ? 'Firebase Connected' : 'Not Connected to Firebase'}
          </span>
        </div>

        {isAuthenticated && user && (
          <>
            <div className="text-sm text-gray-600">
              <strong>User:</strong> {user.email}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Role:</strong> <span className="capitalize">{user.role}</span>
            </div>
            
            {user.role === 'admin' && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <UserPlusIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">Admin Features Available</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  You can now create new users with auto-generated passwords and email notifications.
                </p>
                <Link
                  to="/create-user"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlusIcon className="h-4 w-4 mr-1" />
                  Create New User
                </Link>
              </div>
            )}
          </>
        )}

        {!isAuthenticated && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              Firebase authentication is not active. Please log in to test the Firebase features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirebaseStatus;
