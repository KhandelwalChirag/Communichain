import { Client } from "@hashgraph/sdk";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicStructuredTool } from "langchain/tools";
import { BufferMemory } from "langchain/memory";
import { AgentExecutor, initializeAgentExecutorWithOptions } from "langchain/agents";
import { z } from "zod";

import { HederaAgent, HederaAgentError, ErrorCodes } from "./hederaAgent";

/**
 * HederaAgentWithAI extends HederaAgent to add AI capabilities using LangChain
 */
export class HederaAgentWithAI extends HederaAgent {
  private readonly executor: AgentExecutor;

  constructor(accountId: string, privateKey: string, network: "testnet" | "mainnet") {
    super(accountId, privateKey, network);
    this.executor = this.initializeAgent();
  }

  /**
   * Initialize the LangChain agent with the necessary tools
   */
  private initializeAgent(): AgentExecutor {
    // Define tools that the AI agent can use
    const tools = [
      new DynamicStructuredTool({
        name: "create_token",
        description: "Create a new fungible token on Hedera",
        schema: z.object({
          name: z.string().describe("Token name"),
          symbol: z.string().describe("Token symbol"),
          decimals: z.number().optional().describe("Number of decimal places (default: 0)"),
          initialSupply: z.number().optional().describe("Initial token supply (default: 0)"),
          maxSupply: z.number().optional().describe("Maximum token supply"),
          memo: z.string().optional().describe("Optional memo for the token")
        }),
        func: async (input) => {
          try {
            const result = await this.createToken(input);
            return JSON.stringify(result);
          } catch (error) {
            if (error instanceof HederaAgentError) {
              return JSON.stringify({ error: error.code, message: error.message });
            }
            return JSON.stringify({ error: "UNKNOWN_ERROR", message: error.message });
          }
        }
      }),
      
      new DynamicStructuredTool({
        name: "create_nft",
        description: "Create a new non-fungible token (NFT) on Hedera",
        schema: z.object({
          name: z.string().describe("NFT name"),
          symbol: z.string().describe("NFT symbol"),
          maxSupply: z.number().optional().describe("Maximum supply of NFTs"),
          memo: z.string().optional().describe("Optional memo for the NFT")
        }),
        func: async (input) => {
          try {
            const result = await this.createNFT(input);
            return JSON.stringify(result);
          } catch (error) {
            if (error instanceof HederaAgentError) {
              return JSON.stringify({ error: error.code, message: error.message });
            }
            return JSON.stringify({ error: "UNKNOWN_ERROR", message: error.message });
          }
        }
      }),
      
      new DynamicStructuredTool({
        name: "submit_message",
        description: "Submit a message to a Hedera topic",
        schema: z.object({
          topicId: z.string().describe("Topic ID in format 0.0.x"),
          message: z.string().describe("The message to submit to the topic")
        }),
        func: async (input) => {
          try {
            const result = await this.submitMessage(input);
            return JSON.stringify(result);
          } catch (error) {
            if (error instanceof HederaAgentError) {
              return JSON.stringify({ error: error.code, message: error.message });
            }
            return JSON.stringify({ error: "UNKNOWN_ERROR", message: error.message });
          }
        }
      }),
      
      new DynamicStructuredTool({
        name: "create_topic",
        description: "Create a new topic on Hedera",
        schema: z.object({
          memo: z.string().describe("Topic description or memo"),
          isSubmitKey: z.boolean().optional().describe("Whether to set the submit key (default: false)")
        }),
        func: async (input) => {
          try {
            const result = await this.createTopic(input.memo, input.isSubmitKey);
            return JSON.stringify(result);
          } catch (error) {
            if (error instanceof HederaAgentError) {
              return JSON.stringify({ error: error.code, message: error.message });
            }
            return JSON.stringify({ error: "UNKNOWN_ERROR", message: error.message });
          }
        }
      }),
      
      new DynamicStructuredTool({
        name: "transfer_hbar",
        description: "Transfer HBAR to another account",
        schema: z.object({
          toAccountId: z.string().describe("Recipient account ID in format 0.0.x"),
          amount: z.string().describe("Amount of HBAR to transfer")
        }),
        func: async (input) => {
          try {
            const result = await this.transferHbar(input.toAccountId, input.amount);
            return JSON.stringify(result);
          } catch (error) {
            if (error instanceof HederaAgentError) {
              return JSON.stringify({ error: error.code, message: error.message });
            }
            return JSON.stringify({ error: "UNKNOWN_ERROR", message: error.message });
          }
        }
      }),
      
      new DynamicStructuredTool({
        name: "check_hbar_balance",
        description: "Check HBAR balance of an account",
        schema: z.object({
          accountId: z.string().optional().describe("Account ID to check (defaults to operator)")
        }),
        func: async (input) => {
          try {
            const result = await this.getHbarBalance(input.accountId);
            return JSON.stringify(result);
          } catch (error) {
            if (error instanceof HederaAgentError) {
              return JSON.stringify({ error: error.code, message: error.message });
            }
            return JSON.stringify({ error: "UNKNOWN_ERROR", message: error.message });
          }
        }
      }),
      
      new DynamicStructuredTool({
        name: "check_token_balance",
        description: "Check token balance for an account",
        schema: z.object({
          tokenId: z.string().describe("Token ID in format 0.0.x"),
          accountId: z.string().optional().describe("Account ID to check (defaults to operator)")
        }),
        func: async (input) => {
          try {
            const result = await this.getTokenBalance(input.tokenId, input.accountId);
            return JSON.stringify(result);
          } catch (error) {
            if (error instanceof HederaAgentError) {
              return JSON.stringify({ error: error.code, message: error.message });
            }
            return JSON.stringify({ error: "UNKNOWN_ERROR", message: error.message });
          }
        }
      })
    ];

    // Initialize AI model (using Google's Gemini Pro)
    const model = new ChatGoogleGenerativeAI({
      modelName: "gemini-pro",
      temperature: 0.5,
    });

    // Create the agent executor
    return initializeAgentExecutorWithOptions(tools, model, {
      agentType: "zero-shot-react-description",
      memory: new BufferMemory(),
    });
  }

  /**
   * Run the AI agent with a natural language prompt
   */
  public async runAgent(input: string): Promise<string> {
    try {
      const result = await this.executor.call({ input });
      return result.output;
    } catch (error) {
      throw new HederaAgentError(
        ErrorCodes.INVALID_PARAMS,
        `AI agent error: ${error.message}`
      );
    }
  }
}

export default HederaAgentWithAI;