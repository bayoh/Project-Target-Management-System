import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { activityLogger } from './activityLogger';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  sessionId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let currentSessionId: string | null = null;
    let isInitialized = false;
    
    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth loading timeout reached, setting loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout
    
    const cleanupSession = async () => {
      if (currentSessionId) {
        try {
          await activityLogger.flushActivities(); // Flush all pending activities
          await activityLogger.endSession();
          await activityLogger.cleanup();
        } catch (error) {
          console.error('Error cleaning up session:', error);
        }
        currentSessionId = null;
        if (isMounted) {
          setSessionId(null);
        }
      }
    };
    
    const startNewSession = async (userId: string) => {
      // Cleanup any existing session first
      await cleanupSession();
      
      try {
        const newSessionId = await activityLogger.startSession();
        currentSessionId = newSessionId;
        setSessionId(newSessionId);
        return newSessionId;
      } catch (error) {
        console.error('Error starting activity session:', error);
        return null;
      }
    };
    
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (isMounted) {
          setUser(session?.user || null);
          setIsAdmin(session?.user?.user_metadata?.role === 'admin' || session?.user?.user_metadata?.role === 'super_admin');
        }
        
        // Start activity tracking session if user is logged in (non-blocking)
        if (session?.user && !isInitialized) {
          startNewSession(session.user.id).catch(error => {
            console.error('Failed to start session, continuing anyway:', error);
          });
          isInitialized = true;
        }
        
        if (isMounted) {
          clearTimeout(loadingTimeout);
          setLoading(false);
        }
      } catch (error) {
        console.error('Critical error in getSession:', error);
        if (isMounted) {
          clearTimeout(loadingTimeout);
          setLoading(false);
        }
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isMounted) {
        setUser(session?.user || null);
        setIsAdmin(session?.user?.user_metadata?.role === 'super_admin' || session?.user?.user_metadata?.role === 'admin');
      }
      
      // Handle login/logout activity tracking (non-blocking)
      if (event === 'SIGNED_IN' && session?.user) {
        startNewSession(session.user.id).catch(error => {
          console.error('Failed to start session on sign in:', error);
        });
      } else if (event === 'SIGNED_OUT') {
        cleanupSession().catch(error => {
          console.error('Failed to cleanup session on sign out:', error);
        });
      }
      
      if (isMounted) {
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    });

    // Cleanup on unmount
    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
      // Cleanup session on unmount
      cleanupSession().catch(error => {
        console.error('Failed to cleanup session on unmount:', error);
      });
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, sessionId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};