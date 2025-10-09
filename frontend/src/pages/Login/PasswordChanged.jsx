import React from "react";

const PasswordChanged = ({ setView }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#44F3C9] to-[#3F7790] px-4">
      <div className="bg-[#FFFFFF] rounded-[12px] shadow-xl p-[20px] w-full max-w-[360px] flex flex-col items-center gap-[16px]">
        <div className="w-[64px] h-[64px] bg-gray-300 rounded-full flex items-center justify-center mt-[40px] mb-[-5px]">
          <img 
          src="/src/assets/approved.png" 
          alt="Password Changed Approved ICon" 
          className="w-[90px] h-[90px] object-contain" />
        </div>

        <h2 className="text-[26px] mb-[-16px] text-center text-[#3D3D3D3]">
          Password Reset
        </h2>
        <p className="text-center text-[#6B7280] mb-[20px]">
          Your password has been successfully reset. <br />
          Click below to log in.
        </p>
        <button
          onClick={() => setView("login")}
          className="w-[300px] py-[12px] mb-[30px] box-border rounded-[8px] bg-[#41768F] text-[#FFFFFF] font-semibold text-[16px] transition focus:outline-none focus:ring-0 border-0 hover:brightness-95 active:brightness-80"
          style={{ boxShadow: '0px 4px 18px rgba(0,0,0,0.1)' }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default PasswordChanged;
