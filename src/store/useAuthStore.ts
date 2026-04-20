import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  image?: string | null;
  plan?: string;
  role?: string;
  status?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  forceStopLoading: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

      logout: () => {
        // Clear everything on logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      forceStopLoading: () => {
        const state = get();
        if (state.isLoading) {
          set({ isLoading: false });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const response = await fetch('/api/auth/me', { signal: controller.signal });
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            // Always use fresh API data, overwrite any cached state
            set({
              user: data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Cookie invalid or expired — clear stale cached state
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
      // Only persist user identity — NOT isLoading, NOT role (always re-verify from API)
      partialize: (state) => ({
        user: {
          id: state.user?.id ?? '',
          email: state.user?.email ?? '',
          username: state.user?.username ?? '',
          image: state.user?.image,
          plan: state.user?.plan,
          role: state.user?.role,
          status: state.user?.status,
        },
        isAuthenticated: state.isAuthenticated,
      }),
      // On rehydrate, force loading so checkAuth() can fetch fresh role data
      onRehydrateStorage: () => (state) => {
        if (state?.isAuthenticated) {
          state.isLoading = true;
        } else {
          // If not authenticated on rehydrate, no need to load
          state.isLoading = false;
        }
      },
    }
  )
);
