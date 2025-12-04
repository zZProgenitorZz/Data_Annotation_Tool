// hooks/useImageAnnotations.js
import { useEffect } from "react";
import { getImageAnnotation } from "../services/annotationService";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 uur

// Globale in-memory cache: { imageId -> { data, timestamp } }
const annotationCache = new Map();

function isFresh(entry) {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Prefetch een batch annotaties voor een lijst imageIds.
 * Wordt aangeroepen vanuit AnnotationPage bij batch-prefetch.
 */
export async function prefetchAnnotations(imageIds) {
  const now = Date.now();

  const missing = imageIds.filter((id) => {
    const cached = annotationCache.get(id);
    return !cached || now - cached.timestamp > CACHE_TTL_MS;
  });

  if (missing.length === 0) return;

  await Promise.all(
    missing.map(async (id) => {
      try {
        const data = await getImageAnnotation(id);
        annotationCache.set(id, { data, timestamp: Date.now() });
      } catch (err) {
        console.error("Failed to prefetch annotation for image:", id, err);
      }
    })
  );
}

/**
 * Hook die nu eerst in de cache kijkt, en anders fetcht.
 * Alle tool-hooks (bbox, polygon, ellipse, ...) kunnen deze gewoon blijven gebruiken.
 */
export function useImageAnnotations({ activeImageId, setShapesFromApi }) {
  useEffect(() => {
    if (!activeImageId) {
      setShapesFromApi?.(null);
      return;
    }

    let cancelled = false;

    async function load() {
      // 1. probeer cache eerst
      const cached = annotationCache.get(activeImageId);
      if (isFresh(cached)) {
        if (!cancelled && typeof setShapesFromApi === "function") {
          setShapesFromApi(cached.data);
        }
        return;
      }

      // 2. anders ophalen en cachen
      try {
        const data = await getImageAnnotation(activeImageId);
        if (!cancelled && typeof setShapesFromApi === "function") {
          setShapesFromApi(data);
        }
        annotationCache.set(activeImageId, {
          data,
          timestamp: Date.now(),
        });
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
  }, [activeImageId]);
}
