export const ErrorCodes = {
  NOT_INITIALIZED: 'NOT_INITIALIZED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  MESSAGE_ERROR: 'MESSAGE_ERROR',
  TOPIC_ERROR: 'TOPIC_ERROR',
  TOKEN_ERROR: 'TOKEN_ERROR',
  AGENT_ERROR: 'AGENT_ERROR',
  QUERY_FAILED: 'QUERY_FAILED',
  INTENT_NOT_FOUND: 'INTENT_NOT_FOUND',
  RESPONSE_GENERATION_FAILED: 'RESPONSE_GENERATION_FAILED'
} as const;

export class AgentKitError extends Error {
  code: string;
  originalError?: Error;

  constructor(message: string, code: string, originalError?: Error) {
    super(message);
    this.name = 'AgentKitError';
    this.code = code;
    this.originalError = originalError;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AgentKitError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}