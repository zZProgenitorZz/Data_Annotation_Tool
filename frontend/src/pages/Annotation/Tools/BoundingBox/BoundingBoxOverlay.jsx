import React from "react";

// NHelper for consistent handle style
const HANDLE_SIZE = 6;


function handleInnerStyle(cursor) {
  return {
    width: `${HANDLE_SIZE}px`,
    height: `${HANDLE_SIZE}px`,
    background: "#fff",
    border: "1px solid #000",
    position: "absolute",
    transform: "translate(-50%, -50%)",
    cursor,
    pointerEvents: "auto",
    zIndex: 10,
  };
}


export default function BoundingBoxOverlay({
  boxes,
  draft,
  selectedId,
  setSelectedId,
  resizingBoxId = null,
  onBoxMouseDown, // NEW: added from your tool
  onHandleMouseDown, // NEW: added from your tool
  imgLeft,
  imgTop,
  imgWidth,
  imgHeight,
}) {
  const hasImage =
    typeof imgWidth === "number" &&
    imgWidth > 0 &&
    typeof imgHeight === "number" &&
    imgHeight > 0;

  if (!hasImage) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        // critical: let parent container receive all mouse events
        pointerEvents: "none",
        // keep overlay above the image
        zIndex: 1,
      }}
    >
      {/* Committed boxes (still shown). NOTE: clicks disabled for now due to pointerEvents:none */}
      {boxes.map((b) => {
        const left = hasImage ? imgLeft + b.x * imgWidth : b.x * 100 + "%";
        const top = hasImage ? imgTop + b.y * imgHeight : b.y * 100 + "%";
        const width = hasImage ? b.w * imgWidth : b.w * 100 + "%";
        const height = hasImage ? b.h * imgHeight : b.h * 100 + "%";
      
      return (
        <div
          key={b.id}
            onMouseDown={(e) => onBoxMouseDown(e, b.id)}
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              boxSizing: "border-box",
              border:
                b.id === selectedId
                  ? "2px solid #ff0000ff"
                  : "2px solid rgba(255, 0, 0, 0.6)",
              background:
                b.id === resizingBoxId
                  ? "rgba(0,163,255,0.08)"
                  : "transparent",
              pointerEvents: "auto",
              cursor: "move",
            }}
        >
          {/* Tooltip */}
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "10px",
              opacity: 1,
              pointerEvents: "none",
              transition: "opacity 0.15s ease",
            }}
            className="bbox-tooltip"
          >
            {b.category}
          </div>

          {/* ========================================================= */}
          {/* === NEW: RESIZE HANDLES (ONLY when selected) ============ */}
          {/* ========================================================= */}
          {selectedId === b.id && (
            <>
              {/* TOP LEFT */}
              <div
                style={{
                  position: "absolute",
                  left: "0%",
                  top: "0%",
                  width: 0,
                  height: 0,
                  pointerEvents: "none",
                }}
              >
                <div
                  onMouseDown={(e) => onHandleMouseDown(e, b.id, "nw")}
                  style={handleInnerStyle("nwse-resize")}
                />
              </div>

              {/* TOP RIGHT */}
              <div
                style={{
                  position: "absolute",
                  left: "100%",
                  top: "0%",
                  width: 0,
                  height: 0,
                  pointerEvents: "none",
                }}
              >
                <div
                  onMouseDown={(e) => onHandleMouseDown(e, b.id, "ne")}
                  style={handleInnerStyle("nesw-resize")}
                />
              </div>

              {/* BOTTOM LEFT */}
              <div
                style={{
                  position: "absolute",
                  left: "0%",
                  top: "100%",
                  width: 0,
                  height: 0,
                  pointerEvents: "none",
                }}
              >
                <div
                  onMouseDown={(e) => onHandleMouseDown(e, b.id, "sw")}
                  style={handleInnerStyle("nesw-resize")}
                />
              </div>

              {/* BOTTOM RIGHT */}
              <div
                style={{
                  position: "absolute",
                  left: "100%",
                  top: "100%",
                  width: 0,
                  height: 0,
                  pointerEvents: "none",
                }}
              >
                <div
                  onMouseDown={(e) => onHandleMouseDown(e, b.id, "se")}
                  style={handleInnerStyle("nwse-resize")}
                />
              </div>
            </>
          )}
        </div>
      )})}

      {/* Live draft while dragging */}
      {draft && (
        <div
          style={{
            position: "absolute",
            left: imgLeft + Math.min(draft.x1, draft.x2) * imgWidth,
            top: imgTop + Math.min(draft.y1, draft.y2) * imgHeight,
            width: Math.abs(draft.x2 - draft.x1) * imgWidth,
            height: Math.abs(draft.y2 - draft.y1) * imgHeight,
            boxSizing: "border-box",
            border: "2px dashed #ff0000ff",
            background: "rgba(0,163,255,0.10)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}