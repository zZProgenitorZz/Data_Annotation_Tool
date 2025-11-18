import { useRef, useState, useEffect } from "react";



const MIN_SIZE = 0.01;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function getDrawRect(img) {
  const ir = img.getBoundingClientRect();

  const naturalW = img.naturalWidth || ir.width;
  const naturalH = img.naturalHeight || ir.height;
  if (!naturalW || !naturalH) {
    // fallback: neem hele element als image
    return {
      left: ir.left,
      top: ir.top,
      width: ir.width,
      height: ir.height,
    };
  }

  const containerW = ir.width;
  const containerH = ir.height;

  const scale = Math.min(containerW / naturalW, containerH / naturalH);
  const drawW = naturalW * scale;
  const drawH = naturalH * scale;

  const offsetX = (containerW - drawW) / 2;
  const offsetY = (containerH - drawH) / 2;

  // rect van de écht getekende foto in viewport-coördinaten
  return {
    left: ir.left + offsetX,
    top: ir.top + offsetY,
    width: drawW,
    height: drawH,
  };
}

function clientToNorm(e, containerRef, imageRef) {
  const img = imageRef.current;
  if (!img) return null;

  const dr = getDrawRect(img);
  const px = e.clientX;
  const py = e.clientY;

  // alleen binnen de getekende foto
  if (
    px < dr.left ||
    px > dr.left + dr.width ||
    py < dr.top ||
    py > dr.top + dr.height
  ) {
    return null;
  }

  const x = (px - dr.left) / dr.width;
  const y = (py - dr.top) / dr.height;

  return {
    x: clamp01(x),
    y: clamp01(y),
  };
}



export default function BoundingBoxTool(selectedCategory, activeImageId) {
  const [boxes, setBoxes] = useState([]);
  const [draft, setDraft] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [mousePos, setMousePos] = useState(null); 

  const [isDragging, setIsDragging] = useState(false);


  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const history = useRef([]);
  const future = useRef([]);

  const interaction = useRef(null);

  const boxesStoreRef = useRef({});   // { [imageId]: Box[] }
  const [lastImageId, setLastImageId] = useState(null);


  // Wisselen van image: sla huidige boxes op, laad boxes van nieuwe image
  useEffect(() => {
    if (!activeImageId) return;

    // 1) Huidige boxes opslaan onder de vorige imageId
    if (lastImageId) {
      boxesStoreRef.current[lastImageId] = boxes;
    }

    // 2) Boxes voor de nieuwe image laden (of lege array)
    const stored = boxesStoreRef.current[activeImageId] || [];
    setBoxes(stored);

    // 3) State resetten voor deze image
    setDraft(null);
    setSelectedId(null);
    history.current = [];
    future.current = [];
    interaction.current = null;

    // 4) Onthoud dat dit nu de "vorige" is voor de volgende wissel
    setLastImageId(activeImageId);
  }, [activeImageId]);



  const updateBoxById = (id, updater) => {
    setBoxes((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updater(b) } : b))
    );
  };



  const saveHistory = (current) => {
    history.current.push(JSON.parse(JSON.stringify(current)));
    future.current = [];
  };

  const onCanvasMouseDown = (e) => {
    if (e.button !== 0) return;
    const p = clientToNorm(e, containerRef, imageRef);
    if (!p) return;

    setIsDragging(true);
    setDraft({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    setSelectedId(null);
  };

  const onCanvasMouseMove = (e) => {
    const p = clientToNorm(e, containerRef, imageRef);
    if (!p) return;

    setMousePos(p);

    if (!draft) return;
    setDraft((d) => ({ ...d, x2: p.x, y2: p.y }));

  };


  const onCanvasMouseUp = () => {

    

    setIsDragging(false);
    if (!draft) return;
    const { x1, y1, x2, y2 } = draft;

    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    if (w < 0.003 || h < 0.003) {
      setDraft(null);
      return;
    }

    const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());

    const newBox = {
      id,
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w,
      h,
      category: selectedCategory,
    };

    saveHistory(boxes);

    setBoxes((prev) => [...prev, newBox]);
    setSelectedId(id);
    setDraft(null);
    console.log("FINAL BOX:", {
      x: newBox.x,
      y: newBox.y,
      w: newBox.w,
      h: newBox.h
    });

  };

  const undo = () => {
    if (history.current.length === 0) return;
    future.current.push(JSON.parse(JSON.stringify(boxes)));
    const prev = history.current.pop();
    setBoxes(prev);
  };

  const redo = () => {
    if (future.current.length === 0) return;
    history.current.push(JSON.parse(JSON.stringify(boxes)));
    const next = future.current.pop();
    setBoxes(next);
  };

  useEffect(() => {
    const handleKeys = (e) => {
      const tag = e.target.tagName.toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        e.target.isContentEditable;

      if (isTyping) return;

      if (!e.ctrlKey) return;

      const key = e.key.toLowerCase();

      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      if (key === "y") {
        e.preventDefault();
        redo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [undo, redo]);

  const onBoxMouseDown = (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    const p = clientToNorm(e, containerRef, imageRef);
    if (!p) return;

    const box = boxes.find((b) => b.id === id);
    if (!box) return;

    setSelectedId(id);
    saveHistory(boxes);

    interaction.current = {
      type: "move",
      id,
      start: p,
      boxStart: { ...box },
    };

    window.addEventListener("mousemove", onGlobalMouseMove);
    window.addEventListener("mouseup", onGlobalMouseUp);
  };

  const onHandleMouseDown = (e, id, corner) => {
    e.preventDefault();
    e.stopPropagation();

    const p = clientToNorm(e, containerRef, imageRef);
    if (!p) return;

    const box = boxes.find((b) => b.id === id);
    if (!box) return;

    setSelectedId(id);
    saveHistory(boxes);

    interaction.current = {
      type: "resize",
      id,
      corner,
      start: p,
      boxStart: { ...box },
    };

    window.addEventListener("mousemove", onGlobalMouseMove);
    window.addEventListener("mouseup", onGlobalMouseUp);
  };

  // RESIZE — pixel-based min width/height
  const onGlobalMouseMove = (e) => {
    const info = interaction.current;
    if (!info) return;

    const p = clientToNorm(e, containerRef, imageRef);
    if (!p) return;

    const dx = p.x - info.start.x;
    const dy = p.y - info.start.y;

    const el = imageRef.current;
    const rect = el.getBoundingClientRect();

    // pixel → normalized
    const MIN_PIXEL = 12;
    const minW = MIN_PIXEL / rect.width;
    const minH = MIN_PIXEL / rect.height;

    const { x, y, w, h } = info.boxStart;

    if (info.type === "move") {
      const newX = clamp01(x + dx);
      const newY = clamp01(y + dy);
      updateBoxById(info.id, (b) => ({
        
        ...b,
        x: clamp01(Math.min(newX, 1 - b.w)),
        y: clamp01(Math.min(newY, 1 - b.h)),
      }));
    }



    if (info.type === "resize") {
      let left = x;
      let top = y;
      let right = x + w;
      let bottom = y + h;

      if (info.corner === "se") {
        right = right + dx;
        bottom = bottom + dy;
      } else if (info.corner === "sw") {
        left = left + dx;
        bottom = bottom + dy;
      } else if (info.corner === "ne") {
        right = right + dx;
        top = top + dy;
      } else if (info.corner === "nw") {
        left = left + dx;
        top = top + dy;
      }

      // 1) clamp alles binnen [0,1]
      left = clamp01(left);
      top = clamp01(top);
      right = clamp01(right);
      bottom = clamp01(bottom);

      // 2) check minimale breedte/hoogte in normalized coords
      const el = imageRef.current;
      const rect = el.getBoundingClientRect();
      const MIN_PIXEL = 12;
      const minW = MIN_PIXEL / rect.width;
      const minH = MIN_PIXEL / rect.height;

      if (right - left < minW) {
        // als te smal → corrigeer naar rechts
        right = left + minW;
        if (right > 1) {
          right = 1;
          left = right - minW;
        }
      }

      if (bottom - top < minH) {
        bottom = top + minH;
        if (bottom > 1) {
          bottom = 1;
          top = bottom - minH;
        }
      }

      updateBoxById(info.id, () => ({
        x: left,
        y: top,
        w: right - left,
        h: bottom - top,
      }));
    }

  };

  const onGlobalMouseUp = () => {
    setIsDragging(false);
    interaction.current = null;
    window.removeEventListener("mousemove", onGlobalMouseMove);
    window.removeEventListener("mouseup", onGlobalMouseUp);
  };

  return {
    boxes,
    draft,
    selectedId,
    setSelectedId,

    containerRef,
    imageRef,

    onCanvasMouseDown,
    onCanvasMouseMove,
    onCanvasMouseUp,

    onBoxMouseDown,
    onHandleMouseDown,

    undo,
    redo,

    mousePos,
    setMousePos,
    isDragging,
  };
}
