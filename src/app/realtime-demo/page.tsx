'use client';

import { useState } from 'react';
import SupabaseRealTimeDemo from '@/components/SupabaseRealTimeDemo';
import Link from 'next/link';

export default function RealTimeDemoPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Link 
          href="/" 
          className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
        >
          ← Back to Chat
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Supabase Real-Time Demo</h1>
      
      <div className="mb-6">
        <p className="mb-2">
          This page demonstrates how Supabase real-time updates work with the <code>chat_threads</code> table.
        </p>
        <p className="mb-2">
          The component below subscribes to all changes on the <code>chat_threads</code> table and displays them in real-time.
        </p>
        <p>
          You can test it by clicking the "Test Insert" button, which will insert a new record into the table.
        </p>
      </div>
      
      <div className="mb-8">
        <SupabaseRealTimeDemo />
      </div>
      
      <div className="mt-8 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <h2 className="text-xl font-bold mb-4">Implementation Details</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Initialize Supabase Client</h3>
            <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto">
              {`import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">2. Set Up Real-Time Subscription</h3>
            <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto">
              {`// Create a channel
const channel = supabase.channel('custom-channel-name')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'chat_threads' },
    (payload) => {
      console.log('Change received!', payload)
      // Handle the change here
    }
  )
  .subscribe((status) => {
    console.log('Subscription status:', status)
  })`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">3. Filter for Specific Records</h3>
            <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto">
              {`// Subscribe to changes for a specific thread
supabase.channel('thread-specific-channel')
  .on(
    'postgres_changes',
    { 
      event: '*', 
      schema: 'public', 
      table: 'chat_threads',
      filter: 'id=eq.123' // Filter for a specific thread ID
    },
    (payload) => {
      console.log('Thread-specific change received!', payload)
    }
  )
  .subscribe()`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">4. Clean Up on Unmount</h3>
            <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto">
              {`// Store the channel reference
const channelRef = useRef(null)

// Set up subscription
useEffect(() => {
  channelRef.current = supabase.channel(...)
    .subscribe()
    
  // Clean up on unmount
  return () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
    }
  }
}, [])`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
} 