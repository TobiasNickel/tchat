import { http } from './http';
import { config } from '../config';

// Types
export type Channel = {
  id: number;
  name: string;
  is_public: boolean;
  created_at: string;
  is_joined: boolean;
  member_count: number;
  last_read_at: string | null;
}

export type ChannelUser = {
  id: number;
  name: string;
  email: string;
  avatar_data_url: string | null;
  joined_at: string;
}

export type ListChannelsResponse = {
  success: boolean;
  channels: Channel[];
  total: number;
}

export type GetChannelRequest = {
  channel_id: number;
}

export type GetChannelResponse = {
  success: boolean;
  channel: Channel;
}

export type GetChannelUsersRequest = {
  channel_id: number;
}

export type GetChannelUsersResponse = {
  success: boolean;
  users: ChannelUser[];
  total: number;
}

export type CreateChannelRequest = {
  name: string;
  is_public?: boolean;
}

export type CreateChannelResponse = {
  success: boolean;
  channel: Channel;
  message: string;
}

export type DeleteChannelRequest = {
  channel_id: number;
}

export type DeleteChannelResponse = {
  success: boolean;
  message: string;
}

export type AddUserRequest = {
  channel_id: number;
  user_id: number;
}

export type AddUserResponse = {
  success: boolean;
  message: string;
}

export type RemoveUserRequest = {
  channel_id: number;
  user_id: number;
}

export type RemoveUserResponse = {
  success: boolean;
  message: string;
}

export type RenameChannelRequest = {
  channel_id: number;
  name: string;
}

export type RenameChannelResponse = {
  success: boolean;
  channel: Channel;
  message: string;
}

export type CloseChannelRequest = {
  channel_id: number;
}

export type CloseChannelResponse = {
  success: boolean;
  channel: Channel;
  message: string;
}

export type ReopenChannelRequest = {
  channel_id: number;
}

export type ReopenChannelResponse = {
  success: boolean;
  channel: Channel;
  message: string;
}

export type JoinChannelRequest = {
  channel_id: number;
}

export type JoinChannelResponse = {
  success: boolean;
  message: string;
}

export type LeaveChannelRequest = {
  channel_id: number;
}

export type LeaveChannelResponse = {
  success: boolean;
  message: string;
}


// Channel SDK
export const channelSdk = {
  /**
   * List all channels accessible to the current user
   */
  async listChannels(): Promise<ListChannelsResponse> {
    const url = `/api/channel.php/list`;
    return http.get(url);
  },

  /**
   * Get details about a specific channel
   */
  async getChannel(request: GetChannelRequest): Promise<GetChannelResponse> {
    const url = `/api/channel.php/get?channel_id=${request.channel_id}`;
    return http.get(url);
  },

  /**
   * Get all users in a channel
   */
  async getChannelUsers(request: GetChannelUsersRequest): Promise<GetChannelUsersResponse> {
    const url = `/api/channel.php/users?channel_id=${request.channel_id}`;
    return http.get(url);
  },

  /**
   * Create a new channel (requires MANAGE_CHANNELS permission)
   */
  async createChannel(request: CreateChannelRequest): Promise<CreateChannelResponse> {
    const url = `/api/channel.php/create`;
    return http.post(url, request);
  },

  /**
   * Delete a channel (requires MANAGE_CHANNELS permission)
   */
  async deleteChannel(request: DeleteChannelRequest): Promise<DeleteChannelResponse> {
    const url = `/api/channel.php/delete`;
    return http.post(url, request);
  },

  /**
   * Add a user to a channel (requires MANAGE_CHANNELS permission)
   */
  async addUser(request: AddUserRequest): Promise<AddUserResponse> {
    const url = `/api/channel.php/add-user`;
    return http.post(url, request);
  },

  /**
   * Remove a user from a channel (requires MANAGE_CHANNELS permission)
   */
  async removeUser(request: RemoveUserRequest): Promise<RemoveUserResponse> {
    const url = `/api/channel.php/remove-user`;
    return http.post(url, request);
  },

  /**
   * Rename a channel (requires MANAGE_CHANNELS permission)
   */
  async renameChannel(request: RenameChannelRequest): Promise<RenameChannelResponse> {
    const url = `/api/channel.php/rename`;
    return http.post(url, request);
  },

  /**
   * Close a channel (make it private) (requires MANAGE_CHANNELS permission)
   */
  async closeChannel(request: CloseChannelRequest): Promise<CloseChannelResponse> {
    const url = `/api/channel.php/close`;
    return http.post(url, request);
  },

  /**
   * Reopen a channel (make it public) (requires MANAGE_CHANNELS permission)
   */
  async reopenChannel(request: ReopenChannelRequest): Promise<ReopenChannelResponse> {
    const url = `/api/channel.php/reopen`;
    return http.post(url, request);
  },

  /**
   * Join a public channel
   */
  async joinChannel(request: JoinChannelRequest): Promise<JoinChannelResponse> {
    const url = `/api/channel.php/join`;
    return http.post(url, request);
  },

  /**
   * Leave a channel
   */
  async leaveChannel(request: LeaveChannelRequest): Promise<LeaveChannelResponse> {
    const url = `/api/channel.php/leave`;
    return http.post(url, request);
  },
}