import { makeAtom, useAtom } from '../utils/atom';
import { channelSdk, type Channel, type ChannelUser } from '../sdk/channel.sdk';
import { type LazyLoaded, getLazyLoadedData, isPromise, isError, loadLazyLoadedData } from '../utils/lazy';

// ============================================================================
// State Types
// ============================================================================

interface ChannelsState {
  channels: LazyLoaded<Channel[]>;
}

interface ChannelUsersState {
  // Map of channel_id to LazyLoaded users array
  usersByChannelId: Record<number, LazyLoaded<ChannelUser[]>>;
}

// ============================================================================
// Atoms
// ============================================================================

/**
 * Global channels atom - stores all channels accessible to the current user
 */
export const channelsAtom = makeAtom<ChannelsState, Record<string, never>>(
  { channels: undefined },
  {},
  'channelsState'
);

/**
 * Global channel users atom - stores users for each channel (lazy-loaded)
 */
export const channelUsersAtom = makeAtom<ChannelUsersState, Record<string, never>>(
  { usersByChannelId: {} },
  {},
  'channelUsersState'
);

// ============================================================================
// Channel API Functions
// ============================================================================

/**
 * Load all channels from the API
 */
export async function loadChannels(): Promise<void> {
  loadLazyLoadedData({
    parent: channelsAtom.state,
    propName: 'channels',
    load: async () => {
      const response = await channelSdk.listChannels();
      if (response.success) {
        console.log('Loaded channels:', response.channels.length);
        return response.channels;
      } else {
        throw new Error('Failed to load channels');
      }
    },
    onDone: () => {
      channelsAtom.onChange.trigger(channelsAtom.state);
    }
  });
}

/**
 * Load users for a specific channel (lazy-loaded on demand)
 */
export async function loadChannelUsers(channelId: number): Promise<void> {
  const currentState = channelUsersAtom.state;
  
  // Check if already loading or loaded
  if (!currentState.usersByChannelId[channelId]) {
    currentState.usersByChannelId[channelId] = undefined;
  }
  
  loadLazyLoadedData({
    parent: currentState.usersByChannelId,
    propName: String(channelId),
    load: async () => {
      const response = await channelSdk.getChannelUsers({ channel_id: channelId });
      if (response.success) {
        console.log('Loaded users for channel', channelId, ':', response.users.length);
        return response.users;
      } else {
        throw new Error('Failed to load users');
      }
    },
    onDone: () => {
      channelUsersAtom.onChange.trigger(channelUsersAtom.state);
    }
  });
}

/**
 * Create a new channel
 */
export async function createChannel(name: string, isPublic: boolean = true): Promise<Channel> {
  try {
    const response = await channelSdk.createChannel({ name, is_public: isPublic });
    
    if (response.success) {
      // Add the new channel to the list
      const currentChannels = getLazyLoadedData(channelsAtom.state.channels);
      if (currentChannels) {
        channelsAtom.set({
          channels: [...currentChannels, response.channel]
        }, false);
      }
      console.log('Created channel:', response.channel);
      return response.channel;
    } else {
      throw new Error(response.message || 'Failed to create channel');
    }
  } catch (error) {
    console.error('Error creating channel:', error);
    throw error;
  }
}

/**
 * Join a public channel
 */
export async function joinChannel(channelId: number): Promise<void> {
  try {
    const response = await channelSdk.joinChannel({ channel_id: channelId });
    
    if (response.success) {
      // Reload channels to get updated join status
      await loadChannels();
      console.log('Joined channel:', channelId);
    } else {
      throw new Error(response.message || 'Failed to join channel');
    }
  } catch (error) {
    console.error('Error joining channel:', error);
    throw error;
  }
}

/**
 * Leave a channel
 */
export async function leaveChannel(channelId: number): Promise<void> {
  try {
    const response = await channelSdk.leaveChannel({ channel_id: channelId });
    
    if (response.success) {
      // Reload channels to get updated join status
      await loadChannels();
      console.log('Left channel:', channelId);
    } else {
      throw new Error(response.message || 'Failed to leave channel');
    }
  } catch (error) {
    console.error('Error leaving channel:', error);
    throw error;
  }
}

/**
 * Delete a channel (requires MANAGE_CHANNELS permission)
 */
export async function deleteChannel(channelId: number): Promise<void> {
  try {
    const response = await channelSdk.deleteChannel({ channel_id: channelId });
    
    if (response.success) {
      // Remove the channel from the list
      const currentChannels = getLazyLoadedData(channelsAtom.state.channels);
      if (currentChannels) {
        channelsAtom.set({
          channels: currentChannels.filter((ch: Channel) => ch.id !== channelId)
        }, false);
      }
      
      // Also remove users data for this channel
      const currentUsersState = channelUsersAtom.state;
      const { [channelId]: removedUsers, ...remainingUsers } = currentUsersState.usersByChannelId;
      
      channelUsersAtom.set({
        usersByChannelId: remainingUsers
      }, false);
      
      console.log('Deleted channel:', channelId);
    } else {
      throw new Error(response.message || 'Failed to delete channel');
    }
  } catch (error) {
    console.error('Error deleting channel:', error);
    throw error;
  }
}

/**
 * Rename a channel (requires MANAGE_CHANNELS permission)
 */
export async function renameChannel(channelId: number, newName: string): Promise<void> {
  try {
    const response = await channelSdk.renameChannel({ channel_id: channelId, name: newName });
    
    if (response.success) {
      // Update the channel in the list
      const currentChannels = getLazyLoadedData(channelsAtom.state.channels);
      if (currentChannels) {
        channelsAtom.set({
          channels: currentChannels.map((ch: Channel) => 
            ch.id === channelId ? response.channel : ch
          )
        }, false);
      }
      console.log('Renamed channel:', channelId);
    } else {
      throw new Error(response.message || 'Failed to rename channel');
    }
  } catch (error) {
    console.error('Error renaming channel:', error);
    throw error;
  }
}

/**
 * Add a user to a channel (requires MANAGE_CHANNELS permission)
 */
export async function addUserToChannel(channelId: number, userId: number): Promise<void> {
  try {
    const response = await channelSdk.addUser({ channel_id: channelId, user_id: userId });
    
    if (response.success) {
      // Reload users for this channel
      await loadChannelUsers(channelId);
      console.log('Added user', userId, 'to channel', channelId);
    } else {
      throw new Error(response.message || 'Failed to add user to channel');
    }
  } catch (error) {
    console.error('Error adding user to channel:', error);
    throw error;
  }
}

/**
 * Remove a user from a channel (requires MANAGE_CHANNELS permission)
 */
export async function removeUserFromChannel(channelId: number, userId: number): Promise<void> {
  try {
    const response = await channelSdk.removeUser({ channel_id: channelId, user_id: userId });
    
    if (response.success) {
      // Reload users for this channel
      await loadChannelUsers(channelId);
      console.log('Removed user', userId, 'from channel', channelId);
    } else {
      throw new Error(response.message || 'Failed to remove user from channel');
    }
  } catch (error) {
    console.error('Error removing user from channel:', error);
    throw error;
  }
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to use channels state in components
 * Returns all channels, loading state, and error
 */
export function useChannels(): {
  channels: Channel[] | undefined;
  loading: boolean;
  error: Error | null;
} {
  const state = useAtom(channelsAtom);
  const channelsData = state.channels;
  
  return {
    channels: getLazyLoadedData(channelsData),
    loading: isPromise(channelsData),
    error: isError(channelsData) ? channelsData : null
  };
}

/**
 * Hook to get a specific channel by ID
 */
export function useChannel(channelId: number): Channel | undefined {
  const { channels } = useChannels();
  return channels?.find((ch: Channel) => ch.id === channelId);
}

/**
 * Hook to get all joined channels
 */
export function useJoinedChannels(): Channel[] {
  const { channels } = useChannels();
  return channels?.filter((ch: Channel) => ch.is_joined) || [];
}

/**
 * Hook to get all public channels
 */
export function usePublicChannels(): Channel[] {
  const { channels } = useChannels();
  return channels?.filter((ch: Channel) => ch.is_public) || [];
}

/**
 * Hook to use channel users state for a specific channel
 * Automatically loads users when the hook is first called
 */
export function useChannelUsers(channelId: number): {
  users: ChannelUser[] | undefined;
  loading: boolean;
  error: Error | null;
} {
  const state = useAtom(channelUsersAtom);
  const usersData = state.usersByChannelId[channelId];
  
  // Automatically load users if not loaded yet
  if (!usersData) {
    loadChannelUsers(channelId);
  }
  
  return {
    users: getLazyLoadedData(usersData),
    loading: isPromise(usersData),
    error: isError(usersData) ? usersData : null
  };
}

// ============================================================================
// Auto-load channels on module initialization
// ============================================================================

// Automatically load channels when the module is imported
loadChannels().catch(error => {
  console.error('Failed to auto-load channels on module initialization:', error);
});
