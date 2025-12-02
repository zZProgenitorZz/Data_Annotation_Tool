// utils/annotationGeometry.js
export function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function getDrawRect(img) {
  const ir = img.getBoundingClientRect();

  const naturalW = img.naturalWidth || ir.width;
  const naturalH = img.naturalHeight || ir.height;
  if (!naturalW || !naturalH) {
    return {
      left: ir.left,
      top: ir.top,
      width: ir.width,
      height: ir.height,
    };
  }

  const containerW = ir.width;
  const containerH = ir.height;

  const scale = Math.min(containerW / naturalW, containerH / naturalH);
  const drawW = naturalW * scale;
  const drawH = naturalH * scale;

  const offsetX = (containerW - drawW) / 2;
  const offsetY = (containerH - drawH) / 2;

  return {
    left: ir.left + offsetX,
    top: ir.top + offsetY,
    width: drawW,
    height: drawH,
  };
}

export function getImageDrawRect(imgEl, containerEl) {
  if (!imgEl || !containerEl) return null;

  const dr = getDrawRect(imgEl);
  const contRect = containerEl.getBoundingClientRect();

  return {
    left: dr.left - contRect.left,
    top: dr.top - contRect.top,
    width: dr.width,
    height: dr.height,
  };
}


export function normFromMouseEvent(e, imageRef) {
  const img = imageRef.current;
  if (!img) return null;

  const dr = getDrawRect(img);
  const px = e.clientX;
  const py = e.clientY;

  if (
    px < dr.left ||
    px > dr.left + dr.width ||
    py < dr.top ||
    py > dr.top + dr.height
  ) {
    return null;
  }

  return {
    x: clamp01((px - dr.left) / dr.width),
    y: clamp01((py - dr.top) / dr.height),
  };
}
