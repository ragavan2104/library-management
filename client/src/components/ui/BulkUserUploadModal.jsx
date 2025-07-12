import React, { useState } from 'react';
import toast from 'react-hot-toast';

const BulkUserUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        toast.error('Please upload an Excel file (.xlsx)');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        onUpload();
        onClose();
      } else {
        toast.error(data.message, { duration: 5000 });
        if (data.errors) {
          data.errors.forEach(error => {
            setTimeout(() => {
              toast.error(error, { duration: 8000 });
            }, 500);
          });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload users');
    } finally {
      setIsUploading(false);
      setFile(null);
    }
  };

  const downloadTemplate = async () => {
    try {
      setIsDownloading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/sample-template', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk_users_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Failed to download template');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Bulk Upload Users</h2>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Upload Excel File (.xlsx)
            </label>
            <button
              onClick={downloadTemplate}
              disabled={isDownloading}
              className={`text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 ${isDownloading ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Template
                </>
              )
            </button>
          </div>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="text-sm text-gray-600 mb-4">
          <p className="font-medium mb-2">Column Information:</p>
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-700">Template Sheets:</p>
              <ul className="list-disc pl-5 mb-4">
                <li>Sheet 1: Students Template</li>
                <li>Sheet 2: Librarians Template</li>
              </ul>

              <p className="font-medium text-gray-700">Required Fields for Students:</p>
              <ul className="list-disc pl-5 mb-4">
                <li>Name* - Full name (max 50 characters)</li>
                <li>Email* - Valid email address</li>
                <li>Password* - Minimum 6 characters</li>
                <li>Role* - Must be "student"</li>
                <li>RollNo* - Unique roll number</li>
                <li>Department* - Student's department</li>
                <li>Year* - Valid values: 2024-2028, 1st Year-4th Year, Graduate</li>
                <li>College* - College name</li>
              </ul>

              <p className="font-medium text-gray-700">Required Fields for Librarians:</p>
              <ul className="list-disc pl-5 mb-4">
                <li>Name* - Full name (max 50 characters)</li>
                <li>Email* - Valid email address</li>
                <li>Password* - Minimum 6 characters</li>
                <li>Role* - Must be "librarian"</li>
              </ul>
              
              <p className="font-medium text-gray-700">Optional Fields (Both Roles):</p>
              <ul className="list-disc pl-5">
                <li>Phone - Valid phone number (e.g., +91-1234567890)</li>
                <li>Address - Full address (max 200 characters)</li>
              </ul>

              <div className="mt-4">
                <p className="font-medium text-gray-700">Notes:</p>
                <ul className="list-disc pl-5 text-sm">
                  <li>Fields marked with * are required</li>
                  <li>Download the template for example data in proper format</li>
                  <li>Don't modify column headers in the template</li>
                  <li>All email addresses must be unique</li>
                  <li>Student roll numbers must be unique</li>
                </ul>
              </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 ${isUploading ? 'cursor-not-allowed' : ''}`}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkUserUploadModal;
