import { NavLink, useNavigate } from "react-router-dom";
import feedbackIcon from "/src/assets/feedback/feedback-icon.png";
import clockIcon from "/src/assets/feedback/clock.png";
import backIcon from "/src/assets/feedback/back-button-icon.png";
import lineSeparator from "/src/assets/admin/line-separator.png";

export default function FeedbackSidebar() {
  const nav = useNavigate();

  const textColor = "#FFFFFF";

  return (
    <div className="h-[calc(100vh-70px)] w-[180px] flex flex-col select-none bg-[#559ECB]">

      {/* FEEDBACK */}
      <NavLink
        to="/feedback"
        end
        style={{ textDecoration: "none", color: textColor }}
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
        <img src={feedbackIcon} className="w-[30px] h-[30px] ml-[2px] mt-[4px]" />
        <span className="text-[16px] font-[600]">Feedback</span>
      </NavLink>

      <img src={lineSeparator} className="w-full -mt-[1px]" />

      {/* DELETION APPROVALS */}
      <NavLink
        to="/feedback/approvals"
        style={{ textDecoration: "none", color: textColor }}
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
        <img src={clockIcon} className="w-[30px] h-[30px]" />
        <span className="text-[16px] font-[600]">Deletion Approvals</span>
      </NavLink>

      <div className="flex-1" />

      <img src={lineSeparator} className="w-full -mt-[1px]" />

      {/* BACK TO DATASETS */}
<button
  onClick={() => nav("/overview")}
  className="
    flex items-center gap-[10px]
    h-[60px] px-[12px]
    cursor-pointer
    transition-all duration-150
    -mt-[2px]
    bg-[#559ECB]
    hover:bg-[#1485D1]
  "
  style={{
    color: "#FFFFFF", 
    border: "none",
    outline: "none",
  }}
>
  <img src={backIcon} className="w-[20px] h-[20px] ml-[2px]" />
  <span className="text-[16px] font-[600]">Datasets</span>
</button>


    </div>
  );
}
