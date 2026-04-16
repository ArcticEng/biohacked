"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth", { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data.user);
    } catch { setUser(null); }
    setLoading(false);
  };

  useEffect(() => { fetchUser(); }, []);

  const login = async (email, password) => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "login", email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setUser(data.user);
    router.push("/dashboard");
    return data;
  };

  const register = async (payload) => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "register", ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setUser(data.user);
    router.push("/dashboard");
    return data;
  };

  const logout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
    router.push("/login");
  };

  const updateProfile = async (data) => {
    const res = await fetch("/api/auth", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    setUser(result.user);
    return result.user;
  };

  const isCoach = user?.role === "COACH" || user?.role === "ADMIN";
  const isEducator = user?.role === "EDUCATOR";
  const isClient = user?.role === "CLIENT";
  const isPremium = user?.tier === "PREMIUM" || user?.tier === "COACH";
  const remaining = isPremium ? null : Math.max(0, 3 - (user?.weeklyRecipeCount || 0));

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, updateProfile, fetchUser,
      isCoach, isEducator, isClient, isPremium, remaining,
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
