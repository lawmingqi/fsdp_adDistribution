// Code for initialising the webSocket client, this is done on a different host 

// Store all connected clients in a hashmap with their corresponding id (id is taken from auth header or frontend side)
const ClientManager = require('./ClientManager');
// Have to pass the instance of clientManaget from the websocket 
const wsClient = new ClientManager();
const WebSocket = require('ws');
const allowedOrigins = ['http://localhost:3000/',
    'https://fsdp-addistribution-frontend.onrender.com'
];
    
const locations = {}

// Adding clients to the websocket 
const setupWebSocketServer = (server) => {
    const wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
        const origin = req.headers.origin;
        if (!allowedOrigins.includes(origin)) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
            onConnect(ws, req);
        });
    });

    const onConnect = (ws, req) => {
        ws.on('message', (message) => {
            const data = JSON.parse(message);
            if (data.type === 'register') {
                // Register TV to a location
                const { tvID, location } = data;
                if (!locations[location]) {
                    locations[location] = [];
                }
                if (!locations[location].includes(tvID)) {
                    locations[location].push(tvID);
                    wsClient.saveClient({ client_id: tvID, ws });
                }
            } else if (data.type === 'updateAd') {
                // Update ad for specific TVs or all TVs in a location
                const { location, tvIDs, adContent } = data;
                const targetTVs = tvIDs || locations[location] || [];
                targetTVs.forEach((tvID) => {
                    const client = wsClient.getClient(tvID);
                    if (client) {
                        client.ws.send(JSON.stringify({ type: 'adUpdate', adContent }));
                    }
                });
            }
        });

        ws.on('close', () => {
            // Remove disconnected clients
            wsClient.removeClient(ws);
        });
    };
};

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
