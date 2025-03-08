import { useState, useEffect } from 'react';
import { FiPlus, FiMessageSquare, FiTrash2, FiLoader } from 'react-icons/fi';
import { ChatThread } from '@/types';
import { api } from '@/services/api';

interface SidebarProps {
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  currentThreadId?: string;
}

export default function Sidebar({ onNewChat, onSelectThread, currentThreadId }: SidebarProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch threads on component mount
  useEffect(() => {
    fetchThreads();
  }, []);

  // Fetch threads from the API
  const fetchThreads = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedThreads = await api.getThreads();
      
      // If no threads were returned, add some test threads for development
      if (fetchedThreads.length === 0) {
        console.log('No threads returned, adding test threads for development');
        const testThreads = [
          {
            id: 'test-thread-1',
            title: 'Test Thread 1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            messages: []
          },
          {
            id: 'test-thread-2',
            title: 'Test Thread 2',
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            updated_at: new Date(Date.now() - 86400000).toISOString(),
            messages: []
          },
          {
            id: 'test-thread-3',
            title: 'Test Thread 3',
            created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            updated_at: new Date(Date.now() - 172800000).toISOString(),
            messages: []
          }
        ];
        setThreads(testThreads);
      } else {
        setThreads(fetchedThreads);
      }
    } catch (err) {
      console.error('Error fetching threads:', err);
      setError('Failed to load chat history');
      
      // Add test threads even on error for development
      console.log('Adding test threads due to error');
      const testThreads = [
        {
          id: 'test-thread-1',
          title: 'Test Thread 1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          messages: []
        },
        {
          id: 'test-thread-2',
          title: 'Test Thread 2',
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          messages: []
        }
      ];
      setThreads(testThreads);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="w-64 h-full bg-gray-900 text-white flex flex-col border-r border-gray-700">
      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors"
        >
          <FiPlus className="text-sm" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <FiLoader className="animate-spin text-gray-400 mr-2" />
            <span className="text-gray-400">Loading chats...</span>
          </div>
        ) : error ? (
          <div className="text-red-400 p-4 text-center">
            {error}
            <button 
              onClick={fetchThreads} 
              className="block mx-auto mt-2 text-sm text-blue-400 hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        ) : threads.length === 0 ? (
          <div className="text-gray-400 p-4 text-center">
            No chat history yet
          </div>
        ) : (
          <ul className="space-y-1 px-2">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  onClick={() => onSelectThread(thread.id!)}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-start gap-2 hover:bg-gray-700 transition-colors ${
                    currentThreadId === thread.id ? 'bg-gray-700' : ''
                  }`}
                >
                  <FiMessageSquare className="text-gray-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">
                      {thread.title || 'New Chat'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {thread.updated_at ? formatDate(thread.updated_at) : 'Just now'}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>SoulGraph Chat</span>
          <button 
            onClick={fetchThreads}
            className="hover:text-white transition-colors"
            title="Refresh chats"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
} 