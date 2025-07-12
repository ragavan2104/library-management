import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HomeIcon,
  BookOpenIcon,
  UsersIcon,
  ClockIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['student', 'librarian', 'admin'] },
    { name: 'Books', href: '/books', icon: BookOpenIcon, roles: ['student', 'librarian', 'admin'] },
    { name: 'My Books', href: '/my-books', icon: ClockIcon, roles: ['student'] },
    { name: 'Users', href: '/users', icon: UsersIcon, roles: ['librarian', 'admin'] },
    { name: 'Borrow History', href: '/borrow-history', icon: ClockIcon, roles: ['librarian', 'admin'] },
    { name: 'Profile', href: '/profile', icon: UserIcon, roles: ['student', 'librarian', 'admin'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role)
  );

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-30">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
          <BookOpenIcon className="h-8 w-8 text-white mr-2" />
          <h1 className="text-xl font-bold text-white">Library MS</h1>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          
          {/* System Status - Updated for serverless deployment */}
          <div className="mt-2 flex items-center">
            <div className="h-2 w-2 rounded-full mr-2 bg-green-400" />
            <span className="text-xs text-gray-500">
              System Online
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={clsx(
                    'mr-3 h-5 w-5',
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="group flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
          >
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
