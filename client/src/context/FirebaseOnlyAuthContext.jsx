import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  updatePassword,
  sendPasswordResetEmail,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { toast } from 'react-hot-toast';

// Action types
const AUTH_ACTIONS = {
  LOADING_START: 'LOADING_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAIL: 'LOGIN_FAIL',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_INITIAL_STATE: 'SET_INITIAL_STATE'
};

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  initializing: true
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOADING_START:
      return {
        ...state,
        loading: true
      };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        initializing: false
      };
    case AUTH_ACTIONS.LOGIN_FAIL:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        initializing: false
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null
      };
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    case AUTH_ACTIONS.SET_INITIAL_STATE:
      return {
        ...state,
        initializing: false
      };
    default:
      return state;
  }
};

// Create context
const FirebaseAuthContext = createContext();

// Provider component
export const FirebaseAuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Check if user is active
            if (!userData.isActive) {
              await signOut(auth);
              dispatch({ type: AUTH_ACTIONS.LOGIN_FAIL });
              toast.error('Account is deactivated. Please contact administrator.');
              return;
            }
            
            // Get Firebase token
            const token = await firebaseUser.getIdToken();
            
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: {
                user: {
                  uid: firebaseUser.uid,
                  ...userData
                },
                token
              }
            });
          } else {
            // User exists in Firebase Auth but not in Firestore
            await signOut(auth);
            dispatch({ type: AUTH_ACTIONS.LOGIN_FAIL });
            toast.error('User profile not found. Please contact administrator.');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          dispatch({ type: AUTH_ACTIONS.LOGIN_FAIL });
          toast.error('Failed to load user data');
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_INITIAL_STATE });
      }
    });

    return () => unsubscribe();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOADING_START });
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      const userData = userDoc.data();
      
      // Check if user is active
      if (!userData.isActive) {
        await signOut(auth);
        throw new Error('Account is deactivated. Please contact administrator.');
      }
      
      // Get Firebase token
      const token = await firebaseUser.getIdToken();
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: {
            uid: firebaseUser.uid,
            ...userData
          },
          token
        }
      });
      
      toast.success('Login successful!');
      
      return { 
        success: true, 
        mustChangePassword: userData.mustChangePassword || userData.isFirstLogin,
        user: userData
      };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAIL });
      const message = error.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  // Change password function
  const changePassword = async (newPassword) => {
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      // Update password in Firebase Auth
      await updatePassword(auth.currentUser, newPassword);
      
      // Update password flags in Firestore
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isFirstLogin: false,
        mustChangePassword: false,
        passwordChangedAt: new Date()
      });
      
      // Update local state
      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: {
          isFirstLogin: false,
          mustChangePassword: false
        }
      });
      
      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const message = error.message || 'Failed to change password';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Send password reset email
  const sendPasswordReset = async (email) => {
    try {
      console.log('Attempting to send password reset email to:', email);
      
      // Simplified approach - just send the email directly
      await sendPasswordResetEmail(auth, email.toLowerCase().trim());
      
      console.log('Password reset email sent successfully');
      toast.success('Password reset email sent! Check your email inbox and spam folder.');
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      let message = 'Failed to send password reset email';
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          message = 'Too many requests. Please try again later.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection.';
          break;
        default:
          message = error.message || 'Failed to send password reset email';
      }
      
      toast.error(message);
      return { success: false, message };
    }
  };

  // Update user profile in Firestore
  const updateProfile = async (updateData) => {
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...updateData,
        updatedAt: new Date()
      });
      
      // Update local state
      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: updateData
      });
      
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.message || 'Failed to update profile';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Check if user is admin
  const isAdmin = () => {
    return state.user?.role === 'admin';
  };

  // Check if user is librarian or admin
  const isLibrarianOrAdmin = () => {
    return ['librarian', 'admin'].includes(state.user?.role);
  };

  const value = {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    initializing: state.initializing,
    login,
    logout,
    changePassword,
    sendPasswordReset,
    updateProfile,
    isAdmin,
    isLibrarianOrAdmin
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within FirebaseAuthProvider');
  }
  return context;
};
