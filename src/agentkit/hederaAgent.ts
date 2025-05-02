import { Client, AccountId, PrivateKey, TokenId, TopicId } from "@hashgraph/sdk";
import HederaAgentKit from "hedera-agent-kit";

// Type definitions for parameters
export interface TokenParams {
  name: string;
  symbol: string;
  decimals?: number;
  initialSupply?: number;
  isSupplyKey?: boolean;
  maxSupply?: number;
  isMetadataKey?: boolean;
  isAdminKey?: boolean;
  tokenMetadata?: Uint8Array;
  memo?: string;
}

export interface MessageParams {
  topicId: string;
  message: string;
}

export interface AirdropRecipient {
  accountId: string;
  amount: number;
}

// Custom error class for HederaAgent
export class HederaAgentError extends Error {
  code: string;
  
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "HederaAgentError";
  }
}

// Error codes
export const ErrorCodes = {
  TOKEN_CREATION_FAILED: "TOKEN_CREATION_FAILED",
  MESSAGE_SUBMISSION_FAILED: "MESSAGE_SUBMISSION_FAILED",
  TRANSFER_FAILED: "TRANSFER_FAILED",
  BALANCE_CHECK_FAILED: "BALANCE_CHECK_FAILED",
  TOPIC_CREATION_FAILED: "TOPIC_CREATION_FAILED",
  AIRDROP_FAILED: "AIRDROP_FAILED",
  INVALID_PARAMS: "INVALID_PARAMS"
};

/**
 * HederaAgent provides a convenient interface to interact with the Hedera network
 * using the HederaAgentKit library
 */
export class HederaAgent {
  private readonly kit: HederaAgentKit;
  private readonly network: string;

  /**
   * Creates a new HederaAgent instance
   * 
   * @param accountId - The Hedera account ID
   * @param privateKey - The private key for the account
   * @param network - The network to connect to ("testnet" or "mainnet")
   */
  constructor(accountId: string, privateKey: string, network: "testnet" | "mainnet") {
    this.kit = new HederaAgentKit(accountId, privateKey, network);
    this.network = network;
  }

  /**
   * Create a fungible token (FT)
   */
  async createToken(params: TokenParams): Promise<any> {
    try {
      // Validate required parameters
      if (!params.name || !params.symbol) {
        throw new HederaAgentError(
          ErrorCodes.INVALID_PARAMS, 
          "Token name and symbol are required"
        );
      }

      // Convert string metadata to Uint8Array if needed
      const tokenMetadata = params.tokenMetadata || 
        (params.memo ? new TextEncoder().encode(params.memo) : undefined);

      const result = await this.kit.createFT({
        name: params.name,
        symbol: params.symbol,
        decimals: params.decimals || 0,
        initialSupply: params.initialSupply || 0,
        isSupplyKey: params.isSupplyKey || false,
        maxSupply: params.maxSupply,
        isMetadataKey: params.isMetadataKey || false,
        isAdminKey: params.isAdminKey || false,
        tokenMetadata,
        memo: params.memo
      });
      
      return result;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.TOKEN_CREATION_FAILED, 
        error.message || "Failed to create token"
      );
    }
  }

  /**
   * Create a non-fungible token (NFT)
   */
  async createNFT(params: TokenParams): Promise<any> {
    try {
      // Validate required parameters
      if (!params.name || !params.symbol) {
        throw new HederaAgentError(
          ErrorCodes.INVALID_PARAMS, 
          "Token name and symbol are required"
        );
      }

      // Convert string metadata to Uint8Array if needed
      const tokenMetadata = params.tokenMetadata || 
        (params.memo ? new TextEncoder().encode(params.memo) : undefined);

      const result = await this.kit.createNFT({
        name: params.name,
        symbol: params.symbol,
        maxSupply: params.maxSupply,
        isMetadataKey: params.isMetadataKey || false,
        isAdminKey: params.isAdminKey || false,
        tokenMetadata,
        memo: params.memo
      });
      
      return result;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.TOKEN_CREATION_FAILED, 
        error.message || "Failed to create NFT"
      );
    }
  }

  /**
   * Submit a message to a Hedera topic
   */
  async submitMessage(params: MessageParams): Promise<any> {
    try {
      // Validate required parameters
      if (!params.topicId || !params.message) {
        throw new HederaAgentError(
          ErrorCodes.INVALID_PARAMS, 
          "Topic ID and message are required"
        );
      }

      const topicId = TopicId.fromString(params.topicId);
      const result = await this.kit.submitTopicMessage(topicId, params.message);
      return result;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.MESSAGE_SUBMISSION_FAILED, 
        error.message || "Failed to submit message to topic"
      );
    }
  }

  /**
   * Create a new Hedera topic
   */
  async createTopic(memo: string, isSubmitKey: boolean = false): Promise<any> {
    try {
      const result = await this.kit.createTopic(memo, isSubmitKey);
      return result;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.TOPIC_CREATION_FAILED, 
        error.message || "Failed to create topic"
      );
    }
  }

  /**
   * Transfer HBAR to a recipient account
   */
  async transferHbar(toAccountId: string, amount: string): Promise<any> {
    try {
      const result = await this.kit.transferHbar(toAccountId, amount);
      return result;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.TRANSFER_FAILED, 
        error.message || "Failed to transfer HBAR"
      );
    }
  }

  /**
   * Transfer tokens to a recipient account
   */
  async transferToken(tokenId: string, toAccountId: string, amount: number): Promise<any> {
    try {
      const tokenIdObj = TokenId.fromString(tokenId);
      const result = await this.kit.transferToken(tokenIdObj, toAccountId, amount);
      return result;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.TRANSFER_FAILED, 
        error.message || "Failed to transfer token"
      );
    }
  }

  /**
   * Check HBAR balance of an account
   */
  async getHbarBalance(accountId?: string): Promise<any> {
    try {
      const balance = await this.kit.getHbarBalance();
      return balance;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.BALANCE_CHECK_FAILED, 
        error.message || "Failed to check HBAR balance"
      );
    }
  }

  /**
   * Get token balance for an account
   */
  async getTokenBalance(tokenId: string, accountId?: string): Promise<any> {
    try {
      // If accountId is not provided, use the operator's account
      const account = accountId || await this.kit.getOperatorId();
      const balance = await this.kit.getHtsBalance(tokenId, this.network, account);
      return balance;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.BALANCE_CHECK_FAILED, 
        error.message || "Failed to check token balance"
      );
    }
  }

  /**
   * Get all token balances for an account
   */
  async getAllTokenBalances(accountId?: string): Promise<any> {
    try {
      // If accountId is not provided, use the operator's account
      const account = accountId || await this.kit.getOperatorId();
      const balances = await this.kit.getAllTokensBalances(this.network, account);
      return balances;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.BALANCE_CHECK_FAILED, 
        error.message || "Failed to get all token balances"
      );
    }
  }

  /**
   * Associate a token with the operator's account
   */
  async associateToken(tokenId: string): Promise<any> {
    try {
      const tokenIdObj = TokenId.fromString(tokenId);
      const result = await this.kit.associateToken(tokenIdObj);
      return result;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.TRANSFER_FAILED, 
        error.message || "Failed to associate token"
      );
    }
  }

  /**
   * Airdrop tokens to multiple recipients
   */
  async airdropToken(tokenId: string, recipients: AirdropRecipient[]): Promise<any> {
    try {
      const tokenIdObj = TokenId.fromString(tokenId);
      const result = await this.kit.airdropToken(tokenIdObj, recipients);
      return result;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.AIRDROP_FAILED, 
        error.message || "Failed to airdrop tokens"
      );
    }
  }

  /**
   * Mint additional fungible tokens
   */
  async mintToken(tokenId: string, amount: number): Promise<any> {
    try {
      const tokenIdObj = TokenId.fromString(tokenId);
      const result = await this.kit.mintToken(tokenIdObj, amount);
      return result;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.TOKEN_CREATION_FAILED, 
        error.message || "Failed to mint tokens"
      );
    }
  }

  /**
   * Mint an NFT with metadata
   */
  async mintNFT(tokenId: string, metadata: string): Promise<any> {
    try {
      const tokenIdObj = TokenId.fromString(tokenId);
      const metadataBytes = new TextEncoder().encode(metadata);
      const result = await this.kit.mintNFTToken(tokenIdObj, metadataBytes);
      return result;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.TOKEN_CREATION_FAILED, 
        error.message || "Failed to mint NFT"
      );
    }
  }
}

export default HederaAgent;