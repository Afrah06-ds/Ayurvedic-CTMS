'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, CreateUserData } from '@/lib/types';
import {
  getCachedUsers,
  addUserToCache,
  deleteUserFromCache,
  toggleUserStatusInCache,
  getCachedSession,
  saveCachedSession,
} from '@/lib/storage';

interface AuthContextType {
  user: Omit<User, 'password'> | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  createUser: (data: CreateUserData) => Promise<{ success: boolean; user?: User; error?: string }>;
  getUsersList: () => User[];
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  toggleUserStatus: (userId: string) => Promise<{ success: boolean; error?: string }>;
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [, setRefreshCount] = useState<number>(0);
  const router = useRouter();

  // Load session from storage on mount
  useEffect(() => {
    try {
      const stored = getCachedSession();
      if (stored) {
        // Verify user still exists in DB
        const allUsers = getCachedUsers();
        const found = allUsers.find((u) => u.id === stored.id && u.status === 'active');
        if (found) {
          const { password, ...safeUser } = found;
          setUser(safeUser);
          saveCachedSession(safeUser);
        } else {
          saveCachedSession(null);
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Session restoration failed', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUsers = useCallback(() => {
    setRefreshCount((prev) => prev + 1);
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const allUsers = getCachedUsers();
      const matched = allUsers.find((u) => u.email.toLowerCase() === trimmedEmail);

      if (!matched) {
        return { success: false, error: 'Invalid email or password. Please try again.' };
      }

      if (matched.password !== password) {
        return { success: false, error: 'Invalid email or password. Please try again.' };
      }

      if (matched.status === 'inactive') {
        return {
          success: false,
          error: 'Your account has been deactivated. Please contact your administrator.',
        };
      }

      const { password: _, ...safeUser } = matched;
      setUser(safeUser);
      saveCachedSession(safeUser);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during login';
      return { success: false, error: message };
    }
  };

  const logout = useCallback(() => {
    saveCachedSession(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const createUser = async (
    data: CreateUserData
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      if (!user || user.role !== 'admin') {
        return { success: false, error: 'Permission denied. Only administrators can create users.' };
      }

      if (!data.email || !data.password || !data.fullName) {
        return { success: false, error: 'Please fill in all required fields (Name, Email, Password).' };
      }

      const newUser = addUserToCache(data);
      refreshUsers();
      return { success: true, user: newUser };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      return { success: false, error: message };
    }
  };

  const getUsersList = useCallback((): User[] => {
    return getCachedUsers();
  }, []);

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user || user.role !== 'admin') {
        return { success: false, error: 'Permission denied. Only administrators can delete users.' };
      }
      deleteUserFromCache(userId);
      refreshUsers();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      return { success: false, error: message };
    }
  };

  const toggleUserStatus = async (
    userId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user || user.role !== 'admin') {
        return { success: false, error: 'Permission denied.' };
      }
      toggleUserStatusInCache(userId);
      refreshUsers();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update user status';
      return { success: false, error: message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        createUser,
        getUsersList,
        deleteUser,
        toggleUserStatus,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
