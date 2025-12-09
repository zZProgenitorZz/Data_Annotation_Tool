import { useState } from "react";

export default function Settings() {
  const [email, setEmail] = useState("adminaidx@gmail.com");

  const [isEditing, setIsEditing] = useState(false);
  const [stepPassword, setStepPassword] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function validateEmail(e) {
    return /\S+@\S+\.\S+/.test(e);
  }

  function handleStartEditing() {
    setIsEditing(true);
    setStepPassword(false);
    setNewEmail("");
    setPassword("");
    setErrorMsg("");
    setSuccessMsg("");
  }

  function handleConfirmEmail() {
    const trimmed = newEmail.trim();

    if (!trimmed || !validateEmail(trimmed)) {
      setErrorMsg("Please enter a valid email.");
      return;
    }

    // valid
    setErrorMsg("");
    setStepPassword(true);
  }

  function handleFinalSubmit() {
    if (!password.trim()) {
      setErrorMsg("Password is required.");
      return;
    }

    // success
    setEmail(newEmail.trim());
    setIsEditing(false);
    setStepPassword(false);
    setNewEmail("");
    setPassword("");
    setErrorMsg("");

    setSuccessMsg("Your email has been successfully updated.");

    setTimeout(() => setSuccessMsg(""), 3000);
  }

  function cancelEditing() {
    setIsEditing(false);
    setStepPassword(false);
    setNewEmail("");
    setPassword("");
    setErrorMsg("");
    setSuccessMsg("");
  }

  const btnBase = {
    padding: "10px 34px",
    borderRadius: "10px",
    fontSize: "17px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "0.15s ease",
    outline: "none",
    border: "1px solid #91d0c9ff",
  };

  const btnConfirm = {
    ...btnBase,
    backgroundColor: "#B3DCD7",
  };

  const btnCancel = {
    ...btnBase,
    backgroundColor: "#E5E7EB",
    border: "1px solid #C9CED8",
  };

  return (
    <div className="w-full h-full select-none">
      <h1
        className="italic mb-[30px]"
        style={{ fontSize: "32px", fontWeight: 600 }}
      >
        Profile
      </h1>

      <div className="flex flex-col gap-[22px]" style={{ maxWidth: "600px" }}>

        <div className="flex items-center gap-[20px]">
          <label style={{ width: "120px", fontSize: "18px" }}>E-mail</label>

          <input
            value={email}
            disabled
            style={{
              width: "260px",
              height: "32px",
              backgroundColor: "#E5E7EB",
              border: "1px solid #C9CED8",
              borderRadius: "6px",
              paddingLeft: "10px",
            }}
          />

          {!isEditing && (
            <button
              onClick={handleStartEditing}
              style={{
                background: "none",
                border: "none",
                fontSize: "14px",
                color: "#007BFF",
                cursor: "pointer",
              }}
              className="hover:underline"
            >
              Change email
            </button>
          )}
        </div>

        {/* Success toast */}
        {successMsg && (
          <div style={{ marginLeft: "140px" }}>
            <div
              style={{
                width: "243.5px",
                padding: "10px 14px",
                backgroundColor: "#D1F2CE",
                border: "1px solid #A3D9A5",
                color: "#27632A",
                borderRadius: "8px",
                fontSize: "15px",
              }}
            >
              {successMsg}
            </div>
          </div>
        )}

        {/* Editing mode */}
        {isEditing && (
          <>
            <div className="flex items-center gap-[20px]">
              <label style={{ width: "120px", fontSize: "18px" }}>
                New E-mail
              </label>

              <input
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setErrorMsg("");
                }}
                style={{
                  width: "260px",
                  height: "32px",
                  border: "1px solid #C9CED8",
                  borderRadius: "6px",
                  paddingLeft: "10px",
                }}
              />
            </div>

            {errorMsg && !stepPassword && (
              <div style={{ marginLeft: "140px" }}>
                <div
                  style={{
                    width: "243.5px",
                    padding: "10px 14px",
                    backgroundColor: "#F8D7DA",
                    border: "1px solid #F5C2C7",
                    color: "#A94442",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                >
                  {errorMsg}
                </div>
              </div>
            )}

            {stepPassword && (
              <>
                <div
                  style={{
                    marginLeft: "140px",
                    marginTop: "6px",
                    width: "360px",
                    fontSize: "14px",
                    color: "#444",
                  }}
                >
                  For security reasons please confirm your current password.
                </div>

                <div className="flex items-center gap-[20px]">
                  <label style={{ width: "120px", fontSize: "18px" }}>
                    Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg("");
                    }}
                    style={{
                      width: "260px",
                      height: "32px",
                      border: "1px solid #C9CED8",
                      borderRadius: "6px",
                      paddingLeft: "10px",
                    }}
                  />
                </div>

                {errorMsg && stepPassword && (
                  <div style={{ marginLeft: "140px" }}>
                    <div
                      style={{
                        width: "260px",
                        padding: "10px 14px",
                        backgroundColor: "#F8D7DA",
                        border: "1px solid #F5C2C7",
                        color: "#A94442",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    >
                      {errorMsg}
                    </div>
                  </div>
                )}
              </>
            )}

            <div
              style={{
                marginLeft: "140px",
                display: "flex",
                gap: "14px",
                marginTop: "10px",
              }}
            >
              <button
                onClick={cancelEditing}
                style={btnCancel}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = "#D6D7DA")
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = "#E5E7EB")
                }
              >
                Cancel
              </button>

              <button
                onClick={stepPassword ? handleFinalSubmit : handleConfirmEmail}
                style={btnConfirm}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = "#9CCBC4")
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = "#B3DCD7")
                }
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
