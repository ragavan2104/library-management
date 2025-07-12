# 🔑 LOGIN CREDENTIALS

## Test User Accounts

### 👨‍🎓 STUDENT ACCESS
- **Email:** `student@college.edu`
- **Password:** `password123`
- **Features:** Browse books, view personal dashboard, manage borrowed books

### 📚 LIBRARIAN ACCESS
- **Email:** `librarian@college.edu`
- **Password:** `password123`
- **Features:** Full book management, user management, borrow/return tracking, analytics dashboard

### 👨‍💼 ADMIN ACCESS
- **Email:** `admin@college.edu`
- **Password:** `password123`
- **Features:** Complete system access, user role management, system settings

## 🚀 Quick Start

1. **Start MongoDB** (make sure it's running on your system)

2. **Start Backend Server:**
   ```powershell
   cd server
   npm run dev
   ```

3. **Start Frontend:** (in new terminal)
   ```powershell
   cd client
   npm run dev
   ```

4. **Access Application:**
   - Open browser to `http://localhost:5173`
   - Use any of the credentials above to login

## 📝 Notes

- If you don't see data in the dashboard, you may need to create the test users manually through the registration process
- Use the librarian account to add books and manage the system
- The admin account has the highest privileges for system management
- All passwords are set to `password123` for testing purposes

## 🔄 Create Test Data

If you want to seed the database with test users and books, run:
```powershell
cd server
npm run seed
```

This will create the test users and sample books automatically.
