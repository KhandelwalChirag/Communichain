// src/ui/components/MessageThread.jsx
import { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';

function MessageThread({ messages, loading }) {
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Format timestamp to relative time
  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return '';
    }
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <p className="mt-4 text-lg">Start a conversation with the agents</p>
          <p className="text-sm">Ask a question or request a task</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))
      )}
      
      {loading && (
        <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700 animate-pulse">
          <div className="w-8 h-8 bg-slate-700 rounded-full"></div>
          <div className="space-y-2">
            <div className="w-24 h-4 bg-slate-700 rounded"></div>
            <div className="w-32 h-3 bg-slate-700 rounded"></div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef}></div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.sender === 'user';
  
  // Check if there's a tool call in the metadata
  const hasToolCall = message.metadata?.toolCalls?.length > 0;
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3/4 ${isUser ? 'bg-blue-600' : 'bg-slate-700'} rounded-lg p-3`}>
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-6 h-6 rounded-full ${isUser ? 'bg-blue-500' : 'bg-slate-600'} flex items-center justify-center text-xs`}>
            {isUser ? 'U' : 'A'}
          </div>
          <span className="font-medium text-white">
            {isUser ? 'You' : 'Agent'}
          </span>
          <span className="text-xs text-slate-300">
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
        </div>
        
        <div className="prose prose-sm prose-invert max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        
        {hasToolCall && (
          <div className="mt-2 pt-2 border-t border-slate-600">
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-300">
                Tool operations performed
              </summary>
              <pre className="mt-2 p-2 bg-slate-800 rounded overflow-x-auto">
                {JSON.stringify(message.metadata.toolCalls, null, 2)}
              </pre>
            </details>
          </div>
        )}
        
        {message.metadata?.error && (
          <div className="mt-2 p-2 bg-red-900/50 text-red-200 rounded-md text-xs">
            Error: {message.metadata.error}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageThread;