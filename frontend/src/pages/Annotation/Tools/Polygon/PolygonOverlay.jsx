import React from "react";

const HANDLE_SIZE = 6;

// bounding box style handles
function handleStyle(px, py) {
  return {
    position: "absolute",
    left: px,
    top: py,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    background: "#fff",
    border: "1px solid #000",
    transform: "translate(-50%, -50%)",
    cursor: "grab",
    pointerEvents: "auto",
    zIndex: 200,
  };
}

// red dot used during drawing
function redDot(px, py) {
  return {
    position: "absolute",
    left: px,
    top: py,
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "red",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
    zIndex: 180,
  };
}

function getCentroid(points) {
  let x = 0, y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

export default function PolygonOverlay({
  polygons,
  draft,
  selectedId,
  onVertexMouseDown,
  onPolygonMouseDown,
  onSelect,
  imgLeft,
  imgTop,
  imgWidth,
  imgHeight,
}) {
  if (!imgWidth || !imgHeight) return null;

  const n2p = (p) => ({
    x: imgLeft + p.x * imgWidth,
    y: imgTop + p.y * imgHeight,
  });

  return (
    <>
      {/* CATEGORY LABELS */}
      {polygons.map((poly) => {
        if (poly.points.length < 3) return null;

        const c = getCentroid(poly.points);
        const px = n2p(c);

        return (
          <div
            key={poly.id + "-label"}
            style={{
              position: "absolute",
              left: px.x,
              top: px.y - 12,
              transform: "translate(-50%, -100%)",
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "10px",
              pointerEvents: "none",
              zIndex: 150,
            }}
          >
            {poly.category}
          </div>
        );
      })}

      {/* ===== SHAPES ===== */}
      <svg
        style={{
          position: "absolute",
          left: imgLeft,
          top: imgTop,
          width: imgWidth,
          height: imgHeight,
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        {polygons.map((poly) => {
          const pts = poly.points.map((p) => {
            const px = n2p(p);
            return `${px.x - imgLeft},${px.y - imgTop}`;
          });

          return (
            <polygon
              key={poly.id}
              points={pts.join(" ")}
              fill="transparent"
              stroke="red"
              strokeWidth="1.5"
              strokeLinejoin="round"
              style={{ cursor: "move", pointerEvents: "auto" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onPolygonMouseDown(e, poly.id);
              }}
            />
          );
        })}

        {/* DRAFT LINE */}
        {draft.length > 0 && (
          <polyline
            points={draft
              .map((p) => {
                const px = n2p(p);
                return `${px.x - imgLeft},${px.y - imgTop}`;
              })
              .join(" ")}
            fill="none"
            stroke="red"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
        )}
      </svg>

      {/* RED DOTS (EVERY TAP) */}
      {draft.map((p, i) => {
        const px = n2p(p);
        return <div key={"draft-dot-" + i} style={redDot(px.x, px.y)} />;
      })}

      {polygons.map((poly) =>
        poly.points.map((p, i) => {
          const px = n2p(p);
          return <div key={poly.id + "-dot-" + i} style={redDot(px.x, px.y)} />;
        })
      )}

      {/* WHITE SQUARE HANDLES FOR SELECTED POLYGON (BOUNDING STYLE) */}
      {polygons.map((poly) => {
        if (poly.id !== selectedId) return null;

        return poly.points.map((p, i) => {
          const px = n2p(p);
          return (
            <div
              key={poly.id + "-handle-" + i}
              style={handleStyle(px.x, px.y)}
              onMouseDown={(e) => {
                e.stopPropagation();
                onVertexMouseDown(e, poly.id, i);
              }}
            />
          );
        });
      })}
    </>
  );
}
