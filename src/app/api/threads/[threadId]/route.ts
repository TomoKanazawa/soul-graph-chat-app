import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Get the SoulGraph API URL from environment variables - use the same variable as other routes
const SOULGRAPH_API_URL = process.env.API_URL || 'http://localhost:8000';

/**
 * GET handler for the /api/threads/[threadId] endpoint
 * Proxies requests to the SoulGraph backend API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  // Get the thread ID from the URL params
  const threadId = params.threadId;
  
  console.log(`API route: Fetching thread with ID: ${threadId}`);
  console.log(`Using API URL: ${SOULGRAPH_API_URL}`);

  if (!threadId) {
    console.error('Thread ID is required but was not provided');
    return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
  }

  try {
    const apiUrl = `${SOULGRAPH_API_URL}/v0/threads/${threadId}`;
    console.log(`Making request to: ${apiUrl}`);
    
    // Forward the request to the SoulGraph API
    const response = await axios.get(apiUrl);
    
    console.log(`Received response from SoulGraph API for thread ${threadId}`);
    
    // Return the response from the SoulGraph API
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`Error in thread API route for thread ${threadId}:`, error);
    
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
 * DELETE handler for the /api/threads/[threadId] endpoint
 * Proxies delete requests to the SoulGraph backend API
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  // Get the thread ID from the URL params
  const threadId = params.threadId;
  
  console.log(`API route: Deleting thread with ID: ${threadId}`);
  console.log(`Using API URL: ${SOULGRAPH_API_URL}`);

  if (!threadId) {
    console.error('Thread ID is required but was not provided');
    return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
  }

  try {
    // Get user_id from query parameters (optional)
    const searchParams = request.nextUrl.searchParams;
    const user_id = searchParams.get('user_id');
    
    const apiUrl = `${SOULGRAPH_API_URL}/v0/threads/${threadId}`;
    console.log(`Making DELETE request to: ${apiUrl}`);
    
    // Forward the delete request to the SoulGraph API
    const response = await axios.delete(apiUrl, {
      params: user_id ? { user_id } : {}
    });
    
    console.log(`Received response from SoulGraph API for deleting thread ${threadId}`);
    
    // Return the response from the SoulGraph API
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`Error in thread delete API route for thread ${threadId}:`, error);
    
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