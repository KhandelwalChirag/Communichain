import { HederaAgentKit } from '../agentkit/index.js';
import { Message } from '../elizaos/types.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BufferMemory } from 'langchain/memory';
import { AgentExecutor } from '@langchain/agents';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';

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


interface TokenParams {
  name: string;
  symbol: string;
  decimals?: number;
  initialSupply?: number;
}

interface MessageParams {
  topicId: string;
  message: string;
  memo?: string;
}

export class ChatAgent {
  private agentExecutor: AgentExecutor | null = null;
  private memory: BufferMemory;
  private model: ChatGoogleGenerativeAI;

  constructor(
    private agentKit: HederaAgentKit,
    private googleApiKey: string
  ) {
    this.memory = new BufferMemory({
      memoryKey: "chat_history",
      returnMessages: true,
    });

    this.model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.0-flash',
      maxOutputTokens: 2048,
      temperature: 0.7,
      apiKey: this.googleApiKey
    });
  }

  async initialize(): Promise<void> {
    try {
      // Create tools using agentKit's capabilities
      const tools = [
        new DynamicStructuredTool({
          name: 'check_balance',
          description: 'Check HBAR balance of a Hedera account',
          schema: z.object({
            accountId: z.string().describe('The Hedera account ID')
          }),
          func: async (input: { accountId: string }) => {
            const tool = this.agentKit.getTool('check_balance');
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
          func: async (input: TokenParams) => {
            const tool = this.agentKit.getTool('create_token');
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
          func: async (input: MessageParams) => {
            const tool = this.agentKit.getTool('submit_message');
            if (!tool) throw new Error('Submit message tool not found');
            return await tool.execute(input);
          },
        }),
      ];

      // Create a Gemini-compatible agent chain
      const chain = RunnableSequence.from([
        {
          messages: (input) => formatToOpenAIFunctionMessages(input.messages),
          memory: () => this.memory
        },
        this.model,
        {
          tools: () => tools,
          input: (input) => input
        }
      ]);

      this.agentExecutor = AgentExecutor.fromAgentAndTools({
        agent: chain,
        tools,
        memory: this.memory,
        maxIterations: 3,
        verbose: true
      });

    } catch (error) {
      console.error('Failed to initialize ChatAgent:', error);
      throw error;
    }
  }

  async handleMessage(message: Message): Promise<Message> {
    try {
      if (!this.agentExecutor) {
        throw new Error('Agent not initialized');
      }

      const response = await this.agentExecutor.invoke({
        input: message.content,
        context: {
          history: this.memory.chatHistory,
          sender: message.sender,
          timestamp: message.timestamp
        }
      });

      return {
        content: response.output || response.toString(),
        sender: 'agent',
        timestamp: new Date().toISOString(),
        metadata: {
          toolCalls: response.intermediateSteps,
          intent: response.intent,
          confidence: response.confidence
        }
      };

    } catch (error: any) {
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
}

export default {
  ChatAgent,
  initialize: (agentKit: HederaAgentKit, googleApiKey: string) => new ChatAgent(agentKit, googleApiKey)
};
