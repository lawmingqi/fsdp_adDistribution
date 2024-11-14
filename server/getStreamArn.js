const { DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { dynamoDb } = require('./awsConfig');
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
            return data.Table.LatestStreamArn;
        }
        else {
            return null;
        }
    }
    catch (error) {
        console.error('Error retrieving stream info:', error);
    }
}

module.exports = retrieveStreamInfo;