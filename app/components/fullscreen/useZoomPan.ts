"use client";

import { useEffect, useRef, useState } from "react";

export function useZoomPan() {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastMovement = useRef({ x: 0, y: 0 });

  /* -----------------------------------------
        INERTIA
  ----------------------------------------- */
  const applyInertia = () => {
    let vx = velocity.current.x;
    let vy = velocity.current.y;
    let px = position.x;
    let py = position.y;

    const friction = 0.92;
    const minVel = 0.15;
    const limit = 500;

    const step = () => {
      vx *= friction;
      vy *= friction;

      if (Math.abs(vx) < minVel && Math.abs(vy) < minVel) return;

      px += vx;
      py += vy;

      px = Math.max(-limit, Math.min(limit, px));
      py = Math.max(-limit, Math.min(limit, py));

      setPosition({ x: px, y: py });

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  /* -----------------------------------------
        PAN HANDLER
  ----------------------------------------- */
  const handleMove = (x: number, y: number) => {
    if (!isPanning.current || scale <= 1) return;

    const dx = x - lastPos.current.x;
    const dy = y - lastPos.current.y;

    lastMovement.current = { x: dx, y: dy };

    setPosition((p) => ({
      x: p.x + dx,
      y: p.y + dy,
    }));

    lastPos.current = { x, y };
  };

  /* -----------------------------------------
        TOUCH MOVE (PINCH + PAN)
  ----------------------------------------- */
  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (lastTouchDistance) {
        const delta = (dist - lastTouchDistance) / 200;
        setScale((s) => Math.min(4, Math.max(1, s + delta)));
      }
      setLastTouchDistance(dist);
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      handleMove(t.clientX, t.clientY);
    }
  };

  /* -----------------------------------------
        WHEEL (ZOOM)
  ----------------------------------------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY / 600;
      setScale((s) => Math.min(4, Math.max(1, s + delta)));
    };

    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [scale]);

  return {
    scale,
    setScale,
    position,
    setPosition,
    lastTouchDistance,
    setLastTouchDistance,
    containerRef,
    imgRef,
    isPanning,
    lastPos,
    velocity,
    lastMovement,
    applyInertia,
    handleMove,
    handleTouchMove,
  };
}
