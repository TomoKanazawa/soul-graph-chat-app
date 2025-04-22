import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { supabaseAdmin } from '../supabase';
import { getAuthHeader } from '@/utils/mockAuth';

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
    const apiUrl = `${SOULGRAPH_API_URL}/v1/threads`;
    console.log(`Making request to: ${apiUrl}`);

    // Forward the request to the SoulGraph API with auth header
    const response = await axios.get(apiUrl, {
      params: {
        user_id,
        limit,
        offset
      },
      headers: {
        ...getAuthHeader()
      }
    });

    console.log(`Received response from SoulGraph API for threads`);

    // Return the response from the SoulGraph API
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    console.error('Error in threads API route:', error);
    
    // Handle different types of errors
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { 
        response?: { 
          status: number; 
          data: { error?: string }; 
        }; 
        request?: unknown; 
        message?: string; 
      };
      
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (axiosError.response) {
        console.error(`Error response status: ${axiosError.response.status}`);
        console.error(`Error response data:`, axiosError.response.data);
        
        return NextResponse.json(
          { error: axiosError.response.data.error || 'Error from SoulGraph API' },
          { status: axiosError.response.status }
        );
      } else if ('request' in axiosError && axiosError.request) {
        // The request was made but no response was received
        console.error('No response received from SoulGraph API');
        
        return NextResponse.json(
          { error: 'No response from SoulGraph API' },
          { status: 503 }
        );
      } else if ('message' in axiosError && axiosError.message) {
        // Something happened in setting up the request that triggered an Error
        console.error(`Request setup error: ${axiosError.message}`);
        
        return NextResponse.json(
          { error: axiosError.message || 'Unknown error' },
          { status: 500 }
        );
      }
    }
    
    // Fallback error response
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for the /api/threads endpoint
 * Creates a new thread using the inference endpoint with new_thread=true
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Prepare the data for the chat endpoint
    const chatData = {
      message: body.message || "New conversation",
      user_id: body.user_id,
      new_thread: true,
      system_prompt: body.system_prompt || "You are a helpful assistant.",
      stream: false
    };
    
    // Forward the request to the SoulGraph chat API with auth header
    const apiUrl = `${SOULGRAPH_API_URL}/v1/chat`;
    console.log(`Creating new thread via chat endpoint: ${apiUrl}`);
    const response = await axios.post(apiUrl, chatData, {
      headers: {
        ...getAuthHeader()
      }
    });
    
    // Get the thread data from the response
    const responseData = response.data;
    const threadId = responseData.thread_id;
    
    if (!threadId) {
      console.error('No thread_id returned from chat endpoint');
      return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
    }
    
    console.log(`Created new thread with ID: ${threadId}`);
    
    // Fetch the complete thread data
    const threadResponse = await axios.get(`${SOULGRAPH_API_URL}/v1/threads/${threadId}`);
    const threadData = threadResponse.data;
    
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
    
    // Return the thread data
    return NextResponse.json(threadData);
  } catch (error: unknown) {
    console.error('Error in POST threads API route:', error);
    
    // Handle errors similar to the GET handler
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { 
        response?: { 
          status: number; 
          data: { error?: string }; 
        }; 
        request?: unknown; 
        message?: string; 
      };
      
      if (axiosError.response) {
        return NextResponse.json(
          { error: axiosError.response.data.error || 'Error from SoulGraph API' },
          { status: axiosError.response.status }
        );
      } else if ('request' in axiosError && axiosError.request) {
        return NextResponse.json(
          { error: 'No response from SoulGraph API' },
          { status: 503 }
        );
      } else if ('message' in axiosError && axiosError.message) {
        return NextResponse.json(
          { error: axiosError.message || 'Unknown error' },
          { status: 500 }
        );
      }
    }
    
    // Fallback error response
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 