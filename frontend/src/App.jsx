import React, { useContext } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login/Login.jsx";
import Overview from "./pages/Datasets/Overview.jsx";
import AnnotationPage from "./pages/Annotation/AnnotationPage.jsx";
import { AuthProvider } from "./components/AuthContext.jsx";
import ImageList from "./pages/Datasets/ImageList.jsx"
import RequireAuth from "./utils/requireAuth.jsx";
import PublicOnlyRoute from "./utils/PublicOnlyRoute.jsx";
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx";
import AdminLayout from "./pages/Admin/AdminLayout.jsx";
import AdminSettings from "./pages/Admin/AdminSettings.jsx";
import DatasetManagement from "./pages/Admin/DatasetManagement.jsx";
import UserManagement from "./pages/Admin/UserManagement.jsx";
import CreatePassword from "./pages/Login/CreatePassword.jsx";
import CheckEmail from "./pages/Login/CheckEmail.jsx";
import PasswordChanged from "./pages/Login/PasswordChanged.jsx";

function App() {
 
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          <Route path="/" element={<PublicOnlyRoute><Login /> </PublicOnlyRoute>} />
          <Route path="/overview" element={<RequireAuth> <Overview /> </RequireAuth>} />
          <Route path="/imageList" element={<RequireAuth><ImageList/></RequireAuth>}/>
          <Route path="/annotation" element={<RequireAuth><AnnotationPage/></RequireAuth>}/>

          <Route path="/set-password" element={<PublicOnlyRoute><CreatePassword/></PublicOnlyRoute>}/>
          <Route path="/reset-password" element={<PublicOnlyRoute><CheckEmail/></PublicOnlyRoute>}/>
          <Route path="/password-changed" element={<PublicOnlyRoute><PasswordChanged/></PublicOnlyRoute>}/>

          <Route path="/admin" element={<RequireAuth><AdminLayout><AdminDashboard /></AdminLayout></RequireAuth>}/>
          <Route path="/admin/datasets"element={<RequireAuth><AdminLayout><DatasetManagement /></AdminLayout></RequireAuth> }/>
          <Route path="/admin/users" element={<RequireAuth><AdminLayout><UserManagement /></AdminLayout></RequireAuth>}/>
          <Route path="/admin/settings"element={<RequireAuth><AdminLayout><AdminSettings /></AdminLayout></RequireAuth>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );

}

export default App;
