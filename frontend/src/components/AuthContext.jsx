import React, { createContext, useState, useEffect, useRef } from "react";
import { getCurrentUser } from "../services/authService"; // => GET /user/me

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const didFetch = useRef(false);     // guard tegen dubbele calls in StrictMode
  const abortRef = useRef(null);      // bewaart AbortController voor cleanup

  useEffect(() => {
    if (didFetch.current) return;     // voorkom tweede run in dev StrictMode
    didFetch.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    const run = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Zorg dat je service optioneel een { signal } accepteert. Zo niet, laat dit weg.
        const me = await getCurrentUser({ signal: controller.signal });
        setCurrentUser(me);
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Failed to fetch user:", err);
          // token ongeldig → opruimen zodat je app in logged-out state zit
          localStorage.removeItem("access_token");
          setCurrentUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    run();

    // cleanup: cancel lopende request bij unmount / hot-reload
    return () => controller.abort();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
