import express from 'express';
import Book from '../models/Book.js';
import User from '../models/User.js';
import Borrow from '../models/Borrow.js';
import { auth, isLibrarianOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Librarian/Admin only)
router.get('/stats', auth, isLibrarianOrAdmin, async (req, res) => {
  try {
    // Basic counts
    const [
      totalBooks,
      availableBooks,
      totalUsers,
      activeUsers,
      totalBorrows,
      activeBorrows,
      overdueBorrows,
      totalFines
    ] = await Promise.all([
      Book.countDocuments({ isActive: true }),
      Book.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$availableCopies' } } }
      ]),
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Borrow.countDocuments(),
      Borrow.countDocuments({ status: { $in: ['borrowed', 'overdue'] } }),
      Borrow.countDocuments({ status: 'overdue' }),
      Borrow.aggregate([
        { $group: { _id: null, total: { $sum: '$fine.amount' } } }
      ])
    ]);

    // Popular books (most borrowed)
    const popularBooks = await Borrow.aggregate([
      { $group: { _id: '$book', borrowCount: { $sum: 1 } } },
      { $sort: { borrowCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'book'
        }
      },
      { $unwind: '$book' },
      {
        $project: {
          title: '$book.title',
          author: '$book.author',
          borrowCount: 1,
          coverImage: '$book.coverImage'
        }
      }
    ]);

    // Recent activities
    const recentBorrows = await Borrow.find()
      .populate('user', 'name rollno')
      .populate('book', 'title author')
      .sort({ borrowDate: -1 })
      .limit(10);

    // Monthly statistics
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    const [thisMonthBorrows, lastMonthBorrows, thisMonthReturns] = await Promise.all([
      Borrow.countDocuments({
        borrowDate: { $gte: startOfMonth }
      }),
      Borrow.countDocuments({
        borrowDate: { $gte: startOfLastMonth, $lt: startOfMonth }
      }),
      Borrow.countDocuments({
        returnDate: { $gte: startOfMonth }
      })
    ]);

    // Category distribution
    const categoryStats = await Book.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalBooks,
          availableBooks: availableBooks[0]?.total || 0,
          totalUsers,
          activeUsers,
          totalBorrows,
          activeBorrows,
          overdueBorrows,
          totalFines: totalFines[0]?.total || 0
        },
        monthlyStats: {
          thisMonthBorrows,
          lastMonthBorrows,
          thisMonthReturns,
          borrowGrowth: lastMonthBorrows ? 
            ((thisMonthBorrows - lastMonthBorrows) / lastMonthBorrows * 100).toFixed(1) : 0
        },
        popularBooks,
        recentActivity: recentBorrows,
        categoryDistribution: categoryStats
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
});

// @route   GET /api/dashboard/user-stats
// @desc    Get user dashboard statistics
// @access  Private
router.get('/user-stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // User's current borrows
    const activeBorrows = await Borrow.find({
      user: userId,
      status: { $in: ['borrowed', 'overdue'] }
    })
    .populate('book', 'title author isbn coverImage dueDate')
    .sort({ borrowDate: -1 });

    // User's borrow history
    const borrowHistory = await Borrow.find({
      user: userId,
      status: 'returned'
    })
    .populate('book', 'title author isbn coverImage')
    .sort({ returnDate: -1 })
    .limit(10);

    // User's reading statistics
    const [totalBorrowed, currentlyBorrowed, overdueBorrowed] = await Promise.all([
      Borrow.countDocuments({ user: userId }),
      Borrow.countDocuments({ 
        user: userId, 
        status: { $in: ['borrowed', 'overdue'] } 
      }),
      Borrow.countDocuments({ 
        user: userId, 
        status: 'overdue' 
      })
    ]);

    // User's fine information
    const userFines = await Borrow.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalFines: { $sum: '$fine.amount' },
          unpaidFines: {
            $sum: {
              $cond: [
                { $eq: ['$fine.isPaid', false] },
                '$fine.amount',
                0
              ]
            }
          }
        }
      }
    ]);

    // Favorite categories
    const favoriteCategories = await Borrow.aggregate([
      { $match: { user: userId } },
      {
        $lookup: {
          from: 'books',
          localField: 'book',
          foreignField: '_id',
          as: 'bookDetails'
        }
      },
      { $unwind: '$bookDetails' },
      {
        $group: {
          _id: '$bookDetails.category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalBorrowed,
          currentlyBorrowed,
          overdueBorrowed,
          totalFines: userFines[0]?.totalFines || 0,
          unpaidFines: userFines[0]?.unpaidFines || 0
        },
        activeBorrows,
        recentHistory: borrowHistory,
        favoriteCategories
      }
    });

  } catch (error) {
    console.error('User dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user statistics'
    });
  }
});

// @route   GET /api/dashboard/student/stats
// @desc    Get student-specific dashboard statistics
// @access  Private (Student only)
router.get('/student/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get student's borrowing statistics
    const [
      totalBorrowed,
      currentBorrows,
      overdue,
      dueToday
    ] = await Promise.all([
      Borrow.countDocuments({ user: userId }),
      Borrow.countDocuments({ 
        user: userId, 
        status: { $in: ['borrowed', 'overdue'] } 
      }),
      Borrow.countDocuments({ 
        user: userId, 
        status: 'overdue' 
      }),
      Borrow.countDocuments({
        user: userId,
        status: 'borrowed',
        dueDate: {
          $gte: today,
          $lt: tomorrow
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalBorrowed: currentBorrows,
        overdue,
        dueToday
      }
    });

  } catch (error) {
    console.error('Student dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student statistics'
    });
  }
});

export default router;
