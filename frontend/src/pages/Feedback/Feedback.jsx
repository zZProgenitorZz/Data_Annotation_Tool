import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import expandIcon from "../../assets/feedback/expand-details.png";
import minimizeIcon from "../../assets/feedback/minimize-details.png";
import maximizeIcon from "../../assets/feedback/maximize.png";
import editIcon from "../../assets/feedback/edit.png";

import BoundingBoxOverlay from "../Annotation/Tools/BoundingBox/BoundingBoxOverlay";
import PolygonOverlay from "../Annotation/Tools/Polygon/PolygonOverlay";
import EllipseOverlay from "../Annotation/Tools/Ellipse/EllipseOverlay";
import PencilOverlay from "../Annotation/Tools/Pencil/PencilOverlay";
import MagicWandOverlay from "../Annotation/Tools/MagicWand/MagicWandOverlay";

import { getImageDrawRect } from "../../utils/annotationGeometry";
import { useImageAnnotations, prefetchAnnotations } from "../../utils/useImageAnnotations";

import prevIcon from "../../assets/feedback/previous_image.png";
import nextIcon from "../../assets/feedback/next_image.png";

import Toast from "../Annotation/components/Toast";

import { AuthContext } from "../../components/AuthContext";
import { getAllDatasets } from "../../services/datasetService";
import { getAllUsers } from "../../services/authService";
import { parseAssignedTo } from "../../utils/utils";
import { getSignedUrl, listImages } from "../../services/ImageService";
import { getAllRemarks, updateRemark } from "../../services/remarkService";

/** ---------------------------
 *  Small utils
 *  -------------------------- */
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function safeStr(v) {
  return v == null ? "" : String(v);
}

function toId(v) {
  return v == null ? "" : String(v);
}

function getFileNameFromSrc(src) {
  if (!src) return "";
  try {
    const clean = String(src).split("?")[0].split("#")[0];
    const parts = clean.split("/");
    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
}

function isFeedbackRemark(r) {
  return r?.feedback === true;
}

function isOpenRequestRemark(r) {
  // status false => annotator asked feedback (open)
  return isFeedbackRemark(r) && r?.status === false;
}

function isAnsweredFeedbackRemark(r) {
  // status true => reviewer replied (closed)
  return isFeedbackRemark(r) && r?.status === true;
}

async function runPool(items, limit, worker) {
  const results = [];
  const queue = [...items];
  const runners = new Array(Math.max(1, limit)).fill(0).map(async () => {
    while (queue.length) {
      const it = queue.shift();
      try {
        const out = await worker(it);
        if (out !== undefined) results.push(out);
      } catch (e) {
        // non-fatal; worker should log if needed
      }
    }
  });
  await Promise.all(runners);
  return results;
}
/* overlay Helper  */
function ReadOnlyOverlays({ imageId, imageRect }) {
  const [apiShapes, setApiShapes] = useState(null);

  // ✅ hook vult jouw state (hij returnt geen data)
  useImageAnnotations({
    activeImageId: imageId,
    setShapesFromApi: setApiShapes,
  });

  if (!imageId || !imageRect || !apiShapes) return null;

  // ✅ probeer meerdere mogelijke shapes-keys (verschilt per backend)
  const data = apiShapes || {};
  if (!imageId || !imageRect) return null;

  const annotations = Array.isArray(data.annotations) ? data.annotations : [];

  const toPoints = (raw) => {
    if (!Array.isArray(raw) || raw.length === 0) return [];

    // [[x,y], ...]
    if (Array.isArray(raw[0])) {
      return raw
        .map((p) => ({ x: p?.[0], y: p?.[1] }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    }

    // [{x,y}, ...]
    if (typeof raw[0] === "object") {
      return raw
        .map((p) => ({ x: p?.x, y: p?.y }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    }

    return [];
  };

  // bbox (zelfde mapping als BoundingBoxTool.jsx)
  const boxes = annotations
    .filter((ann) => ann.type === "bbox" && ann.geometry)
    .map((ann) => ({
      id: ann.id,
      x: ann.geometry.x,
      y: ann.geometry.y,
      w: ann.geometry.width,
      h: ann.geometry.height,
      category: ann.label,
    }));

  // ellipse (zelfde mapping als EllipseTool.jsx)
  const ellipses = annotations
    .filter((ann) => ann.type === "ellipse" && ann.geometry)
    .map((ann) => ({
      id: ann.id,
      x: ann.geometry.cx - ann.geometry.rx,
      y: ann.geometry.cy - ann.geometry.ry,
      w: ann.geometry.rx * 2,
      h: ann.geometry.ry * 2,
      category: ann.label,
    }));

  // freehand (zelfde mapping als PencilTool.jsx)
  const strokes = annotations
    .filter((ann) => ann.type === "freehand" && ann.geometry?.path)
    .map((ann) => ({
      id: ann.id,
      category: ann.label,
      points: ann.geometry.path.map(([x, y]) => ({ x, y })),
      closed: true,
    }));

  // polygon (robust: verschillende mogelijke geometry keys)
  const polygons = annotations
    .filter((ann) => ann.type === "polygon" && ann.geometry)
    .map((ann) => {
      const g = ann.geometry || {};
      const pts = toPoints(g.points || g.vertices || g.path || []);
      return {
        id: ann.id,
        category: ann.label,
        points: pts,
        closed: true,
      };
    })
    .filter((p) => p.points.length >= 2);

  // mask / magicwand (ook robust + support voor geometry.regions)
  const regions = annotations
    .filter((ann) => ["mask", "magicwand", "region"].includes(ann.type))
    .flatMap((ann) => {
      const g = ann.geometry || {};

      if (Array.isArray(g.regions)) {
        return g.regions.map((r, idx) => {
          const pts = toPoints(r.points || r.vertices || r.path || r.contour || []);
          return {
            id: `${ann.id}_${idx}`,
            category: ann.label,
            points: pts,
            vertices: pts, // extra veld (kan helpen als overlay 'vertices' verwacht)
          };
        });
      }

      const pts = toPoints(g.points || g.vertices || g.path || g.contour || []);
      if (pts.length === 0) return [];

      return [
        {
          id: ann.id,
          category: ann.label,
          points: pts,
          vertices: pts,
        },
      ];
    });

  // Debug (tijdelijk): check of je überhaupt data hebt
  // console.log("ReadOnlyOverlays", { imageId, imageRect, apiShapes });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 20, // ✅ BELANGRIJK: zorg dat overlays boven image liggen
      }}
    >
      <BoundingBoxOverlay
        boxes={boxes}
        draft={null}
        selectedId={null}
        setSelectedId={() => {}}
        onBoxMouseDown={() => {}}
        onHandleMouseDown={() => {}}
        imgLeft={imageRect.left}
        imgTop={imageRect.top}
        imgWidth={imageRect.width}
        imgHeight={imageRect.height}
      />

      <PolygonOverlay
        polygons={polygons}
        draft={[]}
        selectedId={null}
        onVertexMouseDown={() => {}}
        onPolygonMouseDown={() => {}}
        onSelect={() => {}}
        imgLeft={imageRect.left}
        imgTop={imageRect.top}
        imgWidth={imageRect.width}
        imgHeight={imageRect.height}
      />

      <EllipseOverlay
        ellipses={ellipses}
        draft={null}
        selectedId={null}
        onEllipseMouseDown={() => {}}
        onHandleMouseDown={() => {}}
        imgLeft={imageRect.left}
        imgTop={imageRect.top}
        imgWidth={imageRect.width}
        imgHeight={imageRect.height}
      />

      <PencilOverlay
        strokes={strokes}
        draft={[]}
        selectedId={null}
        imgLeft={imageRect.left}
        imgTop={imageRect.top}
        imgWidth={imageRect.width}
        imgHeight={imageRect.height}
        onStrokeMouseDown={() => {}}
      />

      <MagicWandOverlay
        regions={regions}
        selectedId={null}
        onVertexMouseDown={() => {}}
        onRegionMouseDown={() => {}}
        onSelect={() => {}}
        imgLeft={imageRect.left}
        imgTop={imageRect.top}
        imgWidth={imageRect.width}
        imgHeight={imageRect.height}
      />
    </div>
  );
}


/** ---------------------------
 *  Component
 *  -------------------------- */
export default function Feedback() {
  const { currentUser, authType, loading } = useContext(AuthContext);

  const isAllowed = !loading && authType === "user" && !!currentUser;

  /** ---------------------------
   *  UI state
   *  -------------------------- */
  const [toast, setToast] = useState(null);
  function showToast(message, type = "success") {
    setToast(null);
    requestAnimationFrame(() => setToast({ message, type }));
  }

  const [openRow, setOpenRow] = useState(null); // datasetId
  const [openReceivedRow, setOpenReceivedRow] = useState(null); // datasetId
  const [requestIndex, setRequestIndex] = useState(0);

  const [popupUsers, setPopupUsers] = useState(null);
  function openUsersPopup(list) {
    setPopupUsers(list);
  }
  function closeUsersPopup() {
    setPopupUsers(null);
  }

  /** Image modal */
  const [imageModal, setImageModal] = useState(
    {
      open: false,
      images: [],
      index: 0,
    }
  ); // { images:[{src, filename, datasetId, imageId}], index }
  const ignoreCloseUntilRef = useRef(0);
  function openImageModal(images, index) {
    ignoreCloseUntilRef.current = Date.now() + 250;
    setImageModal({open:true,  images, index });
    
  }
  function closeImageModal() {
    setImageModal( {open: false, images: [], index: 0});
  }
  function guardedCloseImageModal() {
    if (Date.now() < ignoreCloseUntilRef.current) return;
    closeImageModal();
  }
  function prevModal() {
    setImageModal((m) => {
      if (!m) return m;
      const max = m.images.length;
      const nextIdx = m.index === 0 ? max - 1 : m.index - 1;
      return { ...m, index: nextIdx };
    });
  }
  function nextModal() {
    setImageModal((m) => {
      if (!m) return m;
      const max = m.images.length;
      const nextIdx = m.index === max - 1 ? 0 : m.index + 1;
      return { ...m, index: nextIdx };
    });
  }

  


  /** ---------------------------
   *  Data state
   *  -------------------------- */
  // openRequests: [{ id:datasetId, dataset, name, owner, assigned:[...], reviewer:[...], requests:[{remarkId,imageId,image,filename,question,createdAt}] }]
  const [openRequests, setOpenRequests] = useState([]);

  // feedbackStore: [{ datasetId, dataset, name, entries:[{remarkId,imageId,image,filename,question,feedback,reviewer,annotator,createdAt}] }]
  const [feedbackStore, setFeedbackStore] = useState([]);

  const [pageLoading, setPageLoading] = useState(false);

  // refs for quick lookup
  const dsMetaRef = useRef(new Map()); // datasetId -> { ds, assignedNames, reviewerNames, ownerName, roleMap }
  const userMapRef = useRef(new Map()); // userId -> username
  const fileNameMapRef = useRef(new Map()); // key datasetId:imageId -> filename
  const urlCacheRef = useRef(new Map()); // key datasetId:imageId -> signedUrl

  const hasReviewerDatasets = useMemo(() => {
    if (!currentUser?.id) return false;
    const uid = String(currentUser.id);
    for (const meta of dsMetaRef.current.values()) {
      const role = meta?.roleMap?.[uid];
      if (role === "reviewer") return true;
    }
    return false;
  }, [currentUser?.id, openRequests.length, feedbackStore.length]); // triggers after load

  const hasAnnotatorDatasets = useMemo(() => {
    if (!currentUser?.id) return false;
    const uid = String(currentUser.id);
    for (const meta of dsMetaRef.current.values()) {
      const role = meta?.roleMap?.[uid];
      if (role === "annotator") return true;
    }
    return false;
  }, [currentUser?.id, openRequests.length, feedbackStore.length]);

  function roleInDataset(datasetId) {
    const meta = dsMetaRef.current.get(String(datasetId));
    if (!meta || !currentUser?.id) return null;
    return meta.roleMap?.[String(currentUser.id)] || null;
  }

  function canSeeDatasetId(datasetId) {
    const meta = dsMetaRef.current.get(String(datasetId));
    if (!meta) return false;

    // allow admins to see everything
    if (currentUser?.role === "admin") return true;

    const uid = String(currentUser?.id || "");
    if (!uid) return false;

    if (String(meta.ds?.createdBy || "") === uid) return true;

    const role = meta.roleMap?.[uid];
    return role === "annotator" || role === "reviewer";
  }

  /** ---------------------------
   *  Load data (real integration)
   *  -------------------------- */
  useEffect(() => {
    if (!isAllowed) return;

    let cancelled = false;

    async function load() {
      setPageLoading(true);
      try {
        const [datasetsRes, usersRes] = await Promise.all([
          getAllDatasets(),
          getAllUsers(),
        ]);

        const datasets = Array.isArray(datasetsRes)
          ? datasetsRes
          : datasetsRes?.data || datasetsRes?.items || [];

        const users = Array.isArray(usersRes)
          ? usersRes
          : usersRes?.data || usersRes?.items || [];

        const userMap = new Map();
        for (const u of users || []) {
          const id = toId(u?.id);
          if (!id) continue;
          userMap.set(id, safeStr(u?.username || u?.email || id));
        }
        userMapRef.current = userMap;

        const dsMeta = new Map();
        for (const ds of datasets || []) {
          const dsId = toId(ds?.id);
          if (!dsId) continue;

          const roleMap = parseAssignedTo(ds?.assignedTo || []); // { [userId]: "annotator"|"reviewer" }
          const assignedNames = [];
          const reviewerNames = [];

          Object.entries(roleMap || {}).forEach(([uid, role]) => {
            const name = userMap.get(String(uid)) || String(uid);
            if (role === "annotator") assignedNames.push(name);
            if (role === "reviewer") reviewerNames.push(name);
          });

          const ownerName = userMap.get(toId(ds?.createdBy)) || "Admin";

          dsMeta.set(dsId, {
            ds,
            assignedNames,
            reviewerNames,
            ownerName,
            roleMap: roleMap || {},
          });
        }

        dsMetaRef.current = dsMeta;

        // only fetch remarks for datasets the current user can see (or admin)
        const visibleDatasetIds = Array.from(dsMeta.keys()).filter((dsId) => {
          if (currentUser?.role === "admin") return true;
          const meta = dsMeta.get(dsId);
          const uid = String(currentUser?.id || "");
          if (!uid || !meta) return false;
          if (String(meta.ds?.createdBy || "") === uid) return true;
          const role = meta.roleMap?.[uid];
          return role === "annotator" || role === "reviewer";
        });

        // fetch remarks per dataset (pool to avoid spamming)
        const remarksByDataset = new Map();
        await runPool(visibleDatasetIds, 6, async (datasetId) => {
          const res = await getAllRemarks(datasetId);
          const list = Array.isArray(res) ? res : res?.data || res?.items || [];
          remarksByDataset.set(String(datasetId), list);
        });

        // build maps of open requests + answered feedback
        const openMap = new Map(); // datasetId -> request[]
        const answeredMap = new Map(); // datasetId -> entry[]
        const datasetsNeedingImageNames = new Set();

        for (const [datasetId, remarks] of remarksByDataset.entries()) {
          const meta = dsMeta.get(String(datasetId));
          if (!meta) continue;

          for (const r of remarks || []) {
            if (!isFeedbackRemark(r)) continue;

            const imageId = safeStr(r?.imageId).trim();
            const remarkId = toId(r?.id || r?._id);
            const createdAt = r?.createdAt || r?.updatedAt || null;

            if (isOpenRequestRemark(r)) {
              if (!imageId) continue;
              datasetsNeedingImageNames.add(String(datasetId));

              const req = {
                remarkId,
                datasetId: String(datasetId),
                imageId,
                image: null,
                filename: null,
                question: safeStr(r?.message),
                createdAt,
              };

              if (!openMap.has(String(datasetId))) openMap.set(String(datasetId), []);
              openMap.get(String(datasetId)).push(req);
            }

            if (isAnsweredFeedbackRemark(r)) {
              if (!imageId) continue;
              datasetsNeedingImageNames.add(String(datasetId));

              const entry = {
                remarkId,
                datasetId: String(datasetId),
                imageId,
                image: null,
                filename: null,
                question: safeStr(r?.message),
                feedback: safeStr(r?.reply),
                reviewer: (meta.reviewerNames?.[0] || "Reviewer"),
                annotator: (meta.assignedNames?.[0] || "Annotator"),
                createdAt,
              };

              if (!answeredMap.has(String(datasetId))) answeredMap.set(String(datasetId), []);
              answeredMap.get(String(datasetId)).push(entry);
            }
          }
        }

        // resolve filenames (listImages) only for datasets that actually have feedback remarks
        const fileNameMap = new Map(fileNameMapRef.current); // keep old
        await runPool(Array.from(datasetsNeedingImageNames), 4, async (datasetId) => {
          try {
            const res = await listImages(datasetId);
            const list = Array.isArray(res) ? res : res?.items || res?.images || res?.data || [];
            for (const img of list || []) {
              const imgId = toId(img?.id);
              if (!imgId) continue;
              const fn = safeStr(img?.fileName || img?.filename || img?.name || "");
              if (!fn) continue;
              fileNameMap.set(`${datasetId}:${imgId}`, fn);
            }
          } catch (e) {
            // optional
          }
        });
        fileNameMapRef.current = fileNameMap;

        // apply filenames into request/entry objects
        function applyFilenames(items) {
          return (items || []).map((it) => {
            const fn = fileNameMap.get(`${it.datasetId}:${it.imageId}`) || it.filename || `image_${it.imageId}`;
            return { ...it, filename: fn };
          });
        }

        const openRows = [];
        for (const [datasetId, reqs] of openMap.entries()) {
          const meta = dsMeta.get(String(datasetId));
          if (!meta) continue;
          openRows.push({
            id: String(datasetId),
            datasetId: String(datasetId),
            dataset: safeStr(meta.ds?.name || `Dataset ${datasetId}`),
            name: safeStr(meta.ds?.fileName || meta.ds?.zipName || meta.ds?.name || ""),
            owner: meta.ownerName || "Admin",
            assigned: meta.assignedNames || [],
            reviewer: meta.reviewerNames || [],
            requests: applyFilenames(reqs).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || ""))),
          });
        }
        // stable ordering
        openRows.sort((a, b) => a.dataset.localeCompare(b.dataset));

        const feedbackGroups = [];
        for (const [datasetId, entries] of answeredMap.entries()) {
          const meta = dsMeta.get(String(datasetId));
          if (!meta) continue;

          feedbackGroups.push({
            datasetId: String(datasetId),
            dataset: safeStr(meta.ds?.name || `Dataset ${datasetId}`),
            name: safeStr(meta.ds?.fileName || meta.ds?.zipName || meta.ds?.name || ""),
            entries: applyFilenames(entries).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || ""))),
          });
        }
        feedbackGroups.sort((a, b) => a.dataset.localeCompare(b.dataset));

        if (cancelled) return;
        setOpenRequests(openRows);
        setFeedbackStore(feedbackGroups);

        // reset row opens if they no longer exist
        setOpenRow((prev) => (prev && openRows.some((x) => x.id === prev) ? prev : null));
        setOpenReceivedRow((prev) =>
          prev && feedbackGroups.some((x) => x.datasetId === prev) ? prev : null
        );
        setRequestIndex(0);
      } catch (e) {
        console.error("Failed to load feedback data:", e);
        if (!cancelled) showToast("Failed to load feedback.", "error");
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAllowed, currentUser?.id, currentUser?.role]);

  /** ---------------------------
   *  Lazy image signed URLs
   *  -------------------------- */
  async function ensureSignedUrl(datasetId, imageId) {
    const key = `${datasetId}:${imageId}`;
    if (urlCacheRef.current.has(key)) return urlCacheRef.current.get(key);

    try {
      const res = await getSignedUrl(imageId);
      const url = typeof res === "string" ? res: res?.url

      if (url) urlCacheRef.current.set(key, url);
      return url || null;
    } catch (e) {
      console.warn("getSignedUrl failed:", imageId, e);
      return null;
    }
  }

  function patchRequestImage(datasetId, imageId, url) {
    // open requests
    setOpenRequests((prev) =>
      prev.map((ds) => {
        if (String(ds.id) !== String(datasetId)) return ds;
        const nextReqs = (ds.requests || []).map((r) =>
          String(r.imageId) === String(imageId) ? { ...r, image: url } : r
        );
        return { ...ds, requests: nextReqs };
      })
    );

    // answered feedback entries
    setFeedbackStore((prev) =>
      prev.map((g) => {
        if (String(g.datasetId) !== String(datasetId)) return g;
        const nextEntries = (g.entries || []).map((e) =>
          String(e.imageId) === String(imageId) ? { ...e, image: url } : e
        );
        return { ...g, entries: nextEntries };
      })
    );

    // modal
    setImageModal((m) => {
      if (!m) return m;
      const nextImages = (m.images || []).map((it) => {
        if (String(it.datasetId) === String(datasetId) && String(it.imageId) === String(imageId)) {
          return { ...it, src: url };
        }
        return it;
      });
      return { ...m, images: nextImages };
    });
  }

  // when openRow/requestIndex changes -> ensure current image url
  useEffect(() => {
    if (!openRow) return;
    const ds = openRequests.find((x) => String(x.id) === String(openRow));
    if (!ds) return;

    const idx = clamp(requestIndex, 0, Math.max(0, (ds.requests?.length || 1) - 1));
    const req = ds.requests?.[idx];
    if (!req || req.image) return;

    let cancelled = false;
    ensureSignedUrl(ds.datasetId, req.imageId).then((url) => {
      if (cancelled) return;
      if (url) patchRequestImage(ds.datasetId, req.imageId, url);
    });
    return () => {
      cancelled = true;
    };
  }, [openRow, requestIndex, openRequests]);

  // when openReceivedRow/requestIndex changes -> ensure current image url
  useEffect(() => {
    if (!openReceivedRow) return;
    const g = feedbackStore.find((x) => String(x.datasetId) === String(openReceivedRow));
    if (!g) return;

    const idx = clamp(requestIndex, 0, Math.max(0, (g.entries?.length || 1) - 1));
    const entry = g.entries?.[idx];
    if (!entry || entry.image) return;

    let cancelled = false;
    ensureSignedUrl(g.datasetId, entry.imageId).then((url) => {
      if (cancelled) return;
      if (url) patchRequestImage(g.datasetId, entry.imageId, url);
    });
    return () => {
      cancelled = true;
    };
  }, [openReceivedRow, requestIndex, feedbackStore]);

  // when modal open/changes -> ensure modal current src
  useEffect(() => {
    if (!imageModal) return;
    const cur = imageModal.images?.[imageModal.index];
    if (!cur || cur.src) return;
    if (!cur.datasetId || !cur.imageId) return;

    let cancelled = false;
    ensureSignedUrl(cur.datasetId, cur.imageId).then((url) => {
      if (cancelled) return;
      if (url) patchRequestImage(cur.datasetId, cur.imageId, url);
    });
    return () => {
      cancelled = true;
    };
  }, [imageModal]);

  /** ---------------------------
   *  Keyboard shortcuts
   *  -------------------------- */
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") {
        if (imageModal) {
          closeImageModal();
          return;
        }
        if (popupUsers) {
          closeUsersPopup();
          return;
        }
        return;
      }

      if (imageModal) {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") e.preventDefault();
        if (e.key === "ArrowRight") nextModal();
        if (e.key === "ArrowLeft") prevModal();
        return;
      }

      // open row navigation
      const anyOpen = openRow || openReceivedRow;
      if (!anyOpen) return;

      let max = 0;
      if (openRow) {
        const ds = openRequests.find((x) => String(x.id) === String(openRow));
        max = ds?.requests?.length || 0;
      }
      if (openReceivedRow) {
        const g = feedbackStore.find((x) => String(x.datasetId) === String(openReceivedRow));
        max = g?.entries?.length || 0;
      }
      if (!max) return;

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") e.preventDefault();
      if (e.key === "ArrowRight") setRequestIndex((i) => (i + 1) % max);
      if (e.key === "ArrowLeft") setRequestIndex((i) => (i - 1 + max) % max);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [openRow, openReceivedRow, imageModal, popupUsers, openRequests, feedbackStore]);

  /** ---------------------------
   *  Send / Edit feedback (backend)
   *  -------------------------- */
  const [editTarget, setEditTarget] = useState(null); // { datasetId, index }
  const [editValue, setEditValue] = useState("");
  const editTextareaRef = useRef(null);

  function autoSizeEditTextarea() {
    const el = editTextareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    if (!editTarget) return;
    requestAnimationFrame(autoSizeEditTextarea);
  }, [editTarget]);

  function startEdit(datasetId, index, currentText) {
    setEditTarget({ datasetId: String(datasetId), index });
    setEditValue(currentText || "");
  }
  function cancelEdit() {
    setEditTarget(null);
    setEditValue("");
  }

  async function sendFeedbackForDataset(datasetId) {
    const ds = openRequests.find((x) => String(x.id) === String(datasetId));
    if (!ds) {
      showToast("Error: dataset not found.", "error");
      return;
    }

    const role = roleInDataset(datasetId);
    if (role !== "reviewer" && currentUser?.role !== "admin") {
      showToast("Only reviewers can send feedback.", "error");
      return;
    }

    const safeIdx = clamp(requestIndex, 0, Math.max(0, (ds.requests?.length || 1) - 1));
    const req = ds.requests?.[safeIdx];
    if (!req) {
      showToast("Error: request not found.", "error");
      return;
    }

    const box = document.getElementById(`fb-${datasetId}`);
    const text = safeStr(box?.value).trim();

    if (!text) {
      showToast("Please enter feedback first.", "error");
      return;
    }

    try {
      await updateRemark(req.remarkId, { status: true, reply: text });

      // move request -> feedbackStore locally (keep UI snappy)
      const meta = dsMetaRef.current.get(String(datasetId));
      const reviewerLabel = safeStr(currentUser?.username || meta?.reviewerNames?.[0] || "Reviewer");
      const annotatorLabel = safeStr(meta?.assignedNames?.[0] || "Annotator");

      const newEntry = {
        remarkId: req.remarkId,
        datasetId: String(datasetId),
        imageId: req.imageId,
        image: req.image,
        filename: req.filename || getFileNameFromSrc(req.image),
        question: req.question,
        feedback: text,
        reviewer: reviewerLabel,
        annotator: annotatorLabel,
        createdAt: req.createdAt,
      };

      setFeedbackStore((prev) => {
        const found = prev.find((g) => String(g.datasetId) === String(datasetId));
        if (found) {
          return prev.map((g) =>
            String(g.datasetId) === String(datasetId)
              ? { ...g, entries: [...(g.entries || []), newEntry] }
              : g
          );
        }
        return [...prev, { datasetId: String(datasetId), dataset: ds.dataset, name: ds.name, entries: [newEntry] }];
      });

      setOpenRequests((prev) => {
        const next = prev
          .map((d) => {
            if (String(d.id) !== String(datasetId)) return d;
            const nextReqs = (d.requests || []).filter((_, i) => i !== safeIdx);
            return { ...d, requests: nextReqs };
          })
          .filter((d) => (d.requests || []).length > 0);

        const stillExists = next.some((x) => String(x.id) === String(datasetId));
        if (!stillExists) setOpenRow(null);
        setRequestIndex(0);

        return next;
      });

      if (box) box.value = "";
      showToast("Feedback sent.", "success");
    } catch (e) {
      console.error("Failed to send feedback:", e);
      showToast("Failed to send feedback.", "error");
    }
  }

  async function saveEdit(datasetId, index, remarkId) {
    const nextText = safeStr(editValue).trim();
    if (!nextText) {
      showToast("Feedback cannot be empty.", "error");
      return;
    }

    const role = roleInDataset(datasetId);
    if (role !== "reviewer" && currentUser?.role !== "admin") {
      showToast("Only reviewers can edit feedback.", "error");
      return;
    }

    try {
      await updateRemark(remarkId, { status: true, reply: nextText });

      setFeedbackStore((prev) =>
        prev.map((g) => {
          if (String(g.datasetId) !== String(datasetId)) return g;
          const nextEntries = (g.entries || []).map((e, i) =>
            i === index ? { ...e, feedback: nextText } : e
          );
          return { ...g, entries: nextEntries };
        })
      );

      cancelEdit();
      showToast("Feedback updated.", "success");
    } catch (e) {
      console.error("Failed to update feedback:", e);
      showToast("Failed to update feedback.", "error");
    }
  }

  /** ---------------------------
   *  Derived visible lists
   *  -------------------------- */
  const visibleOpenRequests = useMemo(() => {
    return (openRequests || []).filter((r) => canSeeDatasetId(r.datasetId));
  }, [openRequests, currentUser?.id, currentUser?.role]);

  const visibleFeedbackGroups = useMemo(() => {
    return (feedbackStore || []).filter((g) => canSeeDatasetId(g.datasetId));
  }, [feedbackStore, currentUser?.id, currentUser?.role]);

  function toggleOpen(datasetId) {
    setOpenReceivedRow(null);
    setRequestIndex(0);
    setOpenRow((prev) => (prev === datasetId ? null : datasetId));
  }
  function toggleReceived(datasetId) {
    setOpenRow(null);
    setRequestIndex(0);
    setOpenReceivedRow((prev) => (prev === datasetId ? null : datasetId));
  }

  function prevImage(max) {
    setRequestIndex((idx) => (max <= 0 ? 0 : idx === 0 ? max - 1 : idx - 1));
  }
  function nextImage(max) {
    setRequestIndex((idx) => (max <= 0 ? 0 : idx === max - 1 ? 0 : idx + 1));
  }

  function toModalImagesFromRequests(reqs) {
    return (reqs || []).map((q) => ({
      src: q.image,
      filename: q.filename || getFileNameFromSrc(q.image),
      datasetId: q.datasetId,
      imageId: q.imageId,
    }));
  }
  function toModalImagesFromEntries(entries) {
    return (entries || []).map((e) => ({
      src: e.image,
      filename: e.filename || getFileNameFromSrc(e.image),
      datasetId: e.datasetId,
      imageId: e.imageId,
    }));
  }

  function ImageViewer({ image, total, filename, modalImages, imageId }) {
    const shownName = filename || getFileNameFromSrc(image) || "Image";
    const [hover, setHover] = useState(false);

    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const [imageRect, setImageRect] = useState(null);

    useEffect(() => {
      if (!imageId) return;
      // achtergrond prefetch (zelfde idee als AnnotationPage)
      prefetchAnnotations([imageId]).catch(() => {});
    }, [imageId]);

    const recalcRect = () => {
      if (!imgRef.current || !containerRef.current) return;
      const rect = getImageDrawRect(imgRef.current, containerRef.current);
      if (rect) setImageRect(rect);
    };

    useEffect(() => {
      recalcRect();
      window.addEventListener("resize", recalcRect);
      return () => window.removeEventListener("resize", recalcRect);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [image]); // rect herberekenen als image wisselt


    return (
      <div style={{ width: "460px", textAlign: "center" }}>
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            width: "100%",
            height: "300px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            position: "relative",
            backgroundColor: "#FFFFFF",
            borderRadius: "10px",
            border: "1px solid rgba(0,0,0,0.12)",
          }}
        >
          <div
            ref={containerRef}
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {image ? (
              <img
                ref={imgRef}
                src={image ?? null}     // <- geen ""
                onLoad={recalcRect}
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "0px",
                }}
                alt=""
                draggable={false}
              />
            ) : null}

            <ReadOnlyOverlays imageId={imageId} imageRect={imageRect} />
          </div>


          {hover && (
            <button
              onClick={() => {
                if (!modalImages?.length) return;
                openImageModal(modalImages, requestIndex);
              }}
              style={{
                position: "absolute",
                right: "10px",
                bottom: "10px",
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: modalImages?.length ? "pointer" : "default",
                userSelect: "none",
                zIndex: 9999,
                backgroundColor: "rgba(255,255,255,0.35)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.22)",
                backdropFilter: "blur(2px)",
                border: "none",
                padding: 0,
              }}
            >
              <img
                src={maximizeIcon}
                style={{
                  width: "18px",
                  height: "18px",
                  opacity: 0.9,
                  pointerEvents: "none",
                  filter: "drop-shadow(0 1px 5px rgba(0,0,0,0.35))",
                }}
                alt="maximizeIcon"
              />
            </button>
          )}
        </div>

        <div
          style={{
            marginTop: "8px",
            fontSize: "14px",
            fontWeight: 700,
            color: "#000",
            opacity: 0.75,
            userSelect: "none",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {shownName}
        </div>

        <div className="flex justify-center items-center gap-[18px]" style={{ marginTop: "12px" }}>
          <img
            src={prevIcon}
            onClick={(e) => {
              e.stopPropagation();
              prevImage(total);
            }}
            style={{ width: "34px", cursor: "pointer", userSelect: "none" }}
            alt="prevIcon"
          />

          <span style={{ fontSize: "18px", fontWeight: 700 }}>
            {clamp(requestIndex, 0, Math.max(0, total - 1)) + 1}/{total}
          </span>

          <img
            src={nextIcon}
            onClick={(e) => {
              e.stopPropagation();
              nextImage(total);
            }}
            style={{ width: "34px", cursor: "pointer", userSelect: "none" }}
            alt=""
          />
        </div>
      </div>
    );
  }

   // modal derived + refs/state for read-only overlays
  const modalItem = imageModal.images?.[imageModal.index] ?? null;
  const modalSrc = modalItem?.src ?? null;
  const modalImageId = modalItem?.imageId ?? null;

  const modalWrapRef = useRef(null);
  const modalImgRef = useRef(null);
  const [modalRect, setModalRect] = useState(null);

  useEffect(() => {
    if (!imageModal.open || !modalImageId) return;
    prefetchAnnotations([modalImageId]).catch(() => {});
  }, [imageModal.open, modalImageId]);

  const recalcModalRect = () => {
    if (!modalImgRef.current || !modalWrapRef.current) return;
    const rect = getImageDrawRect(modalImgRef.current, modalWrapRef.current);
    if (rect) setModalRect(rect);
  };

  /** ---------------------------
   *  Render guards
   *  -------------------------- */
  if (loading || pageLoading) {
    return (
      <div className="datasets-scroll w-full" style={{ paddingBottom: "40px" }}>
        <h2 className="italic" style={{ fontWeight: 700, fontSize: "28px", marginBottom: "16px" }}>
          Open Requests
        </h2>
        <div
          style={{
            backgroundColor: "#FFF",
            width: "100%",
            maxWidth: "900px",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
            padding: "20px",
            fontSize: "17px",
            fontWeight: 700,
            color: "#444",
          }}
        >
          Loading.
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="datasets-scroll w-full" style={{ paddingBottom: "40px" }}>
        <h2 className="italic" style={{ fontWeight: 700, fontSize: "28px", marginBottom: "16px" }}>
          Open Requests
        </h2>
        <div
          style={{
            backgroundColor: "#FFF",
            width: "100%",
            maxWidth: "900px",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
            padding: "20px",
            fontSize: "17px",
            fontWeight: 700,
            color: "#444",
          }}
        >
          Not authorized.
        </div>
      </div>
    );
  }

  // second header text, minimal UI change:
  const historyTitle =
    hasReviewerDatasets && !hasAnnotatorDatasets
      ? "Given"
      : hasAnnotatorDatasets && !hasReviewerDatasets
        ? "Received"
        : "Feedback";

  
 

  /** ---------------------------
   *  Main render
   *  -------------------------- */
  return (
    <div className="datasets-scroll w-full" style={{ paddingBottom: "40px" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ---------------------------
          Open Requests
         -------------------------- */}
      <h2 className="italic" style={{ fontWeight: 700, fontSize: "28px", marginBottom: "16px" }}>
        Open Requests
      </h2>

      <div
        style={{
          backgroundColor: "#FFF",
          width: "100%",
          maxWidth: "900px",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
        }}
      >
        <div
          className="flex"
          style={{
            backgroundColor: "#44F3C9",
            padding: "10px 18px",
            fontWeight: 600,
            fontSize: "16px",
          }}
        >
          <div className="w-[130px]">Dataset</div>
          <div className="w-[200px]">Reviewer</div>

          <div className="w-[110px]" style={{ textAlign: "center", position: "relative", left: "-70px" }}>
            #
          </div>

          <div className="w-[160px]">Owner</div>
          <div className="w-[180px]">Assigned</div>

          <div className="flex-1"></div>
        </div>

        {visibleOpenRequests.length === 0 && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              fontSize: "17px",
              fontWeight: 700,
              color: "#444",
            }}
          >
            No open requests for your datasets.
          </div>
        )}

        {visibleOpenRequests.map((r) => {
          const isOpen = openRow === r.id;
          const safeIdx = clamp(requestIndex, 0, Math.max(0, (r.requests?.length || 1) - 1));
          const shown = r.requests?.[safeIdx];

          const canReply = roleInDataset(r.datasetId) === "reviewer" || currentUser?.role === "admin";

          return (
            <div key={r.id}>
              <div
                className="flex border-b border-[#D6D6D6] select-none"
                style={{
                  backgroundColor: "#F2F2F2",
                  height: "40px",
                  alignItems: "center",
                  paddingLeft: "18px",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
                onClick={() => toggleOpen(r.id)}
              >
                <div className="w-[130px] truncate">{r.dataset}</div>

                <div
                  className="w-[200px] truncate"
                  onClick={(e) => {
                    if (!r.reviewer?.length) return;
                    e.stopPropagation();
                    if (r.reviewer.length > 1) openUsersPopup(r.reviewer);
                  }}
                  style={{ cursor: r.reviewer?.length > 1 ? "pointer" : "default" }}
                  title={(r.reviewer || []).join(", ")}
                >
                  {r.reviewer?.[0] || ""}
                  {r.reviewer?.length > 1 && (
                    <span style={{ opacity: 0.8, fontWeight: 700 }}>
                      {" "}
                      (+{r.reviewer.length - 1})
                    </span>
                  )}
                </div>

                <div className="w-[110px]" style={{ textAlign: "center", position: "relative", left: "-70px" }}>
                  {r.requests?.length || 0}
                </div>

                <div className="w-[160px] truncate">{r.owner}</div>

                <div
                  className="w-[180px] truncate"
                  onClick={(e) => {
                    if (!r.assigned?.length) return;
                    e.stopPropagation();
                    if (r.assigned.length > 1) openUsersPopup(r.assigned);
                  }}
                  style={{ cursor: r.assigned?.length > 1 ? "pointer" : "default" }}
                  title={(r.assigned || []).join(", ")}
                >
                  {r.assigned?.[0] || ""}
                  {r.assigned?.length > 1 && (
                    <span style={{ opacity: 0.8, fontWeight: 700 }}>
                      {" "}
                      (+{r.assigned.length - 1})
                    </span>
                  )}
                </div>

                <div className="flex-1 flex justify-end pr-[18px]">
                  <img
                    src={isOpen ? minimizeIcon : expandIcon}
                    style={{
                      width: "20px",
                      transition: "transform 0.2s",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                    alt="expand"
                  />
                </div>
              </div>

              {isOpen && shown && (
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    padding: "14px 18px 18px 18px",
                    borderBottom: "1px solid #D6D6D6",
                  }}
                >
                  <div className="flex" style={{ gap: "18px", alignItems: "flex-start" }}>
                    <ImageViewer
                      image={shown.image}
                      total={r.requests.length}
                      filename={shown.filename}
                      modalImages={toModalImagesFromRequests(r.requests)}
                      imageId={shown.imageId}
                    />

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          borderRadius: "12px",
                          backgroundColor: "#F3F4F6",
                          border: "1px solid rgba(0,0,0,0.10)",
                          padding: "12px",
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#111",
                          marginBottom: "12px",
                          userSelect: "text",
                        }}
                      >
                        <div style={{ opacity: 0.8, fontWeight: 800, marginBottom: "6px" }}>Request:</div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{shown.question}</div>
                      </div>

                      <div
                        style={{
                          borderRadius: "12px",
                          backgroundColor: "#FFFFFF",
                          border: "1px solid rgba(0,0,0,0.12)",
                          padding: "12px",
                        }}
                      >
                        <div style={{ fontSize: "14px", fontWeight: 800, marginBottom: "8px" }}>
                          {canReply ? "Reply (Reviewer)" : "Reply (Reviewer only)"}
                        </div>

                        <textarea
                          id={`fb-${r.id}`}
                          placeholder={canReply ? "Write feedback..." : "Only reviewers can reply."}
                          disabled={!canReply}
                          className="datasets-scroll"
                          style={{
                            width: "100%",
                            minHeight: "100px",
                            maxHeight: "160px",
                            borderRadius: "10px",
                            border: "1px solid rgba(0,0,0,0.18)",
                            padding: "10px 12px",
                            fontSize: "14px",
                            outline: "none",
                            resize: "none",
                            opacity: canReply ? 1 : 0.65,
                            backgroundColor: canReply ? "#FFFFFF" : "#F3F4F6",
                          }}
                        />

                        <button
                          onClick={() => sendFeedbackForDataset(r.id)}
                          disabled={!canReply}
                          style={{
                            padding: "10px 18px",
                            borderRadius: "10px",
                            backgroundColor: "#B3DCD7",
                            border: "1px solid #91D0C9",
                            cursor: canReply ? "pointer" : "not-allowed",
                            fontWeight: 700,
                            fontSize: "17px",
                            marginTop: "10px",
                            opacity: canReply ? 1 : 0.7,
                          }}
                          onMouseEnter={(e) => {
                            if (!canReply) return;
                            e.currentTarget.style.backgroundColor = "#9BCFC7";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#B3DCD7";
                          }}
                        >
                          Send Feedback
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ height: "40px" }} />

      {/* ---------------------------
          History: Given / Received
         -------------------------- */}
      <h2 className="italic" style={{ fontWeight: 700, fontSize: "28px", marginBottom: "16px" }}>
        {historyTitle}
      </h2>

      <div
        style={{
          backgroundColor: "#FFF",
          width: "100%",
          maxWidth: "900px",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
        }}
      >
        <div
          className="flex"
          style={{
            backgroundColor: "#44F3C9",
            padding: "10px 18px",
            fontWeight: 600,
            fontSize: "16px",
          }}
        >
          <div className="w-[130px]">Dataset</div>

          <div className="w-[200px]">Counterpart</div>

          <div className="w-[110px]" style={{ textAlign: "center", position: "relative", left: "-70px" }}>
            #
          </div>

          <div className="w-[360px]">Feedback</div>

          <div className="flex-1"></div>
        </div>

        {visibleFeedbackGroups.length === 0 && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              fontSize: "17px",
              fontWeight: 700,
              color: "#444",
            }}
          >
            No feedback yet.
          </div>
        )}

        {visibleFeedbackGroups.map((g) => {
          const isOpen = openReceivedRow === g.datasetId;
          const safeIdx = clamp(requestIndex, 0, Math.max(0, (g.entries?.length || 1) - 1));
          const first = g.entries?.[0];
          const shown = g.entries?.[safeIdx];

          const canEdit = (roleInDataset(g.datasetId) === "reviewer" || currentUser?.role === "admin");

          const counterpart =
            roleInDataset(g.datasetId) === "reviewer"
              ? first?.annotator
              : first?.reviewer;

          const isEditingThis =
            canEdit && editTarget && String(editTarget.datasetId) === String(g.datasetId) && editTarget.index === safeIdx;

          return (
            <div key={g.datasetId}>
              <div
                className="flex border-b border-[#D6D6D6] select-none"
                style={{
                  backgroundColor: "#F2F2F2",
                  height: "40px",
                  alignItems: "center",
                  paddingLeft: "18px",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
                onClick={() => toggleReceived(g.datasetId)}
              >
                <div className="w-[130px] truncate">{g.dataset}</div>

                <div className="w-[200px] truncate">{counterpart || ""}</div>

                <div className="w-[110px]" style={{ textAlign: "center", position: "relative", left: "-70px" }}>
                  {g.entries?.length || 0}
                </div>

                <div className="w-[360px] truncate" style={{ color: "#555" }}>
                  {first?.feedback || ""}
                </div>

                <div className="flex-1 flex justify-end pr-[18px]">
                  <img
                    src={isOpen ? minimizeIcon : expandIcon}
                    style={{
                      width: "20px",
                      transition: "transform 0.2s",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                    alt="expand"
                  />
                </div>
              </div>

              {isOpen && shown && (
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    padding: "14px 18px 18px 18px",
                    borderBottom: "1px solid #D6D6D6",
                  }}
                >
                  <div className="flex" style={{ gap: "18px", alignItems: "flex-start" }}>
                    <ImageViewer
                      image={shown.image}
                      total={g.entries.length}
                      filename={shown.filename}
                      modalImages={toModalImagesFromEntries(g.entries)}
                      imageId={shown.imageId}
                    />

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          borderRadius: "12px",
                          backgroundColor: "#F3F4F6",
                          border: "1px solid rgba(0,0,0,0.10)",
                          padding: "12px",
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#111",
                          marginBottom: "12px",
                          userSelect: "text",
                        }}
                      >
                        <div style={{ opacity: 0.8, fontWeight: 800, marginBottom: "6px" }}>Request:</div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{shown.question}</div>
                      </div>

                      <div
                        style={{
                          borderRadius: "12px",
                          backgroundColor: "#FFFFFF",
                          border: "1px solid rgba(0,0,0,0.12)",
                          padding: "12px",
                          position: "relative",
                        }}
                      >
                        <div style={{ fontSize: "14px", fontWeight: 800, marginBottom: "8px" }}>
                          Feedback:
                        </div>

                        {!isEditingThis && (
                          <>
                            {canEdit && (
                              <button
                                onClick={() => startEdit(g.datasetId, safeIdx, shown.feedback)}
                                style={{
                                  position: "absolute",
                                  right: "10px",
                                  top: "10px",
                                  width: "34px",
                                  height: "34px",
                                  borderRadius: "10px",
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  cursor: "pointer",
                                  userSelect: "none",
                                  backgroundColor: "rgba(255,255,255,0.65)",
                                  border: "1px solid rgba(0,0,0,0.12)",
                                  padding: 0,
                                }}
                                title="Edit feedback"
                              >
                                <img
                                  src={editIcon}
                                  style={{
                                    width: "18px",
                                    height: "18px",
                                    pointerEvents: "none",
                                    opacity: 0.85,
                                  }}
                                  alt="edit"
                                />
                              </button>
                            )}

                            <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", color: "#111" }}>
                              {shown.feedback}
                            </div>
                          </>
                        )}

                        {isEditingThis && (
                          <>
                            <textarea
                              ref={editTextareaRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="datasets-scroll"
                              style={{
                                width: "100%",
                                minHeight: "90px",
                                borderRadius: "10px",
                                border: "1px solid rgba(0,0,0,0.18)",
                                padding: "10px 12px",
                                fontSize: "14px",
                                outline: "none",
                                resize: "none",
                              }}
                              onInput={autoSizeEditTextarea}
                            />

                            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                              <button
                                onClick={() => saveEdit(g.datasetId, safeIdx, shown.remarkId)}
                                style={{
                                  padding: "10px 18px",
                                  borderRadius: "10px",
                                  backgroundColor: "#B3DCD7",
                                  border: "1px solid #91D0C9",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  fontSize: "15px",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#9BCFC7")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#B3DCD7")}
                              >
                                Save
                              </button>

                              <button
                                onClick={cancelEdit}
                                style={{
                                  padding: "10px 18px",
                                  borderRadius: "10px",
                                  backgroundColor: "#F3F4F6",
                                  border: "1px solid rgba(0,0,0,0.18)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  fontSize: "15px",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Users popup */}
      {popupUsers &&
        createPortal(
          <div
            onMouseDown={(e) => {
              if (e.target !== e.currentTarget) return;
              closeUsersPopup();
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "12px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "420px",
                maxWidth: "96vw",
                borderRadius: "16px",
                backgroundColor: "#FFFFFF",
                boxShadow: "0 6px 20px rgba(0,0,0,0.30)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  backgroundColor: "#44F3C9",
                  fontWeight: 800,
                  fontSize: "16px",
                }}
              >
                Users
              </div>

              <div className="datasets-scroll" style={{ maxHeight: "320px", overflowY: "auto" }}>
                {(popupUsers || []).map((u, i) => (
                  <div
                    key={`${u}-${i}`}
                    style={{
                      padding: "12px 18px",
                      borderBottom: "1px solid rgba(0,0,0,0.08)",
                      fontWeight: 700,
                      fontSize: "15px",
                      color: "#222",
                    }}
                  >
                    {u}
                  </div>
                ))}
              </div>

              <div style={{ padding: "14px 18px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={closeUsersPopup}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    backgroundColor: "#B3DCD7",
                    border: "1px solid #91D0C9",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#9BCFC7")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#B3DCD7")}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Image modal */}
      {imageModal.open &&
        createPortal(
          <div
            onMouseDown={(e) => {
              if (e.target !== e.currentTarget) return;
              guardedCloseImageModal();
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0,0,0,0.78)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "12px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "min(1200px, 96vw)",
                height: "min(760px, 92vh)",
                backgroundColor: "#111",
                borderRadius: "18px",
                overflow: "hidden",
                boxShadow: "0 8px 30px rgba(0,0,0,0.40)",
                position: "relative",
              }}
            >
              {/* filename */}
              <div
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "12px",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "14px",
                  zIndex: 5,
                  maxWidth: "70%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {imageModal.images?.[imageModal.index]?.filename || ""}
              </div>

              {/* close */}
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeImageModal();
                }}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "12px",
                  width: "46px",
                  height: "46px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  backgroundColor: "rgba(0,0,0,0.25)",
                  color: "#fff",
                  fontSize: "22px",
                  fontWeight: 900,
                  cursor: "pointer",
                  zIndex: 5,
                }}
                aria-label="Close"
              >
                ✕
              </button>

              {/* prev */}
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  prevModal();
                }}
                style={{
                  position: "absolute",
                  left: "18px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "90px",
                  height: "90px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "22px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  backgroundColor: "rgba(0,0,0,0.25)",
                  cursor: "pointer",
                  zIndex: 5,
                }}
                aria-label="Previous"
              >
                <img src={prevIcon} alt="Previous" style={{ width: "44px", userSelect: "none", pointerEvents: "none" }} />
              </button>

              {/* next */}
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nextModal();
                }}
                style={{
                  position: "absolute",
                  right: "18px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "90px",
                  height: "90px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "22px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  backgroundColor: "rgba(0,0,0,0.25)",
                  cursor: "pointer",
                  zIndex: 5,
                }}
                aria-label="Next"
              >
                <img src={nextIcon} alt="Next" style={{ width: "44px", userSelect: "none", pointerEvents: "none" }} />
              </button>

              {/* image */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "60px 110px 40px 110px",
                  boxSizing: "border-box",
                }}
              >
                <div
                  ref={modalWrapRef}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "60px 110px 40px 110px",
                    boxSizing: "border-box",
                    position: "relative",
                  }}
                >
                  {modalSrc ? (
                    <img
                      ref={modalImgRef}
                      src={modalSrc ?? null}   // <- geen ""
                      onLoad={recalcModalRect}
                      draggable={false}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        userSelect: "none",
                      }}
                      alt=""
                    />
                  ) : null}

                  <ReadOnlyOverlays imageId={modalImageId} imageRect={modalRect} />
                </div>
              </div>

              {/* counter */}
              <div
                style={{
                  position: "absolute",
                  bottom: "12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: "14px",
                  zIndex: 5,
                  userSelect: "none",
                }}
              >
                {imageModal.index + 1}/{imageModal.images?.length || 0}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}