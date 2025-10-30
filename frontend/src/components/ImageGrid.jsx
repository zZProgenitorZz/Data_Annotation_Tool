// src/components/ImageGrid.jsx
import React, { useEffect, useState } from "react";
import { listImages, getSignedUrl } from "../services/ImageService";

export default function ImageGrid({ datasetId= "68df99bdcb591284b307b13a" }) {
  const [items, setItems] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        // 1) get metadata list
        const list = await listImages(datasetId);
        if (cancelled) return;
        setItems(list);


        // 2) lazily fetch signed URLs (parallel)
        const pairs = await Promise.all(
          list.map(async (img) => {
            try {
              const { url } = await getSignedUrl(img.id);
              return [img.id, url];
            } catch {
              return [img.id, null];
            }
          })
        );
        if (cancelled) return;
        setUrls(Object.fromEntries(pairs));
      } catch (e) {
        if (!cancelled) setErr(String(e.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  if (loading) {
    return <div className="text-sm text-gray-600">Loading images…</div>;
  }
  if (err) {
    return <div className="text-sm text-red-600">Error: {err}</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {items.map((img) => (
        <figure key={img.id} className="rounded shadow p-2 bg-white">
          {urls[img.id] ? (
            <img
              src={urls[img.id]}
              alt={img.fileName}
              className="w-full h-40 object-cover rounded"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-40 bg-gray-100 animate-pulse rounded" />
          )}
          <figcaption className="mt-2 text-xs truncate">
            {img.fileName}
          </figcaption>
        </figure>
      ))}
      {!items.length && (
        <div className="text-gray-500 text-sm col-span-full">
          No images yet.
        </div>
      )}
    </div>
  );
}
