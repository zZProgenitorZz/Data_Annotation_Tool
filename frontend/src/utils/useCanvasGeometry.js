// hooks/useCanvasGeometry.js
import { useRef, useState, useCallback } from "react";
import { getDrawRect, normFromMouseEvent } from "./annotationGeometry";

export function useCanvasGeometry() {
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const [mousePos, setMousePos] = useState(null);

  const toNorm = useCallback(
    (e) => normFromMouseEvent(e, imageRef),
    []
  );

  const getImageDrawRect = useCallback(() => {
    const img = imageRef.current;
    if (!img) return null;
    return getDrawRect(img);
  }, []);

  return {
    containerRef,
    imageRef,
    mousePos,
    setMousePos,
    toNorm,
    getImageDrawRect,
  };
}
