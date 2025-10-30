import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login/Login.jsx";
import Overview from "./pages/Datasets/Overview.jsx";
import { AuthProvider } from "./components/AuthContext.jsx";
import ImagesList from "./pages/Datasets/ImagesList.jsx"
import ImageGrid from "./components/ImageGrid.jsx"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          <Route path="/" element={<Login />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/images" element={<ImagesList/>}/>
          <Route path="/imageGrid" element={<ImageGrid/>}/>


        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );

}

export default App;
