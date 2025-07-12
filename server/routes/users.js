import express from 'express';
import { query, validationResult, body } from 'express-validator';
import User from '../models/User.js';
import { auth, isLibrarianOrAdmin, isAdmin } from '../middleware/auth.js';
import { createSafeRegex } from '../utils/regex.js';
import XLSX from 'xlsx';
import multer from 'multer';

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Please upload an Excel file (.xlsx or .xls)'));
    }
  }
});

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Librarian/Admin only)
router.get('/', auth, isLibrarianOrAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['student', 'librarian', 'admin']),
  query('department').optional().isString(),
  query('search').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { role, department, search } = req.query;

    let query = {};

    if (role) {
      query.role = role;
    }

    if (department) {
      query.department = createSafeRegex(department);
    }

    if (search) {
      const safeRegex = createSafeRegex(search);
      query.$or = [
        { name: safeRegex },
        { email: safeRegex },
        { rollno: safeRegex }
      ];
    }

    const users = await User.find(query)
      .populate('borrowedBooks', 'title author isbn')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: users.length,
          totalUsers: total
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Librarian/Admin or own profile)
router.get('/:id', auth, async (req, res) => {
  try {
    // Check if user can access this profile
    if (req.user.role === 'student' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this profile'
      });
    }

    const user = await User.findById(req.params.id)
      .populate('borrowedBooks', 'title author isbn coverImage dueDate')
      .populate('borrowHistory.book', 'title author isbn')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

// @route   PUT /api/users/:id/toggle-status
// @desc    Toggle user active status
// @access  Private (Admin only)
router.put('/:id/toggle-status', auth, isAdmin, async (req, res) => {
  try {
    console.log('Toggle status request:', { userId: req.params.id, requestingUser: req.user.email }); // Debug log
    
    const user = await User.findById(req.params.id);

    if (!user) {
      console.log('User not found:', req.params.id); // Debug log
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('Found user:', { id: user._id, email: user.email, currentStatus: user.isActive, role: user.role }); // Debug log

    // Don't allow deactivating admins
    if (user.role === 'admin' && user.isActive) {
      console.log('Cannot deactivate admin user'); // Debug log
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate admin users'
      });
    }

    const oldStatus = user.isActive;
    user.isActive = !user.isActive;
    
    // Save without running validation to avoid issues with incomplete student records
    await user.save({ validateBeforeSave: false });

    console.log('User status toggled:', { id: user._id, oldStatus, newStatus: user.isActive }); // Debug log

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Server error while updating user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role
// @access  Private (Admin only)
router.put('/:id/role', auth, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['student', 'librarian', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow changing own role
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user role'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow deleting own account
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Don't allow deleting admin users (for safety)
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Check if user has active borrows
    const Borrow = (await import('../models/Borrow.js')).default;
    const activeBorrows = await Borrow.countDocuments({
      user: req.params.id,
      status: { $in: ['borrowed', 'overdue'] }
    });

    if (activeBorrows > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with active book borrows. Please return all books first.'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user details
// @access  Private (Admin only)
router.put('/:id', auth, isAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('role').optional().isIn(['student', 'librarian', 'admin']).withMessage('Invalid role'),
  body('rollno').optional().trim(),
  body('department').optional().trim(),
  body('year').optional().trim(),
  body('college').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, email, role, rollno, department, year, college } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow changing own account through this endpoint
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit your own account through this method'
      });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
    }

    // Check if rollno is already taken by another user
    if (rollno && rollno !== user.rollno) {
      const existingRollno = await User.findOne({ rollno, _id: { $ne: req.params.id } });
      if (existingRollno) {
        return res.status(400).json({
          success: false,
          message: 'Roll number is already taken'
        });
      }
    }

    // Update user fields
    user.name = name;
    user.email = email;
    if (role) user.role = role;
    if (rollno !== undefined) user.rollno = rollno;
    if (department !== undefined) user.department = department;
    if (year !== undefined) user.year = year;
    if (college !== undefined) user.college = college;

    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollno: user.rollno
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
});

// @route   GET /api/users/sample-template
// @desc    Download sample Excel template for bulk user upload
// @access  Private (Admin only)
router.get('/sample-template', auth, isAdmin, (req, res) => {
  try {
    // Create a new workbook with two sheets - one for students and one for librarians
    const workbook = XLSX.utils.book_new();

    // Student template data
    const studentHeaders = [
      'Name*', 'Email*', 'Password*', 'Role*', 'RollNo*', 'Department*', 'Year*', 'College*',
      'Phone', 'Address'
    ];

    const studentSampleData = [
      [
        'John Doe', 'john@example.com', 'password123', 'student', 'CS2024001',
        'Computer Science', '2024', 'Sample College', '+91-9876543210', '123 Main St, City'
      ],
      [
        'Jane Smith', 'jane@example.com', 'password456', 'student', 'CS2024002',
        'Computer Science', '2024', 'Sample College', '+91-9876543211', '456 Oak St, City'
      ]
    ];

    const studentWorksheet = XLSX.utils.aoa_to_sheet([studentHeaders, ...studentSampleData]);

    // Librarian template data
    const librarianHeaders = [
      'Name*', 'Email*', 'Password*', 'Role*', 'Phone', 'Address'
    ];

    const librarianSampleData = [
      [
        'Alice Johnson', 'alice@library.com', 'libpass123', 'librarian',
        '+91-9876543212', 'Library Building, Campus'
      ],
      [
        'Bob Wilson', 'bob@library.com', 'libpass456', 'librarian',
        '+91-9876543213', 'Central Library, Campus'
      ]
    ];

    const librarianWorksheet = XLSX.utils.aoa_to_sheet([librarianHeaders, ...librarianSampleData]);

    // Set column widths
    const wscols = [
      { wch: 15 }, // Name
      { wch: 25 }, // Email
      { wch: 15 }, // Password
      { wch: 10 }, // Role
      { wch: 12 }, // RollNo
      { wch: 15 }, // Department
      { wch: 10 }, // Year
      { wch: 20 }, // College
      { wch: 15 }, // Phone
      { wch: 30 }, // Address
    ];

    studentWorksheet['!cols'] = wscols;
    librarianWorksheet['!cols'] = wscols.slice(0, 6); // Only use first 6 columns for librarians

    // Add the worksheets to the workbook
    XLSX.utils.book_append_sheet(workbook, studentWorksheet, 'Students Template');
    XLSX.utils.book_append_sheet(workbook, librarianWorksheet, 'Librarians Template');

    // Create a buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk_users_template.xlsx"');
    
    res.send(buffer);

  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating template'
    });
  }
});

// @route   POST /api/users/bulk
// @desc    Bulk upload users from Excel file
// @access  Private (Admin only)
router.post('/bulk', auth, isAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file'
      });
    }

    // Read the Excel file
    const workbook = XLSX.read(req.file.buffer);
    
    // Process each sheet
    const results = {
      success: [],
      errors: []
    };

    // Helper function to validate required fields based on role
    const validateUser = (user, rowNum, sheetName) => {
      const errors = [];
      
      // Common required fields
      if (!user.name) errors.push('Name is required');
      if (!user.email) errors.push('Email is required');
      if (!user.password) errors.push('Password is required');
      if (!user.role || !['student', 'librarian'].includes(user.role.toLowerCase())) {
        errors.push('Valid role (student/librarian) is required');
      }

      // Student-specific validations
      if (user.role && user.role.toLowerCase() === 'student') {
        if (!user.rollno) errors.push('Roll number is required for students');
        if (!user.department) errors.push('Department is required for students');
        if (!user.year) errors.push('Year is required for students');
        if (!user.college) errors.push('College is required for students');

        // Validate year values
        const validYears = ['2024', '2025', '2026', '2027', '2028', '1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'];
        if (user.year && !validYears.includes(user.year)) {
          errors.push(`Invalid year value. Must be one of: ${validYears.join(', ')}`);
        }
      }

      if (errors.length > 0) {
        return {
          rowNum,
          sheetName,
          errors
        };
      }
      return null;
    };

    // Process each worksheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      for (const [index, row] of data.entries()) {
        const rowNum = index + 2; // Add 2 to account for header row and 1-based indexing
        
        // Basic data cleanup
        const user = {
          name: row['Name*']?.trim(),
          email: row['Email*']?.toString().toLowerCase().trim(),
          password: row['Password*']?.toString(),
          role: row['Role*']?.toString().toLowerCase().trim(),
          rollno: row['RollNo*']?.toString().trim(),
          department: row['Department*']?.trim(),
          year: row['Year*']?.toString().trim(),
          college: row['College*']?.trim(),
          phone: row['Phone']?.toString().trim() || undefined,
          address: row['Address']?.toString().trim() || undefined
        };

        // Validate user data
        const validationError = validateUser(user, rowNum, sheetName);
        if (validationError) {
          results.errors.push(validationError);
          continue;
        }

        try {
          // Check for duplicate email
          const existingEmail = await User.findOne({ email: user.email });
          if (existingEmail) {
            results.errors.push({
              rowNum,
              sheetName,
              errors: [`Email ${user.email} is already registered`]
            });
            continue;
          }

          // Check for duplicate rollno for students
          if (user.role === 'student' && user.rollno) {
            const existingRollno = await User.findOne({ rollno: user.rollno });
            if (existingRollno) {
              results.errors.push({
                rowNum,
                sheetName,
                errors: [`Roll number ${user.rollno} is already taken`]
              });
              continue;
            }
          }

          // Create user
          const newUser = await User.create(user);
          results.success.push({
            rowNum,
            sheetName,
            user: {
              id: newUser._id,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role
            }
          });

        } catch (error) {
          results.errors.push({
            rowNum,
            sheetName,
            errors: [error.message]
          });
        }
      }
    }

    // Return results
    res.json({
      success: true,
      message: 'Bulk upload completed',
      data: {
        totalProcessed: results.success.length + results.errors.length,
        successCount: results.success.length,
        errorCount: results.errors.length,
        successRecords: results.success,
        errorRecords: results.errors
      }
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk upload',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
