import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

type AssignBody = {
  cohort_id?: string;
  focus_area?: string;
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

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
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

  // Ensure caller completed profile row first.
  const { data: profile, error: profileErr } = await userClient
    .from("rhetor_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    return json(500, { error: "Failed to verify user profile" });
  }

  if (!profile) {
    return json(400, { error: "Profile not found. Create rhetor_users row first." });
  }

  let body: AssignBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  if (!body.cohort_id && !body.focus_area) {
    return json(400, { error: "Provide cohort_id or focus_area" });
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let cohortId = body.cohort_id?.trim() ?? "";

  if (!cohortId) {
    const focusArea = body.focus_area?.trim();
    if (!focusArea) {
      return json(400, { error: "focus_area is required when cohort_id is absent" });
    }

    const { data: cohort, error: cohortErr } = await serviceClient
      .from("rhetor_cohorts")
      .select("id")
      .eq("focus_area", focusArea)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (cohortErr) {
      return json(500, { error: "Failed to resolve cohort from focus_area" });
    }

    if (!cohort) {
      return json(404, { error: "No active cohort found for focus_area" });
    }

    cohortId = cohort.id;
  }

  const { data: assigned, error: assignErr } = await serviceClient.rpc(
    "rhetor_assign_to_pod",
    {
      p_user_id: user.id,
      p_cohort_id: cohortId,
    },
  );

  if (assignErr) {
    return json(500, { error: "Assignment failed", details: assignErr.message });
  }

  const row = Array.isArray(assigned) ? assigned[0] : assigned;
  if (!row) {
    return json(500, { error: "Assignment returned no row" });
  }

  return json(200, {
    user_id: user.id,
    cohort_id: row.cohort_id,
    pod_id: row.pod_id,
    pod_label: row.pod_label,
  });
});
