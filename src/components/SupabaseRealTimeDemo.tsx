import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealTimeEvent {
  id: string;
  timestamp: string;
  eventType: string;
  table: string;
  data: any;
}

export default function SupabaseRealTimeDemo() {
  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [status, setStatus] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Set up real-time subscription
    setupRealTimeSubscription();

    // Clean up on unmount
    return () => {
      if (channelRef.current) {
        console.log('Cleaning up real-time subscription');
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []);

  const setupRealTimeSubscription = () => {
    try {
      setStatus('connecting');
      console.log('Setting up real-time subscription to chat_threads table');

      // Create a unique channel name
      const channelName = `demo-channel-${Math.random().toString(36).substring(2, 9)}`;
      
      // Subscribe to all changes on the chat_threads table
      channelRef.current = supabase.channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_threads' },
          (payload) => {
            console.log('Real-time event received:', payload);
            
            // Add the event to our list
            const newEvent: RealTimeEvent = {
              id: Math.random().toString(36).substring(2, 9),
              timestamp: new Date().toISOString(),
              eventType: payload.eventType,
              table: 'chat_threads',
              data: payload
            };
            
            setEvents(prev => [newEvent, ...prev].slice(0, 10)); // Keep only the 10 most recent events
          }
        )
        .subscribe((status) => {
          console.log('Supabase real-time subscription status:', status);
          setStatus(status);
          
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to chat_threads table');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Error subscribing to chat_threads table');
            setError('Failed to subscribe to real-time updates');
          }
        });
    } catch (err) {
      console.error('Error setting up real-time subscription:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const testInsert = async () => {
    try {
      // Insert a test record into the chat_threads table
      const { data, error } = await supabase
        .from('chat_threads')
        .insert({
          title: `Test Thread ${new Date().toLocaleTimeString()}`,
          messages: [
            { role: 'system', content: 'This is a test thread.' },
            { role: 'user', content: 'Hello, this is a test message.' }
          ]
        })
        .select();
        
      if (error) {
        console.error('Error inserting test record:', error);
        setError(`Insert error: ${error.message}`);
      } else {
        console.log('Test record inserted:', data);
      }
    } catch (err) {
      console.error('Exception during test insert:', err);
      setError(`Insert exception: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const reconnect = () => {
    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    // Set up a new subscription
    setupRealTimeSubscription();
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <h2 className="text-xl font-bold mb-4">Supabase Real-Time Demo</h2>
      
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold">Status:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            status === 'SUBSCRIBED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            status === 'connecting' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {status}
          </span>
        </div>
        
        {error && (
          <div className="p-2 mb-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
            Error: {error}
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={testInsert}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Insert
          </button>
          <button
            onClick={reconnect}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reconnect
          </button>
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold mb-2">Recent Events:</h3>
        {events.length === 0 ? (
          <p className="text-gray-500 italic">No events received yet. Try inserting a test record.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {events.map(event => (
              <div key={event.id} className="p-2 border rounded bg-white dark:bg-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{event.eventType}</span>
                  <span className="text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="mt-1 text-sm">
                  <pre className="whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 