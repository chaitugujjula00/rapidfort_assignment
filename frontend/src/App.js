import React, { useState } from 'react';
import { Upload, Download, FileText, Lock } from 'lucide-react';

const DocumentConverter = () => {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [password, setPassword] = useState('');
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.docx')) {
      setError('Please upload a valid .docx file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    
    // Create form data to send file
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const response = await fetch('http://localhost:8000/metadata', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to fetch metadata');
      
      const metadata = await response.json();
      setMetadata(metadata);
    } catch (err) {
      setError('Failed to read file metadata');
      console.error(err);
    }
  };

  const handleConvert = async () => {
    if (!file) return;

    setConverting(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    if (password) formData.append('password', password);
    
    try {
      const response = await fetch('http://localhost:8000/convert', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Conversion failed');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      setError('Failed to convert document');
      console.error(err);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Document Converter</h1>
          <p className="text-gray-800">Convert DOCX files to PDF</p>
        </div>
        
        <div className="border-2 border-dashed border-gray-800 bg-gray-100 text-gray-800 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".docx"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label 
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <Upload className="w-12 h-12 text-gray-800 mb-2" />
            <span className="text-sm text-gray-800">
              {file ? file.name : 'Click to upload DOCX file'}
            </span>
          </label>
        </div>

        {/* Metadata Display */}
        {metadata && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4" />
              <h2 className="font-semibold">File Metadata</h2>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <h2 className='text-md text-black font-bold'>Title: {file.name}</h2>
              <p>Size: {metadata.size} bytes</p>
              <p>Created: {new Date(metadata.created).toLocaleString()}</p>
              <p>Modified: {new Date(metadata.modified).toLocaleString()}</p>
              <p>Author: {metadata.author || 'Unknown'}</p>
            </div>
          </div>
        )}

        {/* Password Protection */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Lock className="w-4 h-4" />
            PDF Password (optional)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Enter password to protect PDF"
          />
        </div>

        {/* Convert Button */}
        <button
          onClick={handleConvert}
          disabled={!file || converting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {converting ? 'Converting...' : 'Convert to PDF'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <div className="font-medium">Error</div>
            <div className="text-sm">{error}</div>
          </div>
        )}

        {/* Download Link */}
        {pdfUrl && (
          <div className="text-center">
            <a
              href={pdfUrl}
              download={file.name.replace('.docx', '.pdf')}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentConverter;