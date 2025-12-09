import { useState, useEffect } from "react";
import addUserIcon from "../../assets/admin/add-user.png";

export default function UserManagement() {
  const [users, setUsers] = useState([
    {
      id: 1,
      username: "anthony",
      email: "anthony@gmail.com",
      credentialsSent: true,
    },
    {
      id: 2,
      username: "john",
      email: "john@gmail.com",
      credentialsSent: true,
    },
  ]);

  const [editingUserId, setEditingUserId] = useState(null);
  const [tempUsername, setTempUsername] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // For add user modal
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // For delete modal
  const [userToDelete, setUserToDelete] = useState(null);

  // Disable scroll when modals open
  useEffect(() => {
    const scrollArea = document.getElementById("admin-scroll-area");
    const modalOpen = showAddModal || showDeleteModal;
    if (scrollArea) scrollArea.style.overflow = modalOpen ? "hidden" : "auto";
    return () => {
      if (scrollArea) scrollArea.style.overflow = "auto";
    };
  }, [showAddModal, showDeleteModal]);

  // Edit user
  function handleEditUser(user) {
    setEditingUserId(user.id);
    setTempUsername(user.username);
  }

  function handleCancelEdit() {
    setEditingUserId(null);
    setTempUsername("");
  }

  function handleSave(id) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, username: tempUsername.trim() } : u
      )
    );
    setEditingUserId(null);
  }

  // Delete modal open
  function handleDeleteUser(user) {
    setUserToDelete(user);
    setShowDeleteModal(true);
  }

  // Confirm delete
  function confirmDeleteUser() {
    if (!userToDelete) return;
    setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
    setShowDeleteModal(false);
    setUserToDelete(null);
  }

  function handleSendCredentials(id) {
    console.log("Send credentials:", id);
  }

  // Add User
  function openAddModal() {
    setShowAddModal(true);
    setNewUsername("");
    setNewEmail("");
  }

  function closeAddModal() {
    setShowAddModal(false);
  }

  function handleAddUser() {
    if (!newUsername.trim() || !newEmail.trim()) return;

    const newUser = {
      id: Date.now(),
      username: newUsername.trim(),
      email: newEmail.trim(),
      credentialsSent: false,
    };

    setUsers((prev) => [...prev, newUser]);
    setShowAddModal(false);
  }

  const isAddDisabled =
    newUsername.trim().length === 0 || newEmail.trim().length === 0;


  return (
    <div className="w-full h-full select-none">
      <h1
        className="italic mb-[30px]"
        style={{ fontSize: "32px", fontWeight: 600 }}
      >
        User Management
      </h1>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-[12px]"
        style={{
          width: "100%",
          maxWidth: "1000px",
          backgroundColor: "#FFF",
          boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
        }}
      >
        <div className="overflow-hidden select-text">
          {/* Header */}
          <div
            className="flex"
            style={{
              backgroundColor: "#44F3C9",
              fontWeight: 600,
              fontSize: "16px",
              height: "40px",
              alignItems: "center",
              paddingLeft: "20px",
            }}
          >
            <div className="w-[240px]">Username</div>
            <div className="w-[310px]">E-mail</div>
            <div className="w-[180px]">Credentials</div>
            <div className="w-[160px]">Actions</div>
          </div>

          {/* Rows */}
          {users.map((user) => (
            <div
              key={user.id}
              className="flex border-b border-[#D6D6D6]"
              style={{
                backgroundColor: "#F2F2F2",
                height: "40px",
                alignItems: "center",
                paddingLeft: "20px",
                fontSize: "15px",
              }}
            >
              {/* Username */}
              <div className="w-[240px] flex items-center">
                {editingUserId === user.id ? (
                  <input
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    style={{
                      width: "200px",
                      height: "26px",
                      border: "1px solid #D1D5DB",
                      borderRadius: "6px",
                      paddingLeft: "6px",
                      fontSize: "15px",
                    }}
                  />
                ) : (
                  <span className="truncate">{user.username}</span>
                )}
              </div>

              {/* Email */}
              <div className="w-[310px] flex items-center">
                <span className="truncate" title={user.email}>
                  {user.email}
                </span>
              </div>

              {/* Credentials */}
              <div className="w-[180px] flex items-center">
                <button
                  onClick={() => handleSendCredentials(user.id)}
                  className="hover:underline cursor-pointer"
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "15px",
                    fontStyle: "italic",
                  }}
                >
                  Send
                </button>
              </div>

              {/* Actions */}
              <div className="w-[160px] flex items-center">
                {editingUserId === user.id ? (
                  <>
                    <button
                      onClick={() => handleSave(user.id)}
                      className="mr-[8px] hover:underline cursor-pointer"
                    >
                      Save
                    </button>
                    <span>|</span>
                    <button
                      onClick={handleCancelEdit}
                      className="ml-[8px] hover:underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEditUser(user)}
                      className="mr-[8px] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                    <span>|</span>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="ml-[8px] hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add user button */}
      <div
        className="mt-[10px]"
        style={{ maxWidth: "1000px", textAlign: "right" }}
      >
        <button
          onClick={openAddModal}
          className="flex items-center float-right hover:underline cursor-pointer italic"
          style={{ background: "none", border: "none", font: "inherit" }}
        >
          <img src={addUserIcon} className="h-[16px] mr-[6px]" />
          Add New User
        </button>
      </div>

      {/* Add user modal */}

      {showAddModal && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0"
            onClick={closeAddModal}
            style={{
              backgroundColor: "rgba(0,0,0,0.75)",
              zIndex: 999999,
            }}
          ></div>

          {/* Modal */}
          <div
            className="fixed top-1/2 left-1/2 rounded-[16px]"
            style={{
              transform: "translate(-50%, -50%)",
              width: "430px",
              backgroundColor: "#FFF",
              boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
              zIndex: 1000000,
            }}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <h2
                className="italic"
                style={{ fontSize: "22px", fontWeight: 600 }}
              >
                Add New User
              </h2>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Username */}
              <div className="mb-[16px]">
                <label
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Username
                </label>
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={{
                    width: "100%",
                    height: "38px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    paddingLeft: "12px",
                    fontSize: "16px",
                  }}
                />
              </div>

              {/* Email */}
              <div className="mb-[16px]">
                <label
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  E-mail
                </label>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  style={{
                    width: "100%",
                    height: "38px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    paddingLeft: "12px",
                    fontSize: "16px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                padding: "16px",
                borderTop: "1px solid #E5E7EB",
                display: "flex",
                justifyContent: "center",
                gap: "14px",
              }}
            >
              {/* Cancel button */}
              <button
                onClick={closeAddModal}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#D5D7DB")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#E5E7EB")}
                style={{
                  padding: "10px 34px",
                  borderRadius: "10px",
                  fontSize: "17px",
                  fontWeight: 600,
                  backgroundColor: "#E5E7EB",
                  border: "1px solid #C9CED8",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              {/* Add button */}
              <button
                onClick={handleAddUser}
                disabled={isAddDisabled}
                onMouseEnter={(e) =>
                  !isAddDisabled && (e.target.style.backgroundColor = "#9BC9C3")
                }
                onMouseLeave={(e) =>
                  !isAddDisabled &&
                  (e.target.style.backgroundColor = "#B3DCD7")
                }
                style={{
                  padding: "10px 34px",
                  borderRadius: "10px",
                  fontSize: "17px",
                  fontWeight: 600,
                  backgroundColor: isAddDisabled ? "#C8E3DF" : "#B3DCD7",
                  border: "1px solid #91d0c9ff",
                  cursor: isAddDisabled ? "not-allowed" : "pointer",
                  opacity: isAddDisabled ? 0.6 : 1,
                }}
              >
                Add User
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete modal */}

      {showDeleteModal && userToDelete && (
        <>
          <div
            className="fixed inset-0"
            onClick={() => setShowDeleteModal(false)}
            style={{
              backgroundColor: "rgba(0,0,0,0.75)",
              zIndex: 999999,
            }}
          ></div>

          <div
            className="fixed top-1/2 left-1/2 rounded-[16px]"
            style={{
              transform: "translate(-50%, -50%)",
              width: "430px",
              backgroundColor: "#FFF",
              boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
              zIndex: 1000000,
            }}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <h2
                className="italic"
                style={{ fontSize: "22px", fontWeight: 600 }}
              >
                Delete User
              </h2>
            </div>

            <div style={{ padding: "20px 24px", fontSize: "16px" }}>
              Are you sure you want to delete{" "}
              <strong>{userToDelete.username}</strong> (
              <span style={{ color: "#555" }}>{userToDelete.email}</span>)?
            </div>

            <div
              style={{
                padding: "16px",
                borderTop: "1px solid #E5E7EB",
                display: "flex",
                justifyContent: "center",
                gap: "14px",
              }}
            >
              {/* Cancel */}
              <button
                onClick={() => setShowDeleteModal(false)}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#D5D7DB")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#E5E7EB")}
                style={{
                  padding: "10px 34px",
                  borderRadius: "10px",
                  fontSize: "17px",
                  fontWeight: 600,
                  backgroundColor: "#E5E7EB",
                  border: "1px solid #C9CED8",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              {/* Delete */}
              <button
                onClick={confirmDeleteUser}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#FF9999")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#FFB3B3")}
                style={{
                  padding: "10px 34px",
                  borderRadius: "10px",
                  fontSize: "17px",
                  fontWeight: 600,
                  backgroundColor: "#FFB3B3",
                  border: "1px solid #E38D8D",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
