import { useState, useEffect, useRef } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// Initialize the Supabase client
// Replace these with your actual Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

interface Message {
  role: string;
  content: string;
}

interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export default function SupabaseRealTimeExample() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [status, setStatus] = useState('disconnected');
  const [events, setEvents] = useState<any[]>([]);
  
  // References to store channel subscriptions
  const allThreadsChannelRef = useRef<RealtimeChannel | null>(null);
  const threadChannelRef = useRef<RealtimeChannel | null>(null);
  
  // Load threads on component mount and set up real-time subscription
  useEffect(() => {
    // Fetch initial threads
    fetchThreads();
    
    // Set up real-time subscription to all threads
    setupAllThreadsSubscription();
    
    // Clean up on unmount
    return () => {
      cleanupSubscriptions();
    };
  }, []);
  
  // Set up subscription for a specific thread when selected
  useEffect(() => {
    // Clean up previous thread subscription
    if (threadChannelRef.current) {
      console.log('Cleaning up previous thread subscription');
      threadChannelRef.current.unsubscribe();
      threadChannelRef.current = null;
    }
    
    if (selectedThreadId) {
      // Fetch thread messages
      fetchThreadMessages(selectedThreadId);
      
      // Set up real-time subscription for this thread
      setupThreadSubscription(selectedThreadId);
    } else {
      setMessages([]);
    }
  }, [selectedThreadId]);
  
  // Fetch all threads
  const fetchThreads = async () => {
    try {
      console.log('Fetching threads...');
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching threads:', error);
      } else {
        console.log('Threads fetched:', data);
        setThreads(data || []);
      }
    } catch (err) {
      console.error('Exception fetching threads:', err);
    }
  };
  
  // Fetch messages for a specific thread
  const fetchThreadMessages = async (threadId: string) => {
    try {
      console.log(`Fetching messages for thread ${threadId}...`);
      const { data, error } = await supabase
        .from('chat_threads')
        .select('messages')
        .eq('id', threadId)
        .single();
        
      if (error) {
        console.error('Error fetching thread messages:', error);
      } else {
        console.log('Thread messages fetched:', data);
        setMessages(data?.messages || []);
      }
    } catch (err) {
      console.error('Exception fetching thread messages:', err);
    }
  };
  
  // Set up subscription to all threads
  const setupAllThreadsSubscription = () => {
    try {
      console.log('Setting up subscription to all threads...');
      
      // Create a unique channel name
      const channelName = `all-threads-${Math.random().toString(36).substring(2, 9)}`;
      
      allThreadsChannelRef.current = supabase.channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_threads' },
          (payload) => {
            console.log('Thread change detected:', payload);
            addEvent({
              type: 'thread_change',
              eventType: payload.eventType,
              threadId: payload.new?.id || payload.old?.id,
              timestamp: new Date().toISOString()
            });
            
            // Update threads based on the event type
            if (payload.eventType === 'INSERT') {
              // Add the new thread to the list
              if (payload.new) {
                setThreads(prev => [payload.new as ChatThread, ...prev]);
              }
            } else if (payload.eventType === 'UPDATE') {
              // Update the thread in the list
              if (payload.new) {
                setThreads(prev => 
                  prev.map(thread => 
                    thread.id === payload.new.id ? { ...thread, ...payload.new } : thread
                  )
                );
                
                // If this is the selected thread, update messages if needed
                if (payload.new.id === selectedThreadId && payload.new.messages) {
                  setMessages(payload.new.messages);
                }
              }
            } else if (payload.eventType === 'DELETE') {
              // Remove the thread from the list
              if (payload.old) {
                setThreads(prev => 
                  prev.filter(thread => thread.id !== payload.old.id)
                );
                
                // If this was the selected thread, clear selection
                if (payload.old.id === selectedThreadId) {
                  setSelectedThreadId(null);
                }
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('All threads subscription status:', status);
          setStatus(status);
        });
    } catch (err) {
      console.error('Error setting up all threads subscription:', err);
    }
  };
  
  // Set up subscription to a specific thread
  const setupThreadSubscription = (threadId: string) => {
    try {
      console.log(`Setting up subscription to thread ${threadId}...`);
      
      // Create a unique channel name for this thread
      const channelName = `thread-${threadId}-${Math.random().toString(36).substring(2, 9)}`;
      
      threadChannelRef.current = supabase.channel(channelName)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'chat_threads',
            filter: `id=eq.${threadId}`
          },
          (payload) => {
            console.log(`Change detected for thread ${threadId}:`, payload);
            addEvent({
              type: 'specific_thread_change',
              eventType: payload.eventType,
              threadId: threadId,
              timestamp: new Date().toISOString()
            });
            
            // Handle the change based on event type
            if (payload.eventType === 'UPDATE') {
              // Update messages if they've changed
              if (payload.new && payload.new.messages) {
                setMessages(payload.new.messages);
              }
            } else if (payload.eventType === 'DELETE') {
              // Thread was deleted, clear selection
              setSelectedThreadId(null);
            }
          }
        )
        .subscribe((status) => {
          console.log(`Thread ${threadId} subscription status:`, status);
        });
    } catch (err) {
      console.error(`Error setting up subscription for thread ${threadId}:`, err);
    }
  };
  
  // Clean up all subscriptions
  const cleanupSubscriptions = () => {
    if (allThreadsChannelRef.current) {
      console.log('Cleaning up all threads subscription');
      allThreadsChannelRef.current.unsubscribe();
      allThreadsChannelRef.current = null;
    }
    
    if (threadChannelRef.current) {
      console.log('Cleaning up thread subscription');
      threadChannelRef.current.unsubscribe();
      threadChannelRef.current = null;
    }
  };
  
  // Add a new event to the events list
  const addEvent = (event: any) => {
    setEvents(prev => [event, ...prev].slice(0, 10)); // Keep only the 10 most recent events
  };
  
  // Create a new thread
  const createThread = async () => {
    try {
      const title = `New Thread ${new Date().toLocaleTimeString()}`;
      console.log(`Creating new thread: ${title}...`);
      
      const { data, error } = await supabase
        .from('chat_threads')
        .insert({
          title: title,
          messages: [
            { role: 'system', content: 'This is a new chat thread.' },
            { role: 'user', content: 'Hello, this is the first message.' }
          ]
        })
        .select();
        
      if (error) {
        console.error('Error creating thread:', error);
      } else {
        console.log('Thread created:', data);
        // Select the new thread
        if (data && data[0]) {
          setSelectedThreadId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Exception creating thread:', err);
    }
  };
  
  // Send a message to the selected thread
  const sendMessage = async () => {
    if (!selectedThreadId || !newMessage.trim()) return;
    
    try {
      console.log(`Sending message to thread ${selectedThreadId}...`);
      
      // Add the new message to the current messages
      const updatedMessages = [
        ...messages,
        { role: 'user', content: newMessage.trim() }
      ];
      
      // Update the thread with the new messages
      const { error } = await supabase
        .from('chat_threads')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedThreadId);
        
      if (error) {
        console.error('Error sending message:', error);
      } else {
        console.log('Message sent');
        setNewMessage('');
        
        // Simulate an assistant response after 1 second
        setTimeout(async () => {
          const assistantMessages = [
            ...updatedMessages,
            { role: 'assistant', content: `This is an automated response to: "${newMessage.trim()}"` }
          ];
          
          const { error: responseError } = await supabase
            .from('chat_threads')
            .update({
              messages: assistantMessages,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedThreadId);
            
          if (responseError) {
            console.error('Error sending assistant response:', responseError);
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Exception sending message:', err);
    }
  };
  
  // Delete a thread
  const deleteThread = async (threadId: string) => {
    try {
      console.log(`Deleting thread ${threadId}...`);
      
      const { error } = await supabase
        .from('chat_threads')
        .delete()
        .eq('id', threadId);
        
      if (error) {
        console.error('Error deleting thread:', error);
      } else {
        console.log('Thread deleted');
        if (selectedThreadId === threadId) {
          setSelectedThreadId(null);
        }
      }
    } catch (err) {
      console.error('Exception deleting thread:', err);
    }
  };
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Supabase Real-Time Chat Example</h1>
      
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span>Status: </span>
          <span className={`px-2 py-1 rounded text-sm ${
            status === 'SUBSCRIBED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {status}
          </span>
        </div>
      </div>
      
      <div className="flex gap-4">
        {/* Threads List */}
        <div className="w-1/3 border rounded p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Threads</h2>
            <button 
              onClick={createThread}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              New Thread
            </button>
          </div>
          
          {threads.length === 0 ? (
            <p className="text-gray-500">No threads yet. Create one to get started.</p>
          ) : (
            <ul className="space-y-2">
              {threads.map(thread => (
                <li 
                  key={thread.id}
                  className={`p-2 border rounded cursor-pointer hover:bg-gray-100 flex justify-between ${
                    selectedThreadId === thread.id ? 'bg-blue-50 border-blue-300' : ''
                  }`}
                  onClick={() => setSelectedThreadId(thread.id)}
                >
                  <div>
                    <div className="font-medium">{thread.title}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(thread.updated_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteThread(thread.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Messages */}
        <div className="w-2/3 border rounded p-4">
          {selectedThreadId ? (
            <>
              <h2 className="text-xl font-semibold mb-4">
                {threads.find(t => t.id === selectedThreadId)?.title || 'Thread'}
              </h2>
              
              <div className="h-80 overflow-y-auto mb-4 border rounded p-2">
                {messages.length === 0 ? (
                  <p className="text-gray-500">No messages yet.</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message, index) => (
                      <div 
                        key={index}
                        className={`p-2 rounded ${
                          message.role === 'user' 
                            ? 'bg-blue-100 ml-8' 
                            : message.role === 'assistant'
                              ? 'bg-green-100 mr-8'
                              : 'bg-gray-100'
                        }`}
                      >
                        <div className="text-xs font-semibold mb-1">
                          {message.role === 'user' 
                            ? 'You' 
                            : message.role === 'assistant'
                              ? 'Assistant'
                              : 'System'}
                        </div>
                        <div>{message.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border rounded"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500">Select a thread to view messages.</p>
          )}
        </div>
      </div>
      
      {/* Events Log */}
      <div className="mt-8 border rounded p-4">
        <h2 className="text-xl font-semibold mb-2">Real-Time Events</h2>
        {events.length === 0 ? (
          <p className="text-gray-500">No events yet.</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {events.map((event, index) => (
              <div key={index} className="p-2 border rounded bg-gray-50">
                <div className="flex justify-between text-sm">
                  <span>
                    <span className="font-medium">{event.type}</span>
                    {' - '}
                    <span className="text-blue-600">{event.eventType}</span>
                    {event.threadId && ` (Thread: ${event.threadId.substring(0, 8)}...)`}
                  </span>
                  <span className="text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 