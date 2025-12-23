import React, { useState, useEffect, useCallback, useRef, useContext } from "react";
import Select from "react-select";
import { AuthContext } from "../../components/AuthContext";
import { useNavigate } from "react-router-dom";
import {extractUserId, parseAssignedTo, extractUserRole, buildAssignedTo} from "../../utils/utils"
import Export from "../../components/Export.jsx";
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

  const getUserNames = (entries) => {
    if (!entries) return "";

    const list = Array.isArray(entries) ? entries : [entries];

    return list
      .map((entry) => {
        const id = extractUserId(entry);
        const user = Array.isArray(users)
          ? users.find((u) => String(u.id) === id)
          : null;
        return user ? user.username : id;
      })
      .join(", ");
  };

  const getUserName = (id) => {
    if (!id) return "";

    if (currentUser && String(currentUser.id) === String(id)) {
      return currentUser.username;
    }

    if (!Array.isArray(users) || users.length === 0) {
      return id;
    }

    const user = users.find((u) => String(u.id) === String(id));
      return user ? user.username : "Admin";
    };
  
  const key = `datasetAssigned:${localData.id}`;
  const stored = localStorage.getItem(key);
  const isAnnotators = stored ? JSON.parse(stored) : {};

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

  if (!loading && isAnnotators[currentUser.id]){
   if (isAnnotators[currentUser.id] === "annotator") {
      baseNonEditable.push("assignedTo");
    } 
  }
  const nonEditable = baseNonEditable.includes(name);

  const isOwner = 
    !loading &&
    currentUser && 
    localData?.createdBy && 
    localData.createdBy === currentUser.id;

  const isAdmin = currentUser.role === "admin";
  
  

  const isAssigned =
    !loading && 
    currentUser &&
    Array.isArray(localData?.assignedTo) &&
    localData.assignedTo.map(extractUserId).includes(String(currentUser.id));

  const canEditThisRow =
    editMode && !nonEditable && (isOwner || isAssigned || isAdmin);


  if (canEditThisRow) {
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
      const rawAssigned = Array.isArray(value) 
      ? value 
      : value
      ? [value]
      : [];

       // Maak er nette objecten van: {id, role}
      const assignedInfo = rawAssigned
        .map((entry) => ({
          id: extractUserId(entry),
          role: extractUserRole(entry),
        }))
        .filter((item) => item.id); // filter lege entries
          
      const assignedIds = assignedInfo.map((item) => item.id);

      // Alle users als opties voor de hoofd-select
      const options = Array.isArray(users)
        ? users.map((u) => ({
            value: String(u.id),
            label: u.username,
          }))
          : [];

      const roleOptions = [
        { value: "annotator", label: "Annotator" },
        { value: "reviewer", label: "Reviewer" },
      ];

      const selectedOptions = options.filter((opt) =>
        assignedIds.includes(opt.value)
      );

      // Als de userlijst in de multi-select verandert (toevoegen/verwijderen)
      const handleUserSelectChange = (selected) => {
        const selectedIds = (selected || []).map((opt) => opt.value);

        const updatedAssignedInfo = selectedIds.map((id) => {
          // probeer bestaande info (dus bestaande role) te behouden
          const existing = assignedInfo.find((info) => info.id === id);
          if (existing) return existing;

          const user = users.find((u) => String(u.id) === id);
          // default rol: user.role of anders "annotator"
          return {
            id,
            role: user?.role || "annotator",
          };
        });
          // Bouw weer de "id - role" strings voor localData
        const newValue = updatedAssignedInfo.map((info) =>
          info.role ? `${info.id} - ${info.role}` : info.id
        );

        handleChange(name, newValue);
      };
      
      // Als de rol per user wordt aangepast
      const handleRoleChange = (userId, newRole) => {
        const updatedAssignedInfo = assignedInfo.map((info) =>
          info.id === userId ? { ...info, role: newRole } : info
        );

        const newValue = updatedAssignedInfo.map((info) =>
          info.role ? `${info.id} - ${info.role}` : info.id
        );

        handleChange(name, newValue);
      };

      return (
        <div className="grid grid-cols-[120px_163px] gap-x-[8px] mb-[6px] items-center">
          <div className="font-[600] text-[16px] text-[#000000]">{label}:</div>
          <Select
            isMulti
            options={options}
            value={selectedOptions}
            onChange={handleUserSelectChange}
            
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
         
          />
          {/* Hier: per geselecteerde user een rol-select */}
          <div className="mt-2 space-y-2">
            {assignedInfo.map((item) => {
              const userOption = options.find(
                (opt) => opt.value === item.id
              );
              const displayName = userOption?.label || item.id;

              const selectedRole =
                roleOptions.find((opt) => opt.value === item.role) || null;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2"
                >
                  {/* Naam van de user */}
                  <span className="min-w-[129px] text-sm text-black">
                    {displayName}
                  </span>

                  {/* Select voor rollen (Annotator/Reviewer) */}
                  <Select
                    
                    options={roleOptions}
                    value={selectedRole}
                    onChange={(option) => {
                      handleRoleChange(item.id, option?.value || null)
                    }}
                    placeholder="Select roles"
                    styles={{
                      control: (base) => ({
                        ...base,
                        maxHeight: "12px",
                        minWidth: "162px",
                        borderColor: "#D1D5DB",
                      }),
                      placeholder: (base) => ({
                        ...base,
                        fontSize: "12px",
                      }),
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    if (name === "date_of_collection") {
      return (
        <div className="grid grid-cols-[120px_1fr] gap-x-[8px] mb-[6px] items-center">
          <div className="font-[600] text-[16px] text-[#000000]">{label}:</div>
          <input
            type="date"
            value={value }
            onChange={(e) => {
              const newValue = e.target.value;

              if (!newValue) {
                return;
              }
              handleChange(name, newValue);
            }}
            style={boxStyle}
          />
      </div>
      )
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

          {name === "assignedTo"
            ? getUserNames(value) // value kan array of string zijn, helper regelt de rest
            : name === "createdBy"
            ? getUserName(value)
            : name === "createdAt" || name === "updatedAt" || name === "date_of_collection"
            ? new Date(value).toLocaleDateString("nl-NL")
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
  const [showExport, setShowExport] = useState (false);

  const {currentUser, loading, authType} = useContext(AuthContext);


  useEffect(() => {
    setLocalData(dataset);
    localDataRef.current = dataset;
  }, [dataset, localDataRef]);

  useEffect(() => {
    localDataRef.current = localData;
  }, [localData, localDataRef]);

  const isOwner = 
    !loading &&
    currentUser &&
    localData?.createdBy &&
    localData.createdBy === currentUser.id;

  const isAdmin = currentUser.role === "admin";

  const isAssigned =
    !loading &&
    currentUser &&
    Array.isArray(localData?.assignedTo) &&
    localData.assignedTo.map((entry) => extractUserId(entry)).includes(String(currentUser.id));

    const canStart = isOwner || isAssigned || isAdmin;

 
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

  const goToAnnotations = () =>{
    localStorage.setItem("selectedDataset", JSON.stringify(localData));

    navigate("/annotation")
  }

  const goToExport = () => {
    setShowExport(true);
  }
  

 


  return (
    <>
      <div
        className="w-[320px] rounded-[14px] shadow-md overflow-hidden"
        style={{ backgroundColor: "rgba(229, 249, 247, 0.9)" }}
      >
        <div className="p-[14px] pb-[8px] relative">
          <Row label="Dataset" name="name" truncate localData={localData} editMode={editMode} handleChange={handleChange} />
          <Row label="Status" name="status" localData={localData} editMode={editMode} handleChange={handleChange} />
          <Row label="Images" name="total_Images" type="number" localData={localData} editMode={editMode} handleChange={handleChange} />
          <Row label="Completed" name="completed_Images" type="number" localData={localData} editMode={editMode} handleChange={handleChange} />

          {!editMode && (
            <div className="flex justify-between items-center mt-[6px]">

{/* Linker knop naar images */}
<button
  onClick={goToImages}
  className="h-[34px] px-[12px] inline-flex items-center gap-[6px] rounded-full border transition active:scale-[0.98]"
  style={{
    backgroundColor: "rgba(255,255,255,0.28)",
    borderColor: "rgba(0,0,0,0.14)",
    color: "rgba(0,0,0,0.78)",
    cursor: "pointer",
    transform: "translateY(0px)",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.45)";
    e.currentTarget.style.borderColor = "rgba(0,0,0,0.22)";
    e.currentTarget.style.transform = "translateY(-1px)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.28)";
    e.currentTarget.style.borderColor = "rgba(0,0,0,0.14)";
    e.currentTarget.style.transform = "translateY(0px)";
  }}
>
  Image List
</button>

{/* MIDDEN knop */}
<button
  onClick={goToExport}
  className="h-[34px] px-[16px] inline-flex items-center justify-center rounded-full border transition active:scale-[0.98]"
  style={{
    backgroundColor: "rgba(255,255,255,0.28)",
    borderColor: "rgba(0,0,0,0.14)",
    color: "rgba(0,0,0,0.78)",
    cursor: "pointer",
    transform: "translateY(0px)",
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.45)";
    e.currentTarget.style.borderColor = "rgba(0,0,0,0.22)";
    e.currentTarget.style.transform = "translateY(-1px)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.28)";
    e.currentTarget.style.borderColor = "rgba(0,0,0,0.14)";
    e.currentTarget.style.transform = "translateY(0px)";
  }}
>
  Export
</button>



          

              {/*  Rechter 'Start' knop */}
              {canStart && (
              <div className="flex items-center cursor-pointer hover:opacity-80 transition"
              onClick ={goToAnnotations}>
                <span className="text-[16px] font-[500] text-[#000000] mr-[4px]">
                  Start
                </span>
                <img
                  src="src/assets/pencil.png"
                  alt="Edit"
                  className="w-[16px] h-[16px] mb-[2px]"
                />
              </div>
              )}
            </div>
          )}

        </div>

        {isExpanded && (
          <div className="px-[14px] pb-[12px] border-t border-[#d1d5db] pt-[10px]">
            <Row label="Created by" name="createdBy" truncate localData={localData} editMode={editMode} handleChange={handleChange} users={users}/>
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
      {showExport && (
        <Export
          dataset={localData}   // of jouw dataset-object
          authType={authType}   // "user" of "guest"
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  );
};

// Wrapper component to expose local state via ref
const DatasetWrapper = React.forwardRef(({ dataset, editMode, users}, ref) => {
  const localDataRef = useRef(dataset);
  const assignedRolesRef = useRef({});

  useEffect(() => {
    if (!dataset) return;

    // sync de ref met de nieuwste prop
    localDataRef.current = dataset;

    // maak map { userId: role }
    const map = parseAssignedTo(dataset.assignedTo);
    assignedRolesRef.current = map;

    // eventueel opslaan in localStorage per datasetId
    try {
      const key = `datasetAssigned:${dataset.id}`;
      localStorage.setItem(key, JSON.stringify(map));
    } catch (e) {
      console.error("Failed to write assigned users to localStorage", e);
    }
  }, [dataset]);
  
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