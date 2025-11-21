import { useRef, useState, useEffect } from "react";
import {  updateImageAnnotation, getImageAnnotation } from "../../../services/annotationService";



export async function updateBboxImageAnnotations(imageId, boxes, forRemark = false) {
  
  const annotations = boxes.map((box) => ({
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

  const payload = {
    for_remark: forRemark,
    imageId: imageId,
    annotations: annotations,
  };

  return updateImageAnnotation(imageId, payload)
}

export async function updateBboxImageAnnotations_noboxes(imageId, forRemark = false) {


  const payload = {
    for_remark: forRemark,
    imageId: imageId,
    annotations: [],
  };

  return updateImageAnnotation(imageId, payload)
}
