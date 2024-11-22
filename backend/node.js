// server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const libre  = require('libreoffice-convert');
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const PDFDocument = require('pdfkit');
const temp = require('temp');
libre.convertAsync = require('util').promisify(libre.convert);
const app = express();
const upload = multer({ dest: 'uploads/' });

// Automatically track and cleanup temp files
temp.track();

app.use(cors());
app.use(express.json());

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only DOCX files are allowed.'), false);
  }
};

const uploadMiddleware = multer({ 
  storage: storage,
  fileFilter: fileFilter
});

// Utility function to get file metadata
async function getDocxMetadata(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText(buffer);
    const stats = await fs.stat(filePath);

    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      wordCount: result.value.split(/\s+/).length,
      characterCount: result.value.length
    };
  } catch (error) {
    throw new Error('Failed to extract metadata: ' + error.message);
  }
}

// Get metadata endpoint
app.post('/metadata', uploadMiddleware.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const metadata = await getDocxMetadata(req.file.path);
    
    // Cleanup uploaded file
    await fs.unlink(req.file.path);
    
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Convert document endpoint
app.post('/convert', uploadMiddleware.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const outputPath = path.join('uploads', `${Date.now()}-output.pdf`);
  const password = req.body.password;

  try {
    // Read the input file
    const docxBuffer = await fs.readFile(inputPath);
    
    // Convert to PDF
    const pdfBuffer = await libre.convertAsync(docxBuffer, '.pdf', undefined);
    
    // If password protection is requested
    if (password) {
      // Create a promise-based temporary file
      tempFilePath = await new Promise((resolve, reject) => {
        temp.open({ suffix: '.pdf' }, (err, info) => {
          if (err) return reject(err);
          resolve(info.path);
        });
      });

      // Create protected PDF
      const doc = new PDFDocument({
        userPassword: password,
        ownerPassword: password,
        permissions: {
          printing: 'lowResolution',
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: true,
          documentAssembly: false
        }
      });

      // Create write stream
      const writeStream = fs.createWriteStream(tempFilePath);

      // Pipe PDF to file
      doc.pipe(writeStream);
      doc.end(pdfBuffer);

      // Wait for file to be written
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Read protected PDF
      const protectedPdfBuffer = await fs.readFile(tempFilePath);

      // Send protected PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${path.basename(req.file.originalname, '.docx')}.pdf`);
      res.send(protectedPdfBuffer);
    } else {
      // Send unprotected PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${path.basename(req.file.originalname, '.docx')}.pdf`);
      res.send(pdfBuffer);
    }
    } catch (error) {
      console.error('PDF processing error:', error);
      res.status(500).send('Error processing PDF');
    }

    // Cleanup
    await fs.unlink(inputPath);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: error.message });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});