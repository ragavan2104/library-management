import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  isbn: {
    type: String,
    required: [true, 'ISBN is required'],
    unique: true,
    trim: true,
    match: [/^(?:\d{9}[\dX]|\d{13})$/, 'Please enter a valid ISBN']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Fiction',
      'Non-Fiction',
      'Science',
      'Technology',
      'History',
      'Biography',
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biology',
      'Computer Science',
      'Engineering',
      'Literature',
      'Philosophy',
      'Psychology',
      'Economics',
      'Business',
      'Art',
      'Music',
      'Sports',
      'Health',
      'Cooking',
      'Travel',
      'Reference',
      'Other'
    ]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  publisher: {
    type: String,
    trim: true,
    maxlength: [100, 'Publisher name cannot exceed 100 characters']
  },
  publishedYear: {
    type: Number,
    min: [1800, 'Published year must be after 1800'],
    max: [new Date().getFullYear(), 'Published year cannot be in the future']
  },
  pages: {
    type: Number,
    min: [1, 'Pages must be at least 1']
  },
  language: {
    type: String,
    default: 'English',
    trim: true
  },
  edition: {
    type: String,
    trim: true
  },
  totalCopies: {
    type: Number,
    required: [true, 'Total copies is required'],
    min: [1, 'Must have at least 1 copy']
  },
  availableCopies: {
    type: Number,
    required: [true, 'Available copies is required'],
    min: [0, 'Available copies cannot be negative']
  },
  location: {
    shelf: {
      type: String,
      required: [true, 'Shelf location is required'],
      trim: true
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
      trim: true
    },
    floor: {
      type: String,
      default: 'Ground Floor'
    }
  },
  coverImage: {
    type: String,
    default: ''
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  borrowHistory: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    borrowDate: {
      type: Date,
      default: Date.now
    },
    returnDate: Date,
    fine: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});

// Index for search functionality
bookSchema.index({ 
  title: 'text', 
  author: 'text', 
  description: 'text',
  category: 'text',
  tags: 'text'
});

// Index for frequent queries
bookSchema.index({ category: 1, isActive: 1 });
bookSchema.index({ author: 1, isActive: 1 });
bookSchema.index({ isbn: 1 });

// Virtual for availability status
bookSchema.virtual('isAvailable').get(function() {
  return this.availableCopies > 0;
});

// Method to update availability
bookSchema.methods.updateAvailability = function(change) {
  this.availableCopies += change;
  return this.save();
};

// Pre-save middleware to validate available copies
bookSchema.pre('save', function(next) {
  if (this.availableCopies > this.totalCopies) {
    return next(new Error('Available copies cannot exceed total copies'));
  }
  next();
});

export default mongoose.model('Book', bookSchema);
