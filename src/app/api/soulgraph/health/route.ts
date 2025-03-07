import { NextResponse } from 'next/server';

// Get the SoulGraph API URL from environment variables
const SOULGRAPH_API_URL = process.env.API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    // Forward the health check request to the SoulGraph API
    const response = await fetch(`${SOULGRAPH_API_URL}/v0/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SoulGraph API health check failed: ${response.status}`);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error checking SoulGraph API health:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
} 