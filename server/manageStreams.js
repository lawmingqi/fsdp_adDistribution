// Module for capturing changes made to dynamoDB 
// You'll import the Websocket client 
const {DynamoDBStreamsClient, DescribeStreamCommand, GetShardIteratorCommand, GetRecordsCommand} = require('@aws-sdk/client-dynamodb-streams')
const { dynamoDb } = require('./awsConfig');
require('dotenv');
const wsClient = require('./WebsocketClient');
const { DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const DynamoDBStream = new DynamoDBStreamsClient({region: process.env.AWS_REGION});

// create a helperFunction it should return the stream information 

// Decouple the code by identifying the subject, observers
// change the logic to process asynchronusly the streams so i don't care which order the streams are in
let lastEvaluatedShardId = null;
// ah use async and await 
const retrieveStreamInfo = async (tableName) => {
    try {
        // Get the list of streams 
        const params = {
            TableName: tableName,
        };
        const data = await dynamoDb.send(new DescribeTableCommand(params));
        // Check if streams are enabled
        const streamSpec = data.Table.StreamSpecification;
        if (streamSpec.StreamEnabled === true) {
            // Now retrieve the streamArn
            const streamArn = data.Table.LatestStreamArn;
            // Get the current stream description
            const streamParams = {
                "ExclusiveStartShardId": lastEvaluatedShardId,
                "Limit": 5,
                "StreamArn": streamArn
            };

            getShard(streamParams,tableName);
        }
        else {
            console.log("Streams are not enabled for this table.");
        }
    } 
    catch (error) {
        console.error("Error retrieving stream info:", error);
    }
};



const getShard = async (streamParams,tableName) => {
    try {
       do{
            const streamData = await DynamoDBStream.send(new DescribeStreamCommand(streamParams));
            const shards = streamData.StreamDescription.Shards;
            // Filter the list of shards to only include those without an ending sequence number
            const openShards = shards.filter(shard => !shard.SequenceNumberRange.EndingSequenceNumber);
            console.log(openShards);
            for(shard of openShards){
                if(!shard.ParentShardId){
                    console.log(`This is the root shard ${shard.ShardId}`)
                }
                else {
                    console.log(`This is a child shard and this is the parent's shard id ${shard.ParentShardId}`)
                }
               
                const shardIteratorParams = {
                    ShardId: shard.ShardId,
                    ShardIteratorType: 'LATEST',
                    StreamArn: streamParams.StreamArn
                };
                const shardIteratorResult = await DynamoDBStream.send(new GetShardIteratorCommand(shardIteratorParams));
                let currentShardIterator = shardIteratorResult.ShardIterator;
                await processShard(currentShardIterator, tableName);
            }
        }

        while(lastEvaluatedShardId != null);
    }

    catch (err){
        console.error('Error getting shard:', err);
        throw err;  // Propagate the error up
    }
}


const processShard = async (currentShardIterator,tableName) => {
    try {
        // Initial shard iterator (starting point for reading the shard)
        let shardIterator = currentShardIterator;

        console.log(`This is my current shard iterator for the current shard id ${currentShardIterator}`);
        
        // Loop to iterate over the shard
        let processedRecords = 0;
        console.log(`Number of processed records is: ${processedRecords}`);
        
        while (shardIterator != null) {
            // Get records from the shard
            const result = await DynamoDBStream.send(new GetRecordsCommand({ ShardIterator: shardIterator }))
            console.log("This is my result:", JSON.stringify(result));
            
            // If there are no records, skip this iteration and continue to the next shard
            if (!result.Records || result.Records.length === 0) {
                console.log(`No records in shard, skipping...`);
                shardIterator = result.NextShardIterator; // Move to the next shard
                continue; // Skip processing this shard
            }

            // Process records if any are present
            console.log(`Processing records from shard ${shardIterator}`);
            const records = await processRecords(result.Records, tableName); // Your processing function for records
            console.log(`Processed records: ${records}`);
            console.log(`Processed ${result.Records.length} records from shard ${shardIterator}`);

            // Update the shard iterator to continue reading
            shardIterator = result.NextShardIterator;

            // If NextShardIterator is null, break the loop to avoid hanging
            if (shardIterator === null) {
                console.log(`No more records in shard`);
                break;
            }
        }

        // Check if there is currently an ExclusiveStartShardId
        const describeStreamResult = await DynamoDBStream.send(new DescribeStreamCommand({ StreamArn: streamParams.StreamArn }));
        const lastEvaluatedShardId = describeStreamResult.ExclusiveStartShardId;
        console.log(`Last evaluated shard ID: ${lastEvaluatedShardId}`);

    } catch (err) {
        console.error('Error processing shard:', err);
        throw err;  // Propagate the error up
    }
};



// This is where we extract the sharded data in the Records json array and call the Websocket client 
const processRecords = async (Records,tableName) => {
    console.log(Records);
    Records.forEach(record => {
        // Extract the DynamoDB data from the record
        const dynamoDBData = record.dynamodb;
        // Check if dynamoDBData exists
        if (dynamoDBData != null) {
            const eventName = dynamoDBData.eventName;
            return eventName;
            let newData = {};

            // Handle different types of DynamoDB stream events (INSERT, MODIFY, REMOVE)
            switch (eventName) {
                case 'INSERT':
                    newData["NewImage"] = dynamoDBData["NewImage"];
                    newData["Keys"] = dynamoDBData["Keys"];
                    break;
                case 'MODIFY':
                    newData["NewImage"] = dynamoDBData["NewImage"];
                    newData["Keys"] = dynamoDBData["Keys"];
                    break;
                case 'REMOVE':
                    newData["NewImage"] = dynamoDBData["NewImage"];
                    newData["Keys"] = dynamoDBData["Keys"];
                    break;
                default:
                    break;
            }
            // Another switch case statement to handle the different key attributes (This is the linking part for each client
            if(newData != null){
                let data = {};
                switch(tableName)
                {
                    case 'Advertisement':
                            const tvList = newData["NewImage"]["assignedTvs"]["L"];
                            // data["adTitle"] = newData["NewImage"]["adTitle"]["S"];
                            // data["adType"] = newData["NewImage"]["adType"]["S"];
                            data["adContent"] = newData["NewImage"]["adContent"]["M"];
                            // data["uploadDatee"] = newData["NewImage"]["uploadDate"]["S"];
                            tvList.forEach(tvIDs => {
                                // Call the websocket client function here with newData
                                const clientID = tvIDs.string;
                                const ws = wsClient.getClient(clientID);
                                if(ws.readyState === WebSocket.OPEN){
                                    ws.send(data);
                                }
                                else {
                                    console.log('WebSocket connection is closed');
                                }
                            })
                }
            }
            else {
                console.log("Unable to retrive tableName from the dynamoDB describe table operation")
            }

            // You can now handle the data (e.g., send it to WebSocket clients, log it, etc.)
            console.log('Processed data:', newData);
            // Example: You can call the websocket client function here with newData
        } else {
            console.log("No changes or modifications made to the database");
        }
    });
};


module.exports = {
    retrieveStreamInfo
}

