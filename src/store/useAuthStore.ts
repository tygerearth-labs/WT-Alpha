import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  image?: string | null;
  plan?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true, // Start with loading to prevent flash of landing page

      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

      logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),

      checkAuth: async () => {
        set({ isLoading: true }); // Set loading before API call
        try {
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const data = await response.json();
            set({ user: data.user, isAuthenticated: true, isLoading: false });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user and auth state, NOT isLoading (transient)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
