import { Client, AccountId, PrivateKey, AccountBalanceQuery } from "@hashgraph/sdk";

// Available Hedera networks with mirror nodes
export const NETWORKS = {
  mainnet: {
    name: 'mainnet',
    baseUrl: 'https://mainnet-public.mirrornode.hedera.com',
  },
  testnet: {
    name: 'testnet',
    baseUrl: 'https://testnet.mirrornode.hedera.com',
  },
  previewnet: {
    name: 'previewnet',
    baseUrl: 'https://previewnet.mirrornode.hedera.com',
  }
};

// Default to testnet in development
const defaultNetwork = process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet';
export const NETWORK = process.env.HEDERA_NETWORK || defaultNetwork;

let client = null;
let operatorId = null;
let operatorKey = null;

/**
 * Initialize Hedera client with proper error handling
 */
async function initClient() {
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const privateKey = process.env.HEDERA_PRIVATE_KEY;

  if (!accountId || !privateKey) {
    throw new Error('Missing HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY environment variables');
  }

  try {
    // Convert operator info from env with proper error handling
    try {
      operatorId = AccountId.fromString(accountId);
    } catch (error) {
      throw new Error(`Invalid HEDERA_ACCOUNT_ID: ${error.message}`);
    }

    try {
      operatorKey = PrivateKey.fromString(privateKey);
    } catch (error) {
      throw new Error(`Invalid HEDERA_PRIVATE_KEY: ${error.message}`);
    }

    // Create and configure client
    switch (NETWORK) {
      case 'mainnet':
        client = Client.forMainnet();
        break;
      case 'testnet':
        client = Client.forTestnet();
        break;
      case 'previewnet':
        client = Client.forPreviewnet();
        break;
      default:
        throw new Error(`Invalid network: ${NETWORK}`);
    }

    client.setOperator(operatorId, operatorKey);

    // Test the client by checking account info instead of balance
    const accountBalance = await new AccountBalanceQuery()
      .setAccountId(operatorId)
      .execute(client);

    if (!accountBalance) {
      throw new Error('Failed to verify client configuration');
    }
    
  } catch (error) {
    throw new Error(`Failed to initialize Hedera client: ${error.message}`);
  }
}

/**
 * Get initialized Hedera client
 * @returns {Client} Hedera client instance
 */
export function getClient() {
  if (!client) {
    initClient();
  }
  return client;
}

/**
 * Get operator account ID
 * @returns {AccountId} Operator's account ID
 */
export function getOperatorAccountId() {
  if (!operatorId) {
    initClient();
  }
  return operatorId;
}

/**
 * Get operator private key
 * @returns {PrivateKey} Operator's private key
 */
export function getOperatorPrivateKey() {
  if (!operatorKey) {
    initClient();
  }
  return operatorKey;
}

/**
 * Get mirror node URL for current network
 * @returns {string} Mirror node base URL
 */
export function getMirrorNodeUrl() {
  return NETWORKS[NETWORK].baseUrl;
}

export default {
  NETWORKS,
  NETWORK,
  getClient,
  getOperatorAccountId,
  getOperatorPrivateKey,
  getMirrorNodeUrl
};