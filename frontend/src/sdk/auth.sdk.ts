
import { http } from './http';
import { config } from '../config';

// Types
export type User = {
  id: number;
  name: string;
  email: string;
  avatar_data_url?: string | null;
  blocked: boolean;
  created_at: string;
  permissions?: string[];
}

export type LoginRequest = {
  email: string;
  password: string;
}

export type LoginResponse = {
  success: boolean;
  user: User;
}

export type CreateUserRequest = {
  name: string;
  email: string;
  password: string;
  avatar_data_url?: string | null;
  blocked?: boolean;
}

export type CreateUserResponse = {
  success: boolean;
  user_id: number;
  message: string;
}

export type BlockUserRequest = {
  user_id: number;
  blocked: boolean;
}

export type BlockUserResponse = {
  success: boolean;
  message: string;
}

export type DeleteUserRequest = {
  user_id: number;
}

export type DeleteUserResponse = {
  success: boolean;
  message: string;
}

export type CurrentUserResponse = {
  success: boolean;
  user: User;
}

export type ListUsersResponse = {
  success: boolean;
  users: User[];
  total: number;
}

export type UpdateProfileRequest = {
  name?: string;
  avatar_data_url?: string | null;
  password?: string;
}

export type UpdateProfileResponse = {
  success: boolean;
  user: User;
  message: string;
}

export type AdminUpdateUserRequest = {
  user_id: number;
  name?: string;
  email?: string;
  password?: string;
  permissions?: string[];
}

export type AdminUpdateUserResponse = {
  success: boolean;
  user: User;
  message: string;
}

export type LogoutResponse = {
  success: boolean;
  message: string;
}

// Auth SDK
export const authSdk = {
  /**
   * Login with email and password
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const url = `/api/auth.php/login`;
    return http.post(url, request);
  },

  /**
   * Logout current user
   */
  async logout(): Promise<LogoutResponse> {
    const url = `/api/auth.php/logout`;
    return http.post(url, {});
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<CurrentUserResponse> {
    const url = `/api/auth.php/current-user`;
    console.log('Fetching current user from URL:', url);
    return http.get(url);
  },

  /**
   * List all users (requires MANAGE_USERS permission)
   */
  async listUsers(): Promise<ListUsersResponse> {
    const url = `/api/auth.php/users`;
    return http.get(url);
  },

  /**
   * Create a new user (requires MANAGE_USERS permission)
   */
  async createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
    const url = `/api/auth.php/create-user`;
    return http.post(url, request);
  },

  async register(request: { name: string; email: string; password: string }): Promise<CreateUserResponse> {
    const url = `/api/auth.php/register`;
    return http.post(url, request);
  },
  async registerAnonymous(): Promise<LoginResponse> {
    const url = `/api/auth.php/register-anonymous`;
    return http.post(url, {});
  },

  async verifyEmail(request: { code: string, user_id: string }): Promise<{ success: boolean; message: string }> {
    const url = `/api/auth.php/verify-email`;
    return http.post(url, request);
  },
  async sendForgotPasswordEmail(request: { email: string }): Promise<{ success: boolean; message: string }> {
    const url = `/api/auth.php/forgot-password`;
    return http.post(url, request);
  },
  async resetPassword(request: { code: string; new_password: string, user_id: string }): Promise<{ success: boolean; message: string }> {
    const url = `/api/auth.php/reset-password`;
    return http.post(url, request);
  },

  /**
   * Block or unblock a user (requires MANAGE_USERS permission)
   */
  async blockUser(request: BlockUserRequest): Promise<BlockUserResponse> {
    const url = `/api/auth.php/block-user`;
    return http.post(url, request);
  },

  /**
   * Delete a user (requires MANAGE_USERS permission)
   */
  async deleteUser(request: DeleteUserRequest): Promise<DeleteUserResponse> {
    const url = `/api/auth.php/delete-user`;
    return http.post(url, request);
  },

  /**
   * Update current user's profile
   */
  async updateProfile(request: UpdateProfileRequest): Promise<UpdateProfileResponse> {
    const url = `/api/auth.php/update-profile`;
    return http.post(url, request);
  },

  /**
   * Admin update any user (requires MANAGE_USERS permission)
   */
  async adminUpdateUser(request: AdminUpdateUserRequest): Promise<AdminUpdateUserResponse> {
    const url = `/api/auth.php/admin-update-user`;
    return http.post(url, request);
  },
};