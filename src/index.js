import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './api/routes.js';
import hederaConfig from './config/hedera.js';
import { HederaAgent } from './agentkit/hederaAgent.js';
import { ElizaOSPlugin } from './elizaos/plugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Global instances
let elizaPlugin = null;
let hederaAgent = null;

// Middleware
app.use(cors({
  origin: ['http://localhost:5174', 'http://127.0.0.1:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Add middleware for chatbot interactions
app.post('/api/chat', async (req, res) => {
  try {
    if (!elizaPlugin) {
      return res.status(503).json({
        status: 'error',
        message: 'ElizaOS plugin not initialized'
      });
    }
    
    const { message, sender = 'user' } = req.body;
    if (!message) {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required'
      });
    }
    
    const response = await elizaPlugin.handleMessage({
      content: message,
      sender,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      status: 'success',
      response
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error processing chat message'
    });
  }
});

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

    // Get Hedera credentials from environment variables
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    const network = process.env.HEDERA_NETWORK || 'testnet';
    const googleApiKey = process.env.GOOGLE_API_KEY;
    
    if (!accountId || !privateKey) {
      console.warn('Hedera credentials not found in environment variables');
      console.warn('Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY for full functionality');
    } else {
      // Initialize HederaAgent for direct blockchain interactions
      try {
        hederaAgent = new HederaAgent(accountId, privateKey, network);
        console.log('Hedera agent initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Hedera agent:', error);
      }
      
      // Initialize ElizaOS plugin
      try {
        if (!googleApiKey) {
          console.warn('GOOGLE_API_KEY not found in environment variables');
          console.warn('ElizaOS plugin will not be initialized');
        } else {
          elizaPlugin = new ElizaOSPlugin({
            googleApiKey,
            hederaAccountId: accountId,
            hederaPrivateKey: privateKey,
            hederaNetwork: network
          });
          
          await elizaPlugin.initialize();
          console.log('ElizaOS plugin initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize ElizaOS plugin:', error);
      }
    }

    // Create communication topic if needed
    let communicationTopicId = process.env.COMMUNICATION_TOPIC_ID;
    if (hederaAgent && !communicationTopicId) {
      try {
        const topicResult = await hederaAgent.createTopic('agent-communication', true);
        communicationTopicId = topicResult.topicId;
        console.log('Created new communication topic:', communicationTopicId);
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