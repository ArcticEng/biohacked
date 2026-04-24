"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth", { credentials: "include" });
      if (res.status === 401) {
        setUser(null);
        // Only show expired if we HAD a user before (not first load)
        if (user) setSessionExpired(true);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data.user);
      setSessionExpired(false);
    } catch { setUser(null); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  // Periodic session check every 5 minutes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchUser, 300000);
    return () => clearInterval(interval);
  }, [user, fetchUser]);

  const login = async (email, password) => {
    const res = await fetch("/api/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "login", email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setUser(data.user);
    setSessionExpired(false);
    router.push("/dashboard");
    return data;
  };

  const register = async (payload) => {
    const res = await fetch("/api/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "register", ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setUser(data.user);
    setSessionExpired(false);
    // Route to onboarding for new clients, dashboard for coaches/educators
    router.push(payload.role === "CLIENT" ? "/onboarding" : "/dashboard");
    return data;
  };

  const logout = async () => {
    await fetch("/api/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
    setSessionExpired(false);
    router.push("/login");
  };

  const updateProfile = async (data) => {
    const res = await fetch("/api/auth", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    setUser(result.user);
    return result.user;
  };

  const dismissSessionExpired = () => {
    setSessionExpired(false);
    router.push("/login");
  };

  const isCoach = user?.role === "COACH" || user?.role === "ADMIN";
  const isEducator = user?.role === "EDUCATOR";
  const isClient = user?.role === "CLIENT";
  const isAdmin = user?.role === "ADMIN";
  const isPremium = user?.tier === "PREMIUM" || user?.tier === "COACH";
  const remaining = isPremium ? null : Math.max(0, 3 - (user?.weeklyRecipeCount || 0));

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, updateProfile, fetchUser,
      isCoach, isEducator, isClient, isAdmin, isPremium, remaining,
      sessionExpired, dismissSessionExpired,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
