// Tools/MagicWand/useMagicWandTool.js
import { useRef, useState, useEffect } from "react";
import { useCanvasGeometry } from "../../../../utils/useCanvasGeometry";
import { useUndoRedoHistory } from "../../../../utils/useUndoRedoHistory";
import { useImageAnnotations } from "../../../../utils/useImageAnnotations";
import { clamp01 } from "../../../../utils/annotationGeometry";

// ---- Mask helpers (uit je oude MagicWandTool) ----
function dilate(mask, W, H) {
  const out = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      let any = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (mask[(y + dy) * W + (x + dx)]) any = true;
        }
      }
      out[y * W + x] = any ? 1 : 0;
    }
  }
  return out;
}

function erode(mask, W, H) {
  const out = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      let all = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!mask[(y + dy) * W + (x + dx)]) all = false;
        }
      }
      out[y * W + x] = all ? 1 : 0;
    }
  }
  return out;
}

function closeMask(mask, W, H) {
  return erode(dilate(mask, W, H), W, H);
}

function convexHull(points) {
  if (points.length < 3) return points;
  points = [...points].sort((a, b) =>
    a.x === b.x ? a.y - b.y : a.x - b.x
  );
  const cross = (o, a, b) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of points) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    )
      lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    )
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function simplify(points, epsilon) {
  if (points.length < 3) return points;

  const lineDist = (p, a, b) =>
    Math.abs(
      (b.y - a.y) * p.x -
        (b.x - a.x) * p.y +
        b.x * a.y -
        b.y * a.x
    ) / Math.hypot(b.x - a.x, b.y - a.y);

  const recurse = (pts) => {
    let maxDist = 0;
    let idx = 0;

    for (let i = 1; i < pts.length - 1; i++) {
      const d = lineDist(pts[i], pts[0], pts[pts.length - 1]);
      if (d > maxDist) {
        maxDist = d;
        idx = i;
      }
    }

    if (maxDist > epsilon) {
      const left = recurse(pts.slice(0, idx + 1));
      const right = recurse(pts.slice(idx));
      return [...left.slice(0, -1), ...right];
    }

    return [pts[0], pts[pts.length - 1]];
  };

  return recurse(points);
}

function maskToHullPolygon(mask, WIDTH, HEIGHT) {
  let cleaned = dilate(mask, WIDTH, HEIGHT);
  cleaned = dilate(cleaned, WIDTH, HEIGHT);

  const closed = closeMask(cleaned, WIDTH, HEIGHT);

  const pts = [];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (closed[y * WIDTH + x]) pts.push({ x, y });
    }
  }

  if (pts.length < 5) return null;

  let hull = convexHull(pts);
  hull = simplify(hull, 6.5);

  if (hull.length > 18) {
    const step = Math.ceil(hull.length / 18);
    hull = hull.filter((_, i) => i % step === 0);
  }

  return {
    normPoints: hull.map((pt) => ({
      x: pt.x / WIDTH,
      y: pt.y / HEIGHT,
    })),
  };
}

// -------------------- Hook --------------------
export function useMagicWandTool(selectedCategory, activeImageId, options = {}) {
  const { onHistoryPush, onResetHistory } = options;

  const {
    containerRef,
    imageRef,
    toNorm,
    getImageDrawRect, // nog niet gebruikt, maar kan handig zijn
  } = useCanvasGeometry();

  const {
    present,
    setPresent,
    pushSnapshot,
    undo,
    redo,
    reset,
  } = useUndoRedoHistory({
    regions: [],
    draft: null,
  });

  const regions = present.regions;
  const [selectedId, setSelectedId] = useState(null);
  const [threshold, setThreshold] = useState(5);

  const movingWholeRef = useRef(null);
  const movingVertexRef = useRef(null);

  const WIDTH = 512;
  const HEIGHT = 512;

  // ============ Load/Save via backend ============
  useImageAnnotations({
    activeImageId,
    shapeType: "mask",
    shapes: regions,
    setShapesFromApi: (data) => {
      if (!data || !Array.isArray(data.annotations)) {
        reset({ regions: [], draft: null });
        setSelectedId(null);
        if (onResetHistory) onResetHistory();
        return;
      }

      const loaded = data.annotations
        .filter((ann) => ann.type === "mask" && ann.geometry?.maskPath)
        .map((ann) => ({
          id: ann.id,
          category: ann.label,
          points: ann.geometry.maskPath.map(([x, y]) => ({ x, y })),
          closed: true,
        }));

      reset({ regions: loaded, draft: null });
      setSelectedId(null);
      if (onResetHistory) onResetHistory();
    },
  });

  // ============ Floodfill ============
  const runFloodFill = async (p) => {
    const img = imageRef.current;
    if (!img) return null;

    const c = document.createElement("canvas");
    c.width = WIDTH;
    c.height = HEIGHT;

    const ctx = c.getContext("2d");

    ctx.filter = "blur(1.2px)";
    ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
    ctx.filter = "none";

    const { data } = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const mask = new Uint8Array(WIDTH * HEIGHT);

    const sx = Math.floor(p.x * WIDTH);
    const sy = Math.floor(p.y * HEIGHT);

    const idx = (y, x) => (y * WIDTH + x) * 4;

    const baseR = data[idx(sy, sx)];
    const baseG = data[idx(sy, sx) + 1];
    const baseB = data[idx(sy, sx) + 2];

    const q = [{ x: sx, y: sy }];
    mask[sy * WIDTH + sx] = 1;

    while (q.length) {
      const { x, y } = q.shift();

      const nb = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
        { x: x + 1, y: y + 1 },
        { x: x - 1, y: y + 1 },
        { x: x + 1, y: y - 1 },
        { x: x - 1, y: y - 1 },
      ];

      for (const n of nb) {
        if (n.x < 0 || n.x >= WIDTH || n.y < 0 || n.y >= HEIGHT) continue;

        const id = n.y * WIDTH + n.x;
        if (mask[id]) continue;

        const rVal = data[idx(n.y, n.x)];
        const gVal = data[idx(n.y, n.x) + 1];
        const bVal = data[idx(n.y, n.x) + 2];

        const diff =
          Math.abs(rVal - baseR) +
          Math.abs(gVal - baseG) +
          Math.abs(bVal - baseB);

        if (diff < threshold * 6) {
          mask[id] = 1;
          q.push(n);
        }
      }
    }

    return mask;
  };

  // ============ Click → nieuwe regio ============
  const onCanvasClick = async (e) => {
    const p = toNorm(e);
    if (!p) return;

    const newMask = await runFloodFill(p);
    if (!newMask) return;

    const poly = maskToHullPolygon(newMask, WIDTH, HEIGHT);
    if (!poly) return;

    pushSnapshot(present);
    if (onHistoryPush) onHistoryPush();

    const region = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      category: selectedCategory,
      points: poly.normPoints,
      // als je mask later naar backend wil sturen, kun je dat hier bewaren
      // mask: newMask,
    };

    setPresent((cur) => ({
      ...cur,
      regions: [...cur.regions, region],
    }));
    setSelectedId(region.id);
  };

  // ============ Hele regio slepen ============
  const onRegionMouseDown = (e, id) => {
    e.stopPropagation();
    const p = toNorm(e);
    if (!p) return;

    const region = regions.find((r) => r.id === id);
    if (!region) return;

    pushSnapshot(present);
    if (onHistoryPush) onHistoryPush();
    setSelectedId(id);

    movingWholeRef.current = {
      id,
      start: p,
      startPoints: region.points.map((pt) => ({ ...pt })),
    };

    window.addEventListener("mousemove", onMoveWhole);
    window.addEventListener("mouseup", stopMoveWhole);
  };

  const onMoveWhole = (e) => {
    const mv = movingWholeRef.current;
    if (!mv) return;

    const p = toNorm(e);
    if (!p) return;

    let dx = p.x - mv.start.x;
    let dy = p.y - mv.start.y;

    // Binnen [0,1] houden
    mv.startPoints.forEach((pt) => {
      if (pt.x + dx < 0) dx = -pt.x;
      if (pt.x + dx > 1) dx = 1 - pt.x;
      if (pt.y + dy < 0) dy = -pt.y;
      if (pt.y + dy > 1) dy = 1 - pt.y;
    });

    setPresent((cur) => ({
      ...cur,
      regions: cur.regions.map((r) =>
        r.id !== mv.id
          ? r
          : {
              ...r,
              points: mv.startPoints.map((pt) => ({
                x: clamp01(pt.x + dx),
                y: clamp01(pt.y + dy),
              })),
            }
      ),
    }));
  };

  const stopMoveWhole = () => {
    movingWholeRef.current = null;
    window.removeEventListener("mousemove", onMoveWhole);
    window.removeEventListener("mouseup", stopMoveWhole);
  };

  // ============ Vertex slepen (onVertexMouseDown) ============
  const onVertexMouseDown = (e, regionId, idx) => {
    e.stopPropagation();

    const p = toNorm(e);
    if (!p) return;

    const region = regions.find((r) => r.id === regionId);
    if (!region) return;

    pushSnapshot(present);
    if (onHistoryPush) onHistoryPush();
    setSelectedId(regionId);

    movingVertexRef.current = {
      regionId,
      idx,
    };

    window.addEventListener("mousemove", onMoveVertex);
    window.addEventListener("mouseup", stopMoveVertex);
  };

  const onMoveVertex = (e) => {
    const mv = movingVertexRef.current;
    if (!mv) return;

    const p = toNorm(e);
    if (!p) return;

    const x = clamp01(p.x);
    const y = clamp01(p.y);

    setPresent((cur) => ({
      ...cur,
      regions: cur.regions.map((r) =>
        r.id !== mv.regionId
          ? r
          : {
              ...r,
              points: r.points.map((pt, i) =>
                i === mv.idx ? { x, y } : pt
              ),
            }
      ),
    }));
  };

  const stopMoveVertex = () => {
    movingVertexRef.current = null;
    window.removeEventListener("mousemove", onMoveVertex);
    window.removeEventListener("mouseup", stopMoveVertex);
  };

  // cleanup bij unmount
  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onMoveWhole);
      window.removeEventListener("mouseup", stopMoveWhole);
      window.removeEventListener("mousemove", onMoveVertex);
      window.removeEventListener("mouseup", stopMoveVertex);
    };
  }, []);

  // ============ Delete ============
  const deleteSelected = () => {
    if (!selectedId) return;

    pushSnapshot(present);
    setPresent((cur) => ({
      ...cur,
      regions: cur.regions.filter((r) => r.id !== selectedId),
    }));
    setSelectedId(null);
  };

  return {
    regions,
    selectedId,
    setSelectedId,

    containerRef,
    imageRef,

    threshold,
    setThreshold,

    onCanvasClick,
    onRegionMouseDown,
    onVertexMouseDown,

    deleteSelected,
    undo,
    redo,
    reset,
  };
}
