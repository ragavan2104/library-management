import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';

const createAdminUser = async () => {
  try {
    console.log('Creating admin user...');
    
    const adminEmail = 'ragavan212005@gmail.com';
    const adminPassword = 'password123'; // Will be forced to change on first login
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;
    
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
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('⚠️  Admin will be forced to change password on first login');
    
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️  Admin user already exists');
    } else {
      console.error('❌ Error creating admin user:', error.message);
    }
  }
};

export { createAdminUser };
