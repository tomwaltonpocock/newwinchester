"use client";
import { useState } from "react";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_DIMENSION = 1600;
const TARGET_BYTES = 1.5 * 1024 * 1024;

export type UploadedFile = { name: string; sizeBytes: number; ok: boolean; error?: string };

export function UploadDropzone({
  publicToken,
  consentShare,
  onChange,
}: {
  publicToken: string | null;
  consentShare: boolean;
  onChange: (files: UploadedFile[]) => void;
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (incoming: FileList | null) => {
    if (!incoming || !publicToken) return;
    setError(null);
    if (files.length + incoming.length > 2) {
      setError("Max 2 files per submission.");
      return;
    }
    setBusy(true);
    try {
      const next: UploadedFile[] = [...files];
      for (const f of Array.from(incoming)) {
        if (!ALLOWED.includes(f.type)) {
          next.push({ name: f.name, sizeBytes: f.size, ok: false, error: "Unsupported file type." });
          continue;
        }
        try {
          const compressed = await compress(f);
          const fd = new FormData();
          fd.set("publicToken", publicToken);
          fd.set("consentShare", String(consentShare));
          fd.set("file", compressed, compressed.name);
          const res = await fetch("/api/uploads", { method: "POST", body: fd });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            next.push({ name: f.name, sizeBytes: f.size, ok: false, error: (data.error as string) || "upload_failed" });
          } else {
            next.push({ name: f.name, sizeBytes: compressed.size, ok: true });
          }
        } catch (e) {
          next.push({ name: f.name, sizeBytes: f.size, ok: false, error: "compression_failed" });
        }
      }
      setFiles(next);
      onChange(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept={ALLOWED.join(",")}
        multiple
        disabled={busy || !publicToken}
        onChange={(e) => handleFiles(e.target.files)}
        className="block"
      />
      <p className="helper">JPEG, PNG, WebP. Max 2 files. Each compressed in your browser before upload.</p>
      {error && <p className="error">{error}</p>}
      {!publicToken && <p className="error">Submission token not ready — please go through the review first.</p>}
      {files.length > 0 && (
        <ul className="mt-3 text-sm">
          {files.map((f, i) => (
            <li key={i} className={f.ok ? "text-stone-700" : "text-red-700"}>
              {f.name} — {f.ok ? `${(f.sizeBytes / 1024).toFixed(0)} KB ✓` : `failed: ${f.error}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function compress(file: File): Promise<File> {
  const img = await loadImage(file);
  const { width, height } = scaleToBox(img.width, img.height, MAX_DIMENSION);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no ctx");
  ctx.drawImage(img, 0, 0, width, height);

  const targetType = file.type === "image/png" ? "image/jpeg" : file.type;
  let quality = 0.86;
  let blob = await canvasToBlob(canvas, targetType, quality);
  // Simple loop to reduce quality if oversize.
  while (blob.size > TARGET_BYTES && quality > 0.4) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, targetType, quality);
  }
  const ext = targetType === "image/png" ? "png" : targetType === "image/webp" ? "webp" : "jpg";
  const newName = file.name.replace(/\.[^.]+$/, "") + "." + ext;
  return new File([blob], newName, { type: targetType });
}

function scaleToBox(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const r = w > h ? max / w : max / h;
  return { width: Math.round(w * r), height: Math.round(h * r) };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob_failed"))),
      type,
      quality
    );
  });
}
