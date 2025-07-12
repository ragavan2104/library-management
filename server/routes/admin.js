import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { auth, isAdmin } from '../middleware/auth.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/excel';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `students-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Generate random password
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// @route   POST /api/admin/upload-students
// @desc    Bulk upload students from Excel file
// @access  Private (Admin only)
router.post('/upload-students', auth, isAdmin, upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded'
      });
    }

    // Read the Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const studentsData = XLSX.utils.sheet_to_json(worksheet);

    if (studentsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or invalid format'
      });
    }

    const results = {
      successful: [],
      failed: [],
      duplicates: []
    };

    // Process each student
    for (let i = 0; i < studentsData.length; i++) {
      const student = studentsData[i];
      
      try {
        // Validate required fields
        if (!student.name || !student.rollNo || !student.department || !student.passedOutYear) {
          results.failed.push({
            row: i + 2,
            data: student,
            error: 'Missing required fields (name, rollNo, department, passedOutYear)'
          });
          continue;
        }

        // Generate email and check for duplicates
        const email = `${student.rollNo.toString().toLowerCase()}@college.edu`;
        
        // Check if user already exists
        const existingUser = await User.findOne({
          $or: [
            { email },
            { rollno: student.rollNo.toString() }
          ]
        });

        if (existingUser) {
          results.duplicates.push({
            row: i + 2,
            data: student,
            existingEmail: existingUser.email
          });
          continue;
        }

        // Generate password
        // Generate password in format: username@rollno
        const username = email.split('@')[0];
        const password = `${username}@${student.rollNo}`;
        
        // Create new student
        const newStudent = new User({
          name: student.name.trim(),
          email,
          password, // Will be hashed by the pre-save middleware
          rollno: student.rollNo.toString(),
          department: student.department.trim(),
          year: student.passedOutYear.toString(),
          college: student.college || 'Default College',
          role: 'student'
        });

        await newStudent.save();

        results.successful.push({
          row: i + 2,
          name: student.name,
          email,
          rollno: student.rollNo.toString(),
          password, // Plain password for download
          department: student.department,
          year: student.passedOutYear
        });

      } catch (error) {
        results.failed.push({
          row: i + 2,
          data: student,
          error: error.message
        });
      }
    }

    // Create Excel file with credentials for successful registrations
    let downloadPath = null;
    if (results.successful.length > 0) {
      const credentialsData = results.successful.map(student => ({
        Name: student.name,
        'Roll Number': student.rollno,
        Email: student.email,
        Password: student.password,
        Department: student.department,
        Year: student.year
      }));

      const credentialsWorkbook = XLSX.utils.book_new();
      const credentialsWorksheet = XLSX.utils.json_to_sheet(credentialsData);
      XLSX.utils.book_append_sheet(credentialsWorkbook, credentialsWorksheet, 'Student Credentials');

      downloadPath = `uploads/excel/credentials-${Date.now()}.xlsx`;
      XLSX.writeFile(credentialsWorkbook, downloadPath);
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Student upload process completed',
      results: {
        totalProcessed: studentsData.length,
        successful: results.successful.length,
        failed: results.failed.length,
        duplicates: results.duplicates.length,
        failedRecords: results.failed,
        duplicateRecords: results.duplicates,
        downloadPath: downloadPath ? `/api/admin/download-credentials/${path.basename(downloadPath)}` : null
      }
    });

  } catch (error) {
    // Clean up uploaded file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk upload'
    });
  }
});

// @route   GET /api/admin/download-credentials/:filename
// @desc    Download generated credentials file
// @access  Private (Admin only)
router.get('/download-credentials/:filename', auth, isAdmin, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('uploads/excel', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      } else {
        // Delete file after download
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }, 60000); // Delete after 1 minute
      }
    });

  } catch (error) {
    console.error('Download credentials error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during download'
    });
  }
});

// @route   GET /api/admin/sample-template
// @desc    Download sample Excel template for student upload
// @access  Private (Admin only)
router.get('/sample-template', auth, isAdmin, (req, res) => {
  try {
    const sampleData = [
      {
        name: 'John Doe',
        rollNo: 'CS2021001',
        department: 'Computer Science',
        passedOutYear: '4th Year',
        college: 'Engineering College'
      },
      {
        name: 'Jane Smith',
        rollNo: 'IT2021002',
        department: 'Information Technology',
        passedOutYear: '3rd Year',
        college: 'Engineering College'
      }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    const tempPath = `uploads/excel/sample-template-${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, tempPath);

    res.download(tempPath, 'student-upload-template.xlsx', (err) => {
      if (err) {
        console.error('Template download error:', err);
      }
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    });

  } catch (error) {
    console.error('Sample template error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating sample template'
    });
  }
});

export default router;
