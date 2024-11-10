const express = require('express');
const cors = require('cors');
const { dynamoDb } = require('./awsConfig');
const dotenv = require('dotenv');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { ScanCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.use(cors({
  origin: 'http://localhost:3000', // use frontend url
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// helper function to generate pre-signed URL
const generatePresignedUrl = async (bucketName, key, contentType, expiresIn = 300) => {
  const params = {
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  };
  const command = new PutObjectCommand(params);
  return await getSignedUrl(s3Client, command, { expiresIn });
};

// get files from DynamoDB
app.get('/api/files', async (req, res) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_FILES,
    };
    const data = await dynamoDb.send(new ScanCommand(params));
    res.setHeader('Content-Type', 'application/json'); // Ensure JSON header
    res.json(data.Items);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// generate pre-signed URL for uploading files to S3
app.post('/api/generate-presigned-url', async (req, res) => {
  const { FileName, FileType } = req.body;
  const FileId = uuidv4(); // Generate a unique identifier (FileId)

  try {
    const url = await generatePresignedUrl(process.env.S3_BUCKET_NAME, FileId, FileType, 300);
    res.setHeader('Content-Type', 'application/json');
    res.json({ url, key: FileId, FileId }); // Return FileId to be used as S3 key and in DynamoDB
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// upload file metadata to DynamoDB
app.post('/api/upload-file', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
