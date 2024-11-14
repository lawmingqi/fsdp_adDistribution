import React, { useState, useEffect } from "react";
import "../styles/Advert.css";
import Navbar from "./navbar";
const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/files");
      const data = await response.json();
      console.log(data);
      setFileList(data);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setFileType(selectedFile.type.startsWith("image") ? "image" : "video");
      setFileName(selectedFile.name);
    } else {
      setFile(null);
      setPreviewUrl(null);
      setFileType(null);
      setFileName("");
    }
  };

  const uploadFile = async () => {
    if (!file) {
      alert("No file selected");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/generate-presigned-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ FileName: fileName, FileType: file.type }),
      });

      const { url, key } = await response.json();

      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      await fetch("/api/upload-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FileId: key,
          FileName: fileName,
          FileSize: file.size,
          FileType: file.type,
          FileUrl: key,
        }),
      });
      
      const uploadedFile = await fetch(`/api/getfiles/${key}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if(uploadedFile.status === 200){
        const fileData = await uploadedFile.json();
        await fetch("/createAds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "adTitle": fileName,
            "adContent": fileData,  // Assuming uploadedFile is the data you want to send
            "adType": fileType,
            "uploadDate": new Date().toISOString(),
            "assignedTvs": [],
            "FileId": key,
          }),
        });
      }
      else {
        console.log("Error uploading file");
      }
      fetchFiles();
      setFile(null);
      setPreviewUrl(null);
      setFileType(null);
      setFileName("");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
    setLoading(false);
  };

  const deleteFile = async (fileKey) => {
    try {
      await fetch(`/api/delete-file/${fileKey}`, { method: "DELETE" });
      // call another thing to get the ad id
      const fileID = await fetch(`/getAdID/${fileKey}`,{
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      console.log(fileID.json());
      if(fileID.status === 200){
        const adID = await fileID.json();
        console.log(adID);
        await fetch(`/deleteAd/${adID}`,{
          method: "DELETE",
        });
      }
      await fetch(`deleteAd/${fileKey}`, { method: "DELETE" });
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleDisplay = (tvID) => {
    const selectedTV = prompt("Enter the TV ID to display this ad:");
    try{
      if (selectedTV) {
        const socket = new WebSocket("ws://localhost:5000");
        if(!socket){
          
        }
        socket.onopen = () => {
          socket.send(JSON.stringify({"user_id" : tvID}));
        }
  
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log(data);
        };
      }
    }

    catch (error) {
      console.error("Error displaying ad:", error);
    };
  }
    


  return (
    <div className="file-upload-container">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.4.1/font/bootstrap-icons.min.css"></link>
      <Navbar />
      <div className="top-bar">
        <h2 className="editor-title">Advertisement</h2>
      </div>

      <button onClick={() => setIsModalOpen(true)} className="upload-btn">
        Upload File
      </button>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Select a File to Upload</h3>
            <input type="file" onChange={handleFileChange} accept="image/*,video/*" />
            {previewUrl && (
              <div className="preview-container">
                <p>Preview:</p>
                {fileType === "image" ? (
                  <img src={previewUrl} alt="Preview" />
                ) : (
                  <video src={previewUrl} controls />
                )}
              </div>
            )}
            <div className="file-name-edit">
              <label>File Name:</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>
            <button onClick={uploadFile} disabled={loading} className="upload">
              {loading ? "Uploading..." : "Upload"}
            </button>
            <button onClick={() => setIsModalOpen(false)} className="cancel">
              Cancel
            </button>
          </div>
        </div>
      )}

      <h2>Uploaded Advertisements</h2>
      <div className="file-list">
        {fileList.map((file) => (
          <div key={file.FileId} className="file-item">
            {file.FileType.startsWith("image") ? (
              <img src={file.FileUrl} alt={file.FileName} className="file-content" />
            ) : (
              <video src={file.FileUrl} controls className="file-content" />
            )}
            <p className="file-name">{file.FileName}</p>
            <div className="file-footer">
              <button onClick={() => deleteFile(file.FileId)} className="delete-btn">
                <i class="bi bi-trash"></i>
              </button>
              <button onClick={() => handleDisplay(file.FileId)} className="display-btn">
                <i className="bi bi-display"></i> 
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileUpload;
