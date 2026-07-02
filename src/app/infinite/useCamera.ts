'use client';

import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';
import type { CameraState } from './types';

export function useCamera(containerRef: RefObject<HTMLDivElement | null>) {
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: 1 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchState = useRef<{
    startDistance: number;
    startZoom: number;
    startCameraX: number;
    startCameraY: number;
    worldX: number;
    worldY: number;
  } | null>(null);
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
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture?.(e.pointerId);

    if (activePointers.current.size >= 2) {
      const [first, second] = [...activePointers.current.values()];
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const distance = Math.hypot(dx, dy);

      setCamera((prev) => {
        pinchState.current = {
          startDistance: distance || 1,
          startZoom: prev.zoom,
          startCameraX: prev.x,
          startCameraY: prev.y,
          worldX: prev.x + centerX / prev.zoom,
          worldY: prev.y + centerY / prev.zoom,
        };
        return prev;
      });

      isDragging.current = false;
      vel.current = { x: 0, y: 0 };
      return;
    }

    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    vel.current = { x: 0, y: 0 };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size >= 2) {
      const [first, second] = [...activePointers.current.values()];
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const distance = Math.hypot(dx, dy);
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;

      if (pinchState.current) {
        const scale = distance / pinchState.current.startDistance;
        const nextZoom = pinchState.current.startZoom * scale;
        const clampedZoom = Math.max(0.2, Math.min(3, nextZoom));

        setCamera({
          x: pinchState.current.worldX - centerX / clampedZoom,
          y: pinchState.current.worldY - centerY / clampedZoom,
          zoom: clampedZoom,
        });
      }

      isDragging.current = false;
      vel.current = { x: 0, y: 0 };
      return;
    }

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

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    if (activePointers.current.size < 2) {
      pinchState.current = null;
    }

    if (activePointers.current.size === 1) {
      const [remainingPointer] = [...activePointers.current.values()];
      lastPos.current = { x: remainingPointer.x, y: remainingPointer.y };
      isDragging.current = true;
      vel.current = { x: 0, y: 0 };
      return;
    }

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
          const rect = el.getBoundingClientRect();
          const pointerX = e.clientX - rect.left;
          const pointerY = e.clientY - rect.top;
          const newZoom = Math.max(0.2, Math.min(3, prev.zoom - e.deltaY * 0.002));
          const worldX = prev.x + pointerX / prev.zoom;
          const worldY = prev.y + pointerY / prev.zoom;
          return {
            x: worldX - pointerX / newZoom,
            y: worldY - pointerY / newZoom,
            zoom: newZoom,
          };
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
    activePointers.current.clear();
    pinchState.current = null;
  }, []);

  const setPosition = useCallback((x: number, y: number) => {
    setCamera((prev) => ({ ...prev, x, y }));
    vel.current = { x: 0, y: 0 };
  }, []);

  return { camera, onPointerDown, onPointerMove, onPointerUp, resetCamera, setPosition };
}
