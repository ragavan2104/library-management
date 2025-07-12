import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import toast from 'react-hot-toast';

const ManualFirebaseSetup = () => {
  const [isCreating, setIsCreating] = useState(false);

  const createAdminUser = async () => {
    setIsCreating(true);
    
    try {
      const adminData = {
        name: 'System Administrator',
        email: 'ragavan212005@gmail.com',
        password: 'password123',
        rollno: 'ADM001',
        department: 'Administration',
        year: 'Graduate',
        college: 'Administrative College',
        role: 'admin',
        phone: '+1234567892',
        address: '789 Admin Building, College Town'
      };

      console.log('🔄 Manually creating Firebase admin user...');
      console.log('📧 Email:', adminData.email);

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        adminData.email, 
        adminData.password
      );
      const user = userCredential.user;
      console.log('✅ Firebase user created with UID:', user.uid);

      // Update display name
      await updateProfile(user, { displayName: adminData.name });

      // Create user profile in Firestore
      const userProfile = {
        email: user.email,
        name: adminData.name,
        role: adminData.role,
        department: adminData.department,
        rollno: adminData.rollno,
        year: adminData.year,
        college: adminData.college,
        phone: adminData.phone,
        address: adminData.address,
        createdAt: new Date(),
        createdBy: 'manual-setup',
        isActive: true,
        isFirstLogin: false,
        mustChangePassword: false,
        lastLogin: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      // Mark setup as complete
      await setDoc(doc(db, 'setup', 'admin-completed'), { 
        setupComplete: true, 
        date: new Date(),
        adminUid: user.uid,
        method: 'manual'
      });

      console.log('✅ Firebase admin user created successfully!');
      toast.success('Firebase admin user setup complete!');

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('✅ Admin user already exists in Firebase');
        toast.success('Admin user already exists!');
        
        // Mark setup as complete even if user exists
        try {
          await setDoc(doc(db, 'setup', 'admin-completed'), { 
            setupComplete: true, 
            date: new Date(),
            note: 'User already existed (manual check)'
          });
        } catch (setupError) {
          console.log('Setup marking failed:', setupError);
        }
      } else {
        console.error('❌ Error creating Firebase admin user:', error);
        toast.error('Failed to create admin user: ' + error.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-yellow-800">Firebase Admin Setup</h3>
          <p className="text-sm text-yellow-700 mt-1">
            If you're having login issues, manually create the Firebase admin user.
          </p>
        </div>
        <button
          onClick={createAdminUser}
          disabled={isCreating}
          className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
        >
          {isCreating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <span>🔧 Setup Admin User</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default ManualFirebaseSetup;
