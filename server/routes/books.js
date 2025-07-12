import express from 'express';
import { body, validationResult, query } from 'express-validator';
import Book from '../models/Book.js';
import Borrow from '../models/Borrow.js';
import { auth, isLibrarianOrAdmin } from '../middleware/auth.js';
import { createSafeRegex, createSafeRegExp } from '../utils/regex.js';
import multer from 'multer';
import xlsx from 'xlsx';

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are allowed'));
    }
  }
});

// @route   GET /api/books/sample-template
// @desc    Get sample Excel template for bulk upload
// @access  Librarian/Admin
router.get('/sample-template', auth, isLibrarianOrAdmin, async (req, res) => {
  try {
    const workbook = xlsx.utils.book_new();
    
    // Sample data
    const sampleData = [
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '9780743273565',
        category: 'Fiction',
        publishedYear: '2004',
        description: 'The story of the mysteriously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.',
        quantity: '5',
        shelf: 'A1',
        section: 'Fiction',
        publisher: 'Scribner',
        language: 'English',
        edition: 'First Edition',
        tags: 'classic,literature,american',
        pages: '180',
        condition: 'New'
      },
      {
        title: 'Introduction to Algorithms',
        author: 'Thomas H. Cormen',
        isbn: '9780262033848',
        category: 'Computer Science',
        publishedYear: '2009',
        description: 'A comprehensive update of the leading algorithms text.',
        quantity: '3',
        shelf: 'B2',
        section: 'Technical',
        publisher: 'MIT Press',
        language: 'English',
        edition: 'Third Edition',
        tags: 'computer science,algorithms,programming',
        pages: '1312',
        condition: 'Good'
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleData);

    // Add column widths
    const colWidths = [
      { wch: 40 }, // title
      { wch: 25 }, // author
      { wch: 15 }, // isbn
      { wch: 15 }, // category
      { wch: 12 }, // publishedYear
      { wch: 60 }, // description
      { wch: 10 }, // quantity
      { wch: 10 }, // shelf
      { wch: 15 }, // section
      { wch: 25 }, // publisher
      { wch: 15 }, // language
      { wch: 15 }, // edition
      { wch: 40 }, // tags
      { wch: 10 }, // pages
      { wch: 10 }  // condition
    ];
    worksheet['!cols'] = colWidths;

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Books');

    // Generate buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=book_upload_template.xlsx');
    
    res.send(buffer);
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating template'
    });
  }
});

// @route   GET /api/books
// @desc    Get all books with search and filter
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('sortBy').optional().isIn(['title', 'author', 'publishedYear', 'rating', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
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
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const { category, search, author, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build query
    let query = { isActive: true };

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Author filter
    if (author) {
      query.author = createSafeRegex(author);
    }

    // Search functionality
    if (search) {
      const safeRegex = createSafeRegex(search);
      query.$or = [
        { title: safeRegex },
        { author: safeRegex },
        { description: safeRegex },
        { isbn: safeRegex },
        { tags: { $in: [createSafeRegExp(search)] } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const books = await Book.find(query)
      .populate('addedBy', 'name role')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Book.countDocuments(query);

    // Get categories for filter
    const categories = await Book.distinct('category', { isActive: true });

    res.json({
      success: true,
      data: {
        books,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: books.length,
          totalBooks: total
        },
        categories
      }
    });

  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching books'
    });
  }
});

// @route   GET /api/books/:id
// @desc    Get single book by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('addedBy', 'name role')
      .populate('reviews.user', 'name rollno')
      .lean();

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (!book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book is not available'
      });
    }

    res.json({
      success: true,
      data: book
    });

  } catch (error) {
    console.error('Get book error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while fetching book'
    });
  }
});

// @route   POST /api/books
// @desc    Add new book
// @access  Private (Librarian/Admin only)
router.post('/', auth, isLibrarianOrAdmin, [
  body('title').notEmpty().withMessage('Title is required'),
  body('author').notEmpty().withMessage('Author is required'),
  body('isbn').notEmpty().withMessage('ISBN is required')
    .matches(/^(?:\d{9}[\dX]|\d{13})$/).withMessage('Invalid ISBN format'),
  body('category').notEmpty().withMessage('Category is required'),
  body('totalCopies').isInt({ min: 1 }).withMessage('Total copies must be at least 1'),
  body('location.shelf').notEmpty().withMessage('Shelf location is required'),
  body('location.section').notEmpty().withMessage('Section is required')
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

    // Check if ISBN already exists
    const existingBook = await Book.findOne({ isbn: req.body.isbn });
    if (existingBook) {
      return res.status(400).json({
        success: false,
        message: 'Book with this ISBN already exists'
      });
    }

    const bookData = {
      ...req.body,
      availableCopies: req.body.totalCopies,
      addedBy: req.user._id
    };

    const book = new Book(bookData);
    await book.save();

    const populatedBook = await Book.findById(book._id)
      .populate('addedBy', 'name role');

    res.status(201).json({
      success: true,
      message: 'Book added successfully',
      data: populatedBook
    });

  } catch (error) {
    console.error('Add book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding book'
    });
  }
});

// @route   PUT /api/books/:id
// @desc    Update book
// @access  Private (Librarian/Admin only)
router.put('/:id', auth, isLibrarianOrAdmin, [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('author').optional().notEmpty().withMessage('Author cannot be empty'),
  body('isbn').optional().matches(/^(?:\d{9}[\dX]|\d{13})$/).withMessage('Invalid ISBN format'),
  body('totalCopies').optional().isInt({ min: 1 }).withMessage('Total copies must be at least 1')
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

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // If ISBN is being updated, check for duplicates
    if (req.body.isbn && req.body.isbn !== book.isbn) {
      const existingBook = await Book.findOne({ isbn: req.body.isbn });
      if (existingBook) {
        return res.status(400).json({
          success: false,
          message: 'Book with this ISBN already exists'
        });
      }
    }

    // If total copies is being updated, adjust available copies
    if (req.body.totalCopies) {
      const borrowedCopies = book.totalCopies - book.availableCopies;
      req.body.availableCopies = req.body.totalCopies - borrowedCopies;
      
      if (req.body.availableCopies < 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot reduce total copies below currently borrowed amount'
        });
      }
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('addedBy', 'name role');

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: updatedBook
    });

  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating book'
    });
  }
});

// @route   DELETE /api/books/:id
// @desc    Delete book (soft delete)
// @access  Private (Admin only)
router.delete('/:id', auth, isLibrarianOrAdmin, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if book is currently borrowed
    const activeBorrows = await Borrow.countDocuments({
      book: req.params.id,
      status: { $in: ['borrowed', 'overdue'] }
    });

    if (activeBorrows > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete book that is currently borrowed'
      });
    }

    // Soft delete
    book.isActive = false;
    await book.save();

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });

  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting book'
    });
  }
});

// @route   POST /api/books/:id/review
// @desc    Add book review
// @access  Private
router.post('/:id/review', auth, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
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

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if user already reviewed this book
    const existingReview = book.reviews.find(
      review => review.user.toString() === req.user._id.toString()
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this book'
      });
    }

    // Add review
    book.reviews.push({
      user: req.user._id,
      rating: req.body.rating,
      comment: req.body.comment
    });

    // Update average rating
    const totalRating = book.reviews.reduce((sum, review) => sum + review.rating, 0);
    book.rating.average = totalRating / book.reviews.length;
    book.rating.count = book.reviews.length;

    await book.save();

    const updatedBook = await Book.findById(req.params.id)
      .populate('reviews.user', 'name rollno');

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: updatedBook
    });

  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding review'
    });
  }
});

// Handle multer errors
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// @route   POST /api/books/bulk
// @desc    Upload books in bulk via Excel file
// @access  Librarian/Admin
router.post('/bulk', auth, isLibrarianOrAdmin, upload.single('file'), handleMulterErrors, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    let workbook;
    try {
      workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Excel file format'
      });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file has no sheets'
      });
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const books = xlsx.utils.sheet_to_json(worksheet);

    if (!books || books.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No books found in the Excel file'
      });
    }

    const errors = [];
    const processedBooks = [];

    // Validate and process each book
    for (const book of books) {
      if (!book.title || !book.author || !book.isbn) {
        errors.push(`Missing required fields (title, author, or isbn) for book: ${book.title || book.isbn || 'unknown'}`);
        continue;
      }

      // Convert tags from string to array if present
      if (book.tags) {
        book.tags = book.tags.split(',').map(tag => tag.trim());
      }

      // Handle location
      if (!book.shelf || !book.section) {
        errors.push(`Missing shelf or section location for book: ${book.title}`);
        continue;
      }
      book.location = {
        shelf: book.shelf,
        section: book.section
      };

      // Handle copies
      const quantity = parseInt(book.quantity) || 1;
      book.totalCopies = quantity;
      book.availableCopies = quantity;

      // Add other required fields
      book.addedBy = req.user._id;
      book.isActive = true;
      book.rating = { average: 0, count: 0 };
      book.reviews = [];

      // Handle category
      if (!book.category) {
        book.category = 'Other';
      }

      // Convert publishedYear to number
      if (book.publishedYear) {
        book.publishedYear = parseInt(book.publishedYear);
      }

      processedBooks.push(book);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors in Excel file',
        errors
      });
    }

    // Check for duplicate ISBNs
    const isbns = processedBooks.map(book => book.isbn);
    const existingBooks = await Book.find({ isbn: { $in: isbns } }).select('isbn title');
    
    if (existingBooks.length > 0) {
      const duplicates = existingBooks.map(book => `ISBN ${book.isbn} (${book.title})`);
      return res.status(400).json({
        success: false,
        message: 'Duplicate ISBN numbers found',
        errors: [`The following books already exist: ${duplicates.join(', ')}`]
      });
    }

    // Insert all books
    try {
      await Book.insertMany(processedBooks, { ordered: false });
      res.status(201).json({
        success: true,
        message: `Successfully uploaded ${processedBooks.length} books`,
        data: { count: processedBooks.length }
      });
    } catch (insertError) {
      if (insertError.code === 11000) {
        // Handle duplicate key errors
        return res.status(400).json({
          success: false,
          message: 'Duplicate ISBN numbers found',
          errors: ['Some books could not be inserted due to duplicate ISBN numbers']
        });
      }
      throw insertError; // Re-throw other errors
    }

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading books',
      error: error.message
    });
  }
});

export default router;
