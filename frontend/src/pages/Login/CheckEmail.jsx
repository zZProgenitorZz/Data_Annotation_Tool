import React, { useState } from 'react';

const CheckEmail = ({ setView }) => {
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!code || !newPassword || !confirmPassword) {
        setError("Please fill in all fields.");
        return;
    }

    if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        return;
    }
    
    setError("");
    setView("passwordChanged");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#44F3C9] to-[#3F7790] px-4">
      <div className="bg-[#FFFFFF] rounded-[12px] shadow-xl p-[20px] w-full max-w-[360px] flex flex-col items-center gap-[16px]">
        
        <div className="w-[64px] h-[64px] bg-gray-300 rounded-full flex items-center justify-center mt-[22px] mb-[2px]">
          <img 
          src="/src/assets/e-mail-logo.png" 
          alt="Email Icon" 
          className="w-[90px] h-[90px] object-contain" />
        </div>

        {/* Title */}
        <p className="text-center text-[#000000] text-[20px] text-[#3D3D3D] font-[700] mt-[12px] m-[0px]">
          Check your e-mail
        </p>

        {/* Subtitle */}
      <div className="text-center text-[#8B8B8B] text-[14px] mb-[24px]">
          We've sent a code to your email address <br />
            Enter it below to reset your password
        </div>

        {/* Inputs */}
        <form 
        onSubmit={handleSubmit}
        className="flex flex-col items-center space-y-[24px]">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter code"
          className="w-[300px] p-[12px] box-border rounded-[8px] border border-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#5A7F9D] text-[#333333] text-[16px] -mt-[16px]"
          style={{ backgroundColor: '#EAEAEA'}}
          required
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          className="w-[300px] p-[12px] box-border rounded-[8px] border border-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#5A7F9D] text-[#333333] text-[16px] -mt-[16px]"
          style={{ backgroundColor: '#EAEAEA'}}
          required
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          className="w-[300px] p-[12px] box-border rounded-[8px] border border-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#5A7F9D] text-[#333333] text-[16px] -mt-[16px]"
          style={{ backgroundColor: '#EAEAEA'}}
          required
        />

        <p
            className="text-[14px] text-[#FF4D4D] h-[2px] text-center mt-[-20px] mb-[18px]"
            >
                {error || ''}
            </p>

        {/* Reset Password Button */}
        <button
          type="submit"
          className="w-[300px] py-[12px] box-border rounded-[8px] bg-[#41768F] text-[#FFFFFF] font-semibold text-[16px] transition focus:outline-none focus:ring-0 border-0 hover:brightness-95 active:brightness-80"
          style={{ boxShadow: '0px 4px 18px rgba(0,0,0,0.1)' }}
        >
          Reset Password
        </button>
        </form>

        {/* Back to Login */}
        <button
          onClick={() => setView('login')}
          className="mt-[8px] text-[14px] text-[#888888] hover:underline focus:outline-none border-0 bg-transparent cursor-pointer"
        >
          &larr; Back to Login
        </button>
      </div>
    </div>
  );
};

export default CheckEmail;
