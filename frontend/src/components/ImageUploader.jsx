// src/components/UploadImages.jsx
import React, { useState } from "react";
import { presignImages, completeImage } from "../services/ImageService";


export default function UploadImages({ datasetId= "68df99bdcb591284b307b13a", onDone }) {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSelect = (e) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
    setProgress({});
    setError("");
  };

  const putToS3 = (putUrl, headers, file, onProg) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", putUrl);
      Object.entries(headers || {}).forEach(([k, v]) =>
        xhr.setRequestHeader(k, v)
      );
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && onProg) {
          onProg(Math.round((ev.loaded / ev.total) * 100));
        }
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`S3 PUT ${xhr.status}`));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    });

  const startUpload = async () => {
    if (!files.length) return;
    setBusy(true);
    setError("");

    try {
      // 1) presign
      const presigned = await presignImages(datasetId, files);
      if (presigned.length !== files.length) {
        throw new Error("presigned length mismatch");
      }

      // 2) upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const item = presigned[i];

        // optional: quick client validation
        if (file.type && item.headers?.["Content-Type"] && file.type !== item.headers["Content-Type"]) {
          console.warn("Client/Server content-type mismatch", file.type, item.headers["Content-Type"]);
        }

        await putToS3(item.putUrl, item.headers, file, (pct) => {
          setProgress((p) => ({ ...p, [item.imageId]: pct }));
        });

        // 3) complete
        await completeImage(item.imageId, {
          // You can send checksum/width/height if you have them here.
          // checksum: "...", width: 0, height: 0
        });
      }

      setFiles([]);
      if (onDone) onDone(); // e.g. refresh the grid
    } catch (e) {
      console.error(e);
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={onSelect}
          disabled={busy}
        />
        <button
          onClick={startUpload}
          disabled={!files.length || busy}
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {busy ? "Uploading..." : "Upload"}
        </button>
      </div>

      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-1">
        {files.map((f, idx) => (
          <div key={idx} className="text-sm">
            {f.name}
          </div>
        ))}
        {Object.entries(progress).map(([id, pct]) => (
          <div key={id} className="text-xs">
            {id}: {pct}%
          </div>
        ))}
      </div>
    </div>
  );
}
