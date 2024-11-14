import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import "../styles/Advert.css";
import Navbar from "./navbar";

const socket = io.connect("http://localhost:5000"); // Adjust to your backend URL

const AdvertisementDisplay = () => {
  const [ads, setAds] = useState([]);
  const [tvID, setTvID] = useState("");
  const [selectedAd, setSelectedAd] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayedAd, setDisplayedAd] = useState(null);

  useEffect(() => {
    fetchAds();

    // Listen for the receive_message event to display the ad in real-time
    socket.on("receive_message", (data) => {
      setDisplayedAd(data.message); // The message should contain the file URL
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  const fetchAds = async () => {
    try {
      const response = await fetch("/getAds");
      const data = await response.json();
      setAds(data);
    } catch (error) {
      console.error("Error fetching ads:", error);
    }
  };

  const handleSelectFile = () => {
    setIsModalOpen(true); // Open the modal to select an ad
  };

  const handleDisplayAd = () => {
    if (!selectedAd) {
      alert("Please select an advertisement first.");
      return;
    }
    if (!tvID) {
      alert("Please enter a TV ID.");
      return;
    }
    socket.emit("join_tv", tvID); // Join the specified TV room
    socket.emit("send_message", { message: selectedAd.FileUrl, tv: tvID });
    setIsModalOpen(false); // Close the modal
  };

  const handleAdSelection = (ad) => {
    setSelectedAd(ad);
    setIsModalOpen(false);
  };

  return (
    <div className="advertisement-display-container">
      <Navbar />
      <h2 className="title">Advertisement Display</h2>

      <div className="control-panel">
        <input
          placeholder="TV ID..."
          value={tvID}
          onChange={(event) => setTvID(event.target.value)}
        />
        <button onClick={handleSelectFile}>Select File</button>
        <button onClick={handleDisplayAd} disabled={!selectedAd || !tvID}>
          Push to TV
        </button>
      </div>

      <h3>Advertisement:</h3>
      {displayedAd && (
        <div className="displayed-ad-container">
          {displayedAd.startsWith("http") ? (
            <img src={displayedAd} alt="Displayed Ad" className="displayed-ad" />
          ) : (
            <p>Unsupported file type</p>
          )}
        </div>
      )}

      {/* Modal for Selecting Ads */}
      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3>Select an Advertisement</h3>
            <button onClick={() => setIsModalOpen(false)} className="close-btn">Close</button>
            <div className="ads-list">
              {ads.map((ad) => (
                <div
                  key={ad.FileId}
                  className="ad-card"
                  onClick={() => handleAdSelection(ad)}
                >
                  {ad.FileType && ad.FileType.startsWith("image") ? (
                    <img src={ad.FileUrl} alt={ad.FileName} className="ad-thumbnail" />
                  ) : ad.FileType && ad.FileType.startsWith("video") ? (
                    <video src={ad.FileUrl} controls className="ad-thumbnail" />
                  ) : (
                    <p>Unsupported file type</p>
                  )}
                  <p>{ad.FileName}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvertisementDisplay;
