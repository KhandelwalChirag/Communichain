import { 
  TopicCreateTransaction, 
  TopicUpdateTransaction,
  TopicDeleteTransaction,
  TopicInfoQuery,
  Status,
  PrivateKey,
  TopicId
} from "@hashgraph/sdk";
import hederaConfig from '../../config/hedera.js';
import axios from 'axios';

// Cache topic info to reduce network calls
const topicInfoCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Create a new HCS topic with optional memo and submit key
 */
async function createTopic(memo = '', submitKey = null) {
  const client = hederaConfig.getClient();
  
  try {
    let transaction = new TopicCreateTransaction();

    if (memo) {
      transaction.setTopicMemo(memo);
    }

    if (submitKey) {
      if (typeof submitKey === 'string') {
        submitKey = PrivateKey.fromString(submitKey);
      }
      transaction.setSubmitKey(submitKey.publicKey);
    }

    // Execute the transaction
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    if (receipt.status !== Status.Success) {
      throw new Error(`Failed to create topic: ${receipt.status}`);
    }

    const topicId = receipt.topicId.toString();

    // Cache the topic info
    await updateTopicInfoCache(topicId);

    return topicId;
  } catch (error) {
    throw new Error(`Error creating topic: ${error.message}`);
  }
}

/**
 * Update an existing topic's properties
 */
async function updateTopic(topicId, memo = null, submitKey = null) {
  const client = hederaConfig.getClient();
  
  try {
    let transaction = new TopicUpdateTransaction()
      .setTopicId(topicId);

    if (memo !== null) {
      transaction.setTopicMemo(memo);
    }

    if (submitKey !== null) {
      if (typeof submitKey === 'string') {
        submitKey = PrivateKey.fromString(submitKey);
      }
      transaction.setSubmitKey(submitKey.publicKey);
    }

    // Execute the transaction
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    if (receipt.status !== Status.Success) {
      throw new Error(`Failed to update topic: ${receipt.status}`);
    }

    // Invalidate cache
    topicInfoCache.delete(topicId);

    return receipt;
  } catch (error) {
    throw new Error(`Error updating topic: ${error.message}`);
  }
}

/**
 * Delete a topic (mark for deletion)
 */
async function deleteTopic(topicId) {
  const client = hederaConfig.getClient();
  
  try {
    const transaction = new TopicDeleteTransaction()
      .setTopicId(topicId);

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    if (receipt.status !== Status.Success) {
      throw new Error(`Failed to delete topic: ${receipt.status}`);
    }

    // Remove from cache
    topicInfoCache.delete(topicId);

    return receipt;
  } catch (error) {
    throw new Error(`Error deleting topic: ${error.message}`);
  }
}

/**
 * Get information about a topic with caching
 */
async function getTopicInfo(topicId) {
  // Check cache first
  const cachedInfo = getCachedTopicInfo(topicId);
  if (cachedInfo) {
    return cachedInfo;
  }

  const client = hederaConfig.getClient();
  
  try {
    const query = new TopicInfoQuery()
      .setTopicId(topicId);

    const info = await query.execute(client);
    
    // Cache the result
    cacheTopicInfo(topicId, info);
    
    return info;
  } catch (error) {
    throw new Error(`Error getting topic info: ${error.message}`);
  }
}

/**
 * List all topics created by the account
 */
async function listTopics(startTime = null, endTime = null) {
  const mirrorNodeUrl = hederaConfig.getMirrorNodeUrl();
  const operatorId = hederaConfig.getOperatorAccountId().toString();
  
  try {
    const params = {
      'account.id': operatorId
    };

    if (startTime) {
      params['timestamp.from'] = startTime.toISOString();
    }
    if (endTime) {
      params['timestamp.to'] = endTime.toISOString();
    }

    const response = await axios.get(`${mirrorNodeUrl}/api/v1/topics`, {
      params,
      timeout: 5000
    });

    return response.data.topics.map(topic => ({
      topicId: topic.topic_id,
      memo: topic.memo,
      adminKey: topic.admin_key,
      submitKey: topic.submit_key,
      sequenceNumber: topic.sequence_number,
      expirationTime: topic.expiration_timestamp,
      autoRenewPeriod: topic.auto_renew_period,
      createdTimestamp: topic.created_timestamp
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
 * Monitor a topic's activity
 */
async function monitorTopic(topicId, callback) {
  const mirrorNodeUrl = hederaConfig.getMirrorNodeUrl();
  let lastSequenceNumber = 0;
  
  const checkInterval = setInterval(async () => {
    try {
      const info = await getTopicInfo(topicId);
      
      if (info.sequenceNumber > lastSequenceNumber) {
        callback({
          topicId,
          previousSequenceNumber: lastSequenceNumber,
          currentSequenceNumber: info.sequenceNumber,
          timestamp: new Date()
        });
        lastSequenceNumber = info.sequenceNumber;
      }
    } catch (error) {
      console.error(`Error monitoring topic ${topicId}:`, error);
    }
  }, 10000); // Check every 10 seconds

  return {
    stop: () => clearInterval(checkInterval)
  };
}

// Cache management functions
function getCachedTopicInfo(topicId) {
  const cached = topicInfoCache.get(topicId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.info;
  }
  return null;
}

function cacheTopicInfo(topicId, info) {
  topicInfoCache.set(topicId, {
    info,
    timestamp: Date.now()
  });
}

async function updateTopicInfoCache(topicId) {
  const info = await getTopicInfo(topicId);
  cacheTopicInfo(topicId, info);
  return info;
}

function clearTopicInfoCache() {
  topicInfoCache.clear();
}

export {
  createTopic,
  updateTopic,
  deleteTopic,
  getTopicInfo,
  listTopics,
  monitorTopic,
  clearTopicInfoCache
};

export default {
  createTopic,
  updateTopic,
  deleteTopic,
  getTopicInfo,
  listTopics,
  monitorTopic,
  clearTopicInfoCache
};