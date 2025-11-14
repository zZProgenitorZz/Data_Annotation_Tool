import { useState, useEffect, useMemo, useCallback, useRef, useContext } from "react";
import UploadDataset from "../../components/UploadDataset";
import selectionBox from "../../assets/selectionbox.png";
import selectedBox from "../../assets/selectedbox.png";
import { getAllDatasets, updateDataset } from "../../services/datasetService";
import DatasetWrapper from "./DatasetCard"
import { getAllUsers } from "../../services/authService";
import getChangedFields from "../../utils/utils";
import { uploadImagesToS3 } from "../../utils/uploadImagesToS3";
import { createDataset } from "../../services/datasetService";
import { soft_Delete_Dataset, hard_Delete_Dataset } from "../../utils/deleteDataset";
import { softDeleteDataset } from "../../services/datasetService";
import { AuthContext } from "../../components/AuthContext";
import { uploadGuestImages } from "../../services/ImageService";
import Header from "../../components/Header";
import { deleteDatasetLabel } from "../../services/labelService";


const getAssignedUser = async () => {
  try{
    const allUsers = await getAllUsers()
    //filter out admins
    const nonAdminUsers = allUsers.filter((u) => u.role !== "admin")

    const assignedUsers = nonAdminUsers.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role
    }))

    return assignedUsers
    
  } catch(error) {
    console.error("Error finding or filtering Users", error);
  }
}

// Main Overview Component
const Overview = () => {
  const [datasetsState, setDatasetsState] = useState([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([])
  const { currentUser, authType, loading} = useContext(AuthContext)


  //ref to store dataset components
  const datasetRefs = useRef({});

  // 🔹 Herbruikbare fetch-functie voor datasets
  const fetchDatasets = useCallback(async () => {
    try {
      const data = await getAllDatasets();
      setDatasetsState(data);
    } catch (error) {
      console.error("Error fetching datasets:", error);
    }
  }, []);
  
  //useEffect fetch to get all Users

  useEffect(() => {
    if (loading) return;
    if (authType === "guest") {
      setAssignedUsers([]);
      return;
    }
      const fetchUsers = async () => {
        try{
          const result = await getAssignedUser();
          setAssignedUsers(result || []);
        } catch (err) {
          console.error("Error fetching assigned users:", err)
          setAssignedUsers([]);
        }
      };
      fetchUsers();
  }, [loading, authType]);
    

   // Fetch to reload page
  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);
  
 
  // Scrolling lock by open model
  useEffect(() => {
    document.body.style.overflow = isUploadOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isUploadOpen]);

 

  // Enter edit mode
  const enterEditMode = () => {
    setEditMode(true);
    setSelectedDatasets([]);
  };

  // Toggle selection when in edit mode
  const toggleSelectDataset = useCallback((id) => {
    setSelectedDatasets((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  }, []);

  // Cancel edit - just exit edit mode, components will reset from their useEffect
  const cancelEdit = () => {
    setEditMode(false);
    setSelectedDatasets([]);
    // Force re-render by creating new object references
    setDatasetsState(prev => prev.map(d => ({...d})));
  };

  // Save edited datasets - collect local state from all Dataset components
  const saveEdit = async () => {
    try {
      const updatedDatasets = [];
      
      // Collect all the local state from Dataset components
      for (const dataset of datasetsState) {
        const ref = datasetRefs.current[dataset.id];
        if (ref && ref.getLocalData) {
          updatedDatasets.push(ref.getLocalData());
        } else {
          updatedDatasets.push(dataset);
        }
      
      }

      // Loop through and update each dataset in the backend
      for (const d of updatedDatasets) {
        const original = datasetsState.find(data => data.id === d.id);
        const changedFields = getChangedFields(original, d);

        if (Object.keys(changedFields).length> 0) {
        await updateDataset(d.id, {...changedFields });
        }
      }

      // Update local state after all updates are done
      setDatasetsState(updatedDatasets);
      setEditMode(false);
      setSelectedDatasets([]);
    } catch (error) {
      console.error("Error saving datasets:", error);
    }
  };

  // Delete selected datasets
  const handleDeleteSelected = async () => {
    try {
      // Call softDeleteDataset for each selected dataset
      for (const datasetId of selectedDatasets) {
        if (!loading && authType === "user") {
        await soft_Delete_Dataset(datasetId);
               
        await deleteDatasetLabel(datasetId);
          
        await hard_Delete_Dataset(datasetId);
        }

        if (!loading && authType === "guest") {
          await softDeleteDataset(datasetId)
        }
      }

      // Remove from local state
      setDatasetsState((prev) =>
        prev.filter((d) => !selectedDatasets.includes(d.id))
      );
      setSelectedDatasets([]);
      setEditMode(false);
    } catch (error) {
      console.error("Error deleting datasets:", error);
    }
  };

  const columns = useMemo(() => {
    const colArr = [[], [], []];
    datasetsState.forEach((data, i) => colArr[i % 3].push(data));
    return colArr;
  }, [datasetsState]);

  const handleSaveDataset = async ({ dataset, files }) => {
    try {
      // 1) dataset aanmaken in backend
      const created = await createDataset(dataset);
      const datasetId = created;
     

      if (!loading && authType === "user") {
        // 2) images uploaden naar S3 met helper (alleen als er files zijn)
        if (files && files.length && datasetId) {
          await uploadImagesToS3({
            datasetId,
            files,
            onProgress: ({ imageId, pct }) => {
              console.log("upload", imageId, pct, "%");
            },
          });
        }
      }

      if (!loading && authType === "guest") {
        if (files && files.length && datasetId) {
          await uploadGuestImages(datasetId, files);
        }
      }
      // 3) Datasets opnieuw ophalen (i.p.v. window.location.reload)
      await fetchDatasets();

      // 4) Modal sluiten
      setIsUploadOpen(false);
    } catch (error) {
      console.error("Error saving dataset (or uploading images):", error);
      // hier zou je evt. een error state/toast kunnen zetten
    }
  };

   

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-[#44F3C9] to-[#3F7790]">
      {/* Header */}
      <Header title="Datasets" currentUser={currentUser}/>

      
      <div className="flex-1 overflow-auto px-[40px] pt-[40px] datasets-scroll">
        <div className="flex justify-center gap-[24px] items-start flex-wrap">
          {columns.map((col, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-[24px]">
              {col
              .filter((data) => data.is_active)
              .map((data) => (
                <div key={data.id} className="relative inline-block align-top">
                  <div
                    className="relative rounded-[14px] overflow-visible inline-block align-top"
                    style={{
                      boxShadow: "0px 2px 4px rgba(0,0,0,0.25)",
                      position: "relative",
                      display: "inline-block",
                    }}
                  >
                    <DatasetWrapper
                      dataset={data}
                      editMode={editMode}
                      ref={(ref) => {
                        if (ref) datasetRefs.current[data.id] = ref;
                      }}
                      users={assignedUsers}
                    />
                    {editMode && (
                      <img
                        src={
                          selectedDatasets.includes(data.id)
                            ? selectedBox
                            : selectionBox
                        }
                        alt="Select"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectDataset(data.id);
                        }}
                        className="absolute top-[8px] right-[8px] w-[24px] h-[24px] cursor-pointer z-20"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {/*Footer */}
      <div className="flex-shrink-0 px-4 md:px-[40px] pb-[40px]">
        <div className="h-[1px] bg-[#000000] opacity-20 mb-[20px]" />

        <div
          className="flex justify-center items-center flex-nowrap"
          style={{
            // afstand tussen knoppen:
            // - kan helemaal naar 0px op klein scherm
            // - groeit met schermbreedt (10vw)
            // - max 200px
            columnGap: "clamp(0px, 10vw, 200px)",
          }}
        >
          {!editMode ? (
            <>
              <button
                className="shrink-0 h-[50px] px-3 md:px-[16px] whitespace-nowrap bg-[#E5F9F7]
                text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                border-[#CCCCCC] cursor-pointer hover:brightness-95
                active:brightness-80 transition"
              >
                View Actions
              </button>

              <button
                onClick={() => setIsUploadOpen(true)}
                className="shrink-0 h-[50px] px-3 md:px-[16px] whitespace-nowrap bg-[#E5F9F7]
                text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                border-[#CCCCCC] cursor-pointer hover:brightness-95
                active:brightness-80 transition"
              >
                Upload Dataset
              </button>

              <button
                onClick={enterEditMode}
                className="shrink-0 h-[50px] px-3 md:px-[16px] bg-[#E5F9F7]
                text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                border-[#CCCCCC] cursor-pointer hover:brightness-95
                active:brightness-80 transition whitespace-nowrap"
              >
                Edit
              </button>
            </>
          ) : (
            <>
              <button
                onClick={cancelEdit}
                className="shrink-0 h-[50px] px-3 md:px-[16px] bg-[#E5F9F7]
                text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                border-[#CCCCCC] cursor-pointer hover:brightness-95
                active:brightness-80 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteSelected}
                disabled={selectedDatasets.length === 0}
                className="shrink-0 h-[50px] px-3 md:px-[16px] bg-[#FCA5A5]
                text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                border-[#CC3333] cursor-pointer hover:brightness-95
                active:brightness-80 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Delete
              </button>

              <button
                onClick={saveEdit}
                className="shrink-0 h-[50px] px-3 md:px-[16px] bg-[#B3DCD7]
                text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                border-[#91d0c9ff] cursor-pointer hover:brightness-95
                active:brightness-80 transition whitespace-nowrap"
              >
                Save
              </button>
            </>
          )}
        </div>
      </div>


      <UploadDataset
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        users={assignedUsers}
        onSave={handleSaveDataset}
      />
    </div>
  );
};

export default Overview;

