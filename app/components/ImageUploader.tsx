"use client";

import { useRef } from "react";

export default function ImageUploader({ image, setImage }: any) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage({ file, preview: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => fileRef.current?.click()}
        className="w-full h-56 bg-[#111] border border-white/10 rounded-xl flex items-center justify-center cursor-pointer relative overflow-hidden"
      >
        {image?.preview ? (
          <img
            src={image.preview}
            alt="preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <p className="text-white/40">Click to upload photo</p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleSelect}
        className="hidden"
      />
    </div>
  );
}
