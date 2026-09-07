import { createFileRoute } from "@tanstack/react-router";
import { Viewport } from "../components/Viewport";
import { OverlayUI } from "../components/OverlayUI";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Omnipotent Engine — AI 3D Game Builder" },
      {
        name: "description",
        content:
          "A real-time 3D world builder: physics-driven viewport, HDRI lighting and an AI prompt bar for generating scenes.",
      },
      { property: "og:title", content: "Omnipotent Engine — AI 3D Game Builder" },
      {
        property: "og:description",
        content:
          "A real-time 3D world builder: physics-driven viewport, HDRI lighting and an AI prompt bar for generating scenes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="fixed inset-0 bg-background">
      <Viewport />
      <OverlayUI />
    </main>
  );
}
