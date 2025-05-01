
COMMUNICHAIN
├── node_modules
├── scripts
│   ├── createTopics.js
│   ├── deploy.js
│   ├── dev.js
│   └── kill-port.js
├── src
│   ├── agentkit
│   │   ├── errors.ts
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── validation.ts
│   ├── agents
│   │   └── ChatAgent.ts
│   ├── api
│   │   └── routes.js
│   ├── config
│   │   └── hedera.js
│   ├── core
│   │   ├── hcs
│   │   │   ├── hip991.js
│   │   │   ├── messages.js
│   │   │   └── topics.js
│   │   ├── hcs10
│   │   │   ├── schema.js
│   │   │   └── serializer.js
│   │   └── hcs11
│   │       └── profile.js
│   ├── elizaos
│   │   ├── templates
│   │   │   ├── token.ts
│   │   │   └── topic.ts
│   │   ├── intents.ts
│   │   ├── plugin.ts
│   │   └── types.ts
│   └── ui
├── index.js
├── .env
├── .env.example
├── .gitignore
├── agentkit.md
├── elizaos-plugin.md
├── info.md
├── package-lock.json
├── package.json
├── postcss.config.js
├── README.md
├── tailwind.config.cjs
├── tsconfig.json
└── vite.config.js

# agentkit folder
## index.ts - This is the main implementation file that contains the HederaAgentKit class. It:
1.Handles initialization of the Hedera client
2.Manages tools for interacting with the Hedera network (check balance, create tokens, submit messages)
3.Integrates with LangChain and Google's Generative AI
4.Provides core functionality for token creation and message submission
5.Implements query handling with agent execution

## errors.ts - Handles error management through:
1.Definition of error codes as constants (NOT_INITIALIZED, NETWORK_ERROR, etc.)
2.Custom AgentKitError class that extends the standard Error
3.Includes functionality to serialize errors to JSON
4.Maintains original error information while adding context

## types.ts - Contains TypeScript interface definitions for:
1.Tool and ToolParameter interfaces for defining agent capabilities
2.Configuration interfaces (AgentKitConfig)
3.Parameter interfaces for messages, topics, and tokens
4.Query-related interfaces for handling requests and responses
5.Error interface definitions

## validation.ts - Provides validation functions for:
1.Message parameters validation
2.Topic parameters validation
3.Token parameters validation
4.Capability validation
5.Throws appropriate AgentKitErrors when validation fails
6.Ensures data integrity before operations

# agents folder
## ChatAgent.ts - This is a class that:
Integrates with Google's Generative AI (using gemini-pro model)
Manages chat interactions and memory using LangChain's BufferMemory
Provides tools for Hedera network operations:
Checking account balances
Creating tokens
Sending messages to topics
Handles message processing and error handling
Initializes and manages the agent executor

# api folder

## routes.js
The routes.js file defines the API endpoints for the application using Express router. Here's a breakdown of its main functionalities:
System Status Endpoint ( GET /api/status):
Tracks system uptime
Reports number of agents
Shows system version and operational status
Provides metrics about active agents and capabilities
Monitors system health including ElizaOS status
Agent Management Endpoints :
GET /api/agents: Lists all registered agents with their IDs, types, names, and capabilities
GET /api/agents/:id: Retrieves details for a specific agent
POST /api/agents/:id/message: Sends messages to specific agents and handles their responses
Task Management ( POST /api/tasks):
Creates new tasks
Finds suitable agents based on task type
Assigns tasks to capable agents
Handles task execution and responses
Chat Interface ( POST /api/chat):
Provides natural language interface using ElizaOS
Processes user messages
Returns formatted responses with metadata
Includes error handling for chat operations
Capabilities Endpoint ( GET /api/capabilities):
Lists all available capabilities in the system
Aggregates capabilities from all registered agents
Key features of the implementation:
Comprehensive error handling across all endpoints
Consistent response formatting
Integration with agent registry system
Support for both structured queries and natural language interactions

# config folder
## hedera.js (Configuration):
Manages Hedera network connections (mainnet, testnet, previewnet)
Handles client initialization with proper error handling
Manages operator account credentials and private keys
Provides functions for getting client instance, operator details
Handles mirror node URL configuration

# HCS (Hedera Consensus Service) Folder :

## a. messages.js :
Handles message submission to topics
Implements message retrieval from topics
Manages topic subscriptions with auto-reconnection
Provides retry mechanism for failed operations
Handles message deserialization

## b. topics.js :
Creates, updates, and deletes HCS topics
Manages topic information and caching
Implements topic monitoring functionality
Lists topics with filtering capabilities
Handles topic info caching for performance

# HCS10 (Message Schema Standard) Folder :
## a. schema.js :
Defines HCS-10 message schema standards
Provides message type definitions
Implements message validation
Defines status codes and priorities
Creates message templates for different types

#b. serializer.js :
Handles message serialization/deserialization
Manages large message chunking
Implements message signing and verification
Handles message hashing for verification
Provides chunk storage and reassembly

# HCS11 (Profile Standard) Folder :
# a. profile.js :
Manages agent profile creation and updates
Implements profile validation
Handles profile caching
Provides profile querying and filtering
Manages profile topic creation and updates
Key Features Across Files:
Comprehensive error handling
Caching mechanisms for performance
Retry logic for network operations
Validation at multiple levels
Support for large messages through chunking
Secure message handling with signing
Profile management with caching
Standardized message formats

## plugin.ts:
Implements the ElizaOSPlugin class
Integrates with Google's Generative AI (gemini-pro model)
Manages chat memory using BufferMemory
Implements Hedera network tools:
check_balance
create_token
send_message
Handles message processing and intent parsing
Provides error handling and recovery

## types.ts:
Defines core interfaces:
ElizaPluginConfig for plugin configuration
Plugin interface for plugin implementation
Message interface for chat messages
Intent interface for natural language understanding
ActionResponse for operation results
ElizaPluginError for error handling
Defines error codes constants

## intents.ts:
Implements IntentHandler class
Extracts intents from user input
Manages intent templates and patterns
Calculates confidence scores
Extracts parameters from user messages
Maintains intent history
Validates intent requirements

## templates/token.ts:
Defines TokenTemplate interface
Implements token creation from templates
Validates token parameters
Handles token creation responses
Manages token metadata and configuration

## templates/topic.ts:
Defines TopicTemplate interface
Creates topics from templates
Handles HIP-991 configuration
Validates topic parameters
Manages topic keys and permissions
Implements error handling for topic operations

# src folder:
package.json
.gitignore
postcss.config.cjs
package-lock.json
tailwind.config.cjs
tsconfig.json
vite.config.js

## index.js
Loads environment variables
Sets up Express application
Imports necessary modules and configurations
Configures CORS for cross-origin requests
Sets up JSON parsing middleware
Handles API security and access control
Mounts API routes
Provides health check endpoint
Sets up error handling middleware
Serves static files in production
Configures React app serving
Handles client-side routing
Initializes Hedera client
Sets up ElizaOS plugin
Creates and configures chat agent
Manages communication topics
Handles initialization errors
Starts the server after system initialization
Sets up port listening
Provides startup logging
Implements graceful shutdown
Handles process termination
Implements graceful shutdown
Manages server cleanup

# scripts folder

## createTopics.js :
// Creates required HCS topics for the CommuniChain system
- Creates three main system topics:
  - Communication Topic (agent-to-agent communication)
  - Registry Topic (agent registration and capabilities)
  - Monitoring Topic (system monitoring and status)
- Provides topic verification functionality
- Handles topic creation with proper configuration
- Saves topic IDs to .env file if specified

## deploy.js
// Handles system deployment to different networks
- Supports deployment to testnet and mainnet
- Configures environment settings
- Creates required system topics
- Updates .env file with deployment settings
- Functions:
  - configureEnvironment(): Sets up environment configuration
  - deployToTestnet(): Handles testnet deployment
  - deployToMainnet(): Handles mainnet deployment with safety checks
  - deploy(): Main deployment orchestration

## dev.js
// Manages development environment setup
- Starts Vite dev server
- Starts Express server
- Handles process termination gracefully
- Runs both frontend and backend in development mode
- Provides cleanup on process termination

## kill-port.js
// Utility script for port management
- Finds processes running on specified port (default 3000)
- Kills processes using the specified port
- Useful for cleaning up hung processes
- Provides feedback on killed processes



