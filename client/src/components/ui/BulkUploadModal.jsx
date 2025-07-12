import React, { useState } from 'react';
import toast from 'react-hot-toast';

const BulkUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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
      const response = await fetch('/api/books/bulk', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        // Don't set Content-Type header - browser will set it with boundary for FormData
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        onUpload();
        onClose();
      } else {
        // Show the main error message
        toast.error(data.message, { duration: 5000 });
        
        // Show detailed errors if any
        if (data.errors) {
          data.errors.forEach(error => {
            setTimeout(() => {
              toast.error(error, { duration: 8000 });
            }, 500); // Slight delay for better readability
          });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload books');
    } finally {
      setIsUploading(false);
      setFile(null);
    }
  };

  if (!isOpen) return null;

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/books/sample-template', {
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
      a.download = 'book_upload_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Failed to download template');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Bulk Upload Books</h2>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Upload Excel File (.xlsx)
            </label>
            <button
              onClick={downloadTemplate}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Download Template
            </button>
          </div>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* <div className="text-sm text-gray-600 mb-4">
          <p className="font-medium mb-2">Column Information:</p>
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-700">Required Fields:</p>
              <ul className="list-disc pl-5">
                <li>title - Book title (max 200 characters)</li>
                <li>author - Author name (max 100 characters)</li>
                <li>isbn - Valid ISBN-10 or ISBN-13</li>
                <li>shelf - Shelf location (e.g., 'A1', 'B2')</li>
                <li>section - Section name (e.g., 'Fiction', 'Technical')</li>
                <li>quantity - Number of copies (minimum 1)</li>
                <li>category - Must be one of: Fiction, Non-Fiction, Science, Technology, History, Biography, Mathematics, Physics, Chemistry, Biology, Computer Science, Engineering, Literature, Philosophy, Psychology, Economics, Business, Art, Music, Sports, Health, Cooking, Travel, Reference, Other</li>
              </ul>
            </div>
            
            <div>
              <p className="font-medium text-gray-700">Optional Fields:</p>
              <ul className="list-disc pl-5">
                <li>description - Book description (max 1000 characters)</li>
                <li>publishedYear - Year between 1800 and current year</li>
                <li>publisher - Publisher name (max 100 characters)</li>
                <li>language - Book language (defaults to 'English')</li>
                <li>edition - Edition information</li>
                <li>tags - Comma-separated keywords (e.g., 'fiction,novel,classic')</li>
                <li>pages - Number of pages</li>
                <li>condition - Book condition (e.g., 'New', 'Good', 'Fair')</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-gray-700">Example Row:</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                title: "The Great Gatsby", author: "F. Scott Fitzgerald", isbn: "9780743273565", category: "Fiction", shelf: "A1", section: "Fiction", quantity: "5", publishedYear: "2004", publisher: "Scribner", language: "English", tags: "classic,literature,american"
              </p>
            </div>
          </div>
        </div> */}

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

export default BulkUploadModal;
