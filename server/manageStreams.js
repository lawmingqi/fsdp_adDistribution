// Module for capturing changes made to dynamoDB 
// You'll import the Websocket client 
const {DynamoDBStreamsClient} = require('@aws-sdk/client-dynamodb-streams')
const { dynamoDb } = require('./awsConfig');
require('dotenv');
const wsClient = require('./WebsocketClient');
const DynamoDBStream = new DynamoDBStreamsClient({region: process.env.AWS_REGION});

// create a helperFunction it should return the stream information 

// change the logic to process asynchronusly the streams so i don't care which order the streams are in

// ah use async and await 
const retrieveStreamInfo = async (tableName,id) => {
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
                            "ShardIteratorType": "LATEST", // Order is by time based sequence 
                            "StreamArn": streamArn,
                        };

                        console.log(shardParams);

                        processShard(shardParams,tableName,id);
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error retrieving stream info:", error);
    }
};

const processShard = async(shard,tableName,id) => {
    // call the get iterator method for the shard 
    const data = await DynamoDBStream.GetShardIterator(shard);
    try{
        // Create a temp variable to store the data 
        let shardIterator = data;
        // a while loop to update shardIterator with nextShardIterator field (getNextIterator)
        while(shardIterator != null){
            // call get records
            const result = await DynamoDBStream.GetRecords({ShardIterator: shardIterator}).promise();
            // call the process record method 
            const records = result.Records;
            processRecords(records,tableName,id);
            // Update the shard iterator 
            shardIterator = result.NextShardIterator;

        }
    }
    catch(error){
        console.error(err);
    }
}

// This is where we extract the sharded data in the Records json array and call the Websocket client 
const processRecords = async (Records,tableName,id) => {
    // Process each record in the stream
    Records.forEach(record => {
        // Extract the DynamoDB data from the record
        const dynamoDBData = record.dynamodb;

        // Check if dynamoDBData exists
        if (dynamoDBData != null) {
            const eventName = dynamoDBData.eventName;

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
                        if(newData["Keys"]["adID"]["S"] == id){
                            const tvList = newData["NewImage"]["assignedTvs"]["SS"];
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
                        else {
                            console.log('Id not found moving to next record');
                        }
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

