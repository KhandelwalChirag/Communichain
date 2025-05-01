import { PrivateKey } from '@hashgraph/sdk';
import { TopicCreateResponse, HederaPluginError, ErrorCodes } from '../types';

interface TopicTemplate {
  memo: string;
  submitKey?: boolean | string;
  adminKey?: boolean | string;
  autoRenewPeriod?: number;
  maxMessageSize?: number;
  enableHip991?: boolean;
  hip991Config?: {
    feeAmount?: number;
    feeCollector?: string;
  };
}

export async function createTopicFromTemplate(
  template: TopicTemplate,
  agentKit: any
): Promise<TopicCreateResponse> {
  try {
    const createParams: any = {
      memo: template.memo
    };

    // Handle submit key
    if (template.submitKey) {
      if (typeof template.submitKey === 'string') {
        createParams.submitKey = PrivateKey.fromString(template.submitKey);
      } else {
        createParams.submitKey = PrivateKey.generateED25519();
      }
    }

    // Handle admin key
    if (template.adminKey) {
      if (typeof template.adminKey === 'string') {
        createParams.adminKey = PrivateKey.fromString(template.adminKey);
      } else {
        createParams.adminKey = PrivateKey.generateED25519();
      }
    }

    // Handle HIP-991 configuration
    if (template.enableHip991 && template.hip991Config) {
      createParams.hip991 = {
        enabled: true,
        feeAmount: template.hip991Config.feeAmount,
        feeCollector: template.hip991Config.feeCollector
      };
    }

    // Create topic using AgentKit
    const topicCreateTx = await agentKit.createTopic(createParams);

    return {
      success: true,
      data: {
        topicId: topicCreateTx.topicId,
        memo: template.memo,
        adminKey: createParams.adminKey?.publicKey?.toString()
      },
      transactionId: topicCreateTx.transactionId
    };
  } catch (error: any) {
    throw new HederaPluginError(
      `Failed to create topic: ${error.message}`,
      ErrorCodes.TRANSACTION_FAILED,
      error
    );
  }
}

export function validateTopicTemplate(template: Partial<TopicTemplate>): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!template.memo) missing.push('memo');

  // Validation rules
  if (template.memo && template.memo.length > 100) {
    warnings.push('Memo should not exceed 100 characters');
  }

  if (template.maxMessageSize && (template.maxMessageSize < 0 || template.maxMessageSize > 1024)) {
    warnings.push('Message size should be between 0 and 1024 bytes');
  }

  // HIP-991 validation
  if (template.enableHip991 && template.hip991Config) {
    if (!template.hip991Config.feeAmount) {
      missing.push('hip991Config.feeAmount');
    }
    if (!template.hip991Config.feeCollector) {
      missing.push('hip991Config.feeCollector');
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}