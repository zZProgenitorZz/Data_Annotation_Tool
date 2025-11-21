import { useNavigate, useParams } from "react-router-dom";
import { useState, useRef, useEffect, useContext, useCallback } from "react";
import backIcon from "../../assets/back-button-icon.png";
import undoIcon from "../../assets/undo.png";
import redoIcon from "../../assets/redo.png";
import slider from "../../assets/slider.jpg";

import ImageDeletion from "./components/ImageDeletion";
import Header from "../../components/Header";
import { getSignedUrl, listImages } from "../../services/ImageService";
import { getAllLabels, createLabel, deleteLabel } from "../../services/labelService";
import { getGuestImages } from "../../services/ImageService";

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

//Authentication
import { AuthContext } from "../../components/AuthContext";
import BoundingBoxTool, {getDrawRect} from "./Tools/BoundingBox/BoundingBoxTool";
import BoundingBoxOverlay from "./Tools/BoundingBox/BoundingBoxOverlay";


import { updateBboxImageAnnotations_noboxes, updateBboxImageAnnotations } from "./Tools/ToolsService";




const AnnotationPage = () => {
  const navigate = useNavigate();

  const [selectedTool, setSelectedTool] = useState(null);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [categories, setCategories] = useState([
  ]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [reloadCategory, setReloadCategory] = useState("")

  const categoryButtonRef = useRef(null);
  const popupRef = useRef(null);
  const rootRef = useRef(null);
  const fileListRef = useRef(null);

  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [showImageDeletion, setShowImageDeletion] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {currentUser, authType, loading} = useContext(AuthContext);

  const [dataset, setDataset] = useState(null); 
  const [imageMetas, setImageMetas] = useState([]);  // metadata from mongo
  const [urls, setUrls] = useState({});              // { [imageId]: url}
  const [selectedImageId, setSelectedImageId] = useState(null);

  const [imagesLoading, setImagesLoading] = useState(false)
  const [labelLoading, setLabelLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const LIMIT = 50;

  const selectedMeta = imageMetas.find((img) => img.id === selectedImageId) || null;
  const selectedUrl = selectedImageId ? urls[selectedImageId] : null;
  const totalImages = imageMetas.length;
  const currentIndex = selectedImageId ? imageMetas.findIndex((img) => img.id === selectedImageId) + 1 : 0;


  // bbox tool
  const bbox = BoundingBoxTool(selectedCategory, selectedImageId);
  const [drawRect, setDrawRect] = useState(null);

  const latestImageIdRef = useRef(selectedImageId)
  const latestBoxesRef = useRef(bbox.boxes)

  useEffect (() => {
    latestImageIdRef.current = selectedImageId;
  }, [selectedImageId])

  useEffect(() => {
    latestBoxesRef.current = bbox.boxes;
  }, [bbox.boxes]) 

  useEffect(() => {
    return () => {
      const lastImageId = latestImageIdRef.current;
      const lastBoxes = latestBoxesRef.current;

      if (!lastImageId) return;
      if (lastBoxes && lastBoxes.length > 0){
        updateBboxImageAnnotations(lastImageId, lastBoxes, false);
      } else {
        updateBboxImageAnnotations_noboxes(lastImageId, false)
      }
    };
  }, []);


  useEffect(() => {
    if (!bbox.imageRef.current) return;

    const recalc = () => {
      setDrawRect(getDrawRect(bbox.imageRef.current));
    };

    // direct 1x berekenen (bij nieuwe activeImage)
    recalc();

    // opnieuw berekenen bij window-resize
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [selectedImageId]); // of [activeImageId, bbox.imageRef]



  // get selectedDataset
  useEffect (() => {
    try{
      const stored = localStorage.getItem("selectedDataset");
      if (stored) setDataset(JSON.parse(stored))
    } catch (err) {
    console.error("Bad selectedDataset in localStorage:", err)}
  }, [])

  // set seletecteImage
  useEffect(() => {
  if (!dataset || !selectedImageId) return;
  const key = `selectedImage:${dataset.id}`;
  localStorage.setItem(key, selectedImageId);
}, [dataset, selectedImageId]);


  // fetch images once dataset is known -------------------
  const fetchImages = async () => {
    if (!dataset || imagesLoading || loading) return;
    setImagesLoading(true);
    try {
      if (authType === "user"){
      const result = await listImages(dataset.id);
      setImageMetas(result); 
      }
      if (authType === "guest") {
        const result = await getGuestImages(dataset.id);
        setImageMetas(result)
      }

    } catch (err){
      console.error("Failed to fetch images:", err)
    } finally {
      setImagesLoading(false);
    }
  }

  // fetch labels
  const fetchCategorie = async () => {
    if (!dataset || labelLoading || loading) return;
    setLabelLoading(true);
    try {
      // all auth bij getAllLabels
      const result = await getAllLabels(dataset.id);
      setCategories(result);
     
    } catch (err) {
      console.error("Failed to fetch labels:", err)
    } finally {
      setLabelLoading(false)
    }
  }

  // fetch datasets and categorie using useEffect
  useEffect(() => {
    if (!dataset) return;
    fetchImages();
  }, [dataset, loading, authType]);

  useEffect(() => {
    if (!dataset) return;
    fetchCategorie();
  }, [dataset, reloadCategory]);

  //getSignedUrl(get real images)------------ --------------------------------------------
  useEffect(() => {
    // als er geen images zijn of auth nog aan het laden is: niks doen
    if (imageMetas.length === 0 || loading) return;

    let cancelled = false;

    async function prefetch() {
      const start = offset;
      const end = Math.min(start + LIMIT, imageMetas.length);
      const slice = imageMetas.slice(start, end);

      // USER: S3 signed URLs
      if (authType === "user") {
        const pairs = await Promise.all(
          slice.map(async (img) => {
            if (urls[img.id]) return null; // al bekend
            try {
              const { url } = await getSignedUrl(img.id);
              return [img.id, url];
            } catch {
              return [img.id, null];
            }
          })
        );

        if (cancelled) return;

        const valid = pairs.filter(Boolean);
        if (valid.length) {
          setUrls((prev) => ({
            ...prev,
            ...Object.fromEntries(valid),
          }));
        }
      }

      // GUEST: data-urls uit base64 (img.data)
      if (authType === "guest") {
        const pairs = slice
          .map((img) => {
            if (urls[img.id]) return null; // al bekend
            if (!img.data) return null;    // safety

            const mime = img.contentType || "image/jpeg";
            const dataUrl = `data:${mime};base64,${img.data}`;
            return [img.id, dataUrl];
          })
          .filter(Boolean);

        if (cancelled) return;

        if (pairs.length) {
          setUrls((prev) => ({
            ...prev,
            ...Object.fromEntries(pairs),
          }));
        }
      }
    }

    prefetch();
    return () => {
      cancelled = true;
    };
  }, [imageMetas, offset, authType, loading]); // urls kun je weglaten om extra reruns te voorkomen


  // auto-select last viewed image (or first) per dataset
  useEffect(() => {
    if (!dataset || imageMetas.length === 0) return;

    const key = `selectedImage:${dataset.id}`;
    const saved = localStorage.getItem(key);

    // als er een opgeslagen imageId is, en die bestaat in deze dataset
    if (saved && imageMetas.some((img) => img.id === saved)) {
      // alleen als we nog niets geselecteerd hebben of iets anders
      if (selectedImageId !== saved) {
        setSelectedImageId(saved);
      }
      return;
    }

    // anders fallback naar de eerste image
    if (!selectedImageId) {
      setSelectedImageId(imageMetas[0].id);
    }
  }, [dataset, imageMetas]);


  const handleSaveAnnotation = () => {
    if (!bbox.imageRef.current) return;
    if (bbox.boxes) {
      updateBboxImageAnnotations(selectedImageId, bbox.boxes, false);
    }
    else {updateBboxImageAnnotations_noboxes(selectedImageId, false);

    }
   
  }


  // Next Image
  const handleNextImage = useCallback(() => {
    if (!selectedImageId) return;

    const index = imageMetas.findIndex((img) => img.id === selectedImageId);
    if (index === -1 || index >= imageMetas.length - 1) return;

    const nextIndex = index + 1;
    const nextId = imageMetas[nextIndex].id;
    setSelectedImageId(nextId);

    const windowEnd = offset + LIMIT;
    const threshold = windowEnd - 5;

    if (nextIndex >= threshold && windowEnd < imageMetas.length) {
      setOffset((prev) => prev + LIMIT);
    }
  }, [selectedImageId, imageMetas, offset, LIMIT]); // deps

  // Previous Image
  const handlePrevImage = useCallback(() => {
    if (!selectedImageId) return;

    const index = imageMetas.findIndex((img) => img.id === selectedImageId);
    if (index <= 0) return;

    const prevIndex = index - 1;
    const prevId = imageMetas[prevIndex].id;
    setSelectedImageId(prevId);

    if (prevIndex < offset && offset > 0) {
      setOffset((prev) => Math.max(0, prev - LIMIT));
    }
  }, [selectedImageId, imageMetas, offset, LIMIT]);



  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextImage();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevImage();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleNextImage, handlePrevImage]);


  useEffect(() => { 
    if (!selectedImageId || !fileListRef.current) return;

    const rowElement = fileListRef.current.querySelector(
      `[data-image-id="${selectedImageId}"]`
    );

    if (rowElement) {
      rowElement.scrollIntoView({
        block: "nearest",
        behavior: "auto", // "instant" is niet standaard
      });
    }
  }, [selectedImageId]);


  const filteredImages = imageMetas.filter((img) =>
    img.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  
  const ROW_H = 24; // row height for file list
  const VISIBLE_ROWS = 7;

  // === Feedback Request popup state ===
  const [showFeedbackRequest, setShowFeedbackRequest] = useState(false);
  const [toast, setToast] = useState({message :"", type: "success"});



  const handleBackClick = () => navigate("/overview");
  const handleSelectTool = (toolId) =>
    setSelectedTool(toolId === selectedTool ? null : toolId);

  useEffect(() => {
    if(selectedTool !== "bounding") {
      bbox.setMousePos(null); // remove crosshair
    }
  }, [selectedTool]);


  // position popup directly under the Category bar (anchored)
  const toggleCategoryPopup = () => {
    if (showCategoryPopup) {
      setShowCategoryPopup(false);
      return;
    }
    if (categoryButtonRef.current && rootRef.current) {
      setReloadCategory("reload")
      const btnRect = categoryButtonRef.current.getBoundingClientRect();
      const rootRect = rootRef.current.getBoundingClientRect();
      setPopupPosition({
        top: btnRect.bottom - rootRect.top + 2,
        left: btnRect.left - rootRect.left + 1.5,
      });
      setShowCategoryPopup(true);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name && !dataset) return;
    const form = {
      labelName: name,
      labelDescription: ""
    };
    await createLabel(dataset.id, form)

    setSelectedCategory(name);
    setNewCategory("");
    setReloadCategory(name)
    setIsAdding(false);
  };


  const handleDeleteCategory = async (cat) => {
    if (!dataset) return;

    const ok = window.confirm(
      `Are you sure you want to delete the category "${cat.labelName}"?`
    );
    if (!ok) return;

    try {
      // backend delete (label id)
      await deleteLabel(cat.id);

      // uit de lijst halen
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));

      // als dit de geselecteerde was, deselecten
      if (selectedCategory === cat.labelName) {
        setSelectedCategory(null);
      }
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
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

    
let imgRect = null;
let contRect = null;

let imgLeft = 0;
let imgTop = 0;
let imgWidth = 0;
let imgHeight = 0;

if (bbox.imageRef.current && bbox.containerRef.current) {
  const imgEl = bbox.imageRef.current;
  const drawRect = getDrawRect(imgEl);     // dezelfde logica als in je tool
  imgRect = drawRect;

  contRect = bbox.containerRef.current.getBoundingClientRect();

  imgLeft = drawRect.left - contRect.left;
  imgTop = drawRect.top - contRect.top;
  imgWidth = drawRect.width;
  imgHeight = drawRect.height;
}

let crossX = 0;
let crossY = 0;

if (bbox.mousePos && imgRect) {
   // muis in image-ruimte (0..1) → px in container
  crossX = imgLeft + bbox.mousePos.x * imgWidth;
  crossY = imgTop  + bbox.mousePos.y * imgHeight;
}



  return (
    <div
      ref={rootRef}
      className="min-h-screen flex flex-col bg-gradient-to-b from-[#44F3C9] to-[#3F7790] relative select-none"
    >
      {/* === Header === */}
      <Header  currentUser={currentUser}/>

      {/* === Outer container === */}
      <div className="flex flex-1 items-center justify-center px-[10px] mt-[0px] mb-[12px]">
        
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
              Dataset: {dataset?.name || "Unknown"}
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
                onClick={() => {
                    if (selectedTool === "bounding") bbox.undo();
                }}

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
                onClick={() => {
                  if (selectedTool === "bounding") bbox.redo();
                }}
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
                  height: "100%",
                  maxWidth: "calc(100% - 20px)",
                  maxHeight: "100%",
                  backgroundColor: "#FFFFFF",
                  overflow: "hidden",
                  display: "flex",
                  paddingTop: "7px",
                  paddingBottom: "7px",
                  boxSizing: "border-box",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  // cusor logic
                  cursor:
                    selectedTool === "bounding" ? "crosshair" : "default",
                  }}
                
                ref={(el) => {
                  bbox.containerRef.current = el;
                  //poly.containerRef.current = el;
                  //pencil.containerRef.current = el;
                  //ellipse.containerRef.current = el;
                }}

                // events
                onMouseDown={(e) => {
                  // if (selectedTool === "pencil") { pencil.onCanvasMouseDown(e); return; }
                  // if (selectedTool === "polygon") { poly.onCanvasClick(e); return; }
                  // if (selectedTool === "ellipse") { ellipse.onCanvasMouseDown(e); return; }
                  if (selectedTool === "bounding") { bbox.onCanvasMouseDown(e); return; }
                }}

                onMouseMove={(e) => {
                  // if (selectedTool === "pencil") pencil.onCanvasMouseMove(e);
                  // if (selectedTool === "polygon") poly.setMousePos(poly.norm(e));
                  if (selectedTool === "bounding") bbox.onCanvasMouseMove(e);
                  // if (selectedTool === "ellipse") ellipse.onCanvasMouseMove(e);
                }}

                onMouseUp={(e) => {
                  // if (selectedTool === "pencil") pencil.onCanvasMouseUp();
                  if (selectedTool === "bounding") bbox.onCanvasMouseUp(e);
                  // if (selectedTool === "ellipse") ellipse.onCanvasMouseUp(e);
                }}

              >

              {/* IMAGE */}
              <img
                ref={(el) => {
                bbox.imageRef.current = el;
                // poly.imageRef.current = el;
                // pencil.imageRef.current = el;
                // ellipse.imageRef.current = el;
              }}
                  src={selectedUrl}
                  alt={selectedMeta?.fileName || "Microscope View"}
                  onLoad={() => {
                    if (bbox.imageRef.current){
                      setDrawRect(getDrawRect(bbox.imageRef.current))
                    }
                  }}
                  draggable="false"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    pointerEvents:"none",
                  }}
                />
              {/* === CROSSHAIR (CLIPPED TO IMAGE) === */}
              {bbox.mousePos && !bbox.draft && (
                <>
                  {/* Vertical line */}
                  <div
                    style={{
                      position: "absolute",
                      left: `${crossX}px`,
                      top: `${imgTop}px`,
                      height: `${imgHeight}px`,
                      width: "0px",
                      borderLeft: "1.5px dashed rgba(80,80,80,0.4)",
                      pointerEvents: "none",
                      zIndex: 50,
                    }}
                  />

                  {/* Horizontal line */}
                  <div
                    style={{
                      position: "absolute",
                      top: `${crossY}px`,
                      left: `${imgLeft}px`,
                      width: `${imgWidth}px`,
                      height: "0px",
                      borderTop: "1.5px dashed rgba(80,80,80,0.4)",
                      pointerEvents: "none",
                      zIndex: 50,
                    }}
                  />
                </>
              )}
              {/* === BOUNDING BOX OVERLAY === */}
              {/* {selectedTool === "bounding" && ( */}
                <BoundingBoxOverlay
                  boxes={bbox.boxes}
                  draft={bbox.draft}
                  selectedId={bbox.selectedId}
                  setSelectedId={bbox.setSelectedId}
                  onBoxMouseDown={bbox.onBoxMouseDown}
                  onHandleMouseDown={bbox.onHandleMouseDown}
                  resizingBoxId={null}
                  // NIEUW: image-positie doorgeven
                  imgLeft={imgLeft}
                  imgTop={imgTop}
                  imgWidth={imgWidth}
                  imgHeight={imgHeight}
                  drawRect={drawRect}
                />

              {/* )} */}

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
                      if (e.key === "Enter" && filteredImages.length > 0)
                        setSelectedImageId(filteredImages[0].id);
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
                  {filteredImages.length > 0 ? (
                    filteredImages.map((img) => (
                      <div
                        key={img.id}
                        data-image-id={img.id}
                        onClick={() => setSelectedImageId(img.id)}
                        style={{
                          height: `${ROW_H}px`,
                          lineHeight: `${ROW_H}px`,
                          padding: "0 8px",
                          fontSize: "12.5px",
                          cursor: "pointer",
                          backgroundColor:
                            selectedImageId === img.id ? "#D9D9D9" : "transparent",
                          borderBottom: "1px solid rgba(0,0,0,0.04)",
                          userSelect: "none",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={img.fileName}
                      >
                        {img.fileName}
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
                  onClick={() => handleSaveAnnotation()}
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
              fileName={selectedMeta?.fileName || "No file selected"}
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
              fileName={selectedMeta?.fileName}
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
            minWidth: "156px",
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
            key={cat.id}
            onClick={() => setSelectedCategory(cat.labelName)}
            style={{
              padding: "6px 10px",
              fontStyle: "italic",
              fontSize: "13px",
              backgroundColor:
                selectedCategory === cat.labelName ? "#D9D9D9" : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "6px",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {cat.labelName}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation(); // voorkomt dat het label óók geselecteerd wordt
                handleDeleteCategory(cat);
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "#888",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
              title="Delete category"
            >
              ✕
            </button>
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
