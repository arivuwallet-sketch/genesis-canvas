import { useCallback, useEffect, useMemo, useState } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import {
  parseUnityCommandBatch,
  type UnityCommandBatch,
} from "../../lib/unityCommandSchema";

export interface UnityGameBuilderProps {
  loaderUrl?: string;
  dataUrl?: string;
  frameworkUrl?: string;
  codeUrl?: string;
  className?: string;
}

const DEFAULT_BUILD = {
  loaderUrl: import.meta.env.VITE_UNITY_LOADER_URL || "/unity-build/build.loader.js",
  dataUrl: import.meta.env.VITE_UNITY_DATA_URL || "/unity-build/build.data",
  frameworkUrl:
    import.meta.env.VITE_UNITY_FRAMEWORK_URL || "/unity-build/build.framework.js",
  codeUrl: import.meta.env.VITE_UNITY_CODE_URL || "/unity-build/build.wasm",
};

export const UnityGameBuilder = ({
  loaderUrl = DEFAULT_BUILD.loaderUrl,
  dataUrl = DEFAULT_BUILD.dataUrl,
  frameworkUrl = DEFAULT_BUILD.frameworkUrl,
  codeUrl = DEFAULT_BUILD.codeUrl,
  className = "",
}: UnityGameBuilderProps) => {
  const {
    unityProvider,
    isLoaded,
    sendMessage,
    addEventListener,
    removeEventListener,
  } = useUnityContext(
    useMemo(
      () => ({
        loaderUrl,
        dataUrl,
        frameworkUrl,
        codeUrl,
      }),
      [codeUrl, dataUrl, frameworkUrl, loaderUrl],
    ),
  );

  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("Ready");
  const [lastCommands, setLastCommands] = useState<UnityCommandBatch | null>(null);

  const handleUnityCompleted = useCallback((payload?: string) => {
    setStatus(
      payload ? `Unity: ${payload}` : "Unity: command completed successfully.",
    );
  }, []);

  const handleUnityError = useCallback((payload?: string) => {
    setStatus(payload ? `Unity error: ${payload}` : "Unity reported an error.");
  }, []);

  useEffect(() => {
    addEventListener("UnityCommandCompleted", handleUnityCompleted);
    addEventListener("UnityCommandError", handleUnityError);

    return () => {
      removeEventListener("UnityCommandCompleted", handleUnityCompleted);
      removeEventListener("UnityCommandError", handleUnityError);
    };
  }, [
    addEventListener,
    handleUnityCompleted,
    handleUnityError,
    removeEventListener,
  ]);

  const runPrompt = async () => {
    const value = prompt.trim();
    if (!value || !isLoaded) return;

    setStatus("Asking the LLM...");
    try {
      const token = globalThis.localStorage?.getItem("token");
      const response = await fetch("/api/llm/commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: value }),
      });

      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `LLM request failed (${response.status}).`,
        );
      }

      const batch = parseUnityCommandBatch(payload);
      setLastCommands(batch);

      if (batch.commands.length === 0) {
        setStatus("LLM returned no runtime commands.");
        return;
      }

      sendMessage(
        "AICommandInterpreter",
        "ExecuteCommands",
        JSON.stringify(batch),
      );
      setStatus(`Sent ${batch.commands.length} command${batch.commands.length === 1 ? "" : "s"} to Unity.`);
      setPrompt("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to run pipeline.");
    }
  };

  return (
    <section
      className={`grid min-h-[640px] overflow-hidden rounded-2xl border border-border/60 bg-black/40 shadow-2xl lg:grid-cols-[minmax(0,1fr)_360px] ${className}`}
    >
      <div className="relative min-h-[420px] bg-black">
        <Unity
          unityProvider={unityProvider}
          style={{ width: "100%", height: "100%", minHeight: 420 }}
        />
        {!isLoaded && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/60 text-sm text-white/80">
            Loading Unity WebGL…
          </div>
        )}
      </div>

      <aside className="flex flex-col border-t border-border/60 bg-background/95 p-4 lg:border-l lg:border-t-0">
        <div className="mb-4">
          <p className="text-sm font-semibold">AI Game Builder</p>
          <p className="text-xs text-muted-foreground">
            React → LLM → JSON commands → Unity WebGL
          </p>
        </div>

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              void runPrompt();
            }
          }}
          placeholder="Spawn a red car and make it rain…"
          className="min-h-32 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
        />

        <button
          type="button"
          onClick={() => void runPrompt()}
          disabled={!isLoaded || !prompt.trim()}
          className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          Generate & Run
        </button>

        <div className="mt-4 rounded-xl border border-border/60 bg-black/20 p-3 text-xs text-muted-foreground">
          {status}
        </div>

        {lastCommands && (
          <pre className="mt-4 max-h-64 overflow-auto rounded-xl border border-border/60 bg-black/30 p-3 text-[11px] leading-5 text-foreground/80">
            {JSON.stringify(lastCommands, null, 2)}
          </pre>
        )}
      </aside>
    </section>
  );
};
