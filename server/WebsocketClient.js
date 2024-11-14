// Code for initialising the webSocket client, this is done on a different host 

// Store all connected clients in a hashmap with their corresponding id (id is taken from auth header or frontend side)
const WebSocket = require('ws');
const ClientManager = require('./ClientManager');
// Have to pass the instance of clientManaget from the websocket 
const wsClient = new ClientManager();

// Allowed origins 
const allowedOrigin = 'localhost:5000'
// Adding clients to the websocket 
const setupWebSocketServer = function(server) {
    // fo not upgrade to the server automatically
    const wss = new WebSocket.Server({ noServer: true });
    // Initialize the WebSocket server
    try{
        server.on('upgrade', (req, socket, head) => {
            // Check the req 
            console.log(req);
            console.log('Upgrade request received');
            // Check the request header for the websocket (Handle the upgrade process)
            // Ensure all requests headers are for websocket connections
            const headers = req.headers;
            console.log(headers);
            if (!req.headers.connection === "Upgrade" || req.headers.upgrade.toLowerCase() != 'websocket'){
                console.log('Invalid request headers');
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
            }
            if(headers.host == allowedOrigin) {
                console.log('Origin is allowed');
                wss.handleUpgrade(req, socket, head, (ws) => {
                    wss.emit('connection', ws, req);
                    onConnect(ws, req);
                });
            }
            else {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
            }
        });
    }
    catch(err){
        console.log(err);
    }
    

    // Add the message retrieved from the client to client list 
};

const closeConnection = function(wsClient, user_id) {
    const ws = wsClient.getClient(user_id)
    ws.close();
}

const onConnect = function(ws, req){
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
