// src/ui/components/AgentStatus.jsx
import { useState } from 'react';

function AgentStatus({ agents, refreshAgents }) {
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  const handleAgentClick = (agent) => {
    setSelectedAgent(agent.id === selectedAgent?.id ? null : agent);
  };
  
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-xl font-bold text-white mb-4">Connected Agents</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-48 bg-slate-800 rounded-lg border border-slate-700 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <p className="mt-4">No agents connected</p>
            </div>
          ) : (
            agents.map((agent) => (
              <AgentCard 
                key={agent.id} 
                agent={agent} 
                isSelected={agent.id === selectedAgent?.id}
                onClick={() => handleAgentClick(agent)} 
              />
            ))
          )}
        </div>
        
        <div className="flex justify-center mt-4">
          <button
            onClick={refreshAgents}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh Agents
          </button>
        </div>
      </div>
      
      {selectedAgent && (
        <div className="w-96 border-l border-slate-700 bg-slate-800 p-4 overflow-y-auto">
          <AgentDetails agent={selectedAgent} />
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent, isSelected, onClick }) {
  // Calculate agent status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };
  
  return (
    <div
      onClick={onClick}
      className={`bg-slate-800 p-4 rounded-lg border ${
        isSelected ? 'border-blue-500' : 'border-slate-700'
      } cursor-pointer hover:border-blue-400 transition-colors`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-lg font-bold">
          {agent.name?.charAt(0) || 'A'}
        </div>
        <div>
          <h3 className="font-medium text-white">{agent.name || 'Unknown Agent'}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}></div>
            <span>{agent.status || 'Unknown'}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-xs text-slate-400">
          <span className="font-medium">ID:</span> {agent.id}
        </div>
        
        <div className="text-xs text-slate-400">
          <span className="font-medium">Type:</span> {agent.type || 'Standard Agent'}
        </div>
        
        {agent.capabilities && (
          <div className="flex flex-wrap gap-1 mt-2">
            {agent.capabilities.slice(0, 3).map((capability, i) => (
              <span 
                key={i} 
                className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs"
              >
                {capability}
              </span>
            ))}
            {agent.capabilities.length > 3 && (
              <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                +{agent.capabilities.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AgentDetails({ agent }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">Agent Details</h3>
        <div className={`px-2 py-1 text-xs rounded ${
          agent.status === 'active' ? 'bg-green-600 text-green-100' : 
          agent.status === 'busy' ? 'bg-yellow-600 text-yellow-100' : 
          'bg-red-600 text-red-100'
        }`}>
          {agent.status || 'Unknown'}
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-slate-400 mb-1">Agent ID</h4>
          <p className="text-white bg-slate-700 p-2 rounded overflow-x-auto">
            {agent.id}
          </p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-slate-400 mb-1">Name</h4>
          <p className="text-white">{agent.name || 'Unnamed Agent'}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-slate-400 mb-1">Type</h4>
          <p className="text-white">{agent.type || 'Standard Agent'}</p>
        </div>
        
        {agent.description && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-1">Description</h4>
            <p className="text-white">{agent.description}</p>
          </div>
        )}
        
        {agent.capabilities && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-1">Capabilities</h4>
            <div className="space-y-1">
              {agent.capabilities.map((capability, i) => (
                <div 
                  key={i} 
                  className="px-2 py-1 bg-slate-700 text-white rounded text-sm"
                >
                  {capability}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {agent.metadata && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-1">Metadata</h4>
            <pre className="text-xs bg-slate-700 p-2 rounded overflow-x-auto text-white">
              {JSON.stringify(agent.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentStatus;