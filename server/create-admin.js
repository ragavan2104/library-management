import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Simple User schema for testing
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rollno: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  year: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['student', 'librarian', 'admin'],
    default: 'student'
  },
  phone: String,
  address: String,
  isActive: { type: Boolean, default: true }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

const createAdminUser = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@college.edu' });
    if (existingAdmin) {
      console.log('👨‍💼 Admin user already exists');
      return;
    }

    // Create admin user
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@college.edu',
      password: 'password123',
      rollno: 'ADM001',
      department: 'Administration',
      year: 'Graduate',
      role: 'admin',
      phone: '+1234567892',
      address: '789 Admin Building, College Town'
    });

    await adminUser.save();
    console.log('🎉 Admin user created successfully!');
    console.log('📧 Email: admin@college.edu');
    console.log('🔑 Password: password123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

createAdminUser();
