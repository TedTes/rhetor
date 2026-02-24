import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKET = "rhetor-audio";

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Missing Supabase env vars" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Missing bearer token" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();

  if (userErr || !user) {
    return json(401, { error: "Unauthorized" });
  }

  let body: { session_id?: string; expires_in?: number };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const sessionId = body.session_id?.trim();
  const expiresIn = Math.max(30, Math.min(600, body.expires_in ?? 120));

  if (!sessionId) {
    return json(400, { error: "session_id is required" });
  }

  // RLS in rhetor_sessions allows select for owner and assigned reviewers only.
  const { data: sessionRow, error: sessionErr } = await userClient
    .from("rhetor_sessions")
    .select("id, audio_path")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionErr) {
    return json(500, { error: "Failed to load session" });
  }

  if (!sessionRow) {
    return json(403, { error: "Forbidden" });
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: signedData, error: signErr } = await serviceClient.storage
    .from(BUCKET)
    .createSignedUrl(sessionRow.audio_path, expiresIn);

  if (signErr || !signedData?.signedUrl) {
    return json(500, { error: "Failed to create signed URL" });
  }

  return json(200, {
    session_id: sessionRow.id,
    audio_path: sessionRow.audio_path,
    expires_in: expiresIn,
    signed_url: signedData.signedUrl,
  });
});
