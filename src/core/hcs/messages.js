const { 
  TopicMessageSubmitTransaction, 
  TopicMessageQuery,
  TopicId,
  Status
} = require("@hashgraph/sdk");
const hederaConfig = require('../../config/hedera');
const topics = require('./topics');
const serializer = require('../hcs10/serializer');

// Constants for retry mechanism
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Submit a message to the specified topic with retry mechanism
 */
async function submitMessage(topicIdStr, message, attempt = 1) {
  const client = hederaConfig.getClient();
  const topicId = TopicId.fromString(topicIdStr);
  
  try {
    // Validate that the topic exists first
    await topics.getTopicInfo(topicIdStr);
    
    // Serialize the message according to HCS-10 standard
    const messageBytes = await serializer.serializeMessage(message);
    
    // Create the transaction
    const transaction = new TopicMessageSubmitTransaction({
      topicId: topicId,
      message: messageBytes
    });
    
    // Sign and submit the transaction
    const txResponse = await transaction.execute(client);
    
    // Get the receipt with retry for network issues
    const receipt = await txResponse.getReceipt(client);
    
    if (receipt.status !== Status.Success) {
      throw new Error(`Transaction failed with status: ${receipt.status}`);
    }
    
    return {
      transactionId: txResponse.transactionId.toString(),
      sequenceNumber: receipt.topicSequenceNumber.toString()
    };
  } catch (error) {
    if (attempt < MAX_RETRIES && isRetryableError(error)) {
      await delay(RETRY_DELAY);
      return submitMessage(topicIdStr, message, attempt + 1);
    }
    throw new Error(`Failed to submit message: ${error.message}`);
  }
}

/**
 * Get messages from a topic with improved error handling
 */
async function getMessages(topicIdStr, startTime = null, endTime = null) {
  const now = new Date();
  const defaultStartTime = new Date(now.getTime() - 60 * 60 * 1000);
  
  const start = startTime || defaultStartTime;
  const end = endTime || now;
  
  const mirrorNodeUrl = hederaConfig.getMirrorNodeUrl();
  const axios = require('axios');
  
  try {
    const response = await axios.get(`${mirrorNodeUrl}/api/v1/topics/${topicIdStr}/messages`, {
      params: {
        'timestamp': `gte:${start.toISOString()},lte:${end.toISOString()}`,
        'order': 'asc',
        'limit': 100
      },
      timeout: 5000 // 5 second timeout
    });
    
    return await Promise.all(response.data.messages.map(async (msg) => {
      const messageBytes = Buffer.from(msg.message, 'base64');
      try {
        const deserializedMessage = await serializer.deserializeMessage(messageBytes);
        return {
          consensusTimestamp: msg.consensus_timestamp,
          topicSequenceNumber: msg.sequence_number,
          message: deserializedMessage
        };
      } catch (error) {
        console.warn(`Error deserializing message ${msg.sequence_number}:`, error);
        return {
          consensusTimestamp: msg.consensus_timestamp,
          topicSequenceNumber: msg.sequence_number,
          error: error.message,
          raw: messageBytes
        };
      }
    }));
  } catch (error) {
    if (error.response) {
      throw new Error(`Mirror node error: ${error.response.data.message || 'Unknown error'}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Mirror node request timed out');
    } else {
      throw new Error(`Network error: ${error.message}`);
    }
  }
}

/**
 * Subscribe to messages on a topic with automatic reconnection
 */
function subscribeToTopic(topicIdStr, callback) {
  const client = hederaConfig.getClient();
  const topicId = TopicId.fromString(topicIdStr);
  let currentSubscription = null;
  let isReconnecting = false;
  
  function subscribe() {
    try {
      const subscription = new TopicMessageQuery()
        .setTopicId(topicId)
        .subscribe(client, null, (error) => {
          if (error) {
            console.error(`Subscription error for topic ${topicIdStr}:`, error);
            handleReconnection();
          }
        });

      subscription.on('data', async (message) => {
        try {
          const deserializedMessage = await serializer.deserializeMessage(message.contents);
          callback({
            consensusTimestamp: message.consensusTimestamp,
            topicSequenceNumber: message.sequenceNumber,
            message: deserializedMessage
          });
        } catch (error) {
          console.warn("Error processing subscription message:", error);
          callback({
            consensusTimestamp: message.consensusTimestamp,
            topicSequenceNumber: message.sequenceNumber,
            error: error.message,
            raw: message.contents
          });
        }
      });

      currentSubscription = subscription;
    } catch (error) {
      console.error(`Error creating subscription for topic ${topicIdStr}:`, error);
      handleReconnection();
    }
  }

  async function handleReconnection() {
    if (isReconnecting) return;
    isReconnecting = true;

    try {
      if (currentSubscription) {
        await currentSubscription.unsubscribe();
      }
    } catch (error) {
      console.warn('Error unsubscribing:', error);
    }

    // Wait before attempting to reconnect
    await delay(RETRY_DELAY);
    subscribe();
    isReconnecting = false;
  }

  // Initial subscription
  subscribe();

  return {
    unsubscribe: async () => {
      if (currentSubscription) {
        await currentSubscription.unsubscribe();
      }
    }
  };
}

// Helper functions
function isRetryableError(error) {
  return error.message.includes('network') || 
         error.message.includes('timeout') ||
         error.message.includes('busy') ||
         error.code === 'ECONNABORTED';
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  submitMessage,
  getMessages,
  subscribeToTopic
};