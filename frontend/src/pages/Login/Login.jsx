import React, { use, useState } from "react";
import ForgotPassword from "./ForgotPassword";
import CheckEmail from "./CheckEmail";
import PasswordChanged from "./PasswordChanged";
import Overview from "../Datasets/Overview";
import { useNavigate } from "react-router-dom";

function Login() {
  // 1. State for form inputs (from the AI-generated code)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [view, setView] = useState("login");

  // 2. Handler functions (from the AI-generated code)
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login attempt:", { username, password });
  };
  

  const handleForgotPassword = () => {
    setView("forgotPassword");
  }

  const navigate = useNavigate();
  const handleContinueAsGuest = (e) => {
    e.preventDefault();
     navigate("/overview");
  };

  if (view === "forgotPassword") {
    return <ForgotPassword setView={setView}/>;
  }

  if (view === "checkEmail") {
    return <CheckEmail setView={setView} />;
  }

  if (view === "passwordChanged") {
    return <PasswordChanged setView={setView} />;
  }

  // 3. Responsive Tailwind Structure (from our best previous iteration)
  // NOTE: We use specific colors and component sizes/spacing to visually match the Figma.
  return (
    // Main container: min-h-screen, gradient, centered content (justify-center)
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#44F3C9] to-[#3F7790] px-4">
      
      {/* Content Wrapper: Negative top margin (mt-[-8%]) for "centered and slightly up" effect */}
      <div className="flex flex-col items-center mt-[-20px]"> 
        
        {/* Logo Image (AiDx MEDICAL) - Responsive width with max constraint */}
        <img 
          src="/src/assets/aidxlogo.png" 
          alt="AiDx Medical Logo" 
          // Adjusted to be a large, responsive image that scales down
          className="w-full max-w-[250px] h-auto mb-8" 
        />

        {/* Microscopy Annotation Tool Subtitle */}
        <p className="text-black text-center mb-[35px] text-[15px] md:text-xl font-medium italic">
          Microscopy Annotation Tool
        </p>
      </div>

      {/* Login Form Container - Fixed compact width (max-w-[300px]) for inputs, and form submission */}
      <div className="mt-[25px] w-full flex flex-col items-center">
      <form 
        onSubmit={handleSubmit}
        className="w-full max-w-[300px] flex flex-col items-center mt-0"
      >
        
        {/* Username Input - Styles matching Figma inputs (large, light background, rounded) */}
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          // bg-[#E5F9F7] is the Figma background color for inputs
          className="w-full h-[35px] p-4 text-xl bg-[#E5F9F7] rounded-[4px] shadow-inner border border-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#5A7F9D] placeholder:text-[#888888] placeholder:text-2xl"
          style={{ textIndent: '5px'}}
          required
        />
        <br/>
        {/* Password Input */}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          // Increased margin to match Figma spacing between inputs
          className="w-full h-[35px] p-4 mt-6 mb-6 text-xl bg-[#E5F9F7] rounded-[4px] shadow-inner border border-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#5A7F9D] placeholder:text-[#888888] placeholder:text-2xl"
          style={{ textIndent: '5px'}}
          required
        />
        <br/>

        {/* Login Button - Styles matching Figma button (Color: #41768F, rounded, shadow) */}
        <button
          type="submit"
          className="w-full h-[40px] p-4 text-2xl font-[700] text-[#FFFFFF] rounded-[4px] shadow-sm transition duration-200 focus:outline-none focus:ring-0 border-0 hover:brightness-95 active:brightness-80"
          style={{
            backgroundColor: '#41768F', // Figma color
            boxShadow: '0px 3px 3px rgba(0, 0, 0, 0.25)',
            textShadow: '0px 1px 0px rgba(0, 0, 0, 0.25)', // Figma shadow
          }}
        >
          Login
        </button>

        {/* Forgot Password Link/Button - Styles matching Figma (Color: White, italics, text shadow) */}
        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-lg italic font-semibold text-[#FFFFFF] hover:text-[#D1D5DB] self-end mt-[10px] mb-16 bg-transparent border-none p-0 cursor-pointer"
          style={{
            textShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)', // Figma shadow
          }}
        >
          Forgot Password
        </button>
      </form>

      {/* Continue as Guest Link/Button - Styles matching Figma (Color: White, font size, text shadow) */}
      <button
        type="button"
        onClick={handleContinueAsGuest}
        className="text-xl font-semibold text-[#FFFFFF] hover:text-[#D1D5DB] flex items-center mt-[38px] bg-transparent border-none p-0 cursor-pointer"
        style={{
          textShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)', // Figma shadow
        }}
      >
        Continue as guest →
      </button>
    </div>
    </div>
  );
}

export default Login;

