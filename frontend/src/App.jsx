import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login/Login.jsx";
import Overview from "./pages/Datasets/Overview.jsx";
import AnnotationPage from "./pages/Annotation/AnnotationPage.jsx";
import { AuthProvider } from "./components/AuthContext.jsx";
import ImageList from "./pages/Datasets/ImageList.jsx"
import ImageGrid from "./components/ImageGrid.jsx"
import RequireAuth from "./utils/requireAuth.jsx";
import PublicOnlyRoute from "./utils/PublicOnlyRoute.jsx";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          <Route path="/" element={<PublicOnlyRoute><Login /> </PublicOnlyRoute>} />
          <Route path="/overview" element={<RequireAuth> <Overview /> </RequireAuth>} />
          <Route path="/imageList" element={<RequireAuth><ImageList/></RequireAuth>}/>
          <Route path="/imageGrid" element={<ImageGrid/>}/>
          <Route path="/annotation" element={<AnnotationPage/>}/>


        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );

}

export default App;
