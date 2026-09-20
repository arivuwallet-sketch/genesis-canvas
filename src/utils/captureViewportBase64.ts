/**
 * Capture the currently rendered R3F viewport without adding another renderer.
 * The function is intentionally DOM-only so it never runs during SSR.
 */
export function captureViewportBase64(
  quality = 0.72,
): string | null {
  if (typeof document === "undefined") return null;

  const canvas = document.querySelector("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) return null;
  if (canvas.width === 0 || canvas.height === 0) return null;

  try {
    return canvas.toDataURL("image/jpeg", Math.min(0.95, Math.max(0.4, quality)));
  } catch (error) {
    console.warn("[VisualQA] Viewport capture failed.", error);
    return null;
  }
}
