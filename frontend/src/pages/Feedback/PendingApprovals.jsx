import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import expandIcon from "../../assets/feedback/expand-details.png";
import minimizeIcon from "../../assets/feedback/minimize-details.png";
import maximizeIcon from "../../assets/feedback/maximize.png";

import approveIcon from "../../assets/feedback/approve-for-deletion.png";
import denyIcon from "../../assets/feedback/deny-deletion.png";

import prevIcon from "../../assets/feedback/previous_image.png";
import nextIcon from "../../assets/feedback/next_image.png";

import Toast from "../Annotation/components/Toast";

import { AuthContext } from "../../components/AuthContext";
import { getAllDatasets, restoreDataset} from "../../services/datasetService";
import { getAllUsers } from "../../services/authService";
import { parseAssignedTo } from "../../utils/utils";

import { getSignedUrl, hardDeleteImage, listImages, restoreImage } from "../../services/ImageService";
import { hard_Delete_Dataset } from "../../utils/deleteDataset";

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

async function fetchAllImages(datasetId) {
  // Used only to resolve filenames (optional).
  const limit = 200;
  let offset = 0;
  const all = [];

  while (true) {
    const res = await listImages(datasetId, { limit, offset });

    const page = Array.isArray(res)
      ? res
      : res?.items || res?.images || res?.data || [];

    if (!Array.isArray(page) || page.length === 0) break;

    all.push(...page);
    if (page.length < limit) break;

    offset += limit;
    if (offset > 5000) break; // safety
  }

  return all;
}

/** remark is "pending deletion request" when feedback === false AND status === false */
function isPendingDeletionRemark(r) {
  return r?.feedback === false && r?.status === false;
}

function hasImageId(r) {
  const id = safeStr(r?.imageId).trim();
  return id.length > 0;
}

/** ---------------------------
 *  Component
 *  -------------------------- */
export default function PendingApprovals() {
  const { currentUser, authType, loading } = useContext(AuthContext);

  const isAllowed =
    !loading &&
    authType === "user" &&
    (currentUser?.role === "admin" || currentUser?.role === "user");

  /** ---------------------------
   *  UI state
   *  -------------------------- */
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast(null);
    requestAnimationFrame(() => setToast({ message, type }));
  };

  const [openRow, setOpenRow] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);

  const [selected, setSelected] = useState(new Set());
  const [anchorIndex, setAnchorIndex] = useState(null);
  const thumbRefs = useRef([]);

  const [popupUsers, setPopupUsers] = useState(null);
  const openUsersPopup = (list) => setPopupUsers(list);
  const closeUsersPopup = () => setPopupUsers(null);

  const [confirmShown, setConfirmShown] = useState({ approve: false, deny: false });
  const [confirmModal, setConfirmModal] = useState(null); // { type, rowId }

  /** Image modal */
  const [imageModal, setImageModal] = useState(null); // { images, index }
  const ignoreCloseUntilRef = useRef(0);
  const openImageModal = (images, index) => {
    ignoreCloseUntilRef.current = Date.now() + 250;
    setImageModal({ images, index });
  };
  const closeImageModal = () => setImageModal(null);
  const guardedCloseImageModal = () => {
    if (Date.now() < ignoreCloseUntilRef.current) return;
    closeImageModal();
  };

  /** ---------------------------
   *  Data state
   *  -------------------------- */
  /**
   * Row model:
   * {
   *   id: rowId,
   *   kind: "dataset" | "images",
   *   datasetId,
   *   datasetName,
   *   owner,
   *   assigned: [username...],
   *   reviewer: [username...],
   *   // dataset-kind:
   *   datasetRemarks: [{ remarkId, message, createdAt, updatedAt }]
   *   // images-kind:
   *   images: [{ id:imageId, filename, src, remarkId, remarkMessage }]
   * }
   */
  const [approvals, setApprovals] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [allUsers, setAllUsers] = useState([]);

  // Cache for resolving filenames (datasetId -> Map(imageId -> filename))
  const imageNameCacheRef = useRef(new Map());

  /** ---------------------------
   *  Username helpers (same idea as DatasetManagement)
   *  -------------------------- */
  // const getUserById = (id) =>
  //   allUsers.find((u) => String(u.id) === String(id)) || null;

  // const getUserNameById = (id) => {
  //   if (!id) return "";
  //   const u = getUserById(id);
  //   console.log(u)
  //   return u ? u.username : String(id);
  // };

  // const getAssignedNames = (dataset) => {
  //   const map = parseAssignedTo(dataset.assignedTo || []);
  //   const names = [];
  //   Object.entries(map).forEach(([userId, role]) => {
  //     if (role === "annotator") {
  //       const u = getUserById(userId);
  //       names.push(u ? u.username : userId);
  //     }
  //   });
  //   return names;
  // };

  // const getReviewerNames = (dataset) => {
  //   const map = parseAssignedTo(dataset.assignedTo || []);
  //   const names = [];
  //   Object.entries(map).forEach(([userId, role]) => {
  //     if (role === "reviewer") {
  //       const u = getUserById(userId);
  //       names.push(u ? u.username : userId);
  //     }
  //   });
  //   return names;
  // };

  /** ---------------------------
   *  Load pending approvals (remarks-driven)
   *  -------------------------- */
  async function loadPendingApprovals() {
    if (!isAllowed) return;

    setPendingLoading(true);
    try {
      // Load datasets + users in parallel
      const [datasets, users] = await Promise.all([getAllDatasets(), getAllUsers()]);
      const dsList = Array.isArray(datasets) ? datasets : [];
      const userList = Array.isArray(users) ? users : [];

      setAllUsers(userList);

      // maak een lokale map die meteen beschikbaar is (geen state timing issues)
      const userMap = new Map(userList.map((u) => [String(u.id), u]));

      //  lokale helpers die NIET op state leunen
      const getUserByIdLocal = (id) => userMap.get(String(id)) || null;

      const getUserNameByIdLocal = (id) => {
        if (!id) return "";
        const u = getUserByIdLocal(id);
        return u ? u.username : String(id);
      };

      const getAssignedNamesLocal = (dataset) => {
        const map = parseAssignedTo(dataset.assignedTo || []);
        const names = [];
        Object.entries(map).forEach(([userId, role]) => {
          if (role === "annotator") names.push(getUserNameByIdLocal(userId));
        });
        return names;
      };

      const getReviewerNamesLocal = (dataset) => {
        const map = parseAssignedTo(dataset.assignedTo || []);
        const names = [];
        Object.entries(map).forEach(([userId, role]) => {
          if (role === "reviewer") names.push(getUserNameByIdLocal(userId));
        });
        return names;
      };

      // Build dataset map for quick lookup
      const dsById = new Map(dsList.map((ds) => [toId(ds?.id ?? ds?._id), ds]));

      // Fetch remarks PER dataset (backend endpoint expects dataset_id param)
      // Concurrency limit so admin page doesn't freeze if there are many datasets
      const concurrency = 6;
      let cursor = 0;
      const results = [];

      const workers = new Array(concurrency).fill(0).map(async () => {
        while (cursor < dsList.length) {
          const ds = dsList[cursor++];
          const datasetId = toId(ds?.id ?? ds?._id);
          if (!datasetId) continue;

          try {
            const remarks = await getAllRemarks(datasetId);
            console.log(remarks)
            const list = Array.isArray(remarks) ? remarks : [];

            const pending = list.filter(isPendingDeletionRemark);
            if (pending.length === 0) continue;

            // Split dataset deletion requests vs image deletion requests
            const datasetRequests = pending
              .filter((r) => !hasImageId(r))
              .map((r) => ({
                remarkId: toId(r?._id ?? r?.id),
                message: safeStr(r?.message),
                createdAt: r?.createdAt,
                updatedAt: r?.updatedAt,
              }));

            // Group image requests by imageId, keep latest updatedAt if duplicates
            const imageReqByImageId = new Map();
            pending
              .filter((r) => hasImageId(r))
              .forEach((r) => {
                const imageId = safeStr(r.imageId).trim();
                const next = {
                  imageId,
                  remarkId: toId(r?._id ?? r?.id),
                  remarkMessage: safeStr(r?.message),
                  createdAt: r?.createdAt,
                  updatedAt: r?.updatedAt,
                };

                const prev = imageReqByImageId.get(imageId);
                if (!prev) {
                  imageReqByImageId.set(imageId, next);
                  return;
                }

                // prefer most recent updatedAt (fallback: keep existing)
                const prevTime = prev?.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
                const nextTime = next?.updatedAt ? new Date(next.updatedAt).getTime() : 0;
                if (nextTime >= prevTime) imageReqByImageId.set(imageId, next);
              });

            const imageRequests = Array.from(imageReqByImageId.values()).map((x) => ({
              id: x.imageId,
              filename: `image_${x.imageId}`, // will try to resolve later when row opens
              src: null,
              remarkId: x.remarkId,
              remarkMessage: x.remarkMessage,
              createdAt: x.createdAt,
              updatedAt: x.updatedAt,
            }));

            // Build base info from dataset
            const dsObj = dsById.get(datasetId);
            console.log(dsObj?.createdBy)
            const datasetName = safeStr(dsObj?.name || `Dataset ${datasetId}`);
            const owner = getUserNameByIdLocal(dsObj?.createdBy) || "Admin";
            const assigned = getAssignedNamesLocal(dsObj || {});
            const reviewer = getReviewerNamesLocal(dsObj || {});

            // Row IDs must be unique: allow both "dataset" + "images" rows for same dataset
            if (datasetRequests.length) {
              results.push({
                id: `ds:${datasetId}`,
                kind: "dataset",
                datasetId,
                datasetName,
                owner,
                assigned,
                reviewer,
                datasetRemarks: datasetRequests,
                images: [],
              });
            }

            if (imageRequests.length) {
              results.push({
                id: `imgs:${datasetId}`,
                kind: "images",
                datasetId,
                datasetName,
                owner,
                assigned,
                reviewer,
                datasetRemarks: [],
                images: imageRequests,
              });
            }
          } catch (e) {
            // if remark endpoint fails for a dataset, just skip it
            console.error("Failed loading remarks for dataset:", ds?.id, e);
          }
        }
      });

      await Promise.all(workers);

      // Sort stable: datasetName
      results.sort((a, b) => a.datasetName.localeCompare(b.datasetName));

      setApprovals(results);

      // Keep openRow if still exists
      setOpenRow((prev) => (prev && results.some((r) => r.id === prev) ? prev : null));
      setSelected(new Set());
      setAnchorIndex(null);
      setImageIndex(0);
      setImageModal(null);
    } catch (err) {
      console.error("Failed loading pending approvals:", err);
      showToast("Failed to load pending approvals.", "error");
    } finally {
      setPendingLoading(false);
    }
  }

  useEffect(() => {
    if (loading) return;
    if (!isAllowed) return;
    loadPendingApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAllowed]);

  /** ---------------------------
   *  Row open / navigation
   *  -------------------------- */
  function toggleOpen(rowId) {
    if (openRow === rowId) {
      setOpenRow(null);
      setSelected(new Set());
      setAnchorIndex(null);
      return;
    }
    setOpenRow(rowId);
    setImageIndex(0);
    setSelected(new Set());
    setAnchorIndex(null);
  }

  function prevImage(max) {
    setImageIndex((i) => (i === 0 ? max - 1 : i - 1));
  }
  function nextImage(max) {
    setImageIndex((i) => (i === max - 1 ? 0 : i + 1));
  }

  function prevModal() {
    setImageModal((m) => {
      if (!m) return m;
      const max = m.images.length;
      const nextIdx = m.index === 0 ? max - 1 : m.index - 1;
      setImageIndex(nextIdx);
      return { ...m, index: nextIdx };
    });
  }
  function nextModal() {
    setImageModal((m) => {
      if (!m) return m;
      const max = m.images.length;
      const nextIdx = m.index === max - 1 ? 0 : m.index + 1;
      setImageIndex(nextIdx);
      return { ...m, index: nextIdx };
    });
  }

  function toggleSelect(idx) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function selectRange(a, b, { additive }) {
    const start = Math.min(a, b);
    const end = Math.max(a, b);

    setSelected((prev) => {
      const next = additive ? new Set(prev) : new Set();
      for (let i = start; i <= end; i++) next.add(i);
      return next;
    });
  }

  function selectAll(total) {
    const all = new Set();
    for (let i = 0; i < total; i++) all.add(i);
    setSelected(all);
    setAnchorIndex(0);
  }

  function clearSelection() {
    setSelected(new Set());
    setAnchorIndex(null);
  }

  function getTargets() {
    if (!selected || selected.size === 0) return [imageIndex];
    return Array.from(selected).sort((a, b) => a - b);
  }

  /** ---------------------------
   *  When open image-row:
   *   1) try resolve filenames once (optional)
   *   2) lazy load signed urls around current index + selected
   *  -------------------------- */
  useEffect(() => {
    if (!openRow) return;
    const row = approvals.find((r) => r.id === openRow);
    if (!row || row.kind !== "images") return;

    let cancelled = false;

    async function resolveFilenamesOnce() {
      const dsId = row.datasetId;
      if (!dsId) return;

      if (imageNameCacheRef.current.has(dsId)) return;

      try {
        const all = await fetchAllImages(dsId);
        const map = new Map();
        (all || []).forEach((img) => {
          const id = toId(img?.id ?? img?._id ?? img?.imageId);
          if (!id) return;
          const filename =
            img?.originalFilename ||
            img?.filename ||
            img?.name ||
            `image_${id}`;
          map.set(id, filename);
        });
        imageNameCacheRef.current.set(dsId, map);

        if (cancelled) return;

        setApprovals((prev) =>
          prev.map((r) => {
            if (r.id !== openRow) return r;
            const nextImages = (r.images || []).map((im) => {
              const fn = map.get(im.id);
              return fn ? { ...im, filename: fn } : im;
            });
            return { ...r, images: nextImages };
          })
        );
      } catch (e) {
        // If this fails, it's fine: we keep fallback filenames.
        console.warn("Could not resolve image filenames for dataset:", dsId, e);
      }
    }

    async function loadSignedUrls() {
      const max = row.images.length;
      if (!max) return;

      // load: current +/- 12 and all selected
      const want = new Set();
      const from = clamp(imageIndex - 12, 0, max - 1);
      const to = clamp(imageIndex + 12, 0, max - 1);
      for (let i = from; i <= to; i++) want.add(i);
      selected.forEach((i) => want.add(i));

      const indices = Array.from(want).filter((i) => i >= 0 && i < max);
      if (!indices.length) return;

      let cursor = 0;
      const concurrency = 5;

      const workers = new Array(concurrency).fill(0).map(async () => {
        while (cursor < indices.length) {
          const idx = indices[cursor++];
          const img = row.images[idx];
          if (!img?.id) continue;
          if (img?.src) continue;

          try {
            const res = await getSignedUrl(img.id);
            const url = res?.url || res;
            if (!url || cancelled) continue;

            setApprovals((prev) =>
              prev.map((r) => {
                if (r.id !== openRow) return r;
                const nextImages = r.images.map((x, j) =>
                  j === idx ? { ...x, src: url } : x
                );
                return { ...r, images: nextImages };
              })
            );
          } catch {
            // ignore
          }
        }
      });

      await Promise.all(workers);
    }

    resolveFilenamesOnce();
    loadSignedUrls();

    return () => {
      cancelled = true;
    };
  }, [openRow, approvals, imageIndex, selected]);

  /** Scroll selected thumbnail into view */
  useEffect(() => {
    if (!openRow) return;
    const el = thumbRefs.current?.[imageIndex];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [openRow, imageIndex]);

  /** ---------------------------
   *  Keyboard shortcuts
   *  -------------------------- */
  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        if (!openRow || imageModal || confirmModal) return;
        const row = approvals.find((a) => a.id === openRow);
        if (!row || row.kind !== "images") return;
        const total = row?.images?.length || 0;
        if (!total) return;
        e.preventDefault();
        selectAll(total);
        return;
      }

      if (e.key === "Escape") {
        if (confirmModal) {
          setConfirmModal(null);
          return;
        }
        if (imageModal) {
          closeImageModal();
          return;
        }
        if (popupUsers) {
          closeUsersPopup();
          return;
        }
        if (selected.size > 0) {
          clearSelection();
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

      if (!openRow) return;

      const row = approvals.find((a) => a.id === openRow);
      if (!row || row.kind !== "images") return;

      const max = row?.images?.length || 0;
      if (max === 0) return;

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") e.preventDefault();
      if (e.key === "ArrowRight") nextImage(max);
      if (e.key === "ArrowLeft") prevImage(max);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [openRow, imageModal, approvals, confirmModal, selected, popupUsers]);

  /** ---------------------------
   *  Approve / Deny (remark-driven)
   *  - Approve: hard delete + remark.status=true
   *  - Deny: only remark.status=true (kept)
   *  -------------------------- */
  async function resolveRemark(remarkId, replyText) {
    if (!remarkId) return;
    try {
      await updateRemark(remarkId, {
        status: true,
        reply: replyText || "",
      });
    } catch (e) {
      // Non-fatal: UI can still update
      console.warn("Failed to update remark:", remarkId, e);
    }
  }

  async function applyDecision(type, rowId) {
    const row = approvals.find((r) => r.id === rowId);
    if (!row) {
      showToast("Error: row not found.", "error");
      return;
    }

    const isApprove = type === "approve";

    try {
      // DATASET deletion request
      if (row.kind === "dataset") {
        const remarks = row.datasetRemarks || [];
        // Resolve all dataset-level pending remarks for this dataset
        // 1) deny => restore dataset
        if (!isApprove) {
          try {
            await restoreDataset(row.datasetId);
          } catch (e) {
            console.error("Restore dataset failed:", e);
            showToast("Failed to restore dataset.", "error");
            return;
          }
        }
        //2)
        for (const r of remarks) {
          await resolveRemark(r.remarkId, isApprove ? "Approved" : "Denied");
        }

        //3)
        if (isApprove) {
          await hard_Delete_Dataset(row.datasetId);
        }

        setApprovals((prev) => prev.filter((x) => x.id !== rowId));
        setOpenRow(null);
        setSelected(new Set());
        setAnchorIndex(null);
        setImageModal(null);
        setImageIndex(0);

        showToast(
          isApprove
            ? "Dataset permanently deleted (request approved)."
            : "Dataset deletion denied (request closed).",
          "success"
        );
        return;
      }

      // IMAGES deletion requests
      const targets = getTargets();
      const items = targets
        .map((idx) => row.images?.[idx])
        .filter(Boolean);

      if (!items.length) {
        showToast("No images selected.", "error");
        return;
      }

      const imageIds = items.map((x) => x.id).filter(Boolean)

      if (!isApprove) {
        //  1) Restore images (keep)
        try {
          // jouw service verwacht (datasetId, imageIds)
          await restoreImage(row.datasetId, imageIds);
        } catch (e) {
          console.error("Restore failed:", e);
          showToast("Failed to restore image(s).", "error");
          return;
        }

        // 2) close request(s) only
        for (const it of items) {
          await resolveRemark(it.remarkId, "Denied");
        }

        const denySet = new Set(imageIds);
        setApprovals((prev) =>
          prev
            .map((r) => {
              if (r.id !== rowId) return r;
              const nextImages = (r.images || []).filter((im) => !denySet.has(im.id));
              return { ...r, images: nextImages };
            })
            .filter((r) => r.kind === "dataset" || (r.images && r.images.length > 0))
        );

        setSelected(new Set());
        setAnchorIndex(null);
        setImageModal(null);
        setImageIndex((i) => 0);

        showToast(
          `${items.length} request${items.length > 1 ? "s" : ""} denied (images kept).`,
          "success"
        );
        return;
      }

      // // Approve = hard delete images + resolve remarks
      // const imageIds = items.map((x) => x.id).filter(Boolean);
      
      if (!imageIds.length) {
        showToast("No images selected.", "error");
        return;
      }

      let cursor = 0;
      const concurrency = 5;
      const ok = [];
      const fail = [];

      const workers = new Array(concurrency).fill(0).map(async () => {
        while (cursor < imageIds.length) {
          const id = imageIds[cursor++];
          try {
            await hardDeleteImage(id);
            ok.push(id);
          } catch (e) {
            console.error("Hard delete image failed:", id, e);
            fail.push(id);
          }
        }
      });

      await Promise.all(workers);

      // Resolve remarks for successfully deleted images
      const okSet = new Set(ok);
      for (const it of items) {
        if (okSet.has(it.id)) {
          await resolveRemark(it.remarkId, "Approved");
        }
      }

      if (!ok.length) {
        showToast("Hard delete failed.", "error");
        return;
      }

      setApprovals((prev) =>
        prev
          .map((r) => {
            if (r.id !== rowId) return r;
            const nextImages = (r.images || []).filter((im) => !okSet.has(im.id));
            return { ...r, images: nextImages };
          })
          .filter((r) => r.kind === "dataset" || (r.images && r.images.length > 0))
      );

      setSelected(new Set());
      setAnchorIndex(null);
      setImageModal(null);
      setImageIndex(0);

      showToast(
        `${ok.length} image${ok.length > 1 ? "s" : ""} permanently deleted.${
          fail.length ? " Some deletes failed." : ""
        }`,
        fail.length ? "error" : "success"
      );
    } catch (err) {
      console.error("Apply decision failed:", err);
      showToast("Action failed.", "error");
    }
  }

  function handleDecisionClick(type, rowId) {
    if (!confirmShown?.[type]) {
      setConfirmModal({ type, rowId });
      return;
    }
    applyDecision(type, rowId);
  }

  /** ---------------------------
   *  UI components
   *  -------------------------- */
  const topBtnStyle = useMemo(
    () => ({
      padding: "6px 10px",
      minWidth: "92px",
      height: "34px",
      borderRadius: "10px",
      backgroundColor: "#E5E7EB",
      border: "1px solid #C9CED8",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: 700,
      userSelect: "none",
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    }),
    []
  );

  function ImageViewer({ images }) {
    const current = images[imageIndex];
    const shownName = current?.filename || getFileNameFromSrc(current?.src);
    const [hover, setHover] = useState(false);

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
            backgroundColor: "#fff",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "inline-block",
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          >
            <img
              src={current?.src || ""}
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "0px",
                backgroundColor: "#fff",
              }}
              alt=""
            />

            {hover && (
              <button
                type="button"
                title="Maximize"
                aria-label="Maximize image"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openImageModal(images, imageIndex);
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
                  cursor: "pointer",
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
                  alt=""
                />
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            height: "22px",
            marginTop: "10px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            paddingRight: "8px",
            paddingLeft: "8px",
            fontSize: "13px",
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

        {/* Reason (remark.message) for current image */}
        {current?.remarkMessage && (
          <div
            style={{
              marginTop: "8px",
              padding: "10px 12px",
              borderRadius: "12px",
              backgroundColor: "#F3F4F6",
              border: "1px solid rgba(0,0,0,0.10)",
              fontSize: "13px",
              fontWeight: 700,
              opacity: 0.85,
              textAlign: "left",
              userSelect: "none",
            }}
          >
            Reason: <span style={{ fontWeight: 800 }}>{current.remarkMessage}</span>
          </div>
        )}

        <div className="flex justify-center items-center gap-[18px]" style={{ marginTop: "12px" }}>
          <img
            src={prevIcon}
            onClick={(e) => {
              e.stopPropagation();
              prevImage(images.length);
            }}
            style={{ width: "34px", cursor: "pointer", userSelect: "none" }}
            alt=""
          />

          <span style={{ fontSize: "18px", fontWeight: 700 }}>
            {imageIndex + 1}/{images.length}
          </span>

          <img
            src={nextIcon}
            onClick={(e) => {
              e.stopPropagation();
              nextImage(images.length);
            }}
            style={{ width: "34px", cursor: "pointer", userSelect: "none" }}
            alt=""
          />
        </div>
      </div>
    );
  }

  /** ---------------------------
   *  Confirm modal text
   *  -------------------------- */
  const confirmRow = confirmModal
    ? approvals.find((r) => r.id === confirmModal.rowId)
    : null;

  const confirmTitle =
    confirmModal?.type === "approve" ? "Approve Deletion" : "Deny Deletion";

  const confirmDesc =
    confirmModal?.type === "approve"
      ? confirmRow?.kind === "dataset"
        ? "This will permanently delete the dataset. This cannot be undone."
        : "This will permanently delete the selected image(s). This cannot be undone."
      : "This will deny the request and keep the dataset/image(s).";

  /** ---------------------------
   *  Render guards
   *  -------------------------- */
  if (loading) {
    return (
      <div className="w-full datasets-scroll">
        <h2 className="italic font-[700] text-[28px] mb-[16px]">
          Pending Approvals for Deletion
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
          Loading...
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="w-full datasets-scroll">
        <h2 className="italic font-[700] text-[28px] mb-[16px]">
          Pending Approvals for Deletion
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

  /** ---------------------------
   *  Main render
   *  -------------------------- */
  return (
    <div className="w-full datasets-scroll">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <h2 className="italic font-[700] text-[28px] mb-[16px]">
        Pending Approvals for Deletion
      </h2>

      {pendingLoading && (
        <div style={{ marginBottom: "10px", fontSize: "14px", fontWeight: 700, opacity: 0.75 }}>
          Loading pending deletions...
        </div>
      )}

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
        {/* Header (NO Name column anymore) */}
        <div
          className="flex"
          style={{
            backgroundColor: "#44F3C9",
            padding: "10px 18px",
            fontWeight: 600,
            fontSize: "16px",
          }}
        >
          <div className="w-[220px]">Dataset</div>
          <div className="w-[140px]">Owner</div>
          <div className="w-[160px]">Assigned</div>
          <div className="w-[160px]">Reviewer</div>
          <div className="w-[110px]">Pending</div>
          <div className="w-[40px]"></div>
        </div>

        {approvals.length === 0 && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              fontSize: "17px",
              fontWeight: 700,
              color: "#444",
            }}
          >
            No pending approvals for deletion.
          </div>
        )}

        {approvals.map((r) => (
          <div key={r.id}>
            <div
              className="flex border-b border-[#D6D6D6] cursor-pointer select-none"
              style={{
                backgroundColor: "#F2F2F2",
                height: "40px",
                alignItems: "center",
                paddingLeft: "18px",
                fontSize: "15px",
              }}
              onClick={(e) => {
                if (e.target?.dataset?.blockExpand === "1") return;
                toggleOpen(r.id);
              }}
            >
              <div className="w-[220px] truncate">{r.datasetName}</div>
              <div className="w-[140px] truncate">{r.owner}</div>

              <div className="w-[160px] truncate">
                {r.assigned?.[0] || "None"}
                {r.assigned?.length > 1 && (
                  <span
                    data-block-expand="1"
                    onClick={(e) => {
                      e.stopPropagation();
                      openUsersPopup(r.assigned);
                    }}
                    style={{ color: "#0073BA", cursor: "pointer" }}
                  >
                    {" "}
                    (+{r.assigned.length - 1})
                  </span>
                )}
              </div>

              <div className="w-[160px] truncate">
                {r.reviewer?.[0] || "None"}
                {r.reviewer?.length > 1 && (
                  <span
                    data-block-expand="1"
                    onClick={(e) => {
                      e.stopPropagation();
                      openUsersPopup(r.reviewer);
                    }}
                    style={{ color: "#0073BA", cursor: "pointer" }}
                  >
                    {" "}
                    (+{r.reviewer.length - 1})
                  </span>
                )}
              </div>

              <div className="w-[110px]">
                {r.kind === "dataset" ? "Dataset" : (r.images?.length || 0)}
              </div>

              <div className="w-[40px] flex justify-center">
                <img
                  src={openRow === r.id ? minimizeIcon : expandIcon}
                  style={{
                    width: "20px",
                    transition: "transform 0.2s",
                    transform: openRow === r.id ? "rotate(180deg)" : "rotate(0deg)",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                  alt=""
                />
              </div>
            </div>

            {/* Expanded */}
            {openRow === r.id && (
              <div style={{ backgroundColor: "#FFF", padding: "20px" }}>
                {/* Case 1: DATASET deletion => show remark message(s) */}
                {r.kind === "dataset" ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "flex", flexDirection: "column", gap: "14px" }}
                  >
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: "14px",
                        backgroundColor: "#F3F4F6",
                        border: "1px solid rgba(0,0,0,0.10)",
                        fontSize: "14px",
                        fontWeight: 800,
                        opacity: 0.9,
                      }}
                    >
                      Reason{(r.datasetRemarks?.length || 0) > 1 ? "s" : ""}:
                      <div style={{ marginTop: "10px", fontWeight: 700, opacity: 0.85 }}>
                        {(r.datasetRemarks || []).map((x, idx) => (
                          <div
                            key={x.remarkId || idx}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "12px",
                              backgroundColor: "#FFF",
                              border: "1px solid rgba(0,0,0,0.08)",
                              marginTop: idx === 0 ? 8 : 10,
                            }}
                          >
                            {x.message || "(no message)"}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-center gap-[60px] select-none">
                      <button
                        type="button"
                        title="Deny Deletion"
                        aria-label="Deny Deletion"
                        onClick={() => handleDecisionClick("deny", r.id)}
                        style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                      >
                        <img
                          src={denyIcon}
                          style={{
                            width: "64px",
                            height: "64px",
                            userSelect: "none",
                            filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))",
                          }}
                          alt=""
                        />
                      </button>

                      <button
                        type="button"
                        title="Approve Deletion (permanent)"
                        aria-label="Approve Deletion"
                        onClick={() => handleDecisionClick("approve", r.id)}
                        style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                      >
                        <img
                          src={approveIcon}
                          style={{
                            width: "50px",
                            height: "50.5px",
                            userSelect: "none",
                            filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))",
                          }}
                          alt=""
                        />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Case 2: IMAGES deletion => show image viewer + grid (each has remark) */
                  <div
                    style={{
                      display: "flex",
                      gap: "20px",
                      maxHeight: "calc(100vh - 260px)",
                      overflowY: "auto",
                      paddingRight: "10px",
                    }}
                  >
                    <ImageViewer images={r.images} />

                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <div
                        className="flex items-center justify-between"
                        style={{ marginBottom: "10px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h3 className="font-semibold text-[18px]" style={{ whiteSpace: "nowrap" }}>
                          Deletion Requests:
                        </h3>

                        <div className="flex items-center gap-[10px]">
                          <button type="button" onClick={() => selectAll(r.images.length)} style={topBtnStyle}>
                            Select All
                          </button>

                          <button type="button" onClick={clearSelection} style={topBtnStyle}>
                            Clear
                          </button>
                        </div>
                      </div>

                      <div
                        className="datasets-scroll scroll-thin"
                        style={{
                          maxHeight: "260px",
                          overflowY: "auto",
                          paddingRight: "6px",
                          marginBottom: "16px",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="grid grid-cols-3 gap-[10px]">
                          {r.images.map((img, idx) => {
                            const isSelected = selected.has(idx);

                            const onClick = (e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              if (e.shiftKey && anchorIndex !== null) {
                                selectRange(anchorIndex, idx, { additive: e.ctrlKey || e.metaKey });
                              } else if (e.ctrlKey || e.metaKey) {
                                toggleSelect(idx);
                                setAnchorIndex(idx);
                              } else {
                                setSelected(new Set([idx]));
                                setAnchorIndex(idx);
                              }

                              setImageIndex(idx);
                            };

                            return (
                              <div
                                key={img.id || idx}
                                ref={(el) => (thumbRefs.current[idx] = el)}
                                onClick={onClick}
                                title={img.remarkMessage ? `Reason: ${img.remarkMessage}` : ""}
                                style={{
                                  position: "relative",
                                  borderRadius: "12px",
                                  overflow: "hidden",
                                  cursor: "pointer",
                                  boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
                                  border: isSelected ? "2px solid #44F3C9" : "2px solid transparent",
                                  background: "#fff",
                                }}
                              >
                                <img
                                  src={img.src || ""}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                    userSelect: "none",
                                    background: "#fff",
                                  }}
                                  alt=""
                                  draggable={false}
                                />

                                {/* small "reason" dot if there is a message */}
                                {img.remarkMessage && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      left: "8px",
                                      top: "8px",
                                      width: "10px",
                                      height: "10px",
                                      borderRadius: "999px",
                                      backgroundColor: "#111827",
                                      opacity: 0.55,
                                      boxShadow: "0 6px 12px rgba(0,0,0,0.18)",
                                      pointerEvents: "none",
                                      zIndex: 10,
                                    }}
                                  />
                                )}

                                {isSelected && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "8px",
                                      right: "8px",
                                      width: "22px",
                                      height: "22px",
                                      borderRadius: "999px",
                                      backgroundColor: "#44F3C9",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      boxShadow: "0 6px 12px rgba(0,0,0,0.18)",
                                      pointerEvents: "none",
                                      zIndex: 10,
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "#0B2A2A",
                                        fontSize: "14px",
                                        fontWeight: 900,
                                        lineHeight: "14px",
                                      }}
                                    >
                                      ✓
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div
                        className="flex justify-center gap-[60px] mt-[8px] select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          title="Deny Deletion"
                          aria-label="Deny Deletion"
                          onClick={() => handleDecisionClick("deny", r.id)}
                          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                        >
                          <img
                            src={denyIcon}
                            style={{
                              width: "64px",
                              height: "64px",
                              userSelect: "none",
                              filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))",
                            }}
                            alt=""
                          />
                        </button>

                        <button
                          type="button"
                          title="Approve deletion (permanent)"
                          aria-label="Approve deletion"
                          onClick={() => handleDecisionClick("approve", r.id)}
                          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                        >
                          <img
                            src={approveIcon}
                            style={{
                              width: "50px",
                              height: "50.5px",
                              userSelect: "none",
                              filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))",
                            }}
                            alt=""
                          />
                        </button>
                      </div>

                      {selected.size > 0 && (
                        <div
                          style={{
                            marginTop: "10px",
                            textAlign: "center",
                            fontSize: "14px",
                            fontWeight: 800,
                            opacity: 0.75,
                            userSelect: "none",
                          }}
                        >
                          {selected.size} selected
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Users popup */}
      {popupUsers && (
        <>
          <div
            className="fixed inset-0"
            onClick={closeUsersPopup}
            style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 10000 }}
          />

          <div
            className="fixed top-1/2 left-1/2 rounded-[14px]"
            style={{
              transform: "translate(-50%, -50%)",
              width: "360px",
              backgroundColor: "#FFF",
              padding: "20px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
              zIndex: 10001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="italic" style={{ fontWeight: 700, fontSize: "20px", marginBottom: "12px" }}>
              Users
            </h3>

            {popupUsers.map((u, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid #DDD",
                  fontSize: "16px",
                  fontWeight: 400,
                }}
              >
                {u}
              </div>
            ))}

            <button
              onClick={closeUsersPopup}
              style={{
                marginTop: "18px",
                width: "100%",
                padding: "10px 0",
                borderRadius: "10px",
                backgroundColor: "#B3DCD7",
                border: "1px solid #91D0C9",
                cursor: "pointer",
                fontSize: "17px",
                fontWeight: 700,
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#9BCFC7")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#B3DCD7")}
            >
              Close
            </button>
          </div>
        </>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <>
          <div
            className="fixed inset-0"
            onClick={() => setConfirmModal(null)}
            style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 10000 }}
          />

          <div
            className="fixed top-1/2 left-1/2 rounded-[14px]"
            style={{
              transform: "translate(-50%, -50%)",
              width: "480px",
              backgroundColor: "#FFF",
              padding: "20px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
              zIndex: 10001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="italic" style={{ fontWeight: 700, fontSize: "20px", marginBottom: "10px" }}>
              {confirmTitle}
            </h3>

            <div style={{ fontSize: "15px", fontWeight: 700, opacity: 0.9 }}>
              {confirmDesc}
            </div>

            {confirmModal?.type === "approve" && confirmRow?.kind === "images" && (
              <div style={{ marginTop: "10px", fontSize: "13px", fontWeight: 700, opacity: 0.75 }}>
                If you selected images, the action applies to all selected. Otherwise it applies to the current image.
              </div>
            )}

            <div className="flex justify-between gap-[14px]" style={{ marginTop: "18px" }}>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                style={{
                  width: "50%",
                  padding: "10px 0",
                  borderRadius: "10px",
                  backgroundColor: "#E5E7EB",
                  border: "1px solid #C9CED8",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: 700,
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#D7DBE2")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#E5E7EB")}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  const { type, rowId } = confirmModal;
                  setConfirmShown((prev) => ({ ...prev, [type]: true }));
                  setConfirmModal(null);
                  applyDecision(type, rowId);
                }}
                style={{
                  width: "50%",
                  padding: "10px 0",
                  borderRadius: "10px",
                  backgroundColor: "#B3DCD7",
                  border: "1px solid #91D0C9",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: 700,
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#9BCFC7")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#B3DCD7")}
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}

      {/* Image modal */}
      {imageModal &&
        createPortal(
          <div
            onPointerDown={(e) => {
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
              zIndex: 9999999999999,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                width: "96vw",
                height: "92vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                aria-label="Close"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  guardedCloseImageModal();
                }}
                style={{
                  position: "absolute",
                  top: "-28px",
                  right: "-28px",
                  border: "none",
                  background: "transparent",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "38px",
                  fontWeight: 900,
                  lineHeight: "38px",
                  padding: 0,
                  userSelect: "none",
                  textShadow: "0 6px 16px rgba(0,0,0,0.6)",
                  zIndex: 60,
                }}
              >
                ×
              </button>

              <div
                onPointerDown={(e) => {
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
                  cursor: "pointer",
                  userSelect: "none",
                  zIndex: 50,
                }}
              >
                <img
                  src={prevIcon}
                  style={{
                    width: "72px",
                    height: "72px",
                    userSelect: "none",
                    pointerEvents: "none",
                    filter:
                      "drop-shadow(0 10px 18px rgba(0,0,0,0.75)) drop-shadow(0 0 10px rgba(0,0,0,0.55))",
                    opacity: 1,
                  }}
                  alt=""
                />
              </div>

              <div
                onPointerDown={(e) => {
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
                  cursor: "pointer",
                  userSelect: "none",
                  zIndex: 50,
                }}
              >
                <img
                  src={nextIcon}
                  style={{
                    width: "72px",
                    height: "72px",
                    userSelect: "none",
                    pointerEvents: "none",
                    filter:
                      "drop-shadow(0 10px 18px rgba(0,0,0,0.75)) drop-shadow(0 0 10px rgba(0,0,0,0.55))",
                    opacity: 1,
                  }}
                  alt=""
                />
              </div>

              <img
                src={imageModal.images?.[imageModal.index]?.src || ""}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  userSelect: "none",
                  cursor: "default",
                  display: "block",
                }}
                alt=""
              />

              <div
                style={{
                  position: "absolute",
                  bottom: "18px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: "#fff",
                  fontSize: "18px",
                  fontWeight: 700,
                  userSelect: "none",
                  textShadow: "0 6px 16px rgba(0,0,0,0.6)",
                  whiteSpace: "nowrap",
                  backgroundColor: "rgba(0,0,0,0.25)",
                  padding: "6px 12px",
                  borderRadius: "12px",
                  backdropFilter: "blur(2px)",
                  zIndex: 55,
                }}
              >
                {imageModal.index + 1}/{imageModal.images.length}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
