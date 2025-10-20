import React, { useState, useEffect, useMemo, useCallback } from "react";
import Dataset, { initialDatasets } from "../../components/Dataset";
import UploadDataset from "../../components/UploadDataset";
import selectionBox from "../../assets/selectionbox.png";
import selectedBox from "../../assets/selectedbox.png";

const Overview = () => {
  const [datasetsState, setDatasetsState] = useState(initialDatasets);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draftDatasets, setDraftDatasets] = useState(initialDatasets);
  const [selectedDatasets, setSelectedDatasets] = useState([]);

  // Prevent background scroll when upload is open
  useEffect(() => {
    document.body.style.overflow = isUploadOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isUploadOpen]);

  // Enter edit mode
  const enterEditMode = () => {
    setDraftDatasets(datasetsState.map((d) => ({ ...d })));
    setEditMode(true);
    setSelectedDatasets([]);
  };

  // Cancel edit
  const cancelEdit = () => {
    setDraftDatasets(datasetsState.map((d) => ({ ...d })));
    setEditMode(false);
    setSelectedDatasets([]);
  };

  // Save edited datasets
  const saveEdit = () => {
    const updated = draftDatasets.map((d) => ({
      ...d,
      lastUpdated: new Date().toLocaleString(),
    }));
    setDatasetsState(updated);
    setEditMode(false);
  };

  // Delete selected datasets
  const handleDeleteSelected = () => {
    setDatasetsState((prev) =>
      prev.filter((d) => !selectedDatasets.includes(d.id))
    );
    setDraftDatasets((prev) =>
      prev.filter((d) => !selectedDatasets.includes(d.id))
    );
    setSelectedDatasets([]);
    setEditMode(false);
  };

  // Toggle selection when in edit mode
  const toggleSelectDataset = (id) => {
    if (!editMode) return;
    setSelectedDatasets((prev) =>
      prev.includes(id)
        ? prev.filter((sid) => sid !== id)
        : [...prev, id]
    );
  };

  // ✅ When a field is edited inside a dataset card
  const handleFieldChange = (id, field, value) => {
    setDraftDatasets((prev) => {
      // Make a shallow copy of the array
      const copy = [...prev];
      // Find the dataset being edited
      const index = copy.findIndex((d) => d.id === id);
      if (index === -1) return prev;

      // Update only that dataset’s field
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };


  const displayed = useMemo(
    () => (editMode ? draftDatasets : datasetsState),
    [editMode, draftDatasets, datasetsState]
  );

  const columns = useMemo(() => {
    const colArr = [[], [], []];
    displayed.forEach((data, i) => colArr[i % 3].push(data));
    return colArr;
  }, [displayed]);

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
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col gap-[24px]">
              {col.map((data) => (
                <div key={data.id} className="relative inline-block align-top">
                  <div
                    className="relative rounded-[14px] overflow-visible inline-block align-top"
                    style={{
                      boxShadow: "0px 2px 4px rgba(0,0,0,0.25)",
                      position: "relative",
                      display: "inline-block",
                    }}
                  >
                    <Dataset
                      dataset={data}
                      editMode={editMode}
                      onFieldChange={handleFieldChange}
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
                className="h-[50px] px-[16px] bg-[#FCA5A5]
                 text-[#000000] text-[20px] font-[600] italic rounded-[10px]
                 border-[#CC3333] cursor-pointer hover:brightness-95
                 active:brightness-80 transition"
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
            datasetName: newData.datasetName || newData.name || "Untitled Dataset",
            fileName: newData.fileName || "Unknown.zip",
            status: newData.status || "Pending review",
            images: newData.images || 0,
            createdBy: newData.createdBy || "anthony",
            assignedTo: newData.assignedTo || newData.assignTo || "N/A",
            reviewedBy: newData.reviewedBy || newData.reviewer || "N/A",
            createdAt: newData.createdAt || new Date().toLocaleString(),
            lastUpdated: new Date().toLocaleString(),
            dateOfCollection: newData.dateOfCollection || "N/A",
            location: newData.location || "N/A",
            description: newData.description || "",
          };
          setDatasetsState((prev) => [formatted, ...prev]);
          setDraftDatasets((prev) => [formatted, ...prev]);
          setIsUploadOpen(false);
        }}
      />
    </div>
  );
};

export default Overview;
