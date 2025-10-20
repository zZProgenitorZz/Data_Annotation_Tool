import React from "react";
import Dataset, { datasets } from "../../components/Dataset";

const Overview = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#44F3C9] to-[#3F7790] flex flex-col">

      {/* Header */}
      <div
        className="relative flex items-end justify-center h-[70px] flex-shrink-0"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.31)" }}
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

      {/* Scrollable datasets area */}
      <div className="flex-grow overflow-auto px-[40px] pt-[40px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[24px] justify-items-start">
          {datasets.map((dataset) => (
            <Dataset key={dataset.id} dataset={dataset} />
          ))}
        </div>
      </div>

      {/* Footer: divider + buttons */}
      <div className="flex-shrink-0 px-[40px] pb-[40px]">
        <div className="h-[1px] bg-[#000000] opacity-20 mb-[20px]" />
        <div className="flex justify-center gap-[200px]">
          <button className="h-[50px] px-[16px] whitespace-nowrap bg-[#E5F9F7] text-[#000000] text-[20px] font-[600] italic rounded-[10px] border-[#CCCCCC] hover:brightness-95 active:brightness-80 transition">
            View Actions
          </button>

          <button className="h-[50px] px-[16px] whitespace-nowrap bg-[#E5F9F7] text-[#000000] text-[20px] font-[600] italic rounded-[10px] border-[#CCCCCC] hover:brightness-95 active:brightness-80 transition">
            Upload Dataset
          </button>

          <button className="h-[50px] px-[16px] bg-[#E5F9F7] text-[#000000] text-[20px] font-[600] italic rounded-[10px] border-[#CCCCCC] hover:brightness-95 active:brightness-80 transition">
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default Overview;
