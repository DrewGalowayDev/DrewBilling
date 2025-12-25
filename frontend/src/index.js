import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // Ensure Tailwind is imported
import UserPortal from "./pages/UserPortal";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <UserPortal />
  </React.StrictMode>
);
