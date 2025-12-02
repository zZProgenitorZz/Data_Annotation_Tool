import React from "react";

export default function PencilOverlay({
  strokes,
  draft,
  selectedId,

  imgLeft,
  imgTop,
  imgWidth,
  imgHeight,
  onStrokeMouseDown,
}) {
  if (!imgWidth || !imgHeight) return null;

  const n2p = (p) => ({
    x: imgLeft + p.x * imgWidth,
    y: imgTop + p.y * imgHeight,
  });

  const getBounds = (pts) => {
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    pts.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });

    return { minX, minY, maxX, maxY };
  };

  const safeDraft = draft || [];
  const draftClosed =
    safeDraft.length >= 3 &&
    Math.hypot(
      safeDraft[0].x - safeDraft[safeDraft.length - 1].x,
      safeDraft[0].y - safeDraft[safeDraft.length - 1].y
    ) < 0.010;

  return (
    <>
      {/* Category labels (boven de stroke, zelfde als je had) */}
      {strokes.map((s) => {
        if (!s.closed || !s.points.length) return null;

        const b = getBounds(s.points);

        let rawX =
          imgLeft + (b.minX + (b.maxX - b.minX) / 2) * imgWidth;
        let rawY = imgTop + b.minY * imgHeight - 14;

        const labelWidth = 110;
        const half = labelWidth / 2;

        const minX = imgLeft + half + 4;
        const maxX = imgLeft + imgWidth - half - 4;

        let clampedX = Math.min(Math.max(rawX, minX), maxX);

        const topLimit = imgTop + 4;
        let clampedY = rawY;
        if (clampedY < topLimit) clampedY = topLimit;

        return (
          <div
            key={s.id + "-lbl"}
            style={{
              position: "absolute",
              left: clampedX,
              top: clampedY,
              transform: "translate(-50%,0)",
              padding: "2px 6px",
              background: "rgba(0,0,0,0.75)",
              color: "#f7f7f7ff",
              fontSize: "10px",
              borderRadius: "4px",
              userSelect: "none",
              pointerEvents: "none",
              zIndex: 10,
              width: `${labelWidth}px`,
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            {s.category}
          </div>
        );
      })}

      <svg
        style={{
          position: "absolute",
          left: imgLeft,
          top: imgTop,
          width: imgWidth,
          height: imgHeight,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {/* Final strokes */}
        {strokes.map((s) => {
          if (!s.points.length) return null;

          const pts = s.points
            .map((p) => {
              const px = n2p(p);
              return `${px.x - imgLeft},${px.y - imgTop}`;
            })
            .join(" ");

          const isSelected = selectedId === s.id;

          return (
            <g key={s.id}>
              {/* Witte outline als geselecteerd (zelfde effect als eerst) */}
                <polygon
                points={pts}
                fill="rgba(248, 0, 0, 0)"
                stroke={isSelected ? "rgb(255, 0, 0)" : "rgba(255, 0, 0, 0.6)"}
                strokeWidth="2"
                strokeLinejoin="round"
                style={{ cursor: "move", pointerEvents: "auto" }}
                onMouseDown={(e) => {
                  // selectie & drag wordt afgehandeld in de tool/AnnotationPage
                  onStrokeMouseDown(e, s.id);
                }}
              />
              

              
            </g>
          );
        })} 
        {/*"2px solid #ff0000ff"
         "2px solid rgba(255, 0, 0, 0.6)", */}

        {/* Draft (tijdens tekenen) */}
        {safeDraft.length > 1 &&
          (draftClosed ? (
            <polygon
              points={safeDraft
                .map((p) => {
                  const px = n2p(p);
                  return `${px.x - imgLeft},${px.y - imgTop}`;
                })
                .join(" ")}
              fill="rgba(0,163,255,0.18)"
              stroke="red"
              strokeWidth="2"
            />
          ) : (
            <polyline
              points={safeDraft
                .map((p) => {
                  const px = n2p(p);
                  return `${px.x - imgLeft},${px.y - imgTop}`;
                })
                .join(" ")}
              fill="none"
              stroke="red"
              strokeWidth="2"
            />
          ))}
      </svg>
    </>
  );
}
