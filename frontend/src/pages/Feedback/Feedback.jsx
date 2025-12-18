import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import expandIcon from "../../assets/feedback/expand-details.png";
import minimizeIcon from "../../assets/feedback/minimize-details.png";
import maximizeIcon from "../../assets/feedback/maximize.png";
import editIcon from "../../assets/feedback/edit.png";

import img1 from "../../assets/feedback/008.png";
import img2 from "../../assets/feedback/annotated.png";

import prevIcon from "../../assets/feedback/previous_image.png";
import nextIcon from "../../assets/feedback/next_image.png";

import Toast from "../Annotation/components/Toast";

export default function Feedback() {
  // const DEMO_USER = { username: "anthony", role: "annotator" };
  const DEMO_USER = { username: "john", role: "annotator" };
  // const DEMO_USER = { username: "timothy", role: "reviewer" };
  // const DEMO_USER = { username: "jim", role: "reviewer" };

  const isReviewer = DEMO_USER.role === "reviewer";
  const isAnnotator = DEMO_USER.role === "annotator";

  const [openRow, setOpenRow] = useState(null);
  const [openReceivedRow, setOpenReceivedRow] = useState(null);
  const [requestIndex, setRequestIndex] = useState(0);

  const [popupUsers, setPopupUsers] = useState(null);

  const [imageModal, setImageModal] = useState(null);
  const ignoreCloseUntilRef = useRef(0);

  const [toast, setToast] = useState(null);
  function showToast(message, type = "success") {
    setToast(null);
    requestAnimationFrame(() => setToast({ message, type }));
  }

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

  function openUsersPopup(list) {
    setPopupUsers(list);
  }
  function closeUsersPopup() {
    setPopupUsers(null);
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

  function prevModal() {
    setImageModal((m) => {
      if (!m) return m;
      const max = m.images.length;
      const nextIdx = m.index === 0 ? max - 1 : m.index - 1;
      setRequestIndex(nextIdx);
      return { ...m, index: nextIdx };
    });
  }

  function nextModal() {
    setImageModal((m) => {
      if (!m) return m;
      const max = m.images.length;
      const nextIdx = m.index === max - 1 ? 0 : m.index + 1;
      setRequestIndex(nextIdx);
      return { ...m, index: nextIdx };
    });
  }

  const [openRequests, setOpenRequests] = useState([
    {
      id: 1,
      dataset: "Dataset1182",
      name: "SchistoH_urine.zip",
      owner: "anthony",
      assigned: ["john", "timothy"],
      reviewer: ["jim", "alex", "marc"],
      requests: [
        {
          image: img1,
          filename: "008.png",
          question: "Do I have to annotate very small objects?",
        },
        {
          image: img2,
          filename: "annotated.png",
          question: "Should I separate eggs that overlap?",
        },
      ],
    },

    {
      id: 2,
      dataset: "Dataset155",
      name: "Ascaris_stool.zip",
      owner: "anthony",
      assigned: ["anthony"],
      reviewer: ["timothy", "marc"],
      requests: [
        {
          image: img1,
          filename: "008.png",
          question: "Should I include partially visible eggs?",
        },
        {
          image: img2,
          filename: "annotated.png",
          question: "Do I have to annotate broken eggs?",
        },
        {
          image: img1,
          filename: "008.png",
          question: "Do these count as eggs or artifacts?",
        },
      ],
    },
  ]);

  const [feedbackStore, setFeedbackStore] = useState([]);

  function canSeeDataset(r) {
    if (!r) return false;
    if (isReviewer) return (r.reviewer || []).includes(DEMO_USER.username);
    return (
      (r.assigned || []).includes(DEMO_USER.username) ||
      r.owner === DEMO_USER.username
    );
  }

  const visibleOpenRequests = openRequests.filter(canSeeDataset);

  function visibleFeedbackGroups() {
    const groups = (feedbackStore || []).filter((g) => {
      const anyEntry = g.entries?.[0];
      if (!anyEntry) return false;

      if (isReviewer) {
        return g.entries.some((e) => e.reviewer === DEMO_USER.username);
      }
      return g.entries.some((e) => e.annotator === DEMO_USER.username);
    });

    return groups
      .map((g) => {
        const filteredEntries = isReviewer
          ? g.entries.filter((e) => e.reviewer === DEMO_USER.username)
          : g.entries.filter((e) => e.annotator === DEMO_USER.username);

        return { ...g, entries: filteredEntries };
      })
      .filter((g) => g.entries.length > 0);
  }

  const visibleFeedback = visibleFeedbackGroups();

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape" && imageModal) {
        closeImageModal();
        return;
      }

      if (imageModal) {
        if (e.key === "ArrowRight") nextModal();
        if (e.key === "ArrowLeft") prevModal();
        return;
      }

      const isOpen = openRow || openReceivedRow;
      if (!isOpen) return;

      let max = 0;

      if (openRow) {
        const r = visibleOpenRequests.find((x) => x.id === openRow);
        if (!r) return;
        max = r.requests.length;
      }

      if (openReceivedRow) {
        const r = visibleFeedback.find((x) => x.datasetId === openReceivedRow);
        if (!r) return;
        max = r.entries.length;
      }

      if (max === 0) return;

      if (e.key === "ArrowRight") nextRequest(max);
      if (e.key === "ArrowLeft") prevRequest(max);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [openRow, openReceivedRow, visibleOpenRequests, visibleFeedback, imageModal]);

  useEffect(() => {
    if (!editTarget) return;
    setEditTarget(null);
    setEditValue("");
  }, [openReceivedRow, requestIndex]);

  function toggleOpen(id) {
    if (openRow === id) return setOpenRow(null);
    setRequestIndex(0);
    setOpenRow(id);
    setOpenReceivedRow(null);
  }

  function toggleReceived(id) {
    if (openReceivedRow === id) return setOpenReceivedRow(null);
    setRequestIndex(0);
    setOpenReceivedRow(id);
    setOpenRow(null);
  }

  function prevRequest(max) {
    setRequestIndex((i) => (i === 0 ? max - 1 : i - 1));
  }

  function nextRequest(max) {
    setRequestIndex((i) => (i === max - 1 ? 0 : i + 1));
  }

  function sendFeedback(datasetId, text) {
    if (!isReviewer) {
      showToast("Error: only reviewers can send feedback.", "error");
      return;
    }
    if (!text.trim()) {
      showToast("Error: feedback is empty.", "error");
      return;
    }

    const ds = openRequests.find((x) => x.id === datasetId);
    if (!ds) {
      showToast("Error: dataset not found.", "error");
      return;
    }

    const safeIdx = Math.min(requestIndex, Math.max(0, ds.requests.length - 1));
    const req = ds.requests[safeIdx];
    if (!req) {
      showToast("Error: request not found.", "error");
      return;
    }

    const reviewerGivingFeedback = DEMO_USER.username;
    const annotatorAsking = ds.assigned?.[0] ?? "";

    setFeedbackStore((prev) => {
      const found = prev.find((p) => p.datasetId === ds.id);

      const entryToAdd = {
        image: req.image,
        filename: req.filename || getFileNameFromSrc(req.image),
        question: req.question,
        feedback: text,
        reviewer: reviewerGivingFeedback,
        annotator: annotatorAsking,
      };

      if (found) {
        return prev.map((p) =>
          p.datasetId === ds.id ? { ...p, entries: [...p.entries, entryToAdd] } : p
        );
      }

      return [
        ...prev,
        {
          datasetId: ds.id,
          dataset: ds.dataset,
          name: ds.name,
          entries: [entryToAdd],
        },
      ];
    });

    setOpenRequests((prev) => {
      const next = prev
        .map((item) => {
          if (item.id !== datasetId) return item;

          const newReqs = item.requests.filter((_, idx) => idx !== safeIdx);
          return { ...item, requests: newReqs };
        })
        .filter((x) => x.requests.length > 0);

      const stillExists = next.some((x) => x.id === datasetId);
      if (!stillExists) setOpenRow(null);

      setRequestIndex(0);

      return next;
    });

    const box = document.getElementById(`fb-${datasetId}`);
    if (box) box.value = "";

    showToast("Feedback sent.", "success");
  }

  function startEdit(datasetId, index, currentFeedback) {
    if (!isReviewer) return;
    setEditTarget({ datasetId, index });
    setEditValue(String(currentFeedback ?? ""));
  }

  function cancelEdit() {
    setEditTarget(null);
    setEditValue("");
  }

  function saveEdit() {
    if (!isReviewer) return;
    if (!editTarget) return;

    const nextText = String(editValue ?? "");
    if (!nextText.trim()) {
      showToast("Error: feedback is empty.", "error");
      return;
    }

    const { datasetId, index } = editTarget;

    setFeedbackStore((prev) =>
      prev.map((g) => {
        if (g.datasetId !== datasetId) return g;
        const nextEntries = (g.entries || []).map((e, i) =>
          i === index ? { ...e, feedback: nextText } : e
        );
        return { ...g, entries: nextEntries };
      })
    );

    cancelEdit();
    showToast("Feedback updated.", "success");
  }

  function toModalImagesFromRequests(reqs) {
    return (reqs || []).map((q) => ({
      src: q.image,
      filename: q.filename || getFileNameFromSrc(q.image),
    }));
  }
  function toModalImagesFromEntries(entries) {
    return (entries || []).map((e) => ({
      src: e.image,
      filename: e.filename || getFileNameFromSrc(e.image),
    }));
  }

  function ImageViewer({ image, total, filename, modalImages }) {
    const shownName = filename || getFileNameFromSrc(image);
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
              src={image}
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openImageModal(modalImages, requestIndex);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
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

        <div className="flex justify-center items-center gap-[18px]" style={{ marginTop: "12px" }}>
          <img
            src={prevIcon}
            onClick={() => prevRequest(total)}
            style={{ width: "34px", cursor: "pointer", userSelect: "none" }}
            alt=""
          />

          <span style={{ fontSize: "18px", fontWeight: 700 }}>
            {Math.min(requestIndex + 1, total)}/{total}
          </span>

          <img
            src={nextIcon}
            onClick={() => nextRequest(total)}
            style={{ width: "34px", cursor: "pointer", userSelect: "none" }}
            alt=""
          />
        </div>
      </div>
    );
  }

  return (
    <div className="datasets-scroll w-full" style={{ paddingBottom: "40px" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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

        {visibleOpenRequests.map((r) => (
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
              onClick={(e) => {
                if (e?.target?.dataset?.blockExpand === "1") return;
                toggleOpen(r.id);
              }}
            >
              <div className="w-[130px]">{r.dataset}</div>

              <div className="w-[200px] truncate">
                {r.reviewer[0]}
                {r.reviewer.length > 1 && (
                  <span
                    data-block-expand="1"
                    onClick={() => openUsersPopup(r.reviewer)}
                    style={{ color: "#0073BA", cursor: "pointer" }}
                  >
                    {" "}
                    (+{r.reviewer.length - 1})
                  </span>
                )}
              </div>

              <div className="w-[110px]" style={{ textAlign: "center", position: "relative", left: "-70px" }}>
                {r.requests.length}
              </div>

              <div className="w-[160px] truncate">{r.owner}</div>

              <div className="w-[180px] truncate">
                {r.assigned[0]}
                {r.assigned.length > 1 && (
                  <span
                    data-block-expand="1"
                    onClick={() => openUsersPopup(r.assigned)}
                    style={{ color: "#0073BA", cursor: "pointer" }}
                  >
                    {" "}
                    (+{r.assigned.length - 1})
                  </span>
                )}
              </div>

              <div className="flex-1 flex justify-end pr-[18px]">
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

            {openRow === r.id && r.requests.length > 0 && (
              <div
                style={{
                  backgroundColor: "#FFF",
                  padding: "20px",
                  display: "flex",
                  gap: "20px",
                }}
              >
                {(() => {
                  const safeIdx = Math.min(requestIndex, r.requests.length - 1);
                  const req = r.requests[safeIdx];

                  return (
                    <>
                      <ImageViewer
                        image={req.image}
                        filename={req.filename}
                        total={r.requests.length}
                        modalImages={toModalImagesFromRequests(r.requests)}
                      />

                      <div className="flex-1">
                        <h3 style={{ fontWeight: 700, fontSize: "18px", marginBottom: "6px" }}>
                          {r.assigned[0]} asks:
                        </h3>

                        <div
                          style={{
                            backgroundColor: "#FFF",
                            border: "1px solid #D1D5DB",
                            borderRadius: "12px",
                            padding: "12px",
                            marginBottom: "14px",
                            fontSize: "15px",
                            maxWidth: "460px",
                          }}
                        >
                          “{req.question}”
                        </div>

                        <textarea
                          placeholder={isReviewer ? "Write feedback..." : "Only reviewers can send feedback."}
                          id={`fb-${r.id}`}
                          disabled={!isReviewer}
                          style={{
                            width: "460px",
                            height: "120px",
                            border: "1px solid #D1D5DB",
                            borderRadius: "10px",
                            padding: "12px",
                            resize: "none",
                            fontSize: "16px",
                            marginBottom: "4px",
                            opacity: isReviewer ? 1 : 0.6,
                          }}
                        />

                        <button
                          style={{
                            width: "486px",
                            padding: "12px 0",
                            borderRadius: "10px",
                            backgroundColor: "#B3DCD7",
                            border: "1px solid #91D0C9",
                            cursor: isReviewer ? "pointer" : "not-allowed",
                            fontWeight: 700,
                            fontSize: "17px",
                            marginTop: "10px",
                            opacity: isReviewer ? 1 : 0.7,
                          }}
                          onMouseEnter={(e) => {
                            if (!isReviewer) return;
                            e.target.style.backgroundColor = "#9BCFC7";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "#B3DCD7";
                          }}
                          onClick={() => sendFeedback(r.id, document.getElementById(`fb-${r.id}`)?.value || "")}
                        >
                          Send Feedback
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ height: "40px" }} />

      <h2 className="italic" style={{ fontWeight: 700, fontSize: "28px", marginBottom: "16px" }}>
        {isReviewer ? "Given" : "Received"}
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

          <div className="w-[200px]">{isReviewer ? "Annotator" : "Reviewer"}</div>

          <div className="w-[110px]" style={{ textAlign: "center", position: "relative", left: "-70px" }}>
            #
          </div>

          <div className="w-[360px]">Feedback</div>

          <div className="flex-1"></div>
        </div>

        {visibleFeedback.length === 0 && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              fontSize: "17px",
              fontWeight: 700,
              color: "#444",
            }}
          >
            {isReviewer ? "No feedback given yet." : "No feedback received yet."}
          </div>
        )}

        {visibleFeedback.map((r) => {
          const safeIdx = Math.min(requestIndex, Math.max(0, r.entries.length - 1));
          const first = r.entries[0];
          const shown = r.entries[safeIdx];

          const isEditingThis =
            isReviewer && editTarget && editTarget.datasetId === r.datasetId && editTarget.index === safeIdx;

          return (
            <div key={r.datasetId}>
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
                onClick={() => toggleReceived(r.datasetId)}
              >
                <div className="w-[130px]">{r.dataset}</div>

                <div className="w-[200px] truncate">{isReviewer ? first?.annotator : first?.reviewer}</div>

                <div className="w-[110px]" style={{ textAlign: "center", position: "relative", left: "-70px" }}>
                  {r.entries.length}
                </div>

                <div className="w-[360px] truncate" style={{ color: "#555" }}>
                  {first?.feedback}
                </div>

                <div className="flex-1 flex justify-end pr-[18px]">
                  <img
                    src={openReceivedRow === r.datasetId ? minimizeIcon : expandIcon}
                    style={{
                      width: "20px",
                      transition: "transform 0.2s",
                      transform: openReceivedRow === r.datasetId ? "rotate(180deg)" : "rotate(0deg)",
                      userSelect: "none",
                      pointerEvents: "none",
                    }}
                    alt=""
                  />
                </div>
              </div>

              {openReceivedRow === r.datasetId && shown && (
                <div
                  style={{
                    backgroundColor: "#FFF",
                    padding: "20px",
                    display: "flex",
                    gap: "22px",
                  }}
                >
                  <ImageViewer
                    image={shown.image}
                    filename={shown.filename}
                    total={r.entries.length}
                    modalImages={toModalImagesFromEntries(r.entries)}
                  />

                  <div className="flex-1" style={{ minWidth: 0 }}>
                    {isReviewer ? (
                      <>
                        <h3 style={{ fontWeight: 700, fontSize: "18px", marginBottom: "10px" }}>Remarks:</h3>

                        <div
                          style={{
                            backgroundColor: "#FFF",
                            border: "1px solid #D1D5DB",
                            borderRadius: "12px",
                            padding: "12px",
                            fontSize: "15px",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            whiteSpace: "pre-wrap",
                            maxHeight: "140px",
                            overflowY: "auto",
                            marginBottom: "20px",
                          }}
                        >
                          {shown.question}
                        </div>

                        <h3 style={{ fontWeight: 700, fontSize: "18px", marginBottom: "10px" }}>
                          Feedback given:
                        </h3>

                        <div
                          style={{
                            backgroundColor: "#FFF",
                            border: "1px solid #D1D5DB",
                            borderRadius: "12px",
                            padding: "12px",
                            fontSize: "15px",
                            overflow: "hidden",
                            maxHeight: "140px",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <div
                            style={{
                              flex: "1 1 auto",
                              overflowY: "auto",
                              overflowX: "hidden",
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                              paddingRight: "10px",
                            }}
                          >
                            {isEditingThis ? (
                              <textarea
                                ref={editTextareaRef}
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  requestAnimationFrame(autoSizeEditTextarea);
                                }}
                                style={{
                                  width: "100%",
                                  border: "none",
                                  outline: "none",
                                  resize: "none",
                                  background: "transparent",
                                  fontSize: "15px",
                                  overflow: "hidden",
                                  padding: 0,
                                  margin: 0,
                                  display: "block",
                                  whiteSpace: "pre-wrap",
                                  overflowWrap: "anywhere",
                                  wordBreak: "break-word",
                                }}
                              />
                            ) : (
                              shown.feedback
                            )}
                          </div>

                          <div
                            style={{
                              flex: "0 0 auto",
                              height: "22px",
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "flex-end",
                              // paddingTop: "0px",
                            }}
                          >
                            {!isEditingThis && (
                              <button
                                type="button"
                                onClick={() => startEdit(r.datasetId, safeIdx, shown.feedback)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  userSelect: "none",
                                  padding: 0,
                                  fontStyle: "italic",
                                  fontWeight: 700,
                                  fontSize: "16px",
                                  color: "#000",
                                  opacity: 0.85,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Edit
                                <img
                                  src={editIcon}
                                  style={{ width: "18px", height: "18px", pointerEvents: "none" }}
                                  alt=""
                                />
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditingThis && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: "10px",
                              marginTop: "12px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={saveEdit}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "10px",
                                backgroundColor: "#B3DCD7",
                                border: "1px solid #91D0C9",
                                cursor: "pointer",
                                fontStyle: "italic",
                                fontWeight: 700,
                                fontSize: "14px",
                                userSelect: "none",
                                whiteSpace: "nowrap",
                              }}
                              onMouseEnter={(e) => (e.target.style.backgroundColor = "#9BCFC7")}
                              onMouseLeave={(e) => (e.target.style.backgroundColor = "#B3DCD7")}
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              onClick={cancelEdit}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "10px",
                                backgroundColor: "#F2F2F2",
                                border: "1px solid #D1D5DB",
                                cursor: "pointer",
                                fontStyle: "italic",
                                fontWeight: 700,
                                fontSize: "14px",
                                userSelect: "none",
                                whiteSpace: "nowrap",
                              }}
                              onMouseEnter={(e) => (e.target.style.backgroundColor = "#E8E8E8")}
                              onMouseLeave={(e) => (e.target.style.backgroundColor = "#F2F2F2")}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <h3 style={{ fontWeight: 700, fontSize: "18px", marginBottom: "10px" }}>
                          Feedback received:
                        </h3>

                        <div
                          style={{
                            backgroundColor: "#FFF",
                            border: "1px solid #D1D5DB",
                            borderRadius: "12px",
                            padding: "12px",
                            marginBottom: "20px",
                            fontSize: "15px",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            whiteSpace: "pre-wrap",
                            maxHeight: "140px",
                            overflowY: "auto",
                          }}
                        >
                          {shown.feedback}
                        </div>

                        <h3 style={{ fontWeight: 700, fontSize: "18px", marginBottom: "10px" }}>Remarks:</h3>

                        <div
                          style={{
                            backgroundColor: "#FFF",
                            border: "1px solid #D1D5DB",
                            borderRadius: "12px",
                            padding: "12px",
                            fontSize: "15px",
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            whiteSpace: "pre-wrap",
                            maxHeight: "140px",
                            overflowY: "auto",
                          }}
                        >
                          {shown.question}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
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

      {imageModal &&
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
              zIndex: 9999999999999,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              onMouseDown={(e) => e.stopPropagation()}
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
                onMouseDown={(e) => {
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
                  bottom: "34px",
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
