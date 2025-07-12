import React from 'react';
import { useFirebaseAuth } from '../../context/FirebaseOnlyAuthContext';
import { BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
  const { user } = useFirebaseAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 right-0 left-64 z-20">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Page Title - will be dynamic based on current route */}
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">
              Library Management System
            </h1>
          </div>

          {/* Right side - Notifications and Settings */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200">
              <BellIcon className="h-5 w-5" />
            </button>

            {/* Settings */}
            <button className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200">
              <Cog6ToothIcon className="h-5 w-5" />
            </button>

            {/* Current Date/Time */}
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
