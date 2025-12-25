import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./mobile-responsive.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext"; // Import AuthProvider

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider> {/* Wrap App inside AuthProvider */}
      <App />
    </AuthProvider>
  </StrictMode>
);
