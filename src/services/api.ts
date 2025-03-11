import axios from 'axios';
import { InferenceRequest, InferenceResponse, ModelType, ChatThread } from '@/types';

// API endpoints
const SOULGRAPH_API_URL = '/api/soulgraph';
const OPENAI_API_URL = '/api/openai';
const THREADS_API_URL = '/api/threads';
const TEST_USER_ID = 'test-user-123'; // Fixed test user ID

export const api = {
  // Send a message to the API (SoulGraph or OpenAI)
  sendMessage: async (message: string, threadId?: string, model: ModelType = 'soulgraph'): Promise<InferenceResponse> => {
    try {
      const request: InferenceRequest = {
        message,
        user_id: TEST_USER_ID,
        thread_id: threadId,
        new_thread: !threadId,
        system_prompt: 'You are a helpful assistant.',
        stream: false,
        model
      };

      // Choose the appropriate API endpoint based on the model
      const apiUrl = model === 'openai' ? OPENAI_API_URL : SOULGRAPH_API_URL;
      
      const response = await axios.post<InferenceResponse>(apiUrl, request);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Send a message with streaming response
  sendMessageStream: async (
    message: string, 
    onChunk: (chunk: string, isComplete: boolean, threadId?: string, rawChunk?: string) => void,
    threadId?: string,
    model: ModelType = 'soulgraph'
  ): Promise<void> => {
    try {
      const request: InferenceRequest = {
        message,
        user_id: TEST_USER_ID,
        thread_id: threadId,
        new_thread: !threadId,
        system_prompt: 'You are a helpful assistant.',
        stream: true,
        model
      };

      console.log(`Sending streaming request to ${model} API:`, request);

      // Choose the appropriate API endpoint based on the model
      const apiUrl = model === 'openai' ? OPENAI_API_URL : SOULGRAPH_API_URL;

      // Use the Fetch API with ReadableStream for better streaming support
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Create a TextDecoder to decode the chunks
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let receivedThreadId: string | undefined = threadId;
      let isDone = false;
      let buffer = ''; // Buffer for incomplete data
      let chunkCount = 0;

      // Process the stream
      while (!isDone) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream complete');
          // Send a final empty chunk with isComplete=true to signal completion
          onChunk('', true, receivedThreadId);
          break;
        }

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        console.log(`Received raw chunk #${++chunkCount}:`, chunk);
        
        // Append to buffer and process complete lines
        buffer += chunk;
        
        // Process each complete SSE message (they end with double newlines)
        const messages = buffer.split('\n\n');
        // Keep the last part which might be incomplete
        buffer = messages.pop() || '';
        
        for (const message of messages) {
          if (!message.trim()) continue;
          
          // Extract the data part (remove 'data: ' prefix)
          const dataMatch = message.match(/^data: (.+)$/m);
          if (!dataMatch) continue;
          
          try {
            const jsonStr = dataMatch[1].trim();
            console.log(`Processing data line: "${jsonStr}"`);
            
            const data = JSON.parse(jsonStr);
            
            if (data.thread_id && !receivedThreadId) {
              receivedThreadId = data.thread_id;
              console.log('Received thread ID:', receivedThreadId);
            }
            
            if (data.chunk) {
              console.log(`Received text chunk: "${data.chunk}"`);
              
              // Immediately call onChunk with the new chunk
              onChunk(data.chunk, false, receivedThreadId, data.chunk);
            }
            
            if (data.done) {
              console.log('Received done signal');
              isDone = true;
              onChunk('', true, receivedThreadId);
            }
            
            if (data.error) {
              console.error('Error from server:', data.error);
              throw new Error(data.error);
            }
          } catch (e) {
            console.error('Error parsing data line:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming message:', error);
      throw error;
    }
  },

  // Health check endpoint
  healthCheck: async (): Promise<boolean> => {
    try {
      const response = await axios.get(`${SOULGRAPH_API_URL}/health`);
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },

  // Get all chat threads for a user
  getThreads: async (limit: number = 50, offset: number = 0): Promise<ChatThread[]> => {
    try {
      const response = await axios.get<{ threads: ChatThread[] }>(THREADS_API_URL, {
        params: {
          user_id: TEST_USER_ID,
          limit,
          offset
        }
      });
      return response.data.threads;
    } catch (error) {
      console.error('Error fetching threads:', error);
      return [];
    }
  },
  
  // Get a specific thread by ID
  getThread: async (threadId: string): Promise<ChatThread | null> => {
    try {
      console.log(`Fetching thread with ID: ${threadId}`);
      const response = await axios.get<ChatThread>(`${THREADS_API_URL}/${threadId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching thread:', error);
      throw error;
    }
  },
  
  // Delete a specific thread by ID
  deleteThread: async (threadId: string): Promise<boolean> => {
    try {
      console.log(`Deleting thread with ID: ${threadId}`);
      const response = await axios.delete(`${THREADS_API_URL}/${threadId}`, {
        params: {
          user_id: TEST_USER_ID
        }
      });
      return response.status === 200;
    } catch (error) {
      console.error('Error deleting thread:', error);
      throw error;
    }
  }
}; 