import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BookOpenIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../ui/LoadingSpinner';
import BookModal from '../ui/BookModal';
import BulkUploadModal from '../ui/BulkUploadModal';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const LibrarianDashboard = () => {
  const [books, setBooks] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [overdueBorrows, setOverdueBorrows] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('checkout'); // 'checkout', 'checkin', 'manage', 'fines'
  const [selectedBook, setSelectedBook] = useState(null);
  const [rollno, setRollno] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookModalLoading, setBookModalLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const [booksResponse, borrowsResponse, overdueResponse, statsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/books`, config),
        axios.get(`${API_URL}/api/borrows`, config),
        axios.get(`${API_URL}/api/borrows/overdue`, config),
        axios.get(`${API_URL}/api/dashboard/stats`, config)
      ]);
      
      setBooks(booksResponse.data.data.books);
      setBorrows(borrowsResponse.data.data.borrows);
      setOverdueBorrows(overdueResponse.data.data);
      setStats(statsResponse.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSubmit = async (bookData) => {
    setBookModalLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (editingBook) {
        // Update existing book
        await axios.put(`${API_URL}/api/books/${editingBook._id}`, bookData, config);
        toast.success('Book updated successfully');
      } else {
        // Add new book
        await axios.post(`${API_URL}/api/books`, bookData, config);
        toast.success('Book added successfully');
      }
      
      setShowBookModal(false);
      setEditingBook(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error saving book:', error);
      toast.error(error.response?.data?.message || 'Failed to save book');
    } finally {
      setBookModalLoading(false);
    }
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setShowBookModal(true);
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      await axios.delete(`${API_URL}/api/books/${bookId}`, config);
      toast.success('Book deleted successfully');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error(error.response?.data?.message || 'Failed to delete book');
    }
  };

  const handleCloseModal = () => {
    setShowBookModal(false);
    setEditingBook(null);
  };

  const handleCheckout = async () => {
    if (!selectedBook || (!rollno.trim() && !selectedStudent)) {
      toast.error('Please select a book and enter roll number or select a student');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      // Calculate due date (14 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      let student = selectedStudent;

      if (!student && rollno.trim()) {
        // Find user by roll number
        const userResponse = await axios.get(`${API_URL}/api/users?search=${rollno}`, config);
        const users = userResponse.data.data.users;
        student = users.find(user => user.rollno === rollno && user.role === 'student');

        if (!student) {
          toast.error('Student not found with this roll number');
          return;
        }
      }

      const borrowData = {
        userId: student._id,
        bookId: selectedBook._id,
        dueDate: dueDate.toISOString()
      };

      await axios.post(`${API_URL}/api/borrows`, borrowData, config);
      
      toast.success(`Book checked out to ${student.name}`);
      fetchData(); // Refresh data
      setSelectedBook(null);
      setRollno('');
      setSelectedStudent(null);
      setStudentSearchResults([]);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.message || 'Failed to checkout book');
    }
  };

  const handleCheckin = async (borrowId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      await axios.put(`${API_URL}/api/borrows/${borrowId}/return`, {}, config);
      toast.success('Book checked in successfully');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Checkin error:', error);
      toast.error(error.response?.data?.message || 'Failed to check in book');
    }
  };

  const renewBook = async (borrowId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      await axios.put(`${API_URL}/api/borrows/${borrowId}/renew`, {}, config);
      toast.success('Book renewed successfully');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Renew error:', error);
      toast.error(error.response?.data?.message || 'Failed to renew book');
    }
  };

  const payFine = async (borrowId, amount) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      await axios.put(`${API_URL}/api/borrows/${borrowId}/pay-fine`, 
        { amount }, 
        config
      );
      toast.success('Fine paid successfully');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Pay fine error:', error);
      toast.error(error.response?.data?.message || 'Failed to pay fine');
    }
  };

  const calculateAllFines = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const response = await axios.put(`${API_URL}/api/borrows/calculate-fines`, {}, config);
      toast.success(`Fines calculated for ${response.data.data.updatedBorrows} overdue books`);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Calculate fines error:', error);
      toast.error(error.response?.data?.message || 'Failed to calculate fines');
    }
  };

  const searchStudents = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setStudentSearchResults([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const response = await axios.get(`${API_URL}/api/users?search=${searchTerm}&role=student`, config);
      setStudentSearchResults(response.data.data.users);
    } catch (error) {
      console.error('Search students error:', error);
      setStudentSearchResults([]);
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.isbn.includes(searchTerm)
  );

  const activeBorrows = borrows.filter(borrow => 
    borrow.status === 'borrowed' || borrow.status === 'overdue'
  );

  const filteredOverdueBorrows = overdueBorrows.filter(borrow => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return borrow.user?.name?.toLowerCase().includes(search) ||
           borrow.user?.rollno?.toLowerCase().includes(search) ||
           borrow.book?.title?.toLowerCase().includes(search);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Librarian Dashboard</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setShowBookModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add New Book</span>
          </button>
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <CloudArrowUpIcon className="h-5 w-5" />
            <span>Bulk Upload</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BookOpenIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Books</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalBooks || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowRightIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Borrows</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeBorrows || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue Books</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.overdueBorrows || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Fines</p>
              <p className="text-2xl font-semibold text-gray-900">₹{stats.totalFines || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setSelectedAction('checkout')}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                selectedAction === 'checkout'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Check Out Books
            </button>
            <button
              onClick={() => setSelectedAction('checkin')}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                selectedAction === 'checkin'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Check In Books
            </button>
            <button
              onClick={() => setSelectedAction('manage')}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                selectedAction === 'manage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Manage Books
            </button>
            <button
              onClick={() => setSelectedAction('fines')}
              className={`py-2 px-6 border-b-2 font-medium text-sm ${
                selectedAction === 'fines'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Manage Fines
            </button>
          </nav>
        </div>

        <div className="p-6">
          {selectedAction === 'checkout' ? (
            <div className="space-y-6">
              {/* Checkout Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Book Search */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Select Book</h3>
                  <div className="mb-4">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search books by title, author, or ISBN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredBooks.map((book) => (
                      <div
                        key={book._id}
                        onClick={() => setSelectedBook(book)}
                        className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                          selectedBook?._id === book._id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{book.title}</h4>
                            <p className="text-sm text-gray-500">by {book.author}</p>
                            <p className="text-xs text-gray-400">ISBN: {book.isbn}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm ${
                              book.availableCopies > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {book.availableCopies} available
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checkout Form */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Checkout Details</h3>
                  
                  {selectedBook && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900">{selectedBook.title}</h4>
                      <p className="text-sm text-blue-700">by {selectedBook.author}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Roll Number
                      </label>
                      <input
                        type="text"
                        value={rollno}
                        onChange={(e) => {
                          setRollno(e.target.value);
                          setSelectedStudent(null);
                          searchStudents(e.target.value);
                        }}
                        placeholder="Enter roll number"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      
                      {/* Student search results dropdown */}
                      {studentSearchResults.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
                          {studentSearchResults.map((student) => (
                            <div
                              key={student._id}
                              onClick={() => {
                                setSelectedStudent(student);
                                setRollno(student.rollno);
                                setStudentSearchResults([]);
                              }}
                              className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              <div className="text-xs text-gray-500">{student.rollno} - {student.department}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Selected student display */}
                      {selectedStudent && (
                        <div className="mt-2 p-2 bg-green-50 rounded-lg">
                          <div className="text-sm font-medium text-green-900">{selectedStudent.name}</div>
                          <div className="text-xs text-green-700">{selectedStudent.rollno} - {selectedStudent.department}</div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={!selectedBook || (!rollno.trim() && !selectedStudent)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <ArrowRightIcon className="h-5 w-5" />
                      <span>Check Out Book</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedAction === 'checkin' ? (
            /* Check In Section */
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Active Borrows</h3>
              
              {activeBorrows.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No active borrows</p>
              ) : (
                <div className="space-y-4">
                  {activeBorrows.map((borrow) => (
                    <div key={borrow._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{borrow.book.title}</h4>
                          <p className="text-sm text-gray-500">by {borrow.book.author}</p>
                          <div className="mt-2 text-sm">
                            <p><span className="font-medium">Student:</span> {borrow.user.name} ({borrow.user.rollno})</p>
                            <p><span className="font-medium">Due Date:</span> 
                              <span className={`ml-1 ${
                                new Date(borrow.dueDate) < new Date() ? 'text-red-600 font-medium' : 'text-gray-700'
                              }`}>
                                {new Date(borrow.dueDate).toLocaleDateString()}
                              </span>
                            </p>
                            <p><span className="font-medium">Status:</span> 
                              <span className={`ml-1 capitalize ${
                                borrow.status === 'overdue' ? 'text-red-600 font-medium' : 'text-green-600'
                              }`}>
                                {borrow.status}
                              </span>
                            </p>
                            {borrow.fine && borrow.fine.amount > 0 && (
                              <p><span className="font-medium">Fine:</span> 
                                <span className="ml-1 text-red-600 font-medium">
                                  ₹{borrow.fine.amount}
                                </span>
                                {borrow.fine.isPaid ? (
                                  <span className="ml-2 text-green-600 text-xs">(Paid)</span>
                                ) : (
                                  <span className="ml-2 text-red-600 text-xs">(Unpaid)</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {borrow.fine && borrow.fine.amount > 0 && !borrow.fine.isPaid && (
                            <button
                              onClick={() => payFine(borrow._id, borrow.fine.amount)}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              Pay Fine (₹{borrow.fine.amount})
                            </button>
                          )}
                          <button
                            onClick={() => renewBook(borrow._id)}
                            disabled={borrow.status === 'overdue' || borrow.renewalCount >= 2}
                            className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Renew
                          </button>
                          <button
                            onClick={() => handleCheckin(borrow._id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center space-x-1"
                          >
                            <ArrowLeftIcon className="h-4 w-4" />
                            <span>Check In</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : selectedAction === 'fines' ? (
            /* Fine Management Section */
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Fine Management</h3>
                <button
                  onClick={calculateAllFines}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
                >
                  <ClockIcon className="h-5 w-5" />
                  <span>Calculate All Fines</span>
                </button>
              </div>
              
              {/* Search bar for fines */}
              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {filteredOverdueBorrows.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {searchTerm ? 'No overdue books found matching your search' : 'No overdue books with fines'}
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredOverdueBorrows.map((borrow) => (
                    <div key={borrow._id} className="border border-gray-200 rounded-lg p-4 bg-red-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{borrow.book?.title}</h4>
                          <p className="text-sm text-gray-500">by {borrow.book?.author}</p>
                          <div className="mt-2 text-sm">
                            <p><span className="font-medium">Student:</span> {borrow.user?.name} ({borrow.user?.rollno})</p>
                            <p><span className="font-medium">Due Date:</span> 
                              <span className="ml-1 text-red-600 font-medium">
                                {new Date(borrow.dueDate).toLocaleDateString()}
                              </span>
                            </p>
                            <p><span className="font-medium">Days Overdue:</span> 
                              <span className="ml-1 text-red-600 font-medium">
                                {Math.floor((new Date() - new Date(borrow.dueDate)) / (1000 * 60 * 60 * 24))} days
                              </span>
                            </p>
                            {borrow.fine && (
                              <p><span className="font-medium">Fine Amount:</span> 
                                <span className="ml-1 text-red-600 font-medium">
                                  ₹{borrow.fine.amount}
                                </span>
                                {borrow.fine.isPaid && (
                                  <span className="ml-2 text-green-600 text-xs">(Paid)</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {borrow.fine && borrow.fine.amount > 0 && !borrow.fine.isPaid && (
                            <button
                              onClick={() => payFine(borrow._id, borrow.fine.amount)}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Pay Fine (₹{borrow.fine.amount})
                            </button>
                          )}
                          <button
                            onClick={() => handleCheckin(borrow._id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
                          >
                            <ArrowLeftIcon className="h-4 w-4" />
                            <span>Return Book</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Book Management Section */
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Book Management</h3>
                <button
                  onClick={() => setShowBookModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Add Book</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search books by title, author, or ISBN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Books Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Book Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ISBN
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Copies
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBooks.map((book) => (
                      <tr key={book._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{book.title}</div>
                            <div className="text-sm text-gray-500">by {book.author}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{book.isbn}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {book.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {book.availableCopies} / {book.totalCopies}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            book.availableCopies > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {book.availableCopies > 0 ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditBook(book)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBook(book._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredBooks.length === 0 && (
                <div className="text-center py-8">
                  <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No books found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding a new book.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Books Alert */}
      {overdueBorrows.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Overdue Books Alert
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>There are {overdueBorrows.length} overdue books that need attention.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <BookModal
        isOpen={showBookModal}
        onClose={handleCloseModal}
        onSubmit={handleBookSubmit}
        book={editingBook}
        loading={bookModalLoading}
      />

      <BulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onUpload={fetchData}
      />
    </div>
  );
};

export default LibrarianDashboard;
