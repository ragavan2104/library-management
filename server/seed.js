import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Book from './models/Book.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library_management';

const seedUsers = [
  {
    name: 'Student User',
    email: 'student@college.edu',
    password: 'password123',
    rollno: 'STU001',
    department: 'Computer Science',
    year: '3rd Year',
    college: 'Engineering College',
    role: 'student',
    phone: '+1234567890',
    address: '123 Student Street, College Town'
  },
  {
    name: 'Library Manager',
    email: 'librarian@college.edu',
    password: 'password123',
    rollno: 'LIB001',
    department: 'Library Services',
    year: 'Graduate',
    college: 'Staff College',
    role: 'librarian',
    phone: '+1234567891',
    address: '456 Library Avenue, College Town'
  },
  {
    name: 'System Administrator',
    email: 'admin@college.edu',
    password: 'password123',
    rollno: 'ADM001',
    department: 'Administration',
    year: 'Graduate',
    college: 'Administrative College',
    role: 'admin',
    phone: '+1234567892',
    address: '789 Admin Building, College Town'
  }
];

const seedBooks = [
  {
    title: 'Introduction to Computer Science',
    author: 'John Smith',
    isbn: '9780123456789',
    category: 'Computer Science',
    description: 'A comprehensive introduction to computer science concepts and programming.',
    publisher: 'Tech Publications',
    publishedYear: 2022,
    pages: 450,
    language: 'English',
    edition: '3rd Edition',
    totalCopies: 5,
    availableCopies: 5,
    location: {
      shelf: 'A1',
      section: 'Computer Science',
      floor: 'Ground Floor'
    },
    tags: ['programming', 'computer science', 'algorithms']
  },
  {
    title: 'Database Systems Concepts',
    author: 'Abraham Silberschatz',
    isbn: '9780073523323',
    category: 'Computer Science',
    description: 'Comprehensive coverage of database system concepts and design.',
    publisher: 'McGraw-Hill',
    publishedYear: 2020,
    pages: 900,
    language: 'English',
    edition: '7th Edition',
    totalCopies: 3,
    availableCopies: 3,
    location: {
      shelf: 'A2',
      section: 'Computer Science',
      floor: 'Ground Floor'
    },
    tags: ['database', 'sql', 'data management']
  },
  {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    isbn: '9780132350884',
    category: 'Computer Science',
    description: 'A handbook of agile software craftsmanship.',
    publisher: 'Prentice Hall',
    publishedYear: 2008,
    pages: 464,
    language: 'English',
    edition: '1st Edition',
    totalCopies: 4,
    availableCopies: 4,
    location: {
      shelf: 'A3',
      section: 'Computer Science',
      floor: 'Ground Floor'
    },
    tags: ['programming', 'software engineering', 'best practices']
  },
  {
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    isbn: '9780262033848',
    category: 'Mathematics',
    description: 'Comprehensive introduction to algorithms and data structures.',
    publisher: 'MIT Press',
    publishedYear: 2009,
    pages: 1312,
    language: 'English',
    edition: '3rd Edition',
    totalCopies: 2,
    availableCopies: 2,
    location: {
      shelf: 'B1',
      section: 'Mathematics',
      floor: 'First Floor'
    },
    tags: ['algorithms', 'data structures', 'mathematics']
  },
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '9780743273565',
    category: 'Literature',
    description: 'A classic American novel set in the Jazz Age.',
    publisher: 'Scribner',
    publishedYear: 1925,
    pages: 180,
    language: 'English',
    edition: 'Reprint Edition',
    totalCopies: 6,
    availableCopies: 6,
    location: {
      shelf: 'C1',
      section: 'Literature',
      floor: 'Second Floor'
    },
    tags: ['classic', 'american literature', 'jazz age']
  }
];

const seedDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await User.deleteMany({});
    await Book.deleteMany({});

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    
    for (const userData of seedUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`✅ Created ${user.role}: ${user.email}`);
    }

    // Create books (assign first librarian as addedBy)
    console.log('📚 Creating books...');
    const librarian = createdUsers.find(user => user.role === 'librarian');
    
    for (const bookData of seedBooks) {
      const book = new Book({
        ...bookData,
        addedBy: librarian._id
      });
      await book.save();
      console.log(`✅ Created book: ${book.title}`);
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('='.repeat(50));
    console.log('👨‍🎓 STUDENT:');
    console.log('  Email: student@college.edu');
    console.log('  Password: password123');
    console.log('');
    console.log('📚 LIBRARIAN:');
    console.log('  Email: librarian@college.edu');
    console.log('  Password: password123');
    console.log('');
    console.log('👨‍💼 ADMIN:');
    console.log('  Email: admin@college.edu');
    console.log('  Password: password123');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedDatabase();
