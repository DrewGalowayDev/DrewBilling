import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import UserPortal from "./pages/UserPortal";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* User Portal */}
        <Route path="/" element={<UserPortal />} />
        
        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
