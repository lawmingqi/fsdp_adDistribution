// Module for capturing changes made to dynamoDB 
// You'll import the Websocket client 
const {DynamoDBStreamsClient} = require('@aws-sdk/client-dynamodb-streams')
const { dynamoDb } = require('./awsConfig');
require('dotenv');
const DynamoDBStream = new DynamoDBStreamsClient({region: process.env.AWS_REGION});

// create a helperFunction it should return the stream information 

// ah use async and await 
const retrieveStreamInfo = async (tableName) => {
    try {
        // Get the list of streams 
        const params = {
            TableName: tableName,
        };
        const data = await dynamoDb.describeTable(params).promise();

        // Check if streams are enabled
        const streamSpec = data.Table.StreamSpecification;
        if (streamSpec.StreamEnabled === true) {
            // Now retrieve the streamArn
            const streamArn = data.Table.LatestStreamArn;
            // Get the current stream description
            const streamParams = {
                "ExclusiveStartShardId": null,
                "Limit": 5,
                "StreamArn": streamArn
            };

            const streamData = await DynamoDBStream.describeStream(streamParams).promise();
            if (streamData != null) {
                // Iterate over each shard and call the processShards method
                const shardArray = streamData.StreamDescription.Shards;
                if (shardArray.length !== 0) {
                    shardArray.forEach(shard => {
                        // Call the processShard method
                        const shardParams = {
                            "ShardId": shard.ShardId,
                            "SequenceNumber": shard.SequenceNumberRange.StartingSequenceNumber,
                            "ShardIteratorType": "LATEST",
                            "StreamArn": streamArn
                        };

                        processShard(shardParams);
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error retrieving stream info:", error);
    }
};

const processShard = async(Shard) => {
    // call the get iterator method for the shard 
    const data = await DynamoDBStream.GetShardIterator(Shard)
    try{
        // Create a temp variable to store the data 
        let shardIterator = data;
        // a while loop to update shardIterator with nextShardIterator field (getNextIterator)
        while(shardIterator != null){
            // call get records
            const result = await DynamoDBStream.GetRecords({ShardIterator: shardIterator}).promise();
            // call the process record method 
            const records = result.Records;
            processRecords(records)
            // Update the shard iterator 
            shardIterator = result.NextShardIterator;

        }
    }
    catch(error){
        console.error(err);
    }
}

// This is where we extract the sharded data in the Records json array and call the Websocket client 
const processRecords = async(Records) => { 
    // Open the websocket connection based on INSERTION, DELETION AND UPDATE 
    const dynamoDBData = Records.dynamoDB;
    // INSERT
    if("NewImage" in dynamoDBData && !("OldImage" in dynamoDBData)){
        // call the update pass NewImage
        const data = {
            "NewImage" : dynamoDBData.NewImage
        }
        // call the websocketclient 
        
    }
    // DELETE 
    else if (!("NewImage" in dynamoDBData) && "OldImage" in dynamoDBData){
        // call the update pass NewImage
        const data = {
            "NewImage" : dynamoDBData.NewImage
        }
    }
    // UPDATE 
    else if ("NewImage" in dynamoDb && "OldImage" in dynamoDBData){
        // pass the new item in (Update PurObjectCommand) item has been updated 
        const data = {
            "NewImage" : dynamoDBData.NewImage
        }
    }
    else {
        console.WriteLine("Websocket connection closed")
    }
    
}