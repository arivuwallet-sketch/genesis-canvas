import { Film, Pause, Play, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { theatreSheet } from "../../lib/theatre";
import { useGameConfigStore, type CutsceneData } from "../../store/useGameConfigStore";
import { CinematicsStudioGate } from "./CinematicsStudioGate";

const DEFAULT_CUTSCENE: CutsceneData = {
  title: "Genesis Opening Shot",
  duration: 8,
  cameraPath: [
    { time: 0, position: [0, 5, 14], lookAt: [0, 1, 0] },
    { time: 3, position: [6, 4, 8], lookAt: [0, 1.5, -2] },
    { time: 6, position: [2, 3, 5], lookAt: [0, 1.2, -5] },
    { time: 8, position: [-2, 2.5, 3], lookAt: [0, 1, -6] },
  ],
  lookAtTargets: [
    { time: 0, target: [0, 1, 0] },
    { time: 4, target: [0, 1.5, -2] },
    { time: 8, target: [0, 1, -6] },
  ],
  subtitles: [
    { time: 0.5, duration: 2.8, text: "The world wakes before the player does." },
    { time: 4.1, duration: 2.2, text: "Every scene is a possibility." },
  ],
};

function markerLeft(time: number, duration: number) {
  return { left: `${Math.max(0, Math.min(100, (time / Math.max(0.1, duration)) * 100))}%` };
}

function TimelineRow({
  label,
  colorClass,
  duration,
  markers,
  cursor,
  onSeek,
}: {
  label: string;
  colorClass: string;
  duration: number;
  markers: Array<{ time: number; label?: string }>;
  cursor: number;
  onSeek: (time: number) => void;
}) {
  return (
    <div className="grid grid-cols-[92px_1fr] items-center gap-3">
      <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <div
        className="relative h-7 cursor-pointer rounded-md border border-border/50 bg-background/50"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const next = ((event.clientX - rect.left) / rect.width) * duration;
          onSeek(Math.max(0, Math.min(duration, next)));
        }}
      >
        <div className="absolute inset-y-0 left-0 right-0 opacity-20">
          {Array.from({ length: Math.ceil(duration) + 1 }, (_, index) => (
            <span
              key={index}
              className="absolute inset-y-0 w-px bg-border"
              style={{ left: `${(index / Math.max(0.1, duration)) * 100}%` }}
            />
          ))}
        </div>
        {markers.map((marker, index) => (
          <button
            key={`${marker.time}-${index}`}
            type="button"
            title={marker.label ? `${marker.label} · ${marker.time.toFixed(2)}s` : `${marker.time.toFixed(2)}s`}
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ${colorClass} shadow-lg`}
            style={markerLeft(marker.time, duration)}
            onClick={(event) => {
              event.stopPropagation();
              onSeek(marker.time);
            }}
          />
        ))}
        <span
          className="absolute inset-y-0 z-10 w-px bg-primary shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
          style={markerLeft(cursor, duration)}
        />
      </div>
    </div>
  );
}

function subtitleAt(data: CutsceneData, time: number) {
  const active = data.subtitles.find(
    (subtitle) => time >= subtitle.time && time <= subtitle.time + subtitle.duration,
  );
  return active?.text ?? "";
}

export function CinematicsPanel() {
  const open = useGameConfigStore((state) => state.cinematicsOpen);
  const data = useGameConfigStore((state) => state.cutsceneData);
  const setOpen = useGameConfigStore((state) => state.setCinematicsOpen);
  const setData = useGameConfigStore((state) => state.setCutsceneData);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (!open) setPlaying(false);
  }, [open]);

  useEffect(() => {
    if (!playing || !data) return;

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      const next = Math.min(data.duration, theatreSheet.sequence.position + delta);
      theatreSheet.sequence.position = next;
      setCursor(next);
      if (next >= data.duration) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, data]);

  useEffect(() => {
    setCursor(0);
    theatreSheet.sequence.position = 0;
  }, [data?.title, data?.duration]);

  if (!open) return null;

  const cutscene = data ?? DEFAULT_CUTSCENE;

  const seek = (time: number) => {
    const next = Math.max(0, Math.min(cutscene.duration, time));
    theatreSheet.sequence.position = next;
    setCursor(next);
  };

  const loadDefault = () => {
    setData(DEFAULT_CUTSCENE);
    setCursor(0);
  };

  return (
    <>
      <CinematicsStudioGate active={open} />
      <section className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-primary/15 bg-card/90 px-4 pb-4 pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                <Film className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-[0.2em] text-primary">Cinematics · Theatre.js</p>
                <p className="truncate text-xs text-foreground/80">
                  {data?.title ?? "Waiting for AI cutscene data"} · {cutscene.duration.toFixed(1)}s
                </p>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Studio is loaded only while this mode is active
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!data && (
                <button
                  type="button"
                  onClick={loadDefault}
                  className="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Demo shot
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setPlaying((value) => !value);
                  if (theatreSheet.sequence.position >= cutscene.duration) seek(0);
                }}
                className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary"
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                {playing ? "Pause" : "Preview"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border/60 p-2 text-muted-foreground hover:text-foreground"
                aria-label="Close cinematics"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <TimelineRow
              label="Camera Path"
              colorClass="bg-primary"
              duration={cutscene.duration}
              cursor={cursor}
              markers={cutscene.cameraPath.map((key) => ({ time: key.time }))}
              onSeek={seek}
            />
            <TimelineRow
              label="Look-at"
              colorClass="bg-sky-300"
              duration={cutscene.duration}
              cursor={cursor}
              markers={cutscene.lookAtTargets.map((key) => ({ time: key.time }))}
              onSeek={seek}
            />
            <TimelineRow
              label="Dialogue"
              colorClass="bg-amber-300"
              duration={cutscene.duration}
              cursor={cursor}
              markers={cutscene.subtitles.map((subtitle) => ({ time: subtitle.time, label: subtitle.text }))}
              onSeek={seek}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>Playhead {cursor.toFixed(2)}s / {cutscene.duration.toFixed(2)}s</span>
            <span className="truncate text-primary/75">{subtitleAt(cutscene, cursor) || "No active subtitle"}</span>
            <span>AI can write cameraPath · lookAtTargets · subtitles</span>
          </div>
        </div>
      </section>
    </>
  );
}
