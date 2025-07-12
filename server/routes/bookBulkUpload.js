import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { auth, isLibrarianOrAdmin } from '../middleware/auth.js';
import Book from '../models/Book.js';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// @route   POST /api/books/bulk
// @desc    Bulk upload books from Excel file
// @access  Librarian/Admin
router.post('/', auth, isLibrarianOrAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file'
      });
    }

    // Read the Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const books = xlsx.utils.sheet_to_json(sheet);

    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid book data found in the Excel file'
      });
    }

    const validationErrors = [];
    const processedBooks = books.map((book, index) => {
      // Validate required fields
      if (!book.title || !book.author || !book.isbn) {
        validationErrors.push(`Row ${index + 1}: Missing required fields (title, author, or ISBN)`);
        return null;
      }

      // Process and sanitize the book data
      return {
        title: book.title.trim(),
        author: book.author.trim(),
        isbn: book.isbn.trim(),
        category: book.category?.trim() || 'Uncategorized',
        publishedYear: book.publishedYear || new Date().getFullYear(),
        description: book.description?.trim() || '',
        quantity: parseInt(book.quantity) || 1,
        location: book.location?.trim() || '',
        tags: book.tags?.split(',').map(tag => tag.trim()) || [],
        addedBy: req.user.id,
        isActive: true
      };
    }).filter(book => book !== null);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors in book data',
        errors: validationErrors
      });
    }

    // Insert all valid books
    const insertedBooks = await Book.insertMany(processedBooks);

    res.json({
      success: true,
      message: `Successfully uploaded ${insertedBooks.length} books`,
      data: insertedBooks
    });

  } catch (error) {
    console.error('Bulk book upload error:', error);
    res.status(500).json({
      success: false,
      message: error.code === 11000 ? 'Duplicate ISBN found in upload data' : 'Server error during bulk upload'
    });
  }
});

export default router;
