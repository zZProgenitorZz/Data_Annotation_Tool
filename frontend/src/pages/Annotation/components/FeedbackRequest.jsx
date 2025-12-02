import React, { useState, useEffect } from "react";
import { createRemark } from "../../../services/remarkService";

const FeedbackRequest = ({ annotationId, imageId, fileName, onClose, onSubmit }) => {
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // === Button hover/click effects (same as UploadDataset) ===
  const buttonEffects = {
    onMouseOver: (e) => {
      if (e.currentTarget.disabled) return;
      e.currentTarget.style.filter = "brightness(0.95)";
    },
    onMouseOut: (e) => (e.currentTarget.style.filter = "brightness(1)"),
    onMouseDown: (e) => {
      if (e.currentTarget.disabled) return;
      e.currentTarget.style.filter = "brightness(0.85)";
    },
    onMouseUp: (e) => {
      if (e.currentTarget.disabled) return;
      e.currentTarget.style.filter = "brightness(0.95)";
    },
  };

  const isDisabled = remarks.trim().length === 0;


  const imageFeedback = async (remarks) => {
        if (isDisabled) return;
  
        const stored = JSON.parse(localStorage.getItem("selectedDataset"));
        if (!stored || !stored.id) {
          console.error("No selectedDataset in localStorage");
          return;
        }
  
        const remark = {
          annotationId: annotationId,
          imageId: imageId,
          datasetId: stored.id,
          message: remarks,
          status: false,
          reply: "",
        };
  
        // 1. remark opslaan
        await createRemark(remark);
  
        
  
        // 3. parent vertellen wat er is gebeurd
        if (onSubmit) {
          onSubmit();
        }
  
        // 4. popup sluiten
        if (onClose) {
          onClose();
        }
      };
  

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.4)",
        padding: "12px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0px 6px 20px rgba(0,0,0,0.3)",
          width: "436px",
          height: "350px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          transition: "transform 0.25s ease, opacity 0.25s ease",
        }}
      >
        {/* ✕ Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "8px",
            right: "10px",
            background: "none",
            border: "none",
            fontSize: "20px",
            fontWeight: 700,
            color: "#555555",
            cursor: "pointer",
            transition: "transform 0.15s ease, color 0.15s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "scale(1.15)";
            e.currentTarget.style.color = "#000000";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.color = "#555555";
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div
          style={{
            padding: "20px 24px 10px 24px",
            borderBottom: "1px solid #E5E7EB",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#000000",
              marginBottom: "6px",
            }}
          >
            You are requesting feedback for:
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#4B5563",
              overflowWrap: "anywhere",
            }}
          >
            {fileName}
          </div>
        </div>

        {/* Remarks area */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "10px",
            margin: "16px 16px 0 16px",
            padding: "16px",
            flexShrink: 0,
          }}
        >
          <label
            htmlFor="remarks"
            style={{
              display: "block",
              fontSize: "16px",
              fontWeight: 600,
              color: "#111111",
              marginBottom: "8px",
            }}
          >
            Remarks:
          </label>

          <textarea
            id="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter your remarks here..."
            className="datasets-scroll"
            style={{
              width: "100%",
              minHeight: "100px",
              maxHeight: "140px",
              border: "1px solid #D1D5DB",
              borderRadius: "8px",
              padding: "10px 12px",
              fontSize: "16px",
              color: "#000000",
              resize: "none",
              outline: "none",
              boxSizing: "border-box",
              lineHeight: "1.35",
              overflowY: "auto",
            }}
            onFocus={(e) => (e.target.style.outline = "2px solid #41768F")}
            onBlur={(e) => (e.target.style.outline = "none")}
          />
        </div>

        {/* Footer buttons */}
        <div
          style={{
            marginTop: "10px",
            padding: "16px",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            disabled={isDisabled}
            onClick={async () => {
              await imageFeedback(remarks);
            }}
            style={{
              padding: "12px 60px",
              borderRadius: "10px",
              backgroundColor: isDisabled ? "#D1D5DB" : "#B3DCD7",
              color: "#000000",
              border: "2px solid #91d0c9ff",
              cursor: isDisabled ? "not-allowed" : "pointer",
              fontSize: "20px",
              fontWeight: 600,
              fontStyle: "italic",
              transition: "background-color 0.3s ease, filter 0.2s ease, opacity 0.2s ease",
              opacity: isDisabled ? 0.6 : 1,
            }}
            {...buttonEffects}
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackRequest;
