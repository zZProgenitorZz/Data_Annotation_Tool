import React, {useState, useEffect} from "react";
import ImageUploader from "../../components/ImageUploader";



const ImagesList = () => {

    
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
          List of Dataset Images
        </h1>
      </div>
      <div>
        <ImageUploader/>
      </div>
    </div>
    )
}



export default ImagesList;