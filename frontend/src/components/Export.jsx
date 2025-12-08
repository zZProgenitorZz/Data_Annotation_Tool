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

  // center + clamping
  const cx = clamp01(x + w / 2);
  const cy = clamp01(y + h / 2);
  const ww = clamp01(w);
  const hh = clamp01(h);

  if (ww <= 0 || hh <= 0) return null;

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
      .sort((a, b) =>
        (a.labelName || "").localeCompare(b.labelName || "")
      )
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

        const anns = annData && Array.isArray(annData.annotations)
          ? annData.annotations
          : [];

        const lines = [];

        for (const ann of anns) {
          const labelName = ann.label;
          const classId = labelMap[labelName];

          // als label niet in de huidige lijst zit, skip
          if (classId === undefined) continue;

          const yoloBox = toYoloBbox(ann);
          if (!yoloBox) continue;

          const { cx, cy, w, h } = yoloBox;
          lines.push(
            `${classId} ${cx.toFixed(6)} ${cy.toFixed(6)} ${w.toFixed(6)} ${h.toFixed(6)}`
          );
        }

        // .txt bestand met zelfde basename als image
        const base = fileName.replace(/\.[^/.]+$/, "");
        const txtName = `${base}.txt`;
        annFolder.file(txtName, lines.join("\n"));

        // --- Image data in zip ---
        if (authType === "user") {
          try {
            const { url } = await getSignedUrl(imageId);
            const res = await fetch(url);
            if (!res.ok) {
              console.warn("Failed to download image", imageId, res.status);
            } else {
              const blob = await res.blob();
              imagesFolder.file(fileName, blob);
            }
          } catch (err) {
            console.warn("Error while downloading image", imageId, err);
          }
        } else {
          // guest: base64 data zit al in img.data
          if (img.data) {
            try {
              const bytes = base64ToUint8Array(img.data);
              imagesFolder.file(fileName, bytes, { binary: true });
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
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
          width: "520px",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0px 6px 20px rgba(0,0,0,0.3)",
          paddingBottom: "20px",
          position: "relative",
        }}
      >
        {/* Close (X) */}
        <button
          onClick={() => !isExporting && onClose && onClose()}
          style={{
            position: "absolute",
            top: "8px",
            right: "10px",
            background: "none",
            border: "none",
            fontSize: "20px",
            fontWeight: 700,
            cursor: isExporting ? "not-allowed" : "pointer",
            color: "#555",
          }}
        >
          ✕
        </button>

        {/* Titel */}
        <div style={{ padding: "24px 24px 8px 24px" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>
            Export YOLO dataset
          </div>
          <div style={{ fontSize: "14px", color: "#555" }}>
            Dataset:{" "}
            <span style={{ fontWeight: 600 }}>
              {dataset?.name || `Dataset ${dataset?.id ?? ""}`}
            </span>
          </div>
        </div>

        {/* Info / status blok */}
        <div style={{ padding: "0 24px 8px 24px" }}>
          {loadingMeta && (
            <div
              style={{
                fontSize: "14px",
                color: "#555",
                fontStyle: "italic",
                marginBottom: "8px",
              }}
            >
              Loading images and labels…
            </div>
          )}

          {!loadingMeta && (
            <>
              <div style={{ fontSize: "14px", marginBottom: "4px" }}>
                <strong>Images:</strong> {images.length}
              </div>
              <div style={{ fontSize: "14px", marginBottom: "8px" }}>
                <strong>Categories:</strong> {labels.length}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#555",
                  backgroundColor: "#F5F5F5",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  lineHeight: 1.5,
                }}
              >
                Export structure:
                <br />
                • <code>{slugify(dataset?.name)} / images / [&lt;images&gt;]</code>
                <br />
                • <code>{slugify(dataset?.name)} / Annotations / [&lt;image_name&gt;.txt]</code>
                <br />
                • <code>{slugify(dataset?.name)} / classes.txt</code>
              </div>
            </>
          )}

          {isExporting && (
            <div
              style={{
                marginTop: "10px",
                fontSize: "13px",
                color: "#333",
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
                fontWeight: 600,
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
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Buttons onder */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "24px",
            marginTop: "20px",
          }}
        >
          <button
            onClick={() => !isExporting && onClose && onClose()}
            disabled={isExporting}
            style={{
              padding: "10px 26px",
              borderRadius: "10px",
              backgroundColor: "#E9E6E4",
              border: "2px solid #D8D3D0",
              fontWeight: 600,
              cursor: isExporting ? "not-allowed" : "pointer",
              opacity: isExporting ? 0.7 : 1,
            }}
            {...buttonEffects}
          >
            Cancel
          </button>

          <button
            onClick={handleExport}
            disabled={!isReady || isExporting}
            style={{
              padding: "10px 28px",
              borderRadius: "10px",
              backgroundColor:
                !isReady || isExporting ? "#C7D2FE" : "#4F46E5",
              border: "2px solid #4338CA",
              color: "#FFF",
              fontWeight: 700,
              cursor: !isReady || isExporting ? "not-allowed" : "pointer",
              opacity: !isReady || isExporting ? 0.8 : 1,
            }}
            {...buttonEffects}
          >
            {isExporting ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Export;
