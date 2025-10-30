
import React, { createContext, useState, useEffect } from "react";
import { getCurrentUser } from "../services/authService";

export const AuthContext = createContext();


export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // fetch /user/me/ bij app start
    const fetchUser = async () => {
        const token = localStorage.getItem("access_token");
        if(!token) {
            setLoading(false)
            return;
        }
        try{
            const res = await getCurrentUser();
            setCurrentUser(res) 
        }catch(error){
            console.error("Failed to fethc user:", error);
            localStorage.removeItem("access_token")
        } finally {
            setLoading(false);
        }
    };
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, loading}}>
      {children}
    </AuthContext.Provider>
  );
};
