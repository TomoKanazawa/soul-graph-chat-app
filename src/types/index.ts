export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatThread {
  id?: string;
  messages: Message[];
  title?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

export type ModelType = 'soulgraph';

export interface InferenceRequest {
  message: string;
  user_id?: string;
  thread_id?: string;
  new_thread?: boolean;
  system_prompt?: string;
  stream?: boolean;
  model?: ModelType;
  training?: boolean;
}

export interface InferenceResponse {
  response: string;
  thread_id: string;
} 