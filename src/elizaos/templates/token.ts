import { TokenType } from '@hashgraph/sdk';
import { TokenCreateResponse } from '../types';

interface TokenTemplate {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  tokenType?: TokenType;
  supplyKey?: boolean;
  adminKey?: boolean;
  metadataKey?: boolean;
  memo?: string;
  tokenMetadata?: string;
}

export async function createTokenFromTemplate(
  template: TokenTemplate,
  agentKit: any
): Promise<TokenCreateResponse> {
  try {
    const tokenCreateTx = await agentKit.createToken({
      name: template.name,
      symbol: template.symbol.toUpperCase(),
      decimals: template.decimals,
      initialSupply: template.initialSupply,
      type: template.tokenType || TokenType.FungibleCommon,
      supplyType: template.supplyKey ? 'infinite' : 'finite',
      adminKey: template.adminKey,
      memo: template.memo,
      customFees: [],
      tokenMetadata: template.tokenMetadata
    });

    return {
      success: true,
      data: {
        tokenId: tokenCreateTx.tokenId,
        symbol: template.symbol,
        name: template.name,
        totalSupply: template.initialSupply.toString()
      },
      transactionId: tokenCreateTx.transactionId
    };
  } catch (error: any) {
    throw new Error(`Failed to create token: ${error.message}`);
  }
}

export function validateTokenTemplate(template: Partial<TokenTemplate>): { 
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!template.name) missing.push('name');
  if (!template.symbol) missing.push('symbol');
  if (template.decimals === undefined) missing.push('decimals');
  if (template.initialSupply === undefined) missing.push('initialSupply');

  // Validation rules
  if (template.symbol && !/^[A-Z0-9]{1,32}$/i.test(template.symbol)) {
    warnings.push('Symbol should be 1-32 alphanumeric characters');
  }

  if (template.decimals && (template.decimals < 0 || template.decimals > 18)) {
    warnings.push('Decimals should be between 0 and 18');
  }

  if (template.name && template.name.length > 100) {
    warnings.push('Name should not exceed 100 characters');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}