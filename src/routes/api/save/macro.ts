import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/save/macro")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env["SUPABASE_URL"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

        if (!supabaseUrl || !serviceKey) {
          return new Response(
            JSON.stringify({
              error: "Macro cloud save is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        let body: {
          playerId?: string;
          payloadBase64?: string;
        } = {};

        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid JSON body." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const playerId = body.playerId?.trim();
        const payloadBase64 = body.payloadBase64?.trim();

        if (!playerId || !payloadBase64) {
          return new Response(
            JSON.stringify({ error: "playerId and payloadBase64 are required." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const response = await fetch(
          supabaseUrl.replace(/\/$/, "") + "/rest/v1/macro_saves?on_conflict=player_id",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: serviceKey,
              Authorization: "Bearer " + serviceKey,
              Prefer: "resolution=merge-duplicates,return=minimal",
            },
            body: JSON.stringify({
              player_id: playerId,
              payload_base64: payloadBase64,
              updated_at: new Date().toISOString(),
            }),
          },
        );

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          return new Response(
            JSON.stringify({ error: detail || response.statusText }),
            {
              status: response.status || 502,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
