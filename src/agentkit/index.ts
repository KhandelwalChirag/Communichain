import {
  Client,
  AccountId,
  PrivateKey,
  TokenType,
  TokenSupplyType,
  Status,
  Long,
  TokenCreateTransaction,
  TopicMessageSubmitTransaction,
  AccountBalanceQuery
} from '@hashgraph/sdk';
import { Tool, MessageParams, TokenParams, QueryParams, QueryResponse } from './types.js';
import { AgentKitError, ErrorCodes } from './errors.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BufferMemory } from 'langchain/memory';
import { AgentExecutor } from 'langchain/agents';
import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';

export class HederaAgentKit {
  private client: Client | null = null;
  private tools: Map<string, Tool> = new Map();
  private agentExecutor: AgentExecutor | null = null;
  private memory: BufferMemory;
  private model: ChatGoogleGenerativeAI;

  constructor(
    private accountId: string,
    private privateKey: string,
    private network: string = 'testnet',
    private googleApiKey: string
  ) {
    this.memory = new BufferMemory({
      memoryKey: "chat_history",
      returnMessages: true,
    });

    this.model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-pro',
      maxOutputTokens: 2048,
      temperature: 0.7,
      apiKey: this.googleApiKey
    });
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Hedera client
      if (this.network === 'testnet') {
        this.client = Client.forTestnet();
      } else if (this.network === 'mainnet') {
        this.client = Client.forMainnet();
      } else {
        throw new Error(`Unsupported network: ${this.network}`);
      }
      
      this.client.setOperator(AccountId.fromString(this.accountId), PrivateKey.fromString(this.privateKey));

      // Register basic tools
      this.registerTool('check_balance', {
        name: 'check_balance',
        description: 'Check HBAR balance of a Hedera account',
        execute: async (params: { accountId: string }) => {
          if (!this.client) throw new Error('Client not initialized');
          const query = new AccountBalanceQuery()
            .setAccountId(AccountId.fromString(params.accountId));
          const balance = await query.execute(this.client);
          return `${balance.hbars.toString()} ℏ`;
        }
      });

      this.registerTool('create_token', {
        name: 'create_token',
        description: 'Create a new token on Hedera',
        execute: async (params: TokenParams) => {
          return await this.createToken(params);
        }
      });

      this.registerTool('submit_message', {
        name: 'submit_message',
        description: 'Submit a message to a Hedera topic',
        execute: async (params: MessageParams) => {
          return await this.submitMessage(params);
        }
      });

      // Initialize LangChain agent with registered tools
      const chainTools = Array.from(this.tools.values()).map(tool => 
        new DynamicStructuredTool({
          name: tool.name,
          description: tool.description,
          schema: this.getToolSchema(tool.name),
          func: async (input: any) => await tool.execute(input)
        })
      );

      this.agentExecutor = await AgentExecutor.fromAgentAndTools({
        agent: this.model,
        tools: chainTools,
        memory: this.memory,
        maxIterations: 3,
        verbose: true
      });

    } catch (error: any) {
      throw new AgentKitError(
        `Failed to initialize HederaAgentKit: ${error.message}`,
        ErrorCodes.NOT_INITIALIZED,
        error
      );
    }
  }

  private getToolSchema(toolName: string): z.ZodObject<any> {
    switch (toolName) {
      case 'check_balance':
        return z.object({
          accountId: z.string().describe('The Hedera account ID to check balance')
        });
      
      case 'create_token':
        return z.object({
          name: z.string().describe('Token name'),
          symbol: z.string().describe('Token symbol'),
          decimals: z.number().optional().describe('Number of decimal places'),
          initialSupply: z.number().optional().describe('Initial token supply')
        });
      
      case 'submit_message':
        return z.object({
          topicId: z.string().describe('Hedera topic ID'),
          message: z.string().describe('Message to send'),
          memo: z.string().optional().describe('Optional memo')
        });
      
      case 'query_topic':
        return z.object({
          topicId: z.string().describe('Hedera topic ID to query'),
          startTime: z.date().optional().describe('Start time for query'),
          endTime: z.date().optional().describe('End time for query')
        });
      
      default:
        return z.object({}).describe('Generic tool schema');
    }
  }
  
  registerTool(name: string, tool: Tool): void {
    this.tools.set(name, tool);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  async createToken(params: TokenParams): Promise<string> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      const initialSupply = params.initialSupply ? 
        (typeof params.initialSupply === 'string' ? parseInt(params.initialSupply, 10) : params.initialSupply) : 
        0;

      const transaction = new TokenCreateTransaction()
        .setTokenName(params.name)
        .setTokenSymbol(params.symbol)
        .setDecimals(params.decimals || 0)
        .setInitialSupply(Long.fromNumber(initialSupply))
        .setTokenType(TokenType.FungibleCommon)
        .setSupplyType(params.initialSupply ? TokenSupplyType.Finite : TokenSupplyType.Infinite)
        .setAdminKey(PrivateKey.fromString(this.privateKey).publicKey)
        .setTreasuryAccountId(AccountId.fromString(this.accountId));

      const response = await transaction.execute(this.client);
      const receipt = await response.getReceipt(this.client);
      return receipt.tokenId?.toString() || '';

    } catch (error: any) {
      throw new AgentKitError(
        `Failed to create token: ${error.message}`,
        ErrorCodes.TOKEN_ERROR,
        error
      );
    }
  }

  async submitMessage(params: MessageParams): Promise<Status> {
    if (!this.client) throw new Error('Client not initialized');

    try {
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(params.topicId)
        .setMessage(params.message);

      if (params.memo) {
        transaction.setTransactionMemo(params.memo);
      }

      const response = await transaction.execute(this.client);
      const receipt = await response.getReceipt(this.client);
      return receipt.status;

    } catch (error: any) {
      throw new AgentKitError(
        `Failed to submit message: ${error.message}`,
        ErrorCodes.MESSAGE_ERROR,
        error
      );
    }
  }

  async query(params: QueryParams): Promise<QueryResponse> {
    try {
      const response = await this.agentExecutor.invoke({
        input: params.message,
        context: params.context
      });

      return {
        status: 'success',
        data: {
          response: response.output,
          timestamp: new Date().toISOString(),
          context: {
            ...params.context,
            toolCalls: response.intermediateSteps
          }
        }
      };
    } catch (error: any) {
      throw new AgentKitError(
        `Query processing failed: ${error.message}`,
        ErrorCodes.QUERY_FAILED,
        error
      );
    }
  }
}