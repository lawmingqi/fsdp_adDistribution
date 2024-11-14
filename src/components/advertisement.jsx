import io from "socket.io-client";
import { useEffect, useState } from "react";
const socket = io.connect("http://localhost:5000"); // Ensure this is the correct port

const AdvertisementDisplay = () => {
  const [tv, setTv] = useState("");
  const [message, setMessage] = useState("");
  const [messageReceived, setMessageReceived] = useState("");

  const joinTv = () => {
    if (tv !== "") {
      socket.emit("join_tv", tv);
    }
  };

  const sendMessage = () => {
    socket.emit("send_message", { message, tv });
  };

  useEffect(() => {
    // Set up the event listener only once
    socket.on("receive_message", (data) => {
      if (data.tv === tv) {
        setMessageReceived(data.message);
      }
    });

    // Clean up to avoid multiple listeners
    return () => {
      socket.off("receive_message");
    };
  }, [tv]);

  return (
    <div>
      <h2>Advertisement Display</h2>
      <div className="AdvertisementDisplay">
        <input
          placeholder="TV ID..."
          onChange={(event) => {
            setTv(event.target.value);
          }}
        />
        <button onClick={joinTv}>Set TV</button>

        <input
          placeholder="Message..."
          onChange={(event) => {
            setMessage(event.target.value);
          }}
        />
        <button onClick={sendMessage}>Send Message</button>
        <h1>Message: </h1>
        {messageReceived}
      </div>
    </div>
  );
};

export default AdvertisementDisplay;
