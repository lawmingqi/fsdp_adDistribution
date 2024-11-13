// Code for initialising the webSocket client, this is done on a different host 

// Store all connected clients in a hashmap with their corresponding id (id is taken from auth header or frontend side)
const WebSocket = require('ws');
const ClientManager = require('./ClientManager');
// Have to pass the instance of clientManaget from the websocket 
const wsClient = new ClientManager();

// Adding clients to the websocket 
const setupWebSocketServer = function(server) {
    // Initialize the WebSocket server
    const wss = new WebSocket.Server({ server, path: '/ws' });

    wss.on('connection', (ws,req) => {
        // recieve the message from the client after client is authenticated 
        ws.on('message', (message) => {
            const data = JSON.parse(message);
            const user_id = data.user_id;
            if(user_id == null) {
                ws.close();
                return;
            }
            else{
                const data = {
                    "user_id" : user_id,
                    "ws" : ws
                }
                wsClient.saveClient(data);
                sendToAllUsersConnected();
            }
        });
    })

    // Add the message retrieved from the client to client list 
};

const closeConnection = function(wsClient, user_id) {
    const ws = wsClient.getClient(user_id)
    ws.close();
}

const sendToAllUsersConnected = function(){
    const wsList = wsClient.getClientList();
    let count = 0;
    wsList.forEach((wsClientObj) => {
        count = count + 1;
        console.log(wsClientObj.user_id);
        const ws = wsClientObj.ws;
        ws.send(`Connected to the websocket user id ${wsClientObj.user_id}: `);
    })

    console.log(count);
    
    
    
}
// remove the connected client from the websocket 

module.exports = {
    setupWebSocketServer,
    wsClient
};
