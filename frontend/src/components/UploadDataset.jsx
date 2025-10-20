import React, { useState, useEffect, useRef } from "react";

const UploadDataset = ({ isOpen, onClose, onSave, datasetToEdit }) => {
  const initialFormData = {
    datasetName: "",
    assignedTo: "",
    reviewedBy: "",
    dateOfCollection: "",
    location: "",
    description: "",
    file: null,
    folderName: "",
    fileName: "",
    images: 0,
  };

  const [formData, setFormData] = useState(initialFormData);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(datasetToEdit || initialFormData);
    }
  }, [isOpen, datasetToEdit]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileSelect = () => fileInputRef.current.click();

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const firstFile = files[0];
    const folderName = firstFile.webkitRelativePath
      ? firstFile.webkitRelativePath.split("/")[0]
      : firstFile.name;

    const imageFiles = files.filter((f) => f.type.startsWith("image/"));

    setFormData({
      ...formData,
      file: firstFile,
      folderName,
      fileName: folderName,
      images: imageFiles.length,
    });
  };

  const handleSave = () => {
    onSave({
      ...formData,
      id: formData.id || `Dataset${Date.now()}`,
      status: "Pending review",
      createdAt: formData.createdAt || new Date().toLocaleString(),
      lastUpdated: new Date().toLocaleString(),
      createdBy: "anthony", 
    });
    onClose();
  };

  const focusStyle = { outline: "2px solid #41768F" };
  const blurStyle = { outline: "none" };
  const inputStyle = {
    border: "1px solid #D1D5DB",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#000000",
    fontSize: "16px",
    width: "100%",
    boxSizing: "border-box",
  };

  const buttonEffects = {
    onMouseOver: (e) => (e.currentTarget.style.filter = "brightness(0.95)"),
    onMouseOut: (e) => (e.currentTarget.style.filter = "brightness(1)"),
    onMouseDown: (e) => (e.currentTarget.style.filter = "brightness(0.85)"),
    onMouseUp: (e) => (e.currentTarget.style.filter = "brightness(0.95)"),
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.4)",
        padding: "12px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0px 6px 20px rgba(0,0,0,0.3)",
          width: "88%",
          maxWidth: "500px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          maxHeight: "calc(100vh - 40px)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            webkitdirectory="true"
            directory="true"
            onChange={handleFileChange}
          />
          <button
            onClick={handleFileSelect}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "10px",
              backgroundColor: "#E5F9F7",
              color: "#000000",
              border: "1px solid #B3DCD7",
              cursor: "pointer",
              fontSize: "20px",
              transition: "all 0.2s ease",
            }}
            {...buttonEffects}
          >
            Select Folder
            <img
              src="/src/assets/folder.png"
              alt="Folder Icon"
              style={{ width: "25px", height: "25px" }}
            />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-auto datasets-scroll"
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ color: "#4B5563", fontSize: "16px", overflowWrap: "anywhere" }}>
            Selected Folder: {formData.folderName || "None"}
          </div>
          <div style={{ color: "#4B5563", fontSize: "16px" }}>
            Images: {formData.images}
          </div>

          <input
            type="text"
            name="datasetName"
            placeholder="Dataset Name"
            value={formData.datasetName}
            onChange={handleChange}
            onFocus={(e) => (e.target.style.outline = focusStyle.outline)}
            onBlur={(e) => (e.target.style.outline = blurStyle.outline)}
            style={inputStyle}
          />

          <input
            type="text"
            name="assignedTo"
            placeholder="Assign to"
            value={formData.assignedTo}
            onChange={handleChange}
            onFocus={(e) => (e.target.style.outline = focusStyle.outline)}
            onBlur={(e) => (e.target.style.outline = blurStyle.outline)}
            style={inputStyle}
          />

          <input
            type="text"
            name="reviewedBy"
            placeholder="Reviewer"
            value={formData.reviewedBy}
            onChange={handleChange}
            onFocus={(e) => (e.target.style.outline = focusStyle.outline)}
            onBlur={(e) => (e.target.style.outline = blurStyle.outline)}
            style={inputStyle}
          />

          <input
            type="text"
            name="dateOfCollection"
            placeholder="Date of sample collection (dd/mm/yyyy)"
            value={formData.dateOfCollection}
            onChange={handleChange}
            onFocus={(e) => (e.target.style.outline = focusStyle.outline)}
            onBlur={(e) => (e.target.style.outline = blurStyle.outline)}
            style={inputStyle}
          />

          <input
            type="text"
            name="location"
            placeholder="Location"
            value={formData.location}
            onChange={handleChange}
            onFocus={(e) => (e.target.style.outline = focusStyle.outline)}
            onBlur={(e) => (e.target.style.outline = blurStyle.outline)}
            style={inputStyle}
          />

          <textarea
            name="description"
            placeholder="Assignment description"
            value={formData.description}
            onChange={handleChange}
            onFocus={(e) => (e.target.style.outline = focusStyle.outline)}
            onBlur={(e) => (e.target.style.outline = blurStyle.outline)}
            style={{ ...inputStyle, flexGrow: 1, resize: "vertical", minHeight: "80px" }}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "flex-end",
            gap: "16px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "12px 26px",
              borderRadius: "10px",
              backgroundColor: "#E5E7EB",
              color: "#000000",
              border: "2px solid #dadadaff",
              cursor: "pointer",
              fontSize: "20px",
              fontWeight: 600,
              fontStyle: "italic",
              transition: "all 0.2s ease",
            }}
            {...buttonEffects}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "12px 26px",
              borderRadius: "10px",
              backgroundColor: "#B3DCD7",
              color: "#000000",
              border: "2px solid #91d0c9ff",
              cursor: "pointer",
              fontSize: "20px",
              fontWeight: 600,
              fontStyle: "italic",
              transition: "all 0.2s ease",
            }}
            {...buttonEffects}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadDataset;
