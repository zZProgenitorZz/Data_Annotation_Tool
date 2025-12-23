import React, { useEffect, useState, useMemo } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { listImages, getSignedUrl, getGuestImages } from "../services/ImageService";
import { getImageAnnotation } from "../services/annotationService";
import { getAllLabels } from "../services/labelService";

// Kleine helper om datasetnaam "veilig" te maken voor een mapnaam
function slugify(name) {
  if (!name) return "dataset";
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function bboxFromPoints(points) {
  if (!points || !points.length) return null;

  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const [xRaw, yRaw] of points) {
    const x = clamp01(xRaw);
    const y = clamp01(yRaw);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const w = maxX - minX;
  const h = maxY - minY;

  if (w <= 0 || h <= 0) return null;

  return { x: minX, y: minY, w, h };
}

// Maakt van 1 annotatie een YOLO bbox (cx,cy,w,h) in genormaliseerde coords
function toYoloBbox(ann) {
  if (!ann || !ann.geometry) return null;

  const t = ann.type;
  const g = ann.geometry;

  let x, y, w, h;

  if (t === "bbox") {
    x = g.x;
    y = g.y;
    w = g.width;
    h = g.height;
    if (w <= 0 || h <= 0) return null;
  } else if (t === "polygon") {
    const bb = bboxFromPoints(g.points || []);
    if (!bb) return null;
    ({ x, y, w, h } = bb);
  } else if (t === "ellipse") {
    // ellipse komt als cx, cy, rx, ry uit backend
    const cx = g.cx;
    const cy = g.cy;
    const rx = g.rx;
    const ry = g.ry;
    if (rx <= 0 || ry <= 0) return null;

    x = cx - rx;
    y = cy - ry;
    w = rx * 2;
    h = ry * 2;
  } else if (t === "freehand") {
    const bb = bboxFromPoints(g.path || []);
    if (!bb) return null;
    ({ x, y, w, h } = bb);
  } else if (t === "mask") {
    const bb = bboxFromPoints(g.maskPath || []);
    if (!bb) return null;
    ({ x, y, w, h } = bb);
  } else {
    return null;
  }

  const x1 = Math.max(0, x);
  const y1 = Math.max(0, y);
  const x2 = Math.min(1, x + w);
  const y2 = Math.min(1, y + h);

  const ww = x2 - x1;
  const hh = y2 - y1;

  if (ww <= 0 || hh <= 0) return null;

  const cx = x1 + ww / 2;
  const cy = y1 + hh / 2;

  return { cx, cy, w: ww, h: hh };
}

// Converteer base64 (guest) naar Uint8Array voor JSZip
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function drawYoloOnImageBlob(imageBlob, yoloLines, idToLabel = []) {
  const bmp = await createImageBitmap(imageBlob);

  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(bmp, 0, 0);

  for (const line of yoloLines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length !== 5) continue;

    const classIdx = parseInt(parts[0], 10);
    const cx = Number(parts[1]);
    const cy = Number(parts[2]);
    const w = Number(parts[3]);
    const h = Number(parts[4]);

    if (![classIdx, cx, cy, w, h].every((v) => Number.isFinite(v))) continue;

    const x1 = (cx - w / 2) * canvas.width;
    const y1 = (cy - h / 2) * canvas.height;
    const ww = w * canvas.width;
    const hh = h * canvas.height;

    ctx.lineWidth = Math.max(2, canvas.width * 0.002);
    ctx.strokeStyle = "red";
    ctx.strokeRect(x1, y1, ww, hh);

    const labelText = idToLabel?.[classIdx] ?? String(classIdx);

    ctx.font = `${Math.max(14, canvas.width * 0.018)}px Arial`;
    ctx.fillStyle = "red";
    ctx.fillText(labelText, x1 + 4, Math.max(0, y1 + 4));
  }

  const outBlob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  );

  return outBlob;
}

const Export = ({ dataset, authType, onClose, onExported }) => {
  const [images, setImages] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [finished, setFinished] = useState(false);

  // Button hover / click effect (zelfde idee als ImageDeletion.jsx)
  const buttonEffects = useMemo(
    () => ({
      onMouseOver: (e) => {
        if (e.currentTarget.disabled) return;
        e.currentTarget.style.filter = "brightness(0.95)";
      },
      onMouseOut: (e) => {
        e.currentTarget.style.filter = "brightness(1)";
      },
      onMouseDown: (e) => {
        if (e.currentTarget.disabled) return;
        e.currentTarget.style.filter = "brightness(0.85)";
      },
      onMouseUp: (e) => {
        if (e.currentTarget.disabled) return;
        e.currentTarget.style.filter = "brightness(0.95)";
      },
    }),
    []
  );

  // ESC sluit popup (niet tijdens export om per ongeluk annuleren te voorkomen)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !isExporting) {
        onClose && onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, isExporting]);

  // Bij openen: images + labels ophalen
  useEffect(() => {
    let cancelled = false;

    async function fetchMeta() {
      if (!dataset || !dataset.id) {
        setLoadingMeta(false);
        return;
      }
      setLoadingMeta(true);
      setError(null);

      try {
        let imgs = [];
        if (authType === "user") {
          const result = await listImages(dataset.id);
          // alleen actieve images
          imgs = (result || []).filter((img) => img.is_active === true);
        } else {
          // guest
          const result = await getGuestImages(dataset.id);
          imgs = result || [];
        }

        const lbls = await getAllLabels(dataset.id);

        if (cancelled) return;

        setImages(imgs);
        setLabels(lbls || []);
      } catch (err) {
        console.error("Failed to fetch export meta:", err);
        if (!cancelled) {
          setError("Failed to load images/labels for export.");
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }

    fetchMeta();

    return () => {
      cancelled = true;
    };
  }, [dataset, authType]);

  // Map: labelName -> classId (0..N-1)
  const labelMap = useMemo(() => {
    if (!labels || !labels.length) return {};
    // sorteer op naam voor een stabiele volgorde
    const sorted = [...labels].sort((a, b) =>
      (a.labelName || "").localeCompare(b.labelName || "")
    );
    const map = {};
    sorted.forEach((l, idx) => {
      map[l.labelName] = idx;
    });
    return map;
  }, [labels]);

  const orderedLabelNames = useMemo(() => {
    if (!labels || !labels.length) return [];
    return [...labels]
      .sort((a, b) => (a.labelName || "").localeCompare(b.labelName || ""))
      .map((l) => l.labelName);
  }, [labels]);

  const handleExport = async () => {
    if (!dataset || !dataset.id) return;
    if (!images.length) {
      setError("This dataset has no images to export.");
      return;
    }

    setIsExporting(true);
    setError(null);
    setFinished(false);
    setProgress({ current: 0, total: images.length });

    try {
      const zip = new JSZip();

      const datasetFolderName = slugify(dataset.name || `dataset_${dataset.id}`);
      const rootFolder = zip.folder(datasetFolderName);
      const imagesFolder = rootFolder.folder("images");
      const annFolder = rootFolder.folder("Annotations");
      const imagesAnnotatedFolder = rootFolder.folder("images_annotaties");

      // classes.txt voor YOLO
      if (orderedLabelNames.length > 0) {
        rootFolder.file("classes.txt", orderedLabelNames.join("\n"));
      }

      let done = 0;

      // 1 image per keer (simpler, minder geheugenproblemen)
      for (const img of images) {
        done += 1;
        setProgress({ current: done, total: images.length });

        const imageId = img.id;
        const fileName = img.fileName || `${imageId}.jpg`;

        // --- Annotations ophalen ---
        let annData = null;
        try {
          annData = await getImageAnnotation(imageId);
        } catch (err) {
          console.warn("Failed to fetch annotation for image", imageId, err);
        }

        const anns =
          annData && Array.isArray(annData.annotations) ? annData.annotations : [];

        const lines = [];

        for (const ann of anns) {
          const labelName = ann.label;
          const classId = labelMap[labelName];

          if (classId === undefined) continue;

          const yoloBox = toYoloBbox(ann);
          if (!yoloBox) continue;

          const { cx, cy, w, h } = yoloBox;
          lines.push(
            `${classId} ${cx.toFixed(6)} ${cy.toFixed(6)} ${w.toFixed(6)} ${h.toFixed(6)}`
          );
        }

        const base = fileName.replace(/\.[^/.]+$/, "");
        const txtName = `${base}.txt`;
        annFolder.file(txtName, lines.join("\n"));

        if (authType === "user") {
          try {
            const { url } = await getSignedUrl(imageId);
            const res = await fetch(url);
            if (!res.ok) {
              console.warn("Failed to download image", imageId, res.status);
            } else {
              const blob = await res.blob();
              imagesFolder.file(fileName, blob);
              try {
                const annotatedBlob = await drawYoloOnImageBlob(
                  blob,
                  lines,
                  orderedLabelNames
                );
                if (annotatedBlob) {
                  imagesAnnotatedFolder.file(fileName, annotatedBlob);
                }
              } catch (e) {
                console.warn("Failed to render annotated image for", imageId, e);
              }
            }
          } catch (err) {
            console.warn("Error while downloading image", imageId, err);
          }
        } else {
          if (img.data) {
            try {
              const bytes = base64ToUint8Array(img.data);
              imagesFolder.file(fileName, bytes, { binary: true });

              const mime =
                fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
              const imageBlob = new Blob([bytes], { type: mime });

              const annotatedBlob = await drawYoloOnImageBlob(
                imageBlob,
                lines,
                orderedLabelNames
              );
              if (annotatedBlob) {
                imagesAnnotatedFolder.file(fileName, annotatedBlob);
              }
            } catch (err) {
              console.warn("Error converting guest image data for", imageId, err);
            }
          }
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const exportName = `${datasetFolderName}_yolo_export.zip`;
      saveAs(blob, exportName);

      setFinished(true);
      if (onExported) {
        onExported({ exportedImages: images.length });
      }
    } catch (err) {
      console.error("YOLO export failed:", err);
      setError("Something went wrong while creating the export.");
    } finally {
      setIsExporting(false);
    }
  };

  const isReady = !loadingMeta && images.length > 0 && labels.length > 0;

  const pillBase = {
    height: "34px",
    padding: "0 16px",
    borderRadius: "9999px",
    border: "1px solid rgba(0,0,0,0.14)",
    backgroundColor: "rgba(255,255,255,0.28)",
    color: "rgba(0,0,0,0.78)",
    fontWeight: 650,
    cursor: "pointer",
    transition: "background .15s, border-color .15s, transform .15s, opacity .15s",
    transform: "translateY(0px)",
    outline: "none",
    boxShadow: "none",
    appearance: "none",
    WebkitAppearance: "none",
  };

  // hover blijft hetzelfde, maar de buttons gaan niet "stijgen" meer
  const pillHoverOn = (el) => {
    el.style.backgroundColor = "rgba(255,255,255,0.40)";
    el.style.borderColor = "rgba(0,0,0,0.18)";
    el.style.transform = "translateY(0px)";
  };

  const pillHoverOff = (el) => {
    el.style.backgroundColor = "rgba(255,255,255,0.28)";
    el.style.borderColor = "rgba(0,0,0,0.14)";
    el.style.transform = "translateY(0px)";
  };

  const softCard = {
    backgroundColor: "rgba(255,255,255,0.70)",
    border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: "12px",
    padding: "10px 12px",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.52)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "14px",
      }}
      onClick={() => {
        if (!isExporting) {
          onClose && onClose();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "560px",
          maxWidth: "calc(100vw - 28px)",
          backgroundColor: "rgba(255,255,255,1)",
          borderRadius: "16px",
          boxShadow: "0px 10px 30px rgba(0,0,0,0.32)",
          border: "1px solid #B3DCD7",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "50px",
            backgroundColor: "rgba(143, 221, 212, 0.55)",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "rgba(0,0,0,0.78)",
              }}
            >
              Export YOLO dataset
            </div>
            <div style={{ fontSize: "13px", color: "rgba(0,0,0,0.62)", marginTop: "1px" }}>
              Dataset:{" "}
              <span style={{ fontWeight: 750, color: "rgba(0,0,0,0.78)" }}>
                {dataset?.name || `Dataset ${dataset?.id ?? ""}`}
              </span>
            </div>
          </div>

          <button
            onClick={() => !isExporting && onClose && onClose()}
            disabled={isExporting}
            style={{
              ...pillBase,
              width: "34px",
              padding: "0px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: "rgba(0,0,0,0.70)",
              opacity: isExporting ? 0.55 : 1,
              cursor: isExporting ? "not-allowed" : "pointer",
              backgroundColor: "rgba(255,255,255,0.45)",
              borderColor: "rgba(0,0,0,0.12)",
              transform: "translateY(0px)",
            }}
            onMouseEnter={(e) => {
              if (e.currentTarget.disabled) return;
              pillHoverOn(e.currentTarget);
            }}
            onMouseLeave={(e) => {
              if (e.currentTarget.disabled) return;
              pillHoverOff(e.currentTarget);
            }}
            onMouseDown={(e) => {
              if (e.currentTarget.disabled) return;
              e.currentTarget.style.transform = "translateY(0px)";
            }}
            aria-label="Close export"
            title={isExporting ? "Export in progress" : "Close"}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "16px" }}>
          {loadingMeta && (
            <div
              style={{
                fontSize: "14px",
                color: "rgba(0,0,0,0.62)",
                fontStyle: "italic",
                marginBottom: "10px",
              }}
            >
              Loading images and labels…
            </div>
          )}

          {!loadingMeta && (
            <>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
                <div
                  style={{
                    height: "28px",
                    padding: "0 12px",
                    borderRadius: "9999px",
                    border: "1px solid rgba(0,0,0,0.12)",
                    backgroundColor: "rgba(255,255,255,0.55)",
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: "13px",
                    fontWeight: 750,
                    color: "rgba(0,0,0,0.72)",
                  }}
                  title="Total active images"
                >
                  Images: {images.length}
                </div>

                <div
                  style={{
                    height: "28px",
                    padding: "0 12px",
                    borderRadius: "9999px",
                    border: "1px solid rgba(0,0,0,0.12)",
                    backgroundColor: "rgba(255,255,255,0.55)",
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: "13px",
                    fontWeight: 750,
                    color: "rgba(0,0,0,0.72)",
                  }}
                  title="Total categories"
                >
                  Categories: {labels.length}
                </div>
              </div>

              <div style={{ ...softCard, lineHeight: 1.55, color: "rgba(0,0,0,0.72)" }}>
                <div style={{ fontWeight: 800, marginBottom: "6px", color: "rgba(0,0,0,0.78)" }}>
                  Export structure
                </div>
                <div
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "12.5px",
                  }}
                >
                  • {slugify(dataset?.name)} / images / [&lt;images&gt;]
                  <br />• {slugify(dataset?.name)} / Annotations / [&lt;image_name&gt;.txt]
                  <br />• {slugify(dataset?.name)} / classes.txt
                  <br />• {slugify(dataset?.name)} / images_annotaties / [&lt;images&gt;]
                </div>
              </div>
            </>
          )}

          {isExporting && (
            <div
              style={{
                marginTop: "10px",
                fontSize: "13px",
                color: "rgba(0,0,0,0.72)",
                fontWeight: 650,
              }}
            >
              Exporting {progress.current} / {progress.total} images…
            </div>
          )}

          {finished && !error && (
            <div
              style={{
                marginTop: "10px",
                fontSize: "13px",
                color: "#047857",
                fontWeight: 750,
              }}
            >
              Export completed. Your ZIP file should start downloading.
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: "10px",
                fontSize: "13px",
                color: "#b91c1c",
                fontWeight: 750,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              marginTop: "18px",
              paddingTop: "12px",
              borderTop: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <button
              onClick={() => !isExporting && onClose && onClose()}
              disabled={isExporting}
              style={{
                ...pillBase,
                backgroundColor: "rgba(255,255,255,0.35)",
                border: "1px solid rgba(0,0,0,0.12)",
                color: "rgba(0,0,0,0.74)",
                fontWeight: 750,
                opacity: isExporting ? 0.55 : 1,
                cursor: isExporting ? "not-allowed" : "pointer",
                transform: "translateY(0px)",
              }}
              onMouseEnter={(e) => {
                if (e.currentTarget.disabled) return;
                pillHoverOn(e.currentTarget);
              }}
              onMouseLeave={(e) => {
                if (e.currentTarget.disabled) return;
                pillHoverOff(e.currentTarget);
              }}
              onMouseDown={(e) => {
                if (e.currentTarget.disabled) return;
                e.currentTarget.style.transform = "translateY(0px)";
              }}
              {...buttonEffects}
            >
              Cancel
            </button>

            <button
              onClick={handleExport}
              disabled={!isReady || isExporting}
              style={{
                ...pillBase,
                backgroundColor: "rgba(44, 191, 174, 0.95)",
                border: "1px solid rgba(0,0,0,0.14)",
                color: "rgba(0,0,0,0.74)",
                fontWeight: 750,
                opacity: !isReady || isExporting ? 0.55 : 1,
                cursor: !isReady || isExporting ? "not-allowed" : "pointer",
                transform: "translateY(0px)",
              }}
              onMouseEnter={(e) => {
                if (e.currentTarget.disabled) return;
                e.currentTarget.style.filter = "brightness(0.95)";
                e.currentTarget.style.transform = "translateY(0px)";
              }}
              onMouseLeave={(e) => {
                if (e.currentTarget.disabled) return;
                e.currentTarget.style.filter = "brightness(1)";
                e.currentTarget.style.transform = "translateY(0px)";
              }}
              onMouseDown={(e) => {
                if (e.currentTarget.disabled) return;
                e.currentTarget.style.filter = "brightness(0.90)";
                e.currentTarget.style.transform = "translateY(0px)";
              }}
              onMouseUp={(e) => {
                if (e.currentTarget.disabled) return;
                e.currentTarget.style.filter = "brightness(0.95)";
                e.currentTarget.style.transform = "translateY(0px)";
              }}
            >
              {isExporting ? "Exporting…" : "Export"}
            </button>
          </div>

          {!loadingMeta && labels.length === 0 && (
            <div
              style={{
                marginTop: "10px",
                fontSize: "13px",
                color: "rgba(0,0,0,0.62)",
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              No labels found for this dataset.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Export;
