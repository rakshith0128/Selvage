import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  initializing: boolean;
  authError: string | null;

  init: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initializing: true,
  authError: null,

  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, initializing: false });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, initializing: false });
    });
  },

  signIn: async (email, password) => {
    set({ authError: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) set({ authError: error.message });
  },

  signUp: async (email, password) => {
    set({ authError: null });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) set({ authError: error.message });
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
