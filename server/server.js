<<<<<<< HEAD
const express = require('express');
const advertisementController = require('./AdvertisementController');
const cors = require('cors');
const { dynamoDb } = require('./awsConfig');
const ws = require("ws");
const { createProxyMiddleware } = require('http-proxy-middleware');
const WebSocketClient =  require('./WebsocketClient');
const http = require('http');
const dotenv = require('dotenv');
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand} = require('@aws-sdk/client-s3');
const { ScanCommand, PutCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
=======
const express = require("express");
const advertisementController = require("./AdvertisementController");
const cors = require("cors");
const { dynamoDb } = require("./awsConfig");
// const ws = require("ws"); 
// const WebSocketClient = require("./WebsocketClient");
const { Server } = require("socket.io");
const http = require("http");
const dotenv = require("dotenv");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const {
  ScanCommand,
  PutCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
>>>>>>> a89337572223796ac8cf939de38cdd9392bc7ded

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log("PORT", PORT);
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_tv", (tv) => {
    socket.join(tv); 
    console.log(`User ${socket.id} joined TV room: ${tv}`);
  });

  socket.on("send_message", (data) => {
    console.log(`Sending message to TV room: ${data.tv}`);
    io.to(data.tv).emit("receive_message", { message: data.message, tv: data.tv });
  });
});
app.use(express.json({ limit: "10mb" }));

// Helper function to generate pre-signed URL
app.post("/api/generate-presigned-url", async (req, res) => {
  const { FileName, FileType } = req.body;
  const FileId = uuidv4(); // Generate a unique identifier (FileId)
  console.log("FileId", FileId);
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: FileId,
    ContentType: FileType,
  });
  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log("url", url);
    res.setHeader("Content-Type", "application/json");
    res.json({ url, key: FileId, FileId });
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    res.status(500).json({ error: error.message });
  }
});

// Retrieve files from DynamoDB and generate pre-signed URLs for each item
app.get("/api/files", async (req, res) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_FILES,
    };
    const data = await dynamoDb.send(new ScanCommand(params));
    for (const item of data.Items) {
      const getObjectParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: item.FileId,
      };
      const command = new GetObjectCommand(getObjectParams);
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      item.FileUrl = url;
    }
    console.log("Metadata", data.$metadata);
    res.setHeader("Content-Type", "application/json");
    res.json(data.Items);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

<<<<<<< HEAD

app.get('/api/getfiles/:fileID', async (req,res) => {
  try{
    const fileID = req.params.fileID;
    console.log("fileID", fileID);
    const params = {
      TableName: process.env.DYNAMODB_TABLE_FILES,
      Key:{
        "FileId" : fileID
      }
    };

    const data = await dynamoDb.send(new GetCommand(params));
    console.log("data", data);
    const metadata = data.$metadata.httpStatusCode;
    switch (metadata){
      case 200:
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(data.Item);
        break;
      case 404:
        res.status(404).json({message: "File not found"});
      case 400:
        res.status(400).json({message: "Bad Request"});
      default:
        res.status(500).json({message: "Internal Server Error"});
        break;
    }
    
  }
  catch (err){
    console.error("Error fetching file:", err);
    res.status(500).json({message: "Internal Server Error"});
  }
})

// upload the advertisement to DynamoDB
app.put('/create/advertisements', async (req,res) => {
  // Destructure the properties of the request body
  const {templateId,Status,templateType,TemplateUrl} = req.body;
  try{
=======
// Upload advertisement metadata to DynamoDB
app.put("/create/advertisements", async (req, res) => {
  const { templateId, Status, templateType, TemplateUrl } = req.body;
  try {
>>>>>>> a89337572223796ac8cf939de38cdd9392bc7ded
    const params = {
      TableName: AdTemplates,
      Item: {
        templateId,
        CreatedDate: new Date.toISOString(),
        Status,
        templateType,
        TemplateUrl,
      },
    };
    const command = new PutObjectCommand(params);
    await dynamoDb.send(command);
    console.log(`Template with ID ${templateId} added successfully`);
    res.status(200).send("Template uploaded successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Upload file metadata to DynamoDB and S3
app.post("/api/upload-file", async (req, res) => {
  const { FileId, FileName, FileSize, FileType, FileUrl } = req.body;
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_FILES,
      Item: {
        FileId,
        FileName,
        FileSize,
        FileType,
        FileUrl,
        UploadDate: new Date().toISOString(),
      },
    };
    const command = new PutCommand(params);
    await dynamoDb.send(command);
    console.log(`File ${FileName} metadata saved to DynamoDB`);
    res.status(200).json({ message: "File uploaded successfully" });
  } catch (error) {
    console.error("Error uploading file metadata to DynamoDB:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete file from S3 and DynamoDB
app.delete("/api/delete-file/:fileKey", async (req, res) => {
  const { fileKey } = req.params;
  try {
    const deleteParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
    };
    await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log(`File ${fileKey} deleted from S3`);

    const deleteDynamoParams = {
      TableName: process.env.DYNAMODB_TABLE_FILES,
      Key: { FileId: fileKey },
    };
    await dynamoDb.send(new DeleteCommand(deleteDynamoParams));
    console.log(`File ${fileKey} deleted from DynamoDB`);

    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file from S3 and DynamoDB:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Routes for advertisements
app.post("/createAds", advertisementController.createAd);
app.put("/addTvs", advertisementController.addTv);
app.get("/getAds", advertisementController.retrieveAllAdvertisements);
app.post("/pushAdsToTv/:adID", advertisementController.pushTvAdvertisement);
app.delete("/deleteAd/:adID", advertisementController.deleteAd);

<<<<<<< HEAD
// Route for advertisements (post, get and delete all works)

app.post('/createAds',advertisementController.createAd);
app.get('/getAdID:/FileId',advertisementController.retrieveAdID)
app.put('/addTvs',advertisementController.addTv);
app.get('/getAds', advertisementController.retrieveAllAdvertisements);
app.post('/pushAdsToTv/:adID',advertisementController.pushTvAdvertisement);
app.delete('/deleteAd/:adID', advertisementController.deleteAd);
WebSocketClient.setupWebSocketServer(server);


app.listen(PORT, 'localhost', () => {
  console.log(`Server running on port ${PORT}`);
});
=======
// Commented out WebSocket setup for now
// WebSocketClient.setupWebSocketServer(server);
>>>>>>> a89337572223796ac8cf939de38cdd9392bc7ded



server.listen(PORT, () => {
<<<<<<< HEAD
  console.log(`WebSocket Server running on port ${PORT}`);
})

=======
  console.log(`Server is running on port ${PORT}`);
});


console.log("Socket.io server listening on port 5000");
>>>>>>> a89337572223796ac8cf939de38cdd9392bc7ded
