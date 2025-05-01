import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import hederaPlugin from './elizaos/plugin.js';
import apiRoutes from './api/routes.js';
import hederaConfig from './config/hedera.js';
import { ChatAgent } from './agents/ChatAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5174', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());


// API routes
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Initialize system components
async function initializeSystem() {
  try {
    console.log('Initializing system components...');

    // Initialize Hedera client
    let client = null;
    try {
      client = hederaConfig.getClient();
      console.log('Hedera client initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize Hedera client:', error.message);
      console.log('Continuing in local mode...');
    }

    // Initialize ElizaOS plugin
    await hederaPlugin.initialize();
    console.log('ElizaOS plugin initialized');

    // Initialize chat agent
    const agentkit = new HederaAgentKit(client);

    const chatAgent = new ChatAgent(agentkit, process.env.GOOGLE_API_KEY);
    
    try {
      await chatAgent.initialize();
      console.log('Chat agent initialized successfully');
    } catch (error) {
      console.error('Failed to initialize chat agent:', error);
      throw error;
    }

    // Create communication topic if needed
    let communicationTopicId = process.env.COMMUNICATION_TOPIC_ID;
    if (client && !communicationTopicId) {
      try {
        const { createTopic } = await import('./core/hcs/topics.js');
        communicationTopicId = await createTopic('agent-communication');
        console.log('Created new communication topic:', communicationTopicId);
        
        // Set communication topic for chat agent
        chatAgent.setCommunicationTopic(communicationTopicId);
      } catch (error) {
        console.warn('Failed to create communication topic:', error.message);
      }
    }

    console.log('System initialized successfully');

  } catch (error) {
    console.error('System initialization failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    console.warn('Continuing in degraded mode...');
  }
}

// Start server
initializeSystem()
  .then(() => {
    const server = app.listen(port, '127.0.0.1', () => {
      console.log(`Server running on http://127.0.0.1:${port}`);
      console.log(`API available at http://127.0.0.1:${port}/api`);
      if (process.env.NODE_ENV === 'development') {
        console.log('React app available at http://localhost:5174');
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  })
  .catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
