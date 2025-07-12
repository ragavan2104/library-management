import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
// import { createServer } from 'http';
// import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import userRoutes from './routes/users.js';
import borrowRoutes from './routes/borrows.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';

// Load environment variables
dotenv.config();

const app = express();
// Remove Socket.io for Vercel serverless compatibility
// const server = createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: process.env.CLIENT_URL || "http://localhost:5173",
//     methods: ["GET", "POST", "PUT", "DELETE"]
//   }
// });

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library_management';

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://library-management-peach-ten.vercel.app',
    process.env.CLIENT_URL
  ].filter(Boolean), // Remove undefined values
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Database connection middleware for Vercel
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Static files
app.use('/uploads', express.static('uploads'));
app.use('/templates', express.static('public/templates'));

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Library Management API is running!', 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    message: 'Server is healthy', 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/users', userRoutes);
app.use('/api/borrows', borrowRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io connection handling - Disabled for Vercel serverless deployment
// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   // Join room for real-time updates
//   socket.on('join-library', (userId) => {
//     socket.join('library-updates');
//     console.log(`User ${userId} joined library updates room`);
//   });

//   // Handle book borrow events
//   socket.on('book-borrowed', (data) => {
//     io.to('library-updates').emit('book-status-changed', {
//       bookId: data.bookId,
//       status: 'borrowed',
//       borrowedBy: data.userId,
//       timestamp: new Date()
//     });
//   });

//   // Handle book return events
//   socket.on('book-returned', (data) => {
//     io.to('library-updates').emit('book-status-changed', {
//       bookId: data.bookId,
//       status: 'available',
//       returnedBy: data.userId,
//       timestamp: new Date()
//     });
//   });

//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//   });
// });

// MongoDB connection
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }
  
  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

// For local development
if (process.env.NODE_ENV !== 'production') {
  const startServer = async () => {
    try {
      await connectToDatabase();
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📚 Library Management API ready!`);
      });
    } catch (error) {
      console.error('❌ Server startup error:', error);
      process.exit(1);
    }
  };
  startServer();
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? error.message : {} 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default app;
