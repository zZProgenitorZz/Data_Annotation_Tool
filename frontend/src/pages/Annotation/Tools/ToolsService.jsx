import { useRef, useState, useEffect } from "react";
import {  updateImageAnnotation, getImageAnnotation } from "../../../services/annotationService";
import { setAnnotationCache } from "../../../utils/useImageAnnotations";



// export async function updateBboxImageAnnotations(imageId, boxes, forRemark = false) {
  
//   const annotations = boxes.map((box) => ({
//     id: box.id,
//     label: box.category,
//     type: "bbox",
//     geometry: {
//       x: box.x,
//       y: box.y,
//       width: box.w,
//       height: box.h,
//     },
//   }));


//   const payload = {
//     for_remark: forRemark,
//     imageId: imageId,
//     annotations: annotations,
//   };
//   console.log(payload)

//   return updateImageAnnotation(imageId, payload)
// }

// export async function updatePolygonImageAnnotations(
//   imageId,
//   polygons,
//   forRemark = false
// ) {
//   const annotations = polygons.map((polygon) => ({
//     id: polygon.id,
//     label: polygon.category,
//     type: "polygon",
//     geometry: {
//       // lijst met punten in genormaliseerde coords (0..1)
//       points: polygon.points.map((pt) => [pt.x, pt.y]),
//     },
//   }));

//   const payload = {
//     for_remark: forRemark,
//     imageId: imageId,
//     annotations: annotations,
//   };

//   return updateImageAnnotation(imageId, payload);
// }


export async function updateImageAnnotations_empty(imageId, forRemark = false) {


  const payload = {
    for_remark: forRemark,
    imageId: imageId,
    annotations: [],
  };

  const result = await updateImageAnnotation(imageId, payload)

  setAnnotationCache(imageId, payload);

  return result;
}

// Pakt ALLE annotaties (bbox + polygon) samen

export async function updateAllImageAnnotations(imageId, boxes, polygons, ellipses, strokes, regions, forRemark = false) {
  const bboxAnnotations = (boxes || []).map((box) => ({
    id: box.id,
    label: box.category,
    type: "bbox",
    geometry: {
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h,
    },
  }));

  const polygonAnnotations = (polygons || []).map((polygon) => ({
    id: polygon.id,
    label: polygon.category,
    type: "polygon",
    geometry: {
      // backend verwacht List[List[float]] → [[x,y], ...]
      points: polygon.points.map((pt) => [pt.x, pt.y]),
    },
  }));

  const ellipseAnnotations = (ellipses || []).map((el) => ({
    id: el.id,
    label: el.category,
    type: "ellipse",
    geometry: {
      cx: el.x + el.w / 2,
      cy: el.y + el.h / 2,
      rx: el.w / 2,
      ry: el.h / 2,
    },
  }));

  const pencilAnnotations = (strokes || []).map((stroke) => ({
    id: stroke.id,
    label: stroke.category,
    type: "freehand",
    geometry: {
      path: (stroke.points || []).map((pt) => [pt.x, pt.y]),
    },
  }));

  const maskAnnotations = (regions || []).map((rg) => ({
    id: rg.id,
    label: rg.category,
    type: "mask",
    geometry: {
      maskPath: (rg.points || []).map((pt) => [pt.x, pt.y]),
    },
  }));

  const payload = {
    for_remark: forRemark,
    imageId,
    annotations: [...bboxAnnotations, ...polygonAnnotations, ...ellipseAnnotations, ...pencilAnnotations, ...maskAnnotations],
  };

  const result = await updateImageAnnotation(imageId, payload);

  setAnnotationCache(imageId, payload);
  return result;
}
