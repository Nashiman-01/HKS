import { createContext, useContext, useEffect, useState } from "react";
import {
  getCurrentSession,
  signOut,
  subscribeToAuthChanges,
} from "../services/auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getCurrentSession());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToAuthChanges((nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
        setAuthError("");
      }
    });

    if (active) {
      setLoading(false);
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function logout() {
    setAuthError("");
    try {
      await signOut();
      setSession(null);
    } catch (error) {
      setAuthError(error.message === "api.notConfigured" ? error.message : "auth.sign_out_failed");
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        configured: true,
        authError,
        setAuthError,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}