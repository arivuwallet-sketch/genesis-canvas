import { createFileRoute } from "@tanstack/react-router";
import { UnityGameBuilder } from "../components/unity/UnityGameBuilder";

export const Route = createFileRoute("/unity")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Unity AI Game Builder — Genesis" },
      {
        name: "description",
        content: "AI prompt control for a live Unity WebGL game through structured runtime commands.",
      },
    ],
  }),
  component: UnityBuilderPage,
});

function UnityBuilderPage() {
  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-6">
      <UnityGameBuilder className="mx-auto min-h-[calc(100vh-3rem)] max-w-[1600px]" />
    </main>
  );
}
