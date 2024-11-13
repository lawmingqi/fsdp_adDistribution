import React, { useState, useEffect } from 'react';
import '../styles/Advert.css';
import logo from '../assets/githubbies-logo.jpg'
import { Link } from 'react-router-dom';

const FileUpload = () => {
  // file is the file object that is passed in then setFile the function used to update the state of the file object 
  const [file, setFile] = useState(null);
  // Pass the data retrieved into an array
  const [fileList, setFileList] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();
      setFileList(data);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    // Shows the live preview of the file when it changes
    setFile(selectedFile);
    if (selectedFile) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
  };

  const uploadFile = async () => {
    if (!file) {
      alert('No file selected');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/generate-presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ FileName: file.name, FileType: file.type }),
      });

      const { url, key } = await response.json();

      console.log("Generated URL:", url);
      console.log("DynamoDB key for s3 object: ",key)

      // Need to store this key in s3 as well

      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      await fetch('/api/upload-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          FileId: key,
          FileName: file.name,
          FileSize: file.size,
          FileType: file.type,
          FileUrl: key,
        }),
      });

      fetchFiles();
      setFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
    setLoading(false);
  };

  const deleteFile = async (fileKey) => {
    console.log("Deleting file with key:", fileKey);
    try {
      await fetch(`/api/delete-file/${fileKey}`, { method: 'DELETE' });
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  return (
    <div className="file-upload-container">
      <nav className="navbar">
                <div className="navbar-logo">
                    <img src={logo} alt="Logo" />
                </div>
                <ul className="navbar-links">
                    <li><Link to="/">Dashboard</Link></li>
                    <li><Link to="/file-management">File Management</Link></li>
                    <li><Link to="/template-editor">Template Editor</Link></li>
                    <li><Link to="/media-management">Media Management</Link></li>
                </ul>
            </nav>
            <div className="top-bar">
            <h2 className="editor-title">File Management</h2>
          </div>
      <h2>Upload File</h2>
      <input type="file" onChange={handleFileChange} />
      {previewUrl && (
        <div className="preview-container">
          <p>Image Preview:</p>
          <img src={previewUrl} alt="Preview" />
        </div>
      )}
      <button onClick={uploadFile} disabled={loading}>
        {loading ? 'Uploading...' : 'Upload'}
      </button>

      <h2>Uploaded Files</h2>
      <div className="file-list">
        {fileList.map((file) => (
          <div key={file.FileId} className="file-item">
            <a
              href={file.FileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={file.FileUrl} alt={file.FileName} />
            </a>
            <p>{file.FileName}</p>
            <button onClick={() => deleteFile(file.FileId)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileUpload;
