import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabaseAdmin } from '../supabase';

// Get the SoulGraph API URL from environment variables - use the same variable as other routes
const SOULGRAPH_API_URL = process.env.API_URL || 'http://localhost:8000';

/**
 * GET handler for the /api/threads endpoint
 * Proxies requests to the SoulGraph backend API
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const user_id = searchParams.get('user_id');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    console.log(`API route: Fetching threads for user: ${user_id}`);
    console.log(`Using API URL: ${SOULGRAPH_API_URL}`);

    // Validate user_id
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Construct the API URL
    const apiUrl = `${SOULGRAPH_API_URL}/v0/threads`;
    console.log(`Making request to: ${apiUrl}`);

    // Forward the request to the SoulGraph API
    const response = await axios.get(apiUrl, {
      params: {
        user_id,
        limit,
        offset
      }
    });

    console.log(`Received response from SoulGraph API for threads`);

    // Return the response from the SoulGraph API
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error in threads API route:', error);
    
    // Handle different types of errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Error response status: ${error.response.status}`);
      console.error(`Error response data:`, error.response.data);
      
      return NextResponse.json(
        { error: error.response.data.error || 'Error from SoulGraph API' },
        { status: error.response.status }
      );
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from SoulGraph API');
      
      return NextResponse.json(
        { error: 'No response from SoulGraph API' },
        { status: 503 }
      );
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error(`Request setup error: ${error.message}`);
      
      return NextResponse.json(
        { error: error.message || 'Unknown error' },
        { status: 500 }
      );
    }
  }
}

/**
 * POST handler for the /api/threads endpoint
 * Creates a new thread and syncs it with Supabase for real-time updates
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Forward the request to the SoulGraph API
    const apiUrl = `${SOULGRAPH_API_URL}/v0/threads`;
    const response = await axios.post(apiUrl, body);
    
    // Get the thread data from the response
    const threadData = response.data;
    
    // Sync the thread data with Supabase for real-time updates
    if (threadData && threadData.id) {
      try {
        // Insert or update the thread in Supabase
        const { error } = await supabaseAdmin
          .from('chat_threads')
          .upsert({
            id: threadData.id,
            title: threadData.title || 'New Chat',
            user_id: body.user_id,
            messages: threadData.messages || [],
            created_at: threadData.created_at || new Date().toISOString(),
            updated_at: threadData.updated_at || new Date().toISOString()
          });
          
        if (error) {
          console.error('Error syncing thread with Supabase:', error);
        } else {
          console.log(`Thread ${threadData.id} synced with Supabase for real-time updates`);
        }
      } catch (supabaseError) {
        console.error('Error in Supabase operation:', supabaseError);
      }
    }
    
    // Return the response from the SoulGraph API
    return NextResponse.json(threadData);
  } catch (error: any) {
    console.error('Error in POST threads API route:', error);
    
    // Handle errors similar to the GET handler
    if (error.response) {
      return NextResponse.json(
        { error: error.response.data.error || 'Error from SoulGraph API' },
        { status: error.response.status }
      );
    } else if (error.request) {
      return NextResponse.json(
        { error: 'No response from SoulGraph API' },
        { status: 503 }
      );
    } else {
      return NextResponse.json(
        { error: error.message || 'Unknown error' },
        { status: 500 }
      );
    }
  }
} 