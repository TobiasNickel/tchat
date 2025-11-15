import { makeAtom, useAtom } from '../utils/atom';
import { messageSdk, type Message, type MessageReaction } from '../sdk/message.sdk';
import { type LazyLoaded, getLazyLoadedData, isPromise, isError } from '../utils/lazy';

// ============================================================================
// State Types
// ============================================================================

interface MessageData {
  messages: Message[];
  hasMore: boolean;
  offset: number;
}

interface MessagesState {
  // Map of channel_id to LazyLoaded message data
  messagesByChannelId: Record<number, LazyLoaded<MessageData>>;
}

// ============================================================================
// Atoms
// ============================================================================

/**
 * Global messages atom - stores messages for each channel (lazy-loaded)
 */
export const messagesAtom = makeAtom<MessagesState, Record<string, never>>(
  { messagesByChannelId: {} },
  {},
  'messagesState'
);

// ============================================================================
// Message API Functions
// ============================================================================

/**
 * Load messages for a specific channel
 */
export async function loadMessages(
  channelId: number, 
  options: { 
    limit?: number; 
    offset?: number; 
    before?: string; 
    after?: string;
    append?: boolean; // If true, append to existing messages
  } = {}
): Promise<void> {
  const { limit = 50, offset = 0, before, after, append = false } = options;
  const currentState = messagesAtom.state;
  
  // Create loading promise
  const loadPromise = (async () => {
    const response = await messageSdk.listMessages({ 
      channel_id: channelId, 
      limit, 
      offset, 
      before, 
      after 
    });
    
    if (response.success) {
      const existingData = getLazyLoadedData(currentState.messagesByChannelId[channelId]);
      const existingMessages = append && existingData ? existingData.messages : [];
      const newMessages = append 
        ? [...existingMessages, ...response.messages]
        : response.messages;
      
      // Remove duplicates based on message id
      const uniqueMessages = Array.from(
        new Map(newMessages.map(msg => [msg.id, msg])).values()
      );
      
      // Sort by created_at (newest first)
      uniqueMessages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      const messageData: MessageData = {
        messages: uniqueMessages,
        hasMore: response.messages.length === limit,
        offset: (offset || 0) + response.messages.length
      };
      
      console.log('Loaded messages for channel', channelId, ':', response.messages.length);
      return messageData;
    } else {
      throw new Error('Failed to load messages');
    }
  })();
  
  // Set the promise to the state
  currentState.messagesByChannelId[channelId] = loadPromise;
  messagesAtom.onChange.trigger(messagesAtom.state);
  
  // Wait for the promise to resolve and update state
  try {
    const messageData = await loadPromise;
    currentState.messagesByChannelId[channelId] = messageData;
    messagesAtom.onChange.trigger(messagesAtom.state);
  } catch (error) {
    currentState.messagesByChannelId[channelId] = error instanceof Error ? error : new Error('Unknown error');
    messagesAtom.onChange.trigger(messagesAtom.state);
    console.error('Error loading messages:', error);
  }
}

/**
 * Load more messages for pagination (older messages)
 */
export async function loadMoreMessages(channelId: number, limit: number = 50): Promise<void> {
  const currentState = messagesAtom.state;
  const currentData = getLazyLoadedData(currentState.messagesByChannelId[channelId]);
  const currentOffset = currentData?.offset || 0;
  
  await loadMessages(channelId, { 
    limit, 
    offset: currentOffset,
    append: true 
  });
}

/**
 * Refresh messages for a channel (load latest messages)
 */
export async function refreshMessages(channelId: number, limit: number = 50): Promise<void> {
  await loadMessages(channelId, { limit, offset: 0 });
}

/**
 * Send a new message to a channel
 */
export async function sendMessage(
  channelId: number, 
  content: string, 
  replyTo?: number
): Promise<Message> {
  try {
    const response = await messageSdk.sendMessage({ 
      channel_id: channelId, 
      content, 
      reply_to: replyTo 
    });
    
    if (response.success) {
      // Add the new message to the channel's messages
      const currentState = messagesAtom.state;
      const existingData = getLazyLoadedData(currentState.messagesByChannelId[channelId]);
      
      if (existingData) {
        const updatedData: MessageData = {
          ...existingData,
          messages: [response.message, ...existingData.messages]
        };
        currentState.messagesByChannelId[channelId] = updatedData;
        messagesAtom.onChange.trigger(messagesAtom.state);
      }
      
      console.log('Sent message to channel', channelId);
      return response.message;
    } else {
      throw new Error('Failed to send message');
    }
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: number, channelId: number): Promise<void> {
  try {
    const response = await messageSdk.deleteMessage({ message_id: messageId });
    
    if (response.success) {
      // Remove the message from the channel's messages
      const currentState = messagesAtom.state;
      const existingData = getLazyLoadedData(currentState.messagesByChannelId[channelId]);
      
      if (existingData) {
        const updatedData: MessageData = {
          ...existingData,
          messages: existingData.messages.filter((msg: Message) => msg.id !== messageId)
        };
        currentState.messagesByChannelId[channelId] = updatedData;
        messagesAtom.onChange.trigger(messagesAtom.state);
      }
      
      console.log('Deleted message', messageId);
    } else {
      throw new Error(response.message || 'Failed to delete message');
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

/**
 * React to a message with an emoji
 */
export async function reactToMessage(
  messageId: number, 
  channelId: number, 
  reaction: string
): Promise<void> {
  try {
    const response = await messageSdk.reactToMessage({ message_id: messageId, reaction });
    
    if (response.success) {
      // Update the message in the state with the new reaction
      const currentState = messagesAtom.state;
      const existingData = getLazyLoadedData(currentState.messagesByChannelId[channelId]);
      
      if (existingData) {
        const updatedData: MessageData = {
          ...existingData,
          messages: existingData.messages.map((msg: Message) => {
            if (msg.id === messageId) {
              return {
                ...msg,
                reactions: [...msg.reactions, response.reaction]
              };
            }
            return msg;
          })
        };
        currentState.messagesByChannelId[channelId] = updatedData;
        messagesAtom.onChange.trigger(messagesAtom.state);
      }
      
      console.log('Reacted to message', messageId, 'with', reaction);
    } else {
      throw new Error(response.message || 'Failed to react to message');
    }
  } catch (error) {
    console.error('Error reacting to message:', error);
    throw error;
  }
}

/**
 * Remove a reaction from a message
 */
export async function unreactToMessage(
  messageId: number, 
  channelId: number, 
  reaction: string,
  userId: number
): Promise<void> {
  try {
    const response = await messageSdk.unreactToMessage({ message_id: messageId, reaction });
    
    if (response.success) {
      // Update the message in the state by removing the reaction
      const currentState = messagesAtom.state;
      const existingData = getLazyLoadedData(currentState.messagesByChannelId[channelId]);
      
      if (existingData) {
        const updatedData: MessageData = {
          ...existingData,
          messages: existingData.messages.map((msg: Message) => {
            if (msg.id === messageId) {
              return {
                ...msg,
                reactions: msg.reactions.filter((r: MessageReaction) => 
                  !(r.reaction === reaction && r.user_id === userId)
                )
              };
            }
            return msg;
          })
        };
        currentState.messagesByChannelId[channelId] = updatedData;
        messagesAtom.onChange.trigger(messagesAtom.state);
      }
      
      console.log('Removed reaction from message', messageId);
    } else {
      throw new Error(response.message || 'Failed to remove reaction');
    }
  } catch (error) {
    console.error('Error removing reaction:', error);
    throw error;
  }
}

/**
 * Mark a channel as read
 */
export async function markChannelAsRead(channelId: number, timestamp?: string): Promise<void> {
  try {
    const response = await messageSdk.markAsRead({ channel_id: channelId, timestamp });
    
    if (response.success) {
      console.log('Marked channel', channelId, 'as read');
    } else {
      throw new Error(response.message || 'Failed to mark channel as read');
    }
  } catch (error) {
    console.error('Error marking channel as read:', error);
    throw error;
  }
}

/**
 * Get replies to a specific message
 */
export async function loadReplies(messageId: number, channelId: number): Promise<Message[]> {
  try {
    const response = await messageSdk.listMessages({ reply_to: messageId });
    
    if (response.success) {
      console.log('Loaded replies for message', messageId, ':', response.messages.length);
      return response.messages;
    } else {
      throw new Error('Failed to load replies');
    }
  } catch (error) {
    console.error('Error loading replies:', error);
    throw error;
  }
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to use messages for a specific channel
 * Automatically loads messages when the hook is first called
 */
export function useMessages(channelId: number): {
  messages: Message[] | undefined;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const state = useAtom(messagesAtom);
  const messageData = state.messagesByChannelId[channelId];
  
  // Automatically load messages if not loaded yet
  if (!messageData) {
    loadMessages(channelId);
  }
  
  const data = getLazyLoadedData(messageData);
  
  return {
    messages: data?.messages,
    loading: isPromise(messageData),
    error: isError(messageData) ? messageData : null,
    hasMore: data?.hasMore || false,
    loadMore: () => loadMoreMessages(channelId),
    refresh: () => refreshMessages(channelId)
  };
}

/**
 * Hook to get a specific message by ID from a channel
 */
export function useMessage(channelId: number, messageId: number): Message | undefined {
  const { messages } = useMessages(channelId);
  return messages?.find(msg => msg.id === messageId);
}

/**
 * Hook to get unread message count for a channel
 * (requires the channel's last_read_at timestamp)
 */
export function useUnreadCount(channelId: number, lastReadAt: string | null): number {
  const { messages } = useMessages(channelId);
  
  if (!messages || !lastReadAt) {
    return 0;
  }
  
  const lastReadTime = new Date(lastReadAt).getTime();
  return messages.filter(msg => 
    new Date(msg.created_at).getTime() > lastReadTime
  ).length;
}
