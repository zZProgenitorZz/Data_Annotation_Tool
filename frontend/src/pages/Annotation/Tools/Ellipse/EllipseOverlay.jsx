import React from "react";

const HANDLE_SIZE = 6;

function handleStyle(px, py, cursor) {
  return {
    position: "absolute",
    left: px,
    top: py,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    background: "#fff",
    border: "1px solid #000",
    transform: "translate(-50%, -50%)",
    cursor,
    pointerEvents: "auto",
    zIndex: 10,
  };
}

export default function EllipseOverlay({
  ellipses,
  draft,
  selectedId,
  onEllipseMouseDown,
  onHandleMouseDown,
  imgLeft,
  imgTop,
  imgWidth,
  imgHeight,
}) {
  if (!imgWidth || !imgHeight) return null;

  // convert normalized to pixel coordinate
  const n2p = (p) => ({
    x: imgLeft + p.x * imgWidth,
    y: imgTop + p.y * imgHeight,
  });

  return (
    <>
      {ellipses.map((el) => {
        const selected = el.id === selectedId;

        const tl = n2p({ x: el.x, y: el.y });   // top-left pixel
        const wPx = el.w * imgWidth;           // width in pixels
        const hPx = el.h * imgHeight;          // height in pixels

        // bounding-box pixel coords
        const leftX = tl.x;
        const rightX = tl.x + wPx;
        const topY = tl.y;
        const bottomY = tl.y + hPx;

        // midpoints
        const cx = tl.x + wPx / 2;
        const cy = tl.y + hPx / 2;

        return (
          <React.Fragment key={el.id}>
            {/* Main Ellipse */}
            <div
              onMouseDown={(e) => onEllipseMouseDown(e, el.id)}
              style={{
                position: "absolute",
                left: tl.x,
                top: tl.y,
                width: wPx,
                height: hPx,
                border: selected
                  ? "2px solid red"
                  : "2px solid rgba(255,0,0,0.6)",
                borderRadius: "50%",
                pointerEvents: "auto",
                cursor: "move",
                background: "transparent",
                boxSizing: "border-box",
                zIndex: 1,
              }}
            >
              {el.category && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    transform: "translate(-50%, -105%)",
                    background: "rgba(0,0,0,0.75)",
                    padding: "2px 6px",
                    color: "#fff",
                    borderRadius: "4px",
                    fontSize: "10px",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {el.category}
                </div>
              )}
            </div>

            {/* Handles */}
            {selected && (
              <>
                {/* NW */}
                <div
                  style={handleStyle(leftX, topY, "nwse-resize")}
                  onMouseDown={(e) => onHandleMouseDown(e, el.id, "nw")}
                />

                {/* N */}
                <div
                  style={handleStyle(cx, topY, "ns-resize")}
                  onMouseDown={(e) => onHandleMouseDown(e, el.id, "n")}
                />

                {/* NE */}
                <div
                  style={handleStyle(rightX, topY, "nesw-resize")}
                  onMouseDown={(e) => onHandleMouseDown(e, el.id, "ne")}
                />

                {/* E */}
                <div
                  style={handleStyle(rightX, cy, "ew-resize")}
                  onMouseDown={(e) => onHandleMouseDown(e, el.id, "e")}
                />

                {/* SE */}
                <div
                  style={handleStyle(rightX, bottomY, "nwse-resize")}
                  onMouseDown={(e) => onHandleMouseDown(e, el.id, "se")}
                />

                {/* S */}
                <div
                  style={handleStyle(cx, bottomY, "ns-resize")}
                  onMouseDown={(e) => onHandleMouseDown(e, el.id, "s")}
                />

                {/* SW */}
                <div
                  style={handleStyle(leftX, bottomY, "nesw-resize")}
                  onMouseDown={(e) => onHandleMouseDown(e, el.id, "sw")}
                />

                {/* W */}
                <div
                  style={handleStyle(leftX, cy, "ew-resize")}
                  onMouseDown={(e) => onHandleMouseDown(e, el.id, "w")}
                />
              </>
            )}
          </React.Fragment>
        );
      })}

      {draft && (() => {
        const left = Math.min(draft.x1, draft.x2);
        const top = Math.min(draft.y1, draft.y2);
        const w = Math.abs(draft.x2 - draft.x1);
        const h = Math.abs(draft.y2 - draft.y1);

        const tl = n2p({ x: left, y: top });
        const wPx = w * imgWidth;
        const hPx = h * imgHeight;
        
        

        return (
          <div
            style={{
              position: "absolute",
              left: tl.x,
              top: tl.y,
              width: wPx,
              height: hPx,
              border: "2px dashed red",
              borderRadius: "50%",
              background: "rgba(0,163,255,0.12)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        );
      })()}
    </>
  );
}
