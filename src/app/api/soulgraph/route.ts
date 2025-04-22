import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../supabase';
import { getAuthHeader } from '@/utils/mockAuth';

// Get the SoulGraph API URL from environment variables
const SOULGRAPH_API_URL = process.env.API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stream, thread_id } = body;

    // Forward the request to the SoulGraph API with auth header
    const response = await fetch(`${SOULGRAPH_API_URL}/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`SoulGraph API error: ${response.status}`);
    }

    // For streaming responses, forward the stream
    if (stream) {
      // Create a TransformStream to intercept and process the stream
      const { readable, writable } = new TransformStream();
      
      // Process the original stream
      const reader = response.body?.getReader();
      const writer = writable.getWriter();
      
      // Function to process the stream
      const processStream = async () => {
        if (!reader) return;
        
        let threadId = thread_id;
        let buffer = '';
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // End of stream
              writer.close();
              break;
            }
            
            // Forward the chunk to the client
            writer.write(value);
            
            // Process the chunk to extract thread_id and update Supabase
            const chunk = new TextDecoder().decode(value);
            buffer += chunk;
            
            // Process complete SSE messages
            const messages = buffer.split('\n\n');
            buffer = messages.pop() || '';
            
            for (const message of messages) {
              if (!message.trim()) continue;
              
              // Extract the data part
              const dataMatch = message.match(/^data: (.+)$/m);
              if (!dataMatch) continue;
              
              try {
                const data = JSON.parse(dataMatch[1].trim());
                
                // If we get a thread_id, store it
                if (data.thread_id && !threadId) {
                  threadId = data.thread_id;
                }
                
                // If this is the final message (done: true), update Supabase
                if (data.done && threadId) {
                  // Fetch the complete thread data
                  const threadResponse = await fetch(`${SOULGRAPH_API_URL}/v1/threads/${threadId}`);
                  if (threadResponse.ok) {
                    const threadData = await threadResponse.json();
                    
                    // Update Supabase with the complete thread data
                    await supabaseAdmin
                      .from('chat_threads')
                      .upsert({
                        id: threadId,
                        title: threadData.title || 'Chat',
                        user_id: body.user_id,
                        messages: threadData.messages || [],
                        updated_at: new Date().toISOString()
                      });
                      
                    console.log(`Updated thread ${threadId} in Supabase after streaming completion`);
                  }
                }
              } catch (e) {
                console.error('Error processing SSE message:', e);
              }
            }
          }
        } catch (error) {
          console.error('Error processing stream:', error);
          writer.abort(error);
        }
      };
      
      // Start processing the stream
      processStream();
      
      // Return the transformed stream
      return new NextResponse(readable, {
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
      
      // If we have a thread_id, update Supabase
      if (data.thread_id) {
        try {
          // Fetch the complete thread data
          const threadResponse = await fetch(`${SOULGRAPH_API_URL}/v1/threads/${data.thread_id}`);
          if (threadResponse.ok) {
            const threadData = await threadResponse.json();
            
            // Update Supabase with the complete thread data
            const { error } = await supabaseAdmin
              .from('chat_threads')
              .upsert({
                id: data.thread_id,
                title: threadData.title || 'Chat',
                user_id: body.user_id,
                messages: threadData.messages || [],
                updated_at: new Date().toISOString()
              });
              
            if (error) {
              console.error('Error updating Supabase:', error);
            } else {
              console.log(`Updated thread ${data.thread_id} in Supabase after non-streaming completion`);
            }
          }
        } catch (supabaseError) {
          console.error('Error in Supabase operation:', supabaseError);
        }
      }
      
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