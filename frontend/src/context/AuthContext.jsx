// frontend/src/context/AuthContext.js
import { createContext, useState, useContext, useEffect } from "react";

const AuthContext = createContext();

// Validate token format
const isValidToken = (token) => {
  if (!token || token === 'null' || token === 'undefined') return false;
  // Basic JWT format check (header.payload.signature)
  const parts = token.split('.');
  return parts.length === 3;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check and validate token on mount
    const token = localStorage.getItem("adminToken");
    
    if (token && isValidToken(token)) {
      setIsAuthenticated(true);
    } else {
      // Clear invalid token
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      localStorage.removeItem("token"); // Clear old token key if exists
      setIsAuthenticated(false);
    }
  }, []);

  const login = (token) => {
    if (isValidToken(token)) {
      localStorage.setItem("adminToken", token);
      setIsAuthenticated(true);
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
