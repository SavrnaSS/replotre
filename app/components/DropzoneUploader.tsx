"use client";
import Dropzone from "react-dropzone";

export default function DropzoneUploader({ onDrop, preview }: any) {
  return (
    <Dropzone onDrop={onDrop} accept={{ "image/*": [] }}>
      {({ getRootProps, getInputProps }) => (
        <div
          {...getRootProps()}
          className="border-2 border-white/20 bg-white/5 backdrop-blur-xl rounded-xl p-4 h-56 flex items-center justify-center cursor-pointer hover:bg-white/10 transition"
        >
          <input {...getInputProps()} />
          {preview ? (
            <img src={preview} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <p className="text-white/70 text-sm">Click or drop image</p>
          )}
        </div>
      )}
    </Dropzone>
  );
}
