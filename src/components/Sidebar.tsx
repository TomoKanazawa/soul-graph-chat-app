import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiMessageSquare, FiTrash2, FiLoader } from 'react-icons/fi';
import { ChatThread } from '@/types';
import { api } from '@/services/api';
import { subscribeToThreads } from '@/services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SidebarProps {
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
  currentThreadId?: string;
}

export default function Sidebar({ onNewChat, onSelectThread, currentThreadId }: SidebarProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch threads on component mount and set up real-time subscription
  useEffect(() => {
    fetchThreads();

    // Set up real-time subscription to thread changes
    try {
      console.log('Setting up real-time subscription to all threads');
      channelRef.current = subscribeToThreads((payload) => {
        console.log('Thread change detected:', payload);
        
        // Handle different event types
        if (payload.eventType === 'INSERT') {
          console.log('New thread created:', payload.new);
          // Fetch all threads to ensure we have the latest data
          fetchThreads();
        } else if (payload.eventType === 'UPDATE') {
          console.log('Thread updated:', payload.new);
          // Update the thread in the local state if possible
          if (payload.new && payload.new.id) {
            setThreads(prevThreads => 
              prevThreads.map(thread => 
                thread.id === payload.new.id ? { ...thread, ...payload.new } : thread
              )
            );
          } else {
            // Fallback to fetching all threads
            fetchThreads();
          }
        } else if (payload.eventType === 'DELETE') {
          console.log('Thread deleted:', payload.old);
          // Remove the thread from the local state
          if (payload.old && payload.old.id) {
            setThreads(prevThreads => 
              prevThreads.filter(thread => thread.id !== payload.old.id)
            );
          } else {
            // Fallback to fetching all threads
            fetchThreads();
          }
        } else {
          // For any other event, refresh all threads
          fetchThreads();
        }
      });
    } catch (err) {
      console.error('Error setting up real-time subscription:', err);
    }

    // Clean up subscription on unmount
    return () => {
      if (channelRef.current) {
        console.log('Cleaning up thread subscription');
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
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

  // Delete a thread
  const handleDeleteThread = async (threadId: string, event: React.MouseEvent) => {
    // Stop the event from bubbling up to the parent button
    event.stopPropagation();
    
    if (!threadId) return;
    
    // Set the deleting state
    setDeletingThreadId(threadId);
    
    try {
      // Call the API to delete the thread
      const success = await api.deleteThread(threadId);
      
      if (success) {
        // Remove the thread from the local state
        setThreads(threads.filter(thread => thread.id !== threadId));
        
        // If the deleted thread is the current thread, create a new chat
        if (currentThreadId === threadId) {
          onNewChat();
        }
      } else {
        setError('Failed to delete thread');
      }
    } catch (err) {
      console.error('Error deleting thread:', err);
      setError('Failed to delete thread');
    } finally {
      // Clear the deleting state
      setDeletingThreadId(null);
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
              <li key={thread.id} className="relative">
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
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteThread(thread.id!, e)}
                  className="absolute right-2 top-2 p-1 rounded-full hover:bg-gray-600 text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete thread"
                  disabled={deletingThreadId === thread.id}
                >
                  {deletingThreadId === thread.id ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <FiTrash2 className="text-sm" />
                  )}
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