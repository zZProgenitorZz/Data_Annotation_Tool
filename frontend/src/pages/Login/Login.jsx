import React, { useState } from "react";
import ForgotPassword from "./ForgotPassword";
import CheckEmail from "./CheckEmail";
import PasswordChanged from "./PasswordChanged";
import { useNavigate } from "react-router-dom";
import { login, getCurrentUser, guestLogin, getGuestInfo} from "../../services/authService";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [view, setView] = useState("login");
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  // 2. Handler functions (from the AI-generated code)
  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    setErrorMessage("")

    // Login via FastAPI
    await login(username, password);

    // Get logged-in user info
    const userData = await getCurrentUser();
    setUser(userData);

    console.log(user)
    // Example: Navigate to overview page after login
    navigate("/overview");

  } catch (error) {
    console.error("Login failed:", error);
    setErrorMessage("Incorrect username or password");
  } 
};


  

  const handleForgotPassword = () => {
    setView("forgotPassword");
  }

  const handleContinueAsGuest = async (e) => {
    e.preventDefault();
    try{
      await guestLogin();

      const user = await getGuestInfo();
      setUser(user)

      console.log(user)

      navigate("/overview");

    } catch (error) {
      console.error("Guest login failed:", error)
    }
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#44F3C9] to-[#3F7790] px-4">
      
      <div className="w-[85vw] max-w-[400px] scale-[1.25] sm:scale-[1.1] md:scale-[1] transition-transform duration-300">

        <div className="flex flex-col items-center mt-[-20px]"> 
          
          <img 
            src="/src/assets/aidxlogo.png" 
            alt="AiDx Medical Logo" 
            className="w-full max-w-[250px] h-auto mb-8" 
          />

          <p className="text-black text-center mb-[35px] text-[15px] md:text-xl font-medium italic">
            Microscopy Annotation Tool
          </p>
        </div>

        <div className="mt-[25px] w-full flex flex-col items-center">
        <form 
          onSubmit={handleSubmit}
          className="w-full max-w-[300px] flex flex-col items-center mt-0"
        >
          
          <input
            type="text"
            value={username}
            onChange={(e) => {setUsername(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            placeholder="Username"
            className="w-full h-[35px] p-4 text-xl bg-[#E5F9F7] rounded-[4px] shadow-inner border border-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#5A7F9D] placeholder:text-[#888888] placeholder:text-2xl"
            style={{ textIndent: '5px'}}
            required
          />
          <br/>
          <input
            type="password"
            value={password}
            onChange={(e) => {setPassword(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            placeholder="Password"
            className="w-full h-[35px] p-4 mt-6 mb-6 text-xl bg-[#E5F9F7] rounded-[4px] shadow-inner border border-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#5A7F9D] placeholder:text-[#888888] placeholder:text-2xl"
            style={{ textIndent: '5px'}}
            required
          />
          
          <div className="h-[25px]  flex items-center justify-start">
            {errorMessage && (
              <p className="text-[#FF2C2C] text-[13px] leading-none" style={{ color: '#f93030ff', fontWeight: 500 ,  textShadow: '1px 1px 2px rgba(0,0,0,0.2)'}}>
                {errorMessage}
              </p>
            )}
          </div>




          <button
            type="submit"
            className="w-full h-[40px] p-4 text-2xl font-[700] text-[#FFFFFF] rounded-[4px] shadow-sm transition duration-200 focus:outline-none focus:ring-0 border-0 hover:brightness-95 active:brightness-80"
            style={{
              backgroundColor: '#41768F',
              boxShadow: '0px 3px 3px rgba(0, 0, 0, 0.25)',
              textShadow: '0px 1px 0px rgba(0, 0, 0, 0.25)', 
            }}
          >
            Login
          </button>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-lg italic font-semibold text-[#FFFFFF] hover:text-[#D1D5DB] self-end mt-[10px] mb-16 bg-transparent border-none p-0 cursor-pointer"
            style={{
              textShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)', 
            }}
          >
            Forgot Password
          </button>
        </form>

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

    </div>
  );
}

export default Login;

