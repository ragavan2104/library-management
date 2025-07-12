import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  UserPlusIcon,
  UsersIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline';
import {
  createFirebaseUser,
  createBulkFirebaseUsers,
  exportUsersToExcel,
  validateUserData
} from '../../utils/firebaseUserUtils';
import * as XLSX from 'xlsx';

const CreateUserByAdmin = () => {
  const [activeTab, setActiveTab] = useState('single'); // 'single', 'bulk', or 'upload'
  const [isLoading, setIsLoading] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [createdUsers, setCreatedUsers] = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Single user form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollno: '',
    department: '',
    year: '',
    college: 'Engineering College',
    role: 'student'
  });

  const departments = [
    'Computer Science',
    'Information Technology',
    'Electronics',
    'Mechanical',
    'Civil',
    'Electrical',
    'Chemical',
    'Biotechnology'
  ];

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSingleUserSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate form data
      const errors = validateUserData(formData);
      if (errors.length > 0) {
        toast.error(errors.join(', '));
        return;
      }

      const result = await createFirebaseUser(formData);
      
      if (result.success) {
        setCreatedUsers([{
          ...formData,
          email: result.credentials.email,
          password: result.credentials.password,
          uid: result.user.uid
        }]);
        
        toast.success('User created successfully!');
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          rollno: '',
          department: '',
          year: '',
          college: 'Engineering College',
          role: 'student'
        });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUserSubmit = async () => {
    if (!bulkData.trim()) {
      toast.error('Please enter user data');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Parse bulk data (expecting CSV format: name,rollno,department,year)
      const lines = bulkData.trim().split('\n');
      const usersData = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [name, rollno, department, year, college] = line.split(',').map(item => item?.trim());
        
        if (!name || !rollno || !department || !year) {
          toast.error(`Invalid data format at line ${i + 1}. Expected: name,rollno,department,year`);
          return;
        }
        
        usersData.push({
          name,
          rollno,
          department,
          year,
          college: college || 'Engineering College',
          role: 'student'
        });
      }
      
      if (usersData.length === 0) {
        toast.error('No valid user data found');
        return;
      }
      
      const results = await createBulkFirebaseUsers(usersData);
      setBulkResults(results);
      
      if (results.successful.length > 0) {
        toast.success(`${results.successful.length} users created successfully!`);
      }
      
      if (results.failed.length > 0) {
        toast.error(`${results.failed.length} users failed to create`);
      }
      
      if (results.duplicates.length > 0) {
        toast.warning(`${results.duplicates.length} duplicate users skipped`);
      }
      
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExcel = (users) => {
    try {
      exportUsersToExcel(users);
      toast.success('Excel file downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download Excel file');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const resetResults = () => {
    setCreatedUsers(null);
    setBulkResults(null);
    setBulkData('');
    setUploadedFile(null);
    setParsedData([]);
  };

  // Excel file upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an Excel file (.xlsx, .xls) or CSV file');
      return;
    }

    setIsUploading(true);
    setUploadedFile(file);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Validate and parse data
      const parsedUsers = [];
      const errors = [];

      jsonData.forEach((row, index) => {
        try {
          // Flexible column mapping - support multiple possible column names
          const name = row.Name || row.name || row.STUDENT_NAME || row['Student Name'] || '';
          const rollno = row.RollNo || row.rollno || row.ROLLNO || row['Roll No'] || row['Roll Number'] || '';
          const department = row.Department || row.department || row.DEPARTMENT || '';
          const year = row.Year || row.year || row.YEAR || '';
          const college = row.College || row.college || row.COLLEGE || 'Engineering College';
          const role = row.Role || row.role || row.ROLE || 'student';

          if (!name || !rollno || !department || !year) {
            errors.push(`Row ${index + 2}: Missing required fields (Name, Roll No, Department, Year)`);
            return;
          }

          parsedUsers.push({
            name: name.toString().trim(),
            rollno: rollno.toString().trim(),
            department: department.toString().trim(),
            year: year.toString().trim(),
            college: college.toString().trim(),
            role: role.toString().toLowerCase().trim()
          });
        } catch (error) {
          errors.push(`Row ${index + 2}: Error parsing data - ${error.message}`);
        }
      });

      if (errors.length > 0) {
        console.warn('Parsing errors:', errors);
        toast.warning(`${errors.length} rows had errors. Check console for details.`);
      }

      if (parsedUsers.length === 0) {
        toast.error('No valid user data found in file');
        return;
      }

      setParsedData(parsedUsers);
      toast.success(`Successfully parsed ${parsedUsers.length} users from file`);

    } catch (error) {
      console.error('File parsing error:', error);
      toast.error('Failed to parse file. Please check the format.');
    } finally {
      setIsUploading(false);
    }
  };

  // Process uploaded Excel data
  const handleExcelBulkSubmit = async () => {
    if (parsedData.length === 0) {
      toast.error('No data to process');
      return;
    }

    setIsLoading(true);

    try {
      const results = await createBulkFirebaseUsers(parsedData);
      setBulkResults(results);

      if (results.successful.length > 0) {
        toast.success(`${results.successful.length} users created successfully!`);
      }

      if (results.failed.length > 0) {
        toast.error(`${results.failed.length} users failed to create`);
      }

      if (results.duplicates.length > 0) {
        toast.warning(`${results.duplicates.length} duplicate users skipped`);
      }

    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Download sample Excel template
  const downloadSampleTemplate = () => {
    try {
      const sampleData = [
        {
          'Name': 'John Doe',
          'Roll No': '21CS001',
          'Department': 'Computer Science',
          'Year': '2nd Year',
          'College': 'Engineering College',
          'Role': 'student'
        },
        {
          'Name': 'Jane Smith',
          'Roll No': '21IT002',
          'Department': 'Information Technology',
          'Year': '1st Year',
          'College': 'Engineering College',
          'Role': 'student'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      
      // Set column widths
      const colWidths = [
        { wch: 20 }, // Name
        { wch: 12 }, // Roll No
        { wch: 20 }, // Department
        { wch: 12 }, // Year
        { wch: 25 }, // College
        { wch: 10 }  // Role
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Sample Users');
      XLSX.writeFile(wb, 'user_upload_template.xlsx');
      
      toast.success('Sample template downloaded!');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900">Create Users</h2>
          <p className="text-gray-600 mt-1">Create single user, bulk users with CSV input, or upload Excel file with auto-generated credentials</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="px-6 flex space-x-8">
            <button
              onClick={() => setActiveTab('single')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'single'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlusIcon className="h-5 w-5 inline mr-2" />
              Single User
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bulk'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UsersIcon className="h-5 w-5 inline mr-2" />
              Bulk Users
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <DocumentArrowUpIcon className="h-5 w-5 inline mr-2" />
              Excel Upload
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Single User Creation */}
          {activeTab === 'single' && (
            <form onSubmit={handleSingleUserSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter student name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roll Number *
                  </label>
                  <input
                    type="text"
                    name="rollno"
                    value={formData.rollno}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter roll number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year *
                  </label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Year</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    College
                  </label>
                  <input
                    type="text"
                    name="college"
                    value={formData.college}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="College name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="student">Student</option>
                    <option value="librarian">Librarian</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setFormData({
                    name: '',
                    rollno: '',
                    department: '',
                    year: '',
                    college: 'Engineering College',
                    role: 'student'
                  })}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="h-5 w-5" />
                      <span>Create User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Bulk User Creation */}
          {activeTab === 'bulk' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-2">Bulk User Creation</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Enter user data in CSV format, one user per line:
                </p>
                <code className="text-blue-800 text-sm bg-blue-100 px-2 py-1 rounded">
                  name,rollno,department,year,college
                </code>
                <p className="text-blue-600 text-sm mt-2">
                  Example: John Doe,CS001,Computer Science,1st Year,Engineering College
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Data (CSV Format)
                </label>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  rows="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe,CS001,Computer Science,1st Year,Engineering College&#10;Jane Smith,CS002,Computer Science,1st Year,Engineering College&#10;..."
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setBulkData('')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  onClick={handleBulkUserSubmit}
                  disabled={isLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <UsersIcon className="h-5 w-5" />
                      <span>Create Users</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Excel File Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-2">Upload Excel File</h3>
                <p className="text-blue-700 text-sm mb-2">
                  Upload an Excel file (.xlsx, .xls) or CSV file with user data.
                </p>
                <p className="text-blue-600 text-sm">
                  Download the <button onClick={downloadSampleTemplate} className="text-blue-600 underline">sample template</button> for reference.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Excel/CSV File
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {uploadedFile && parsedData.length > 0 && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>File:</strong> {uploadedFile.name} ({parsedData.length} users parsed)
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleExcelBulkSubmit}
                      disabled={isLoading || parsedData.length === 0}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating Users...</span>
                        </>
                      ) : (
                        <>
                          <UsersIcon className="h-5 w-5" />
                          <span>Create {parsedData.length} Users</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setParsedData([]);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                    <span className="text-yellow-800">Parsing file...</span>
                  </div>
                </div>
              )}

              {/* Parsed Data Preview */}
              {parsedData.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-4 mt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">
                    Parsed User Data ({parsedData.length} users)
                  </h4>
                  <div className="max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {parsedData.slice(0, 10).map((user, index) => (
                        <div key={index} className="bg-gray-50 rounded p-2 text-sm">
                          <span className="font-medium">{user.name}</span> - 
                          <span className="text-gray-600"> {user.rollno}</span> - 
                          <span className="text-gray-600"> {user.department}</span> - 
                          <span className="text-gray-600"> {user.year}</span>
                        </div>
                      ))}
                      {parsedData.length > 10 && (
                        <div className="text-gray-500 text-sm text-center py-2">
                          ... and {parsedData.length - 10} more users
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p>✓ Usernames and passwords will be auto-generated when you click "Process Users"</p>
                    <p>✓ Format: Email = name.rollno@college.edu, Password = namerollno</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success Results */}
      {createdUsers && (
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900">User Created Successfully</h3>
            </div>
            <button
              onClick={resetResults}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {createdUsers.map((user, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Roll Number</p>
                    <p className="font-medium">{user.rollno}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{user.email}</p>
                      <button
                        onClick={() => copyToClipboard(user.email)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Password</p>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium font-mono">{user.password}</p>
                      <button
                        onClick={() => copyToClipboard(user.password)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => downloadExcel(createdUsers)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span>Download Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Results */}
      {bulkResults && (
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Bulk Creation Results</h3>
            <button
              onClick={resetResults}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">Successful</p>
                  <p className="text-2xl font-bold text-green-900">{bulkResults.successful.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <XMarkIcon className="h-8 w-8 text-red-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-900">Failed</p>
                  <p className="text-2xl font-bold text-red-900">{bulkResults.failed.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-900">Duplicates</p>
                  <p className="text-2xl font-bold text-yellow-900">{bulkResults.duplicates.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Download Excel for successful users */}
          {bulkResults.successful.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => downloadExcel(bulkResults.successful)}
                className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span>Download Credentials Excel ({bulkResults.successful.length} users)</span>
              </button>
            </div>
          )}

          {/* Failed Users */}
          {bulkResults.failed.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-red-900 mb-2">Failed Users</h4>
              <div className="space-y-2">
                {bulkResults.failed.map((failed, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-800">
                      <strong>Row {failed.row}:</strong> {failed.data.name} - {failed.error}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Users */}
          {bulkResults.duplicates.length > 0 && (
            <div>
              <h4 className="text-md font-medium text-yellow-900 mb-2">Duplicate Users (Skipped)</h4>
              <div className="space-y-2">
                {bulkResults.duplicates.map((duplicate, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Row {duplicate.row}:</strong> {duplicate.data.name} - {duplicate.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreateUserByAdmin;
