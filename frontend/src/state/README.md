# State Management

This directory contains the state management layer for the tchat application, using custom atoms for reactive state with LazyLoaded data patterns.

## Files

- **authState.ts** - Authentication state management
- **channelState.ts** - Channel state management with lazy-loaded user lists
- **messageState.ts** - Message state management with pagination support

## LazyLoaded Pattern

All state modules use the `LazyLoaded<T>` type from `utils/lazy.ts`, which represents data that can be in one of four states:
- `undefined` - Not yet requested
- `Promise<T>` - Currently loading
- `T` - Successfully loaded
- `Error` - Failed to load

This pattern eliminates the need for separate `loading` and `error` flags, simplifying state management.

## Channel State (`channelState.ts`)

### Atoms

- **`channelsAtom`** - Stores channels as `LazyLoaded<Channel[]>`
- **`channelUsersAtom`** - Stores users for each channel as `Record<number, LazyLoaded<ChannelUser[]>>`

### Features

- ✅ Automatically loads channels when the module is imported
- ✅ Lazy-loads channel users only when requested
- ✅ Provides convenient React hooks for easy data access
- ✅ Supports all channel operations (create, join, leave, delete, rename, etc.)
- ✅ Uses LazyLoaded pattern for cleaner state management

### React Hooks

```typescript
// Get all channels with loading and error state
const { channels, loading, error } = useChannels();
// channels: Channel[] | undefined
// loading: boolean
// error: Error | null

// Get a specific channel by ID
const channel = useChannel(channelId);

// Get only joined channels
const joinedChannels = useJoinedChannels();

// Get only public channels
const publicChannels = usePublicChannels();

// Get users for a specific channel (auto-loads on first use)
const { users, loading, error } = useChannelUsers(channelId);
// users: ChannelUser[] | undefined
// loading: boolean
// error: Error | null
```

### API Functions

```typescript
// Load all channels (called automatically on module load)
await loadChannels();

// Load users for a specific channel (called automatically by useChannelUsers)
await loadChannelUsers(channelId);

// Create a new channel
const channel = await createChannel("General", true);

// Join/leave channels
await joinChannel(channelId);
await leaveChannel(channelId);

// Delete a channel (requires permissions)
await deleteChannel(channelId);

// Rename a channel (requires permissions)
await renameChannel(channelId, "New Name");

// Manage users (requires permissions)
await addUserToChannel(channelId, userId);
await removeUserFromChannel(channelId, userId);
```

## Message State (`messageState.ts`)

### Atoms

- **`messagesAtom`** - Stores messages for each channel as `Record<number, LazyLoaded<MessageData>>`
  - `MessageData` contains: `{ messages: Message[], hasMore: boolean, offset: number }`

### Features

- ✅ Lazy-loads messages per channel only when requested
- ✅ Supports pagination with "load more" functionality
- ✅ Real-time message updates (send, delete, react)
- ✅ Thread support (replies to messages)
- ✅ Message reactions
- ✅ Uses LazyLoaded pattern for cleaner state management

### React Hooks

```typescript
// Get messages for a channel (auto-loads on first use)
const { messages, loading, error, hasMore, loadMore, refresh } = useMessages(channelId);
// messages: Message[] | undefined
// loading: boolean
// error: Error | null
// hasMore: boolean
// loadMore: () => Promise<void>
// refresh: () => Promise<void>

// Get a specific message
const message = useMessage(channelId, messageId);

// Get unread count for a channel
const unreadCount = useUnreadCount(channelId, lastReadAt);
```

### API Functions

```typescript
// Load messages for a channel
await loadMessages(channelId, { limit: 50, offset: 0 });

// Load more messages (pagination)
await loadMoreMessages(channelId);

// Refresh messages (load latest)
await refreshMessages(channelId);

// Send a message
const message = await sendMessage(channelId, "Hello!", replyToId?);

// Delete a message
await deleteMessage(messageId, channelId);

// React to a message
await reactToMessage(messageId, channelId, "👍");
await unreactToMessage(messageId, channelId, "👍", userId);

// Mark channel as read
await markChannelAsRead(channelId);

// Load replies to a message
const replies = await loadReplies(messageId, channelId);
```

## Usage Example

```tsx
import { useChannels, useChannelUsers } from '../state/channelState';
import { useMessages, sendMessage } from '../state/messageState';

function ChatPage() {
  const { channels, loading, error } = useChannels();
  const [selectedChannelId, setSelectedChannelId] = useState(1);
  
  const { messages, loadMore, hasMore } = useMessages(selectedChannelId);
  const { users } = useChannelUsers(selectedChannelId);
  
  const handleSendMessage = async (content: string) => {
    await sendMessage(selectedChannelId, content);
  };
  
  if (loading) return <div>Loading channels...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <ChannelList channels={channels} onSelect={setSelectedChannelId} />
      <MessageList messages={messages} onLoadMore={loadMore} hasMore={hasMore} />
      <UserList users={users} />
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
```

## Auto-Loading Behavior

- **Channels**: Automatically loaded when `channelState.ts` is imported
- **Channel Users**: Automatically loaded when `useChannelUsers(channelId)` is called
- **Messages**: Automatically loaded when `useMessages(channelId)` is called

This means you can simply use the hooks in your components, and the data will be fetched automatically if not already available.

## LazyLoaded State Transitions

```
undefined -> Promise<T> -> T (success)
                        -> Error (failure)
```

The hooks automatically extract the current state:
- `loading = isPromise(data)` - true when data is a Promise
- `error = isError(data) ? data : null` - the Error object if failed
- `value = getLazyLoadedData(data)` - the actual data if loaded

