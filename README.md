# Library Management System

A comprehensive real-time library management application built with React, Express, Node.js, and MongoDB.

## Features

### For Students
- 📚 Browse and search books
- 📖 View book details and reviews
- 📋 Manage borrowed books
- 🔔 Real-time notifications
- 👤 Profile management

### For Librarians/Admins
- 📊 Dashboard with analytics
- 📚 Book inventory management
- 👥 User management
- 📋 Borrow/return tracking
- 💰 Fine management
- 📈 Reports and statistics

### Technical Features
- 🔐 JWT authentication
- 🔄 Real-time updates with Socket.io
- 📱 Responsive design with Tailwind CSS
- 🛡️ Role-based access control
- 💾 MongoDB data persistence
- 🚀 RESTful API design

## Project Structure

```
manage/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React contexts
│   │   ├── pages/          # Page components
│   │   └── ...
│   └── package.json
└── server/                 # Express backend
    ├── models/             # MongoDB models
    ├── routes/             # API routes
    ├── middleware/         # Custom middleware
    └── package.json
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

## Setup Instructions

### 1. Clone and Navigate
```bash
cd c:\Users\Ragavan\OneDrive\Desktop\manage
```

### 2. Backend Setup
```bash
cd server
npm install
```

### 3. Environment Configuration
Create a `.env` file in the server directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/library_management
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=30d
NODE_ENV=development
```

### 4. Frontend Setup
```bash
cd ../client
npm install
```

### 5. Database Setup
Make sure MongoDB is running on your system:
- **Local MongoDB**: Start MongoDB service
- **MongoDB Atlas**: Update MONGODB_URI in .env file

### 6. Running the Application

#### Start Backend Server
```bash
cd server
npm run dev
```
Server will run on http://localhost:5000

#### Start Frontend Development Server
```bash
cd client
npm run dev
```
Frontend will run on http://localhost:5173

## Default User Accounts

For testing purposes, you can create these accounts or seed the database:

```
Student:
- Email: student@college.edu
- Password: password123

Librarian:
- Email: librarian@college.edu
- Password: password123

Admin:
- Email: admin@college.edu
- Password: password123
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Books
- `GET /api/books` - Get all books
- `GET /api/books/:id` - Get book by ID
- `POST /api/books` - Add new book (Librarian/Admin)
- `PUT /api/books/:id` - Update book (Librarian/Admin)
- `DELETE /api/books/:id` - Delete book (Admin)

### Borrowing
- `POST /api/borrows` - Borrow book (Librarian/Admin)
- `GET /api/borrows` - Get borrows
- `PUT /api/borrows/:id/return` - Return book
- `PUT /api/borrows/:id/renew` - Renew book

### Users (Librarian/Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id/toggle-status` - Toggle user status

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/user-stats` - Get user statistics

## Real-time Features

The application uses Socket.io for real-time updates:
- Book status changes
- New book notifications
- Overdue reminders
- Live dashboard updates

## Technology Stack

### Frontend
- **React 18** - UI library
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Socket.io Client** - Real-time communication
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications

### Backend
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Express Validator** - Input validation

## Development Scripts

### Client
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Server
```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
