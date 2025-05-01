import express from 'express';

const router = express.Router();
import { schema } from '../core/hcs10/schema.js';
import hederaPlugin from '../elizaos/plugin.js';

// Track system start time
const systemStartTime = Date.now();

/**
 * GET /api/status
 * System status endpoint
 */
router.get('/status', async (req, res) => {
  try {
    const agents = registry.getAllAgents();
    const now = Date.now();
    
    const status = {
      uptime: (now - systemStartTime) / 1000,
      timestamp: new Date().toISOString(),
      agentCount: agents.length,
      version: '1.0.0',
      status: 'operational',
      metrics: {
        activeAgents: agents.filter(a => a.status === 'active').length,
        totalCapabilities: new Set(agents.flatMap(a => Array.from(a.capabilities))).size,
        lastAgentRegistration: agents.length > 0 
          ? Math.max(...agents.map(a => a.registeredAt || 0))
          : null
      }
    };

    // Check system health
    try {
      const elizaHealth = hederaPlugin.getHealth();
      if (!elizaHealth.healthy) {
        status.status = 'degraded';
        status.warnings = [`ElizaOS: ${elizaHealth.message}`];
      }

      const unhealthyAgents = agents.filter(a => a.status === 'error');
      if (unhealthyAgents.length > 0) {
        status.status = 'degraded';
        status.warnings = [
          ...(status.warnings || []),
          `${unhealthyAgents.length} agents reporting errors`
        ];
      }
    } catch (error) {
      status.status = 'error';
      status.error = error.message;
    }

    return res.json(status);
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/agents
 * List all registered agents
 */
router.get('/agents', (req, res) => {
  const agents = registry.getAllAgents().map(agent => ({
    id: agent.id,
    type: agent.type,
    name: agent.name,
    status: agent.status || 'active',
    capabilities: Array.from(agent.capabilities)
  }));
  res.json(agents);
});

/**
 * GET /api/agents/:id
 * Get specific agent details
 */
router.get('/agents/:id', (req, res) => {
  const agent = registry.getAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json({
    id: agent.id,
    type: agent.type,
    name: agent.name,
    status: agent.status || 'active',
    capabilities: Array.from(agent.capabilities)
  });
});

/**
 * POST /api/agents/:id/message
 * Send message to specific agent
 */
router.post('/agents/:id/message', async (req, res) => {
  try {
    const agent = registry.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { type = 'query', content, message } = req.body;
    
    // Handle both direct messages and structured queries
    const messageContent = message ? { query: message } : content;
    
    const result = await agent.processMessage({
      type: schema.MESSAGE_TYPES[type.toUpperCase()] || schema.MESSAGE_TYPES.QUERY,
      content: messageContent,
      sender: { id: 'api', type: 'api' },
      recipient: { id: agent.id }
    });

    // If no result but no error, send acknowledgement
    if (!result) {
      return res.json({ type: 'success', content: 'Message delivered successfully' });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ type: 'error', content: error.message });
  }
});

/**
 * POST /api/tasks
 * Create new task for appropriate agent
 */
router.post('/tasks', async (req, res) => {
  try {
    const { taskType, description, parameters = {} } = req.body;
    
    // Find suitable agent for task
    const agents = registry.findAgentsByCapability(taskType);
    if (agents.length === 0) {
      return res.status(400).json({ error: 'No agent available for this task type' });
    }
    
    // Assign to first capable agent
    const agent = agents[0];
    const result = await agent.handleTask({
      type: schema.MESSAGE_TYPES.TASK,
      content: { taskType, description, parameters },
      sender: { id: 'api', type: 'api' },
      recipient: { id: agent.id }
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/chat
 * Natural language interface using ElizaOS
 */
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        type: 'error',
        content: 'Message is required'
      });
    }

    try {
      const response = await hederaPlugin.handleUserInput(message);
      
      // The response should now consistently have a response string in data.response
      return res.json({
        type: 'success',
        content: response.data.response,
        metadata: {
          timestamp: response.data.timestamp,
          handler: 'elizaos'
        }
      });

    } catch (error) {
      console.error('Chat error:', error);
      return res.status(500).json({
        type: 'error',
        content: error.message || 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({
      type: 'error',
      content: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/capabilities
 * List all available capabilities in the system
 */
router.get('/capabilities', (req, res) => {
  const agents = registry.getAllAgents();
  const capabilities = new Set();
  
  agents.forEach(agent => {
    agent.capabilities.forEach(cap => capabilities.add(cap));
  });
  
  res.json(Array.from(capabilities));
});

export default router;