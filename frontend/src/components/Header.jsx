import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function Header({ title, currentUser, onLogoClick, onLogoutClick }) {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const handleLogo = onLogoClick ?? (() => navigate("/overview"));

  // standaard logout, maar je kunt extra logica meegeven via onLogoutClick
  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();        // bijv. iets loggen, popup sluiten, etc.
    } else {
        logout();
        navigate("/", { replace: true });
    }
  };

  function handleAdminPanel() {
  navigate("/admin"); // of welke route jij gebruikt
}

  return (
      <div
    className="relative flex items-end justify-center flex-shrink-0"
    style={{ height: "70px", backgroundColor: "rgba(255,255,255,0.31)" }}
  >
    {/* Logo left */}
    <img
      src="src/assets/aidxlogo.png"
      alt="AiDx Medical Logo"
      className="absolute left-[0px] top-[2px] bottom-[0px] pl-[3px] h-[40px] cursor-pointer 
        transition-transform duration-200 hover:scale-105"
      onClick={handleLogo}
    />

    {/* Title middle */}
    <h1
      className="text-[#000000] text-[30px] font-[600] italic mb-[-2px]"
      style={{ textShadow: "0px 1px 0px rgba(0,0,0,0.15)" }}
    >
      {title}
    </h1>

    {/* Rechts: username + Admin Panel + Logout */}
    <div className="absolute right-[10px] top-[5px] flex flex-col items-end">
      {currentUser && (
        <span className="text-sm text-gray-500">
          {currentUser.username}
        </span>
      )}

      <div className="flex items-center mt-[20px]">
        {/* Admin Panel link - een beetje links van Logout */}
        {currentUser.role === "admin" && (
          <span
            className="text-[18px] font-[450] text-[#000000] mr-[16px] cursor-pointer hover:opacity-80 transition"
            onClick={handleAdminPanel} // deze functie maak je zelf, bv. navigate("/admin")
          >
            Admin Panel
          </span>
        )}

        {/* Logout knop */}
        <div
          className="flex items-center cursor-pointer hover:opacity-80 transition"
          onClick={handleLogout}
        >
          <img
            src="src/assets/logout.png"
            alt="Log out"
            className="w-[22px] h-[22px] mb-[2px] mr-[5px]"
          />
          <span className="text-[18px] font-[450] text-[#000000] mr-[9px]">
            Log out
          </span>
        </div>
      </div>
    </div>
  </div>

  );
}
