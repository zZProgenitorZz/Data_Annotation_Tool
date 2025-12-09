import { NavLink } from "react-router-dom";
import dashboardIcon from "../../../assets/admin/dashboard.png";
import datasetIcon from "../../../assets/admin/datasets.png";
import usersIcon from "../../../assets/admin/users.png";
import settingsIcon from "../../../assets/admin/settings.png";
import lineSeparator from "../../../assets/admin/line-separator.png";

export default function AdminSidebar() {
  return (

    <div className="h-[calc(100vh-70px)] w-[180px] flex flex-col select-none bg-[#559ECB]">

      {/* Dashboard */}
      <NavLink
        to="/admin"
        end
        style={{ textDecoration: "none", color: "white" }}
        className={({ isActive }) =>
          `
            flex items-center gap-[10px]
            h-[60px] px-[12px]
            ${isActive ? "bg-[#0073BA]" : "hover:bg-[#1485D1]"}
            transition-all duration-150
            -mt-[2px]
          `
        }
      >
        <img src={dashboardIcon} className="w-[20px] h-[20px] ml-[2px]" />
        <span className="text-[16px] font-[600] ml-[2px]">Dashboard</span>
      </NavLink>

      <img src={lineSeparator} className="w-full -mt-[1px]" />

      {/* Dataset Management */}
      <NavLink
        to="/admin/datasets"
        style={{ textDecoration: "none", color: "white" }}
        className={({ isActive }) =>
          `
            flex items-center gap-[10px]
            h-[60px] px-[12px]
            ${isActive ? "bg-[#0073BA]" : "hover:bg-[#1485D1]"}
            transition-all duration-150
            -mt-[2px]
          `
        }
      >
        <img src={datasetIcon} className="w-[26px] h-[26px]" />
        <span className="text-[16px] font-[600] leading-tight">
          Dataset <br /> Management
        </span>
      </NavLink>

      <img src={lineSeparator} className="w-full -mt-[1px]" />

      {/* User Management */}
      <NavLink
        to="/admin/users"
        style={{ textDecoration: "none", color: "white" }}
        className={({ isActive }) =>
          `
            flex items-center gap-[10px]
            h-[60px] px-[12px]
            ${isActive ? "bg-[#0073BA]" : "hover:bg-[#1485D1]"}
            transition-all duration-150
            -mt-[2px]
          `
        }
      >
        <img src={usersIcon} className="w-[26px] h-[26px]" />
        <span className="text-[16px] font-[600] leading-tight">
          User <br /> Management
        </span>
      </NavLink>

      <div className="flex-1" />

      {/* Separator above Settings */}
      <img src={lineSeparator} className="w-full -mt-[1px]" />

      {/* Settings */}
      <NavLink
        to="/admin/settings"
        style={{ textDecoration: "none", color: "white" }}
        className={({ isActive }) =>
          `
            flex items-center gap-[10px]
            h-[60px] px-[12px]
            ${isActive ? "bg-[#0073BA]" : "hover:bg-[#1485D1]"}
            transition-all duration-150
            -mt-[2px]
          `
        }
      >
        <img src={settingsIcon} className="w-[26px] h-[26px] mt-[5px]" />
        <span className="text-[18px] font-[700]">Settings</span>
      </NavLink>
    </div>
  );
}
