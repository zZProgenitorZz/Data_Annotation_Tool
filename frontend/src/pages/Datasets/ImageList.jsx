import React, { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { listImages } from "../../services/ImageService";
import UploadImages from "../../components/ImageUploader.jsx";
import Header from "../../components/Header.jsx";
import { AuthContext } from "../../components/AuthContext.jsx";
import { getImageAnnotation } from "../../services/annotationService.js";

const ImageList = () => {
  const [imageList, setImageList] = useState([]);
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [annotations, setAnnotations] = useState({});
  const { currentUser } = useContext(AuthContext);

  const navigate = useNavigate();

  const handleOpenAnnotationPage = (imageId) => {
    if (!dataset) return;

    const key = `selectedImage:${dataset.id}`;
    localStorage.setItem(key, imageId);
    navigate("/annotation");
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("selectedDataset");
      if (stored) setDataset(JSON.parse(stored));
    } catch (err) {
      console.error("Bad selectedDataset in localStorage", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchImages = async () => {
    if (!dataset) return;
    try {
      const result = await listImages(dataset.id);
      setImageList(result || []);
    } catch (err) {
      console.error("Failed to fetch images:", err);
    }
  };

  const fetchAnnotations = async () => {
    if (!imageList || imageList.length === 0) return;

    const allAnnotation = {};
    for (const image of imageList) {
      try {
        const result = await getImageAnnotation(image.id);
        allAnnotation[image.id] = result;
      } catch (err) {
        console.error("Failed to fetch annotation for image", image.id, err);
      }
    }
    setAnnotations(allAnnotation);
  };

  useEffect(() => {
    if (!dataset) return;
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset]);

  useEffect(() => {
    if (!imageList) return;
    fetchAnnotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageList]);

  const handleUploaded = async () => {
    await fetchImages();
  };

  const activeImages = useMemo(
    () => (imageList || []).filter((img) => img?.is_active),
    [imageList]
  );
  const activeCount = activeImages.length;

  const PAD_LEFT = 72;
  const PAD_RIGHT = 48;
  const RIGHT_COL_W = 220;

  const TABLE_MAX_H = "calc(100vh - 200px)";

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-[#44F3C9] to-[#3F7790] overflow-hidden">
      <Header
        title={dataset ? `List of ${dataset.name} Images` : "List of Images"}
        currentUser={currentUser}
      />

      <style>{`
        .aidx-upload-theme input[type="file"]{
          font-size: 14px;
          color: rgba(0,0,0,0.75);
        }
        .aidx-upload-theme input[type="file"]::file-selector-button{
          height: 34px;
          padding: 0 14px;
          border-radius: 9999px;
          border: 1px solid rgba(0,0,0,0.14);
          background: rgba(255,255,255,0.4);
          color: rgba(0,0,0,0.78);
          font-weight: 600;
          cursor: pointer;
          transition: background .15s, border-color .15s, transform .15s;
        }
        .aidx-upload-theme input[type="file"]::file-selector-button:hover{
          background: rgba(255,255,255,0.4);
          border-color: rgba(0,0,0,0.22);
          transform: translateY(-1px);
        }
        .aidx-upload-theme input[type="file"]::file-selector-button:active{
          transform: translateY(0px);
        }
        .aidx-upload-theme button{
          height: 34px;
          padding: 0 14px;
          border-radius: 9999px;
          border: 1px solid rgba(0,0,0,0.14);
          background: rgba(255,255,255,0.4);
          color: rgba(0,0,0,0.78);
          font-weight: 600;
          cursor: pointer;
          transition: background .15s, border-color .15s, transform .15s, opacity .15s;
        }
        .aidx-upload-theme button:hover{
          background: rgba(255,255,255,0.4);
          border-color: rgba(0,0,0,0.22);
          transform: translateY(-1px);
        }
        .aidx-upload-theme button:active{
          transform: translateY(0px);
        }
        .aidx-upload-theme button:disabled{
          opacity: .45;
          cursor: not-allowed;
          transform: translateY(0px);
        }

        .aidx-row{ position: relative; }
        .aidx-row::before{
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(63, 119, 144, 0);
          transition: background .12s;
          pointer-events: none;
        }
        .aidx-row:hover::before{
          background: rgba(63, 119, 144, 0.14);
        }

        .aidx-table{
          max-height: ${TABLE_MAX_H};
        }
        .aidx-table-body{
          overflow-y: auto;
          overflow-x: hidden;
        }
      `}</style>

      <div className="flex-1 overflow-hidden px-[40px] pt-[24px] datasets-scroll">
        <div className="flex items-center justify-center aidx-upload-theme">
          <UploadImages datasetId={dataset?.id} onDone={handleUploaded} type={"file"} />
        </div>

        <div className="h-[16px]" />

        <div className="flex justify-center">
          <div
            className="aidx-table flex flex-col overflow-hidden"
            style={{
              width: "min(95vw, 1500px)",
              backgroundColor: "rgba(229, 249, 247, 0.9)",
              border: "1px solid #B3DCD7",
              borderRadius: "14px",
            }}
          >
            <div
              className="relative grid items-center flex-shrink-0"
              style={{
                height: "44px",
                backgroundColor: "rgba(143, 221, 212, 0.55)",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                gridTemplateColumns: `minmax(0, 1fr) ${RIGHT_COL_W}px`,
              }}
            >
              <div style={{ paddingLeft: `${PAD_LEFT}px` }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "15px",
                    color: "rgba(0,0,0,0.78)",
                    cursor: "default",
                    userSelect: "none",
                  }}
                >
                  File names
                </span>
              </div>

              <div
                style={{ paddingRight: `${PAD_RIGHT}px` }}
                className="flex items-center justify-center"
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "15px",
                    color: "rgba(0,0,0,0.78)",
                    cursor: "default",
                    userSelect: "none",
                  }}
                >
                  Annotated
                </span>
              </div>

              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{ pointerEvents: "none" }}
              >
                <div
                  className="h-[26px] px-[12px] inline-flex items-center rounded-full border"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.22)",
                    borderColor: "rgba(0,0,0,0.12)",
                    color: "rgba(0,0,0,0.70)",
                    fontSize: "15px",
                    fontWeight: 700,
                  }}
                  title="Total active images"
                >
                  {loading ? "Total Images: ..." : `Total Images: ${activeCount}`}
                </div>
              </div>
            </div>

            <div className="aidx-table-body flex-1 min-h-0">
              <ul className="list-none" style={{ margin: 0, padding: 0 }}>
                {activeImages.map((img, idx) => {
                  const key = img.id ?? img._id ?? idx;
                  const fileName = img.fileName ?? img.originalFilename ?? "(no name)";
                  const annotation = annotations?.[img.id];
                  const annotated = annotation?.annotations?.length > 0;

                  return (
                    <li
                      key={key}
                      className="aidx-row grid items-center w-full"
                      style={{
                        gridTemplateColumns: `minmax(0, 1fr) ${RIGHT_COL_W}px`,
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                        backgroundColor: "rgba(255,255,255,0.10)",
                      }}
                    >
                      {/* change here: make the button fill the whole row height */}
                      <div className="min-w-0" style={{ paddingLeft: `${PAD_LEFT}px` }}>
                        <button
                          type="button"
                          onClick={() => handleOpenAnnotationPage(img.id)}
                          className="block w-full text-left truncate transition"
                          style={{
                            border: "none",
                            background: "transparent",
                            outline: "none",
                            boxShadow: "none",
                            margin: "0px",
                            appearance: "none",
                            WebkitAppearance: "none",

                            position: "relative",
                            zIndex: 1,

                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            paddingTop: "14px",
                            paddingBottom: "14px",

                            color: "rgba(0,0,0,0.78)",
                            fontSize: "15px",
                            fontWeight: 650,
                            cursor: "pointer",
                            textDecoration: "none",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "rgba(0,0,0,0.92)";
                            e.currentTarget.style.textDecoration = "underline";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "rgba(0,0,0,0.78)";
                            e.currentTarget.style.textDecoration = "none";
                          }}
                          title={fileName}
                          aria-label={`Open ${fileName}`}
                        >
                          {fileName}
                        </button>
                      </div>

                      <div
                        className="py-[14px] flex items-center justify-center"
                        style={{
                          paddingRight: `${PAD_RIGHT}px`,
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        <span
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "9999px",
                            backgroundColor: annotated ? "#22c55e" : "rgba(0,0,0,0.22)",
                            border: "2px solid rgba(0,0,0,0.10)",
                          }}
                          title={annotated ? "Annotated" : "Not annotated"}
                          aria-label={annotated ? "Annotated" : "Not annotated"}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div
              className="flex-shrink-0"
              style={{
                height: "10px",
                backgroundColor: "rgba(179, 220, 215, 0.22)",
                borderTop: "1px solid rgba(0,0,0,0.05)",
              }}
            />
          </div>
        </div>

        <div className="h-[24px]" />
      </div>
    </div>
  );
};

export default ImageList;
