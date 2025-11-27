// hooks/useImageAnnotations.js
import { useEffect, useRef } from "react";
import { getImageAnnotation } from "../services/annotationService";
import {
  updateBboxImageAnnotations,
  updateImageAnnotations_empty,
  updatePolygonImageAnnotations,
  
} from "../pages/Annotation/Tools/ToolsService";




// Alleen laden op basis van activeImageId
export function useImageAnnotations({ activeImageId, setShapesFromApi }) {
  useEffect(() => {
    if (!activeImageId) {
      setShapesFromApi(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const data = await getImageAnnotation(activeImageId);
        if (!cancelled) {
          setShapesFromApi(data);
        }
      } catch (err) {
        console.error("Failed to load image annotations:", err);
        if (!cancelled) {
          setShapesFromApi(null);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [activeImageId, setShapesFromApi]);
}











// // shapeType: "bbox" | "polygon"
// export function useImageAnnotations({
//   activeImageId,
//   shapeType,
//   shapes,
//   setShapesFromApi,
// }) {
//   const lastImageIdRef = useRef(null);
//   const lastShapesRef = useRef(null);

//   // save snapshots for unmount auto-save
//   useEffect(() => {
//     lastImageIdRef.current = activeImageId;
//     lastShapesRef.current = shapes;
//   }, [activeImageId, shapes]);

//   // Load when activeImageId changes, save previous
//   useEffect(() => {
//     let cancelled = false;

//     async function loadAndSave() {
//       const prevId = lastImageIdRef.current;
//       const prevShapes = lastShapesRef.current;
//       console.log(activeImageId)
//       console.log(prevId)

//       // 1) Save previous image for this shapeType
//       if (prevId) {
//         try {
//           if (shapeType === "bbox") {
//             if (prevShapes && prevShapes.length > 0) {
                
//               await updateBboxImageAnnotations(prevId, prevShapes, false);
//             } else {
//               await updateImageAnnotations_empty(prevId, false);
//             }
//           }

//           if (shapeType === "polygon") {
//             if (prevShapes && prevShapes.length > 0) {
//               await updatePolygonImageAnnotations(prevId, prevShapes, false);
//             } else {
//               await updateImageAnnotations_empty(prevId, false);
//             }
//           }
//         } catch (err) {
//           console.error(`Failed to auto-save ${shapeType} for image`, prevId, err);
//         }
//       }

//       if (!activeImageId || cancelled) return;

//       // 2) Load annotations for new image
//       try {
//         const data = await getImageAnnotation(activeImageId);
//         if (cancelled) return;
//         setShapesFromApi(data);
//       } catch (err) {
//         console.error("Failed to load image annotations:", err);
//         if (!cancelled) {
//           setShapesFromApi(null);
//         }
//       }
//     }

//     loadAndSave();

//     return () => {
//       cancelled = true;
//     };
//   }, [activeImageId, shapeType, setShapesFromApi]);

//   // Unmount auto-save
//   useEffect(() => {
//     return () => {
//       const lastId = lastImageIdRef.current;
//       const lastShapes = lastShapesRef.current;
//       if (!lastId) return;

//       if (shapeType === "bbox") {
//         if (lastShapes && lastShapes.length > 0) {
//           updateBboxImageAnnotations(lastId, lastShapes, false);
//         } else {
//           updateImageAnnotations_empty(lastId, false);
//         }
//       }

//       if (shapeType === "polygon") {
//         if (lastShapes && lastShapes.length > 0) {
//           updatePolygonImageAnnotations(lastId, lastShapes, false);
//         } else {
//           updateImageAnnotations_empty(lastId, false);
//         }
//       }
//     };
//   }, [shapeType]);
// }
