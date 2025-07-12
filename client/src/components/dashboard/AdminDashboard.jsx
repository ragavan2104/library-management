import React, { useState, useEffect } from 'react';
import { useFirebaseAuth } from '../../context/FirebaseOnlyAuthContext';
import {
  UsersIcon,
  UserPlusIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  CogIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../ui/LoadingSpinner';
import CreateUserByAdminFirebase from '../admin/CreateUserByAdminFirebase';
import { getAllFirebaseUsers, updateFirebaseUser, deleteFirebaseUser, clearAllFirebaseUsers } from '../../utils/firebaseUserUtils';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
  const { user: currentUser } = useFirebaseAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalLibrarians: 0,
    recentUsers: []
  });
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const users = await getAllFirebaseUsers();
      
      const students = users.filter(user => user.role === 'student');
      const librarians = users.filter(user => user.role === 'librarian');
      const recentUsers = users
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      setStats({
        totalUsers: users.length,
        totalStudents: students.length,
        totalLibrarians: librarians.length,
        recentUsers
      });

      setAllUsers(users);
      setFilteredUsers(users);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term and role
  useEffect(() => {
    let filtered = allUsers;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.rollno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    setFilteredUsers(filtered);
  }, [searchTerm, filterRole, allUsers]);

  // User management functions
  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      rollno: user.rollno || '',
      department: user.department || '',
      role: user.role || 'student'
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setUpdateLoading(true);
      await updateFirebaseUser(editingUser.uid, editFormData);
      
      // Update local state instead of refetching all data
      const updatedUsers = allUsers.map(user => 
        user.uid === editingUser.uid 
          ? { ...user, ...editFormData }
          : user
      );
      setAllUsers(updatedUsers);
      
      // Update stats
      const students = updatedUsers.filter(user => user.role === 'student');
      const librarians = updatedUsers.filter(user => user.role === 'librarian');
      const recentUsers = updatedUsers
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      setStats({
        totalUsers: updatedUsers.length,
        totalStudents: students.length,
        totalLibrarians: librarians.length,
        recentUsers
      });
      
      toast.success('User updated successfully!');
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const newStatus = !user.disabled;
      await updateFirebaseUser(user.uid, { disabled: newStatus });
      
      // Update local state instead of refetching all data
      const updatedUsers = allUsers.map(u => 
        u.uid === user.uid 
          ? { ...u, disabled: newStatus }
          : u
      );
      setAllUsers(updatedUsers);
      
      toast.success(`User ${newStatus ? 'deactivated' : 'activated'} successfully!`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.uid === currentUser?.uid) {
      toast.error('Cannot delete your own account');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${user.name}? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      await deleteFirebaseUser(user.uid);
      
      // Update local state instead of refetching all data
      const updatedUsers = allUsers.filter(u => u.uid !== user.uid);
      setAllUsers(updatedUsers);
      
      // Update stats
      const students = updatedUsers.filter(user => user.role === 'student');
      const librarians = updatedUsers.filter(user => user.role === 'librarian');
      const recentUsers = updatedUsers
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      setStats({
        totalUsers: updatedUsers.length,
        totalStudents: students.length,
        totalLibrarians: librarians.length,
        recentUsers
      });
      
      toast.success('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleClearAllUsers = async () => {
    const confirmClear = window.confirm(
      `⚠️ WARNING: This will delete ALL users from the database except your current admin account. This action cannot be undone. Are you absolutely sure?`
    );

    if (!confirmClear) return;

    const doubleConfirm = window.confirm(
      `🚨 FINAL WARNING: You are about to delete ALL user data. Type your confirmation by clicking OK only if you're absolutely certain.`
    );

    if (!doubleConfirm) return;

    try {
      setLoading(true);
      await clearAllFirebaseUsers(currentUser.uid); // Preserve current admin
      
      // Update local state - keep only current user
      const currentUserData = allUsers.find(u => u.uid === currentUser.uid) || currentUser;
      setAllUsers([currentUserData]);
      
      // Update stats
      setStats({
        totalUsers: 1,
        totalStudents: 0,
        totalLibrarians: 0,
        recentUsers: [currentUserData]
      });
      
      toast.success('All users have been cleared from the database!');
    } catch (error) {
      console.error('Error clearing users:', error);
      toast.error('Failed to clear users');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      id: 'overview',
      name: 'Overview',
      icon: ChartBarIcon,
      description: 'Dashboard statistics and overview'
    },
    {
      id: 'create-users',
      name: 'Create Users',
      icon: UserPlusIcon,
      description: 'Create single or bulk users with auto-generated credentials'
    },
    {
      id: 'manage-users',
      name: 'Manage Users',
      icon: UsersIcon,
      description: 'View and manage existing users'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: CogIcon,
      description: 'System settings and configuration'
    }
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {currentUser?.name}! Manage your library system from here.
          </p>
        </div>

        {/* Navigation Menu */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`p-6 text-left hover:bg-gray-50 transition-colors ${
                  activeSection === item.id ? 'bg-blue-50 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className={`h-8 w-8 ${
                    activeSection === item.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <h3 className={`font-semibold ${
                      activeSection === item.id ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <UsersIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Active users in the system
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Students</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <AcademicCapIcon className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Registered students
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Librarians</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalLibrarians}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <BookOpenIcon className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Library staff members
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Users */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
                <p className="text-sm text-gray-600">Latest user registrations</p>
              </div>
              <div className="p-6">
                {stats.recentUsers.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentUsers.map((user, index) => (
                      <div key={user.uid || index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {user.email} • {user.rollno} • {user.department}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'librarian' ? 'bg-purple-100 text-purple-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No recent users</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start by creating some users in the system.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-600">Common administrative tasks</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveSection('create-users')}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                  >
                    <UserPlusIcon className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
                      Create New User
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Add single or bulk users
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveSection('manage-users')}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors group"
                  >
                    <UsersIcon className="h-8 w-8 text-gray-400 group-hover:text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 group-hover:text-green-900">
                      Manage Users
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      View and edit users
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveSection('settings')}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors group"
                  >
                    <CogIcon className="h-8 w-8 text-gray-400 group-hover:text-purple-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 group-hover:text-purple-900">
                      System Settings
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Configure system
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Users Section */}
        {activeSection === 'create-users' && <CreateUserByAdminFirebase />}

        {/* Manage Users Section */}
        {activeSection === 'manage-users' && (
          <div className="space-y-6">
            {/* Search and Filter Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users by name, email, roll number, or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Students</option>
                    <option value="librarian">Librarians</option>
                    <option value="admin">Admins</option>
                  </select>
                  <button
                    onClick={handleClearAllUsers}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm font-medium"
                    title="Clear all users from database"
                  >
                    🗑️ Clear All Users
                  </button>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
                <p className="text-sm text-gray-600">
                  Showing {filteredUsers.length} of {allUsers.length} users
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Roll Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.uid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">
                                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.rollno || (user.role === 'student' ? 'Not set' : 'N/A')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.department || 'Not set'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'librarian' ? 'bg-purple-100 text-purple-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {user.disabled ? 'Inactive' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="Edit User"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(user)}
                              className={`p-1 rounded ${
                                user.disabled 
                                  ? 'text-green-600 hover:text-green-900' 
                                  : 'text-orange-600 hover:text-orange-900'
                              }`}
                              title={user.disabled ? 'Activate User' : 'Deactivate User'}
                            >
                              {user.disabled ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                            </button>
                            {user.uid !== currentUser?.uid && (
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="text-red-600 hover:text-red-900 p-1 rounded"
                                title="Delete User"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || filterRole !== 'all' 
                      ? 'Try adjusting your search filters.' 
                      : 'Start by creating some users in the system.'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
              <p className="text-sm text-gray-600">Configure system settings and preferences</p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Test Password Reset */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Test Password Reset</h4>
                  <p className="text-sm text-gray-600 mb-4">Test the password reset functionality</p>
                  <div className="flex space-x-4">
                    <input
                      type="email"
                      placeholder="Enter email to test password reset"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const email = e.target.value;
                          if (email) {
                            import('../../context/FirebaseOnlyAuthContext').then(({ useFirebaseAuth }) => {
                              // This would need to be called from a component with access to the context
                              console.log('Testing password reset for:', email);
                            });
                          }
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const email = document.querySelector('input[type="email"]').value;
                        if (email) {
                          console.log('Testing password reset for:', email);
                          // The actual implementation would call the sendPasswordReset function
                          toast.info('Check console for test results');
                        } else {
                          toast.error('Please enter an email address');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Test Reset
                    </button>
                  </div>
                </div>

                {/* General Settings Placeholder */}
                <div className="text-center py-8">
                  <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Settings Panel</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Additional system configuration options will be available here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Edit User</h3>
              
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Roll Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.rollno}
                    onChange={(e) => setEditFormData({...editFormData, rollno: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({...editFormData, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    required
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="student">Student</option>
                    <option value="librarian">Librarian</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {updateLoading ? (
                      <LoadingSpinner size="small" color="white" />
                    ) : (
                      'Update User'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
