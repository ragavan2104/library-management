import React, { useState, useEffect } from 'react';
import { useFirebaseAuth } from '../../context/FirebaseAuthContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  LockClosedIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ForcePasswordChange = () => {
  const { forcePasswordChange, user: firebaseUser, sendPasswordReset } = useFirebaseAuth();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [userType, setUserType] = useState(null); // 'firebase' or 'traditional'

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Determine user type
  useEffect(() => {
    if (firebaseUser) {
      setUserType('firebase');
    } else if (authUser) {
      setUserType('traditional');
    }
  }, [firebaseUser, authUser]);

  // Traditional password change function
  const changeTraditionalPassword = async (currentPassword, newPassword) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Password change failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  };

  // Real-time password validation
  const validatePassword = (password) => {
    const validation = {
      isValid: false,
      errors: [],
      strength: 'weak',
      score: 0
    };

    if (password.length < 6) {
      validation.errors.push('Password must be at least 6 characters long');
    } else {
      validation.score += 20;
    }

    if (!/[A-Z]/.test(password)) {
      validation.errors.push('Password must contain at least one uppercase letter');
    } else {
      validation.score += 20;
    }

    if (!/[a-z]/.test(password)) {
      validation.errors.push('Password must contain at least one lowercase letter');
    } else {
      validation.score += 20;
    }

    if (!/\d/.test(password)) {
      validation.errors.push('Password must contain at least one number');
    } else {
      validation.score += 20;
    }

    if (!/[@$!%*?&]/.test(password)) {
      validation.errors.push('Password must contain at least one special character (@$!%*?&)');
    } else {
      validation.score += 20;
    }

    if (password === formData.currentPassword) {
      validation.errors.push('New password cannot be the same as current password');
    }

    // Determine strength
    if (validation.score >= 80 && validation.errors.length === 0) {
      validation.strength = 'strong';
      validation.isValid = true;
    } else if (validation.score >= 60) {
      validation.strength = 'medium';
    } else {
      validation.strength = 'weak';
    }

    return validation;
  };

  const validation = validatePassword(formData.newPassword);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getStrengthColor = (strength) => {
    switch (strength) {
      case 'strong': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getStrengthText = (strength) => {
    switch (strength) {
      case 'strong': return 'Strong';
      case 'medium': return 'Medium';
      default: return 'Weak';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validation.isValid) {
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      return;
    }

    setIsLoading(true);
    try {
      if (userType === 'firebase') {
        // Use Firebase password change
        await forcePasswordChange(formData.currentPassword, formData.newPassword);
      } else if (userType === 'traditional') {
        // Use traditional password change
        const result = await changeTraditionalPassword(formData.currentPassword, formData.newPassword);
        toast.success('Password changed successfully!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.message || 'Password change failed');
      console.error('Password change error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    setIsResetLoading(true);
    try {
      await sendPasswordReset(user.email);
    } catch (error) {
      // Error is handled in context
    } finally {
      setIsResetLoading(false);
    }
  };

  const isFormValid = validation.isValid && 
                     formData.currentPassword && 
                     formData.newPassword && 
                     formData.confirmPassword &&
                     formData.newPassword === formData.confirmPassword;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Password Change Required
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You must change your password before accessing the system
          </p>
        </div>

        {/* Warning Box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                First Login Detected
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  This is your first login or you're using a temporary password. 
                  Please create a new secure password to continue.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current/Temporary Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.current ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.new ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Password Strength:</span>
                    <span className={`text-xs font-medium ${
                      validation.strength === 'strong' ? 'text-green-600' :
                      validation.strength === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {getStrengthText(validation.strength)}
                    </span>
                  </div>
                  
                  {/* Strength Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(validation.strength)}`}
                      style={{ width: `${validation.score}%` }}
                    ></div>
                  </div>

                  {/* Validation Errors */}
                  {validation.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {validation.errors.map((error, index) => (
                        <div key={index} className="flex items-center text-xs text-red-600">
                          <XCircleIcon className="h-3 w-3 mr-1" />
                          {error}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Success Indicator */}
                  {validation.isValid && (
                    <div className="mt-2 flex items-center text-xs text-green-600">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Password meets all requirements
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    formData.confirmPassword && formData.newPassword !== formData.confirmPassword
                      ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.confirm ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className="mt-1">
                  {formData.newPassword === formData.confirmPassword ? (
                    <div className="flex items-center text-xs text-green-600">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Passwords match
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-red-600">
                      <XCircleIcon className="h-3 w-3 mr-1" />
                      Passwords do not match
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
              isFormValid && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Changing Password...' : 'Change Password & Continue'}
          </button>

          {/* Alternative Options */}
          <div className="text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-100 text-gray-500">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={isResetLoading}
              className="mt-4 text-blue-600 hover:text-blue-500 text-sm font-medium"
            >
              {isResetLoading ? 'Sending...' : 'Send password reset email instead'}
            </button>
          </div>
        </form>

        {/* Password Requirements */}
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• At least 6 characters long</li>
            <li>• Contains uppercase letter (A-Z)</li>
            <li>• Contains lowercase letter (a-z)</li>
            <li>• Contains number (0-9)</li>
            <li>• Contains special character (@$!%*?&)</li>
            <li>• Different from current password</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
