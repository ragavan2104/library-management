import mongoose from 'mongoose';

const borrowSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book is required']
  },
  borrowDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  returnDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['borrowed', 'returned', 'overdue', 'lost'],
    default: 'borrowed'
  },
  renewalCount: {
    type: Number,
    default: 0,
    max: [2, 'Maximum 2 renewals allowed']
  },
  renewalHistory: [{
    renewalDate: {
      type: Date,
      default: Date.now
    },
    newDueDate: {
      type: Date,
      required: true
    },
    renewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  fine: {
    amount: {
      type: Number,
      default: 0,
      min: [0, 'Fine cannot be negative']
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidDate: Date,
    paidAmount: {
      type: Number,
      default: 0
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Issued by librarian is required']
  },
  returnedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
borrowSchema.index({ user: 1, status: 1 });
borrowSchema.index({ book: 1, status: 1 });
borrowSchema.index({ dueDate: 1, status: 1 });
borrowSchema.index({ borrowDate: 1 });

// Virtual for days overdue
borrowSchema.virtual('daysOverdue').get(function() {
  if (this.status === 'returned' || !this.dueDate) return 0;
  
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  
  if (today > dueDate) {
    return Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for fine calculation
borrowSchema.virtual('calculatedFine').get(function() {
  const daysOverdue = this.daysOverdue;
  if (daysOverdue <= 0) return 0;
  
  // Fine: $1 per day for first 7 days, $2 per day after that
  let fine = 0;
  if (daysOverdue <= 7) {
    fine = daysOverdue * 1;
  } else {
    fine = 7 * 1 + (daysOverdue - 7) * 2;
  }
  
  return Math.min(fine, 50); // Maximum fine of $50
});

// Pre-save middleware to update status and fine
borrowSchema.pre('save', function(next) {
  // Update status based on dates
  if (this.returnDate) {
    this.status = 'returned';
  } else if (this.dueDate && new Date() > this.dueDate) {
    this.status = 'overdue';
    // Update fine amount
    this.fine.amount = this.calculatedFine;
  }
  
  next();
});

// Method to calculate fine amount
borrowSchema.methods.calculateFine = function() {
  const daysOverdue = this.daysOverdue;
  if (daysOverdue <= 0) return 0;
  
  let fine = 0;
  if (daysOverdue <= 7) {
    fine = daysOverdue * 1;
  } else {
    fine = 7 * 1 + (daysOverdue - 7) * 2;
  }
  
  return Math.min(fine, 50);
};

// Method to renew book
borrowSchema.methods.renewBook = function(renewedBy, days = 14) {
  if (this.renewalCount >= 2) {
    throw new Error('Maximum renewal limit reached');
  }
  
  if (this.status === 'overdue') {
    throw new Error('Cannot renew overdue book');
  }
  
  const newDueDate = new Date(this.dueDate);
  newDueDate.setDate(newDueDate.getDate() + days);
  
  this.renewalHistory.push({
    renewalDate: new Date(),
    newDueDate: newDueDate,
    renewedBy: renewedBy
  });
  
  this.dueDate = newDueDate;
  this.renewalCount += 1;
  
  return this.save();
};

// Method to return book
borrowSchema.methods.returnBook = function(returnedTo) {
  this.returnDate = new Date();
  this.status = 'returned';
  this.returnedTo = returnedTo;
  
  // Calculate final fine
  this.fine.amount = this.calculateFine();
  
  return this.save();
};

export default mongoose.model('Borrow', borrowSchema);
