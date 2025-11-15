import { http } from './http';
import { config } from '../config';
import { toQueryString } from '../utils/toQueryString';

// Types
export type Message = {
  id: number;
  content: string;
  user_id: number;
  channel_id: number;
  reply_to: number | null;
  replies: number;
  created_at: string;
  reactions: MessageReaction[];
}

export type MessageReaction = {
  id: number;
  user_id: number;
  reaction: string;
  created_at: string;
}

export type ListMessagesRequest = {
  channel_id?: number;
  limit?: number;
  offset?: number;
  before?: string;
  after?: string;
  reply_to?: number;
}

export type ListMessagesResponse = {
  success: boolean;
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
}

export type SendMessageRequest = {
  channel_id: number;
  content: string;
  reply_to?: number;
}

export type SendMessageResponse = {
  success: boolean;
  message: Message;
}

export type DeleteMessageRequest = {
  message_id: number;
}

export type DeleteMessageResponse = {
  success: boolean;
  message: string;
}

export type ReactToMessageRequest = {
  message_id: number;
  reaction: string;
}

export type ReactToMessageResponse = {
  success: boolean;
  reaction: MessageReaction;
  message: string;
}

export type UnreactToMessageRequest = {
  message_id: number;
  reaction: string;
}

export type UnreactToMessageResponse = {
  success: boolean;
  message: string;
}

export type MarkAsReadRequest = {
  channel_id: number;
  timestamp?: string;
}

export type MarkAsReadResponse = {
  success: boolean;
  last_read_at: string;
  message: string;
}

// Message SDK
export const messageSdk = {
  /**
   * List messages from a channel or across channels
   */
  async listMessages(request: ListMessagesRequest): Promise<ListMessagesResponse> {
    const url = `/api/messages.php/list${toQueryString(request as any)}`;
    return http.get(url);
  },

  /**
   * Send a new message to a channel
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const url = `/api/messages.php/send`;
    return http.post(url, request);
  },

  /**
   * Delete a message (only the owner can delete)
   */
  async deleteMessage(request: DeleteMessageRequest): Promise<DeleteMessageResponse> {
    const url = `/api/messages.php/delete`;
    return http.post(url, request);
  },

  /**
   * React to a message with an emoji
   */
  async reactToMessage(request: ReactToMessageRequest): Promise<ReactToMessageResponse> {
    const url = `/api/messages.php/react`;
    return http.post(url, request);
  },

  /**
   * Remove a reaction from a message
   */
  async unreactToMessage(request: UnreactToMessageRequest): Promise<UnreactToMessageResponse> {
    const url = `/api/messages.php/unreact`;
    return http.post(url, request);
  },

  /**
   * Mark a channel as read up to a specific timestamp
   */
  async markAsRead(request: MarkAsReadRequest): Promise<MarkAsReadResponse> {
    const url = `/api/messages.php/mark-read`;
    return http.post(url, request);
  },
};
