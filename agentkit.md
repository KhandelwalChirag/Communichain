# Hedera Agent Kit

Welcome to the **Hedera Agent Kit**! This project aims to provide a LangChain-compatible toolkit for interacting with the Hedera Network. The focus is on a minimal, easy-to-use set of functions, while staying flexible for future enhancements.

## Overview

- **Agent Interaction**: Make on-chain calls to Hedera (e.g., create tokens, post messages to consensus).
- **Lightweight**: Designed to get you started quickly with a minimal set of features.
- **Community-Driven**: We encourage developers of all skill levels to contribute.

## Current Features

1. **Native Hedera Token Service (HTS)**:
    - Create fungible tokens with minimal parameters (name, symbol, decimals, supply, etc.).
    - Mint additional tokens to existing token accounts.

2. **Token Operations**:
    - **Create Fungible Tokens (FT)**: Easily create and configure new fungible tokens.
    - **Create Non-fungible Tokens (NFT)**: Easily create and configure new non-fungible tokens.
    - **Transfer Tokens**: Transfer tokens between accounts.
    - **Associate / Dissociate Tokens**: Associate a token to an account or dissociate it as needed.
    - **Reject Tokens**: Reject a token from an account.

3. **HBAR Transactions**:
    - Transfer HBAR between accounts.

4. **Airdrop Management**:
    - Airdrop tokens to multiple recipients.
    - Claim a pending airdrop.

5. **Token Balance Queries**:
    - Get HBAR balances of an account.
    - Get HTS token balances for a specific token ID.
    - Retrieve all token balances for an account.
    - Get token holders for a specific token.

6. **Topic Management (HCS)**:
    - **Create Topics**: Create new topics for Hedera Consensus Service (HCS).
    - **Delete Topics**: Delete an existing topic.
    - **Submit Topic Messages**: Send messages to a specific topic.
    - **Get Topic Info**: Retrieve information about a specific topic.
    - **Get Topic Messages**: Fetch messages from a specific topic.

### Note
The methods in the HederaAgentKit class are fully implemented and functional for interacting with the Hedera network (e.g., creating tokens, transferring assets, managing airdrops). However, Langchain tools for most of these methods and operations are not implemented by default.

### Details
For further details check [HederaAgentKit Readme](./src/agent/README.md).

## Getting Started

```bash
npm i hedera-agent-kit
```

LangChain/ LangGraph quick start:

```js
import { HederaAgentKit, createHederaTools } from 'hedera-agent-kit';
import { ToolNode } from '@langchain/langgraph/prebuilt';

const hederaAgentKit = new HederaAgentKit(
  '0.0.12345', // Replace with your account ID
  '0x.......', // Replace with your private key
  'testnet',   // Replace with your selected network
);
const hederaAgentKitTools = createHederaTools(hederaAgentKit);
const toolsNode = new ToolNode(tools);

```
- `hederaAgentKitTools` is an array of `Tool` instances
  (from `@langchain/core/tools`).
- `toolsNode` can be used in any LangGraph workflow,
  for example `workflow.addNode('toolsNode', toolsNode)`.

## Local development

1. **Clone** the repo:

```bash
git clone https://github.com/hedera-dev/hedera-agent-kit.git
```

2. Install dependencies:

```bash
cd hedera-agent-kit
npm install
```

3. Configure environment variables (e.g., `OPENAI_API_KEY`, `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`) in a `.env` file.

4. Test the kit:

```bash
 npm run test
```

## Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](https://github.com/hedera-dev/hedera-agent-kit/blob/main/CONTRIBUTING.md) for details on our process, how to get started, and how to sign your commits under the DCO.

## Roadmap

For details on upcoming features, check out our [ROADMAP.md](https://github.com/hedera-dev/hedera-agent-kit/blob/main/ROADMAP.md). If you’d like to tackle one of the tasks, look at the open issues on GitHub or create a new one if you don’t see what you’re looking for.

## License

Apache 2.0

## Hedera AgentKit Documentation

### Overview
Hedera AgentKit is a framework for building and managing AI agents that interact with the Hedera network. It provides tools for agent communication, state management, and blockchain interactions.

### Core Components

#### 1. HederaAgentKit (`agentkit/index.ts`)
The main class that provides Hedera network integration and tool management.

```typescript
interface AgentKitConfig {
  accountId: string;
  privateKey: string;
  network?: 'mainnet' | 'testnet' | 'previewnet';
}
```

#### 2. Agent System
- `BaseAgent`: Base class for all agents
- `AgentRegistry`: Manages agent registration and discovery
- `Specialized Agents`: Custom agent implementations

#### 3. Tools and Capabilities
Built-in tools:
- `sendMessage`: Send messages to Hedera topics
- `createTopic`: Create new Hedera topics
- `createToken`: Create new Hedera tokens
- `query`: Process natural language queries

#### 4. Message Schema
Uses HCS-10 schema for standardized agent communication:
- Registration messages
- Capability announcements
- Agent-to-agent messages
- Status updates

### Implementation Guide

1. Initialize AgentKit:
```typescript
import { HederaAgentKit } from './agentkit';

const agentKit = new HederaAgentKit(
  process.env.HEDERA_ACCOUNT_ID!,
  process.env.HEDERA_PRIVATE_KEY!,
  'testnet'
);
await agentKit.initialize();
```

2. Create and Register Agents:
```typescript
import { BaseAgent } from './agents/base';
import registry from './agents/registry';

class CustomAgent extends BaseAgent {
  constructor(id) {
    super(id, 'custom');
    this.capabilities.add('chat');
  }
}

const agent = new CustomAgent('agent1');
await agent.initialize();
registry.registerAgent(agent);
```

3. Use Built-in Tools:
```typescript
// Send a message
await agentKit.getTool('sendMessage').execute({
  topicId: '0.0.123456',
  message: 'Hello World'
});

// Create a topic
const result = await agentKit.getTool('createTopic').execute({
  memo: 'Agent Communication Channel'
});
```

4. Handle AI Chat:
```typescript
// Process a query
const response = await agentKit.getTool('query').execute({
  message: 'What is the current network status?'
});
```

### Best Practices
1. Always initialize agents before use
2. Register agents with the registry for discovery
3. Use the HCS-10 schema for message standardization
4. Handle errors and status updates appropriately
5. Maintain agent state and activity timestamps

### Error Handling
The system uses standardized error codes:
```typescript
export const ErrorCodes = {
  NOT_INITIALIZED: 'NOT_INITIALIZED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  MESSAGE_ERROR: 'MESSAGE_ERROR',
  TOPIC_ERROR: 'TOPIC_ERROR',
  TOKEN_ERROR: 'TOKEN_ERROR',
  AGENT_ERROR: 'AGENT_ERROR'
};
```

### AI Chat Integration
1. Use the query tool for natural language processing
2. Maintain conversation context in agent state
3. Use topic-based communication for agent interactions
4. Handle asynchronous responses properly
5. Implement fallback responses for unknown queries