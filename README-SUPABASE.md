# Setting Up Supabase for Real-Time Chat Updates

This document explains how to set up Supabase for real-time chat updates in the SoulGraph chat application.

## Prerequisites

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new Supabase project

## Step 1: Set Up Environment Variables

Add the following environment variables to your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

You can find these values in your Supabase project settings under "API".

## Step 2: Run the Setup Script

We've provided a setup script that will create the necessary table and enable real-time updates:

```bash
# Install dependencies if you haven't already
npm install

# Run the setup script
node setup-supabase.js
```

This script will:
1. Create the `chat_threads` table if it doesn't exist
2. Enable real-time updates for the table

## Step 3: Verify Setup

To verify that everything is set up correctly:

1. Go to your Supabase project dashboard
2. Navigate to "Table Editor" in the sidebar
3. Check that the `chat_threads` table exists
4. Navigate to "Database" > "Replication" in the sidebar
5. Verify that real-time is enabled for the `chat_threads` table

## Manual Setup (Alternative to Step 2)

If you prefer to set up the table manually:

1. Go to your Supabase project dashboard
2. Navigate to "Table Editor" in the sidebar
3. Click "New Table"
4. Create a table with the following settings:

**Table Name:** `chat_threads`

**Columns:**
- `id` (type: `text`, primary key)
- `title` (type: `text`)
- `user_id` (type: `text`)
- `messages` (type: `jsonb`)
- `created_at` (type: `timestamp with time zone`, default: `now()`)
- `updated_at` (type: `timestamp with time zone`, default: `now()`)

5. Click "Save" to create the table
6. Navigate to "Database" > "Replication" in the sidebar
7. Enable real-time for the `chat_threads` table by toggling the switch to "ON"

## Step 4: Set Up Row-Level Security (Optional but Recommended)

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" in the sidebar
3. Click on "Policies" in the submenu
4. Find the `chat_threads` table in the list
5. Click "Add Policy"
6. Create policies for SELECT, INSERT, UPDATE, and DELETE operations as needed

## How It Works

The application uses Supabase's real-time capabilities to subscribe to changes in the `chat_threads` table. When a change occurs (e.g., a new message is added, a thread is deleted), Supabase sends a notification to all connected clients.

The application has two main subscription types:

1. **Global Thread Subscription**: Subscribes to all changes in the `chat_threads` table, used in the Sidebar component to update the list of threads.

2. **Thread-Specific Subscription**: Subscribes to changes for a specific thread, used in the Chat component to update the messages in real-time.

## Troubleshooting

If real-time updates are not working:

1. Check that your environment variables are correctly set
2. Verify that real-time is enabled for the `chat_threads` table
3. Check the browser console for any errors
4. Make sure your Supabase project is on a plan that supports real-time updates
5. Try running the setup script again: `node setup-supabase.js`
6. Check the server logs for any errors related to Supabase operations 