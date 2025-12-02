// hooks/useImageAnnotations.js
import { useEffect } from "react";
import { getImageAnnotation } from "../services/annotationService";

export function useImageAnnotations({ activeImageId, setShapesFromApi }) {
  useEffect(() => {
    if (!activeImageId) {
      setShapesFromApi?.(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const data = await getImageAnnotation(activeImageId);
        if (!cancelled && typeof setShapesFromApi === "function") {
          setShapesFromApi(data);
        }
      } catch (err) {
        console.error("Failed to load image annotations:", err);
        if (!cancelled && typeof setShapesFromApi === "function") {
          setShapesFromApi(null);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [activeImageId]); //  alleen activeImageId!
}
