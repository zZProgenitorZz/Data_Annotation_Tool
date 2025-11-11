// src/components/UploadImages.jsx
import React, { useState, useRef, useContext } from "react";
import { uploadImagesToS3 } from "../utils/uploadImagesToS3"; //  nieuwe helper import
import { uploadGuestImages } from "../services/ImageService";
import { AuthContext } from "./AuthContext";

// type is "file" of "folder"
export default function UploadImages({ datasetId, onDone, type = "both" }) {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const showFileButton = type === "file" || type === "both";
  const showFolderButton = type === "folder" || type === "both";

  const {authType, loading} = useContext(AuthContext)

  const onSelect = (e) => {
    if (!e.target.files) return;

    const allFiles = Array.from(e.target.files);
    const imageFiles = allFiles.filter((f) => f.type.startsWith("image/"));

    setFiles(imageFiles);
    setProgress({});
    setError("");
  };

  const startUpload = async () => {
    // Niks doen als auth nog aan het laden is
    if (loading) return;

    // Geen files → geen upload
    if (!files || files.length === 0) return;

    // Geen datasetId → fout melden
    if (!datasetId) {
      setError("Geen dataset geselecteerd om naar te uploaden.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (authType === "user") {
        await uploadImagesToS3({
          datasetId,
          files,
          onProgress: ({ imageId, pct }) => {
            setProgress((p) => ({ ...p, [imageId]: pct }));
          },
        });
      } else if (authType === "guest") {
        await uploadGuestImages(datasetId, files);
      }

      setFiles([]);
      if (onDone) onDone();
      
    } catch (e) {
      console.error(e);
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };


  // Overall progress
  const values = Object.values(progress);
  const overallProgress = files.length
    ? Math.round(values.reduce((sum, p) => sum + p, 0) / files.length)
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {/* Verborgen inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onSelect}
          disabled={busy}
          className="hidden"
        />

        <input
          ref={folderInputRef}
          type="file"
          multiple
          onChange={onSelect}
          disabled={busy}
          webkitdirectory="true"
          className="hidden"
        />

        {/* Knop voor losse bestanden */}
        {showFileButton && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="px-3 py-2 rounded bg-gray-800 text-white text-sm disabled:opacity-50"
          >
            Choose files
          </button>
        )}

        {/* Knop voor hele map */}
        {showFolderButton && (
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            disabled={busy}
            className="px-3 py-2 rounded bg-gray-700 text-white text-sm disabled:opacity-50"
          >
            Choose map
          </button>
        )}

        {/* Upload knop */}
        <button
          onClick={startUpload}
          disabled={!files.length || busy}
          className="px-3 py-2 rounded bg-black text-white text-sm disabled:opacity-50"
        >
          {busy
            ? "Uploading..."
            : `Upload${files.length ? ` (${files.length})` : ""}`}
        </button>
      </div>

      {/* Globale voortgangsbalk */}
      {busy && (
        <div className="w-full max-w-md">
          <div className="h-2 w-full bg-gray-200 rounded">
            <div
              className="h-2 bg-emerald-500 rounded transition-all"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {overallProgress}% completed
          </div>
        </div>
      )}

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="space-y-1">
        {files.map((f, idx) => (
          <div key={idx} className="text-sm">
            {f.webkitRelativePath || f.name}
          </div>
        ))}
      </div>
    </div>
  );
}
