import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  UserPlusIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const CreateUserByAdmin = () => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    department: '',
    rollno: '',
    year: '',
    college: '',
    phone: '',
    address: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Generate temporary password
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Create user via traditional MongoDB API
  const createUserByAdmin = async (userData) => {
    try {
      const tempPassword = generateTempPassword();
      
      const userPayload = {
        ...userData,
        password: tempPassword,
        isFirstLogin: true,
        mustChangePassword: true,
        createdByAdmin: true,
        createdBy: currentUser?._id || currentUser?.id
      };

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/admin/create-user`, userPayload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      toast.success(`User created successfully! Temporary password: ${tempPassword}`);
      
      return {
        user: response.data.user,
        tempPassword,
        success: true
      };
    } catch (error) {
      console.error('Create user error:', error);
      let errorMessage = 'Failed to create user';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Unauthorized. Please login again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Permission denied. Admin access required.';
      }
      
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await createUserByAdmin(formData);
      setCreatedUser(result);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        role: 'student',
        department: '',
        rollno: '',
        year: '',
        college: '',
        phone: '',
        address: ''
      });
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetCreatedUser = () => {
    setCreatedUser(null);
    setShowTempPassword(false);
    setCopied(false);
  };

  if (createdUser) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Created Successfully!</h2>
          <p className="text-gray-600">The user account has been created and a password reset email has been sent.</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">User Details:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="font-medium">Name:</span> {createdUser.profile.name}</div>
            <div><span className="font-medium">Email:</span> {createdUser.profile.email}</div>
            <div><span className="font-medium">Role:</span> {createdUser.profile.role}</div>
            {createdUser.profile.department && (
              <div><span className="font-medium">Department:</span> {createdUser.profile.department}</div>
            )}
            {createdUser.profile.rollno && (
              <div><span className="font-medium">Roll No:</span> {createdUser.profile.rollno}</div>
            )}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">Temporary Password</h3>
          <p className="text-yellow-700 text-sm mb-3">
            This is the temporary password. The user should use this to log in initially, then they will be forced to create a new password.
          </p>
          <div className="flex items-center space-x-2">
            <input
              type={showTempPassword ? 'text' : 'password'}
              value={createdUser.tempPassword}
              readOnly
              className="flex-1 px-3 py-2 border border-yellow-300 rounded-md bg-white"
            />
            <button
              onClick={() => setShowTempPassword(!showTempPassword)}
              className="p-2 text-yellow-600 hover:text-yellow-800"
              title={showTempPassword ? 'Hide password' : 'Show password'}
            >
              {showTempPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => copyToClipboard(createdUser.tempPassword)}
              className="p-2 text-yellow-600 hover:text-yellow-800"
              title="Copy password"
            >
              <ClipboardDocumentIcon className="h-5 w-5" />
            </button>
          </div>
          {copied && (
            <p className="text-green-600 text-sm mt-2">Password copied to clipboard!</p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Next Steps:</h3>
          <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
            <li>Share the email and temporary password with the user</li>
            <li>User should check their email for the password reset link</li>
            <li>User can either use the reset link OR log in with temporary password</li>
            <li>User will be forced to create a new password on first login</li>
            <li>After password change, user can access the system normally</li>
          </ol>
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={resetCreatedUser}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Another User
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <UserPlusIcon className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Create New User</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter email address"
              required
            />
          </div>
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role *
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="student">Student</option>
            <option value="librarian">Librarian</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Student-specific fields */}
        {formData.role === 'student' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Roll Number
              </label>
              <input
                type="text"
                name="rollno"
                value={formData.rollno}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter roll number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter department"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                College
              </label>
              <input
                type="text"
                name="college"
                value={formData.college}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter college name"
              />
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter address"
            />
          </div>
        </div>

        {/* Information Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
          <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
            <li>A temporary password will be auto-generated</li>
            <li>Password reset email will be sent automatically</li>
            <li>User can log in with temp password OR use reset link</li>
            <li>User will be forced to change password on first login</li>
          </ul>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoading ? 'Creating User...' : 'Create User & Send Reset Email'}
        </button>
      </form>
    </div>
  );
};

export default CreateUserByAdmin;
