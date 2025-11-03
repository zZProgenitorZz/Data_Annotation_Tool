import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import Select from "react-select";
import { AuthContext } from "../../components/AuthContext";
import { useNavigate } from "react-router-dom";

// Up arrow icon (at the bottom of each dataset card)


const ChevronUp = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m18 15-6-6-6 6" />
  </svg>
);

// CSS styles defined outside component to avoid recreation
const editableBoxStyle = {
  border: "1px solid #B3DCD7",
  backgroundColor: "#FFFFFF",
  borderRadius: "6px",
  padding: "2px 6px",
  width: "100%",
  fontSize: "15px",
  color: "#000000",
  boxSizing: "border-box",
};

const datasetBoxStyle = {
  ...editableBoxStyle,
  width: "calc(100% - 30px)",
};



// Row component OUTSIDE to prevent recreation on every render
const Row = ({ label, name, type = "text", truncate = false, italic = false, localData, editMode, handleChange, users }) => {

  const {currentUser, loading} = useContext(AuthContext);

  const getUserNames = (ids) => {
      return ids.map(id => {
        const user = users.find(u => u.id === id);
        return user ? user.username : id;
        });
      };

  const value = localData[name] ?? "";
  const textClass = `font-[400] text-[16px] text-[#000000] ${
    italic ? "text-[#6b7280] italic" : ""
  }`;

  const baseNonEditable = [
    "updatedAt",
    "createdAt",
    "createdBy",
    "total_Images",
    "completed_Images"
  ];

  if (currentUser.role === "annotator") {
    baseNonEditable.push("assignedTo");
  }
  const nonEditable = baseNonEditable.includes(name);

  if (editMode && !nonEditable) {
    const boxStyle = name === "name" ? datasetBoxStyle : editableBoxStyle;

    if (name === "status") {
      return (
        <div className="grid grid-cols-[120px_1fr] gap-x-[8px] mb-[6px] items-center">
          <div className="font-[600] text-[16px] text-[#000000]">{label}:</div>
          <select
            value={value}
            onChange={(e) => handleChange(name, e.target.value)}
            style={{ ...editableBoxStyle, paddingLeft: "4px" }}
          >
            <option>Pending review</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </div>
      );
    }

    if (type === "textarea") {
      return (
        <div className="mt-[12px]">
          <div className="font-[600] text-[15px] text-[#000000] mb-[2px]">
            {label}:
          </div>
          <textarea
            value={value}
            onChange={(e) => handleChange(name, e.target.value)}
            style={{
              ...editableBoxStyle,
              minHeight: "80px",
              resize: "vertical",
            }}
          />
        </div>
      );
    }

    if (name === "assignedTo" ) {
      const assignedArray = Array.isArray(value) ? value : (value ? value.split(", ") : []);
      const options = users.map(u => ({
        value: u.id,
        label: `${u.username} (${u.role})`
      }));
      
      return (
        <div className="grid grid-cols-[120px_163px] gap-x-[8px] mb-[6px] items-center">
          <div className="font-[600] text-[16px] text-[#000000]">{label}:</div>
          <Select
            isMulti
            value={options.filter(opt => assignedArray.includes(opt.value))}
            onChange={(selected) => handleChange(name, selected.map(opt => opt.value))}
            options={options}
            styles={{
              
              control: (base, state) => ({
                ...base,
                ...editableBoxStyle,
                borderColor: state.isFocused ? "#66B8A6" : "#B3DCD7",
                boxShadow: state.isFocused ? "0 0 0 2px rgba(102, 184, 166, 0.3)" : "none",
                "&:hover": { borderColor: "#66B8A6" },
                minHeight: "36px",
                width: "100%",
              }),
              container: (base) => ({
                ...base,
                width: "100%",
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
                color: "#000",
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
                width: "100%",    
              }),
              placeholder: (base) => ({
                ...base,
                fontSize: "14px",
              }),
              
            }}
            placeholder="Select Users."
          />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-[120px_1fr] gap-x-[8px] mb-[6px] items-center">
        <div className="font-[600] text-[16px] text-[#000000]">{label}:</div>
        <input
          type={type}
          value={value}
          onChange={(e) => handleChange(name, e.target.value)}
          style={boxStyle}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[120px_1fr] gap-x-[8px] mb-[6px] items-start">
      <div className="font-[600] text-[16px] text-[#000000]">{label}:</div>

      {name === "description" ? (
        <p
          className="text-[14px] text-[#333333] border border-[#d1d5db]
                    p-[6px] rounded-[6px] bg-[#ffffff] h-[60px] overflow-y-auto"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {value || "No description available"}
        </p>
      ) : (
        <div
          className={`${textClass}`}
          style={{
            wordWrap: "break-word",    // lange woorden breken
            whiteSpace: "normal",      // tekst mag op meerdere regels
            overflowWrap: "anywhere",  // moderne variant, breekt ook lange strings
          }}
        >

          {name === "assignedTo" && Array.isArray(value)
            ? getUserNames(value).join(", ")
            : name === "createdAt" || name === "updatedAt"
            ? new Date(value).toLocaleDateString("en-CA")
            : value}
        </div>
      )}
    </div>
  );
};

// Dataset component with access to ref
const DatasetWithRef = ({ dataset, editMode, localDataRef, users }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localData, setLocalData] = useState(dataset);
  const navigate = useNavigate();


  useEffect(() => {
    setLocalData(dataset);
    localDataRef.current = dataset;
  }, [dataset, localDataRef]);

  useEffect(() => {
    localDataRef.current = localData;
  }, [localData, localDataRef]);

  const toggleDataset = () => setIsExpanded((s) => !s);

  const handleChange = useCallback((field, value) => {
    setLocalData((prev) => {
      const updated = { ...prev, [field]: value };
      localDataRef.current = updated;
      return updated;
    });
  }, [localDataRef]);

  const goToImages = () => {
    //save the selecteddataset in localstorage
    localStorage.setItem("selectedDataset", JSON.stringify(localData));

    navigate("/imageList")
  }

  

  return (
    <div
      className="w-[320px] rounded-[14px] shadow-md overflow-hidden"
      style={{ backgroundColor: "rgba(229, 249, 247, 0.9)" }}
    >
      <div className="p-[14px] pb-[8px] relative">
        <Row label="Dataset" name="name" truncate localData={localData} editMode={editMode} handleChange={handleChange} />
        <Row label="Status" name="status" localData={localData} editMode={editMode} handleChange={handleChange} />
        <Row label="Images" name="total_Images" type="number" localData={localData} editMode={editMode} handleChange={handleChange} />
        <Row label="Completed Images" name="completed_Images" type="number" localData={localData} editMode={editMode} handleChange={handleChange} />

        {!editMode && (
          <div className="flex justify-between items-center mt-[6px]">
            {/* 👇 Linker knop naar images */}
            <button
              onClick={goToImages}
              className="flex items-center gap-[4px] px-[10px] py-[4px] bg-[#66B8A6] text-white text-[14px] rounded-[8px] hover:bg-[#58a090] transition"
            >
              <img
                src="src/assets/gallery.png" // bijvoorbeeld een icoon
                alt="Images"
                className="w-[14px] h-[14px]"
              />
              Imagelist
            </button>

            {/* 👉 Rechter 'Start' knop */}
            <div className="flex items-center cursor-pointer hover:opacity-80 transition">
              <span className="text-[16px] font-[500] text-[#000000] mr-[4px]">
                Start
              </span>
              <img
                src="src/assets/pencil.png"
                alt="Edit"
                className="w-[16px] h-[16px] mb-[2px]"
              />
            </div>
          </div>
        )}

      </div>

      {isExpanded && (
        <div className="px-[14px] pb-[12px] border-t border-[#d1d5db] pt-[10px]">
          <Row label="Created by" name="createdBy" truncate localData={localData} editMode={editMode} handleChange={handleChange} />
          <Row label="Assigned to" name="assignedTo" truncate localData={localData} editMode={editMode} handleChange={handleChange} users ={users}/>
          <Row label="Created at" name="createdAt" localData={localData} editMode={editMode} handleChange={handleChange} />
          <Row label="Last updated" name="updatedAt" localData={localData} editMode={editMode} handleChange={handleChange} />
          <Row label="Date of collection" name="date_of_collection" italic localData={localData} editMode={editMode} handleChange={handleChange} />
          <Row label="Location" name="location_of_collection" italic localData={localData} editMode={editMode} handleChange={handleChange} />
          <Row label="Assignment description" name="description" type="textarea" localData={localData} editMode={editMode} handleChange={handleChange} />
        </div>
      )}

      <div
        className="flex justify-center py-[4px] cursor-pointer transition-all duration-300"
        style={{ backgroundColor: "#B3DCD7" }}
        onClick={toggleDataset}
      >
        <ChevronUp
          className={`w-[20px] h-[20px] text-[#374151] transition-transform duration-300 ${
            isExpanded ? "rotate-0" : "rotate-180"
          }`}
        />
      </div>
    </div>
  );
};

// Wrapper component to expose local state via ref
const DatasetWrapper = React.forwardRef(({ dataset, editMode, users}, ref) => {
  const localDataRef = useRef(dataset);
  
  React.useImperativeHandle(ref, () => ({
    getLocalData: () => localDataRef.current
  }));

  return (
    <DatasetWithRef 
      dataset={dataset} 
      editMode={editMode} 
      localDataRef={localDataRef}
      users={users}
    />
  );
});


export default DatasetWrapper