// Tools/Ellipse/useEllipseTool.js
import { useState, useRef, useEffect } from "react";
import { useCanvasGeometry } from "../../../../utils/useCanvasGeometry";
import { useUndoRedoHistory } from "../../../../utils/useUndoRedoHistory";
import { useImageAnnotations } from "../../../../utils/useImageAnnotations";
import { clamp01 } from "../../../../utils/annotationGeometry";

const MIN_SIZE = 0.01; // in genormaliseerde coords (0–1)

export function useEllipseTool(selectedCategory, activeImageId, options = {}) {
  const { onHistoryPush, onResetHistory } = options;

  const {
    containerRef,
    imageRef,
    mousePos,
    setMousePos,
    toNorm,
    getImageDrawRect,
  } = useCanvasGeometry();

  // zelfde patroon als polygon: present = { ellipses, draft }
  const {
    present,
    setPresent,
    pushSnapshot,
    undo,
    redo,
    reset,
  } = useUndoRedoHistory({
    ellipses: [],
    draft: null, // {x1,y1,x2,y2} tijdens tekenen
  });

  const ellipses = present.ellipses;
  const draft = present.draft;
  const [selectedId, setSelectedId] = useState(null);

  const interactionRef = useRef(null); 
  // { type: "move" | "resize", id, start, ellipseStart, handle? }

  const saveHistory = () => {
    pushSnapshot(present);          // lokale ellipse-history
    if (onHistoryPush) onHistoryPush(); // globale history laten weten
  };

  // ====== Laden/opslaan via backend (net als bbox/polygon) ======
  useImageAnnotations({
    activeImageId,
    shapeType: "ellipse",
    shapes: ellipses,
    setShapesFromApi: (data) => {
      if (!data || !Array.isArray(data.annotations)) {
        reset({ ellipses: [], draft: null });
        setSelectedId(null);
        if (onResetHistory) onResetHistory();
        return;
      }

      const loaded = data.annotations
        .filter((ann) => ann.type === "ellipse" && ann.geometry)
        .map((ann) => ({
          id: ann.id,
          x: ann.geometry.cx - ann.geometry.rx,
          y: ann.geometry.cy - ann.geometry.ry,
          w: ann.geometry.rx * 2,
          h: ann.geometry.ry * 2,
          category: ann.label,
        }));

      reset({ ellipses: loaded, draft: null });
      setSelectedId(null);
      if (onResetHistory) onResetHistory();
    },
  });

  const updateEllipseById = (id, updater) => {
    setPresent((cur) => ({
      ...cur,
      ellipses: cur.ellipses.map((el) =>
        el.id === id ? { ...el, ...updater(el) } : el
      ),
    }));
  };

  // ====== Nieuw ellipse tekenen ======
  const onCanvasMouseDown = (e) => {
    if (e.button !== 0) return;
    const p = toNorm(e);
    if (!p) return;

    setSelectedId(null);
    
    setPresent((cur) => ({
      ...cur,
      draft: { x1: p.x, y1: p.y, x2: p.x, y2: p.y },
    }));
  };

  const onCanvasMouseMove = (e) => {
    const p = toNorm(e);
    if (!p) return;

    setMousePos(p);

    if (!draft) return;
    setPresent((cur) => {
      if (!cur.draft) return cur;
      return {
        ...cur,
        draft: { ...cur.draft, x2: p.x, y2: p.y },
      };
    });
  };

  const onCanvasMouseUp = () => {
    if (!draft) return;
    const { x1, y1, x2, y2 } = draft;

    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    if (w < MIN_SIZE || h < MIN_SIZE) {
      // te klein → weggooien
      setPresent((cur) => ({ ...cur, draft: null }));
      return;
    }

    const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());

    const newEllipse = {
      id,
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w,
      h,
      category: selectedCategory,
    };

    
    // 1) state VOOR deze ellipse (voor undo)
    const prevState = {
      ellipses: ellipses, // huidige lijst, zonder nieuwe ellipse
      draft: null,
    };

    // → zet die in de lokale history
    pushSnapshot(prevState);

    // → update globale undo-stack
    if (onHistoryPush) onHistoryPush();

    // 2) state NA deze actie (met ellipse erin)
    const nextState = {
      ellipses: [...ellipses, newEllipse],
      draft: null,
    };

    setPresent(nextState);
    setSelectedId(id);
  };

  // ====== Selecteren / bewegen / resizen ======
  const onEllipseMouseDown = (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    const p = toNorm(e);
    if (!p) return;

    const ellipse = ellipses.find((el) => el.id === id);
    if (!ellipse) return;

    saveHistory();
    setSelectedId(id);

    interactionRef.current = {
      type: "move",
      id,
      start: p,
      ellipseStart: { ...ellipse },
    };

    window.addEventListener("mousemove", onGlobalMouseMove);
    window.addEventListener("mouseup", onGlobalMouseUp);
  };

  const onHandleMouseDown = (e, id, handle) => {
    // handle: "nw","n","ne","e","se","s","sw","w"
    e.preventDefault();
    e.stopPropagation();

    const p = toNorm(e);
    if (!p) return;

    const ellipse = ellipses.find((el) => el.id === id);
    if (!ellipse) return;

    saveHistory();
    setSelectedId(id);

    interactionRef.current = {
      type: "resize",
      id,
      handle,
      start: p,
      ellipseStart: { ...ellipse },
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

    const { x, y, w, h } = info.ellipseStart;

    if (info.type === "move") {
      let newX = x + dx;
      let newY = y + dy;

      newX = clamp01(Math.min(newX, 1 - w));
      newY = clamp01(Math.min(newY, 1 - h));

      updateEllipseById(info.id, () => ({
        x: newX,
        y: newY,
      }));
    }

    if (info.type === "resize") {
      let left = x;
      let top = y;
      let right = x + w;
      let bottom = y + h;

      // horizontaal
      if (info.handle.includes("w")) {
        left = Math.min(left + dx, right - MIN_SIZE);
      }
      if (info.handle.includes("e")) {
        right = Math.max(right + dx, left + MIN_SIZE);
      }

      // verticaal
      if (info.handle.includes("n")) {
        top = Math.min(top + dy, bottom - MIN_SIZE);
      }
      if (info.handle.includes("s")) {
        bottom = Math.max(bottom + dy, top + MIN_SIZE);
      }

      left = clamp01(left);
      top = clamp01(top);
      right = clamp01(Math.min(right, 1));
      bottom = clamp01(Math.min(bottom, 1));

      right = Math.max(right, left + MIN_SIZE);
      bottom = Math.max(bottom, top + MIN_SIZE);

      updateEllipseById(info.id, () => ({
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

  // cleanup bij unmount (zelfde idee als bbox)
  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onGlobalMouseMove);
      window.removeEventListener("mouseup", onGlobalMouseUp);
    };
  }, []);

  // ====== Delete / Undo / Redo ======
  const deleteSelected = () => {
    if (!selectedId) return;

    saveHistory();
    setPresent((cur) => ({
      ...cur,
      ellipses: cur.ellipses.filter((el) => el.id !== selectedId),
    }));
    setSelectedId(null);
  };

  return {
    ellipses,
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

    onEllipseMouseDown,
    onHandleMouseDown,

    undo,
    redo,
    deleteSelected,
  };
}
