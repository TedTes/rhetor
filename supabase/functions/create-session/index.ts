import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ALLOWED_SESSION_TYPES = new Set(["prompt", "freeform", "flash_notes"]);
const ALLOWED_AUDIO_EXTENSIONS = new Set(["m4a", "aac", "mp3", "wav", "caf", "ogg"]);

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

type CreateSessionBody = {
  session_type?: string;
  focus_tags?: string[];
  audio_ext?: string;
  pod_id?: string;
};

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

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(500, { error: "Missing Supabase env vars" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Missing bearer token" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();

  if (userErr || !user) {
    return json(401, { error: "Unauthorized" });
  }

  let body: CreateSessionBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const sessionType = body.session_type?.trim() ?? "";
  if (!ALLOWED_SESSION_TYPES.has(sessionType)) {
    return json(400, {
      error: "session_type must be one of: prompt, freeform, flash_notes",
    });
  }

  const focusTags = (body.focus_tags ?? []).map((tag) => tag.trim()).filter(Boolean);
  if (focusTags.length < 1 || focusTags.length > 2) {
    return json(400, { error: "focus_tags must contain 1 to 2 values" });
  }

  const ext = (body.audio_ext ?? "m4a").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
    return json(400, {
      error: "audio_ext must be one of: m4a, aac, mp3, wav, caf, ogg",
    });
  }

  let podId = body.pod_id?.trim() ?? "";

  if (!podId) {
    const { data: membership, error: membershipErr } = await userClient
      .from("rhetor_pod_memberships")
      .select("pod_id")
      .eq("user_id", user.id)
      .is("left_at", null)
      .limit(1)
      .maybeSingle();

    if (membershipErr) {
      return json(500, { error: "Failed to resolve pod membership" });
    }

    if (!membership) {
      return json(400, {
        error: "No active pod membership. Complete onboarding cohort assignment first.",
      });
    }

    podId = membership.pod_id;
  }

  const sessionId = crypto.randomUUID();
  const audioPath = `${user.id}/${sessionId}.${ext}`;

  const { data: created, error: createErr } = await userClient
    .from("rhetor_sessions")
    .insert({
      id: sessionId,
      user_id: user.id,
      pod_id: podId,
      session_type: sessionType,
      focus_tags: focusTags,
      audio_path: audioPath,
      status: "recorded",
    })
    .select("id, pod_id, session_type, focus_tags, audio_path, status, submitted_at")
    .single();

  if (createErr) {
    return json(500, { error: "Failed to create session", details: createErr.message });
  }

  return json(200, {
    session_id: created.id,
    pod_id: created.pod_id,
    session_type: created.session_type,
    focus_tags: created.focus_tags,
    audio_bucket: "rhetor-audio",
    audio_path: created.audio_path,
    status: created.status,
    submitted_at: created.submitted_at,
    next: {
      upload: {
        bucket: "rhetor-audio",
        path: created.audio_path,
      },
    },
  });
});
