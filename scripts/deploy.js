import { Client } from '@hashgraph/sdk';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSystemTopics } from './createTopics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NETWORKS = {
  testnet: {
    name: 'testnet',
    mirrorNode: 'https://testnet.mirrornode.hedera.com'
  },
  mainnet: {
    name: 'mainnet',
    mirrorNode: 'https://mainnet-public.mirrornode.hedera.com'
  }
};

/**
 * Configure environment for deployment
 * @param {string} network - Network to deploy to
 * @param {Object} config - Configuration options
 */
async function configureEnvironment(network, config = {}) {
  // Load base environment
  dotenv.config();
  
  // Validate network
  if (!NETWORKS[network]) {
    throw new Error(`Invalid network: ${network}`);
  }
  
  // Create .env file if it doesn't exist
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  // Add network configuration
  envContent += `# Hedera Network Configuration\n`;
  envContent += `HEDERA_NETWORK=${network}\n`;
  
  // Add operator account details if provided
  if (config.accountId && config.privateKey) {
    envContent += `\n# Operator Account Credentials\n`;
    envContent += `HEDERA_ACCOUNT_ID=${config.accountId}\n`;
    envContent += `HEDERA_PRIVATE_KEY=${config.privateKey}\n`;
  }
  
  // Add server configuration
  envContent += `\n# Server Configuration\n`;
  envContent += `PORT=${config.port || 3000}\n`;
  
  // Write to .env file
  fs.writeFileSync(envPath, envContent);
  console.log(`Environment configured for ${network}`);
}

/**
 * Deploy to testnet
 * @param {Object} config - Deployment configuration
 */
async function deployToTestnet(config = {}) {
  console.log('Deploying to testnet...');
  
  try {
    // Configure environment
    await configureEnvironment('testnet', config);
    
    // Create required topics
    const topics = await createSystemTopics();
    console.log('Created system topics:', topics);
    
    // Update .env with topic IDs
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent += `\n# HCS Topics\n`;
    envContent += `COMMUNICATION_TOPIC_ID=${topics.communicationTopicId}\n`;
    envContent += `REGISTRY_TOPIC_ID=${topics.registryTopicId}\n`;
    envContent += `MONITORING_TOPIC_ID=${topics.monitoringTopicId}\n`;
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('Deployment to testnet completed successfully');
    return topics;
  } catch (error) {
    console.error('Deployment to testnet failed:', error);
    throw error;
  }
}

/**
 * Deploy to mainnet
 * @param {Object} config - Deployment configuration
 */
async function deployToMainnet(config = {}) {
  console.log('Deploying to mainnet...');
  
  // Verify mainnet deployment is intentional
  if (!config.confirmMainnet) {
    throw new Error('Mainnet deployment requires explicit confirmation');
  }
  
  try {
    // Configure environment
    await configureEnvironment('mainnet', config);
    
    // Create required topics
    const topics = await createSystemTopics();
    console.log('Created system topics:', topics);
    
    // Update .env with topic IDs
    const envPath = path.join(process.cwd(), '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent += `\n# HCS Topics\n`;
    envContent += `COMMUNICATION_TOPIC_ID=${topics.communicationTopicId}\n`;
    envContent += `REGISTRY_TOPIC_ID=${topics.registryTopicId}\n`;
    envContent += `MONITORING_TOPIC_ID=${topics.monitoringTopicId}\n`;
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('Deployment to mainnet completed successfully');
    return topics;
  } catch (error) {
    console.error('Deployment to mainnet failed:', error);
    throw error;
  }
}

/**
 * Main deployment function
 * @param {Object} config - Deployment configuration
 */
async function deploy(config = {}) {
  const network = config.network || 'testnet';
  
  switch (network) {
    case 'testnet':
      return deployToTestnet(config);
    case 'mainnet':
      return deployToMainnet(config);
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const network = args[0] || 'testnet';
    
    // Parse command line arguments into config
    const config = {
      network,
      confirmMainnet: args.includes('--confirm-mainnet'),
      accountId: process.env.HEDERA_ACCOUNT_ID,
      privateKey: process.env.HEDERA_PRIVATE_KEY,
      port: process.env.PORT || 3000
    };
    
    await deploy(config);
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  deploy,
  deployToTestnet,
  deployToMainnet,
  configureEnvironment
};