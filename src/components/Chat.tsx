import { useState, useEffect, useRef } from 'react';
import { Message, ModelType } from '@/types';
import { api } from '@/services/api';
import { subscribeToThread, supabase } from '@/services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { FiSend, FiSettings, FiInfo, FiX, FiMessageCircle } from 'react-icons/fi';

interface ChatProps {
  threadId?: string;
  onThreadCreated?: (threadId: string) => void;
}

export default function Chat({ threadId, onThreadCreated }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useStreaming, setUseStreaming] = useState<boolean>(true);
  const [streamingStatus, setStreamingStatus] = useState<string>('');
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [chunkCount, setChunkCount] = useState<number>(0);
  const [receivedChunks, setReceivedChunks] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>('soulgraph');
  const [trainMode, setTrainMode] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const assistantMessageRef = useRef<Message | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentResponseRef = useRef<string>('');
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, debugInfo, isTyping]);

  // Force re-render when messages change
  useEffect(() => {
    // This empty effect will trigger a re-render when messages change
    // The dependency array ensures it runs after each message update
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cleanup typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  // Load thread messages when threadId changes and set up real-time subscription
  useEffect(() => {
    // Clean up previous subscription if it exists
    if (channelRef.current) {
      console.log(`Cleaning up previous subscription`);
      addDebugInfo(`Cleaning up previous subscription`);
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    if (threadId) {
      loadThreadMessages(threadId);
      
      // Set up real-time subscription to thread changes
      if (!threadId.startsWith('test-')) { // Don't subscribe to test threads
        addDebugInfo(`Setting up real-time subscription for thread: ${threadId}`);
        
        try {
          channelRef.current = subscribeToThread(threadId, (payload) => {
            console.log(`Thread ${threadId} change detected:`, payload);
            addDebugInfo(`Real-time update received for thread: ${threadId}`);
            
            if (payload.new && payload.old) {
              // Compare message counts to see if messages were added
              const oldMessages = (payload.old as { messages?: Message[] }).messages || [];
              const newMessages = (payload.new as { messages?: Message[] }).messages || [];
              
              if (Array.isArray(oldMessages) && Array.isArray(newMessages) && 
                  newMessages.length > oldMessages.length) {
                addDebugInfo(`Messages updated: ${oldMessages.length} → ${newMessages.length}`);
                
                // Update messages directly from the payload if possible
                if (newMessages.length > 0) {
                  const processedMessages = newMessages.map(msg => ({
                    ...msg,
                    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
                  }));
                  setMessages(processedMessages);
                  addDebugInfo(`Updated messages directly from real-time payload`);
                  return;
                }
              } else {
                addDebugInfo(`Thread updated but message count unchanged`);
              }
            }
            
            // Refresh thread messages when changes are detected
            loadThreadMessages(threadId);
          });
          
          addDebugInfo(`Real-time subscription initialized for thread: ${threadId}`);
        } catch (err) {
          console.error('Error setting up real-time subscription:', err);
          addDebugInfo(`Error setting up real-time subscription: ${err instanceof Error ? err.message : String(err)}`);
        }
      } else {
        addDebugInfo(`Not subscribing to test thread: ${threadId}`);
      }
    } else {
      // Clear messages for a new chat
      setMessages([]);
    }
    
    // Clean up subscription on unmount or when threadId changes
    return () => {
      if (channelRef.current) {
        console.log(`Cleaning up subscription on unmount/change`);
        addDebugInfo(`Cleaning up subscription on unmount/change`);
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Add debug info
  const addDebugInfo = (info: string) => {
    if (debugMode) {
      setDebugInfo(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${info}`]);
    }
  };

  // Show typing indicator for a short time after each chunk
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showTypingIndicator = () => {
    setIsTyping(true);
    
    // Clear any existing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    
    // Set a new timer to hide the typing indicator after a delay
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  // Handle streaming chunks
  const handleStreamChunk = (chunk: string, isComplete: boolean, newThreadId?: string, rawChunk?: string) => {
    // Add debug info
    if (debugMode && rawChunk) {
      addDebugInfo(`Received chunk: ${rawChunk}`);
    }
    
    // Update chunk count
    setChunkCount(prev => prev + 1);
    setReceivedChunks(prev => [...prev, chunk]);
    
    // If this is the first chunk with a thread ID and we don't have one yet
    if (newThreadId && !threadId && onThreadCreated) {
      onThreadCreated(newThreadId);
    }
    
    // Update the current response
    currentResponseRef.current += chunk;
    
    // If this is the first chunk, create a new assistant message
    if (!assistantMessageRef.current) {
      const newAssistantMessage: Message = {
        role: 'assistant',
        content: chunk,
        timestamp: new Date()
      };
      assistantMessageRef.current = newAssistantMessage;
      setMessages(prev => [...prev, newAssistantMessage]);
    } else {
      // Otherwise update the existing message
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: currentResponseRef.current
          };
        }
        return updated;
      });
    }
    
    // Update streaming status
    setStreamingStatus(isComplete ? 'Complete' : `Receiving (${chunkCount} chunks)`);
    
    // Reset typing state when complete
    if (isComplete) {
      addDebugInfo('Stream complete');
      setIsLoading(false);
      setIsTyping(false);
      assistantMessageRef.current = null;
    }
  };

  // Load messages for a specific thread
  const loadThreadMessages = async (threadId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Loading thread messages for thread ID: ${threadId}`);
      addDebugInfo(`Loading messages for thread: ${threadId}`);
      
      // For test threads, use mock data
      if (threadId.startsWith('test-')) {
        console.log('Using mock data for test thread');
        const mockMessages: Message[] = [
          { role: 'system', content: 'You are a helpful assistant.', timestamp: new Date(Date.now() - 120000) },
          { role: 'user', content: 'Hello, how are you?', timestamp: new Date(Date.now() - 60000) },
          { role: 'assistant', content: 'I\'m doing well, thank you for asking! How can I help you today?', timestamp: new Date() }
        ];
        setMessages(mockMessages);
        console.log(`Loaded ${mockMessages.length} mock messages`);
        addDebugInfo(`Loaded ${mockMessages.length} mock messages`);
        setIsLoading(false);
        return;
      }
      
      // Check Supabase directly first for faster updates
      addDebugInfo(`Checking Supabase for thread data...`);
      try {
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('chat_threads')
          .select('id, title, messages, updated_at')
          .eq('id', threadId)
          .maybeSingle();
          
        if (supabaseError) {
          console.error('Error fetching thread from Supabase:', supabaseError);
          addDebugInfo(`Supabase error: ${supabaseError.message || JSON.stringify(supabaseError)}`);
        } else if (supabaseData && supabaseData.messages && Array.isArray(supabaseData.messages)) {
          // Set messages from Supabase with properly formatted timestamps
          const processedMessages = supabaseData.messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          }));
          setMessages(processedMessages);
          console.log(`Loaded ${processedMessages.length} messages from Supabase`);
          addDebugInfo(`Loaded ${processedMessages.length} messages from Supabase`);
          setIsLoading(false);
          return;
        } else {
          addDebugInfo(`No valid data from Supabase: ${JSON.stringify(supabaseData)}`);
        }
      } catch (supabaseQueryError) {
        console.error('Exception in Supabase query:', supabaseQueryError);
        addDebugInfo(`Supabase query exception: ${supabaseQueryError instanceof Error ? supabaseQueryError.message : String(supabaseQueryError)}`);
      }
      
      // If Supabase doesn't have the data, fetch thread using the API service
      addDebugInfo(`Falling back to API service...`);
      const threadData = await api.getThread(threadId);
      
      if (threadData && threadData.messages && Array.isArray(threadData.messages)) {
        // Set messages from the thread with properly formatted timestamps
        const processedMessages = threadData.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
        }));
        setMessages(processedMessages);
        console.log(`Loaded ${processedMessages.length} messages from thread API`);
        addDebugInfo(`Loaded ${processedMessages.length} messages from API`);
      } else {
        console.error('No messages array in response:', threadData);
        addDebugInfo(`Error: No messages array in API response`);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error loading thread:', err);
      addDebugInfo(`Error loading thread: ${err instanceof Error ? err.message : String(err)}`);
      setError('Failed to load chat thread');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setStreamingStatus('');
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Reset streaming UI state
    setReceivedChunks([]);
    setChunkCount(0);
    currentResponseRef.current = '';
    assistantMessageRef.current = null;
    
    try {
      // Streaming response
      if (useStreaming) {
        setStreamingStatus('Connecting...');
        
        try {
          await api.sendMessageStream(
            userMessage.content,
            handleStreamChunk,
            threadId,
            selectedModel,
            trainMode
          );
        } catch (streamError) {
          console.error('Streaming error:', streamError);
          setError(`Error: ${streamError instanceof Error ? streamError.message : String(streamError)}`);
          
          // If streaming fails, try to fall back to non-streaming API
          setStreamingStatus('Streaming failed, falling back to standard request...');
          
          const response = await api.sendMessage(userMessage.content, threadId, selectedModel, trainMode);
          
          // If we don't have a thread ID yet, but the response contains one
          if (!threadId && response.thread_id && onThreadCreated) {
            onThreadCreated(response.thread_id);
          }
          
          // Add assistant response
          const assistantMessage: Message = {
            role: 'assistant',
            content: response.response,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, assistantMessage]);
        }
      } 
      // Non-streaming response
      else {
        setStreamingStatus('Processing...');
        
        const response = await api.sendMessage(userMessage.content, threadId, selectedModel, trainMode);
        
        // If we don't have a thread ID yet, but the response contains one
        if (!threadId && response.thread_id && onThreadCreated) {
          onThreadCreated(response.thread_id);
        }
        
        // Add assistant response
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
      setStreamingStatus('');
    }
  };

  // Add model selector to the settings panel
  const renderSettings = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Settings</h2>
          <button 
            onClick={() => setShowSettings(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col">
            <label className="font-medium mb-1">Model</label>
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as ModelType)}
              className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="soulgraph">SoulGraph</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="font-medium">Use Streaming</label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input 
                type="checkbox" 
                checked={useStreaming}
                onChange={() => setUseStreaming(!useStreaming)}
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
              />
              <label 
                className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${useStreaming ? 'bg-blue-500' : 'bg-gray-300'}`}
              ></label>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="font-medium">Train Mode</label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input 
                type="checkbox" 
                checked={trainMode}
                onChange={() => setTrainMode(!trainMode)}
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
              />
              <label 
                className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${trainMode ? 'bg-green-500' : 'bg-gray-300'}`}
              ></label>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="font-medium">Debug Mode</label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input 
                type="checkbox" 
                checked={debugMode}
                onChange={() => {
                  setDebugMode(!debugMode);
                  addDebugInfo("Debug mode " + (!debugMode ? "enabled" : "disabled"));
                }}
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
              />
              <label 
                className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${debugMode ? 'bg-green-500' : 'bg-gray-300'}`}
              ></label>
            </div>
          </div>
          
          <button
            onClick={() => {
              // Test real-time updates by manually triggering a Supabase update
              if (threadId) {
                addDebugInfo("Testing real-time updates...");
                
                // Create a test message to add to the thread
                const testMessage = {
                  id: `test-${Date.now()}`,
                  role: 'system',
                  content: `This is a test message sent at ${new Date().toLocaleTimeString()}`,
                  timestamp: new Date()
                };
                
                // First get the current thread data
                supabase
                  .from('chat_threads')
                  .select('id, title, messages, updated_at')
                  .eq('id', threadId)
                  .maybeSingle()
                  .then(({ data, error }) => {
                    if (error) {
                      addDebugInfo(`Real-time test error: ${error.message || JSON.stringify(error)}`);
                      return;
                    }
                    
                    if (!data) {
                      addDebugInfo(`Thread not found for real-time test`);
                      return;
                    }
                    
                    // Add the test message to the messages array
                    const updatedMessages = [...(data.messages || []), testMessage];
                    addDebugInfo(`Adding test message to thread (${updatedMessages.length} total messages)`);
                    
                    // Update the thread with the new message
                    supabase
                      .from('chat_threads')
                      .update({
                        messages: updatedMessages,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', threadId)
                      .then(({ error: updateError }) => {
                        if (updateError) {
                          addDebugInfo(`Real-time test update error: ${updateError.message || JSON.stringify(updateError)}`);
                        } else {
                          addDebugInfo("Real-time test message added to thread");
                        }
                      });
                  });
              } else {
                addDebugInfo("Cannot test real-time updates: No thread ID");
              }
            }}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Test Real-time Updates
          </button>
        </div>
      </div>
    </div>
  );

  // Test Supabase connection
  const testSupabaseConnection = async () => {
    addDebugInfo(`Testing Supabase connection...`);
    try {
      // Test direct database access
      const { data, error } = await supabase
        .from('chat_threads')
        .select('id')
        .limit(1);
        
      if (error) {
        addDebugInfo(`Supabase query error: ${error.message}`);
      } else {
        addDebugInfo(`Supabase query successful: found ${data?.length || 0} threads`);
      }
      
      // Test real-time connection
      const tempChannel = supabase.channel('test-connection')
        .subscribe((status) => {
          addDebugInfo(`Real-time test connection status: ${status}`);
          // Unsubscribe after testing
          setTimeout(() => {
            tempChannel.unsubscribe();
            addDebugInfo(`Test connection unsubscribed`);
          }, 3000);
        });
        
    } catch (err) {
      addDebugInfo(`Supabase connection test exception: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white">
              <FiMessageCircle className="w-8 h-8" />
            </div>
            <p className="text-lg text-center text-gray-500 dark:text-gray-400">Start a conversation by sending a message.</p>
            <p className="text-sm text-center text-gray-400 dark:text-gray-500 max-w-md">
              Ask questions, share thoughts, or just chat with SoulGraph.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={`${index}-${message.timestamp?.getTime() || 0}`}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
            >
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
                {message.role === 'assistant' && message.content === '' && isLoading && (
                  <div className="flex space-x-2 my-1">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
                <p className="text-xs opacity-70 mt-1.5 text-right">
                  {message.timestamp 
                    ? (message.timestamp instanceof Date 
                        ? message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        : new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                      )
                    : ''}
                </p>
              </div>
              {message.role === 'assistant' && isTyping && index === messages.length - 1 && message.content !== '' && (
                <div className="flex items-end ml-2">
                  <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-full">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        
        {isLoading && !useStreaming && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {streamingStatus && (useStreaming) && (
          <div className="flex justify-center">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full px-4 py-1.5 text-xs font-medium">
              <p>{streamingStatus}</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg px-4 py-2 flex items-center space-x-2">
              <FiInfo className="w-4 h-4" />
              <p>{error}</p>
              <button 
                onClick={() => setError(null)} 
                className="ml-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {/* Debug information panel */}
        {debugMode && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg text-xs font-mono border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-700 dark:text-gray-300">Debug Info:</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={testSupabaseConnection}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                >
                  Test Connection
                </button>
                <button 
                  onClick={() => setDebugInfo([])}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="mb-2">
              <p><strong>Thread ID:</strong> {threadId || 'New chat'}</p>
              <p><strong>Real-time Channel:</strong> {channelRef.current ? 'Active' : 'Not connected'}</p>
              <p><strong>Model:</strong> {selectedModel}</p>
              <p><strong>Streaming:</strong> {useStreaming ? 'Enabled' : 'Disabled'}</p>
              <p><strong>Train Mode:</strong> {trainMode ? 'Enabled' : 'Disabled'}</p>
            </div>
            
            <div className="max-h-40 overflow-y-auto space-y-1 border-t border-gray-200 dark:border-gray-700 pt-2">
              {debugInfo.map((info, i) => (
                <div key={i} className="text-gray-600 dark:text-gray-400">{info}</div>
              ))}
            </div>
            
            {receivedChunks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-bold mb-1 text-gray-700 dark:text-gray-300">Received Chunks ({receivedChunks.length}):</h4>
                <div className="max-h-40 overflow-y-auto">
                  {receivedChunks.map((chunk, i) => (
                    <div key={i} className="mb-1 border-b border-gray-200 dark:border-gray-700 pb-1 text-gray-600 dark:text-gray-400">
                      <span className="font-bold">{i+1}:</span> &quot;{chunk}&quot;
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
            title="Settings"
          >
            <FiSettings className="w-5 h-5" />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message SoulGraph...`}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-full bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
              ref={inputRef}
            />
            {selectedModel && (
              <div className="absolute right-3 top-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-xs px-2 py-0.5 rounded-full">
                {selectedModel}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-full ${
              !input.trim() || isLoading
                ? 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
            title="Send message"
          >
            <FiSend className="w-5 h-5" />
          </button>
        </form>
        
        {error && (
          <div className="mt-2 text-red-500 text-sm">{error}</div>
        )}
        
        {isLoading && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {streamingStatus}
          </div>
        )}
      </div>
      
      {showSettings && renderSettings()}
    </div>
  );
} 