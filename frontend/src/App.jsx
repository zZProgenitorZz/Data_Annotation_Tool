import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login/Login.jsx";
import Overview from "./pages/Datasets/Overview.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/overview" element={<Overview />} />

      </Routes>
    </BrowserRouter>
  );

}

export default App;
