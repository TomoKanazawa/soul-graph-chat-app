// This script helps set up the Supabase database table for real-time chat updates
// Run this script with: node setup-supabase.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupSupabase() {
  console.log('Setting up Supabase for real-time chat updates...');
  
  try {
    // Check if the chat_threads table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'chat_threads');
      
    if (tablesError) {
      console.error('Error checking if table exists:', tablesError);
      return;
    }
    
    // If the table doesn't exist, create it
    if (!tables || tables.length === 0) {
      console.log('Creating chat_threads table...');
      
      // Create the table using SQL
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE public.chat_threads (
            id TEXT PRIMARY KEY,
            title TEXT,
            user_id TEXT,
            messages JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
        `
      });
      
      if (createError) {
        console.error('Error creating table:', createError);
        return;
      }
      
      console.log('chat_threads table created successfully!');
    } else {
      console.log('chat_threads table already exists.');
    }
    
    // Enable real-time for the table
    console.log('Enabling real-time for chat_threads table...');
    
    const { error: realtimeError } = await supabase.rpc('exec_sql', {
      sql: `
        BEGIN;
          -- Drop the publication if it exists
          DROP PUBLICATION IF EXISTS supabase_realtime;
          
          -- Create the publication with the chat_threads table
          CREATE PUBLICATION supabase_realtime FOR TABLE public.chat_threads;
        COMMIT;
      `
    });
    
    if (realtimeError) {
      console.error('Error enabling real-time:', realtimeError);
      return;
    }
    
    console.log('Real-time enabled for chat_threads table!');
    console.log('Supabase setup completed successfully!');
    
  } catch (error) {
    console.error('Error setting up Supabase:', error);
  }
}

setupSupabase(); 