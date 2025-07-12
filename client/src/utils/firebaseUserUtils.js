import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { secondaryAuth } from '../config/secondaryFirebase';
import * as XLSX from 'xlsx';

// Generate password in format: <name><rollno>
export const generatePassword = (name, rollno) => {
  const cleanName = name.toLowerCase().replace(/\s+/g, '');
  return `${cleanName}${rollno}`;
};

// Generate email from name and rollno
export const generateEmail = (name, rollno) => {
  const cleanName = name.toLowerCase().replace(/\s+/g, '');
  return `${cleanName}.${rollno}@college.edu`;
};

// Create single user in Firebase
export const createFirebaseUser = async (userData) => {
  try {
    const { name, email, rollno, department, year, role = 'student', college = 'Engineering College' } = userData;
    
    // Use provided email or generate one
    const userEmail = email || generateEmail(name, rollno);
    const password = generatePassword(name, rollno);
    
    // Create user in Firebase Auth using secondary auth instance
    // This won't affect the current admin session
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userEmail, password);
    const newUser = userCredential.user;
    
    // Create user profile in Firestore (using main db instance)
    await setDoc(doc(db, 'users', newUser.uid), {
      uid: newUser.uid,
      name: name.trim(),
      email: userEmail,
      rollno: rollno.toString(),
      department: department.trim(),
      year: year.toString(),
      college: college.trim(),
      role,
      isFirstLogin: true,
      mustChangePassword: true,
      createdAt: new Date(),
      createdBy: 'admin',
      isActive: true,
      borrowedBooks: [],
      borrowHistory: [],
      totalFines: 0
    });
    
    return {
      success: true,
      user: {
        uid: newUser.uid,
        name,
        email: userEmail,
        rollno,
        department,
        year,
        college,
        role
      },
      credentials: {
        email: userEmail,
        password
      }
    };
  } catch (error) {
    console.error('Error creating Firebase user:', error);
    throw new Error(error.message || 'Failed to create user');
  }
};

// Create multiple users (bulk creation)
export const createBulkFirebaseUsers = async (usersData) => {
  const results = {
    successful: [],
    failed: [],
    duplicates: []
  };
  
  for (let i = 0; i < usersData.length; i++) {
    const userData = usersData[i];
    
    try {
      // Check if user already exists
      const email = generateEmail(userData.name, userData.rollno);
      const existingUserQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      const existingUsers = await getDocs(existingUserQuery);
      
      if (!existingUsers.empty) {
        results.duplicates.push({
          row: i + 1,
          data: userData,
          reason: 'Email already exists'
        });
        continue;
      }
      
      // Check for duplicate rollno
      const rollnoQuery = query(
        collection(db, 'users'),
        where('rollno', '==', userData.rollno.toString())
      );
      const rollnoUsers = await getDocs(rollnoQuery);
      
      if (!rollnoUsers.empty) {
        results.duplicates.push({
          row: i + 1,
          data: userData,
          reason: 'Roll number already exists'
        });
        continue;
      }
      
      // Create user
      const result = await createFirebaseUser(userData);
      
      results.successful.push({
        row: i + 1,
        ...userData,
        email: result.credentials.email,
        password: result.credentials.password,
        uid: result.user.uid
      });
      
    } catch (error) {
      results.failed.push({
        row: i + 1,
        data: userData,
        error: error.message
      });
    }
  }
  
  return results;
};

// Get all users from Firestore
export const getAllFirebaseUsers = async () => {
  try {
    const usersQuery = query(collection(db, 'users'));
    const snapshot = await getDocs(usersQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
};

// Update user in Firebase
export const updateFirebaseUser = async (uid, updateData) => {
  try {
    // Update user profile in Firestore
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updateData,
      updatedAt: new Date()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error(error.message || 'Failed to update user');
  }
};

// Delete user from Firebase
export const deleteFirebaseUser = async (uid) => {
  try {
    // Delete user profile from Firestore
    await deleteDoc(doc(db, 'users', uid));
    
    // Note: We cannot delete the user from Firebase Auth from the client side
    // This would require admin SDK on the server side
    // For now, we'll just mark the user as deleted in Firestore
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error(error.message || 'Failed to delete user');
  }
};

// Get user by UID
export const getFirebaseUserById = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    return {
      uid: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user:', error);
    throw new Error(error.message || 'Failed to get user');
  }
};

// Send password reset email
export const sendFirebasePasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Export users to Excel
export const exportUsersToExcel = (users, filename = 'users_credentials') => {
  try {
    // Prepare data for Excel
    const excelData = users.map((user, index) => ({
      'S.No': index + 1,
      'Name': user.name,
      'Email': user.email,
      'Password': user.password,
      'Roll Number': user.rollno,
      'Department': user.department,
      'Year': user.year,
      'College': user.college || 'Engineering College',
      'Role': user.role || 'student',
      'Created Date': new Date().toLocaleDateString()
    }));
    
    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    
    // Set column widths
    const colWidths = [
      { wch: 6 },  // S.No
      { wch: 20 }, // Name
      { wch: 30 }, // Email
      { wch: 15 }, // Password
      { wch: 12 }, // Roll Number
      { wch: 20 }, // Department
      { wch: 10 }, // Year
      { wch: 25 }, // College
      { wch: 10 }, // Role
      { wch: 15 }  // Created Date
    ];
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'User Credentials');
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fullFilename = `${filename}_${timestamp}.xlsx`;
    
    // Download file
    XLSX.writeFile(wb, fullFilename);
    
    return { success: true, filename: fullFilename };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export to Excel');
  }
};

// Validate user data
export const validateUserData = (userData) => {
  const errors = [];
  
  if (!userData.name || userData.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push('Invalid email format');
  }
  
  if (!userData.rollno || userData.rollno.toString().trim().length === 0) {
    errors.push('Roll number is required');
  }
  
  if (!userData.department || userData.department.trim().length === 0) {
    errors.push('Department is required');
  }
  
  if (!userData.year || userData.year.toString().trim().length === 0) {
    errors.push('Year is required');
  }
  
  return errors;
};

// Firebase login with password change detection
export const loginFirebaseUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user profile from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }
    
    const userData = userDoc.data();
    
    return {
      success: true,
      user: {
        uid: user.uid,
        ...userData
      },
      mustChangePassword: userData.mustChangePassword || userData.isFirstLogin
    };
  } catch (error) {
    console.error('Firebase login error:', error);
    throw new Error(error.message || 'Login failed');
  }
};

// Clear all users from Firebase (except specified admin)
export const clearAllFirebaseUsers = async (preserveAdminUid) => {
  try {
    const users = await getAllFirebaseUsers();
    
    // Filter out the admin we want to preserve
    const usersToDelete = users.filter(user => user.uid !== preserveAdminUid);
    
    // Delete users one by one
    const deletePromises = usersToDelete.map(user => deleteFirebaseUser(user.uid));
    await Promise.all(deletePromises);
    
    return { 
      success: true, 
      deletedCount: usersToDelete.length,
      message: `Successfully deleted ${usersToDelete.length} users` 
    };
  } catch (error) {
    console.error('Error clearing all users:', error);
    throw new Error(error.message || 'Failed to clear all users');
  }
};
