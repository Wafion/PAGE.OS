'use client';

import * as React from 'react';
import type { CameraState, WanderStats } from './types';
import { GRID_H, GRID_W, HERO_OFFSET, HERO_WIDTH } from './useChunks';

type UseWanderOptions = {
  enabled: boolean;
  paused: boolean;
  camera: CameraState;
  viewportW: number;
  viewportH: number;
  onCameraChange: (next: CameraState) => void;
};

type TargetPoint = {
  x: number;
  y: number;
  zoom: number;
  label: string;
  discoveryKey: string;
};

const WAYPOINT_LABELS = [
  'Following a quiet trail',
  'Hunting a fresh cluster',
  'Drifting toward a rare pocket',
  'Mapping the archive horizon',
  'Inspecting a bright corridor',
];

function randomFromSeed(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildTarget(camera: CameraState, viewportW: number, viewportH: number, step: number): TargetPoint {
  const currentChunkX = Math.round((camera.x - HERO_WIDTH * 0.25) / GRID_W);
  const currentChunkY = Math.round((camera.y - HERO_OFFSET) / GRID_H);
  const directionSeed = randomFromSeed(step * 2.17);
  const radiusSeed = randomFromSeed(step * 3.41);
  const zoomSeed = randomFromSeed(step * 5.83);
  const deltaX = Math.round((directionSeed * 2 - 1) * (1 + radiusSeed * 1.8));
  const deltaY = Math.round((randomFromSeed(step * 7.91) * 2 - 1) * (1 + radiusSeed * 1.4));

  const chunkX = currentChunkX + (deltaX === 0 ? 1 : deltaX);
  const chunkY = currentChunkY + deltaY;
  const chunkLeft = chunkX * GRID_W + (chunkX >= 0 ? HERO_WIDTH : 0);
  const chunkTop = HERO_OFFSET + chunkY * GRID_H;
  const interiorX = 120 + randomFromSeed(step * 11.13) * Math.max(200, GRID_W - 320);
  const interiorY = 80 + randomFromSeed(step * 13.31) * Math.max(240, GRID_H - 200);
  const zoom = clamp(0.92 + zoomSeed * 0.4, 0.85, 1.28);

  return {
    x: chunkLeft + interiorX - viewportW / (2 * zoom),
    y: chunkTop + interiorY - viewportH / (2 * zoom),
    zoom,
    label: WAYPOINT_LABELS[step % WAYPOINT_LABELS.length],
    discoveryKey: `${chunkX}:${chunkY}`,
  };
}

export function useWander({
  enabled,
  paused,
  camera,
  viewportW,
  viewportH,
  onCameraChange,
}: UseWanderOptions) {
  const [stats, setStats] = React.useState<WanderStats>({
    active: false,
    status: 'Manual control',
    discoveries: 0,
    streak: 0,
    waypointLabel: 'Idle',
  });

  const targetRef = React.useRef<TargetPoint | null>(null);
  const rafRef = React.useRef<number>();
  const visitedChunksRef = React.useRef(new Set<string>());
  const lastAtTargetRef = React.useRef(0);
  const stepRef = React.useRef(0);
  const arrivalHandledRef = React.useRef(false);

  React.useEffect(() => {
    if (!enabled) {
      targetRef.current = null;
      setStats((prev) => ({
        ...prev,
        active: false,
        status: 'Manual control',
        waypointLabel: 'Idle',
      }));
      return;
    }

    setStats((prev) => ({
      ...prev,
      active: !paused,
      status: paused ? 'Paused after user input' : 'Scanning for a route',
    }));
  }, [enabled, paused]);

  React.useEffect(() => {
    if (!enabled || paused || viewportW === 0 || viewportH === 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      if (!targetRef.current) {
        stepRef.current += 1;
        targetRef.current = buildTarget(camera, viewportW, viewportH, stepRef.current);
        setStats((prev) => ({
          ...prev,
          active: true,
          status: 'Cruising',
          waypointLabel: targetRef.current?.label ?? 'Exploring',
        }));
      }

      const target = targetRef.current;
      if (!target) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const dx = target.x - camera.x;
      const dy = target.y - camera.y;
      const dz = target.zoom - camera.zoom;
      const distance = Math.hypot(dx, dy);

      if (distance < 18 && Math.abs(dz) < 0.02) {
        const now = performance.now();
        if (!visitedChunksRef.current.has(target.discoveryKey)) {
          visitedChunksRef.current.add(target.discoveryKey);
          setStats((prev) => ({
            ...prev,
            discoveries: prev.discoveries + 1,
            streak: prev.streak + 1,
            status: 'Discovery logged',
          }));
          arrivalHandledRef.current = true;
        } else if (!arrivalHandledRef.current) {
          setStats((prev) => ({
            ...prev,
            streak: prev.streak + 1,
            status: 'Hovering on a signal',
          }));
          arrivalHandledRef.current = true;
        }

        if (!lastAtTargetRef.current) {
          lastAtTargetRef.current = now;
        }

        if (now - lastAtTargetRef.current > 1800) {
          lastAtTargetRef.current = 0;
          arrivalHandledRef.current = false;
          targetRef.current = null;
        }
      } else {
        lastAtTargetRef.current = 0;
        arrivalHandledRef.current = false;
        const ease = distance > 640 ? 0.018 : 0.032;
        onCameraChange({
          x: camera.x + dx * ease,
          y: camera.y + dy * ease,
          zoom: camera.zoom + dz * 0.025,
        });

        setStats((prev) => ({
          ...prev,
          active: true,
          status: distance > 900 ? 'Surveying new territory' : 'Closing in on a waypoint',
        }));
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [camera, enabled, onCameraChange, paused, viewportH, viewportW]);

  const resetProgress = React.useCallback(() => {
    visitedChunksRef.current.clear();
    targetRef.current = null;
    lastAtTargetRef.current = 0;
    stepRef.current = 0;
    arrivalHandledRef.current = false;
    setStats({
      active: enabled && !paused,
      status: enabled ? 'Scanning for a route' : 'Manual control',
      discoveries: 0,
      streak: 0,
      waypointLabel: enabled ? 'Recalibrating trail' : 'Idle',
    });
  }, [enabled, paused]);

  return { stats, resetProgress };
}
