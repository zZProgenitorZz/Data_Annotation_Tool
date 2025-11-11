import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login/Login.jsx";
import Overview from "./pages/Datasets/Overview.jsx";
import AnnotationPage from "./pages/Annotation/AnnotationPage.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/annotation/:datasetName" element={<AnnotationPage />} />
      </Routes>
    </BrowserRouter>
  );

}

export default App;
