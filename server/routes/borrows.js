import express from 'express';
import { body, validationResult, query } from 'express-validator';
import Borrow from '../models/Borrow.js';
import Book from '../models/Book.js';
import User from '../models/User.js';
import { auth, isLibrarianOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/borrows
// @desc    Borrow a book
// @access  Private (Librarian/Admin only)
router.post('/', auth, isLibrarianOrAdmin, [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('bookId').notEmpty().withMessage('Book ID is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
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

    const { userId, bookId, dueDate, notes } = req.body;

    // Check if book exists and is available
    const book = await Book.findById(bookId);
    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found or not available'
      });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No copies available for borrowing'
      });
    }

    // Check if user exists and is active
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found or account is inactive'
      });
    }

    // Check if user already borrowed this book
    const existingBorrow = await Borrow.findOne({
      user: userId,
      book: bookId,
      status: { $in: ['borrowed', 'overdue'] }
    });

    if (existingBorrow) {
      return res.status(400).json({
        success: false,
        message: 'User has already borrowed this book'
      });
    }

    // Check borrowing limit (max 5 books)
    const activeBorrows = await Borrow.countDocuments({
      user: userId,
      status: { $in: ['borrowed', 'overdue'] }
    });

    if (activeBorrows >= 5) {
      return res.status(400).json({
        success: false,
        message: 'User has reached maximum borrowing limit (5 books)'
      });
    }

    // Check for overdue books or unpaid fines
    const overdueOrFines = await Borrow.findOne({
      user: userId,
      $or: [
        { status: 'overdue' },
        { 'fine.amount': { $gt: 0 }, 'fine.isPaid': false }
      ]
    });

    if (overdueOrFines) {
      return res.status(400).json({
        success: false,
        message: 'User has overdue books or unpaid fines. Please resolve before borrowing.'
      });
    }

    // Create borrow record
    const borrow = new Borrow({
      user: userId,
      book: bookId,
      dueDate: new Date(dueDate),
      notes,
      issuedBy: req.user._id
    });

    await borrow.save();

    // Update book availability
    book.availableCopies -= 1;
    await book.save();

    // Update user's borrowed books
    user.borrowedBooks.push(bookId);
    await user.save();

    const populatedBorrow = await Borrow.findById(borrow._id)
      .populate('user', 'name rollno email department')
      .populate('book', 'title author isbn coverImage')
      .populate('issuedBy', 'name role');

    res.status(201).json({
      success: true,
      message: 'Book borrowed successfully',
      data: populatedBorrow
    });

  } catch (error) {
    console.error('Borrow book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while borrowing book'
    });
  }
});

// @route   GET /api/borrows
// @desc    Get all borrows with filters
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['borrowed', 'returned', 'overdue', 'lost']),
  query('user').optional().isMongoId()
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
    const { status, user: userId } = req.query;

    let query = {};

    // If regular user, only show their borrows
    if (req.user.role === 'student') {
      query.user = req.user._id;
    } else if (userId) {
      query.user = userId;
    }

    if (status) {
      query.status = status;
    }

    const borrows = await Borrow.find(query)
      .populate('user', 'name rollno email department year')
      .populate('book', 'title author isbn coverImage category')
      .populate('issuedBy', 'name role')
      .populate('returnedTo', 'name role')
      .sort({ borrowDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Borrow.countDocuments(query);

    res.json({
      success: true,
      data: {
        borrows,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: borrows.length,
          totalBorrows: total
        }
      }
    });

  } catch (error) {
    console.error('Get borrows error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching borrows'
    });
  }
});

// @route   PUT /api/borrows/:id/return
// @desc    Return a book
// @access  Private (Librarian/Admin only)
router.put('/:id/return', auth, isLibrarianOrAdmin, async (req, res) => {
  try {
    const borrow = await Borrow.findById(req.params.id)
      .populate('user', 'name rollno')
      .populate('book', 'title author');

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: 'Borrow record not found'
      });
    }

    if (borrow.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Book has already been returned'
      });
    }

    // Return the book
    await borrow.returnBook(req.user._id);

    // Update book availability
    const book = await Book.findById(borrow.book._id);
    book.availableCopies += 1;
    await book.save();

    // Update user's borrowed books
    const user = await User.findById(borrow.user._id);
    user.borrowedBooks = user.borrowedBooks.filter(
      bookId => bookId.toString() !== borrow.book._id.toString()
    );
    
    // Add to borrow history
    user.borrowHistory.push({
      book: borrow.book._id,
      borrowDate: borrow.borrowDate,
      returnDate: borrow.returnDate,
      fine: borrow.fine.amount
    });

    // Update total fines
    if (borrow.fine.amount > 0) {
      user.totalFines += borrow.fine.amount;
    }

    await user.save();

    const updatedBorrow = await Borrow.findById(borrow._id)
      .populate('user', 'name rollno email')
      .populate('book', 'title author isbn coverImage')
      .populate('returnedTo', 'name role');

    res.json({
      success: true,
      message: 'Book returned successfully',
      data: updatedBorrow
    });

  } catch (error) {
    console.error('Return book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while returning book'
    });
  }
});

// @route   PUT /api/borrows/:id/renew
// @desc    Renew a book
// @access  Private
router.put('/:id/renew', auth, async (req, res) => {
  try {
    const borrow = await Borrow.findById(req.params.id)
      .populate('user', 'name rollno')
      .populate('book', 'title author');

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: 'Borrow record not found'
      });
    }

    // Check if user can renew (either the borrower or librarian/admin)
    if (req.user.role === 'student' && borrow.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to renew this book'
      });
    }

    if (borrow.status !== 'borrowed') {
      return res.status(400).json({
        success: false,
        message: 'Can only renew currently borrowed books'
      });
    }

    // Renew the book
    await borrow.renewBook(req.user._id);

    const updatedBorrow = await Borrow.findById(borrow._id)
      .populate('user', 'name rollno email')
      .populate('book', 'title author isbn coverImage');

    res.json({
      success: true,
      message: 'Book renewed successfully',
      data: updatedBorrow
    });

  } catch (error) {
    console.error('Renew book error:', error);
    
    if (error.message.includes('Maximum renewal limit') || error.message.includes('Cannot renew overdue')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while renewing book'
    });
  }
});

// @route   GET /api/borrows/overdue
// @desc    Get overdue books
// @access  Private (Librarian/Admin only)
router.get('/overdue', auth, isLibrarianOrAdmin, async (req, res) => {
  try {
    const overdueBorrows = await Borrow.find({
      status: { $in: ['borrowed', 'overdue'] },
      dueDate: { $lt: new Date() }
    })
    .populate('user', 'name rollno email phone department')
    .populate('book', 'title author isbn')
    .sort({ dueDate: 1 });

    // Update status to overdue and calculate fines
    for (let borrow of overdueBorrows) {
      if (borrow.status === 'borrowed') {
        borrow.status = 'overdue';
        borrow.fine.amount = borrow.calculateFine();
        await borrow.save();
      }
    }

    res.json({
      success: true,
      data: overdueBorrows
    });

  } catch (error) {
    console.error('Get overdue books error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching overdue books'
    });
  }
});

// @route   PUT /api/borrows/:id/pay-fine
// @desc    Pay fine for a borrow
// @access  Private (Librarian/Admin only)
router.put('/:id/pay-fine', auth, isLibrarianOrAdmin, [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number')
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

    const { amount } = req.body;
    const borrow = await Borrow.findById(req.params.id);

    if (!borrow) {
      return res.status(404).json({
        success: false,
        message: 'Borrow record not found'
      });
    }

    if (borrow.fine.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'Fine has already been paid'
      });
    }

    if (amount > borrow.fine.amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount cannot exceed fine amount'
      });
    }

    // Update fine payment
    borrow.fine.paidAmount += amount;
    borrow.fine.paidDate = new Date();
    
    if (borrow.fine.paidAmount >= borrow.fine.amount) {
      borrow.fine.isPaid = true;
    }

    await borrow.save();

    res.json({
      success: true,
      message: 'Fine payment recorded successfully',
      data: borrow
    });

  } catch (error) {
    console.error('Pay fine error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing fine payment'
    });
  }
});

// @route   GET /api/borrows/my-books
// @desc    Get current user's borrowed books
// @access  Private
router.get('/my-books', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's current borrowed books
    const borrows = await Borrow.find({
      user: userId,
      status: { $in: ['borrowed', 'overdue'] }
    })
    .populate('book', 'title author isbn category')
    .populate('user', 'name rollno email')
    .sort({ borrowDate: -1 });

    res.json({
      success: true,
      data: borrows
    });

  } catch (error) {
    console.error('Get my books error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching borrowed books'
    });
  }
});

// @route   PUT /api/borrows/calculate-fines
// @desc    Calculate fines for all overdue books
// @access  Private (Librarian/Admin only)
router.put('/calculate-fines', auth, isLibrarianOrAdmin, async (req, res) => {
  try {
    // Find all overdue borrows that haven't been returned
    const overdueBorrows = await Borrow.find({
      status: { $in: ['borrowed', 'overdue'] },
      dueDate: { $lt: new Date() }
    });

    let updatedCount = 0;
    let totalFinesCalculated = 0;

    for (let borrow of overdueBorrows) {
      const oldFineAmount = borrow.fine.amount;
      
      // Update status to overdue if not already
      if (borrow.status === 'borrowed') {
        borrow.status = 'overdue';
      }
      
      // Calculate new fine amount
      borrow.fine.amount = borrow.calculateFine();
      
      if (borrow.fine.amount !== oldFineAmount) {
        await borrow.save();
        updatedCount++;
        totalFinesCalculated += borrow.fine.amount;
      }
    }

    res.json({
      success: true,
      message: `Fines calculated for ${updatedCount} overdue books`,
      data: {
        updatedBorrows: updatedCount,
        totalFinesCalculated,
        totalOverdueBooks: overdueBorrows.length
      }
    });

  } catch (error) {
    console.error('Calculate fines error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while calculating fines'
    });
  }
});

export default router;
