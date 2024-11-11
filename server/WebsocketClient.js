// Code for initialising the webSocket client, this is done on a different host 

// Store all connected clients in a hashmap with their corresponding id (id is taken from auth header or frontend side)
const WebSocket = require('ws');

// Adding clients to the websocket 
const setupWebSocketServer = function(server) {
    // Initialize the WebSocket server
    const wss = new WebSocket.Server({ server, path: '/ws' });

    // Event handler for WebSocket connections
    wss.on('connection', (ws,req) => {
        console.log('Handshake Established');

        // This would be the data processed by DynamoDB stream
        ws.on('message', (message) => {
            console.log(`Received: ${message}`);

            // Broadcast the received message to all connected clients except the sender
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) { // Corrected WebSocket capitalization
                    client.send(message);
                }
            });
        });
    });

    // Update client based on the specific client id

    // Broadcast to multiple clients 
};

// remove the connected client from the websocket 

module.exports = {
    setupWebSocketServer
};
