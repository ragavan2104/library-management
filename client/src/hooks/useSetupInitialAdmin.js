import { useEffect } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import toast from 'react-hot-toast';

const useSetupInitialAdmin = () => {
  useEffect(() => {
    const setupAdmin = async () => {
      try {
        // Wait for auth to be ready
        if (!auth.currentUser && auth.currentUser !== null) {
          setTimeout(() => setupAdmin(), 1000);
          return;
        }

        // Check if admin setup was already completed
        try {
          const adminQuery = await getDoc(doc(db, 'setup', 'admin-completed'));
          if (adminQuery.exists()) {
            console.log('✅ Admin setup already completed');
            return;
          }
        } catch (error) {
          console.log('🔍 Checking admin setup status...');
        }

        // Admin data from seed.js
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

        console.log('🔄 Setting up initial Firebase admin user...');
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
          createdBy: 'system',
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
          adminUid: user.uid 
        });

        console.log('✅ Firebase admin user created successfully!');
        toast.success('Firebase admin user setup complete!');

      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          console.log('✅ Admin user already exists in Firebase');
          // Mark setup as complete even if user exists
          try {
            await setDoc(doc(db, 'setup', 'admin-completed'), { 
              setupComplete: true, 
              date: new Date(),
              note: 'User already existed'
            });
          } catch (setupError) {
            console.log('Setup marking failed:', setupError);
          }
        } else {
          console.error('❌ Error setting up Firebase admin user:', error);
        }
      }
    };

    // Only run if Firebase is available
    if (auth && db) {
      setupAdmin();
    }
  }, []);
};

export default useSetupInitialAdmin;
