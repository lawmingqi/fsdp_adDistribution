import io from "socket.io-client";
import { useEffect, useState } from "react";
import Navbar from "./navbar";

const socket = io.connect("http://localhost:5000");

const AdvertisementDisplay = () => {
  const [tv, setTv] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [messageReceived, setMessageReceived] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const joinTv = () => {
    if (tv !== "") {
      socket.emit("join_tv", tv);
    }
  };

  const sendMessage = () => {
    if (selectedFile) {
      socket.emit("send_message", { message: previewUrl, tv });
    }
  };

  const openFileModal = () => {
    setIsModalOpen(true);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Generate a preview URL for the selected file
    }
  };

  const confirmFileSelection = () => {
    setIsModalOpen(false);
  };

  const cancelFileSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsModalOpen(false);
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      if (data.tv === tv) {
        setMessageReceived(data.message);
      }
    });

    return () => {
      socket.off("receive_message");
    };
  }, [tv]);

  return (
    <div>
      <Navbar />
      <h2>Advertisement Display</h2>
      <div className="AdvertisementDisplay">
        <input
          placeholder="TV ID..."
          value={tv}
          onChange={(event) => setTv(event.target.value)}
        />
        <button onClick={joinTv}>Set TV</button>

        {/* File selection button */}
        <button onClick={openFileModal}>Select File</button>
        
        {/* Modal for file selection */}
        {isModalOpen && (
          <div className="modal">
            <div className="modal-content">
              <h3>Select an Advertisement File</h3>
              <input type="file" onChange={handleFileChange} />
              {previewUrl && (
                <div className="preview">
                  <h4>Preview:</h4>
                  {selectedFile.type.startsWith("video") ? (
                    <video controls src={previewUrl} width="100%" />
                  ) : (
                    <img src={previewUrl} alt="Preview" width="100%" />
                  )}
                </div>
              )}
              <button onClick={confirmFileSelection}>Confirm</button>
              <button onClick={cancelFileSelection}>Cancel</button>
            </div>
          </div>
        )}

        <button onClick={sendMessage} disabled={!selectedFile}>Push to TV</button>
        
        <h1>Advertisement: </h1>
        {messageReceived && (
          <div className="received-ad">
            {messageReceived.endsWith(".mp4") ? (
              <video controls src={messageReceived} width="100%" />
            ) : (
              <img src={messageReceived} alt="Advertisement" width="100%" />
            )}
          </div>
        )}
      </div>

      {/* Add some styling for modal */}
      <style jsx>{`
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          text-align: center;
        }
        .preview {
          margin-top: 20px;
          max-width: 100%;
        }
        button {
          margin: 10px;
          padding: 10px;
        }
      `}</style>
    </div>
  );
};

export default AdvertisementDisplay;
