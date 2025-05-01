import { PrivateKey } from '@hashgraph/sdk';

export interface Tool {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
  parameters?: ToolParameter[];
}

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface AgentKitConfig {
  accountId: string;
  privateKey: string;
  network?: string;
  mirrorNode?: string;
}

export interface MessageParams {
  topicId: string;
  message: string;
  memo?: string;
}

export interface TopicParams {
  memo?: string;
  submitKey?: string | PrivateKey;
  adminKey?: string | PrivateKey;
  autoRenewPeriod?: number;
}

export interface TokenParams {
  name: string;
  symbol: string;
  decimals?: number;
  initialSupply: string | number;
  supplyType?: 'finite' | 'infinite';
  adminKey?: boolean;
  supplyKey?: boolean;
  memo?: string;
  tokenMetadata?: string;
}

export interface QueryParams {
  message: string;
  context?: {
    history?: Array<{
      role: string;
      content: string;
      timestamp: string;
    }>;
    agentId?: string;
    agentType?: string;
    capabilities?: string[];
    status?: string;
  };
}

export interface QueryResponse {
  status: string;
  data: {
    response: string;
    timestamp: string;
    context?: any;
  };
}

export interface AgentKitError extends Error {
  code: string;
  originalError?: Error;
}