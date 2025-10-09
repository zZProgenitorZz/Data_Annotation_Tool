import { useState } from "react";

export default function ForgotPassword({ setView }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleResetPassword = (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    // No backend yet, just go to next screen
    setView("checkEmail"); // Move to "Check Your Email" screen
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#44F3C9] to-[#3F7790] px-[16px]">
      {/* Rectangle card */}
      <div className="bg-[#FFFFFF] rounded-[12px] shadow-xl p-[20px] w-full max-w-[360px] flex flex-col items-center gap-[16px]">
        
        {/* Placeholder icon */}
        <div className="w-[64px] h-[64px] bg-gray-300 rounded-full flex items-center justify-center text-[14px] font-semibold mt-[32px] mb-[24px]">
          <img 
          src="/src/assets/reset-password.png" 
          alt="Reset Password Login Icon" 
          className="w-[110px] h-[110px] object-contain"
        />
        </div>

        <p className="text-center text-[#000000] text-[15px] mt-[12px] m-[0px]">
            Trouble Signing In?
        </p>

        {/* Description text */}
        <p className="text-center text-[#41768F] text-[15px] mt-[0px]">
          Enter your e-mail to reset your password.
        </p>

        {/* Email input */}
        <form onSubmit={handleResetPassword} className="flex flex-col items-center w-full gap-[16px]">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-[300px] p-[12px] box-border rounded-[8px] border border-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#44F3C9] text-[#333333] text-[16px] -mt-[16px]"
          style={{
            backgroundColor: '#EAEAEA',
            boxShadow: '0px 4px 18px rgba(0, 0, 0, 0.1)',
          }}
          required
        />

        {/* Reset Password button */}
        <button
          type="submit"
          onClick={handleResetPassword}
          className="w-[300px] py-[12px] box-border rounded-[8px] bg-[#41768F] text-[#FFFFFF] font-semibold text-[16px] transition transition duration-200 focus:outline-none focus:ring-0 border-0 hover:brightness-95 active:brightness-80"
            style={{
            boxShadow: '0px 4px 18px rgba(0, 0, 0, 0.1)',
          }}
        >
          Reset Password
        </button>
        </form>

        {/* Error message */}
        {/* Error message */}
        <p
          className="text-[14px] text-[#FF4D4D] h-[0px] text-center mt-[-8px]"
          style={{ minHeight: '0px' }}
        >
          {error || ''}
        </p>


        {/* Back to login */}
        <button
          type="button"
          onClick={() => setView("login")}
          className="mt-[8px] text-[14px] text-[#888888] hover:underline focus:outline-none border-0 bg-transparent cursor-pointer"
        >
          &larr; Back to Login
        </button>
      </div>
    </div>
  );
}
