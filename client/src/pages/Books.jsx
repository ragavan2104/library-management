import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import BooksGridSkeleton from '../components/ui/BooksGridSkeleton';
import toast from 'react-hot-toast';
import { 
  BookOpenIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Memoized BookCard component for better performance
const BookCard = React.memo(({ book }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
    {/* Book Cover with lazy loading */}
    <div className="h-48 bg-gray-100 flex items-center justify-center">
      {book.coverImage ? (
        <img
          src={book.coverImage}
          alt={book.title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <BookOpenIcon 
        className="h-16 w-16 text-gray-400" 
        style={{ display: book.coverImage ? 'none' : 'block' }}
      />
    </div>

    {/* Book Details */}
    <div className="p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
        {book.title}
      </h3>
      <p className="text-gray-600 mb-2">by {book.author}</p>
      <p className="text-sm text-gray-500 mb-2">{book.genre || book.category}</p>
      <p className="text-sm text-gray-500 mb-3">ISBN: {book.isbn}</p>
      
      {/* Availability Status */}
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2 py-1 text-xs rounded-full ${
          (book.availableCopies || book.quantity) > 0 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {(book.availableCopies || book.quantity) > 0 
            ? `${book.availableCopies || book.quantity} Available` 
            : 'Not Available'
          }
        </span>
        <span className="text-xs text-gray-500">
          Total: {book.totalCopies || book.quantity}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Link
          to={`/books/${book._id}`}
          className="w-full bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <EyeIcon className="h-4 w-4 mr-1" />
          View Details
        </Link>
      </div>
    </div>
  </div>
));

BookCard.displayName = 'BookCard';

const Books = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [availableGenres, setAvailableGenres] = useState([]);
  const [availableAuthors, setAvailableAuthors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const booksPerPage = 12;

  const fetchBooks = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to view books');
        setLoading(false);
        return;
      }

      // Build query parameters for pagination and filtering
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: booksPerPage.toString(),
        ...(selectedGenre && { category: selectedGenre }),
        ...(selectedAuthor && { author: selectedAuthor }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`${API_URL}/api/books?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please login again.');
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        const { books: booksData, pagination, categories } = data.data;
        
        if (Array.isArray(booksData)) {
          setBooks(booksData);
          setTotalPages(pagination?.total || 1);
          setTotalBooks(pagination?.totalBooks || booksData.length);
          
          // Set categories for filtering (only on first load)
          if (currentPage === 1 && categories) {
            setAvailableGenres(categories);
          }
          
          // Extract unique authors for filtering
          const authors = [...new Set(booksData.map(book => book.author).filter(Boolean))];
          setAvailableAuthors(authors);
        } else {
          setBooks([]);
        }
      } else {
        console.error('Invalid data structure:', data);
        setBooks([]);
        toast.error('Failed to load books data');
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      setBooks([]);
      toast.error('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedGenre, selectedAuthor, searchTerm]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== '') {
        setCurrentPage(1); // Reset to first page on search
        fetchBooks();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, fetchBooks]);

  // Remove client-side filtering since we're using server-side pagination
  const filteredBooks = useMemo(() => Array.isArray(books) ? books : [], [books]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    setLoading(true);
  }, []);

  const handleGenreChange = useCallback((genre) => {
    setSelectedGenre(genre);
    setCurrentPage(1); // Reset to first page
    setLoading(true);
  }, []);

  const handleAuthorChange = useCallback((author) => {
    setSelectedAuthor(author);
    setCurrentPage(1); // Reset to first page
    setLoading(true);
  }, []);

  if (loading && currentPage === 1) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        
        {/* Filters Skeleton */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        
        {/* Books Grid Skeleton */}
        <BooksGridSkeleton count={12} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <BookOpenIcon className="h-8 w-8 mr-2 text-blue-600" />
          Library Books
        </h1>
        <div className="text-sm text-gray-500">
          Page {currentPage} of {totalPages} ({totalBooks} total books)
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Genre Filter */}
          <div className="relative">
            <FunnelIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <select
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={selectedGenre}
              onChange={(e) => handleGenreChange(e.target.value)}
            >
              <option value="">All Genres</option>
              {availableGenres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          {/* Author Filter */}
          <div>
            <select
              className="px-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={selectedAuthor}
              onChange={(e) => handleAuthorChange(e.target.value)}
            >
              <option value="">All Authors</option>
              {availableAuthors.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      {loading && currentPage > 1 ? (
        <BooksGridSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => (
            <BookCard key={book._id} book={book} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {/* Page numbers */}
          {useMemo(() => 
            Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentPage === pageNumber
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            }), [totalPages, currentPage, handlePageChange]
          )}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* No Results */}
      {filteredBooks.length === 0 && !loading && (
        <div className="text-center py-12">
          <BookOpenIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No books found</h3>
          <p className="text-gray-500">
            {searchTerm || selectedGenre || selectedAuthor 
              ? 'Try adjusting your search or filters.' 
              : 'There are no books in the library yet.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Books;
