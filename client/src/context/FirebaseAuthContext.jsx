import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  updatePassword,
  sendPasswordResetEmail,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
      return { success: true };
    } catch (error) {
      const message = error.message || 'Failed to send password reset email';
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
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              role: 'student',
              createdAt: new Date(),
              isActive: true,
              isFirstLogin: true
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), basicProfile);
            setUserProfile(basicProfile);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              ...basicProfile
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          toast.error('Error loading user profile');
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Admin creates user with auto-generated password
  const createUserByAdmin = async (userData) => {
    try {
      // Generate a temporary password
      const tempPassword = generateTempPassword();
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, tempPassword);
      const newUser = userCredential.user;

      // Update display name
      if (userData.name) {
        await updateProfile(newUser, { displayName: userData.name });
      }

      // Create user profile in Firestore
      const userProfile = {
        email: newUser.email,
        name: userData.name,
        role: userData.role || 'student',
        department: userData.department || '',
        rollno: userData.rollno || '',
        year: userData.year || '',
        college: userData.college || '',
        phone: userData.phone || '',
        address: userData.address || '',
        createdAt: new Date(),
        createdBy: auth.currentUser?.uid || 'admin',
        isActive: true,
        isFirstLogin: true,
        mustChangePassword: true,
        tempPassword: tempPassword // Store temporarily for admin reference
      };

      await setDoc(doc(db, 'users', newUser.uid), userProfile);

      // Send password reset email immediately
      await sendPasswordResetEmail(auth, userData.email);

      toast.success(`User created successfully! Password reset email sent to ${userData.email}`);
      
      return {
        user: newUser,
        tempPassword,
        profile: userProfile
      };
    } catch (error) {
      console.error('Create user error:', error);
      let errorMessage = 'Failed to create user';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        default:
          errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  // Generate temporary password
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Login function
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;
      
      // Check if user must change password
      const userDoc = await getDoc(doc(db, 'users', loggedInUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.mustChangePassword || userData.isFirstLogin) {
          toast('You must change your password before continuing', {
            icon: 'ℹ️',
          });
          return { user: loggedInUser, mustChangePassword: true };
        }
      }
      
      toast.success('Login successful!');
      return { user: loggedInUser, mustChangePassword: false };
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        default:
          errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  // Force password change for first-time users
  const forcePasswordChange = async (currentPassword, newPassword) => {
    try {
      if (!user) throw new Error('No user logged in');

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);

      // Update user profile to remove first login flags
      await updateDoc(doc(db, 'users', user.uid), {
        passwordChangedAt: new Date(),
        isFirstLogin: false,
        mustChangePassword: false,
        tempPassword: null // Remove temp password
      });

      toast.success('Password changed successfully! You can now use the system.');
      
      // Refresh user data
      const updatedUserDoc = await getDoc(doc(db, 'users', user.uid));
      if (updatedUserDoc.exists()) {
        const updatedData = updatedUserDoc.data();
        setUserProfile(updatedData);
        setUser(prev => ({ ...prev, ...updatedData }));
      }
      
      return true;
    } catch (error) {
      console.error('Force password change error:', error);
      let errorMessage = 'Failed to change password';
      
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage = 'Current password is incorrect';
          break;
        case 'auth/weak-password':
          errorMessage = 'New password is too weak (minimum 6 characters)';
          break;
        default:
          errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  // Send password reset email
  const sendPasswordReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Reset password error:', error);
      let errorMessage = 'Failed to send reset email';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please wait before trying again.';
          break;
        default:
          errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in');

      await updateDoc(doc(db, 'users', user.uid), {
        ...updates,
        updatedAt: new Date()
      });

      setUserProfile(prev => ({ ...prev, ...updates }));
      setUser(prev => ({ ...prev, ...updates }));

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    login,
    logout,
    createUserByAdmin,
    forcePasswordChange,
    sendPasswordReset,
    updateUserProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isLibrarian: user?.role === 'librarian',
    isStudent: user?.role === 'student',
    mustChangePassword: user?.mustChangePassword || user?.isFirstLogin
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};
