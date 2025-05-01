import characterConfig from './templates/character.json';

interface Intent {
  name: string;
  confidence: number;
  parameters: Record<string, any>;
  required: string[];
  optional: string[];
}

interface IntentMatch {
  pattern: string[];
  required: string[];
  optional: string[];
}

class IntentHandler {
  private templates: Record<string, IntentMatch>;
  private lastIntents: Intent[] = [];
  private maxHistory: number = 10;

  constructor() {
    this.templates = characterConfig.promptTemplates;
  }

  extractIntent(input: string): Intent[] {
    const matches: Intent[] = [];
    
    for (const [intentName, template] of Object.entries(this.templates)) {
      for (const pattern of template.pattern) {
        if (input.toLowerCase().includes(pattern.toLowerCase())) {
          const parameters = this.extractParameters(input, template);
          const confidence = this.calculateConfidence(input, pattern, parameters, template);
          
          matches.push({
            name: intentName,
            confidence,
            parameters,
            required: template.required,
            optional: template.optional
          });
        }
      }
    }

    // Sort by confidence and store in history
    matches.sort((a, b) => b.confidence - a.confidence);
    this.updateIntentHistory(matches[0]);

    return matches;
  }

  private extractParameters(input: string, template: IntentMatch): Record<string, any> {
    const params: Record<string, any> = {};
    const allParams = [...template.required, ...template.optional];

    for (const param of allParams) {
      const value = this.findParameterValue(input, param);
      if (value) {
        params[param] = value;
      }
    }

    return params;
  }

  private findParameterValue(input: string, param: string): string | null {
    // Add parameter extraction patterns based on param type
    const patterns: Record<string, RegExp> = {
      memo: /(?:memo:|message:)\s*([^,\.]+)/i,
      name: /(?:called|named)\s+([^,\s]+)/i,
      symbol: /symbol\s+([^,\s]+)|ticker\s+([^,\s]+)/i,
      decimals: /(\d+)\s*decimal/i,
      initialSupply: /supply\s*(?:of)?\s*(\d+(?:\.\d+)?)/i,
      topicId: /topic\s+(\d+\.\d+\.\d+)/i,
      tokenId: /token\s+(\d+\.\d+\.\d+)/i,
      accountId: /account\s+(\d+\.\d+\.\d+)/i
    };

    const pattern = patterns[param];
    if (!pattern) return null;

    const match = input.match(pattern);
    return match ? match[1] || match[2] : null;
  }

  private calculateConfidence(
    input: string,
    pattern: string,
    params: Record<string, any>,
    template: IntentMatch
  ): number {
    let confidence = 0;

    // Pattern match weight
    confidence += input.toLowerCase().includes(pattern.toLowerCase()) ? 0.4 : 0;

    // Required parameters weight
    const requiredParamsFound = template.required.filter(param => params[param]).length;
    confidence += (requiredParamsFound / template.required.length) * 0.4;

    // Optional parameters weight
    const optionalParamsFound = template.optional.filter(param => params[param]).length;
    confidence += (optionalParamsFound / template.optional.length) * 0.2;

    return Math.min(confidence, 1);
  }

  validateIntent(intent: Intent): { valid: boolean; missing: string[] } {
    const missing = intent.required.filter(param => !intent.parameters[param]);
    return {
      valid: missing.length === 0,
      missing
    };
  }

  private updateIntentHistory(intent: Intent | undefined): void {
    if (intent) {
      this.lastIntents.unshift(intent);
      if (this.lastIntents.length > this.maxHistory) {
        this.lastIntents.pop();
      }
    }
  }

  getIntentHistory(): Intent[] {
    return [...this.lastIntents];
  }
}

export default new IntentHandler();