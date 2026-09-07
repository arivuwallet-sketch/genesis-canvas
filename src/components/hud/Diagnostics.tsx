import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import tunnel from "tunnel-rat";
import { useEditorStore } from "../../store/useEditorStore";

/** tunnel-rat channel: rendered inside the Canvas, displayed in the DOM HUD. */
export const hudTunnel = tunnel();

interface PerfMemory {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

function readMemoryMB(): number | null {
  const mem = (performance as Performance & { memory?: PerfMemory }).memory;
  return mem ? Math.round(mem.usedJSHeapSize / 1048576) : null;
}

/**
 * Samples renderer + runtime metrics inside the Canvas and pipes them to the
 * DOM overlay through tunnel-rat (twice a second — never per frame).
 */
export function DiagnosticsProbe() {
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const last = useRef(performance.now());
  const [stats, setStats] = useState({ fps: 0, calls: 0, tris: 0, mem: readMemoryMB() });

  const entities = useEditorStore((s) => s.spawnedObjects.length);
  const network = useEditorStore((s) => s.network);

  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    const elapsed = now - last.current;
    if (elapsed < 500) return;
    setStats({
      fps: Math.round((frames.current * 1000) / elapsed),
      calls: gl.info.render.calls,
      tris: gl.info.render.triangles,
      mem: readMemoryMB(),
    });
    frames.current = 0;
    last.current = now;
  });

  const netLabel =
    network.status === "connected"
      ? "online"
      : network.status === "simulated"
        ? "simulated"
        : network.status;

  const row = "flex items-center justify-between gap-6";

  return (
    <hudTunnel.In>
      <div className="glass-panel pointer-events-none absolute bottom-32 right-5 w-52 rounded-xl px-3 py-2.5 font-mono text-[10px] text-foreground/75">
        <p className="mb-1.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Diagnostics
        </p>
        <div className={row}>
          <span>fps</span>
          <span className="text-primary">{stats.fps}</span>
        </div>
        <div className={row}>
          <span>ping</span>
          <span className="text-primary">
            {network.status === "offline" ? "—" : `${network.ping} ms`}
          </span>
        </div>
        <div className={row}>
          <span>net</span>
          <span className="text-primary">{netLabel}</span>
        </div>
        <div className={row}>
          <span>peers</span>
          <span className="text-primary">{network.peers}</span>
        </div>
        <div className={row}>
          <span>entities</span>
          <span className="text-primary">{entities}</span>
        </div>
        <div className={row}>
          <span>draw calls</span>
          <span className="text-primary">{stats.calls}</span>
        </div>
        <div className={row}>
          <span>tris</span>
          <span className="text-primary">{stats.tris.toLocaleString()}</span>
        </div>
        <div className={row}>
          <span>memory</span>
          <span className="text-primary">
            {stats.mem === null ? "n/a" : `${stats.mem} MB`}
          </span>
        </div>
      </div>
    </hudTunnel.In>
  );
}
