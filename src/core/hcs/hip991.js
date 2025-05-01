const { 
  TopicCreateTransaction,
  TransferTransaction,
  AccountId,
  Hbar,
  Status
} = require("@hashgraph/sdk");
const hederaConfig = require('../../config/hedera');

// Constants
const HIP991_VERSION = '1.0.0';
const MIN_FEE_HBAR = new Hbar(0.00001); // Minimum fee in ℏ
const PAYMENT_MEMO_PREFIX = 'HIP991:';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for topic fee information
const feeCache = new Map();

/**
 * Create a revenue-generating topic following HIP-991
 */
async function createRevenueTopic(memo, feeAmount, feeCollector) {
  if (!feeAmount || feeAmount < MIN_FEE_HBAR.toTinybars()) {
    throw new Error(`Fee amount must be at least ${MIN_FEE_HBAR.toString()}`);
  }

  const client = hederaConfig.getClient();
  const collectorId = typeof feeCollector === 'string' ? 
    AccountId.fromString(feeCollector) : feeCollector;

  try {
    // Format HIP-991 memo
    const hip991Memo = JSON.stringify({
      version: HIP991_VERSION,
      type: 'revenue',
      fee: {
        amount: feeAmount,
        collector: collectorId.toString()
      },
      memo: memo || ''
    });

    // Create topic with HIP-991 memo
    const transaction = new TopicCreateTransaction()
      .setTopicMemo(hip991Memo);

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    if (receipt.status !== Status.Success) {
      throw new Error(`Failed to create revenue topic: ${receipt.status}`);
    }

    const topicId = receipt.topicId.toString();

    // Cache fee information
    updateFeeCache(topicId, {
      amount: feeAmount,
      collector: collectorId.toString()
    });

    return topicId;
  } catch (error) {
    throw new Error(`Error creating revenue topic: ${error.message}`);
  }
}

/**
 * Pay the required fee for topic usage
 */
async function payForTopicSubmission(topicId) {
  const client = hederaConfig.getClient();
  const fee = await getFeeForTopic(topicId);

  if (!fee) {
    throw new Error('Topic fee information not found');
  }

  try {
    // Create transfer transaction
    const transaction = new TransferTransaction()
      .addHbarTransfer(hederaConfig.getOperatorAccountId(), new Hbar(-fee.amount))
      .addHbarTransfer(AccountId.fromString(fee.collector), new Hbar(fee.amount))
      .setTransactionMemo(`${PAYMENT_MEMO_PREFIX}${topicId}`);

    // Execute the transfer
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    if (receipt.status !== Status.Success) {
      throw new Error(`Payment failed with status: ${receipt.status}`);
    }

    return {
      transactionId: txResponse.transactionId.toString(),
      amount: fee.amount,
      collector: fee.collector,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Payment error: ${error.message}`);
  }
}

/**
 * Verify that payment was made for topic usage
 */
async function verifyTopicPayment(topicId, paymentRecord) {
  const client = hederaConfig.getClient();
  const fee = await getFeeForTopic(topicId);

  if (!fee) {
    throw new Error('Topic fee information not found');
  }

  try {
    // Verify payment record exists
    if (!paymentRecord || !paymentRecord.transactionId) {
      return false;
    }

    // Get transaction record
    const record = await client.getTransactionRecord(paymentRecord.transactionId);

    // Verify payment details
    const isValid = 
      record.transfers.some(transfer => 
        transfer.accountId.toString() === fee.collector &&
        transfer.amount.toTinybars() === fee.amount) &&
      record.transactionMemo === `${PAYMENT_MEMO_PREFIX}${topicId}`;

    return isValid;
  } catch (error) {
    console.error(`Payment verification error:`, error);
    return false;
  }
}

/**
 * Get the current fee for a revenue-generating topic
 */
async function getFeeForTopic(topicId) {
  // Check cache first
  const cachedFee = getCachedFee(topicId);
  if (cachedFee) {
    return cachedFee;
  }

  try {
    // Get topic info
    const info = await require('./topics').getTopicInfo(topicId);
    const memo = info.topicMemo;

    // Parse HIP-991 memo
    try {
      const hip991Data = JSON.parse(memo);
      if (hip991Data.version && hip991Data.type === 'revenue' && hip991Data.fee) {
        const fee = {
          amount: hip991Data.fee.amount,
          collector: hip991Data.fee.collector
        };

        // Cache the fee info
        updateFeeCache(topicId, fee);
        return fee;
      }
    } catch (error) {
      console.warn(`Invalid HIP-991 memo format for topic ${topicId}`);
    }

    return null;
  } catch (error) {
    throw new Error(`Error getting topic fee: ${error.message}`);
  }
}

/**
 * Update a revenue topic's fee configuration
 */
async function updateRevenueTopic(topicId, memo = null, feeAmount = null, feeCollector = null) {
  const currentFee = await getFeeForTopic(topicId);
  if (!currentFee) {
    throw new Error('Not a revenue-generating topic');
  }

  const client = hederaConfig.getClient();
  
  try {
    // Get current topic info
    const info = await require('./topics').getTopicInfo(topicId);
    const currentMemo = JSON.parse(info.topicMemo);

    // Update fee information
    const updatedMemo = {
      ...currentMemo,
      fee: {
        amount: feeAmount || currentFee.amount,
        collector: feeCollector || currentFee.collector
      }
    };

    if (memo) {
      updatedMemo.memo = memo;
    }

    // Update topic
    const result = await require('./topics').updateTopic(
      topicId, 
      JSON.stringify(updatedMemo)
    );

    // Update cache
    clearFeeCache(topicId);

    return result;
  } catch (error) {
    throw new Error(`Error updating revenue topic: ${error.message}`);
  }
}

// Cache management
function getCachedFee(topicId) {
  const cached = feeCache.get(topicId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.fee;
  }
  return null;
}

function updateFeeCache(topicId, fee) {
  feeCache.set(topicId, {
    fee,
    timestamp: Date.now()
  });
}

function clearFeeCache(topicId) {
  if (topicId) {
    feeCache.delete(topicId);
  } else {
    feeCache.clear();
  }
}

module.exports = {
  createRevenueTopic,
  updateRevenueTopic,
  payForTopicSubmission,
  verifyTopicPayment,
  getFeeForTopic,
  clearFeeCache
};