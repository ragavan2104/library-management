#!/bin/bash

# Firebase Authentication Migration Script
# This script helps migrate from dual authentication to Firebase-only

echo "🔥 Firebase Authentication Migration Script"
echo "==========================================="

# Step 1: Backup existing files
echo "📁 Creating backup of existing files..."
mkdir -p backup/components/auth
mkdir -p backup/context
mkdir -p backup/pages/auth

# Backup old files
cp src/context/AuthContext.jsx backup/context/ 2>/dev/null || echo "AuthContext.jsx not found"
cp src/pages/auth/Login.jsx backup/pages/auth/ 2>/dev/null || echo "Login.jsx not found"
cp src/pages/auth/Register.jsx backup/pages/auth/ 2>/dev/null || echo "Register.jsx not found"
cp src/components/auth/ForcePasswordChange.jsx backup/components/auth/ 2>/dev/null || echo "ForcePasswordChange.jsx not found"
cp src/components/admin/CreateUserByAdmin.jsx backup/components/admin/ 2>/dev/null || echo "CreateUserByAdmin.jsx not found"

echo "✅ Backup completed in ./backup/ directory"

# Step 2: Install required packages
echo "📦 Installing required packages..."
npm install xlsx

# Step 3: Update package.json scripts
echo "📝 Adding useful scripts to package.json..."

# Create a temporary script to add to package.json
cat > temp_scripts.json << EOF
{
  "create-admin": "node -e \"import('./src/scripts/createAdminUser.js').then(m => m.createAdminUser())\"",
  "firebase:deploy": "firebase deploy",
  "firebase:emulators": "firebase emulators:start",
  "build:firebase": "npm run build && firebase deploy"
}
EOF

echo "📋 Scripts to add to package.json:"
cat temp_scripts.json
rm temp_scripts.json

# Step 4: Environment variables check
echo "🔧 Checking environment variables..."
if [ -f .env ]; then
    echo "✅ .env file found"
    
    # Check for required Firebase variables
    required_vars=("VITE_FIREBASE_API_KEY" "VITE_FIREBASE_AUTH_DOMAIN" "VITE_FIREBASE_PROJECT_ID")
    
    for var in "${required_vars[@]}"; do
        if grep -q "$var" .env; then
            echo "✅ $var found"
        else
            echo "❌ $var missing - please add to .env"
        fi
    done
else
    echo "❌ .env file not found"
    echo "📝 Creating sample .env file..."
    
    cat > .env.sample << EOF
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Optional: Firebase Emulators (for development)
VITE_USE_FIREBASE_EMULATORS=false
EOF
    
    echo "✅ Sample .env file created. Please copy to .env and fill in your values."
fi

# Step 5: Firebase rules template
echo "🔐 Creating Firestore security rules template..."
cat > firestore.rules.template << EOF
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - only authenticated users can access
    match /users/{userId} {
      // Users can read/write their own document
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Librarians and admins can read all user documents
      allow read: if request.auth != null && 
        exists(/databases/\$(database)/documents/users/\$(request.auth.uid)) &&
        get(/databases/\$(database)/documents/users/\$(request.auth.uid)).data.role in ['admin', 'librarian'];
      
      // Only admins can create/update user documents
      allow write: if request.auth != null && 
        exists(/databases/\$(database)/documents/users/\$(request.auth.uid)) &&
        get(/databases/\$(database)/documents/users/\$(request.auth.uid)).data.role == 'admin';
    }
    
    // Books collection (add your books rules here)
    match /books/{bookId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/\$(database)/documents/users/\$(request.auth.uid)) &&
        get(/databases/\$(database)/documents/users/\$(request.auth.uid)).data.role in ['admin', 'librarian'];
    }
    
    // Borrow records collection (add your borrowing rules here)
    match /borrows/{borrowId} {
      allow read, write: if request.auth != null;
    }
  }
}
EOF

echo "✅ Firestore rules template created: firestore.rules.template"

# Step 6: Create admin user script
echo "👨‍💼 Creating admin user creation instructions..."
cat > CREATE_ADMIN.md << EOF
# Create Admin User

To create the default admin user, follow these steps:

## Method 1: Browser Console
1. Start your development server: \`npm run dev\`
2. Open browser console (F12)
3. Run the following code:

\`\`\`javascript
import('./src/scripts/createAdminUser.js')
  .then(module => module.createAdminUser())
  .then(() => console.log('Admin user created!'))
  .catch(console.error);
\`\`\`

## Method 2: Node.js Script
1. Create a temporary Node.js script:

\`\`\`javascript
// create-admin-temp.js
import { createAdminUser } from './src/scripts/createAdminUser.js';
createAdminUser().then(() => process.exit(0));
\`\`\`

2. Run: \`node create-admin-temp.js\`

## Default Admin Credentials
- **Email:** ragavan212005@gmail.com
- **Password:** password123 (must change on first login)

## After Creation
1. Navigate to: http://localhost:5173/login
2. Login with admin credentials
3. You'll be forced to change the password
4. Access the admin dashboard to create users
EOF

echo "✅ Admin creation instructions: CREATE_ADMIN.md"

# Step 7: Testing checklist
echo "✅ Creating testing checklist..."
cat > TESTING_CHECKLIST.md << EOF
# Firebase Authentication Testing Checklist

## ✅ Admin Functions
- [ ] Admin can login with ragavan212005@gmail.com
- [ ] Admin is forced to change password on first login
- [ ] Admin can access admin dashboard
- [ ] Admin can create single users
- [ ] Admin can create bulk users via CSV
- [ ] Excel download works for created users
- [ ] Generated passwords follow format: name+rollno
- [ ] Generated emails follow format: name.rollno@college.edu

## ✅ User Functions
- [ ] Created users can login with generated credentials
- [ ] Users are forced to change password on first login
- [ ] Password change works properly
- [ ] Users can access appropriate dashboards
- [ ] Forgot password functionality works
- [ ] Password reset emails are received

## ✅ Security
- [ ] Inactive users cannot login
- [ ] Role-based access control works
- [ ] Firebase security rules are applied
- [ ] Password requirements are enforced
- [ ] Session management works correctly

## ✅ UI/UX
- [ ] All forms validate properly
- [ ] Loading states show correctly
- [ ] Error messages are clear
- [ ] Success messages appear
- [ ] Navigation works for all roles
- [ ] Mobile responsiveness maintained

## ✅ Data Management
- [ ] User data saves to Firestore
- [ ] Duplicate detection works
- [ ] Bulk creation results are accurate
- [ ] Excel export contains correct data
- [ ] CSV parsing handles errors gracefully
EOF

echo "✅ Testing checklist created: TESTING_CHECKLIST.md"

# Step 8: Final instructions
echo ""
echo "🎉 Migration Preparation Complete!"
echo "================================"
echo ""
echo "Next Steps:"
echo "1. ✅ Update your .env file with Firebase configuration"
echo "2. ✅ Deploy Firestore security rules: firebase deploy --only firestore:rules"
echo "3. ✅ Create admin user (see CREATE_ADMIN.md)"
echo "4. ✅ Test authentication flow (see TESTING_CHECKLIST.md)"
echo "5. ✅ Remove old MongoDB authentication code"
echo ""
echo "Important Files Created:"
echo "- 📄 .env.sample (Firebase configuration template)"
echo "- 📄 firestore.rules.template (Security rules)"
echo "- 📄 CREATE_ADMIN.md (Admin user creation guide)"
echo "- 📄 TESTING_CHECKLIST.md (Testing guide)"
echo "- 📂 backup/ (Backup of old files)"
echo ""
echo "Happy coding! 🚀"
