import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import UploadDataset from "../../components/UploadDataset";
import selectionBox from "../../assets/selectionbox.png";
import selectedBox from "../../assets/selectedbox.png";
import { getAllDatasets, updateDataset, softDeleteDataset } from "../../services/datasetService";
import DatasetWrapper from "./DatasetCard"
import { getAllUsers } from "../../services/authService";
import getChangedFields from "../../components/utils";


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
  
  
  useEffect(() => {
      const fetchUsers = async () => {
        const result = await getAssignedUser();
        setAssignedUsers(result);
      };
      fetchUsers();
  }, []);
  
  // Use refs to store the Dataset components so we can access their local state
  const datasetRefs = useRef({});

  // Prevent background scroll when upload is open
  useEffect(() => {
    document.body.style.overflow = isUploadOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isUploadOpen]);

  // Fetch datasets from backend when page loads
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const data = await getAllDatasets();
        setDatasetsState(data);
      } catch (error) {
        console.error("Error fetching datasets:", error);
      }
    };

    fetchDatasets();
  }, []);

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
        await softDeleteDataset(datasetId);
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

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-[#44F3C9] to-[#3F7790]">
      {/* Header */}
      <div
        className="relative flex items-end justify-center flex-shrink-0"
        style={{ height: "70px", backgroundColor: "rgba(255,255,255,0.31)" }}
      >
        <img
          src="src/assets/aidxlogo.png"
          alt="AiDx Medical Logo"
          className="absolute left-[0px] top-[2px] bottom-[0px] pl-[3px] h-[40px]"
        />
        <h1
          className="text-[#000000] text-[30px] font-[600] italic mb-[-2px]"
          style={{ textShadow: "0px 1px 0px rgba(0,0,0,0.15)" }}
        >
          Datasets
        </h1>
      </div>

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

      <div className="flex-shrink-0 px-[40px] pb-[40px]">
        <div className="h-[1px] bg-[#000000] opacity-20 mb-[20px]" />
        <div className="flex justify-center gap-[200px] flex-wrap">
          {!editMode ? (
            <>
              <button
                className="h-[50px] px-[16px] whitespace-nowrap bg-[#E5F9F7]
                 text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                 border-[#CCCCCC] cursor-pointer hover:brightness-95
                 active:brightness-80 transition"
              >
                View Actions
              </button>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="h-[50px] px-[16px] whitespace-nowrap bg-[#E5F9F7]
                 text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                 border-[#CCCCCC] cursor-pointer hover:brightness-95
                 active:brightness-80 transition"
              >
                Upload Dataset
              </button>
              <button
                onClick={enterEditMode}
                className="h-[50px] px-[16px] bg-[#E5F9F7]
                 text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                 border-[#CCCCCC] cursor-pointer hover:brightness-95
                 active:brightness-80 transition"
              >
                Edit
              </button>
            </>
          ) : (
            <>
              <button
                onClick={cancelEdit}
                className="h-[50px] px-[16px] bg-[#E5F9F7]
                 text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                 border-[#CCCCCC] cursor-pointer hover:brightness-95
                 active:brightness-80 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedDatasets.length === 0}
                className="h-[50px] px-[16px] bg-[#FCA5A5]
                 text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                 border-[#CC3333] cursor-pointer hover:brightness-95
                 active:brightness-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
              <button
                onClick={saveEdit}
                className="h-[50px] px-[16px] bg-[#B3DCD7]
                 text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                 border-[#91d0c9ff] cursor-pointer hover:brightness-95
                 active:brightness-80 transition"
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
        onSave={(newData) => {
          const formatted = {
            id: newData.id || `Dataset${Math.floor(Math.random() * 10000)}`,
            name: newData.datasetName || newData.name || "Untitled Dataset",
            fileName: newData.fileName || "Unknown.zip",
            status: newData.status || "Pending review",
            total_Images: newData.images || 0,
            completed_Images: 0,
            createdBy: newData.createdBy || "anthony",
            assignedTo: newData.assignedTo || newData.assignTo || ["N/A"],
            reviewedBy: newData.reviewedBy || newData.reviewer || "N/A",
            createdAt: newData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            date_of_collection: newData.dateOfCollection || "N/A",
            location_of_collection: newData.location || "N/A",
            description: newData.description || "",
          };
          setDatasetsState((prev) => [formatted, ...prev]);
          setIsUploadOpen(false);
        }}
      />
    </div>
  );
};

export default Overview;