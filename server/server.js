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

// The idea behind linking s3 and dynamoDB together is with a same ID (uuidv4) This would be the partition key and the id for dynamo and s3 bucket respectively

app.use(cors({
  origin: ['http://localhost:3000',"ws://localhost:3000"], // use frontend url
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// helper function to generate pre-signed URL
app.post('/api/generate-presigned-url', async (req, res) => {
  const { FileName, FileType } = req.body;
  const FileId = uuidv4(); // Generate a unique identifier (FileId)
  console.log("FileId", FileId);
  // Put the FileID into s3 and generate a presigned Url (allows anyone to access the aws s3 bucket for a limited time)
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: FileId,
    ContentType: FileType,
  });
  try {
    const url = await getSignedUrl(s3Client, command , {expiresIn: 3600});
    console.log("url", url);
    res.setHeader('Content-Type', 'application/json');
    res.json({ url, key: FileId, FileId }); // Return FileId to be used as S3 key and in DynamoDB
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// get files from DynamoDB and generate presigned URL's for each data 
app.get('/api/files', async (req, res) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_FILES,
    };
    const data = await dynamoDb.send(new ScanCommand(params));
    // Generating a signed url for each of the files stored in dynamoDB
    for (const item of data.Items){
      // create a get
      const getObjectParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: item.FileId,
      };
      const command = new GetObjectCommand(getObjectParams);
      const url = await getSignedUrl(s3Client,command,{expiresIn: 3600});
      // Dynamically generate the signed url and assign to the File.url property
      item.FileUrl = url;
    }
    console.log("Metadata",data.$metadata);
    res.setHeader('Content-Type', 'application/json'); // Ensure JSON header
    res.json(data.Items);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: 'Internal server error'});
  }
});


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
    const params = {
      TableName: AdTemplates,
      Item: {
        templateId,
        CreatedDate : new Date.toISOString(),
        Status,
        templateType,
        TemplateUrl,
      }
    }

    const command = new PutObjectCommand(params);
    await dynamoDb.send(command);
    console.log(`The template with the templateID ${templateId} has been successfully added`);
    res.status(200).send('Template uploaded sucessfully');
  }
  catch(error){
    console.error(error);
    res.status(500).send("Internal Server Error")
  }
})


// upload file metadata to DynamoDB As well as presigned url 
app.post('/api/upload-file', async (req, res) => {
  const { FileId, FileName, FileSize, FileType, FileUrl} = req.body;

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

    console.log(params);

    const command = new PutCommand(params);
    await dynamoDb.send(command);
    console.log(`File ${FileName} metadata saved to DynamoDB`);

    res.status(200).json({ message: 'File uploaded successfully' });
  } catch (error) {
    console.error('Error uploading file metadata to DynamoDB:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// delete file from S3 and DynamoDB
app.delete('/api/delete-file/:fileKey', async (req, res) => {
  const { fileKey } = req.params;
  try {
    const deleteParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey, 
    };

    // delete file from S3
    await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log(`File ${fileKey} deleted from S3`);

    const deleteDynamoParams = {
      TableName: process.env.DYNAMODB_TABLE_FILES,
      Key: { FileId: fileKey },  // Use FileId as the partition key in DynamoDB
    };

    // Delete the file metadata from DynamoDB
    await dynamoDb.send(new DeleteCommand(deleteDynamoParams));
    console.log(`File ${fileKey} deleted from DynamoDB`);

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file from S3 and DynamoDB:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//Create a proxy httpServer to access localhost:5000 from ddi
const server = http.createServer(app);

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



server.listen(PORT, () => {
  console.log(`WebSocket Server running on port ${PORT}`);
})

