"use client";
import React from "react";

export default function SimpleModal({ open, onClose, title, children }: any) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-xl p-6 z-10 max-w-md w-full shadow-xl">
        <div className="flex justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 text-xl">×</button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
