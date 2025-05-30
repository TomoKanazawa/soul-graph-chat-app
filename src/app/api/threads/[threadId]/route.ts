import { NextResponse } from 'next/server';
import axios from 'axios';
import { supabaseAdmin } from '../../supabase';
import { getAuthHeader } from '@/utils/mockAuth';

// Get the SoulGraph API URL from environment variables - use the same variable as other routes
const SOULGRAPH_API_URL = process.env.API_URL || 'http://localhost:8000';

/**
 * GET handler for the /api/threads/[threadId] endpoint
 * Proxies requests to the SoulGraph backend API
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  // Get the thread ID from the URL params
  const { threadId } = await params;
  
  console.log(`API route: Fetching thread with ID: ${threadId}`);
  console.log(`Using API URL: ${SOULGRAPH_API_URL}`);

  if (!threadId) {
    console.error('Thread ID is required but was not provided');
    return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
  }

  try {
    const apiUrl = `${SOULGRAPH_API_URL}/v1/threads/${threadId}`;
    console.log(`Making request to: ${apiUrl}`);
    
    // Forward the request to the SoulGraph API with auth header
    const response = await axios.get(apiUrl, {
      headers: {
        ...getAuthHeader()
      }
    });
    
    console.log(`Received response from SoulGraph API for thread ${threadId}`);
    
    // Sync the thread data with Supabase for real-time updates
    const threadData = response.data;
    if (threadData && threadData.id) {
      try {
        // Insert or update the thread in Supabase
        const { error } = await supabaseAdmin
          .from('chat_threads')
          .upsert({
            id: threadData.id,
            title: threadData.title || 'Chat',
            messages: threadData.messages || [],
            updated_at: new Date().toISOString()
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
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    console.error(`Error in thread API route for thread ${threadId}:`, error);
    
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
 * DELETE handler for the /api/threads/[threadId] endpoint
 * Proxies delete requests to the SoulGraph backend API
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  // Get the thread ID from the URL params
  const { threadId } = await params;
  
  console.log(`API route: Deleting thread with ID: ${threadId}`);
  console.log(`Using API URL: ${SOULGRAPH_API_URL}`);

  if (!threadId) {
    console.error('Thread ID is required but was not provided');
    return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
  }

  try {
    // Get user_id from query parameters (optional)
    const url = new URL(request.url);
    const user_id = url.searchParams.get('user_id');
    
    const apiUrl = `${SOULGRAPH_API_URL}/v1/threads/${threadId}`;
    console.log(`Making DELETE request to: ${apiUrl}`);
    
    // Forward the delete request to the SoulGraph API with auth header
    const response = await axios.delete(apiUrl, {
      params: user_id ? { user_id } : {},
      headers: {
        ...getAuthHeader()
      }
    });
    
    console.log(`Received response from SoulGraph API for deleting thread ${threadId}`);
    
    // Delete the thread from Supabase
    try {
      const { error } = await supabaseAdmin
        .from('chat_threads')
        .delete()
        .eq('id', threadId);
        
      if (error) {
        console.error('Error deleting thread from Supabase:', error);
      } else {
        console.log(`Thread ${threadId} deleted from Supabase`);
      }
    } catch (supabaseError) {
      console.error('Error in Supabase delete operation:', supabaseError);
    }
    
    // Return the response from the SoulGraph API
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    console.error(`Error in thread delete API route for thread ${threadId}:`, error);
    
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