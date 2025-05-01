// src/ui/components/Sidebar.jsx
import { useState } from 'react';

function Sidebar({ activeView, setActiveView, agents }) {
  const [collapsed, setCollapsed] = useState(false);
  
  const menuItems = [
    { id: 'chat', label: 'Chat', icon: 'message-square' },
    { id: 'agents', label: 'Agents', icon: 'users', count: agents.length },
    { id: 'tasks', label: 'Tasks', icon: 'check-square' },
    { id: 'network', label: 'Network', icon: 'activity' },
  ];
  
  return (
    <aside 
      className={`bg-slate-800 border-r border-slate-700 transition-all ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!collapsed && (
          <h1 className="text-xl font-bold text-white">CommuniChain</h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-full hover:bg-slate-700 text-slate-400"
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          )}
        </button>
      </div>
      
      <nav className="p-2">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${
                  activeView === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="flex-shrink-0">
                  <SidebarIcon name={item.icon} />
                </span>
                
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.count !== undefined && (
                      <span className="bg-slate-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {item.count}
                      </span>
                    )}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 text-slate-300">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>System Connected</span>
          </div>
        </div>
      )}
    </aside>
  );
}

function SidebarIcon({ name }) {
  // Simple icon mapping
  switch (name) {
    case 'message-square':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      );
    case 'users':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      );
    case 'check-square':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4"></polyline>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </svg>
      );
    case 'activity':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
      );
    default:
      return null;
  }
}

export default Sidebar;