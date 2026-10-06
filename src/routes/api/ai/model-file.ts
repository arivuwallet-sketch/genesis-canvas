import { createFileRoute } from "@tanstack/react-router";

/** Same-origin proxy for generated GLB files so the 3D loader never hits CORS. */
export const Route = createFileRoute("/api/ai/model-file")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("src") ?? "";
        let target: URL;
        try {
          target = new URL(raw);
        } catch {
          return new Response("Bad url", { status: 400 });
        }
        const host = target.hostname;
        if (target.protocol !== "https:" || !(host === "meshy.ai" || host.endsWith(".meshy.ai"))) {
          return new Response("Host not allowed", { status: 403 });
        }
        const upstream = await fetch(target.toString());
        if (!upstream.ok || !upstream.body) {
          return new Response("Model unavailable", { status: upstream.status || 502 });
        }
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "model/gltf-binary",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
