import React, { useEffect, useState, useMemo } from "react";
import selectionBox from "../../../assets/selectionbox.png";
import selectedBox from "../../../assets/selectedbox.png";
import { createRemark } from "../../../services/remarkService";
import { softDeleteImage } from "../../../services/ImageService";
import { hardDeleteImage } from "../../../services/ImageService";


// These are the default reasons shown in the pop-up.
// The "Other" option is handled separately.
const REASONS = [
  "Image is blurry",
  "Duplicate image",
  "Cropped or incomplete",
  "Not relevant to the project",
];

const ImageDeletion = ({ imageId, onClose, onSubmit, authType}) => {
  // saves which reason was selected (string)
  const [selected, setSelected] = useState("");


  // saves the text user types when choosing "other"
  const [otherText, setOtherText] = useState("");

  // Close popup when user presses ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose(); // fixed typo
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  // This ensures ESC always closes the window
  // useEffect runs once because onClose is stable from props.

  const buttonEffects = useMemo(
    () => ({
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
        e.currentTarget.style.filter = "brightness(0.95)"; // fixed spacing
      },
    }),
    []
  );
  // useMemo makes sure this object is created only once
  
  const isOther = selected === "other";


  const canDelete =
    selected && (isOther ? otherText.trim().length > 0 : true) || authType === "guest";


  const imageDelete = async (finalReason) => {
      if (!selected && !otherText) return;

      const stored = JSON.parse(localStorage.getItem("selectedDataset"));
      if (!stored || !stored.id) {
        console.error("No selectedDataset in localStorage");
        return;
      }

      const remark = {
        annotationId: "",
        imageId: imageId,
        datasetId: stored.id,
        message: finalReason,
        status: false,
        reply: "",
      };

      // 1. remark opslaan
      await createRemark(remark);

      // 2. image soft-deleten (LET OP: datasetId + imageId)
      await softDeleteImage(imageId);

      // 3. parent vertellen wat er is gebeurd
      if (onSubmit) {
        onSubmit(finalReason, imageId);
      }

      // 4. popup sluiten
      if (onClose) {
        onClose();
      }
    };
  const imageDeleteforGuest = async (finalReason) => {
    

    const stored = JSON.parse(localStorage.getItem("selectedDataset"));
    if (!stored || !stored.id) {
      console.error("No selectedDataset in localStorage");
      return;
    }

    // image soft-deleten (LET OP: datasetId + imageId)
    await softDeleteImage(imageId);

    //  parent vertellen wat er is gebeurd
    if (onSubmit) {
      onSubmit(finalReason, imageId);
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
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "14px",
      }}
      onClick={onClose} // clicking outside closes the popup
    >
      <div
        onClick={(e) => e.stopPropagation()} // prevents closure if clicking inside
        style={{
          width: "450px",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0px 6px 20px rgba(0,0,0,0.3)",
          paddingBottom: "20px",
          position: "relative",
        }}
      >
        {/* Header close (X) */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "8px",
            right: "10px",
            background: "none",
            border: "none",
            fontSize: "20px",
            fontWeight: 700,
            cursor: "pointer",
            color: "#555",
          }}
        >
          ✕
        </button>
        {authType === "guest" && (
          <div style={{ padding: "24px 24px 10px 24px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>
              Are you sure you want to delete this image?
            </div>
          </div>
        )}

        {authType === "user" && (
          <div>
        {/* Main title */}
          <div style={{ padding: "24px 24px 10px 24px" }}>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>
              Reason for Deletion:
            </div>
          </div>

          {/* Reason list using your selection icons */}
          <div
            style={{
              margin: "0 24px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            {REASONS.map((r, index) => (
              <div
                key={r}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 10px",
                  borderBottom:
                    index === REASONS.length - 1 ? "none" : "1px solid #ddd",
                  cursor: "pointer",
                }}
                onClick={() => setSelected(r)}
              >
                {/* selection icon */}
                <img
                  src={selected === r ? selectedBox : selectionBox}
                  alt=""
                  style={{
                    width: "18px",
                    height: "18px",
                    marginRight: "8px",
                  }}
                />

                <span style={{ fontSize: "14px" }}>{r}</span>
              </div>
            ))}
          </div>

          {/* Other reason text input */}
          <div style={{ marginTop: "14px", padding: "0 24px" }}>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Other reason:
            </div>

            <textarea
              value={isOther ? otherText : ""} // only show text when "other" is selected
              onChange={(e) => {
                if (selected !== "other") setSelected("other");
                setOtherText(e.target.value);
              }}
              style={{
                width: "100%",
                height: "85px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                padding: "10px",
                fontSize: "14px",
                resize: "none",
                outline: "none",
              }}
            />
          </div>
          </div>
        )}

        {/* Bottom buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "24px",
            marginTop: "22px",
          }}
        >
          {/* Cancel */}
          <button
            onClick={onClose}
            style={{
              padding: "10px 26px",
              borderRadius: "10px",
              backgroundColor: "#E9E6E4",
              border: "2px solid #D8D3D0",
              fontWeight: 600,
              cursor: "pointer",
            }}
            {...buttonEffects}
          >
            Cancel
          </button>

          {/* Delete */}
          <button
            disabled={!canDelete}
            onClick={ async () => {
              if (authType === "user") {
              const finalReason =
                selected === "other" ? otherText.trim() : selected;
              await imageDelete(finalReason);
              } else if (authType === "guest") {
                const finalReason =
                selected === "other" ? otherText.trim() : selected;
              await imageDeleteforGuest(finalReason);
              }

              
            }}
            style={{
              padding: "10px 28px",
              borderRadius: "10px",
              backgroundColor: !canDelete ? "#F3B5B5" : "#F06969",
              border: "2px solid #E45C5C",
              color: "#FFF",
              fontWeight: 700,
              cursor: !canDelete ? "not-allowed" : "pointer",
              opacity: !canDelete ? 0.7 : 1,
            }}
            {...buttonEffects}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageDeletion;
