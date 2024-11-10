import React, { useState, useEffect } from 'react';
import '../styles/Advert.css';

const FileUpload = () => {
  const [file, setFile] = useState(null);
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
    try {
      await fetch(`/api/delete-file/${fileKey}`, { method: 'DELETE' });
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  return (
    <div className="file-upload-container">
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
              href={`https://${process.env.REACT_APP_S3_BUCKET_NAME}.s3.amazonaws.com/${file.FileUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={`https://${process.env.REACT_APP_S3_BUCKET_NAME}.s3.amazonaws.com/${file.FileUrl}`} alt={file.FileName} />
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
