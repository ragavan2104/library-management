# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for the Library Management System.

## 🔥 Firebase Setup Steps

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "library-management-system")
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** authentication
3. Optionally enable **Google** sign-in for easier access

### 3. Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (for development)
4. Select your preferred location
5. Click "Done"

### 4. Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click "Web app" icon (`</>`)
4. Register your app with a nickname
5. Copy the configuration object

### 5. Configure Environment Variables

Create a `.env` file in the client directory:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Other existing variables...
VITE_API_URL=https://library-management-mhs.vercel.app
```

### 6. Set up Firestore Security Rules

In Firestore Database > Rules, update to:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Admins can read/write all user profiles
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Books collection (read-only for students, write for admin/librarian)
    match /books/{bookId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'librarian'];
    }
    
    // Other collections as needed...
  }
}
```

### 7. Configure Email Templates (Optional)

1. Go to **Authentication** > **Templates**
2. Customize email templates for:
   - Password reset
   - Email verification
   - Email change

## 🚀 How the System Works

### Admin Creates User
1. Admin logs into the system
2. Goes to "Create User" page
3. Fills in user details (name, email, role, etc.)
4. System auto-generates a temporary password
5. Firebase creates the user account
6. Password reset email is automatically sent
7. User profile is stored in Firestore

### User First Login
1. User receives email with either:
   - Temporary password (shared by admin)
   - Password reset link
2. User logs in with temporary password OR uses reset link
3. System detects first login and forces password change
4. User creates a new secure password
5. User can now access the system normally

### Password Reset Flow
1. User clicks "Forgot Password" on login page
2. Enters email address
3. Firebase sends password reset email
4. User clicks link in email
5. Creates new password
6. Can log in with new password

## 🔑 Key Features

- **Auto-generated temporary passwords** for admin-created accounts
- **Forced password change** on first login
- **Email verification** with Firebase
- **Password reset** via email links
- **Real-time validation** for password strength
- **Secure user management** with role-based access

## 🛠️ Development vs Production

### Development
- Uses Firebase Authentication directly
- All emails are sent via Firebase
- Immediate password reset functionality

### Production
- Same setup but with production Firebase project
- Consider enabling additional security features
- Monitor authentication usage in Firebase Console

## 📧 Email Configuration

Firebase handles all email sending automatically:
- Password reset emails
- Email verification
- Account creation notifications

No additional email service setup required!

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit Firebase config to Git
2. **Firestore Rules**: Set up proper security rules
3. **Password Policy**: Enforce strong password requirements
4. **Account Monitoring**: Monitor unusual login patterns
5. **Role-based Access**: Implement proper user roles

## 🐛 Troubleshooting

### Common Issues:

1. **"Firebase not initialized"**
   - Check if all environment variables are set
   - Verify Firebase config is correct

2. **"Permission denied"**
   - Check Firestore security rules
   - Verify user has proper role permissions

3. **"Email not sent"**
   - Check Firebase Authentication settings
   - Verify email/password is enabled
   - Check spam folder

4. **"User creation fails"**
   - Ensure admin has proper permissions
   - Check Firebase quota limits
   - Verify network connectivity

## 📱 Testing the System

1. **Create an admin account** manually in Firebase Console
2. **Set admin role** in Firestore users collection
3. **Log in as admin** and test user creation
4. **Test password reset flow** with a test email
5. **Verify forced password change** works correctly

## 🎯 Next Steps

After setup:
1. Create your first admin user
2. Test the user creation flow
3. Set up additional Firebase features (Storage, etc.)
4. Deploy to Firebase Hosting (optional)
5. Monitor usage in Firebase Console

---

**Need Help?** Check the Firebase documentation or reach out to the development team!
