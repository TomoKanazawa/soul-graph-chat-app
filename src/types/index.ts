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
}

export type ModelType = 'soulgraph' | 'openai';

export interface InferenceRequest {
  message: string;
  user_id?: string;
  thread_id?: string;
  new_thread?: boolean;
  system_prompt?: string;
  stream?: boolean;
  model?: ModelType;
}

export interface InferenceResponse {
  response: string;
  thread_id: string;
} 