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

// Tools
import BoundingBoxOverlay from "./Tools/BoundingBox/BoundingBoxOverlay";
import { useBoundingBoxTool } from "./Tools/BoundingBox/BoundingBoxTool";

import { usePolygonTool } from "./Tools/Polygon/PolygonTool";
import PolygonOverlay from "./Tools/Polygon/PolygonOverlay";

import { useEllipseTool } from "./Tools/Ellipse/EllipseTool";
import EllipseOverlay from "./Tools/Ellipse/EllipseOverlay";

import { usePencilTool } from "./Tools/Pencil/PencilTool";
import PencilOverlay from "./Tools/Pencil/PencilOverlay";

import { useMagicWandTool } from "./Tools/MagicWand/MagicWandTool";
import MagicWandOverlay from "./Tools/MagicWand/MagicWandOverlay";


import { getImageDrawRect } from "../../utils/annotationGeometry";
import { prefetchAnnotations } from "../../utils/useImageAnnotations";

import { updateImageAnnotations_empty, updateAllImageAnnotations } from "./Tools/ToolsService";





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

  const {currentUser, authType, loading, logout} = useContext(AuthContext);

  const [dataset, setDataset] = useState(null); 
  const [imageMetas, setImageMetas] = useState([]);  // metadata from mongo

  const [urls, setUrls] = useState({});              // { [imageId]: {url, loadedAt}}

  const [selectedImageId, setSelectedImageId] = useState(null);

  const [imagesLoading, setImagesLoading] = useState(false)
  const [labelLoading, setLabelLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const LIMIT = 50;
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 uur


  const selectedMeta = imageMetas.find((img) => img.id === selectedImageId) || null;
  const selectedUrl = selectedImageId ? urls[selectedImageId]?.url : null;
  const totalImages = imageMetas.length;
  const currentIndex = selectedImageId ? imageMetas.findIndex((img) => img.id === selectedImageId) + 1 : 0;
  
  const [reloadImages, setReloadImages] = useState(null)
  const [imageReady, setImageReady] = useState(false);

  //geometry of the image in the container
  const [imageRect, setImageRect] = useState(null)
 
 // Globale undo/redo stack (tool-onafhankelijk)
  const undoStackRef = useRef({ past: [], future: [] });

  const registerHistoryEntry = useCallback((toolKey) => {
    undoStackRef.current.past.push(toolKey);
    undoStackRef.current.future = [];
  }, []);

  const resetGlobalHistory = useCallback(() => {
    undoStackRef.current.past = [];
    undoStackRef.current.future = [];
  }, []);

  // bbox tool
  const bbox = useBoundingBoxTool(selectedCategory, selectedImageId, {
    onHistoryPush: () => registerHistoryEntry("bbox"),
    onResetHistory: resetGlobalHistory,
  });

  // polygon tool
  const poly = usePolygonTool(selectedCategory, selectedImageId, {
    onHistoryPush: () => registerHistoryEntry("polygon"),
    onResetHistory: resetGlobalHistory,
  });

  // ellipse tool
  const ellipse = useEllipseTool(selectedCategory, selectedImageId, {
    onHistoryPush: () => registerHistoryEntry("ellipse"),
    onResetHistory: resetGlobalHistory,
  });

  // pencil tool
  const pencil = usePencilTool(selectedCategory, selectedImageId, {
    onHistoryPush: () => registerHistoryEntry("pencil"),
    onResetHistory: resetGlobalHistory,
  });

  // magic wand tool
  const mask = useMagicWandTool(selectedCategory, selectedImageId, {
    onHistoryPush: () => registerHistoryEntry("mask"),
    onResetHistory: resetGlobalHistory,
  });

  const globalUndo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.past.length === 0) return;

    const toolKey = stack.past.pop();
    stack.future.push(toolKey);

    if (toolKey === "bbox") {
      bbox.undo();
    } else if (toolKey === "polygon") {
      poly.undo();
    } else if (toolKey === "ellipse") {
      ellipse.undo();
    } else if (toolKey === "pencil") {
      pencil.undo();
    } else if (toolKey === "mask") {
      mask.undo();
    }
  }, [bbox, poly, ellipse, pencil, mask]);

  const globalRedo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.future.length === 0) return;

    const toolKey = stack.future.pop();
    stack.past.push(toolKey);

    if (toolKey === "bbox") {
      bbox.redo();
    } else if (toolKey === "polygon") {
      poly.redo();
    } else if (toolKey === "ellipse") {
      ellipse.redo();
    } else if (toolKey === "pencil") {
      pencil.redo();
    } else if (toolKey === "mask") {
      mask.redo();
    }
  }, [bbox, poly, ellipse, pencil, mask]);

  const globalDeleteSelected = useCallback(() => {
  // volgorde is jouw keuze; dit is een voorbeeld
  if (bbox.selectedId != null) {
    bbox.deleteSelected?.();
    return;
  }
  if (poly.selectedId != null) {
    poly.deleteSelected?.();
    return;
  }
  if (ellipse.selectedId != null) {
    ellipse.deleteSelected?.();
    return;
  }
  if (pencil.selectedId != null) {
    pencil.deleteSelected?.();
    return;
  }
  if (mask.selectedId != null) {
    mask.deleteSelected?.();
    return;
  }
}, [bbox, poly, ellipse, pencil, mask]);

  //////////////////////////////
  // 1 functie om de rect te herberekenen
  const recalcImageRect = useCallback(() => {
    if (!bbox.imageRef.current || !bbox.containerRef.current) return;

    const rect = getImageDrawRect(
      bbox.imageRef.current,
      bbox.containerRef.current
    );
    if (!rect) return;

    setImageRect(rect);
  }, []);

  // Herbereken bij nieuwe image
  useEffect(() => {
    recalcImageRect();
  }, [selectedImageId]);

  // Herbereken bij window-resize
  useEffect(() => {
    const handleResize = () => recalcImageRect();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [recalcImageRect]);
////////////////////////////////

  useEffect(() => {
    // elke keer als we naar een andere image/url gaan → opnieuw laden
    if (authType === "user") {
      setImageReady(false);
    }
  }, [selectedImageId, selectedUrl]);

  // get selectedDataset
  useEffect (() => {
    try{
      const stored = localStorage.getItem("selectedDataset");
      if (stored) setDataset(JSON.parse(stored))
    } catch (err) {
    console.error("Bad selectedDataset in localStorage:", err)}
  }, [])

  // set selectedImage
  useEffect(() => {
  if (!dataset || !selectedImageId) return;
  const key = `selectedImage:${dataset.id}`;
  localStorage.setItem(key, selectedImageId);
}, [dataset, selectedImageId]);

  // keydown effect
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName.toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || e.target.isContentEditable;
      if (isTyping) return;

      const key = e.key.toLowerCase();

      if (e.ctrlKey && key === "z" && !e.shiftKey) {
        e.preventDefault();
        globalUndo();
        return;
      }
      if (e.ctrlKey && ((key === "z" && e.shiftKey) || key === "y")) {
        e.preventDefault();
        globalRedo();
        return;
      }
      if (key === "delete" || key === "backspace") {
        e.preventDefault();
        globalDeleteSelected();
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedTool, bbox, poly, ellipse, pencil, mask, globalUndo, globalRedo, globalDeleteSelected]);



  // fetch images once dataset is known -------------------
  const fetchImages = async () => {
    if (!dataset || imagesLoading || loading) return;
    setImagesLoading(true);
    try {
      if (authType === "user"){
      const result = await listImages(dataset.id);
      const activeImages = (result || []).filter((img) => img.is_active === true);
      setImageMetas(activeImages); 
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

  // fetch images and categorie using useEffect
  useEffect(() => {
    if (!dataset) return;
    fetchImages();
  }, [dataset, loading, authType, reloadImages]);

  useEffect(() => {
    if (!dataset) return;
    fetchCategorie();
  }, [dataset, reloadCategory]);

  //getSignedUrl(get real images)------------ --------------------------------------------
  useEffect(() => {
    if (imageMetas.length === 0 || loading) return;

    let cancelled = false;

    async function prefetch() {
      const start = offset;
      const end = Math.min(start + LIMIT, imageMetas.length);
      const slice = imageMetas.slice(start, end);
      if (slice.length === 0) return;

      const imageIds = slice.map((img) => img.id);
      const now = Date.now();

      // 1) Annotaties prefetchen (achtergrond)
      prefetchAnnotations(imageIds).catch((err) =>
        console.error("Annotation prefetch failed:", err)
      );

      // 2) URLs prefetchen met TTL-check
      if (authType === "user") {
        const pairs = await Promise.all(
          slice.map(async (img) => {
            const existing = urls[img.id];
            if (existing && now - existing.loadedAt < CACHE_TTL_MS) {
              return null; // nog vers genoeg
            }
            try {
              const { url } = await getSignedUrl(img.id);
              return [img.id, { url, loadedAt: Date.now() }];
            } catch {
              return [img.id, null];
            }
          })
        );

        if (cancelled) return;

        const valid = pairs.filter((p) => p && p[1]);
        if (valid.length) {
          setUrls((prev) => ({
            ...prev,
            ...Object.fromEntries(valid),
          }));
        }
      }

      if (authType === "guest") {
        const pairs = slice
          .map((img) => {
            const existing = urls[img.id];
            if (existing && now - existing.loadedAt < CACHE_TTL_MS) {
              return null;
            }
            if (!img.data) return null;

            const mime = img.contentType || "image/jpeg";
            const dataUrl = `data:${mime};base64,${img.data}`;
            return [img.id, { url: dataUrl, loadedAt: Date.now() }];
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
  }, [imageMetas, offset, authType, loading]);


  // auto-select last viewed image, anders eerste niet-geannoteerde (of eerste image)
  useEffect(() => {
    if (!dataset || imageMetas.length === 0) return;

    const key = `selectedImage:${dataset.id}`;
    const saved = localStorage.getItem(key);

    // 1) Saved image (laatst bekeken), als die nog bestaat in deze dataset
    if (saved && imageMetas.some((img) => img.id === saved)) {
      if (selectedImageId !== saved) {
        setSelectedImageId(saved);
      }
      return;
    }

    // 2) Geen geldige saved: pak eerste niet-geannoteerde image
    //    (let op: we gaan ervan uit dat backend img.is_completed meestuurt)
    const firstNotCompleted = imageMetas.find(
      (img) => img.is_completed === false // of !img.is_completed
    );

    const fallbackId = firstNotCompleted
      ? firstNotCompleted.id            // eerste niet-geannoteerde
      : imageMetas[0].id;               // alles geannoteerd → pak eerste image

    // 3) Alleen overschrijven als er nog niks gekozen is of huidige id niet meer bestaat
    if (
      !selectedImageId ||
      !imageMetas.some((img) => img.id === selectedImageId)
    ) {
      setSelectedImageId(fallbackId);
    }
  }, [dataset, imageMetas, selectedImageId]);

  const showInitialLoading =
  loading ||                       // auth nog bezig
  imagesLoading ||                 // images worden nog geladen
  labelLoading ||                  // categories worden nog geladen
  !dataset ||                      // dataset nog niet uit localStorage
  imageMetas.length === 0 ||       // nog geen images
  !selectedImageId ||              // nog geen geselecteerde image
  !selectedUrl ||                  // url van de selected image nog niet bekend
  !imageReady;                   // image nog niet klaar om te tonen




  const handleSaveAnnotation = async () => {
    if (!selectedImageId) return;

    if (undoStackRef.current.past.length === 0) {
      return; // niks veranderd, niks saven
    }

    const hasBbox = bbox.boxes && bbox.boxes.length > 0;
    const hasPoly = poly.polygons && poly.polygons.length > 0;
    const hasEllipse = ellipse.ellipses && ellipse.ellipses.length > 0; 
    const hasStroke = pencil.strokes && pencil.strokes.length > 0;
    const hasRegion = mask.regions && mask.regions.length > 0;

    // Geen enkele annotatie? Dan leeg wegschrijven.
    if (!hasBbox && !hasPoly && !hasEllipse && !hasStroke && !hasRegion) {
      await updateImageAnnotations_empty(selectedImageId, false);
      
    } else {
      // Alles in één keer saven
      await updateAllImageAnnotations(
        selectedImageId,
        hasBbox ? bbox.boxes : [],
        hasPoly ? poly.polygons : [],
        hasEllipse ? ellipse.ellipses : [],
        hasStroke ? pencil.strokes : [],
        hasRegion ? mask.regions : [],
        false
      );
    }

    undoStackRef.current.past = [];
    undoStackRef.current.future = [];
  };

  


  // Next Image
  const handleNextImage = useCallback( () => {
    if (!selectedImageId) return;

    handleSaveAnnotation();

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
  }, [selectedImageId, imageMetas, offset, LIMIT, handleSaveAnnotation]); // deps

  // Previous Image
  const handlePrevImage = useCallback( () => {
    if (!selectedImageId) return;

    handleSaveAnnotation();

    const index = imageMetas.findIndex((img) => img.id === selectedImageId);
    if (index <= 0) return;

   

    const prevIndex = index - 1;
    const prevId = imageMetas[prevIndex].id;
    setSelectedImageId(prevId);

    if (prevIndex < offset && offset > 0) {
      setOffset((prev) => Math.max(0, prev - LIMIT));
    }
  }, [selectedImageId, imageMetas, offset, LIMIT, handleSaveAnnotation]); // deps



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



  const handleBackClick = async () => {
    await handleSaveAnnotation();  
    navigate("/overview")
  };

  const handleLogoutClick = async () => {
    try {
      await handleSaveAnnotation();
    } catch (err) { 
      console.error("Auto save failed on logout:", err);
    } finally {
      logout();
      navigate("/", { replace: true });
    }
  };



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
    if (!name || !dataset) return;
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

    

  let imgLeft = 0;
  let imgTop = 0;
  let imgWidth = 0;
  let imgHeight = 0;


  if (imageRect) {
    imgLeft = imageRect.left;
    imgTop = imageRect.top;
    imgWidth = imageRect.width;
    imgHeight = imageRect.height;
  }

  let crossX = 0;
  let crossY = 0;

  if (bbox.mousePos && imageRect) {
    // muis in image-ruimte (0..1) → px in container
    crossX = imgLeft + bbox.mousePos.x * imgWidth;
    crossY = imgTop  + bbox.mousePos.y * imgHeight;
  }

  const handleImageDeleted = (reason, deletedImageId) => {
    
    // 2. toast
    setToast({
      message: `Image deleted (${reason})`,
      type: "success",
    });

    // 3. eventueel selectie leegmaken
    if (selectedImageId === deletedImageId) {
      setReloadImages(selectedImageId)
      handleNextImage()

    }
    };

    // Als je een bbox aanklikt → bbox selecteren + polygon deselecten
  const handleBoxMouseDown = (e, id) => {
    // eerst alle polygon-selecties weg
    poly.setSelectedId?.(null);
    ellipse.setSelectedId?.(null);
    pencil.setSelectedId?.(null);
    mask.setSelectedId?.(null);

    // daarna de originele bbox-logica uitvoeren
    bbox.onBoxMouseDown(e, id);
  };

  const handleBoxHandleMouseDown = (e, id, corner) => {
    // ook bij resize: eerst polygon-deselect
    poly.setSelectedId?.(null);
    ellipse.setSelectedId?.(null);
    pencil.setSelectedId?.(null);
    mask.setSelectedId?.(null);

    // daarna de originele bbox-logica uitvoeren
    bbox.onHandleMouseDown(e, id, corner);
  };

  const handlePolygonMouseDown = (e, id) => {
    // eerst bbox-deselect
    bbox.setSelectedId?.(null);
    ellipse.setSelectedId?.(null);
    pencil.setSelectedId?.(null);
    mask.setSelectedId?.(null);

    // daarna de originele polygon-logica
    poly.onPolygonMouseDown(e, id);
  };

  const handleVertexMouseDown = (e, polyId, index) => {
    // bij vertex drag ook bbox-deselect
    bbox.setSelectedId?.(null);
    ellipse.setSelectedId?.(null);
    pencil.setSelectedId?.(null);
    mask.setSelectedId?.(null);

    poly.onVertexMouseDown(e, polyId, index);
  };

  // als je nog een aparte "select" callback hebt
  const handlePolygonSelect = (id) => {
    bbox.setSelectedId?.(null);
    ellipse.setSelectedId?.(null);
    pencil.setSelectedId?.(null);
    mask.setSelectedId?.(null);

    poly.onPolygonSelect?.(id);
  };

  const handleEllipseMouseDown = (e, id) => {
    // eerst bbox-deselect
    bbox.setSelectedId?.(null);
    poly.setSelectedId?.(null);
    pencil.setSelectedId?.(null);
    mask.setSelectedId?.(null);
    // daarna de originele ellipse-logica
    ellipse.onEllipseMouseDown(e, id);
  };
  
  const handleEllipseHandleMouseDown = (e, id, handle) => {
    // ook bij resize: eerst bbox- en polygon-deselect
    bbox.setSelectedId?.(null);
    poly.setSelectedId?.(null);
    pencil.setSelectedId?.(null);
    mask.setSelectedId?.(null);
    // daarna de originele ellipse-logica uitvoeren
    ellipse.onHandleMouseDown(e, id, handle);
  };

  const handleStrokeMouseDown = (e, id) => {
    // eerst bbox-deselect
    bbox.setSelectedId?.(null);
    poly.setSelectedId?.(null);
    ellipse.setSelectedId?.(null);
    mask.setSelectedId?.(null);
    // daarna de originele pencil-logica
    pencil.onStrokeMouseDown(e, id);
  }

  const handleRegionMouseDown = (e, id) => {
    // eerst bbox-deselect
    bbox.setSelectedId?.(null);
    poly.setSelectedId?.(null);
    ellipse.setSelectedId?.(null);
    pencil.setSelectedId?.(null);

    // daarna de originele mask-logica
    mask.onRegionMouseDown(e, id);
  }

  const handleMaskVertexMouseDown = (e, regionId, index) => {
    // bij vertex drag ook bbox-deselect
    bbox.setSelectedId?.(null);
    poly.setSelectedId?.(null);
    ellipse.setSelectedId?.(null);
    pencil.setSelectedId?.(null);

    mask.onVertexMouseDown(e, regionId, index);
  }




  return (
    <div
      ref={rootRef}
      className="min-h-screen flex flex-col bg-gradient-to-b from-[#44F3C9] to-[#3F7790] relative select-none"
    >
      {/* === Header === */}
      <Header  currentUser={currentUser} onLogoClick={handleBackClick} onLogoutClick={handleLogoutClick}/>

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
                onClick={globalUndo}

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
                onClick={globalRedo}
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
            {/* Outer container blijft altijd bestaan */}
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
                position: "relative", // belangrijk voor overlay
                cursor:
                  selectedTool === "bounding" || selectedTool === "polygon"
                    ? "crosshair"
                    : "default",
              }}
              ref={(el) => {
                bbox.containerRef.current = el;
                poly.containerRef.current = el;
                pencil.containerRef.current = el;
                ellipse.containerRef.current = el;
                mask.containerRef.current = el;
              }}
              // events
              onMouseDown={(e) => {
                if (selectedTool === "bounding") {
                  bbox.onCanvasMouseDown(e);
                } else if (selectedTool === "polygon") {
                  poly.onCanvasClick(e);
                } else if (selectedTool === "ellipse") {
                  ellipse.onCanvasMouseDown(e);
                } else if (selectedTool === "pencil") {
                  pencil.onCanvasMouseDown(e);
                } else if (selectedTool === "mask") {
                  mask.onCanvasClick(e);
                }
              }}
              onMouseMove={(e) => {
                if (selectedTool === "bounding") {
                  bbox.onCanvasMouseMove(e);
                } else if (selectedTool === "ellipse") {
                  ellipse.onCanvasMouseMove(e);
                } else if (selectedTool === "pencil") {
                  pencil.onCanvasMouseMove(e);
                }
              }}
              onMouseUp={(e) => {
                if (selectedTool === "pencil") pencil.onCanvasMouseUp();
                if (selectedTool === "bounding") bbox.onCanvasMouseUp(e);
                if (selectedTool === "ellipse") ellipse.onCanvasMouseUp(e);
              }}
            >
            

              {/* === IMAGE === */}
              <img
                ref={(el) => {
                  bbox.imageRef.current = el;
                  poly.imageRef.current = el;
                  pencil.imageRef.current = el;
                  ellipse.imageRef.current = el;
                  mask.imageRef.current = el;
                }}
                src={selectedUrl}
                alt={selectedMeta?.fileName || "Microscope View"}
                crossOrigin="anonymous"
                draggable="false"
                onLoad={() => {
                  // 1) zodra de image echt geladen is → rect opnieuw berekenen
                  recalcImageRect();
                  // 2) markeren dat deze image visueel klaar is
                  setImageReady(true);
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  pointerEvents: "none",
                }}
              />

              {/* OVERLAY LOADER zolang imageLoaded false is */}
              {showInitialLoading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.6)",
                    pointerEvents: "none",
                    zIndex: 100,
                  }}
                >
                  <div className="w-10 h-10 rounded-full border-4 border-gray-300 border-t-[#3F7790] animate-spin" />
                </div>
              )}

              {/* === CROSSHAIR === */}
              {selectedTool === "bounding" && bbox.mousePos && !bbox.draft && (
                <>
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

              {/* === BBOX OVERLAY === */}
              <BoundingBoxOverlay
                boxes={bbox.boxes}
                draft={selectedTool === "bounding" ? bbox.draft : null}
                selectedId={bbox.selectedId}
                setSelectedId={bbox.setSelectedId}
                onBoxMouseDown={handleBoxMouseDown}
                onHandleMouseDown={handleBoxHandleMouseDown}
                imgLeft={imgLeft}
                imgTop={imgTop}
                imgWidth={imgWidth}
                imgHeight={imgHeight}
              />

              {/* POLYGON */}
              <PolygonOverlay
                polygons={poly.polygons}
                draft={selectedTool === "polygon" ? poly.draft : []}
                selectedId={poly.selectedId}
                onVertexMouseDown={handleVertexMouseDown}
                onPolygonMouseDown={handlePolygonMouseDown}
                onSelect={handlePolygonSelect}
                imgLeft={imgLeft}
                imgTop={imgTop}
                imgWidth={imgWidth}
                imgHeight={imgHeight}
              />

              {/* ELLIPSE */}
              <EllipseOverlay
                ellipses={ellipse.ellipses}
                draft={selectedTool === "ellipse" ? ellipse.draft : null}
                selectedId={ellipse.selectedId}
                onEllipseMouseDown={handleEllipseMouseDown}
                onHandleMouseDown={handleEllipseHandleMouseDown}
                imgLeft={imgLeft}
                imgTop={imgTop}
                imgWidth={imgWidth}
                imgHeight={imgHeight}
              />

              {/* PENCIL */}
              <PencilOverlay
                strokes={pencil.strokes}
                draft={selectedTool === "pencil" ? pencil.draft : []}
                selectedId={pencil.selectedId}
                imgLeft={imgLeft}
                imgTop={imgTop}
                imgWidth={imgWidth}
                imgHeight={imgHeight}
                onStrokeMouseDown={handleStrokeMouseDown}
              />

              {/* MAGIC WAND */}
              <MagicWandOverlay
                regions={mask.regions}
                selectedId={mask.selectedId}
                onVertexMouseDown={handleMaskVertexMouseDown}
                onRegionMouseDown={handleRegionMouseDown}
                onSelect={mask.setSelectedId}
                imgLeft={imgLeft}
                imgTop={imgTop}
                imgWidth={imgWidth}
                imgHeight={imgHeight}
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
                onClick={() => handleSelectTool("mask")}
                style={{
                  marginTop: "2px",
                  marginLeft: "8px",
                  width: "34px",
                  height: "34px",
                  backgroundImage:
                    selectedTool === "mask" ? `url(${selectedBg})` : "none",
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
              {/* Magic Wand Threshold Slider */}
              {selectedTool === "mask" && (
                <div
                  style={{
                    marginTop: "6px",
                    marginLeft: "7px",
                    width: "147px",
                    padding: "6px 6px",
                    backgroundColor: "#F6F6F6",
                    border: "1px solid rgba(0,0,0,0.15)",
                    borderRadius: "6px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#333",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Threshold</span>
                    <span style={{ fontWeight: 700 }}>{mask.threshold}</span>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={mask.threshold}
                    onChange={(e) => mask.setThreshold(Number(e.target.value))}
                    style={{
                      width: "100%",
                      cursor: "pointer",
                      accentColor: "#3F7790",
                    }}
                  />
                </div>
              )}


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
                        onClick={() => { 
                          if (img.id === selectedImageId) return;
                          handleSaveAnnotation();
                          setSelectedImageId(img.id);
                        }}
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
              {(authType === "user") && 
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
              }

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
              annotationId={() => {
                if (bbox.selectedId) return bbox.selectedId;
                if (poly.selectedId) return poly.selectedId;
                if (ellipse.selectedId) return ellipse.selectedId;
                if (pencil.selectedId) return pencil.selectedId;
                if (mask.selectedId) return mask.selectedId;
                return null;
              }}
              imageId={selectedImageId}
              fileName={selectedMeta?.fileName || "No file selected"}
              onClose={() => setShowFeedbackRequest(false)}
              onSubmit={() => {
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
              imageId={selectedImageId}
              onClose={() => setShowImageDeletion(false)}
              onSubmit={handleImageDeleted}
              authType={authType}
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
