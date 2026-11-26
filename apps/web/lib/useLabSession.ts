"use client";

import {
  type AnySimulationModel,
  LabSession,
  type LabSnapshot,
  type Params,
  type Results,
} from "@ise/science-engine";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLabSession = LabSession<any, Params, Results>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLabSnapshot = LabSnapshot<any, Params, Results>;

/**
 * Create one LabSession for the lifetime of the component and drive it with a
 * requestAnimationFrame loop that runs only while the simulation is playing.
 */
export function useLabSession(model: AnySimulationModel, params: Record<string, number | string | boolean>) {
  const [session] = useState<AnyLabSession>(() => new LabSession(model, { params }));

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      session.tick(dt);
      raf = session.getSnapshot().playback.playing ? requestAnimationFrame(loop) : 0;
      if (!raf) last = 0;
    };
    const sync = () => {
      if (session.getSnapshot().playback.playing && !raf) raf = requestAnimationFrame(loop);
    };
    const unsubscribe = session.subscribe(sync);
    sync();
    return () => {
      unsubscribe();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [session]);

  return session;
}

/** Subscribe to the full snapshot (re-renders on every change). */
export function useLabSnapshot(session: AnyLabSession): AnyLabSnapshot {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
}

/**
 * Subscribe to a derived slice; re-renders only when `isEqual` says it changed.
 * Use for panels that do not need 60 fps updates.
 */
export function useLabSelector<T>(
  session: AnyLabSession,
  selector: (snapshot: AnyLabSnapshot) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const cache = useRef<{ version: number; value: T } | null>(null);
  const getSelected = () => {
    const snapshot = session.getSnapshot();
    const cached = cache.current;
    if (cached && cached.version === snapshot.version) return cached.value;
    const next = selector(snapshot);
    if (cached && isEqual(cached.value, next)) {
      cache.current = { version: snapshot.version, value: cached.value };
      return cached.value;
    }
    cache.current = { version: snapshot.version, value: next };
    return next;
  };
  return useSyncExternalStore(session.subscribe, getSelected, getSelected);
}
