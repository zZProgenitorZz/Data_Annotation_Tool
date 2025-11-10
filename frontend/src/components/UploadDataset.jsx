import React, { useState, useEffect, useRef, useContext } from "react";
import Select from "react-select";
import { AuthContext } from "./AuthContext";

const UploadDataset = ({ isOpen, onClose, users, onSave, datasetToEdit }) => {
const [errorMessage, setErrorMessage] = useState("");

  const initialFormData = {
    name: "",
    status: "",
    total_Images: 0,
    completed_Images: 0,
    createdBy: "",
    assignedTo: [],
    date_of_collection: "",
    is_active: true,
    location_of_collection: "",
    description: "",
    locked: false
  };

  const [formData, setFormData] = useState(initialFormData);

  // 🔹 Alleen voor UI, gaat NIET naar backend
  const [selectedFolderName, setSelectedFolderName] = useState("");
  const [selectedImageCount, setSelectedImageCount] = useState(0);

  const [selectedFiles, setSelectedFiles] = useState([]);

  const fileInputRef = useRef(null);
  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    if (isOpen) {
      if (datasetToEdit) {
        setFormData({
          ...initialFormData,
          ...datasetToEdit,
          assignedTo: Array.isArray(datasetToEdit.assignedTo)
            ? datasetToEdit.assignedTo
            : datasetToEdit.assignedTo
            ? String(datasetToEdit.assignedTo).split(", ")
            : [],
        });

        // Bij edit kun je evt. de bestaande total_Images tonen
        setSelectedFolderName("");
        setSelectedImageCount(datasetToEdit.total_Images || 0);
      } else {
        setFormData(initialFormData);
        setSelectedFolderName("");
        setSelectedImageCount(0);
      }
    }
  }, [isOpen, datasetToEdit]);

  if (!isOpen) return null;

  // kan event OF ("naam", value) aan
  const handleChange = (eOrName, maybeValue) => {
    if (typeof eOrName === "string") {
      const name = eOrName;
      const value = maybeValue;
      setFormData((prev) => ({ ...prev, [name]: value }));
    } else {
      const { name, value } = eOrName.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
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

    // 🔹 UI info
    setSelectedFolderName(folderName);
    setSelectedImageCount(imageFiles.length);

    setSelectedFiles(imageFiles);

    // For backend: total_iamges
    setFormData((prev) => ({
      ...prev,
      total_Images: 0,
      
    }));
  };

  const handleSave = () => {
    if (!formData.date_of_collection || formData.date_of_collection.trim() === "") {
    setErrorMessage("Please fill in the date of sample collection.");
    return;
    }
    if (!formData.name || formData.name.trim() === ""){
    setErrorMessage("Please fill in the dataset name");
    return;
    }
    
    onSave({
      dataset: {
        ...formData,
        status: "Pending review",
        createdBy: currentUser?.id,
      },
      files: selectedFiles,   // geef de images mee aan parent
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

  const assignedOptions = users.map((u) => ({
    value: u.id,
    label: `${u.username} (${u.role})`,
  }));

  const assignedArray = Array.isArray(formData.assignedTo)
    ? formData.assignedTo
    : formData.assignedTo
    ? String(formData.assignedTo).split(", ")
    : [];

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
            multiple
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
          <div
            style={{
              color: "#4B5563",
              fontSize: "16px",
              overflowWrap: "anywhere",
            }}
          >
            {/* 🔹 alleen lokale state */}
            Selected Folder: {selectedFolderName || "None"}
          </div>
          <div style={{ color: "#4B5563", fontSize: "16px" }}>
            Images: {selectedImageCount}
          </div>

          {/* name i.p.v. datasetName */}
          <input
            type="text"
            name="name"
            placeholder="Dataset Name"
            value={formData.name}
            onChange={handleChange}
            onFocus={(e) => (e.target.style.outline = focusStyle.outline)}
            onBlur={(e) => (e.target.style.outline = blurStyle.outline)}
            style={inputStyle}
            required
          />

          {/* Multi-select assignedTo */}
          <Select
            isMulti
            name="assignedTo"
            options={assignedOptions}
            value={assignedOptions.filter((opt) =>
              assignedArray.includes(opt.value)
            )}
            onChange={(selected) =>
              handleChange(
                "assignedTo",
                (selected || []).map((opt) => opt.value)
              )
            }
            placeholder="Assign to"
            styles={{
              control: (base, state) => ({
                ...base,
                ...inputStyle,
                borderColor: state.isFocused ? "#66B8A6" : "#D1D5DB",
                boxShadow: state.isFocused
                  ? "0 0 0 2px rgba(102, 184, 166, 0.3)"
                  : "none",
                minHeight: "36px",
              }),
              valueContainer: (base) => ({
                ...base,
                flexWrap: "wrap",
                overflow: "visible",
              }),
              multiValue: (base) => ({
                ...base,
                backgroundColor: "#E5F9F7",
                borderRadius: "4px",
              }),
              multiValueLabel: (base) => ({
                ...base,
                color: "#000",
              }),
              option: (base, { isFocused, isSelected }) => ({
                ...base,
                backgroundColor: isSelected
                  ? "#B3DCD7"
                  : isFocused
                  ? "#E5F9F7"
                  : "#FFFFFF",
                color: "#000000",
                cursor: "pointer",
              }),
              menu: (base) => ({
                ...base,
                borderRadius: "6px",
                overflow: "hidden",
                boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.15)",
                zIndex: 10,
              }),
              placeholder: (base) => ({
                ...base,
                fontSize: "14px",
              }),
            }}
          />

          {/* date_of_collection */}
          <input
            type="date"
            name="date_of_collection"
            placeholder="Date of sample collection (yyyy-mm-dd)"
            value={formData.date_of_collection}
            onChange={handleChange}
            
            onFocus={(e) => (e.target.style.outline = focusStyle.outline)}
            onBlur={(e) => (e.target.style.outline = blurStyle.outline)}
            style={inputStyle}
          />

          {/* location_of_collection */}
          <input
            type="text"
            name="location_of_collection"
            placeholder="Location"
            value={formData.location_of_collection}
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
            style={{
              ...inputStyle,
              flexGrow: 1,
              resize: "vertical",
              minHeight: "80px",
            }}
          />
        </div>
        <div className="h-[25px]  flex items-center justify-center">
            {errorMessage && (
              <p className="text-[#FF2C2C] text-[13px] leading-none" style={{ color: '#f93030ff', fontWeight: 500 ,  textShadow: '1px 1px 2px rgba(0,0,0,0.2)'}}>
                {errorMessage}
              </p>
            )}
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
            onClick={() => {
              setErrorMessage("");   // 1) error leegmaken
              if (onClose) {
                onClose();           // 2) modal sluiten (alleen als onClose bestaat)
              }
            }}
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
