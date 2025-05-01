import { MessageParams, TopicParams, TokenParams } from './types.js';
import { AgentKitError, ErrorCodes } from './errors.js';

export function validateMessageParams(params: Partial<MessageParams>): void {
  const missing: string[] = [];

  if (!params.topicId) missing.push('topicId');
  if (!params.message) missing.push('message');

  if (missing.length > 0) {
    throw new AgentKitError(
      `Missing required parameters: ${missing.join(', ')}`,
      ErrorCodes.VALIDATION_ERROR
    );
  }
}

export function validateTopicParams(params: Partial<TopicParams>): void {
  // Topic creation can work with no parameters, but we should validate format
  // of provided optional parameters
  if (params.submitKey && typeof params.submitKey !== 'string' && !params.submitKey.publicKey) {
    throw new AgentKitError(
      'submitKey must be a string or PrivateKey instance',
      ErrorCodes.VALIDATION_ERROR
    );
  }

  if (params.adminKey && typeof params.adminKey !== 'string' && !params.adminKey.publicKey) {
    throw new AgentKitError(
      'adminKey must be a string or PrivateKey instance',
      ErrorCodes.VALIDATION_ERROR
    );
  }

  if (params.autoRenewPeriod && (params.autoRenewPeriod < 0 || params.autoRenewPeriod > 8000000)) {
    throw new AgentKitError(
      'autoRenewPeriod must be between 0 and 8000000 seconds',
      ErrorCodes.VALIDATION_ERROR
    );
  }
}

export function validateTokenParams(params: Partial<TokenParams>): void {
  const missing: string[] = [];

  if (!params.name) missing.push('name');
  if (!params.symbol) missing.push('symbol');
  if (params.decimals === undefined) missing.push('decimals');
  if (params.initialSupply === undefined) missing.push('initialSupply');

  if (missing.length > 0) {
    throw new AgentKitError(
      `Missing required parameters: ${missing.join(', ')}`,
      ErrorCodes.VALIDATION_ERROR
    );
  }

  if (params.symbol && !/^[A-Z0-9]{1,32}$/i.test(params.symbol)) {
    throw new AgentKitError(
      'Token symbol must be 1-32 alphanumeric characters',
      ErrorCodes.VALIDATION_ERROR
    );
  }

  if (params.decimals !== undefined && (params.decimals < 0 || params.decimals > 18)) {
    throw new AgentKitError(
      'Token decimals must be between 0 and 18',
      ErrorCodes.VALIDATION_ERROR
    );
  }

  if (params.name && params.name.length > 100) {
    throw new AgentKitError(
      'Token name must not exceed 100 characters',
      ErrorCodes.VALIDATION_ERROR
    );
  }
}

export function validateCapability(capability: string): void {
  if (!capability || typeof capability !== 'string') {
    throw new AgentKitError(
      'Capability must be a non-empty string',
      ErrorCodes.VALIDATION_ERROR
    );
  }

  // Add any additional capability format validation here
  if (!/^[a-z_][a-z0-9_]*$/i.test(capability)) {
    throw new AgentKitError(
      'Capability must contain only letters, numbers, and underscores, and start with a letter or underscore',
      ErrorCodes.VALIDATION_ERROR
    );
  }
}