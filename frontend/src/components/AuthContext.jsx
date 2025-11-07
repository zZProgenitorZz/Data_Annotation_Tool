import React, { createContext, useState, useEffect, useRef } from "react";
import { getCurrentUser, getGuestInfo } from "../services/authService";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authType, setAuthType] = useState(null); // "user" | "guest" | null
  const [loading, setLoading] = useState(true);

  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    const controller = new AbortController();

    const run = async () => {
      const token = localStorage.getItem("access_token");
      const kind = localStorage.getItem("auth_kind"); // "user" of "guest"

      if (!token || !kind) {
        setCurrentUser(null);
        setAuthType(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        if (kind === "user") {
          const me = await getCurrentUser({ signal: controller.signal });
          setCurrentUser(me);
          setAuthType("user");
          return;
        }

        if (kind === "guest") {
          const g = await getGuestInfo({ signal: controller.signal });
          setCurrentUser(g);
          setAuthType("guest");
          return;
        }

        // fallback als kind iets raars is
        setCurrentUser(null);
        setAuthType(null);
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Failed to fetch auth user:", err);
        }
        // Token ongeldig → schoonmaken
        localStorage.removeItem("access_token");
        localStorage.removeItem("auth_kind");
        setCurrentUser(null);
        setAuthType(null);
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, []);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_kind");
    setCurrentUser(null);
    setAuthType(null);
    setLoading(false);
  };



  return (
    <AuthContext.Provider
      value={{ currentUser, setCurrentUser, authType, loading, logout, setAuthType}}
    >
      {children}
    </AuthContext.Provider>
  );
};
