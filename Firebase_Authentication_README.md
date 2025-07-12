# Library Management System - Firebase Authentication

This is a complete overhaul of the authentication system to use **Firebase-only authentication** with auto-generated passwords and bulk user creation with Excel export functionality.

## 🚀 New Features

### 1. Firebase-Only Authentication
- Complete removal of MongoDB authentication
- All users stored in Firebase Authentication + Firestore
- Simplified authentication flow
- Better security and scalability

### 2. Auto-Generated Passwords
- Password format: `{name}{rollno}` (e.g., `johndoe123`)
- Automatic email generation: `{name}.{rollno}@college.edu`
- First-time login forces password change

### 3. Bulk User Creation
- CSV format input for multiple users
- Single user creation form
- Real-time validation and duplicate checking
- Comprehensive results with success/failure tracking

### 4. Excel Export
- Download credentials as Excel file
- Formatted with all user information
- Timestamped filenames
- Bulk export after bulk creation

### 5. Forgot Password
- Firebase-powered password reset emails
- Integrated with login form
- Secure reset process

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
cd client
npm install xlsx
```

### 2. Firebase Configuration
Make sure your `.env` file has the Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Create Admin User
Run the admin creation script to set up the default admin:
```bash
# In browser console or create a temporary script
import { createAdminUser } from './src/scripts/createAdminUser.js';
createAdminUser();
```

**Default Admin Credentials:**
- Email: `ragavan212005@gmail.com`
- Password: `password123` (will be forced to change on first login)

### 4. Firebase Security Rules
Update your Firestore security rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'librarian'];
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## 📱 Usage Guide

### Admin Functions

#### 1. Single User Creation
1. Navigate to Admin Dashboard
2. Click "Single User" tab
3. Fill in user details:
   - Name (required)
   - Roll Number (required)
   - Department (required)
   - Year (required)
   - College (optional)
   - Role (student/librarian)
4. Click "Create User"
5. Copy or download credentials

#### 2. Bulk User Creation
1. Navigate to Admin Dashboard
2. Click "Bulk Users" tab
3. Enter CSV data in format:
   ```
   John Doe,CS001,Computer Science,1st Year,Engineering College
   Jane Smith,CS002,Computer Science,1st Year,Engineering College
   ```
4. Click "Create Users"
5. Review results and download Excel file

#### 3. Excel Export
- Automatic download after bulk creation
- Manual download for individual users
- Contains: Name, Email, Password, Roll Number, Department, Year, College, Role, Created Date

### User Functions

#### 1. First Login
1. Use provided email and password
2. System will force password change
3. Create new secure password
4. Access dashboard normally

#### 2. Forgot Password
1. Click "Forgot Password" on login page
2. Enter email address
3. Check email for reset link
4. Follow instructions to reset password

## 🏗️ File Structure

```
client/src/
├── components/
│   ├── admin/
│   │   └── CreateUserByAdminFirebase.jsx     # New Firebase-only admin component
│   ├── auth/
│   │   └── ForcePasswordChangeFirebase.jsx   # Firebase password change
│   └── layout/
│       ├── Navbar.jsx                        # Updated for Firebase auth
│       └── Sidebar.jsx                       # Updated for Firebase auth
├── context/
│   └── FirebaseOnlyAuthContext.jsx           # New Firebase-only context
├── pages/
│   └── auth/
│       └── LoginFirebase.jsx                 # New Firebase login page
├── scripts/
│   └── createAdminUser.js                    # Admin user creation script
├── utils/
│   └── firebaseUserUtils.js                 # Firebase user management utilities
└── App.jsx                                   # Updated routing
```

## 🔄 Migration Notes

### Removed Components
- `AuthContext.jsx` (MongoDB authentication)
- `Login.jsx` (dual authentication)
- `Register.jsx` (public registration)
- `CreateUserByAdmin.jsx` (MongoDB version)
- `ForcePasswordChange.jsx` (dual auth version)
- All server-side authentication routes

### New Components
- `FirebaseOnlyAuthContext.jsx` - Pure Firebase authentication
- `LoginFirebase.jsx` - Firebase-only login
- `CreateUserByAdminFirebase.jsx` - Firebase user creation with Excel export
- `ForcePasswordChangeFirebase.jsx` - Firebase password change
- `firebaseUserUtils.js` - Utility functions for user management

## 🔐 Security Features

1. **Firebase Authentication** - Industry-standard security
2. **Forced Password Change** - Security on first login
3. **Password Requirements** - Uppercase, lowercase, numbers
4. **Account Deactivation** - Admin can deactivate users
5. **Role-based Access** - Admin, Librarian, Student roles
6. **Email Verification** - Built-in Firebase feature
7. **Password Reset** - Secure email-based reset

## 📊 Password Generation

The system generates passwords in the format: `{name}{rollno}`

**Examples:**
- Name: "John Doe", Roll: "CS001" → Password: "johndoecs001"
- Name: "Jane Smith", Roll: "IT123" → Password: "janesmithit123"

**Email Generation:**
- Name: "John Doe", Roll: "CS001" → Email: "johndoe.cs001@college.edu"

## 🛠️ Troubleshooting

### Common Issues

1. **Firebase Connection Error**
   - Check `.env` file configuration
   - Verify Firebase project settings
   - Ensure internet connection

2. **Admin User Creation Failed**
   - Check if user already exists
   - Verify Firebase Auth is enabled
   - Check console for error messages

3. **Excel Download Not Working**
   - Ensure `xlsx` package is installed
   - Check browser popup/download settings
   - Verify file permissions

4. **Password Reset Not Received**
   - Check spam/junk folder
   - Verify email address is correct
   - Check Firebase Auth email templates

### Support

For technical support or questions:
1. Check console logs for errors
2. Verify Firebase configuration
3. Test with admin credentials
4. Review security rules

## 🎯 Future Enhancements

1. **Email Templates** - Custom Firebase email templates
2. **User Import** - Excel file upload for bulk import
3. **Profile Pictures** - Firebase Storage integration
4. **Audit Logs** - Track user creation and modifications
5. **Multi-tenant** - Support for multiple colleges
6. **SMS Authentication** - Phone number verification
7. **Social Login** - Google/Microsoft integration

---

**Version:** 2.0.0  
**Last Updated:** December 2024  
**Firebase SDK:** v9+  
**React:** 18.2.0
