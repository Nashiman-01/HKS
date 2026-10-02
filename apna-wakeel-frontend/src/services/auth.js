import { API_BASE_URL } from "../lib/apiConfig.js";

const AUTH_SESSION_KEY = "apna-wakeel-session";
const AUTH_CHANGE_EVENT = "apna-wakeel-auth-change";
let sessionRefreshPromise;

function normalizeUser(payload) {
  const email = payload?.email || payload?.user?.email || "";
  const userId = payload?.user_id || payload?.user?.id || payload?.id || "";
  const fullName = payload?.full_name || payload?.user?.user_metadata?.full_name || payload?.user?.full_name || email.split("@")[0] || "";

  return {
    id: userId,
    email,
    user_metadata: { full_name: fullName },
    app_metadata: {},
  };
}

function normalizeSession(payload) {
  if (!payload?.access_token || !payload?.user_id) return null;

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || "",
    expires_at: payload.expires_at || null,
    token_type: payload.token_type || "bearer",
    user: normalizeUser(payload),
  };
}

export function persistSession(session) {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
  }

  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function getStoredSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token ? parsed : null;
  } catch {
    return null;
  }
}

function apiError(payload, status) {
  const detail = payload?.detail;
  const message = typeof detail === "string"
    ? detail
    : status === 401
      ? "auth.invalidCredentials"
      : status === 403
        ? "auth.forbidden"
        : status === 404
          ? "auth.endpointUnavailable"
          : status === 422
            ? "auth.invalidRequest"
            : status === 429
              ? "auth.rateLimited"
              : status >= 500
                ? "auth.providerError"
                : "auth.genericError";

  const error = new Error(message);
  error.status = status;
  return error;
}

async function requestJson(path, body) {
  if (!API_BASE_URL) {
    const error = new Error("api.notConfigured");
    error.status = 0;
    throw error;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw apiError(payload, response.status);
  return payload;
}

export async function signInWithPassword({ email, password }) {
  const data = await requestJson("/api/auth/login", {
    email: email.trim(),
    password,
  });

  const session = normalizeSession(data);
  if (!session) {
    throw new Error("auth.invalidCredentials");
  }

  persistSession(session);
  return { session, user: session.user };
}

export async function signUpWithPassword({ name, email, password }) {
  const data = await requestJson("/api/auth/signup", {
    email: email.trim(),
    password,
    full_name: name.trim(),
  });

  const session = normalizeSession(data);
  if (session) persistSession(session);

  return {
    user: {
      id: data.user_id,
      email: data.email,
      user_metadata: { full_name: name.trim() },
      identities: data.already_registered ? [] : undefined,
    },
    message: data.message,
    alreadyRegistered: Boolean(data.already_registered),
    session,
  };
}

export async function requestPasswordReset(email) {
  const { supabase } = await import("../lib/supabase.js");
  if (!supabase) throw new Error("supabase_not_configured");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function completePasswordReset(password) {
  const { supabase } = await import("../lib/supabase.js");
  if (!supabase) throw new Error("supabase_not_configured");
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  await supabase.auth.signOut().catch(() => {});
  persistSession(null);
  return data;
}

export async function refreshSession(refreshToken) {
  if (!sessionRefreshPromise) {
    sessionRefreshPromise = requestJson("/api/auth/refresh", { refresh_token: refreshToken })
      .then((data) => {
        const session = normalizeSession(data);
        if (!session) throw new Error("auth.session_restore_failed");
        persistSession(session);
        return session;
      })
      .finally(() => {
        sessionRefreshPromise = null;
      });
  }
  return sessionRefreshPromise;
}

export async function signOut() {
  const session = getStoredSession();
  try {
    if (session?.access_token && session?.refresh_token) {
      await requestJson("/api/auth/logout", {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }
  } finally {
    persistSession(null);
  }
}

async function validateStoredSession(session) {
  const data = await requestJson("/api/auth/session", { access_token: session.access_token });
  return { ...session, user: normalizeUser(data) };
}

export async function getCurrentSession() {
  const stored = getStoredSession();
  if (!stored) return null;

  try {
    const validated = await validateStoredSession(stored);
    persistSession(validated);
    return validated;
  } catch (error) {
    if (error.status === 401 && stored.refresh_token) {
      try {
        const refreshed = await refreshSession(stored.refresh_token);
        const validated = await validateStoredSession(refreshed);
        persistSession(validated);
        return validated;
      } catch (refreshError) {
        if (refreshError.status === 401 || refreshError.status === 403) {
          persistSession(null);
          return null;
        }
        return stored;
      }
    }
    if (error.status === 401 || error.status === 403) {
      persistSession(null);
      return null;
    }
    return stored;
  }
}

export function subscribeToAuthChanges(callback) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event) => {
    if (event.key === AUTH_SESSION_KEY) {
      callback(getStoredSession());
    }
  };

  const handleSessionChange = () => callback(getStoredSession());

  window.addEventListener("storage", handleStorage);
  window.addEventListener(AUTH_CHANGE_EVENT, handleSessionChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(AUTH_CHANGE_EVENT, handleSessionChange);
  };
}