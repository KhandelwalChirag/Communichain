import { randomBytes } from 'crypto';

/**
 * Defines the HCS-10 message schemas and validation
 */

const SCHEMA_VERSION = '1.0';

// Message types supported by the HCS-10 schema
export const MESSAGE_TYPES = {
  REGISTRATION: 'registration',
  CAPABILITY: 'capability',
  QUERY: 'query',
  RESPONSE: 'response',
  NOTIFICATION: 'notification',
  TASK: 'task',
  RESULT: 'result',
  STATUS: 'status'
};

// Message priorities
export const PRIORITIES = ['low', 'normal', 'high', 'critical'];

// Message status codes
export const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  ERROR: 500
};

// Base message template that all messages must follow
const BASE_MESSAGE_TEMPLATE = {
  version: SCHEMA_VERSION,
  type: null,
  timestamp: null,
  sender: {
    id: null,
    name: null,
    type: null
  },
  recipient: {
    id: null,
    type: null
  },
  messageId: null,
  correlationId: null,
  content: {},
  signature: null,
  status: {
    code: STATUS_CODES.SUCCESS,
    message: 'OK',
    timestamp: null
  }
};

// Type-specific message templates with required fields
const MESSAGE_TEMPLATES = {
  [MESSAGE_TYPES.REGISTRATION]: {
    ...BASE_MESSAGE_TEMPLATE,
    type: MESSAGE_TYPES.REGISTRATION,
    content: {
      capabilities: [],
      endpoints: {},
      publicKey: null,
      description: null,
      version: null,
      supportedSchemas: []
    }
  },
  
  [MESSAGE_TYPES.CAPABILITY]: {
    ...BASE_MESSAGE_TEMPLATE,
    type: MESSAGE_TYPES.CAPABILITY,
    content: {
      capabilities: [],
      details: {},
      constraints: {},
      expiresAt: null
    }
  },
  
  [MESSAGE_TYPES.QUERY]: {
    ...BASE_MESSAGE_TEMPLATE,
    type: MESSAGE_TYPES.QUERY,
    content: {
      query: null,
      parameters: {},
      responseType: null,
      timeout: null,
      priority: 'normal'
    }
  },
  
  [MESSAGE_TYPES.RESPONSE]: {
    ...BASE_MESSAGE_TEMPLATE,
    type: MESSAGE_TYPES.RESPONSE,
    content: {
      result: null,
      status: null,
      errorMessage: null,
      processingTime: null,
      truncated: false
    }
  },
  
  [MESSAGE_TYPES.NOTIFICATION]: {
    ...BASE_MESSAGE_TEMPLATE,
    type: MESSAGE_TYPES.NOTIFICATION,
    content: {
      notificationType: null,
      message: null,
      severity: 'info',
      metadata: {},
      expiresAt: null
    }
  },
  
  [MESSAGE_TYPES.TASK]: {
    ...BASE_MESSAGE_TEMPLATE,
    type: MESSAGE_TYPES.TASK,
    content: {
      taskType: null,
      description: null,
      parameters: {},
      deadline: null,
      priority: 'normal',
      retryPolicy: null,
      dependencies: []
    }
  },
  
  [MESSAGE_TYPES.RESULT]: {
    ...BASE_MESSAGE_TEMPLATE,
    type: MESSAGE_TYPES.RESULT,
    content: {
      result: null,
      taskId: null,
      status: 'completed',
      comments: null,
      metrics: {}
    }
  },
  
  [MESSAGE_TYPES.STATUS]: {
    ...BASE_MESSAGE_TEMPLATE,
    type: MESSAGE_TYPES.STATUS,
    content: {
      status: null,
      details: {},
      timestamp: null,
      metrics: {},
      nextUpdate: null
    }
  }
};

/**
 * Create a message template for a specific message type
 */
export function createMessageTemplate(type) {
  if (!MESSAGE_TYPES[type] && !Object.values(MESSAGE_TYPES).includes(type)) {
    throw new Error(`Invalid message type: ${type}`);
  }
  
  const messageType = Object.values(MESSAGE_TYPES).find(t => t === type);
  const template = JSON.parse(JSON.stringify(
    MESSAGE_TEMPLATES[messageType] || { ...BASE_MESSAGE_TEMPLATE, type }
  ));
  
  template.timestamp = new Date().toISOString();
  template.messageId = `msg_${Date.now()}_${randomBytes(4).toString('hex')}`;
  template.status.timestamp = template.timestamp;
  
  return template;
}

/**
 * Type checking utilities
 */
const typeCheckers = {
  isString: (value) => typeof value === 'string',
  isNumber: (value) => typeof value === 'number' && !isNaN(value),
  isBoolean: (value) => typeof value === 'boolean',
  isObject: (value) => value && typeof value === 'object' && !Array.isArray(value),
  isArray: (value) => Array.isArray(value),
  isValidDate: (value) => !isNaN(Date.parse(value)),
  isValidPriority: (value) => PRIORITIES.includes(value),
  isValidStatusCode: (value) => Object.values(STATUS_CODES).includes(value)
};

/**
 * Validates a message against the HCS-10 schema
 */
export function validateMessage(message) {
  const errors = [];
  
  // Check base message structure
  if (!typeCheckers.isObject(message)) {
    return { valid: false, errors: ['Message must be an object'] };
  }

  // Required base fields
  if (!message.version) errors.push('Missing version');
  if (!message.type) errors.push('Missing type');
  if (!Object.values(MESSAGE_TYPES).includes(message.type)) {
    errors.push(`Invalid message type: ${message.type}`);
  }
  if (!message.timestamp || !typeCheckers.isValidDate(message.timestamp)) {
    errors.push('Invalid or missing timestamp');
  }
  if (!typeCheckers.isObject(message.sender) || !message.sender.id) {
    errors.push('Missing or invalid sender');
  }
  if (!typeCheckers.isObject(message.recipient) || !message.recipient.id) {
    errors.push('Missing or invalid recipient');
  }
  if (!message.messageId) errors.push('Missing messageId');

  // Validate status object
  if (!typeCheckers.isObject(message.status)) {
    errors.push('Missing status object');
  } else {
    if (!typeCheckers.isNumber(message.status.code)) {
      errors.push('Invalid or missing status code');
    }
    if (!typeCheckers.isString(message.status.message)) {
      errors.push('Invalid or missing status message');
    }
    if (!message.status.timestamp || !typeCheckers.isValidDate(message.status.timestamp)) {
      errors.push('Invalid or missing status timestamp');
    }
  }

  // Type-specific validations
  if (message.type && message.content) {
    const template = MESSAGE_TEMPLATES[message.type];
    if (template) {
      switch (message.type) {
        case MESSAGE_TYPES.REGISTRATION:
          if (!typeCheckers.isArray(message.content.capabilities)) {
            errors.push('Registration requires capabilities array');
          }
          if (!typeCheckers.isString(message.content.publicKey)) {
            errors.push('Registration requires publicKey string');
          }
          break;

        case MESSAGE_TYPES.QUERY:
          if (!message.content.query) {
            errors.push('Query requires query content');
          }
          if (message.content.priority && !typeCheckers.isValidPriority(message.content.priority)) {
            errors.push('Invalid priority value');
          }
          if (message.content.timeout && !typeCheckers.isNumber(message.content.timeout)) {
            errors.push('Timeout must be a number');
          }
          break;

        case MESSAGE_TYPES.TASK:
          if (!message.content.taskType) {
            errors.push('Task requires taskType');
          }
          if (!message.content.description) {
            errors.push('Task requires description');
          }
          if (message.content.deadline && !typeCheckers.isValidDate(message.content.deadline)) {
            errors.push('Invalid deadline format');
          }
          if (message.content.priority && !typeCheckers.isValidPriority(message.content.priority)) {
            errors.push('Invalid priority value');
          }
          break;

        case MESSAGE_TYPES.RESULT:
          if (!message.content.taskId) {
            errors.push('Result requires taskId');
          }
          if (!message.correlationId) {
            errors.push('Result requires correlationId');
          }
          break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Export schema object with all components
export const schema = {
  SCHEMA_VERSION,
  MESSAGE_TYPES,
  PRIORITIES,
  STATUS_CODES,
  createMessageTemplate,
  validateMessage
};

export default schema;