# CommuniChain

A decentralized agent communication system built on Hedera Consensus Service, implementing the HCS-10 standard for agent messaging.

## Features

- HCS-10 compliant agent communication
- Extensible agent framework with specialized agent types
- Natural language interface via ElizaOS integration
- Role-based agent capabilities using AgentKit
- Web-based demo interface
- Automated deployment to testnet/mainnet

## Prerequisites

- Node.js >= 14.x
- Hedera testnet account (for development)
- Hedera mainnet account (for production)

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/communichain.git
cd communichain
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
- Copy `.env.example` to `.env`
- Fill in your Hedera account details

4. Deploy to testnet:
```bash
node scripts/deploy.js testnet
```

5. Start the application:
```bash
npm start
```

6. Open the demo interface:
- Navigate to `http://localhost:3000` in your browser

## Agent Types

### Research Agent
- Information gathering and analysis
- Source verification
- Data summarization

### Assistant Agent
- Natural language interaction
- Content organization
- Task management

## Usage Examples

1. Query a research agent:
```
research quantum computing
```

2. Get a summary:
```
summarize [content]
```

3. Check system status:
```
status
```

## Development

### Running Tests
```bash
npm test
```

### Adding New Agents

1. Create a new agent class extending BaseAgent:
```javascript
class CustomAgent extends BaseAgent {
  constructor(id) {
    super(id, 'custom', ['capability1', 'capability2']);
  }
}
```

2. Register the agent:
```javascript
const agent = new CustomAgent();
registry.registerAgent(agent);
```

## Architecture

- `src/core/hcs` - Hedera Consensus Service integration
- `src/core/hcs10` - HCS-10 message schema implementation
- `src/agents` - Agent framework and implementations
- `src/elizaos` - Natural language processing
- `src/agentkit` - Agent role management
- `src/api` - REST API endpoints
- `src/ui` - Web interface

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.