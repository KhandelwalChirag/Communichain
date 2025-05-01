// src/ui/components/TaskManager.jsx
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

function TaskManager({ tasks, createTask, refreshTasks }) {
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    type: 'research', // Default type
  });
  
  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) return;
    
    const created = await createTask(newTask);
    if (created) {
      setNewTask({
        title: '',
        description: '',
        type: 'research',
      });
      setIsCreatingTask(false);
    }
  };
  
  const handleTaskClick = (task) => {
    setSelectedTask(task.id === selectedTask?.id ? null : task);
  };
  
  // Group tasks by status
  const groupedTasks = tasks.reduce((acc, task) => {
    const status = task.status || 'pending';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(task);
    return acc;
  }, {});
  
  // Pre-define status order for display
  const statusOrder = ['in_progress', 'pending', 'completed', 'failed'];
  
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Tasks</h2>
          
          <div className="flex gap-2">
            <button
              onClick={refreshTasks}
              className="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Refresh
            </button>
            
            <button
              onClick={() => setIsCreatingTask(!isCreatingTask)}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isCreatingTask ? 'Cancel' : 'New Task'}
            </button>
          </div>
        </div>
        
        {isCreatingTask && (
          <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <h3 className="text-lg font-medium text-white mb-3">Create New Task</h3>
            
            <form onSubmit={handleCreateTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task title"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task description"
                    rows="3"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Task Type
                  </label>
                  <select
                    value={newTask.type}
                    onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="research">Research</option>
                    <option value="summarize">Summarize</option>
                    <option value="analyze">Analyze</option>
                    <option value="create">Create</option>
                  </select>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
        
        {/* Task Groups */}
        <div className="space-y-6">
          {statusOrder.map((status) => {
            const tasksInStatus = groupedTasks[status] || [];
            if (tasksInStatus.length === 0) return null;
            
            return (
              <div key={status} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className="bg-slate-700 px-4 py-2">
                  <h3 className="font-medium text-white capitalize">
                    {status.replace('_', ' ')} ({tasksInStatus.length})
                  </h3>
                </div>
                
                <div className="divide-y divide-slate-700">
                  {tasksInStatus.map((task) => (
                    <div 
                      key={task.id} 
                      className={`p-4 cursor-pointer hover:bg-slate-750 ${selectedTask?.id === task.id ? 'bg-slate-700' : ''}`}
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-white">{task.title}</h4>
                          <div className="flex items-center mt-1 space-x-2">
                            <span className="text-xs px-2 py-1 bg-slate-600 text-slate-300 rounded capitalize">
                              {task.type}
                            </span>
                            {task.created_at && (
                              <span className="text-xs text-slate-400">
                                {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Task Status Indicator */}
                        <div className="flex items-center">
                          {status === 'in_progress' && (
                            <div className="flex items-center">
                              <div className="h-2 w-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                              <span className="text-xs text-blue-400">Running</span>
                            </div>
                          )}
                          {status === 'completed' && (
                            <div className="flex items-center">
                              <div className="h-2 w-2 bg-green-500 rounded-full mr-1"></div>
                              <span className="text-xs text-green-400">Done</span>
                            </div>
                          )}
                          {status === 'failed' && (
                            <div className="flex items-center">
                              <div className="h-2 w-2 bg-red-500 rounded-full mr-1"></div>
                              <span className="text-xs text-red-400">Failed</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Task Details (shown when selected) */}
                      {selectedTask?.id === task.id && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          {task.description && (
                            <div className="mb-3">
                              <h5 className="text-sm font-medium text-slate-300 mb-1">Description</h5>
                              <p className="text-slate-400 text-sm whitespace-pre-wrap">{task.description}</p>
                            </div>
                          )}
                          
                          {task.result && (
                            <div className="mb-3">
                              <h5 className="text-sm font-medium text-slate-300 mb-1">Result</h5>
                              <div className="bg-slate-900 p-3 rounded text-sm text-slate-300 overflow-auto max-h-64">
                                <pre className="whitespace-pre-wrap">{task.result}</pre>
                              </div>
                            </div>
                          )}
                          
                          {task.error && status === 'failed' && (
                            <div className="mb-3">
                              <h5 className="text-sm font-medium text-red-400 mb-1">Error</h5>
                              <div className="bg-red-900/30 p-3 rounded text-sm text-red-300 overflow-auto max-h-64 border border-red-900">
                                <pre className="whitespace-pre-wrap">{task.error}</pre>
                              </div>
                            </div>
                          )}
                          
                          {/* Additional task metadata */}
                          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            {task.created_at && (
                              <div>
                                <span className="text-slate-400">Created: </span>
                                <span className="text-slate-300">{new Date(task.created_at).toLocaleString()}</span>
                              </div>
                            )}
                            {task.updated_at && (
                              <div>
                                <span className="text-slate-400">Updated: </span>
                                <span className="text-slate-300">{new Date(task.updated_at).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {tasks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-400">No tasks found.</p>
              <button 
                onClick={() => setIsCreatingTask(true)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create Your First Task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskManager;