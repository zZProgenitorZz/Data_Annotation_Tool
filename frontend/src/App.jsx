import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login/Login.jsx";
import Overview from "./pages/Datasets/Overview.jsx";
import { AuthProvider } from "./components/AuthContext.jsx";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          <Route path="/" element={<Login />} />
          <Route path="/overview" element={<Overview />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );

}

export default App;
