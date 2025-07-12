// Setup Firebase Admin User
// Run this once to create the initial admin user in Firebase
// This matches the admin user from seed.js

import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';

const setupFirebaseAdmin = async () => {
  try {
    console.log('🔄 Creating Firebase admin user...');
    
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

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      adminData.email, 
      adminData.password
    );
    const user = userCredential.user;

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
      isFirstLogin: false, // Admin doesn't need to change password
      mustChangePassword: false,
      lastLogin: new Date()
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);

    console.log('✅ Firebase admin user created successfully!');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('🆔 Firebase UID:', user.uid);

  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('✅ Admin user already exists in Firebase');
    } else {
      console.error('❌ Error creating Firebase admin user:', error);
    }
  }
};

// Uncomment the line below and run this file to create the admin user
// setupFirebaseAdmin();

export default setupFirebaseAdmin;
