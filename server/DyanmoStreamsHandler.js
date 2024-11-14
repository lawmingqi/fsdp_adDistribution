const { DescribeStreamCommand, GetShardIteratorCommand, GetRecordsCommand } = require('@aws-sdk/client-dynamodb-streams');
const { dbStreams } = require('./awsConfig');
require('dotenv');

class DynamoStreamsHandler {
    constructor(streamArn) {
        this.streamArn = streamArn;
        this.dynamoDBStreamClient = dbStreams;
        this.processedShards = new Set();  // Track processed shard IDs
        this.LastEvaluatedShardId = null;
    }

    // Retrieve all open shards in the DynamoDB stream
    async getStreamShards() {
        const streamParams = { StreamArn: this.streamArn };
        console.log("Getting stream shards for:", this.streamArn);
        const openShards = [];
        const dependency = [];
        try {
            do{
                const streamData = await this.dynamoDBStreamClient.send(new DescribeStreamCommand(streamParams));
                const shards = streamData.StreamDescription.Shards;
                const LastEvaluatedShardId = streamData.StreamDescription.LastEvaluatedShardId;
                for(const shard of shards) {
                    if (!shard.SequenceNumberRange.EndingSequenceNumber) {
                        openShards.push(shard);
                    }
                }
                openShards.forEach(shard => {
                    const { ParentShardId, ShardId } = shard;
                    
                    if(ParentShardId){
                        const parentMap = {};
                        parentMap[ParentShardId] = [];
                        parentMap[ParentShardId].push(ShardId);
                        dependency.push(parentMap);

                    }
                    else {
                        // no parent
                        dependency.push(ShardId);
                    }
                });
            }

            while(this.LastEvaluatedShardId == null)
            
            

            return dependency;  // Returns the list of open shards
        } catch (err) {
            console.error('Error describing stream:', err);
            throw err;
        }
    }

    // Helper function to check if a shard is empty
    isShardEmpty(records) {
        return !records || records.length === 0;
    }

    // Get shard iterator for a specific shard ID
    async getShardIterator(shardId, iteratorType = 'TRIM_HORIZON') {
        try {
            const shardIteratorParams = {
                ShardId: shardId,
                ShardIteratorType: iteratorType,
                StreamArn: this.streamArn
            };
            const shardIteratorResult = await this.dynamoDBStreamClient.send(new GetShardIteratorCommand(shardIteratorParams));
            return shardIteratorResult.ShardIterator;
        } catch (err) {
            console.error('Error getting shard iterator:', err);
            throw err;
        }
    }

    // Process records within a shard
    
    async processShard(shardId) {
        let emptyAttemptCount = 0; // Counter for consecutive empty attempts
        const maxEmptyAttempts = 5; // Maximum number of empty attempts before breaking
        try {
            console.log("Processing shard:", shardId);
    
            // Check if this shard has already been processed
            if (this.processedShards.has(shardId)) {
                console.log(`Skipping already processed shard: ${shardId}`);
                return [];
            }
    
            // Retrieve the starting shard iterator
            let currentShardIterator = await this.getShardIterator(shardId, 'TRIM_HORIZON');
            const allProcessedRecords = [];
    
            while (currentShardIterator) {
                // Fetch records from the current shard iterator
                const result = await this.dynamoDBStreamClient.send(new GetRecordsCommand({ ShardIterator: currentShardIterator }));
    
                // Check if the shard is empty; if so, log and continue to next iterator batch
                if (this.isShardEmpty(result.Records)) {
                    console.log(`Shard ${shardId} is empty. Moving to next batch.`);
                    emptyAttemptCount++;
                    if (emptyAttemptCount >= maxEmptyAttempts) {
                        console.log(`Reached maximum empty attempts for shard ${shardId}. Breaking.`);
                        break;
                    }
                } 
                else {
                    // Process each record if there are records present
                    result.Records.forEach(record => {
                        const processedRecord = this.processRecord(record); // Process each record individually
                        allProcessedRecords.push(processedRecord); // Collect processed records
                    });
                }
    
                // Update the iterator to the next batch of records in the shard
                currentShardIterator = result.NextShardIterator;
    
                // If `NextShardIterator` is `null`, we have reached the end of the shard
                if (currentShardIterator == null) {
                    console.log(`Completed processing shard: ${shardId}`);
                    this.processedShards.add(shardId);  // Mark this shard as fully processed
    
                    // Set LastEvaluatedShardId to the last processed shard
                    this.lastEvaluatedShardId = shardId;
                    
                    break;  // Exit the loop since there's no more data
                }
            }

            this.lastEvaluatedShardId = shardId;
            console.log(`Completed processing shard: ${shardId}`);
    
            return allProcessedRecords; // Return all processed records from this shard
        } catch (err) {
            console.error('Error processing shard:', err);
            throw err;
        }
    }
    

    // Process individual records and return the result
    processRecord(record) {
        
        const eventType = record.eventName;
        let result;

        switch (eventType) {
            case 'INSERT':
                result = record.dynamodb.NewImage;
                break;
            case 'MODIFY':
                result = record.dynamodb.NewImage;
                break;
            case 'REMOVE':
                result = record.dynamodb.OldImage;
                break;
            default:
                result = null;
                break;
        }
        
        return result;  // Return the processed record
    }

    // Main function to process the entire stream
    async processStream() {
        try {
            const openShards = await this.getStreamShards();
            const allShardRecords = [];
            console.log("Open shards:", openShards);

            for (const shards of openShards) {
                if(typeof shards === 'object'){
                    const childShards = Object.values(shards)[0][0];
                    const parentShard = Object.keys(shards)[0];
                    // Process parent shard first
                    const parentRecords = await this.processShard(parentShard);
                    if(parentRecords){
                        const childRecords = await this.processShard(childShards);
                        allShardRecords.push(...childRecords);
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            }

            
        } catch (error) {
            console.error("Error processing stream:", error);
            throw error;
        }
    }
}

module.exports = DynamoStreamsHandler;
