import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { completeInvite } from "../../services/authService";

const CreatePassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Lees token 1x "stabiel" uit de URL
  const tokenFromUrl = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sync token als URL verandert (bijv. paste van nieuwe link)
  useEffect(() => {
    setToken(tokenFromUrl);
    setError(""); // reset error als token verandert
    setSuccess(false);
  }, [tokenFromUrl]);

  // Als token ontbreekt: toon direct error (zonder submit)
  useEffect(() => {
    if (!tokenFromUrl) {
      setError("Invalid or missing invitation link.");
    }
  }, [tokenFromUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // token check
    if (!token) {
      setError("Invalid or missing invitation link.");
      return;
    }

    // password checks
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await completeInvite({
        token,
        password: newPassword,
      });

      setSuccess(true);

      // kleine delay zodat user feedback ziet
      setTimeout(() => navigate("/"), 600);
    } catch (err) {
      console.error(err);

      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err.message ||
        "Failed to set password.";

      setError(msg);
      setSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#44F3C9] to-[#3F7790] px-4">
      <div className="bg-[#FFFFFF] rounded-[12px] shadow-xl p-[20px] w-full max-w-[360px] flex flex-col items-center gap-[16px]">
        <div className="w-[64px] h-[64px] bg-gray-300 rounded-full flex items-center justify-center mt-[22px] mb-[2px]">
          <img
            src="/src/assets/e-mail-logo.png"
            alt="Email Icon"
            className="w-[90px] h-[90px] object-contain"
          />
        </div>

        <p className="text-center text-[#3D3D3D] text-[20px] font-[700] mt-[12px] m-[0px]">
          Create your password
        </p>

        <div className="text-center text-[#8B8B8B] text-[14px] mb-[24px]">
          Choose a new password for your account.
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-[24px]">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-[300px] p-[12px] box-border rounded-[8px] border border-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#5A7F9D] text-[#333333] text-[16px] -mt-[16px]"
            style={{ backgroundColor: "#EAEAEA" }}
            required
            disabled={!tokenFromUrl || submitting || success}
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="w-[300px] p-[12px] box-border rounded-[8px] border border-[#CCCCCC] focus:outline-none focus:ring-2 focus:ring-[#5A7F9D] text-[#333333] text-[16px] -mt-[16px]"
            style={{ backgroundColor: "#EAEAEA" }}
            required
            disabled={!tokenFromUrl || submitting || success}
          />

          <p className="text-[14px] h-[2px] text-center mt-[-20px] mb-[18px]"
             style={{ color: success ? "#2E9B63" : "#FF4D4D" }}>
            {success ? "Password saved. Redirecting..." : (error || "")}
          </p>

          <button
            type="submit"
            disabled={submitting || success || !tokenFromUrl}
            className="w-[300px] py-[12px] box-border rounded-[8px] bg-[#41768F] text-[#FFFFFF] font-semibold text-[16px] transition focus:outline-none focus:ring-0 border-0 hover:brightness-95 active:brightness-80 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ boxShadow: "0px 4px 18px rgba(0,0,0,0.1)" }}
          >
            {submitting ? "Saving..." : "Create Password"}
          </button>
        </form>

        <button
          onClick={handleBackToLogin}
          className="mt-[8px] text-[14px] text-[#888888] hover:underline focus:outline-none border-0 bg-transparent cursor-pointer"
        >
          &larr; Back to Login
        </button>
      </div>
    </div>
  );
};

export default CreatePassword;
