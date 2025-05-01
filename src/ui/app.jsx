// src/ui/App.jsx
import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import MessageThread from './components/MessageThread';
import AgentStatus from './components/AgentStatus';
import TaskManager from './components/TaskManager';
import Navbar from './components/Navbar';
import { useToast } from './hooks/useToast';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const { Toast, showToast } = useToast();
  const messageInputRef = useRef(null);

  useEffect(() => {
    // Fetch agents when component mounts
    fetchAgents();
    fetchTasks();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      showToast('Error fetching agents', 'error');
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showToast('Error fetching tasks', 'error');
    }
  };

  const sendMessage = async (content) => {
    if (!content.trim()) return;
    
    try {
      setLoading(true);
      
      // Add user message to the UI immediately
      const userMessage = {
        content,
        sender: 'user',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Send message to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      
      // Add agent response to messages
      setMessages(prev => [...prev, data.message]);
      
      // Refresh tasks if new tasks were created
      if (data.taskCreated) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Error sending message', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData) => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });
      
      if (!response.ok) throw new Error('Failed to create task');
      
      const data = await response.json();
      showToast('Task created successfully', 'success');
      
      // Refresh tasks
      fetchTasks();
      return data.task;
    } catch (error) {
      console.error('Error creating task:', error);
      showToast('Error creating task', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const content = messageInputRef.current.value;
    sendMessage(content);
    messageInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      <Toast />
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          agents={agents}
        />
        
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeView === 'chat' && (
            <div className="flex-1 flex flex-col">
              <MessageThread 
                messages={messages} 
                loading={loading} 
              />
              
              <form 
                onSubmit={handleSubmit} 
                className="p-4 border-t border-slate-700 bg-slate-800"
              >
                <div className="flex gap-2">
                  <input
                    ref={messageInputRef}
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {activeView === 'agents' && (
            <AgentStatus agents={agents} refreshAgents={fetchAgents} />
          )}
          
          {activeView === 'tasks' && (
            <TaskManager 
              tasks={tasks} 
              createTask={createTask} 
              refreshTasks={fetchTasks} 
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;