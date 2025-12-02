// Tools/BoundingBox/useBoundingBoxTool.js
import { useState, useEffect, useRef } from "react";
import { useCanvasGeometry } from "../../../../utils/useCanvasGeometry";
import { useUndoRedoHistory } from "../../../../utils/useUndoRedoHistory";
import { useImageAnnotations } from "../../../../utils/useImageAnnotations";
import { clamp01 } from "../../../../utils/annotationGeometry";


const MIN_PIXEL = 12;

export function useBoundingBoxTool(selectedCategory, activeImageId, options = {}) {

  const { onHistoryPush, onResetHistory } = options;
  const {
    containerRef,
    imageRef,
    mousePos,
    setMousePos,
    toNorm,
    getImageDrawRect,
  } = useCanvasGeometry();

  const [draft, setDraft] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const interactionRef = useRef(null);

  const {
    present: boxes,
    setPresent: setBoxes,
    pushSnapshot,
    undo,
    redo,
    reset,
  } = useUndoRedoHistory([]);

  const pushHistory = (snapshot) => {
    pushSnapshot(snapshot);      // lokale bbox history
    if (onHistoryPush) onHistoryPush(); // globale stack updaten
  };


  // Load/save via shared hook
  useImageAnnotations({
    activeImageId,
    shapeType: "bbox",
    shapes: boxes,
    setShapesFromApi: (data) => {
      if (!data || !Array.isArray(data.annotations)) {
        reset([]);
        setSelectedId(null);
        if (onResetHistory) onResetHistory(); // globale undo/redo reset
        return;
      }

      const loaded = data.annotations
        .filter((ann) => ann.type === "bbox" && ann.geometry)
        .map((ann) => ({
          id: ann.id,
          x: ann.geometry.x,
          y: ann.geometry.y,
          w: ann.geometry.width,
          h: ann.geometry.height,
          category: ann.label,
        }));

      reset(loaded);
      setSelectedId(null);
      if (onResetHistory) onResetHistory(); //  allse when loading
    },
  });

  const deleteSelected = () => {
    if (!selectedId) return;
    pushHistory(boxes);
    setBoxes((prev) => prev.filter((b) => b.id !== selectedId));
    setSelectedId(null);
  };

  // ===== Drawing new box =====
  const onCanvasMouseDown = (e) => {
    if (e.button !== 0) return;
    const p = toNorm(e);
    if (!p) return;

    setDraft({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    setSelectedId(null);
  };

  const onCanvasMouseMove = (e) => {
    const p = toNorm(e);
    if (!p) return;

    setMousePos(p);

    if (!draft) return;
    setDraft((d) => ({ ...d, x2: p.x, y2: p.y }));
  };

  const onCanvasMouseUp = () => {
    if (!draft) return;
    const { x1, y1, x2, y2 } = draft;

    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    // tiny drag: ignore
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

    pushHistory(boxes);
    setBoxes((prev) => [...prev, newBox]);
    setSelectedId(id);
    setDraft(null);
  };

  const updateBoxById = (id, fn) => {
    setBoxes((prev) => prev.map((b) => (b.id === id ? fn(b) : b)));
  };

  // ===== Move / Resize =====
  const onBoxMouseDown = (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    const p = toNorm(e);
    if (!p) return;

    const box = boxes.find((b) => b.id === id);
    if (!box) return;

    pushHistory(boxes);
    setSelectedId(id);

    interactionRef.current = {
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

    const p = toNorm(e);
    if (!p) return;

    const box = boxes.find((b) => b.id === id);
    if (!box) return;

    pushHistory(boxes);
    setSelectedId(id);

    interactionRef.current = {
      type: "resize",
      id,
      corner,
      start: p,
      boxStart: { ...box },
    };

    window.addEventListener("mousemove", onGlobalMouseMove);
    window.addEventListener("mouseup", onGlobalMouseUp);
  };

  const onGlobalMouseMove = (e) => {
    const info = interactionRef.current;
    if (!info) return;

    const p = toNorm(e);
    if (!p) return;

    const dx = p.x - info.start.x;
    const dy = p.y - info.start.y;

    const img = imageRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();

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
      return;
    }

    if (info.type === "resize") {
      let left = x;
      let top = y;
      let right = x + w;
      let bottom = y + h;

      if (info.corner === "se") {
        right += dx;
        bottom += dy;
      } else if (info.corner === "sw") {
        left += dx;
        bottom += dy;
      } else if (info.corner === "ne") {
        right += dx;
        top += dy;
      } else if (info.corner === "nw") {
        left += dx;
        top += dy;
      }

      left = clamp01(left);
      top = clamp01(top);
      right = clamp01(right);
      bottom = clamp01(bottom);

      if (right - left < minW) {
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

      updateBoxById(info.id, (b) => ({
        ...b,
        x: left,
        y: top,
        w: right - left,
        h: bottom - top,
      }));
    }
  };

  const onGlobalMouseUp = () => {
    interactionRef.current = null;
    window.removeEventListener("mousemove", onGlobalMouseMove);
    window.removeEventListener("mouseup", onGlobalMouseUp);
  };

  // cleanup on unmount in case interaction is active
  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onGlobalMouseMove);
      window.removeEventListener("mouseup", onGlobalMouseUp);
    };
  }, []);

  return {
    boxes,
    draft,
    selectedId,
    setSelectedId,

    containerRef,
    imageRef,
    mousePos,
    setMousePos,
    getImageDrawRect,

    onCanvasMouseDown,
    onCanvasMouseMove,
    onCanvasMouseUp,
    onBoxMouseDown,
    onHandleMouseDown,

    undo,
    redo,
    deleteSelected,
  };
}
