import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import expandIcon from "../../assets/feedback/expand-details.png";
import minimizeIcon from "../../assets/feedback/minimize-details.png";
import maximizeIcon from "../../assets/feedback/maximize.png";

import approveIcon from "../../assets/feedback/approve-for-deletion.png";
import denyIcon from "../../assets/feedback/deny-deletion.png";

import img1 from "../../assets/feedback/008.png";
import img2 from "../../assets/feedback/annotated.png";

import prevIcon from "../../assets/feedback/previous_image.png";
import nextIcon from "../../assets/feedback/next_image.png";

import Toast from "../Annotation/components/Toast";

function makeDemoImages(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const src = i % 2 === 0 ? img2 : img1;
    const num = String(i).padStart(2, "0");
    out.push({ src, filename: `demo_${num}.png` });
  }
  return out;
}

export default function PendingApprovals() {
  const [openRow, setOpenRow] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);

  const [imageModal, setImageModal] = useState(null);
  const ignoreCloseUntilRef = useRef(0);

  const [confirmShown, setConfirmShown] = useState({
    approve: false,
    deny: false,
  });
  const [confirmModal, setConfirmModal] = useState(null);

  const [selected, setSelected] = useState(new Set());
  const [anchorIndex, setAnchorIndex] = useState(null);

  const thumbRefs = useRef([]);

  const [popupUsers, setPopupUsers] = useState(null);
  function openUsersPopup(list) {
    setPopupUsers(list);
  }
  function closeUsersPopup() {
    setPopupUsers(null);
  }

  const [toast, setToast] = useState(null);
  function showToast(message, type = "success") {
    setToast(null);
    requestAnimationFrame(() => setToast({ message, type }));
  }

  const topBtnStyle = {
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
  };

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

  function openImageModal(images, index) {
    ignoreCloseUntilRef.current = Date.now() + 250;
    setImageModal({ images, index });
  }

  function closeImageModal() {
    setImageModal(null);
  }

  function guardedCloseImageModal() {
    if (Date.now() < ignoreCloseUntilRef.current) return;
    closeImageModal();
  }

  const [approvals, setApprovals] = useState([
    {
      id: 1,
      dataset: "Dataset1182",
      name: "SchistoH_urine.zip",
      owner: "anthony",
      assigned: ["john", "timothy"],
      reviewer: ["jim", "alex", "marc"],
      images: makeDemoImages(10),
    },
    {
      id: 2,
      dataset: "Dataset155",
      name: "Ascaris_stool.zip",
      owner: "anthony",
      assigned: ["anthony"],
      reviewer: ["timothy"],
      images: makeDemoImages(10),
    },
  ]);

  function toggleOpen(id) {
    if (openRow === id) {
      setOpenRow(null);
      setSelected(new Set());
      setAnchorIndex(null);
      return;
    }
    setImageIndex(0);
    setOpenRow(id);
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

  function applyDecision(type, rowId) {
    const count = selected.size > 0 ? selected.size : 1;

    const row = approvals.find((r) => r.id === rowId);
    if (!row) {
      showToast("Error: dataset not found.", "error");
      return;
    }

    setApprovals((prev) => {
      const curr = prev.find((r) => r.id === rowId);
      if (!curr) return prev;

      const targets = getTargets();
      const toRemove = new Set(targets);
      const nextImages = curr.images.filter((_, idx) => !toRemove.has(idx));

      const next = prev
        .map((r) => (r.id === rowId ? { ...r, images: nextImages } : r))
        .filter((r) => r.images.length > 0);

      const nextLen = nextImages.length;

      setSelected(new Set());
      setAnchorIndex(null);

      if (nextLen === 0) {
        setOpenRow(null);
        setImageIndex(0);
      } else {
        setImageIndex((i) => {
          const clamped = Math.min(i, nextLen - 1);
          return Math.max(0, clamped);
        });
      }

      setImageModal((m) => (m ? null : m));

      return next;
    });

    if (type === "approve") {
      showToast(
        `${count} image${count > 1 ? "s" : ""} removed from the dataset.`,
        "success"
      );
    } else {
      showToast(
        `${count} image${count > 1 ? "s" : ""} kept in the dataset.`,
        "success"
      );
    }
  }

  function handleDecisionClick(type, rowId) {
    if (!confirmShown?.[type]) {
      setConfirmModal({ type, rowId });
      return;
    }
    applyDecision(type, rowId);
  }

  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        if (!openRow || imageModal || confirmModal) return;
        const row = approvals.find((a) => a.id === openRow);
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
      const max = row?.images?.length || 0;
      if (max === 0) return;

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") e.preventDefault();
      if (e.key === "ArrowRight") nextImage(max);
      if (e.key === "ArrowLeft") prevImage(max);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [openRow, imageModal, approvals, confirmModal, selected, popupUsers]);

  useEffect(() => {
    if (!openRow) return;
    const el = thumbRefs.current?.[imageIndex];
    if (!el) return;

    el.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [openRow, imageIndex]);

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
              src={current?.src}
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "0px",
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

        <div
          className="flex justify-center items-center gap-[18px]"
          style={{ marginTop: "12px" }}
        >
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

  const confirmTitle =
    confirmModal?.type === "approve" ? "Approve Deletion" : "Deny Deletion";
  const confirmDesc =
    confirmModal?.type === "approve"
      ? "This will remove the image(s) from the dataset."
      : "This will keep the image(s) in the dataset.";

  return (
    <div className="w-full datasets-scroll">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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
          <div className="w-[200px]">Name</div>
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
              <div className="w-[130px]">{r.dataset}</div>
              <div className="w-[200px] truncate">{r.name}</div>
              <div className="w-[140px] truncate">{r.owner}</div>

              <div className="w-[160px] truncate">
                {r.assigned[0]}
                {r.assigned.length > 1 && (
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
                {r.reviewer[0]}
                {r.reviewer.length > 1 && (
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

              <div className="w-[110px]">{r.images.length}</div>

              <div className="w-[40px] flex justify-center">
                <img
                  src={openRow === r.id ? minimizeIcon : expandIcon}
                  style={{
                    width: "20px",
                    transition: "transform 0.2s",
                    transform:
                      openRow === r.id ? "rotate(180deg)" : "rotate(0deg)",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                  alt=""
                />
              </div>
            </div>

            {openRow === r.id && (
              <div style={{ backgroundColor: "#FFF", padding: "20px" }}>
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
                      <h3
                        className="font-semibold text-[18px]"
                        style={{ whiteSpace: "nowrap" }}
                      >
                        Deletion Requests:
                      </h3>

                      <div className="flex items-center gap-[10px]">
                        <button
                          type="button"
                          onClick={() => selectAll(r.images.length)}
                          style={topBtnStyle}
                        >
                          Select All
                        </button>

                        <button
                          type="button"
                          onClick={clearSelection}
                          style={topBtnStyle}
                        >
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
                        {r.images.map((imgObj, index) => {
                          const isSelected = selected.has(index);

                          return (
                            <div
                              key={index}
                              ref={(el) => (thumbRefs.current[index] = el)}
                              style={{
                                position: "relative",
                                cursor: "pointer",
                                borderRadius: "10px",
                                overflow: "hidden",
                                width: "100%",
                                aspectRatio: "16 / 9",
                                backgroundColor: "#F3F4F6",
                                border: isSelected
                                  ? "3px solid #44F3C9"
                                  : index === imageIndex
                                  ? "2px solid rgba(0,0,0,0.35)"
                                  : "1px solid rgba(0,0,0,0.14)",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();

                                const isCtrl = e.ctrlKey || e.metaKey;
                                const isShift = e.shiftKey;

                                setImageIndex(index);

                                if (isShift) {
                                  const a = anchorIndex ?? index;
                                  selectRange(a, index, { additive: isCtrl });
                                  setAnchorIndex(a);
                                  return;
                                }

                                if (isCtrl) {
                                  toggleSelect(index);
                                  setAnchorIndex(index);
                                  return;
                                }
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                toggleSelect(index);
                                setAnchorIndex(index);
                              }}
                              title="Click: view • Ctrl: toggle select • Shift: range • Ctrl+A: select all • Esc: clear"
                              aria-selected={isSelected}
                            >
                              <img
                                src={imgObj.src}
                                draggable={false}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                  userSelect: "none",
                                }}
                                alt=""
                              />

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
                        title="Deny Deletion (keep)"
                        aria-label="Deny Deletion"
                        onClick={() => handleDecisionClick("deny", r.id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          padding: 0,
                        }}
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
                        title="Approve deletion (remove)"
                        aria-label="Approve deletion"
                        onClick={() => handleDecisionClick("approve", r.id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          padding: 0,
                        }}
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
              </div>
            )}
          </div>
        ))}
      </div>

      {popupUsers && (
        <>
          <div
            className="fixed inset-0"
            onClick={closeUsersPopup}
            style={{
              backgroundColor: "rgba(0,0,0,0.7)",
              zIndex: 10000,
            }}
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
            <h3
              className="italic"
              style={{
                fontWeight: 700,
                fontSize: "20px",
                marginBottom: "12px",
              }}
            >
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

      {confirmModal && (
        <>
          <div
            className="fixed inset-0"
            onClick={() => setConfirmModal(null)}
            style={{
              backgroundColor: "rgba(0,0,0,0.7)",
              zIndex: 10000,
            }}
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
            <h3
              className="italic"
              style={{
                fontWeight: 700,
                fontSize: "20px",
                marginBottom: "10px",
              }}
            >
              {confirmTitle}
            </h3>

            <div style={{ fontSize: "15px", fontWeight: 700, opacity: 0.9 }}>
              {confirmDesc}
            </div>

            <div
              style={{
                marginTop: "10px",
                fontSize: "13px",
                fontWeight: 700,
                opacity: 0.75,
              }}
            >
              If you selected images, the action applies to all selected. Otherwise
              it applies to the current image.
            </div>

            <div
              className="flex justify-between gap-[14px]"
              style={{ marginTop: "18px" }}
            >
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
                src={imageModal.images[imageModal.index]?.src}
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
