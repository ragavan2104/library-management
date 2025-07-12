import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  UsersIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  UserPlusIcon,
  TrashIcon,
  PencilIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../ui/LoadingSpinner';
import UserModal from '../ui/UserModal';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userModalLoading, setUserModalLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      const response = await axios.get(`${API_URL}/api/users`, config);
      setUsers(response.data.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        toast.error('Please select a valid Excel file (.xlsx or .xls)');
        event.target.value = '';
      }
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an Excel file first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('excelFile', selectedFile);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/admin/upload-students`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setUploadResults(response.data.results);
      toast.success(`Successfully registered ${response.data.results.successful} students`);
      
      if (response.data.results.failed > 0) {
        toast.error(`${response.data.results.failed} records failed to process`);
      }

      if (response.data.results.duplicates > 0) {
        toast.warning(`${response.data.results.duplicates} duplicate records found`);
      }

      // Refresh users list
      fetchUsers();
      setSelectedFile(null);
      document.getElementById('fileInput').value = '';

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload students');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/admin/sample-template`,
        { 
          responseType: 'blob',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student-upload-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Failed to download template');
    }
  };

  const downloadCredentials = async () => {
    if (!uploadResults?.downloadPath) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}${uploadResults.downloadPath}`,
        { 
          responseType: 'blob',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student-credentials.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Credentials downloaded successfully');
    } catch (error) {
      console.error('Credentials download error:', error);
      toast.error('Failed to download credentials');
    }
  };

  const createSingleUser = async (userData) => {
    setUserModalLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (editingUser) {
        // Update existing user
        const response = await axios.put(`${API_URL}/api/users/${editingUser._id}`, userData, config);
        toast.success('User updated successfully');
      } else {
        // Create new user
        const response = await axios.post(`${API_URL}/api/auth/admin/create-user`, userData, config);
        
        if (response.data.success) {
          toast.success(`${userData.role} created successfully!`);
          
          // Show credentials info
          const credentials = response.data.data.credentials;
          if (credentials) {
            toast.success(`Login: ${credentials.email} | Password: ${credentials.password}`, {
              duration: 10000,
            });
          }
        }
      }
      
      fetchUsers(); // Refresh user list
      setShowUserModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error creating/updating user:', error);
      toast.error(error.response?.data?.message || 'Failed to save user');
    } finally {
      setUserModalLoading(false);
    }
  };

  const createLibrarian = async () => {
    const librarianData = {
      name: `Librarian ${Math.floor(Math.random() * 1000)}`,
      email: `librarian${Math.floor(Math.random() * 1000)}@college.edu`,
      role: 'librarian'
    };

    await createSingleUser(librarianData);
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      
      console.log('Toggling user status:', { userId, currentStatus }); // Debug log
      
      const response = await axios.put(
        `${API_URL}/api/users/${userId}/toggle-status`,
        {},
        config
      );
      
      console.log('Toggle response:', response.data); // Debug log
      toast.success(response.data.message);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Toggle status error:', error);
      console.error('Error response:', error.response?.data); // Debug log
      toast.error(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      const response = await axios.put(
        `${API_URL}/api/users/${userId}/role`,
        { role: newRole },
        config
      );
      
      toast.success(response.data.message);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Update role error:', error);
      toast.error('Failed to update user role');
    }
  };

  const deleteUser = async (userId, userName) => {
    // Don't allow deleting own account
    if (userId === currentUser?.id) {
      toast.error('Cannot delete your own account');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      
      await axios.delete(`${API_URL}/api/users/${userId}`, config);
      toast.success('User deleted successfully');
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const editUser = (user) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleCloseModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex space-x-3">
          {currentUser?.role === 'admin' && (
            <>
              <button
                onClick={() => setShowUserModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <UserPlusIcon className="h-5 w-5" />
                <span>Create User</span>
              </button>
              <button
                onClick={createLibrarian}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
              >
                <UserPlusIcon className="h-5 w-5" />
                <span>Quick Librarian</span>
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <DocumentArrowUpIcon className="h-5 w-5" />
                <span>Bulk Upload</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Students</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(user => user.role === 'student').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Librarians</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(user => user.role === 'librarian').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inactive Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(user => !user.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">User Management</h3>
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
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={user.rollno ? '' : 'text-red-500 italic'}>
                      {user.rollno || (user.role === 'student' ? 'No Roll Number' : 'N/A')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user._id, e.target.value)}
                      className="text-sm border-gray-300 rounded-md"
                    >
                      <option value="student">Student</option>
                      <option value="librarian">Librarian</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleUserStatus(user._id, user.isActive)}
                        className={`mr-2 px-3 py-1 rounded text-xs ${
                          user.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => editUser(user)}
                        className="px-3 py-1 rounded text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      >
                        <PencilIcon className="h-4 w-4 inline-block mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteUser(user._id, user.name)}
                        className="px-3 py-1 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        <TrashIcon className="h-4 w-4 inline-block mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Bulk Upload Students</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Excel File
                  </label>
                  <input
                    id="fileInput"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {selectedFile && (
                  <div className="text-sm text-gray-600">
                    Selected: {selectedFile.name}
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={downloadTemplate}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center justify-center space-x-2"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    <span>Download Template</span>
                  </button>
                </div>

                {uploadResults && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <h4 className="font-medium text-gray-900 mb-2">Upload Results:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✅ Successful: {uploadResults.successful}</li>
                      <li>❌ Failed: {uploadResults.failed}</li>
                      <li>🔄 Duplicates: {uploadResults.duplicates}</li>
                    </ul>
                    
                    {uploadResults.downloadPath && (
                      <button
                        onClick={downloadCredentials}
                        className="mt-2 bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                      >
                        Download Credentials
                      </button>
                    )}
                  </div>
                )}

                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={handleBulkUpload}
                    disabled={!selectedFile || uploading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {uploading ? (
                      <LoadingSpinner size="small" color="white" />
                    ) : (
                      <>
                        <DocumentArrowUpIcon className="h-4 w-4" />
                        <span>Upload Students</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                      setUploadResults(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Creation Modal */}
      <UserModal
        isOpen={showUserModal}
        onClose={handleCloseModal}
        onSubmit={createSingleUser}
        user={editingUser}
        loading={userModalLoading}
      />
    </div>
  );
};

export default AdminDashboard;
