import React, { useState } from 'react';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { toast } from 'react-hot-toast';

const FirebaseSetup = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [adminCreated, setAdminCreated] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [existingUsers, setExistingUsers] = useState([]);

  // Check for existing users
  const checkExistingUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExistingUsers(users);
      console.log('Existing users found:', users.length);
      return users;
    } catch (error) {
      console.error('Error checking users:', error);
      return [];
    }
  };

  // Clean up orphaned Firestore documents
  const cleanupFirestore = async () => {
    setIsCleaningUp(true);
    try {
      console.log('Cleaning up Firestore documents...');
      
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let deletedCount = 0;
      
      for (const docSnapshot of usersSnapshot.docs) {
        await deleteDoc(doc(db, 'users', docSnapshot.id));
        deletedCount++;
      }
      
      console.log(`Deleted ${deletedCount} Firestore documents`);
      toast.success(`Cleaned up ${deletedCount} Firestore documents`);
      setExistingUsers([]);
    } catch (error) {
      console.error('Error cleaning up:', error);
      toast.error('Failed to cleanup Firestore');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const createAdminUser = async () => {
    setIsCreating(true);
    
    try {
      console.log('Creating admin user...');
      
      const adminEmail = 'ragavan212005@gmail.com';
      const adminPassword = 'password123';
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      const user = userCredential.user;
      
      console.log('Firebase Auth user created:', user.uid);
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: 'System Administrator',
        email: adminEmail,
        rollno: 'ADM001',
        department: 'Administration',
        year: 'Graduate',
        college: 'Engineering College',
        role: 'admin',
        isFirstLogin: true,
        mustChangePassword: true,
        createdAt: new Date(),
        createdBy: 'system',
        isActive: true,
        borrowedBooks: [],
        borrowHistory: [],
        totalFines: 0
      });
      
      console.log('Firestore profile created');
      
      setAdminCreated(true);
      toast.success('Admin user created successfully!');
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password:', adminPassword);
      console.log('⚠️  Admin will be forced to change password on first login');
      
      // Refresh user list
      await checkExistingUsers();
      
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️  Admin user already exists in Auth, checking Firestore...');
        
        // Try to get current user and create Firestore profile
        try {
          const currentUser = auth.currentUser;
          if (currentUser && currentUser.email === adminEmail) {
            console.log('Found existing Auth user, creating Firestore profile...');
            
            await setDoc(doc(db, 'users', currentUser.uid), {
              uid: currentUser.uid,
              name: 'System Administrator',
              email: adminEmail,
              rollno: 'ADM001',
              department: 'Administration',
              year: 'Graduate',
              college: 'Engineering College',
              role: 'admin',
              isFirstLogin: true,
              mustChangePassword: true,
              createdAt: new Date(),
              createdBy: 'system',
              isActive: true,
              borrowedBooks: [],
              borrowHistory: [],
              totalFines: 0
            });
            
            setAdminCreated(true);
            toast.success('Admin Firestore profile created for existing user!');
          } else {
            toast.error('Admin email already in use but user not accessible. Please use a different email or contact support.');
          }
        } catch (firestoreError) {
          console.error('Error creating Firestore profile:', firestoreError);
          toast.error('Failed to create admin profile in Firestore');
        }
      } else {
        console.error('❌ Error creating admin user:', error.message);
        toast.error(`Error: ${error.message}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const testFirebaseConnection = () => {
    try {
      console.log('Firebase config:', {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...',
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
      });
      
      console.log('Auth instance:', auth);
      console.log('Firestore instance:', db);
      
      toast.success('Firebase connection test passed!');
    } catch (error) {
      console.error('Firebase connection error:', error);
      toast.error('Firebase connection failed!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Firebase Setup
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Setup your Firebase authentication system
          </p>
        </div>

        <div className="space-y-4">
          {/* Firebase Connection Test */}
          <button
            onClick={testFirebaseConnection}
            className="w-full flex justify-center py-2 px-4 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Test Firebase Connection
          </button>

          {/* Check existing users */}
          <button
            onClick={checkExistingUsers}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Check Existing Users ({existingUsers.length})
          </button>

          {/* Cleanup Firestore */}
          {existingUsers.length > 0 && (
            <button
              onClick={cleanupFirestore}
              disabled={isCleaningUp}
              className="w-full flex justify-center py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isCleaningUp ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                  Cleaning Up...
                </div>
              ) : (
                `Clean Up Firestore (${existingUsers.length} docs)`
              )}
            </button>
          )}

          {/* Create Admin User */}
          <button
            onClick={createAdminUser}
            disabled={isCreating || adminCreated}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isCreating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Admin User...
              </div>
            ) : adminCreated ? (
              'Admin User Created ✓'
            ) : (
              'Create Admin User'
            )}
          </button>

          {adminCreated && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-800 font-medium">Admin Credentials:</h3>
              <p className="text-green-700 text-sm mt-1">
                <strong>Email:</strong> ragavan212005@gmail.com<br />
                <strong>Password:</strong> password123
              </p>
              <p className="text-green-600 text-xs mt-2">
                You will be forced to change the password on first login.
              </p>
              <a
                href="/login"
                className="inline-block mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Go to Login
              </a>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500 text-sm px-4">OR</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <div className="space-y-4">
            <button
              onClick={checkExistingUsers}
              className="w-full flex justify-center py-2 px-4 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Check Existing Users
            </button>

            {existingUsers.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-yellow-800 font-medium">Existing Users:</h3>
                <ul className="text-yellow-700 text-sm mt-1 list-disc list-inside">
                  {existingUsers.map(user => (
                    <li key={user.id}>
                      {user.name} ({user.email})
                    </li>
                  ))}
                </ul>
                <button
                  onClick={cleanupFirestore}
                  className="mt-3 w-full px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Cleanup Firestore
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-800 font-medium text-sm">Current Configuration:</h3>
          <div className="text-blue-700 text-xs mt-1 space-y-1">
            <p><strong>Project ID:</strong> {import.meta.env.VITE_FIREBASE_PROJECT_ID}</p>
            <p><strong>Auth Domain:</strong> {import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}</p>
            <p><strong>API Key:</strong> {import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10)}...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirebaseSetup;
