"use client";
import { useRef, useState, useEffect } from "react";

export default function WebcamCapture({ onCapture, onClose }: any) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => setError(err.message));

    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const capture = () => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const data = canvas.toDataURL("image/png");

    onCapture(data);
    onClose();
  };

  return (
    <div className="space-y-3">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <video ref={videoRef} autoPlay className="rounded-lg w-full" />
      <canvas ref={canvasRef} className="hidden"></canvas>

      <button onClick={capture} className="w-full py-2 bg-green-600 text-white rounded-xl">Capture</button>
      <button onClick={onClose} className="w-full py-2 bg-gray-200 text-black rounded-xl">Cancel</button>
    </div>
  );
}
