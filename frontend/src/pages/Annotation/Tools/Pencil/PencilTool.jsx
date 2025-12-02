// Tools/Pencil/usePencilTool.js
import { useState, useRef, useEffect } from "react";
import { useCanvasGeometry } from "../../../../utils/useCanvasGeometry";
import { useUndoRedoHistory } from "../../../../utils/useUndoRedoHistory";
import { useImageAnnotations } from "../../../../utils/useImageAnnotations";
import { clamp01 } from "../../../../utils/annotationGeometry";

const CONTINUE_THRESHOLD = 0.02;
const CLOSE_THRESHOLD = 0.01;

export function usePencilTool(selectedCategory, activeImageId, options = {}) {
  const { onHistoryPush, onResetHistory } = options;

  const {
    containerRef,
    imageRef,
    mousePos,
    setMousePos,
    toNorm,
    getImageDrawRect,
  } = useCanvasGeometry();

  // strokes + draft in één history-state (zelfde patroon als polygon/ellipse)
  const {
    present,
    setPresent,
    pushSnapshot,
    undo,
    redo,
    reset,
  } = useUndoRedoHistory({
    strokes: [],
    draft: [],
  });

  const strokes = present.strokes;
  const draft = present.draft;

  const [selectedId, setSelectedId] = useState(null);

  const isDrawingRef = useRef(false);
  const movingRef = useRef(null);

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const getBounds = (pts) => {
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    pts.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });

    return { minX, minY, maxX, maxY };
  };

  const saveHistory = () => {
    // zelfde idee als polygon/ellipse: shapes + draft in history
    pushSnapshot(present);
    if (onHistoryPush) onHistoryPush();
  };

  // ====== Laden / opslaan via backend ======
    useImageAnnotations({
    activeImageId,
    shapeType: "freehand",          
    shapes: strokes,
    setShapesFromApi: (data) => {
        if (!data || !Array.isArray(data.annotations)) {
        reset({ strokes: [], draft: [] });
        setSelectedId(null);
        if (onResetHistory) onResetHistory();
        return;
        }

        const loaded = data.annotations
        // pas deze string aan als jouw backend een andere type-naam gebruikt
        .filter((ann) => ann.type === "freehand" && ann.geometry?.path)
        .map((ann) => ({
            id: ann.id,
            category: ann.label,
            // FreehandGeometry.path: List[List[float]]  -> [{x, y}, ...]
            points: ann.geometry.path.map(([x, y]) => ({ x, y })),
            closed: true, // we gaan ervan uit dat opgeslagen strokes "af" zijn
        }));

        reset({ strokes: loaded, draft: [] });
        setSelectedId(null);
        if (onResetHistory) onResetHistory();
    },
    });


  // ====== Tekenen van een stroke ======
  const onCanvasMouseDown = (e) => {
    if (e.button !== 0) return;
    if (movingRef.current) return;

    const p = toNorm(e);
    if (!p) return;

    setMousePos(p);

    saveHistory();
    isDrawingRef.current = true;
    setSelectedId(null);

    const last = strokes[strokes.length - 1];

    // bestaande open stroke verder tekenen
    if (last && !last.closed && last.points.length > 1) {
      const end = last.points[last.points.length - 1];
      if (dist(p, end) < CONTINUE_THRESHOLD) {
        setPresent((cur) => ({
          ...cur,
          draft: [...last.points, { x: p.x, y: p.y }],
        }));
        return;
      }
    }

    // nieuwe stroke
    setPresent((cur) => ({
      ...cur,
      draft: [{ x: p.x, y: p.y }],
    }));
  };

  const onCanvasMouseMove = (e) => {
    const p = toNorm(e);
    if (!p) return;

    setMousePos(p);

    if (movingRef.current) return;
    if (!isDrawingRef.current) return;

    setPresent((cur) => ({
      ...cur,
      draft: [...cur.draft, { x: p.x, y: p.y }],
    }));
  };

  const onCanvasMouseUp = () => {
    if (movingRef.current) return;
    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;

    const curDraft = draft;
    if (!curDraft || curDraft.length < 2) {
      // te kort → weggooien
      setPresent((cur) => ({ ...cur, draft: [] }));
      return;
    }

    const start = curDraft[0];
    const end = curDraft[curDraft.length - 1];
    const shouldClose = dist(start, end) < CLOSE_THRESHOLD;

    setPresent((cur) => {
      const existing = cur.strokes;
      const last = existing[existing.length - 1];

      // laatste open stroke overschrijven
      if (last && !last.closed) {
        const updated = [
          ...existing.slice(0, -1),
          { ...last, points: curDraft, closed: shouldClose },
        ];
        return { ...cur, strokes: updated, draft: [] };
      }

      // nieuwe stroke toevoegen
      const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now());

      return {
        ...cur,
        strokes: [
          ...existing,
          {
            id,
            category: selectedCategory,
            points: curDraft,
            closed: shouldClose,
          },
        ],
        draft: [],
      };
    });
  };

  // ====== Stroke verplaatsen ======
  const onStrokeMouseDown = (e, id) => {
    e.stopPropagation();

    const p = toNorm(e);
    if (!p) return;

    const stroke = strokes.find((s) => s.id === id);
    if (!stroke || !stroke.closed) return;

    saveHistory();
    setSelectedId(id);
    isDrawingRef.current = false;

    const bbox = getBounds(stroke.points);

    movingRef.current = {
      id,
      start: p,
      original: stroke.points,
      bbox,
    };

    // tijdens drag via window-events (zoals bij bbox/polygon/ellipse)
    window.addEventListener("mousemove", onMoveStroke);
    window.addEventListener("mouseup", stopMoveStroke);
  };

  const onMoveStroke = (e) => {
    const mv = movingRef.current;
    if (!mv) return;

    const p = toNorm(e);
    if (!p) return;

    let dx = p.x - mv.start.x;
    let dy = p.y - mv.start.y;

    // binnen [0,1] houden
    if (mv.bbox.minX + dx < 0) dx = -mv.bbox.minX;
    if (mv.bbox.maxX + dx > 1) dx = 1 - mv.bbox.maxX;

    if (mv.bbox.minY + dy < 0) dy = -mv.bbox.minY;
    if (mv.bbox.maxY + dy > 1) dy = 1 - mv.bbox.maxY;

    const moved = mv.original.map((pt) => ({
      x: clamp01(pt.x + dx),
      y: clamp01(pt.y + dy),
    }));

    setPresent((cur) => ({
      ...cur,
      strokes: cur.strokes.map((s) =>
        s.id === mv.id ? { ...s, points: moved } : s
      ),
    }));
  };

  const stopMoveStroke = () => {
    movingRef.current = null;
    window.removeEventListener("mousemove", onMoveStroke);
    window.removeEventListener("mouseup", stopMoveStroke);
  };

  // cleanup bij unmount (zoals andere tools)
  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onMoveStroke);
      window.removeEventListener("mouseup", stopMoveStroke);
    };
  }, []);

  // ====== Delete / cancel / undo / redo ======
  const deleteSelected = () => {
    if (!selectedId) return;

    saveHistory();
    setPresent((cur) => ({
      ...cur,
      strokes: cur.strokes.filter((s) => s.id !== selectedId),
    }));
    setSelectedId(null);
  };

  const cancelDraft = () => {
    if (!draft || draft.length === 0) return;

    saveHistory();
    setPresent((cur) => ({ ...cur, draft: [] }));
  };

  return {
    // data
    strokes,
    draft,
    selectedId,
    setSelectedId,

    // geometry
    containerRef,
    imageRef,
    mousePos,
    setMousePos,
    getImageDrawRect,

    // tekenen
    onCanvasMouseDown,
    onCanvasMouseMove,
    onCanvasMouseUp,

    // stroke interactie
    onStrokeMouseDown,

    // bewerken
    deleteSelected,
    cancelDraft,

    // history (voor globale undo/redo)
    undo,
    redo,
    reset,
  };
}
