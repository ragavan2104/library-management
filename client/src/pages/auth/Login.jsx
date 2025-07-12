import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFirebaseAuth } from '../../context/FirebaseAuthContext';
import { EyeIcon, EyeSlashIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const Login = () => {
  const { login: authLogin, loading: authLoading, isAuthenticated } = useAuth();
  const { login: firebaseLogin, mustChangePassword } = useFirebaseAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated and no password change required
  if (isAuthenticated && !mustChangePassword) {
    return <Navigate to="/dashboard" replace />;
  }

  // If password change is required, redirect to force password change
  if (isAuthenticated && mustChangePassword) {
    return <Navigate to="/force-password-change" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    // Check if this is admin/default credentials - use traditional auth directly
    const isAdminEmail = formData.email === 'ragavan212005@gmail.com' || 
                        formData.email === 'admin@college.edu' ||
                        formData.email.includes('librarian');
    
    if (isAdminEmail) {
      // Use traditional authentication for admin/librarian users
      try {
        const result = await authLogin(formData.email, formData.password);
        
        if (!result.success) {
          setErrors({ submit: result.message || 'Login failed. Please check your credentials.' });
        } else {
          // Check if user must change password
          const userResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.user.mustChangePassword || userData.user.isFirstLogin) {
              navigate('/force-password-change');
              return;
            }
          }
          
          // Traditional login successful, redirect to dashboard
          navigate('/dashboard');
        }
      } catch (authError) {
        console.error('Traditional login failed:', authError);
        setErrors({ submit: 'Login failed. Please check your credentials.' });
      }
    } else {
      // For student/new users, try Firebase first
      try {
        const firebaseResult = await firebaseLogin(formData.email, formData.password);
        
        if (firebaseResult.mustChangePassword) {
          // Redirect to force password change
          navigate('/force-password-change');
          return;
        }
        
        // If Firebase login succeeds, redirect to dashboard
        navigate('/dashboard');
      } catch (firebaseError) {
        // If Firebase login fails, try traditional login as fallback
        console.log('Firebase login failed, trying traditional login...');
        
        try {
          const result = await authLogin(formData.email, formData.password);
          
          if (!result.success) {
            setErrors({ submit: result.message || 'Login failed. Please check your credentials.' });
          } else {
            // Check if user must change password
            const userResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/me`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              if (userData.user.mustChangePassword || userData.user.isFirstLogin) {
                navigate('/force-password-change');
                return;
              }
            }
            
            // Traditional login successful, redirect to dashboard
            navigate('/dashboard');
          }
        } catch (authError) {
          console.error('Both login methods failed:', authError);
          setErrors({ submit: 'Login failed. Please check your credentials.' });
        }
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <BookOpenIcon className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
        <p className="mt-2 text-gray-600">Sign in to your library account</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || authLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(isLoading || authLoading) ? <LoadingSpinner size="small" color="white" /> : 'Sign In'}
        </button>
      </form>

      {/* Forgot Password Link */}
      <div className="mt-4 text-center">
        <Link
          to="/forgot-password"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          Forgot your password?
        </Link>
      </div>

      {/* Register Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign up here
          </Link>
        </p>
      </div>

      {/* Information Box for New Users */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">New User?</h4>
        <p className="text-xs text-blue-700 mb-2">
          If an admin has created your account, you'll receive an email with login instructions.
        </p>
        <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
          <li>Check your email for account details</li>
          <li>Use the temporary password or reset link</li>
          <li>You'll be asked to create a new password on first login</li>
        </ul>
      </div>
    </div>
  );
};

export default Login;
