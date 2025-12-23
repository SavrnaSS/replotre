"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export default function ZoomViewer({
  image,
  onClose,
}: {
  image: string;
  onClose: () => void;
}) {
  /* -----------------------------------------------------------
      STATE
  ------------------------------------------------------------ */
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: "50%", y: "50%" });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [viewerScale, setViewerScale] = useState(0.9); // open animation
  const [opacity, setOpacity] = useState(0);

  const [swipeOffset, setSwipeOffset] = useState(0);

  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastTouch = useRef(0);

  const MAX_ZOOM = 1.1; // 10% max zoom
  const MIN_ZOOM = 1;

  /* -----------------------------------------------------------
      OPEN ANIMATION
  ------------------------------------------------------------ */
  useEffect(() => {
    requestAnimationFrame(() => {
      setOpacity(1);
      setViewerScale(1);
    });
  }, []);

  /* -----------------------------------------------------------
      CLOSE ANIMATION
  ------------------------------------------------------------ */
  const animateClose = () => {
    setOpacity(0);
    setViewerScale(0.92);
    setTimeout(() => onClose(), 180);
  };

  /* -----------------------------------------------------------
      START DRAG
  ------------------------------------------------------------ */
  const start = (e: any) => {
    dragging.current = true;

    const point = e.touches ? e.touches[0] : e;
    lastPos.current = { x: point.clientX, y: point.clientY };
  };

  /* -----------------------------------------------------------
      DRAG / MOVE
  ------------------------------------------------------------ */
  const move = (e: any) => {
    if (!dragging.current) return;

    const point = e.touches ? e.touches[0] : e;

    const dx = point.clientX - lastPos.current.x;
    const dy = point.clientY - lastPos.current.y;

    lastPos.current = { x: point.clientX, y: point.clientY };

    // If zoomed out → use swipe to close
    if (scale <= 1.01) {
      setSwipeOffset((prev) => Math.min(prev + dy, 170));

      if (swipeOffset > 120) animateClose();
      return;
    }

    // If zoomed → pan
    setOffset((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  };

  /* -----------------------------------------------------------
      END DRAG — bounce back
  ------------------------------------------------------------ */
  const end = () => {
    dragging.current = false;
    if (swipeOffset > 0) setSwipeOffset(0);
  };

  /* -----------------------------------------------------------
      DOUBLE TAP ZOOM
  ------------------------------------------------------------ */
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTouch.current < 250) {
      setScale((prev) => (prev > 1 ? 1 : MAX_ZOOM));
      setOffset({ x: 0, y: 0 });
    }
    lastTouch.current = now;
  };

  /* -----------------------------------------------------------
      MOUSE WHEEL ZOOM
  ------------------------------------------------------------ */
  const wheelZoom = (e: any) => {
    e.preventDefault();
    let newScale = scale + (e.deltaY < 0 ? 0.04 : -0.04);
    newScale = Math.min(Math.max(newScale, MIN_ZOOM), MAX_ZOOM);
    setScale(newScale);
  };

  /* -----------------------------------------------------------
      RENDER
  ------------------------------------------------------------ */
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{
        background: `rgba(0,0,0,${opacity * 0.92})`,
        backdropFilter: "blur(18px)",
        transition: "background 0.25s ease",
      }}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchEnd={end}
    >
      {/* CLOSE BUTTON */}
      <button
        onClick={animateClose}
        className="
          absolute top-7 right-7 z-[999999]
          bg-white/15 backdrop-blur-xl
          hover:bg-white/25 transition
          p-3 rounded-full text-white
        "
      >
        <X size={22} />
      </button>

      {/* IG SWIPE INDICATOR */}
      <div
        className="
          absolute top-4 left-1/2 -translate-x-1/2
          w-16 h-1.5 
          bg-white/40 rounded-full
          opacity-0 animate-fadeInSlow
        "
      />

      {/* VIEWER FRAME (IG PORTRAIT) */}
      <div
        className="relative overflow-hidden rounded-xl shadow-2xl bg-black"
        style={{
          width: "min(90vw, 420px)",
          height: "calc(min(90vw, 420px) * 1.25)", // IG aspect 4:5
          transform: `translateY(${swipeOffset}px) scale(${viewerScale})`,
          transition: dragging.current
            ? "none"
            : "transform 0.32s cubic-bezier(0.22,1,0.36,1)",
        }}
        onWheel={wheelZoom}
        onTouchStart={start}
        onTouchMove={move}
        onMouseDown={start}
        onMouseMove={move}
        onDoubleClick={handleDoubleTap}
      >
        {/* IMAGE */}
        <img
          src={image}
          className="w-full h-full object-cover rounded-xl select-none"
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: `${origin.x} ${origin.y}`,
            transition: dragging.current ? "none" : "transform 0.1s linear",
          }}
          onClick={handleDoubleTap}
        />
      </div>
    </div>
  );
}
