import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { InferenceRequest } from '@/types';
import { supabaseAdmin } from '../supabase';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body: InferenceRequest = await request.json();
    const { message, thread_id, new_thread, system_prompt, stream, user_id } = body;

    // Create a thread ID if it doesn't exist
    const threadId = thread_id || `openai-${Date.now()}`;

    // Handle streaming response
    if (stream) {
      const encoder = new TextEncoder();
      const stream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: system_prompt || 'You are a helpful assistant.' },
          { role: 'user', content: message }
        ],
        stream: true,
      });

      // Create a readable stream
      const readableStream = new ReadableStream({
        async start(controller) {
          // Send thread ID first
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ thread_id: threadId })}\n\n`));

          let fullResponse = '';

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: content })}\n\n`));
            }
          }

          // Signal completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          
          // Update Supabase with the thread data
          try {
            // Create messages array
            const messages = [
              { role: 'system', content: system_prompt || 'You are a helpful assistant.' },
              { role: 'user', content: message },
              { role: 'assistant', content: fullResponse }
            ];
            
            // Update Supabase
            const { error } = await supabaseAdmin
              .from('chat_threads')
              .upsert({
                id: threadId,
                title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
                user_id: user_id || 'anonymous',
                messages: messages,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              });
              
            if (error) {
              console.error('Error updating Supabase:', error);
            } else {
              console.log(`Updated thread ${threadId} in Supabase after streaming completion`);
            }
          } catch (supabaseError) {
            console.error('Error in Supabase operation:', supabaseError);
          }
          
          controller.close();
        },
      });

      return new NextResponse(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } 
    // Handle non-streaming response
    else {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: system_prompt || 'You are a helpful assistant.' },
          { role: 'user', content: message }
        ],
      });

      const response = completion.choices[0]?.message?.content || '';

      // Update Supabase with the thread data
      try {
        // Create messages array
        const messages = [
          { role: 'system', content: system_prompt || 'You are a helpful assistant.' },
          { role: 'user', content: message },
          { role: 'assistant', content: response }
        ];
        
        // Update Supabase
        const { error } = await supabaseAdmin
          .from('chat_threads')
          .upsert({
            id: threadId,
            title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            user_id: user_id || 'anonymous',
            messages: messages,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });
          
        if (error) {
          console.error('Error updating Supabase:', error);
        } else {
          console.log(`Updated thread ${threadId} in Supabase after non-streaming completion`);
        }
      } catch (supabaseError) {
        console.error('Error in Supabase operation:', supabaseError);
      }

      return NextResponse.json({
        response,
        thread_id: threadId,
      });
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 