// src/utils/uploadImagesToS3.js
import { presignImages, completeImage, completeImagesBulk } from "../services/ImageService";

const putToS3 = (putUrl, headers, file, onProg) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", putUrl);
    Object.entries(headers || {}).forEach(([k, v]) =>
      xhr.setRequestHeader(k, v)
    );
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProg) {
        onProg(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`S3 PUT ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(file);
  });

const getImageSize = (file) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });

/**
 * Algemene uploadfunctie die je overal kunt gebruiken.
 * @param {Object} params
 * @param {string} params.datasetId
 * @param {File[]} params.files
 * @param {(info: { imageId, pct, index, total }) => void} [params.onProgress]
 */
export async function uploadImagesToS3({ datasetId, files, onProgress }) {
  if (!files || !files.length) return;

  // 1) presign
  const presigned = await presignImages(datasetId, files);
  if (presigned.length !== files.length) {
    throw new Error("presigned length mismatch");
  }

  const completePayload = [];

  // 2) upload per file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const item = presigned[i];

    let width = 0;
    let height = 0;
    try {
      const size = await getImageSize(file);
      width = size.width;
      height = size.height;
    } catch (e) {
      console.warn("Could not read image size", e);
    }

    if (
      file.type &&
      item.headers?.["Content-Type"] &&
      file.type !== item.headers["Content-Type"]
    ) {
      console.warn(
        "Client/Server content-type mismatch",
        file.type,
        item.headers["Content-Type"]
      );
    }

    await putToS3(item.putUrl, item.headers, file, (pct) => {
      if (onProgress) {
        onProgress({
          imageId: item.imageId,
          pct,
          index: i,
          total: files.length,
        });
      }
    });

    completePayload.push({
      imageId: item.imageId,
      width,
      height,
      // checksum: "...",
    });
  }

  // 3) complete
  if (completePayload.length === 1) {
    const only = completePayload[0];
    await completeImage(only.imageId, {
      width: only.width,
      height: only.height,
      // checksum: only.checksum,
    });
    
  } else {
    await completeImagesBulk(completePayload);
  
  }

  return completePayload;
}


