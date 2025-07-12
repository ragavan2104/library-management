import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '../context/FirebaseOnlyAuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { 
  BookOpenIcon, 
  ArrowLeftIcon,
  CalendarIcon,
  TagIcon,
  UserIcon,
  HashtagIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);

  useEffect(() => {
    fetchBookDetails();
  }, [id]);

  const fetchBookDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/books/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBook(data.data);
      } else {
        toast.error('Book not found');
        navigate('/books');
      }
    } catch (error) {
      console.error('Error fetching book details:', error);
      toast.error('Failed to fetch book details');
      navigate('/books');
    } finally {
      setLoading(false);
    }
  };

  const borrowBook = async () => {
    setBorrowing(true);
    try {
      const response = await fetch(`${API_URL}/api/borrows/borrow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ bookId: book._id })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Book borrowed successfully!');
        fetchBookDetails(); // Refresh book details
      } else {
        toast.error(data.message || 'Failed to borrow book');
      }
    } catch (error) {
      console.error('Error borrowing book:', error);
      toast.error('Failed to borrow book');
    } finally {
      setBorrowing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!book) {
    return (
      <div className="text-center py-12">
        <BookOpenIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Book not found</h3>
        <button
          onClick={() => navigate('/books')}
          className="text-blue-600 hover:text-blue-800"
        >
          Back to Books
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/books')}
          className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Book Details</h1>
      </div>

      {/* Book Details Card */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="md:flex">
          {/* Book Cover */}
          <div className="md:w-1/3 bg-gray-100 flex items-center justify-center p-8">
            {book.coverImage ? (
              <img
                src={book.coverImage}
                alt={book.title}
                className="max-h-96 w-full object-contain rounded-lg shadow-md"
              />
            ) : (
              <div className="w-full max-w-xs h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                <BookOpenIcon className="h-24 w-24 text-gray-400" />
              </div>
            )}
          </div>

          {/* Book Information */}
          <div className="md:w-2/3 p-8">
            <div className="space-y-6">
              {/* Title and Author */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h2>
                <div className="flex items-center text-gray-600 mb-4">
                  <UserIcon className="h-5 w-5 mr-2" />
                  <span className="text-lg">by {book.author}</span>
                </div>
              </div>

              {/* Book Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center text-gray-600">
                  <HashtagIcon className="h-5 w-5 mr-2 text-gray-400" />
                  <span className="font-medium mr-2">ISBN:</span>
                  <span>{book.isbn}</span>
                </div>
                
                <div className="flex items-center text-gray-600">
                  <TagIcon className="h-5 w-5 mr-2 text-gray-400" />
                  <span className="font-medium mr-2">Category:</span>
                  <span>{book.genre || book.category}</span>
                </div>

                <div className="flex items-center text-gray-600">
                  <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                  <span className="font-medium mr-2">Published:</span>
                  <span>{
                    book.publishedYear || 
                    (book.publishedDate ? new Date(book.publishedDate).getFullYear() : 'N/A')
                  }</span>
                </div>

                <div className="flex items-center text-gray-600">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-400" />
                  <span className="font-medium mr-2">Pages:</span>
                  <span>{book.pages || 'N/A'}</span>
                </div>
              </div>

              {/* Availability */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Availability</h3>
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      (book.availableCopies || book.quantity) > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {(book.availableCopies || book.quantity) > 0 
                        ? `${book.availableCopies || book.quantity} Available` 
                        : 'Not Available'
                      }
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      Total copies: {book.totalCopies || book.quantity}
                    </p>
                  </div>
                  
                  {user.role === 'student' && (book.availableCopies || book.quantity) > 0 && (
                    <button
                      onClick={borrowBook}
                      disabled={borrowing}
                      className="bg-green-600 text-white px-6 py-2 rounded-md font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {borrowing ? 'Borrowing...' : 'Borrow Book'}
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              {book.description && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{book.description}</p>
                </div>
              )}

              {/* Additional Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Location:</span> {
                    typeof book.location === 'object' && book.location 
                      ? `${book.location.shelf || ''} ${book.location.section || ''} ${book.location.floor || ''}`.trim() || 'General Collection'
                      : book.location || book.shelf || 'General Collection'
                  }</p>
                  <p><span className="font-medium">Added to Library:</span> {
                    book.createdAt ? new Date(book.createdAt).toLocaleDateString() : 'N/A'
                  }</p>
                  {book.language && (
                    <p><span className="font-medium">Language:</span> {book.language}</p>
                  )}
                  {book.publisher && (
                    <p><span className="font-medium">Publisher:</span> {book.publisher}</p>
                  )}
                  {book.edition && (
                    <p><span className="font-medium">Edition:</span> {book.edition}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;
