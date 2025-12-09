import AdminSidebar from "./components/AdminSidebar";
import aidxlogo from "../../assets/aidxlogo.png";
import { useContext } from "react";
import { AuthContext } from "../../components/AuthContext.jsx";
import Header from "../../components/Header.jsx";

export default function AdminLayout({ children }) {
  const {currentUser} = useContext(AuthContext)
  
  return (
    <div className="h-screen flex flex-col bg-[#F5F5F5] overflow-hidden">

      {/* Top Header */}
      <div className="bg-[#44F3C9]">
        <Header title="Admin Panel" currentUser={currentUser} />
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden ">

        {/* Sidebar */}
        <AdminSidebar />

        {/* Content scroll area */}
        <div
          id="admin-scroll-area"
          className="flex-1 p-[30px] overflow-y-auto select-none"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
