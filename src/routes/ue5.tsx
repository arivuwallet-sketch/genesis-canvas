import { createFileRoute } from "@tanstack/react-router";
import { UE5GameBuilder } from "../components/unreal/UE5GameBuilder";

export const Route = createFileRoute("/ue5")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "UE5 AI Game Builder — Genesis" },
      {
        name: "description",
        content: "AI command control for a running Unreal Engine 5 instance.",
      },
    ],
  }),
  component: UE5Page,
});

function UE5Page() {
  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-6">
      <UE5GameBuilder className="min-h-[calc(100vh-3rem)]" />
    </main>
  );
}
