import { useEffect, useState } from "react";
import type { User } from "./auth.sdk";
import { http } from "./http";

const userCache = {} as Record<number, User | Promise<User>>;

export const userSdk = {
  async getUser(userId: number): Promise<User> {
    if (!userCache[userId]) {
      userCache[userId] = http.get(`/api/auth.php/users/${userId}`);
      userCache[userId].then(user => {
        userCache[userId] = user; // Cache the resolved user
      }).catch(() => {
        delete userCache[userId]; // Remove from cache on error
      });
    }
    return await userCache[userId];
  },
};

export function useUserById(userId: number): User | undefined {
  const val = userCache[userId];
  const existingUser = typeof val === "object" ? (val instanceof Promise ? undefined : val) : undefined;
  const [user, setUser] = useState<User | undefined>(existingUser);

  useEffect(() => {
    const fetchUser = async () => {
      const cached = userCache[userId];
      if (cached && !(cached instanceof Promise)) {
        setUser(cached);
        return;
      }
      const user = await userSdk.getUser(userId);
      setUser(user);
    };
    if(existingUser){
      return
    }
    fetchUser();
  }, [userId]);

  return existingUser || user;
}