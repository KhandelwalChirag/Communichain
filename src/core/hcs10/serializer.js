import crypto from 'crypto';
import schema from './schema.js';
import { TopicCreateTransaction, TopicMessageSubmitTransaction, TopicMessageQuery } from "@hashgraph/sdk";
import hederaConfig from '../../config/hedera.js';

// Increased threshold for large messages (6KB)
const LARGE_MESSAGE_THRESHOLD = 6 * 1024;
const MAX_CHUNK_SIZE = 5.5 * 1024; // Leave room for metadata

/**
 * Serializes a message object to HCS-10 compliant bytes
 */
export async function serializeMessage(message) {
  // Validate message against schema
  const validation = schema.validateMessage(message);
  if (!validation.valid) {
    throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
  }
  
  // Clone the message to avoid modifying the original
  const serializedMessage = structuredClone(message);

  try {
    // Check message size and handle large messages
    const jsonString = JSON.stringify(serializedMessage);
    const messageSize = Buffer.from(jsonString).length;

    if (messageSize > LARGE_MESSAGE_THRESHOLD) {
      const chunks = splitIntoChunks(jsonString);
      const chunkRefs = await storeMessageChunks(chunks);
      
      return Buffer.from(JSON.stringify({
        isLargeMessage: true,
        totalChunks: chunks.length,
        chunkRefs,
        messageId: message.messageId,
        type: message.type
      }));
    }

    return Buffer.from(jsonString);
  } catch (error) {
    throw new Error(`Serialization error: ${error.message}`);
  }
}

/**
 * Deserializes bytes to a message object
 */
export async function deserializeMessage(bytes) {
  try {
    const jsonString = bytes.toString('utf8');
    const message = JSON.parse(jsonString);

    // Handle large messages
    if (message.isLargeMessage) {
      const fullMessage = await reassembleMessage(message);
      const validation = schema.validateMessage(fullMessage);
      if (!validation.valid) {
        throw new Error(`Reassembled message invalid: ${validation.errors.join(', ')}`);
      }
      return fullMessage;
    }

    // Regular message validation
    const validation = schema.validateMessage(message);
    if (!validation.valid) {
      throw new Error(`Invalid message format: ${validation.errors.join(', ')}`);
    }

    return message;
  } catch (error) {
    throw new Error(`Deserialization error: ${error.message}`);
  }
}

/**
 * Sign a message with a private key
 */
export function signMessage(message, privateKey) {
  const messageHash = hashMessage(message);
  const signature = privateKey.sign(Buffer.from(messageHash));
  return {
    ...message,
    signature: signature.toString('hex')
  };
}

/**
 * Verify a message signature
 */
export function verifyMessage(message, publicKey) {
  try {
    if (!message.signature) {
      return false;
    }

    const messageHash = hashMessage(message);
    const signatureBytes = Buffer.from(message.signature, 'hex');
    return publicKey.verify(Buffer.from(messageHash), signatureBytes);
  } catch (error) {
    console.warn('Signature verification failed:', error);
    return false;
  }
}

/**
 * Creates a hash of the message for verification
 */
export function hashMessage(message) {
  const messageForHashing = { ...message };
  delete messageForHashing.signature;
  
  const jsonString = JSON.stringify(messageForHashing);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

// Helper functions for large message handling
function splitIntoChunks(jsonString) {
  const chunks = [];
  for (let i = 0; i < jsonString.length; i += MAX_CHUNK_SIZE) {
    chunks.push(jsonString.slice(i, i + MAX_CHUNK_SIZE));
  }
  return chunks;
}

async function storeMessageChunks(chunks) {
  const client = hederaConfig.getClient();
  const chunkRefs = [];

  for (let i = 0; i < chunks.length; i++) {
    const createTx = new TopicCreateTransaction();
    const createResponse = await createTx.execute(client);
    const receipt = await createResponse.getReceipt(client);
    const topicId = receipt.topicId.toString();

    const submitTx = new TopicMessageSubmitTransaction({
      topicId,
      message: Buffer.from(chunks[i])
    });
    await submitTx.execute(client);

    chunkRefs.push(topicId);
  }

  return chunkRefs;
}

async function reassembleMessage(messageInfo) {
  const client = hederaConfig.getClient();
  let fullMessage = '';

  for (const topicId of messageInfo.chunkRefs) {
    const query = new TopicMessageQuery()
      .setTopicId(topicId)
      .setLimit(1);

    const messages = await query.execute(client);
    if (!messages || messages.length === 0) {
      throw new Error(`Could not retrieve chunk from topic ${topicId}`);
    }

    fullMessage += messages[0].contents.toString('utf8');
  }

  return JSON.parse(fullMessage);
}

export default {
  serializeMessage,
  deserializeMessage,
  signMessage,
  verifyMessage,
  hashMessage
};