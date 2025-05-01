import { 
  Client,
  TopicCreateTransaction,
  TopicInfoQuery
} from '@hashgraph/sdk';
import hederaConfig from '../src/config/hedera.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to create required HCS topics for the CommuniChain system
 */

/**
 * Create all required system topics
 */
async function createSystemTopics() {
  console.log('Creating system topics...');

  try {
    // Create main communication topic
    const communicationTopicId = await createTopic(
      'CommuniChain Agent Communication',
      'Main topic for agent-to-agent communication'
    );
    console.log('Created communication topic:', communicationTopicId);

    // Create registry topic
    const registryTopicId = await createTopic(
      'CommuniChain Agent Registry',
      'Topic for agent registration and capability announcements'
    );
    console.log('Created registry topic:', registryTopicId);

    // Create monitoring topic
    const monitoringTopicId = await createTopic(
      'CommuniChain System Monitoring',
      'Topic for system monitoring and status updates'
    );
    console.log('Created monitoring topic:', monitoringTopicId);

    return {
      communicationTopicId,
      registryTopicId,
      monitoringTopicId
    };
  } catch (error) {
    console.error('Error creating system topics:', error);
    throw error;
  }
}

/**
 * Create a new HCS topic
 * @param {string} name - Topic name
 * @param {string} memo - Topic memo/description
 * @returns {Promise<string>} - Topic ID
 */
async function createTopic(name, memo) {
  const client = hederaConfig.getClient();
  const operatorKey = hederaConfig.getOperatorPrivateKey();

  try {
    // Create new topic with proper configuration
    const transaction = new TopicCreateTransaction()
      .setAdminKey(operatorKey.publicKey)
      .setTopicMemo(memo || name);

    // Sign with operator key
    const txResponse = await transaction.execute(client);
    
    // Wait for the receipt
    const receipt = await txResponse.getReceipt(client);
    
    if (receipt.status !== 22) { // Status.SUCCESS
      throw new Error(`Topic creation failed with status: ${receipt.status}`);
    }
    
    // Get the topic ID
    const topicId = receipt.topicId.toString();

    console.log(`Created topic ${name} with ID: ${topicId}`);
    return topicId;
  } catch (error) {
    console.error(`Failed to create topic ${name}:`, error);
    throw error;
  }
}

/**
 * Verify a topic exists and is accessible
 * @param {string} topicId - Topic ID to verify
 */
async function verifyTopic(topicId) {
  const client = hederaConfig.getClient();

  try {
    const query = new TopicInfoQuery()
      .setTopicId(topicId);

    const info = await query.execute(client);
    
    if (!info || !info.topicId) {
      throw new Error('Topic not found');
    }
  } catch (error) {
    console.error(`Failed to verify topic ${topicId}:`, error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('Network:', process.env.HEDERA_NETWORK || 'testnet');
    
    const topics = await createSystemTopics();
    
    console.log('\nCreated all required topics successfully:');
    console.log(JSON.stringify(topics, null, 2));
    
    // Save topic IDs to .env file if specified
    if (process.env.SAVE_TO_ENV === 'true') {
      const envPath = '.env';
      
      let envContent = fs.existsSync(envPath) 
        ? fs.readFileSync(envPath, 'utf8') + '\n'
        : '';
      
      envContent += `\n# HCS Topics\n`;
      envContent += `COMMUNICATION_TOPIC_ID=${topics.communicationTopicId}\n`;
      envContent += `REGISTRY_TOPIC_ID=${topics.registryTopicId}\n`;
      envContent += `MONITORING_TOPIC_ID=${topics.monitoringTopicId}\n`;
      
      fs.writeFileSync(envPath, envContent);
      console.log('\nTopic IDs saved to .env file');
    }
  } catch (error) {
    console.error('Failed to create topics:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  createSystemTopics,
  createTopic,
  verifyTopic
};