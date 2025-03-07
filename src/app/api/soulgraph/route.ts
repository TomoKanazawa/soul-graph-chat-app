import { NextRequest, NextResponse } from 'next/server';

// Get the SoulGraph API URL from environment variables
const SOULGRAPH_API_URL = process.env.API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stream } = body;

    // Forward the request to the SoulGraph API
    const response = await fetch(`${SOULGRAPH_API_URL}/v0/inference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`SoulGraph API error: ${response.status}`);
    }

    // For streaming responses, forward the stream
    if (stream) {
      const readableStream = response.body;
      
      return new NextResponse(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } 
    // For non-streaming responses, forward the JSON
    else {
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error proxying to SoulGraph API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 