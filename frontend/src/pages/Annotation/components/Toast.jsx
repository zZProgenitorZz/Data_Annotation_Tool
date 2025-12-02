import React, { useEffect } from "react";
import approvedIcon from "../../../assets/approved.png";
import errorIcon from "../../../assets/error.png";

const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isError = type == "error";

  return (
    <div
      style={{
        position: "fixed",
        top: "14px",
        right: "14px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "10px",

        backgroundColor: "#FFFFFF",
        padding: "14px 18px",
        borderRadius: "12px",
        boxShadow: "0px 6px 18px rgba(0,0,0,0.25)",
        fontSize: "15px",
        fontWeight: 600,
        color: "#000000",
        opacity: 1,
        animation: "fadeInOut 3s ease forwards",
      }}
    >
      <img
        src={isError ? errorIcon : approvedIcon}
        alt={isError ? "Error" : "Success"}
        style={{
          width: "20px",
          height: "20px",
        }}
      />
      {message}

      {/* Animation keyframes */}
      <style>
        {`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-8px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-8px); }
          }
        `}
      </style>
    </div>
  );
};

export default Toast;
