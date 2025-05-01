import { 
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  Status
} from "@hashgraph/sdk";
import hederaConfig from '../../config/hedera.js';
import serializer from '../hcs10/serializer.js';

// HCS-11 profile schema version
export const PROFILE_SCHEMA_VERSION = '1.0.0';

// Profile cache with 5-minute TTL
const profileCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// Profile validation schema
const PROFILE_SCHEMA = {
  required: ['id', 'type', 'version'],
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    version: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    capabilities: { type: 'array' },
    endpoints: { type: 'object' },
    metadata: { type: 'object' },
    publicKey: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' }
  }
};

/**
 * Create a profile topic for an agent
 */
export async function createProfileTopic(agentId, initialProfile) {
  const client = hederaConfig.getClient();
  
  try {
    // Validate initial profile
    validateProfile(initialProfile);

    // Add required fields
    const profile = {
      ...initialProfile,
      id: agentId,
      version: PROFILE_SCHEMA_VERSION,
      timestamp: new Date().toISOString()
    };

    // Create HCS-11 memo
    const memo = JSON.stringify({
      version: PROFILE_SCHEMA_VERSION,
      type: 'agent-profile',
      agentId
    });

    // Create topic
    const createTx = new TopicCreateTransaction()
      .setTopicMemo(memo);

    const createResponse = await createTx.execute(client);
    const receipt = await createResponse.getReceipt(client);

    if (receipt.status !== Status.Success) {
      throw new Error(`Failed to create profile topic: ${receipt.status}`);
    }

    const topicId = receipt.topicId.toString();

    // Submit initial profile
    await updateProfile(topicId, profile);

    return topicId;
  } catch (error) {
    throw new Error(`Error creating profile topic: ${error.message}`);
  }
}

/**
 * Update an agent's profile
 */
export async function updateProfile(topicId, profile) {
  const client = hederaConfig.getClient();
  
  try {
    // Validate profile
    validateProfile(profile);

    // Add timestamp
    profile.timestamp = new Date().toISOString();

    // Format profile message
    const profileMessage = {
      version: PROFILE_SCHEMA_VERSION,
      timestamp: profile.timestamp,
      type: 'profile_update',
      content: profile
    };

    // Serialize and submit
    const messageBytes = serializer.serializeMessage(profileMessage);
    const transaction = new TopicMessageSubmitTransaction({
      topicId,
      message: messageBytes
    });

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    if (receipt.status !== Status.Success) {
      throw new Error(`Failed to update profile: ${receipt.status}`);
    }

    // Update cache
    updateProfileCache(topicId, profile);

    return profile;
  } catch (error) {
    throw new Error(`Error updating profile: ${error.message}`);
  }
}

/**
 * Get an agent's profile
 */
export async function getProfile(topicId) {
  // Check cache first
  const cachedProfile = getCachedProfile(topicId);
  if (cachedProfile) {
    return cachedProfile;
  }

  const client = hederaConfig.getClient();
  
  try {
    // Query for latest profile message
    const query = new TopicMessageQuery()
      .setTopicId(topicId)
      .setLimit(1);

    const messages = await query.execute(client);
    if (!messages || messages.length === 0) {
      throw new Error('No profile found');
    }

    const message = messages[0];
    const profileMessage = serializer.deserializeMessage(message.contents);
    const profile = profileMessage.content;

    // Validate retrieved profile
    validateProfile(profile);

    // Cache the profile
    updateProfileCache(topicId, profile);

    return profile;
  } catch (error) {
    throw new Error(`Error getting profile: ${error.message}`);
  }
}

/**
 * List profiles matching certain criteria
 */
export async function listProfiles(criteria = {}) {
  const client = hederaConfig.getClient();
  const results = [];

  try {
    // Get all topics
    const topics = await require('../hcs/topics').listTopics();
    
    // Filter profile topics and fetch profiles
    for (const topic of topics) {
      try {
        if (topic.memo && topic.memo.includes('agent-profile')) {
          const profile = await getProfile(topic.topicId);
          
          // Apply criteria filtering
          if (matchesCriteria(profile, criteria)) {
            results.push({
              topicId: topic.topicId,
              profile
            });
          }
        }
      } catch (error) {
        console.warn(`Error fetching profile for topic ${topic.topicId}:`, error);
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Error listing profiles: ${error.message}`);
  }
}

// Helper functions

function validateProfile(profile) {
  const errors = [];

  // Check required fields
  for (const field of PROFILE_SCHEMA.required) {
    if (!profile[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate field types
  for (const [field, spec] of Object.entries(PROFILE_SCHEMA.properties)) {
    if (profile[field] !== undefined) {
      if (spec.type === 'array' && !Array.isArray(profile[field])) {
        errors.push(`${field} must be an array`);
      } else if (spec.type === 'object' && typeof profile[field] !== 'object') {
        errors.push(`${field} must be an object`);
      } else if (spec.type === 'string' && typeof profile[field] !== 'string') {
        errors.push(`${field} must be a string`);
      }

      if (spec.format === 'date-time' && isNaN(Date.parse(profile[field]))) {
        errors.push(`${field} must be a valid ISO date string`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid profile: ${errors.join(', ')}`);
  }
}

function matchesCriteria(profile, criteria) {
  for (const [key, value] of Object.entries(criteria)) {
    if (Array.isArray(value)) {
      // Array criteria (e.g., capabilities)
      if (!Array.isArray(profile[key]) || 
          !value.every(v => profile[key].includes(v))) {
        return false;
      }
    } else if (typeof value === 'object') {
      // Object criteria (e.g., metadata)
      if (!profile[key] || !Object.entries(value).every(([k, v]) => 
        profile[key][k] === v)) {
        return false;
      }
    } else {
      // Simple equality
      if (profile[key] !== value) {
        return false;
      }
    }
  }
  return true;
}

function getCachedProfile(topicId) {
  const cached = profileCache.get(topicId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.profile;
  }
  return null;
}

function updateProfileCache(topicId, profile) {
  profileCache.set(topicId, {
    profile,
    timestamp: Date.now()
  });
}

export function clearProfileCache(topicId = null) {
  if (topicId) {
    profileCache.delete(topicId);
  } else {
    profileCache.clear();
  }
}

export default {
  PROFILE_SCHEMA_VERSION,
  createProfileTopic,
  updateProfile,
  getProfile,
  listProfiles,
  clearProfileCache
};