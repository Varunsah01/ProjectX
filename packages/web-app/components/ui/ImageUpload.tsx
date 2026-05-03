"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

interface ImageUploadProps {
  kind: "logo" | "signature";
  currentKey?: string;
  previewUrl?: string;
  onUploaded: (key: string) => void;
  label: string;
  maxSizeMB?: number;
}

export function ImageUpload({
  kind,
  currentKey,
  previewUrl,
  onUploaded,
  label,
  maxSizeMB = 2,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const displayUrl = localPreview || previewUrl;

  const handleFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File must be under ${maxSizeMB}MB`);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "png";
      const res = await apiFetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, contentType: file.type, ext }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get upload URL");
      }

      const { uploadUrl, key } = await res.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error("Failed to upload file");
      }

      setLocalPreview(URL.createObjectURL(file));
      onUploaded(key);
      toast.success(`${label} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setLocalPreview(null);
    onUploaded("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {displayUrl || currentKey ? (
        <div className="relative inline-block">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={label}
              className="h-20 max-w-[200px] rounded-lg border border-slate-200 object-contain bg-white p-1"
            />
          ) : (
            <div className="flex h-20 w-[200px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-400">
              Image saved (preview unavailable)
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white shadow hover:bg-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex h-20 w-[200px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-5 w-5" />
          <span className="text-xs">
            {uploading ? "Uploading..." : "Click to upload"}
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
