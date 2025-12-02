// Tools/Polygon/usePolygonTool.js
import { useState, useRef } from "react";
import { useCanvasGeometry } from "../../../../utils/useCanvasGeometry";
import { useUndoRedoHistory } from "../../../../utils/useUndoRedoHistory";
import { useImageAnnotations } from "../../../../utils/useImageAnnotations";
import { clamp01 } from "../../../../utils/annotationGeometry";

export function usePolygonTool(selectedCategory, activeImageId, options = {}) {

  const { onHistoryPush, onResetHistory } = options;

  const {
    containerRef,
    imageRef,
    mousePos,
    setMousePos,
    toNorm,
    getImageDrawRect,
  } = useCanvasGeometry();

  // ⬇ LET OP: selectedId niet meer in de history stoppen
  const {
    present,
    setPresent,
    pushSnapshot,
    undo,
    redo,
    reset,
  } = useUndoRedoHistory({
    polygons: [],
    draft: [],
  });



  const polygons = present.polygons;
  const draft = present.draft;

  // ⬇ selectedId is nu eigen state
  const [selectedId, setSelectedId] = useState(null);

  const movingVertex = useRef(null);
  const movingWhole = useRef(null);

  const saveHistory = () => {
    // sla alleen shapes + draft op voor undo/redo
    pushSnapshot(present);
    if (onHistoryPush) onHistoryPush();
  };

  // Load/save polygons via shared hook
  useImageAnnotations({
    activeImageId,
    shapeType: "polygon",
    shapes: polygons,
    setShapesFromApi: (data) => {
      if (!data || !Array.isArray(data.annotations)) {
        reset({ polygons: [], draft: [] });
        setSelectedId(null);
        if (onResetHistory) onResetHistory(); // globale undo/redo reset
        return;
      }

      const loaded = data.annotations
        .filter((ann) => ann.type === "polygon" && ann.geometry?.points)
        .map((ann) => ({
          id: ann.id,
          category: ann.label,
          points: ann.geometry.points.map(([x, y]) => ({ x, y })),
        }));

      reset({ polygons: loaded, draft: [] });
      setSelectedId(null);
      if (onResetHistory) onResetHistory(); //  allse when loading
    },
  });

 

  const finishPolygon = () => {
    if (draft.length < 3) {
      saveHistory();
      setPresent((cur) => ({ ...cur, draft: [] }));
      return;
    }

    const newPoly = {
      id: crypto.randomUUID(),
      category: selectedCategory,
      points: draft.map((p) => ({
        x: clamp01(p.x),
        y: clamp01(p.y),
      })),
    };

    saveHistory();
    setPresent((cur) => ({
      ...cur,
      polygons: [...cur.polygons, newPoly],
      draft: [],
    }));
    setSelectedId(newPoly.id);
  };

  const onCanvasClick = (e) => {
    const p = toNorm(e);
    if (!p) return;

    setMousePos(p);

    // check of we dicht bij het eerste punt zijn → polygon sluiten
    if (draft.length >= 3) {
      const first = draft[0];
      const d = Math.hypot(first.x - p.x, first.y - p.y);
      if (d < 0.015) {
        finishPolygon();
        return;
      }
    }

    saveHistory();
    setPresent((cur) => ({
      ...cur,
      draft: [...cur.draft, { x: p.x, y: p.y }],
    }));
  };

  const onPolygonSelect = (id) => {
    // selecteren hoort meestal niet in undo/redo,
    // dus hier GEEN saveHistory meer
    setSelectedId(id);
  };

  const onVertexMouseDown = (e, polyId, index) => {
    e.stopPropagation();
    const p = toNorm(e);
    if (!p) return;

    saveHistory();
    setSelectedId(polyId);

    movingVertex.current = { polyId, index };

    window.addEventListener("mousemove", onMoveVertex);
    window.addEventListener("mouseup", stopMoveVertex);
  };

  const onMoveVertex = (e) => {
    const mv = movingVertex.current;
    if (!mv) return;

    const p = toNorm(e);
    if (!p) return;

    setPresent((cur) => ({
      ...cur,
      polygons: cur.polygons.map((poly) =>
        poly.id !== mv.polyId
          ? poly
          : {
              ...poly,
              points: poly.points.map((pt, i) =>
                i === mv.index ? { x: clamp01(p.x), y: clamp01(p.y) } : pt
              ),
            }
      ),
    }));
  };

  const stopMoveVertex = () => {
    movingVertex.current = null;
    window.removeEventListener("mousemove", onMoveVertex);
    window.removeEventListener("mouseup", stopMoveVertex);
  };

  const onPolygonMouseDown = (e, polyId) => {
    e.stopPropagation();
    const p = toNorm(e);
    if (!p) return;

    const poly = polygons.find((pl) => pl.id === polyId);
    if (!poly) return;

    // hier wél history voor undo van het slepen
    saveHistory();
    setSelectedId(polyId);

    movingWhole.current = {
      id: polyId,
      start: p,
      startPoints: poly.points.map((pt) => ({ ...pt })),
    };

    window.addEventListener("mousemove", onMoveWhole);
    window.addEventListener("mouseup", stopMoveWhole);
  };

  const onMoveWhole = (e) => {
    const mw = movingWhole.current;
    if (!mw) return;

    const p = toNorm(e);
    if (!p) return;

    let dx = p.x - mw.start.x;
    let dy = p.y - mw.start.y;

    const xs = mw.startPoints.map((pt) => pt.x);
    const ys = mw.startPoints.map((pt) => pt.y);

    let minX = Math.min(...xs) + dx;
    let maxX = Math.max(...xs) + dx;
    let minY = Math.min(...ys) + dy;
    let maxY = Math.max(...ys) + dy;

    if (minX < 0) dx -= minX;
    if (maxX > 1) dx -= maxX - 1;
    if (minY < 0) dy -= minY;
    if (maxY > 1) dy -= maxY - 1;

    setPresent((cur) => ({
      ...cur,
      polygons: cur.polygons.map((poly) =>
        poly.id !== mw.id
          ? poly
          : {
              ...poly,
              points: mw.startPoints.map((pt) => ({
                x: clamp01(pt.x + dx),
                y: clamp01(pt.y + dy),
              })),
            }
      ),
    }));
  };

  const stopMoveWhole = () => {
    movingWhole.current = null;
    window.removeEventListener("mousemove", onMoveWhole);
    window.removeEventListener("mouseup", stopMoveWhole);
  };

  const deleteSelected = () => {
    if (!selectedId) return;

    saveHistory();
    setPresent((cur) => ({
      ...cur,
      polygons: cur.polygons.filter((p) => p.id !== selectedId),
    }));
    setSelectedId(null);
  };

  const cancelDraft = () => {
    if (draft.length === 0) return;

    saveHistory();
    setPresent((cur) => ({ ...cur, draft: [] }));
  };

  return {
    polygons,
    draft,
    selectedId,
    setSelectedId,

    containerRef,
    imageRef,
    mousePos,
    setMousePos,
    getImageDrawRect,

    onCanvasClick,
    onPolygonSelect,
    onVertexMouseDown,
    onPolygonMouseDown,

    undo,
    redo,
    deleteSelected,
    cancelDraft,
  };
}
