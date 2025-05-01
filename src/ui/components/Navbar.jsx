// src/ui/components/Navbar.jsx
import { useState, useEffect } from 'react';

function Navbar() {
  const [systemStatus, setSystemStatus] = useState({
    uptime: '0s',
    version: '1.0.0',
    agents: 0,
    status: 'connecting',
  });
  
  useEffect(() => {
    // Fetch system status
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (response.ok) {
          const data = await response.json();
          setSystemStatus(data);
        }
      } catch (error) {
        console.error('Error fetching system status:', error);
      }
    };
    
    // Fetch on mount and periodically
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Get status indicator color
  const getStatusColor = () => {
    switch (systemStatus.status?.toLowerCase()) {
      case 'online':
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'offline':
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };
  
  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <LogoIcon />
          </div>
          <h1 className="text-xl font-bold text-white">CommuniChain</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <SystemStatusIndicator 
              status={systemStatus.status} 
              color={getStatusColor()} 
            />
            
            <div className="text-sm text-slate-300">
              <span className="mr-2">v{systemStatus.version}</span>
              <span>Uptime: {systemStatus.uptime}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-700 px-3 py-1.5 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span className="text-sm text-white">
              {systemStatus.agents} Agent{systemStatus.agents !== 1 ? 's' : ''}
            </span>
          </div>
          
          <button className="md:hidden text-slate-300 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function LogoIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#3B82F6" />
      <path d="M10 10L16 16M16 16L22 22M16 16L22 10M16 16L10 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function SystemStatusIndicator({ status, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`}></div>
      <span className="text-sm text-slate-300 capitalize">
        {status || 'Unknown'}
      </span>
    </div>
  );
}

export default Navbar;