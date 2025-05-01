export interface ElizaPluginConfig {
  characterName?: string;
  characterRole?: string;
  maxHistorySize?: number;
  templates?: Record<string, any>;
  googleApiKey: string;
  hederaAccountId: string;
  hederaPrivateKey: string;
  hederaNetwork?: string;
}

export interface Plugin {
  initialize(): Promise<void>;
  handleMessage(message: Message): Promise<Message>;
}

export interface Message {
  content: string;
  sender: string;
  timestamp: string;
  metadata?: {
    intent?: Intent;
    toolCalls?: any[];
    error?: string;
    [key: string]: any;
  };
}

export interface Intent {
  name: string;
  confidence: number;
  parameters: Record<string, any>;
  required: string[];
  optional?: string[];
}

export interface ActionResponse {
  success: boolean;
  data: {
    response: string;
    intent?: Intent;
    timestamp: string;
  };
}

export class ElizaPluginError extends Error {
  code: string;
  originalError?: Error;

  constructor(message: string, code: string, originalError?: Error) {
    super(message);
    this.name = 'ElizaPluginError';
    this.code = code;
    this.originalError = originalError;
  }
}

export const ErrorCodes = {
  NOT_INITIALIZED: 'NOT_INITIALIZED',
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
  INTENT_NOT_FOUND: 'INTENT_NOT_FOUND',
  RESPONSE_GENERATION_FAILED: 'RESPONSE_GENERATION_FAILED'
} as const;