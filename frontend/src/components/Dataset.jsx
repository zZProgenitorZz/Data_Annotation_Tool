import React, { useState } from "react";


const datasetDetails = {
  id: "Dataset1182",
  status: "Completed",
  fileName: "SchistoH_urine.zip",
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
};


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

const Dataset = ({ dataset = datasetDetails }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleDataset = () => setIsExpanded(!isExpanded);

  const DetailRow = ({ label, value, italic = false }) => (
    <div className="grid grid-cols-[120px_1fr] gap-x-[8px] mb-[4px]">
      <div className="font-[600] text-[16px] text-[#000000]">{label}:</div>
      <div
        className={`font-[400] text-[16px] text-[#000000] ${
          italic ? "text-[#6b7280] italic" : ""
        } break-words`}
      >
        {value}
      </div>
    </div>
  );

  return (
    <div
      className="w-[320px] rounded-[14px] shadow-md overflow-hidden"
      style={{ backgroundColor: "rgba(229, 249, 247, 0.9)" }}
    >
      {/* First attributes */}
      <div className="p-[14px] pb-[8px]">
        <DetailRow label="Dataset" value={dataset.id} />
        <DetailRow label="Status" value={dataset.status} />
        <DetailRow label="File Name" value={dataset.fileName} />
        <DetailRow label="Images" value={dataset.images} />

        {/* Start + pencil icon */}
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
      </div>

      {/* Collapsible Details */}
      {isExpanded && (
        <div className="px-[14px] pb-[12px] border-t border-[#d1d5db] pt-[10px]">
          <DetailRow label="Created by" value={dataset.createdBy} />
          <DetailRow label="Assigned to" value={dataset.assignedTo} />
          <DetailRow label="Reviewed by" value={dataset.reviewedBy} />
          <DetailRow label="Created at" value={dataset.createdAt} />
          <DetailRow label="Last updated" value={dataset.lastUpdated} />
          <DetailRow
            label="Date of collection"
            value={dataset.dateOfCollection}
            italic
          />
          <DetailRow label="Location" value={dataset.location} italic />

          <div className="mt-[12px]">
            <div className="font-[600] text-[15px] text-[#000000] mb-[2px]">
              Assignment description:
            </div>
            <p className="text-[14px] text-[#333333] border border-[#d1d5db] p-[6px] rounded-[6px] bg-[#ffffff] h-[60px] overflow-y-auto">
              {dataset.description}
            </p>
          </div>
        </div>
      )}

      {/* Toggle Footer */}
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

export const datasets = [datasetDetails];
export default Dataset;
