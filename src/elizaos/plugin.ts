import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { BufferMemory } from 'langchain/memory';
import { HederaAgentKit } from '../agentkit/hederaAgent.js';
import { Intent, Message, Plugin, ElizaPluginConfig } from './types.js';
import { z } from 'zod';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseMessage, AIMessage, HumanMessage } from '@langchain/core/messages';

function formatToOpenAIFunctionMessages(messages: BaseMessage[]): BaseMessage[] {
  return messages.map(msg => {
    if (msg instanceof AIMessage || msg instanceof HumanMessage) {
      return msg;
    }
    
    // Convert other message types to HumanMessage if needed
    return new HumanMessage({
      content: msg.content || '',
      additional_kwargs: msg.additional_kwargs
    });
  });
}

export class ElizaOSPlugin implements Plugin {
  private model: ChatGoogleGenerativeAI;
  private memory: BufferMemory;
  private hederaKit: HederaAgentKit;
  private tools: DynamicStructuredTool[] = [];

  constructor(private config: ElizaPluginConfig) {
    this.memory = new BufferMemory({
      memoryKey: "chat_history",
      returnMessages: true,
    });

    this.model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-pro',
      maxOutputTokens: 2048,
      temperature: 0.7,
      apiKey: config.googleApiKey
    });

    this.hederaKit = new HederaAgentKit(
      config.hederaAccountId,
      config.hederaPrivateKey,
      config.hederaNetwork,
      config.googleApiKey
    );
  }

  async initialize(): Promise<void> {
    try {
      await this.hederaKit.initialize();
      
      // Create tools from Hedera capabilities
      this.tools = [
        new DynamicStructuredTool({
          name: 'check_balance',
          description: 'Check HBAR balance of a Hedera account',
          schema: z.object({
            accountId: z.string().describe('The Hedera account ID')
          }),
          func: async (input: { accountId: string }) => {
            const tool = this.hederaKit.getTool('check_balance');
            if (!tool) throw new Error('Check balance tool not found');
            return await tool.execute({ accountId: input.accountId });
          },
        }),
        new DynamicStructuredTool({
          name: 'create_token',
          description: 'Create a new token on Hedera',
          schema: z.object({
            name: z.string().describe('Token name'),
            symbol: z.string().describe('Token symbol'),
            decimals: z.number().optional().describe('Number of decimal places'),
            initialSupply: z.number().optional().describe('Initial token supply')
          }),
          func: async (input: { name: string; symbol: string; decimals?: number; initialSupply?: number }) => {
            const tool = this.hederaKit.getTool('create_token');
            if (!tool) throw new Error('Create token tool not found');
            return await tool.execute(input);
          },
        }),
        new DynamicStructuredTool({
          name: 'send_message',
          description: 'Send a message to a Hedera topic',
          schema: z.object({
            topicId: z.string().describe('Hedera topic ID'),
            message: z.string().describe('Message to send'),
            memo: z.string().optional().describe('Optional memo')
          }),
          func: async (input: { topicId: string; message: string; memo?: string }) => {
            const tool = this.hederaKit.getTool('submit_message');
            if (!tool) throw new Error('Submit message tool not found');
            return await tool.execute(input);
          },
        }),
      ];

    } catch (error: any) {
      throw new Error(`Failed to initialize ElizaOSPlugin: ${error.message}`);
    }
  }

  async handleMessage(message: Message): Promise<Message> {
    try {
      // Create a Gemini-compatible chain for this message
      const chain = RunnableSequence.from([
        {
          messages: async () => {
            const history = await this.memory.loadMemoryVariables({});
            return formatToOpenAIFunctionMessages([
              ...history.chat_history || [],
              {
                role: 'user',
                content: message.content
              }
            ]);
          },
          tools: () => this.tools
        },
        this.model,
        {
          response: (output) => output.text,
          intent: async (output) => this.parseIntent(output.text)
        }
      ]);

      const result = await chain.invoke({});

      // Save to memory
      await this.memory.saveContext(
        { input: message.content },
        { output: result.response }
      );

      return {
        content: result.response,
        sender: 'agent',
        timestamp: new Date().toISOString(),
        metadata: {
          intent: result.intent,
          tools: this.tools.map(t => t.name)
        }
      };

    } catch (error) {
      console.error('Error processing message:', error);
      return {
        content: "I apologize, but I encountered an error processing your request. Could you please try rephrasing it?",
        sender: 'agent',
        timestamp: new Date().toISOString(),
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  private async parseIntent(input: string): Promise<Intent> {
    const response = await this.model.invoke(
      `Parse the following user message and extract the intent and parameters. Format the response as JSON.
      Message: "${input}"
      Consider these possible intents:
      - check_balance (requires: accountId)
      - create_token (requires: name, symbol, optional: decimals, initialSupply)
      - transfer_hbar (requires: toAccount, amount)
      - create_topic (optional: memo)
      - submit_message (requires: topicId, message, optional: memo)
      `
    );

    try {
      const parsed = JSON.parse(response.text);
      return {
        name: parsed.intent,
        confidence: parsed.confidence || 0.8,
        parameters: parsed.parameters || {},
        required: parsed.required || []
      };
    } catch (error) {
      console.error('Error parsing intent:', error);
      return {
        name: 'unknown',
        confidence: 0,
        parameters: {},
        required: []
      };
    }
  }
}

export default {
  ElizaOSPlugin,
  initialize: (config: ElizaPluginConfig) => {
    return new ElizaOSPlugin(config);
  }
};