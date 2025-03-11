import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Create the Supabase client with explicit options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

// Log Supabase connection status
console.log('Supabase client initialized with URL:', supabaseUrl);

// Create a reusable function to subscribe to chat_threads table changes
export const subscribeToThreads = (callback: (payload: any) => void) => {
  console.log('Setting up subscription to all threads');
  
  const channel = supabase.channel('custom-all-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_threads' },
      (payload) => {
        console.log('Change received from Supabase!', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log('Supabase real-time subscription status for all threads:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to all thread changes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Error subscribing to thread changes');
      }
    });

  return channel;
};

// Create a function to subscribe to a specific thread's changes
export const subscribeToThread = (threadId: string, callback: (payload: any) => void) => {
  console.log(`Setting up real-time subscription for thread ${threadId}`);
  
  // Create a unique channel name for this thread
  const channelName = `thread-${threadId}-${Math.random().toString(36).substring(2, 9)}`;
  console.log(`Using channel name: ${channelName}`);
  
  const channel = supabase.channel(channelName)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'chat_threads',
        filter: `id=eq.${threadId}`
      },
      (payload) => {
        console.log(`Change received for thread ${threadId}!`, payload);
        console.log(`Payload new state:`, payload.new);
        console.log(`Payload old state:`, payload.old);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log(`Supabase real-time subscription status for thread ${threadId}:`, status);
      
      if (status === 'SUBSCRIBED') {
        console.log(`Successfully subscribed to changes for thread ${threadId}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error subscribing to changes for thread ${threadId}`);
      }
    });

  return channel;
};

// Helper function to test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    // Try to fetch a single row from chat_threads to test connection
    const { data, error } = await supabase
      .from('chat_threads')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error: error.message };
    }
    
    // Test real-time connection by creating a temporary subscription
    const tempChannel = supabase.channel('connection-test')
      .subscribe((status) => {
        console.log('Connection test subscription status:', status);
        // Unsubscribe after testing
        setTimeout(() => tempChannel.unsubscribe(), 2000);
      });
      
    return { 
      success: true, 
      message: 'Supabase connection successful',
      data: { rowCount: data?.length || 0 }
    };
  } catch (err) {
    console.error('Supabase connection test exception:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : String(err)
    };
  }
}; 