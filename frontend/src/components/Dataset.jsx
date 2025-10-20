import React, { useState, useEffect } from "react";

export const initialDatasets = [
  {
    id: "Dataset1182",
    status: "Completed",
    fileName: "NameIsVeryLongLikeThis_ExampleDataset.zip",
    images: 500,
    createdBy: "anthony",
    assignedTo: "john",
    reviewedBy: "jim",
    createdAt: "1/5/2023 12:35 PM",
    lastUpdated: "1/20/2023 11:04 AM",
    dateOfCollection: "N/A",
    location: "N/A",
    description:
      "Review all 500 images for Schistosoma haematobium eggs in urine samples and categorize.",
    datasetName: "Dataset1182",
  },
  {
    id: "Dataset1183",
    status: "In Progress",
    fileName: "Dataset1183.zip",
    images: 400,
    createdBy: "anthony",
    assignedTo: "john",
    reviewedBy: "jim",
    createdAt: "2/5/2023",
    lastUpdated: "2/10/2023",
    dateOfCollection: "N/A",
    location: "N/A",
    description: "Review 400 images",
    datasetName: "Dataset1183",
  },
  {
    id: "Dataset1184",
    status: "Pending review",
    fileName: "Dataset1184.zip",
    images: 250,
    createdBy: "anthony",
    assignedTo: "john",
    reviewedBy: "jim",
    createdAt: "3/5/2023",
    lastUpdated: "3/10/2023",
    dateOfCollection: "N/A",
    location: "N/A",
    description: "Review 250 images",
    datasetName: "Dataset1184",
  },
  {
    id: "Dataset0320",
    status: "Completed",
    fileName: "Dataset0320.zip",
    images: 500,
    createdBy: "anthony",
    assignedTo: "john",
    reviewedBy: "jim",
    createdAt: "4/5/2023",
    lastUpdated: "4/10/2023",
    dateOfCollection: "N/A",
    location: "N/A",
    description: "Review 500 images",
    datasetName: "Dataset0320",
  },
];

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

const Dataset = ({ dataset, editMode = false, onFieldChange = () => {} }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localData, setLocalData] = useState(dataset); 

 

  const toggleDataset = () => setIsExpanded((s) => !s);


  const handleChange = (field, value) => {
    setLocalData((prev) => ({ ...prev, [field]: value }));
    onFieldChange(dataset.id, field, value);
  };

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

  const Row = ({ label, name, type = "text", truncate = false, italic = false }) => {
    const value = localData[name] ?? "";
    const textClass = `font-[400] text-[16px] text-[#000000] ${
      italic ? "text-[#6b7280] italic" : ""
    }`;

    const nonEditable = ["lastUpdated", "createdAt", "createdBy"].includes(name);

    if (editMode && !nonEditable) {
      const boxStyle = name === "datasetName" ? datasetBoxStyle : editableBoxStyle;

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
          <div className="grid grid-cols-[120px_1fr] gap-x-[8px] mb-[8px] items-start">
            <div className="font-[600] text-[16px] text-[#000000]">{label}:</div>
            <textarea
              value={value}
              onChange={(e) => handleChange(name, e.target.value)}
              style={{
                ...editableBoxStyle,
                minHeight: "64px",
                resize: "vertical",
              }}
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
      <div className="grid grid-cols-[120px_1fr] gap-x-[8px] mb-[6px] items-center">
        <div className="font-[600] text-[16px] text-[#000000]">{label}:</div>
        <div
          className={`${textClass} ${truncate ? "truncate" : ""}`}
          style={truncate ? { maxWidth: "150px" } : {}}
        >
          {value}
        </div>
      </div>
    );
  };

  return (
    <div
      className="w-[320px] rounded-[14px] shadow-md overflow-hidden"
      style={{ backgroundColor: "rgba(229, 249, 247, 0.9)" }}
    >
      <div className="p-[14px] pb-[8px] relative">
        <Row label="Dataset" name="datasetName" truncate />
        <Row label="File Name" name="fileName" truncate />
        <Row label="Status" name="status" />
        <Row label="Images" name="images" type="number" />

        {!editMode && (
          <div className="flex justify-end items-center mt-[6px] cursor-pointer hover:opacity-80 transition">
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

      {isExpanded && (
        <div className="px-[14px] pb-[12px] border-t border-[#d1d5db] pt-[10px]">
          <Row label="Created by" name="createdBy" truncate />
          <Row label="Assigned to" name="assignedTo" truncate />
          <Row label="Reviewed by" name="reviewedBy" truncate />
          <Row label="Created at" name="createdAt" />
          <Row label="Last updated" name="lastUpdated" />
          <Row label="Date of collection" name="dateOfCollection" italic />
          <Row label="Location" name="location" italic />

          <div className="mt-[12px]">
            <div className="font-[600] text-[15px] text-[#000000] mb-[2px]">
              Assignment description:
            </div>
            {editMode ? (
              <textarea
                value={localData.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                style={{
                  ...editableBoxStyle,
                  minHeight: "80px",
                  resize: "vertical",
                }}
              />
            ) : (
              <p className="text-[14px] text-[#333333] border border-[#d1d5db] p-[6px] rounded-[6px] bg-[#ffffff] h-[60px] overflow-y-auto">
                {localData.description}
              </p>
            )}
          </div>
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

export default Dataset;
