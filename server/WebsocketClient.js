// Code for initialising the webSocket client, this is done on a different host 

// Store all connected clients in a hashmap with their corresponding id (id is taken from auth header or frontend side)
const ClientManager = require('./ClientManager');
// Have to pass the instance of clientManaget from the websocket 
const wsClient = new ClientManager();
const WebSocket = require('ws');
const allowedOrigin = ['http://localhost:3000/',
    'localhost:5000', 
    'https://fsdp-addistribution-frontend.onrender.com']
    
// Adding clients to the websocket 
const setupWebSocketServer = function(server) {
    // fo not upgrade to the server automatically
    const wss = new WebSocket.Server({ noServer: true });
    wss.on('error', (err) => {
        console.log('WebSocket server error:', err);
    });
    
    let allow  = false;
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
            for (const origin of allowedOrigin) {
                if(headers.origin == origin) {
                    console.log('Origin is allowed: ',headers.origin);
                    wss.handleUpgrade(req, socket, head, (ws) => {
                        wss.emit('connection', ws, req);
                        onConnect(ws, req);
                        allow = true
                    });
                }
                
            }

            if (allow == false) {
                console.log('Origin is not allowed');
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
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
                "client_id" : user_id,
                "ws" : ws
            }
            wsClient.saveClient(data);
        }
    });
}

const sendUsersConnected = function(tvList,ads){
    const wsList = wsClient.getClientList();
    console.log("This is tvList: ",tvList);
    console.log(wsList);
    const data = {
        "adContent" : ads.adContent,
        "uploadedDate" : new Date().toISOString
    }
    wsList.forEach((client) => {
       const client_id = client.client_id;
       console.log("This is client_id: ", client_id);
       tvList.forEach((tv) => {
            if(tv == client_id){
                console.log("tv found");
                client.ws.send(JSON.stringify(data));
            }
        });
    });

}
// remove the connected client from the websocket 

module.exports = {
    setupWebSocketServer,
    sendUsersConnected,
};
