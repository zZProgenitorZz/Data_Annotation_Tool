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
    cursor: cursor || "nwse-resize",
    pointerEvents: "auto",
    zIndex: 250,
  };
}

export default function MagicWandOverlay({
  regions,
  selectedId,
  onVertexMouseDown,
  onRegionMouseDown,
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

  const getCentroid = (pts) => {
    let x = 0,
      y = 0;
    for (const p of pts) {
      x += p.x;
      y += p.y;
    }
    return { x: x / pts.length, y: y / pts.length };
  };

  const getHandleCursor = (centroidNorm, vertexNorm) => {
    const cPx = n2p(centroidNorm);
    const vPx = n2p(vertexNorm);

    const dx = vPx.x - cPx.x;
    const dy = vPx.y - cPx.y;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const RATIO = 1.5;

    if (absX > absY * RATIO) return "ew-resize";
    if (absY > absX * RATIO) return "ns-resize";

    if ((dx >= 0 && dy >= 0) || (dx <= 0 && dy <= 0)) {
      return "nwse-resize";
    }
    return "nesw-resize";
  };

  return (
    <>
      {/* Labels */}
      {regions.map((r) => {
        if (!r.points || r.points.length < 3) return null;

        const c = getCentroid(r.points);
        const px = n2p(c);

        return (
          <div
            key={r.id + "-label"}
            style={{
              position: "absolute",
              left: px.x,
              top: px.y - 14,
              transform: "translate(-50%, -100%)",
              background: "rgba(0,0,0,0.7)",
              color: "#fff",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "10px",
              pointerEvents: "none",
              zIndex: 190,
              whiteSpace: "nowrap",
            }}
          >
            {r.category}
          </div>
        );
      })}

      {/* Polygons */}
      <svg
        style={{
          position: "absolute",
          left: imgLeft,
          top: imgTop,
          width: imgWidth,
          height: imgHeight,
          zIndex: 120,
          pointerEvents: "none",
        }}
      >
        <g style={{ pointerEvents: "auto" }}>
          {regions.map((r) => {
            if (!r.points || r.points.length < 3) return null;

            const pts = r.points.map((p) => {
              const px = n2p(p);
              return `${px.x - imgLeft},${px.y - imgTop}`;
            });

            const isSelected = selectedId === r.id;

            return (
              <polygon
                key={r.id}
                points={pts.join(" ")}
                fill={
                  isSelected
                    ? "rgba(255,0,0,0.28)" // geselecteerd = gevuld
                    : "transparent" // niet geselecteerd = alleen rand
                }
                stroke="red"
                strokeWidth={isSelected ? 2 : 1.2}
                style={{ cursor: "move" }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  // selectie + drag wordt afgehandeld in de tool/AnnotationPage
                  onRegionMouseDown(e, r.id);
                }}
              />
            );
          })}
        </g>
      </svg>

      {/* Handles (alleen bij geselecteerde regio) */}
      {regions.map((r) => {
        const isSelected = selectedId === r.id;
        if (!isSelected) return null;
        if (!r.points || r.points.length === 0) return null;

        const centroidNorm = getCentroid(r.points);

        return r.points.map((p, i) => {
          const px = n2p(p);
          const cursor = getHandleCursor(centroidNorm, p);

          return (
            <div
              key={r.id + "-handle-" + i}
              style={handleStyle(px.x, px.y, cursor)}
              onMouseDown={(e) => {
                e.stopPropagation();
                // vertex-drag wordt afgehandeld in de tool
                onVertexMouseDown(e, r.id, i);
              }}
            />
          );
        });
      })}
    </>
  );
}
