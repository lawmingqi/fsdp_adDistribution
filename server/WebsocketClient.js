// Code for initialising the webSocket client, this is done on a different host 

const WebSocket = require('ws');

const setupWebSocketServer = function(server) {
    // Initialize the WebSocket server
    const wss = new WebSocket.Server({ server, path: '/ws' });

    // Event handler for WebSocket connections
    wss.on('connection', (ws) => {
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
};

module.exports = {
    setupWebSocketServer
};
