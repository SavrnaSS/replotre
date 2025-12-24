"use client";

import { useCallback, useMemo, useRef, useState } from "react";

type Props = {
  onDrop?: (files: File[]) => void;
  preview?: string;
  accept?: string; // optional: "image/*"
  maxSizeMB?: number; // optional: default 10
};

export default function DropzoneUploader({
  onDrop,
  preview,
  accept = "image/*",
  maxSizeMB = 10,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const maxBytes = useMemo(() => maxSizeMB * 1024 * 1024, [maxSizeMB]);

  const pick = () => inputRef.current?.click();

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      setLocalError(null);
      if (!fileList || fileList.length === 0) return;

      const files = Array.from(fileList);

      // size guard (keeps your logic safe)
      const tooBig = files.find((f) => f.size > maxBytes);
      if (tooBig) {
        setLocalError(`File too large. Max ${maxSizeMB}MB allowed.`);
        return;
      }

      onDrop?.(files);
    },
    [onDrop, maxBytes, maxSizeMB]
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // allow re-selecting the same file
    e.target.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDropInternal = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={false}
        className="hidden"
        onChange={onChange}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={pick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pick();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDropInternal}
        className={[
          "rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl",
          "p-4 sm:p-6 transition cursor-pointer select-none",
          isDragging ? "ring-2 ring-purple-500/40 border-white/20" : "hover:border-white/20",
        ].join(" ")}
      >
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-lg">⬆️</span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-semibold text-white">
              Upload a photo
            </p>
            <p className="text-xs sm:text-sm text-white/60 mt-1">
              Drag & drop or click to choose. (Max {maxSizeMB}MB)
            </p>

            {localError && (
              <p className="text-xs text-red-300 mt-2">{localError}</p>
            )}
          </div>

          {preview ? (
            <div className="h-16 w-16 rounded-2xl overflow-hidden border border-white/10 bg-black/30 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
