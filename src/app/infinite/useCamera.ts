'use client';

import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';
import type { CameraState } from './types';

export function useCamera(containerRef: RefObject<HTMLDivElement | null>) {
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: 1 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const keysDown = useRef(new Set<string>());
  const animFrame = useRef<number>();

  // ── unified animation loop (inertia + keyboard) ──
  useEffect(() => {
    const decay = 0.93;
    const threshold = 0.5;
    const speed = 8;

    function tick() {
      const keys = keysDown.current;
      let kvx = 0, kvy = 0;
      if (keys.has('arrowleft') || keys.has('a')) kvx -= speed;
      if (keys.has('arrowright') || keys.has('d')) kvx += speed;
      if (keys.has('arrowup') || keys.has('w')) kvy -= speed;
      if (keys.has('arrowdown') || keys.has('s')) kvy += speed;

      const hasKB = kvx !== 0 || kvy !== 0;

      if (hasKB) {
        vel.current.x = kvx;
        vel.current.y = kvy;
      } else if (!isDragging.current) {
        vel.current.x *= decay;
        vel.current.y *= decay;
        if (Math.abs(vel.current.x) < threshold) vel.current.x = 0;
        if (Math.abs(vel.current.y) < threshold) vel.current.y = 0;
      }

      if (!isDragging.current && (vel.current.x !== 0 || vel.current.y !== 0)) {
        setCamera((prev) => ({
          ...prev,
          x: prev.x - vel.current.x,
          y: prev.y - vel.current.y,
        }));
      }

      animFrame.current = requestAnimationFrame(tick);
    }

    animFrame.current = requestAnimationFrame(tick);
    return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current); };
  }, []);

  // ── keyboard listeners ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
        e.preventDefault();
        keysDown.current.add(k);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ── pointer handlers ──
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    vel.current = { x: 0, y: 0 };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    vel.current = { x: dx, y: dy };
    setCamera((prev) => ({
      ...prev,
      x: prev.x - dx / prev.zoom,
      y: prev.y - dy / prev.zoom,
    }));
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ── native wheel (passive:false) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setCamera((prev) => {
        if (e.ctrlKey || e.metaKey) {
          const newZoom = Math.max(0.2, Math.min(3, prev.zoom - e.deltaY * 0.002));
          return { ...prev, zoom: newZoom };
        }
        return {
          ...prev,
          x: prev.x + e.deltaX * 0.5,
          y: prev.y + e.deltaY * 0.5,
        };
      });
    };

    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [containerRef]);

  const resetCamera = useCallback(() => {
    setCamera({ x: 0, y: 0, zoom: 1 });
    vel.current = { x: 0, y: 0 };
  }, []);

  const setPosition = useCallback((x: number, y: number) => {
    setCamera((prev) => ({ ...prev, x, y }));
    vel.current = { x: 0, y: 0 };
  }, []);

  return { camera, onPointerDown, onPointerMove, onPointerUp, resetCamera, setPosition };
}