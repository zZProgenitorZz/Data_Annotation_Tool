// src/pages/Admin/DatasetManagement.jsx (bijv.)

import React, { useState, useEffect, useCallback, useContext } from "react";

import UploadDataset from "../../components/UploadDataset";
import Export from "../../components/Export.jsx";


import addUserIcon from "../../assets/admin/add-user.png";

import {
  getAllDatasets,
  updateDataset,
  createDataset,
} from "../../services/datasetService";

import { getAllUsers } from "../../services/authService";
import { uploadImagesToS3 } from "../../utils/uploadImagesToS3";
import {
  soft_Delete_Dataset,
  hard_Delete_Dataset,
} from "../../utils/deleteDataset";
import { deleteDatasetLabel } from "../../services/labelService";
import { parseAssignedTo } from "../../utils/utils";
import { AuthContext } from "../../components/AuthContext";

export default function DatasetManagement() {
  const [datasets, setDatasets] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const { authType, loading } = useContext(AuthContext);

  // User List Modal
  const [userListModal, setUserListModal] = useState({
    open: false,
    title: "",
    list: [],
    type: "", // "assigned" | "reviewers"
    dataset: null,
  });

  const [newUserToAdd, setNewUserToAdd] = useState("");

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState(null);

  // Export Modal
  const [exportDataset, setExportDataset] = useState(null);

  // Upload Modal
  const [uploadOpen, setUploadOpen] = useState(false);

  // ---- Helpers voor users/datasets ----

  const fetchUsers = useCallback(async () => {
    try {
      const users = await getAllUsers();
      setAllUsers(users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setAllUsers([]);
    }
  }, []);

  const fetchDatasets = useCallback(async () => {
    try {
      const data = await getAllDatasets();
      setDatasets(data || []);
    } catch (err) {
      console.error("Error fetching datasets:", err);
      setDatasets([]);
    }
  }, []);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  useEffect(() => {
    if (loading) return;
    
    fetchUsers();
  }, [loading, fetchUsers]);

  const getUserById = (id) =>
    allUsers.find((u) => String(u.id) === String(id)) || null;

  const getUserNameById = (id) => {
    if (!id) return "";
    const u = getUserById(id);
    return u ? u.username : String(id);
  };

  const getAssignedNames = (dataset) => {
    // annotators
    const map = parseAssignedTo(dataset.assignedTo || []);
    const names = [];
    Object.entries(map).forEach(([userId, role]) => {
      if (role === "annotator") {
        const u = getUserById(userId);
        names.push(u ? u.username : userId);
      }
    });
    return names;
  };

  const getReviewerNames = (dataset) => {
    // reviewers
    const map = parseAssignedTo(dataset.assignedTo || []);
    const names = [];
    Object.entries(map).forEach(([userId, role]) => {
      if (role === "reviewer") {
        const u = getUserById(userId);
        names.push(u ? u.username : userId);
      }
    });
    return names;
  };

  // ---- User list modal (view + edit) ----

  function openUserListModal(dataset, type) {
    const isAssignedType = type === "assigned";

    const list = isAssignedType
      ? getAssignedNames(dataset)
      : getReviewerNames(dataset);

    setUserListModal({
      open: true,
      title: isAssignedType ? "Assigned Users" : "Reviewers",
      list,
      type, // "assigned" of "reviewers"
      dataset,
    });
    setNewUserToAdd("");
  }

  function closeUserListModal() {
    setUserListModal({
      open: false,
      title: "",
      list: [],
      type: "",
      dataset: null,
    });
    setNewUserToAdd("");
  }

  function addUserToList() {
    const user = newUserToAdd.trim();
    if (!user) return;

    // alleen geldige usernamen (uit allUsers)
    const isKnown = allUsers.some((u) => u.username === user);
    if (!isKnown) return;

    if (!userListModal.list.includes(user)) {
      setUserListModal((prev) => ({
        ...prev,
        list: [...prev.list, user],
      }));
    }
    setNewUserToAdd("");
  }

  function removeUser(u) {
    setUserListModal((prev) => ({
      ...prev,
      list: prev.list.filter((x) => x !== u),
    }));
  }

  async function saveUserListChanges() {
    const { dataset, type, list } = userListModal;
    if (!dataset || !type) {
      closeUserListModal();
      return;
    }

    const roleForType = type === "assigned" ? "annotator" : "reviewer";

    try {
      setDatasets((prev) => {
        let changed = null;

        const next = prev.map((ds) => {
          if (ds.id !== dataset.id) return ds;

          // bestaande map userId -> role
          const currentMap = parseAssignedTo(ds.assignedTo || {});

          // 1) haal alle users met deze role weg
          for (const [userId, role] of Object.entries({ ...currentMap })) {
            if (role === roleForType) {
              delete currentMap[userId];
            }
          }

          // 2) voor elke username in list → id zoeken → roleForType instellen
          const nameToId = new Map(
            allUsers.map((u) => [u.username, String(u.id)])
          );

          list.forEach((name) => {
            const userId = nameToId.get(name);
            if (userId) {
              currentMap[userId] = roleForType;
            }
          });

          const newAssignedTo = Object.entries(currentMap).map(
            ([userId, role]) => `${userId} - ${role}`
          );

          changed = { id: ds.id, assignedTo: newAssignedTo };

          return {
            ...ds,
            assignedTo: newAssignedTo,
          };
        });

        // buiten de map side-effect doen
        if (changed) {
          updateDataset(changed.id, { assignedTo: changed.assignedTo }).catch(
            (err) =>
              console.error(
                "Failed to update dataset assignedTo from DatasetManagement:",
                err
              )
          );
        }

        return next;
      });
    } catch (err) {
      console.error("Error saving user list changes:", err);
    } finally {
      closeUserListModal();
    }
  }

  // ---- Delete modal ----

  function openDeleteModal(ds) {
    setDatasetToDelete(ds);
    setDeleteModal(true);
  }

  function closeDeleteModal() {
    setDatasetToDelete(null);
    setDeleteModal(false);
  }

  async function confirmDelete() {
    if (!datasetToDelete) {
      closeDeleteModal();
      return;
    }

    const id = datasetToDelete.id;

    try {
      if (!loading && authType === "user") {
        await soft_Delete_Dataset(id);
        await deleteDatasetLabel(id);
        await hard_Delete_Dataset(id);
      } 

      setDatasets((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Error deleting dataset:", err);
    } finally {
      closeDeleteModal();
    }
  }

  // ---- Upload Dataset (zelfde flow als Overview) ----

  const handleSaveDataset = async ({ dataset, files }) => {
    try {
      const createdId = await createDataset(dataset);

      if (!loading && authType === "user") {
        if (files && files.length && createdId) {
          await uploadImagesToS3({
            datasetId: createdId,
            files,
            onProgress: ({ imageId, pct }) => {
              console.log("upload", imageId, pct, "%");
            },
          });
        }
      }


      await fetchDatasets();
      setUploadOpen(false);
    } catch (error) {
      console.error("Error saving dataset (or uploading images):", error);
    }
  };

  // ---- Render helpers voor Assigned/Reviewers kolom ----

  const renderNamesCell = (names, dataset, type) => {
    if (!names || names.length === 0) return "None";
    if (names.length === 1) return names[0];

    return (
      <>
        {names[0]}{" "}
        <span
          style={{ color: "#007BFF", cursor: "pointer" }}
          onClick={() => openUserListModal(dataset, type)}
        >
          (+{names.length - 1})
        </span>
      </>
    );
  };

  return (
    <div className="w-full h-full select-none">
      <h1
        className="italic mb-[30px]"
        style={{ fontSize: "32px", fontWeight: 600 }}
      >
        Dataset Management
      </h1>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-[12px]"
        style={{
          width: "100%",
          maxWidth: "1100px",
          backgroundColor: "#fff",
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
            <div className="w-[130px] truncate">Dataset</div>
           
            <div className="w-[150px] truncate">Status</div>
            <div className="w-[130px] truncate">Owner</div>
            <div className="w-[160px] truncate">Assigned</div>
            <div className="w-[160px] truncate">Reviewer</div>
            <div className="w-[140px] truncate">Action</div>
          </div>

          {/* Rows */}
          {datasets
            .filter((d) => d.is_active !== false) // zelfde als Overview: alleen actieve
            .map((d) => {
              const assignedNames = getAssignedNames(d);
              const reviewerNames = getReviewerNames(d);
              const ownerName = getUserNameById(d.createdBy);

              return (
                <div
                  key={d.id}
                  className="flex border-b border-[#D6D6D6]"
                  style={{
                    backgroundColor: "#F2F2F2",
                    height: "40px",
                    alignItems: "center",
                    paddingLeft: "20px",
                    fontSize: "15px",
                  }}
                >
                  <div className="w-[130px] truncate">
                    {d.name || `Dataset ${d.id}`}
                  </div>
        
                  <div className="w-[150px] truncate">
                    {d.completed_Images === d.total_Images ? (
                        <span style={{ color: "#1b1b1bff", fontWeight: "600" }}>Completed</span>
                    ) : (
                        <>
                        {/* completed_Images kleur bepalen */}
                        <span
                            style={{
                            color: d.completed_Images === 0 ? "#797979ff" : "#797979ff", // rood of geel
                            fontWeight: "600",
                            }}
                        >
                            {d.completed_Images}
                        </span>

                        {" / "}

                        {/* total_Images altijd groen */}
                        <span style={{ color: "#1b1b1bff", fontWeight: "600" }}>
                            {d.total_Images}
                        </span>
                        </>
                    )}
                    </div>


                  <div className="w-[130px] truncate">
                    {ownerName || "Admin"}
                  </div>

                  {/* Assigned */}
                  <div className="w-[160px] truncate">
                    {renderNamesCell(assignedNames, d, "assigned")}
                  </div>

                  {/* Reviewers */}
                  <div className="w-[160px] truncate">
                    {renderNamesCell(reviewerNames, d, "reviewers")}
                  </div>

                  {/* Actions */}
                  <div className="w-[140px] flex gap-[10px]">
                    <button
                      className="hover:underline"
                      onClick={() => setExportDataset(d)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "15px",
                        fontStyle: "italic",
                      }}
                    >
                      Export
                    </button>

                    <button
                      className="hover:underline"
                      onClick={() => openDeleteModal(d)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "15px",
                        fontStyle: "italic",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Add New Dataset */}
      <div
        style={{
          maxWidth: "1100px",
          textAlign: "right",
          marginTop: "10px",
          paddingRight: "4px",
        }}
      >
        <button
          onClick={() => setUploadOpen(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "15px",
            fontStyle: "italic",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            float: "right",
          }}
          className="hover:underline"
        >
          <img src={addUserIcon} style={{ width: "16px" }} />
          Add New Dataset
        </button>
      </div>

      {/* User List Modal */}
      {userListModal.open && (
        <>
          <div
            className="fixed inset-0"
            style={{ background: "rgba(0,0,0,0.65)" }}
            onClick={closeUserListModal}
          ></div>

          <div
            className="fixed top-1/2 left-1/2 rounded-[16px]"
            style={{
              transform: "translate(-50%, -50%)",
              width: "400px",
              background: "#fff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
            }}
          >
            <div
              style={{
                padding: "18px",
                borderBottom: "1px solid #E5E7EB",
                fontSize: "20px",
                fontWeight: 600,
              }}
              className="italic"
            >
              {userListModal.title}
            </div>

            <div
              style={{ padding: "18px", maxHeight: "260px", overflowY: "auto" }}
            >
              {userListModal.list.map((u) => (
                <div
                  key={u}
                  className="flex justify-between items-center"
                  style={{
                    borderBottom: "1px solid #F0F0F0",
                    padding: "6px 0",
                    fontSize: "16px",
                  }}
                >
                  {u}
                  <button
                    onClick={() => removeUser(u)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#B00020",
                      cursor: "pointer",
                    }}
                  >
                    remove
                  </button>
                </div>
              ))}

              <input
                value={newUserToAdd}
                onChange={(e) => setNewUserToAdd(e.target.value)}
                placeholder="Add user..."
                style={{
                  width: "100%",
                  height: "34px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "6px",
                  paddingLeft: "10px",
                  marginTop: "12px",
                }}
              />

              <button
                onClick={addUserToList}
                style={{
                  width: "100%",
                  marginTop: "10px",
                  padding: "10px 0",
                  background: "#B3DCD7",
                  borderRadius: "10px",
                  border: "1px solid #91d0c9ff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Add User
              </button>
            </div>

            <div
              style={{
                padding: "14px",
                borderTop: "1px solid #E5E7EB",
                display: "flex",
                justifyContent: "center",
                gap: "14px",
              }}
            >
              <button
                onClick={closeUserListModal}
                style={{
                  padding: "10px 34px",
                  borderRadius: "10px",
                  background: "#E5E7EB",
                  border: "1px solid #C9CED8",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>

              <button
                onClick={saveUserListChanges}
                style={{
                  padding: "10px 34px",
                  borderRadius: "10px",
                  background: "#B3DCD7",
                  border: "1px solid #91d0c9ff",
                  fontWeight: 600,
                }}
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <>
          <div
            className="fixed inset-0"
            onClick={closeDeleteModal}
            style={{ background: "rgba(0,0,0,0.75)" }}
          ></div>

          <div
            className="fixed top-1/2 left-1/2 rounded-[16px]"
            style={{
              transform: "translate(-50%, -50%)",
              width: "430px",
              background: "#fff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #E5E7EB",
                fontSize: "22px",
                fontWeight: 600,
              }}
              className="italic"
            >
              Delete Dataset
            </div>

            <div style={{ padding: "20px 24px", fontSize: "16px" }}>
              Are you sure you want to delete{" "}
              <b>{datasetToDelete?.name || datasetToDelete?.id}</b>?
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
              <button
                onClick={closeDeleteModal}
                style={{
                  padding: "10px 34px",
                  borderRadius: "10px",
                  background: "#E5E7EB",
                  border: "1px solid #C9CED8",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                style={{
                  padding: "10px 34px",
                  borderRadius: "10px",
                  background: "#F8D7DA",
                  border: "1px solid #F5C2C7",
                  fontWeight: 600,
                  color: "#A94442",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Upload Dataset Modal*/}
      <UploadDataset
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSave={handleSaveDataset}
        users={allUsers}
      />

      {/* Export Modal */}
      {exportDataset && (
        <Export
          dataset={exportDataset}
          authType={authType}
          onClose={() => setExportDataset(null)}
        />
      )}
    </div>
  );
}
