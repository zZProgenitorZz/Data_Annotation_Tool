import { useNavigate, useParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import aidxLogo from "../../assets/aidxlogo.png";
import backIcon from "../../assets/back-button-icon.png";
import undoIcon from "../../assets/undo.png";
import redoIcon from "../../assets/redo.png";
import slider from "../../assets/slider.jpg";

import ImageDeletion from "./components/ImageDeletion";

// Tool icons
import boundingBoxTool from "../../assets/bounding-box-tool.png";
import polygonTool from "../../assets/polygon-tool.png";
import pencilTool from "../../assets/pencil-tool.png";
import ellipseTool from "../../assets/ellipse-tool.png";
import magicWandTool from "../../assets/magic-wand-tool.png";
import selectedBg from "../../assets/selected.png";

// Category icons
import selectCategoryIcon from "../../assets/select-category.png";
import addNewCategoryIcon from "../../assets/add-new-category.png";

// File List icons
import searchInputField from "../../assets/search-input-field.png";
import searchFileListIcon from "../../assets/search-file-list.png";

// Feedback Request
import feedbackRequestBtn from "../../assets/request-feedback.png";
import FeedbackRequest from "./components/FeedbackRequest";

// Save/Prev/Next/Delete icons
import saveImageIcon from "../../assets/save-image.png";
import prevImageIcon from "../../assets/previous-image.png";
import nextImageIcon from "../../assets/next-image.png";
import deleteImageIcon from "../../assets/delete-image.png";

// Toasts (Pop-ups)
import Toast from "./components/Toast";

// Microscope images
import stool001 from "../../assets/stool/001.jpg";
import stool002 from "../../assets/stool/002.jpg";
import stool003 from "../../assets/stool/003.jpg";
import stool004 from "../../assets/stool/004.jpg";
import stool005 from "../../assets/stool/005.jpg";
import stool006 from "../../assets/stool/006.jpg";
import stool007 from "../../assets/stool/007.jpg";
import stool008 from "../../assets/stool/008.jpg";
import stool009 from "../../assets/stool/009.jpg";
import stool010 from "../../assets/stool/010.jpg";
import stool011 from "../../assets/stool/011.jpg";



const AnnotationPage = () => {
  const navigate = useNavigate();
  const { datasetName } = useParams();

  const [selectedTool, setSelectedTool] = useState(null);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [categories, setCategories] = useState([
    "Schistosoma haematobium",
    "Schistosoma mansoni",
    "Ascaris lumbricoides",
    "Brugia malayi",
  ]);
  const [selectedCategory, setSelectedCategory] = useState("Schistosoma mansoni");
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const categoryButtonRef = useRef(null);
  const popupRef = useRef(null);
  const rootRef = useRef(null);
  const fileListRef = useRef(null);

  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  const [showImageDeletion, setShowImageDeletion] = useState(false);

  // === File List state ===
    const [files] = useState([
    "stool/001.jpg",
    "stool/002.jpg",
    "stool/003.jpg",
    "stool/004.jpg",
    "stool/005.jpg",
    "stool/006.jpg",
    "stool/007.jpg",
    "stool/008.jpg",
    "stool/009.jpg",
    "stool/010.jpg",
    "stool/011.jpg",
  ]);

    const IMAGE_MAP = {
    "stool/001.jpg": stool001,
    "stool/002.jpg": stool002,
    "stool/003.jpg": stool003,
    "stool/004.jpg": stool004,
    "stool/005.jpg": stool005,
    "stool/006.jpg": stool006,
    "stool/007.jpg": stool007,
    "stool/008.jpg": stool008,
    "stool/009.jpg": stool009,
    "stool/010.jpg": stool010,
    "stool/011.jpg": stool011,
  };


  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Current image / total
  // Als er een selectedFile is, dan index + 1, anders return null
  const currentIndex = selectedFile ? files.indexOf(selectedFile) + 1 : 0;
  const totalImages = files.length;

  // auto-select first image
  useEffect(() => {
    if (!selectedFile && files.length > 0){
      setSelectedFile(files[0]);
    
    }
  }, [selectedFile, files]);

  const handleNextImage = () => {
    if (!selectedFile) return;
    const index = files.indexOf(selectedFile);
    if (index < files.length - 1) {
      setSelectedFile(files[index + 1]);
    }
  };

  const handlePrevImage = () => {
    if (!selectedFile) return;
    const index = files.indexOf(selectedFile);
    if (index > 0) {
      setSelectedFile(files[index - 1]);
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key == "ArrowRight") handleNextImage();
      if (e.key == "ArrowLeft") handlePrevImage();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
}, [selectedFile, files]);

useEffect(() => { 
  if (!selectedFile || !fileListRef.current) return;

  const rowElement = fileListRef.current.querySelector(
    `[data-file="${selectedFile}"]`

  );
  if (rowElement) {
    rowElement.scrollIntoView({
      block: "nearest",
      behavior: "instant",
    });
  }
}, [selectedFile]);

  const filteredFiles = files.filter((f) =>
    f.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const ROW_H = 24; // row height for file list
  const VISIBLE_ROWS = 7;

  // === Feedback Request popup state ===
  const [showFeedbackRequest, setShowFeedbackRequest] = useState(false);
  const [toast, setToast] = useState({message :"", type: "success"});



  const handleBackClick = () => navigate("/overview");
  const handleUndo = () => console.log("Undo clicked");
  const handleRedo = () => console.log("Redo clicked");
  const handleSelectTool = (toolId) =>
    setSelectedTool(toolId === selectedTool ? null : toolId);

  // position popup directly under the Category bar (anchored)
  const toggleCategoryPopup = () => {
    if (showCategoryPopup) {
      setShowCategoryPopup(false);
      return;
    }
    if (categoryButtonRef.current && rootRef.current) {
      const btnRect = categoryButtonRef.current.getBoundingClientRect();
      const rootRect = rootRef.current.getBoundingClientRect();
      setPopupPosition({
        top: btnRect.bottom - rootRect.top + 2,
        left: btnRect.left - rootRect.left + 1.5,
      });
      setShowCategoryPopup(true);
    }
  };

  const handleAddCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    setCategories((prev) => [...prev, name]);
    setSelectedCategory(name);
    setNewCategory("");
    setIsAdding(false);
  };

  // drag handlers (header-only)
  const onHeaderMouseDown = (e) => {
    if (!popupRef.current || !rootRef.current) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const rootRect = rootRef.current.getBoundingClientRect();
    const popupRect = popupRef.current.getBoundingClientRect();
    const offsetX = e.clientX - popupRect.left;
    const offsetY = e.clientY - popupRect.top;

    const handleMove = (ev) => {
      const newLeft = ev.clientX - rootRect.left - offsetX;
      const newTop = ev.clientY - rootRect.top - offsetY;
      setPopupPosition({ left: newLeft, top: newTop });
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "move";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      ref={rootRef}
      className="min-h-screen flex flex-col bg-gradient-to-b from-[#44F3C9] to-[#3F7790] relative select-none"
    >
      {/* === AiDx Logo === */}
      <div className="w-auto">
        <img
          src={aidxLogo}
          alt="AiDx Medical Logo"
          className="h-[40px] absolute top-[2px] left-[3px]"
        />
      </div>

      {/* === Outer container === */}
      <div className="flex flex-1 items-center justify-center px-[10px] mt-[35px] mb-[12px]">
        <div
          className="rounded-[3px] flex flex-col relative overflow-hidden"
          style={{
            width: "min(95vw, 1500px)",
            height: "calc(min(90vh, 860px) - 16px)",
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.10)",
            boxShadow: "0px 1px 4px rgba(0,0,0,0.25)",
          }}
        >
          {/* === Top bar === */}
          <div
            style={{
              height: "30px",
              backgroundColor: "#F3F3F3",
              borderBottom: "1px solid rgba(0,0,0,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Back Button */}
            <button
              onClick={handleBackClick}
              aria-label="Back to Datasets"
              className="h-[30px] w-[30px] absolute left-[2px] hover:opacity-80 transition-opacity duration-200"
              style={{ background: "none", border: "none", padding: 0 }}
            >
              <img
                src={backIcon}
                alt=""
                className="h-full w-full cursor-pointer"
                draggable="false"
              />
            </button>

            {/* Dataset Title */}
            <span
              style={{
                color: "#000000",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "default",
                userSelect: "text",
              }}
            >
              Dataset: {decodeURIComponent(datasetName || "Unknown")}
            </span>

            {/* Current Image Indicator */}
            <span
              style={{
                position: "absolute",
                left: "129px",
                width: "100px",
                display: "flex",
                textAlign: "center",
                color: "#4b55638b",
                fontSize: "16px",
                fontWeight: 500,
                userSelect: "none",
                whiteSpace: "nowrap",
              }}
            >
              Image: {currentIndex}/{totalImages}
            </span>

            {/* Undo / Redo */}
            <div className="absolute right-[162px] flex items-center">
              <button
                onClick={handleUndo}
                title="Undo"
                className="h-[26px] w-[26px] flex items-center justify-center"
                style={{ background: "none", border: "none", padding: 0 }}
              >
                <img
                  src={undoIcon}
                  alt=""
                  className="h-full w-full cursor-pointer hover:brightness-[0.85]"
                  draggable="false"
                />
              </button>

              <div
                style={{
                  width: "1px",
                  height: "20px",
                  backgroundColor: "#BDBDBD",
                  margin: "0 4px",
                }}
              />

              <button
                onClick={handleRedo}
                title="Redo"
                className="h-[26px] w-[26px] flex items-center justify-center"
                style={{ background: "none", border: "none", padding: 0 }}
              >
                <img
                  src={redoIcon}
                  alt=""
                  className="h-full w-full cursor-pointer hover:brightness-[0.85]"
                  draggable="false"
                />
              </button>
            </div>
          </div>

          {/* === Main area === */}
          <div
            className="flex flex-1 select-none"
            style={{
              display: "flex",
              height: "calc(100% - 30px)",
              backgroundColor: "#FFFFFF",
              userSelect: "none",
            }}
          >
            {/* === Image area === */}
            <div
              className="flex justify-center items-center"
              style={{
                flex: 1,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  aspectRatio: "4 / 3",
                  width: "100%",
                  maxWidth: "calc(100% - 160px)",
                  maxHeight: "100%",
                  backgroundColor: "#FFFFFF",
                  overflow: "hidden",
                  display: "flex",
                  paddingTop: "7px",
                  paddingBottom: "7px",
                  boxSizing: "border-box",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={selectedFile ? IMAGE_MAP[selectedFile] : null}
                  alt="Microscope View"
                  draggable="false"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            </div>

            {/* === Tools panel (RIGHT) === */}
            <div
              style={{
                width: "160px",
                backgroundColor: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                borderLeft: "1px solid rgba(0,0,0,0.10)",
                borderBottomRightRadius: "3px",
                position: "relative", // anchor for bottom elements
                userSelect: "none",
              }}
            >
              {/* Tools header */}
              <div
                style={{
                  height: "30px",
                  backgroundColor: "#EDEDED",
                  borderBottom: "1px solid rgba(0,0,0,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "20px",
                  color: "#000000",
                }}
              >
                Tools
              </div>

              {/* Tools row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "4px 8px 0 8px",
                  gap: "4px",
                  userSelect: "none",
                }}
              >
                {[boundingBoxTool, polygonTool, pencilTool, ellipseTool].map(
                  (icon, i) => {
                    const ids = ["bounding", "polygon", "pencil", "ellipse"];
                    const id = ids[i];
                    return (
                      <div
                        key={id}
                        onClick={() => handleSelectTool(id)}
                        style={{
                          width: "34px",
                          height: "34px",
                          backgroundImage:
                            selectedTool === id ? `url(${selectedBg})` : "none",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          borderRadius: "6px",
                          userSelect: "none",
                        }}
                      >
                        <img
                          src={icon}
                          alt={id}
                          draggable="false"
                          style={{
                            width: id === "bounding" ? "22px" : "20px",
                            height: id === "bounding" ? "22px" : "20px",
                            objectFit: "contain",
                            imageRendering: "crisp-edges",
                            pointerEvents: "none",
                            userSelect: "none",
                          }}
                        />
                      </div>
                    );
                  }
                )}
              </div>

              {/* Magic wand */}
              <div
                onClick={() => handleSelectTool("magicwand")}
                style={{
                  marginTop: "2px",
                  marginLeft: "8px",
                  width: "34px",
                  height: "34px",
                  backgroundImage:
                    selectedTool === "magicwand" ? `url(${selectedBg})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  borderRadius: "6px",
                  userSelect: "none",
                }}
              >
                <img
                  src={magicWandTool}
                  alt="Magic Wand"
                  draggable="false"
                  style={{
                    width: "22px",
                    height: "22px",
                    objectFit: "contain",
                    imageRendering: "crisp-edges",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                />
              </div>

              {/* Separator line */}
              <div
                style={{
                  height: "1px",
                  backgroundColor: "rgba(0,0,0,0.10)",
                  width: "100%",
                  marginTop: "3px",
                }}
              />

              {/* Category */}
              <div
                ref={categoryButtonRef}
                onClick={toggleCategoryPopup}
                style={{
                  height: "30px",
                  backgroundColor: "#EDEDED",
                  borderBottom: "1px solid rgba(0,0,0,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingRight: "14px",
                  fontWeight: 700,
                  fontSize: "20px",
                  color: "#000000",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                Category
                <img
                  src={selectCategoryIcon}
                  alt="Dropdown"
                  style={{
                    position: "absolute",
                    right: "21px",
                    width: "14px",
                    height: "14px",
                    transition: "transform 0.2s ease",
                    transform: showCategoryPopup ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </div>

              {/* File List Header */}
              <div
                style={{
                  height: "30px",
                  backgroundColor: "#EDEDED",
                  borderBottom: "1px solid rgba(0,0,0,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: "#000000",
                  cursor: "default",
                  fontSize: "20px",
                }}
              >
                File List
              </div>

              {/* === Search Bar === */}
              <div style={{ padding: "0px 8px" }}>
                <div
                  style={{
                    position: "relative",
                    height: "20px",
                    margin: "5px 3px 0px 3px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Background */}
                  <img
                    src={searchInputField}
                    alt="Search Field"
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      zIndex: 0,
                      pointerEvents: "none",
                    }}
                  />
                  {/* Icon */}
                  <img
                    src={searchFileListIcon}
                    alt="Search Icon"
                    style={{
                      position: "absolute",
                      right: "6px",
                      width: "14px",
                      height: "14px",
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  />
                  {/* Input */}
                  <input
                    type="text"
                    placeholder="Search Files"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filteredFiles.length > 0)
                        setSelectedFile(filteredFiles[0]);
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: "10px",
                      paddingLeft: "10px",
                      paddingRight: "20px",
                      color: "#6F6F6F",
                      zIndex: 2,
                    }}
                  />
                </div>
              </div>

              {/* === File List === */}
              <div style={{ 
                padding: "4px 6px 0 6px",
                display: "flex",
                flexDirection: "column",
                height: `${ROW_H * VISIBLE_ROWS}px`,
                }}>
                <div
                  ref={fileListRef}
                  className="datasets-scroll"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: "2px",
                    background: "#FFF",
                    boxSizing: "border-box",
                  }}
                >
                  {filteredFiles.length > 0 ? (
                    filteredFiles.map((file) => (
                      <div
                        key={file}
                        data-file={file}
                        onClick={() => setSelectedFile(file)}
                        style={{
                          height: `${ROW_H}px`,
                          lineHeight: `${ROW_H}px`,
                          padding: "0 8px",
                          fontSize: "12.5px",
                          cursor: "pointer",
                          backgroundColor:
                            selectedFile === file ? "#D9D9D9" : "transparent",
                          borderBottom: "1px solid rgba(0,0,0,0.04)",
                          userSelect: "none",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={file}
                      >
                        {file}
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        height: `${ROW_H}px`,
                        lineHeight: `${ROW_H}px`,
                        padding: "0 8px",
                        fontSize: "12px",
                        color: "#6F6F6F",
                        fontStyle: "italic",
                      }}
                    >
                      No matches
                    </div>
                  )}
                </div>
              </div>

              {/* ---- Bottom area anchored inside tools panel ---- */}

              {/* Split line ABOVE the bottom icons */}
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: "50px",
                  width: "160px",
                  height: "1px",
                  backgroundColor: "rgba(0,0,0,0.15)",
                  pointerEvents: "none",
                }}
              />

              {/* Feedback Request Button (inside tools panel) */}
              <button
                onClick={() => setShowFeedbackRequest(true)}
                style={{
                  position: "absolute",
                  right: "3px",
                  bottom: "60px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "transform 0.15s ease",
                  zIndex: 5,
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.transform = "scale(1.03)")
                }
                onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <img
                  src={feedbackRequestBtn}
                  alt="Feedback Request"
                  style={{
                    width: "40px",
                    height: "auto",
                    display: "block",
                    imageRendering: "crisp-edges",
                  }}
                  draggable="false"
                />
              </button>

              {/* Bottom Action Buttons (Save, Prev, Next, Delete) */}
              <div
                style={{
                  position: "absolute",
                  right: "1.5px",
                  bottom: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  zIndex: 4,
                }}
              >
                {/* Save Image */}
                <img
                  src={saveImageIcon}
                  alt="Save"
                  draggable="false"
                  onClick={() => console.log("Save clicked")}
                  style={{
                    width: "36px",
                    height: "36px",
                    cursor: "pointer",
                    transition: "filter 0.15s ease",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.filter = "brightness(0.9)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.filter = "brightness(1)")
                  }
                />

                {/* Previous Image */}
                <img
                  src={prevImageIcon}
                  alt="Previous"
                  draggable="false"
                  onClick={handlePrevImage}
                  style={{
                    width: "36px",
                    height: "36px",
                    cursor: "pointer",
                    transition: "filter 0.15s ease",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.filter = "brightness(0.9)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.filter = "brightness(1)")
                  }
                />

                {/* Next Image */}
                <img
                  src={nextImageIcon}
                  alt="Next"
                  draggable="false"
                  onClick={handleNextImage}
                  style={{
                    width: "36px",
                    height: "36px",
                    cursor: "pointer",
                    transition: "filter 0.15s ease",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.filter = "brightness(0.9)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.filter = "brightness(1)")
                  }
                />

                {/* Delete Image */}
                <img
                  src={deleteImageIcon}
                  alt="Delete"
                  draggable="false"
                  onClick={() => setShowImageDeletion(true)}
                  style={{
                    width: "36px",
                    height: "36px",
                    cursor: "pointer",
                    transition: "filter 0.15s ease",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.filter = "brightness(0.9)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.filter = "brightness(1)")
                  }
                />
              </div>
            </div>
          </div>

          {/* === Feedback Request Popup === */}
          {showFeedbackRequest && (
            <FeedbackRequest
              fileName={selectedFile || "No file selected"}
              onClose={() => setShowFeedbackRequest(false)}
              onSubmit={(remarks) => {
                const success = true;
                  

              if (success) {
                setToast({
                  message: "Request for feedback sent.",
                  type: "success",
                });
              } else {
                setToast({
                  message: "Error: Request not sent.",
                  type: "error",
                });
              }
              }}
            />
          )}

          {/* Toast appears here */}
          {toast.message && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast({message: "", type: "success"})}
            />
          )}
          {/* === Image Deletion Popup === */}
{showImageDeletion && (
  <ImageDeletion
    fileName={selectedFile}
    onClose={() => setShowImageDeletion(false)}
    onSubmit={(reason) => {
      setToast({
        message: `Image deleted (${reason})`,
        type: "success",
      });
    }}
  />
)}


                  </div>
                </div>

      {/* === Category Popup === */}
      {showCategoryPopup && (
        <div
          ref={popupRef}
          style={{
            position: "absolute",
            top: popupPosition.top,
            left: popupPosition.left,
            width: "156px",
            backgroundColor: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.25)",
            borderRadius: "6px",
            boxShadow: "0px 3px 8px rgba(0,0,0,0.25)",
            zIndex: 200,
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          <div
            onMouseDown={onHeaderMouseDown}
            style={{
              height: "26px",
              backgroundColor: "#EDEDED",
              fontWeight: 700,
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: "1px solid rgba(0,0,0,0.15)",
              position: "relative",
              cursor: "move",
            }}
          >
            Categories
            <button
              onClick={() => setShowCategoryPopup(false)}
              style={{
                position: "absolute",
                right: "6px",
                top: "2px",
                background: "none",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: "0 0 4px 0" }}>
            {categories.map((cat) => (
              <div
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "6px 10px",
                  fontStyle: "italic",
                  fontSize: "13px",
                  backgroundColor:
                    selectedCategory === cat ? "#D9D9D9" : "transparent",
                  cursor: "pointer",
                }}
              >
                {cat}
              </div>
            ))}

            <div
              style={{
                borderTop: "1px solid rgba(0,0,0,0.1)",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                width: "calc(100% - 12px)",
                margin: "0 auto 4px auto",
                boxSizing: "border-box",
              }}
            >
              {isAdding ? (
                <>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter name"
                    style={{
                      flex: 1,
                      fontSize: "12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      padding: "3px 4px",
                      outline: "none",
                      boxSizing: "border-box",
                      minWidth: 0,
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCategory();
                      if (e.key === "Escape") setIsAdding(false);
                    }}
                  />
                  <button
                    onClick={handleAddCategory}
                    style={{
                      width: "21px",
                      height: "21px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none",
                      backgroundColor: "#EDEDED",
                      borderRadius: "4px",
                      padding: "3px 6px",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={addNewCategoryIcon}
                      alt="+"
                      style={{ width: "12px", height: "12px" }}
                    />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsAdding(true)}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    fontStyle: "italic",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: "4px",
                    marginBottom: "-4px",
                    gap: "4px",
                  }}
                >
                  New Category
                  <img
                    src={addNewCategoryIcon}
                    alt="+"
                    style={{ width: "12px", height: "12px" }}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationPage;
