import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type Role = "viewer" | "editor" | "admin";
type RoleMap = Record<string, Role | "" | null | undefined>;

const ROLE_TABLE_NAME = "wnmu_app_user_roles";
const VALID_ROLES = new Set<Role>(["viewer", "editor", "admin"]);
const VALID_APP_KEYS = new Set(["home", "programming_library", "pledge_library", "monthly_schedules", "monthly_sales"]);
const DEFAULT_ALLOWED_ORIGINS = "https://tpoirier1969.github.io,http://localhost:3000,http://127.0.0.1:5500";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") || "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedOrigin = allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function normalizeDisplayName(value: unknown): string {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function assertAllowedLogin(email: string) {
  const allowed = email.endsWith("@nmu.edu") || email.endsWith("@local.wnmu");
  if (!allowed) throw new Error("Only @nmu.edu addresses or @local.wnmu internal logins can be managed here.");
}

function normalizeRole(value: unknown): Role | "" {
  const role = String(value || "").trim().toLowerCase() as Role;
  return VALID_ROLES.has(role) ? role : "";
}

async function getCaller(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) throw new Error("Missing signed-in user token.");
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user?.email) throw new Error("Could not verify the signed-in user.");
  return data.user;
}

async function assertHomeAdmin(serviceClient: ReturnType<typeof createClient>, callerEmail: string) {
  const { data, error } = await serviceClient
    .from(ROLE_TABLE_NAME)
    .select("role,is_active")
    .ilike("email", callerEmail)
    .eq("app_key", "home")
    .eq("role", "admin")
    .eq("is_active", true)
    .limit(1);
  if (error) throw error;
  if (!data?.length) throw new Error("Only Home admins can create or reset users.");
}

async function findUserByEmail(serviceClient: ReturnType<typeof createClient>, email: string) {
  let page = 1;
  const perPage = 1000;
  while (page <= 20) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data?.users?.find((user) => normalizeEmail(user.email) === email);
    if (found) return found;
    if (!data?.users?.length || data.users.length < perPage) return null;
    page += 1;
  }
  throw new Error("Could not find the user by email because the Auth user list is larger than this function searches.");
}

async function createOrResetUser(serviceClient: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  const email = normalizeEmail(payload.email);
  const displayName = normalizeDisplayName(payload.displayName);
  const temporaryPassword = String(payload.temporaryPassword || "");
  const updateRoles = Boolean(payload.updateRoles);
  const roles = (payload.roles || {}) as RoleMap;

  if (!email || !email.includes("@")) throw new Error("A valid email or internal login is required.");
  assertAllowedLogin(email);
  if (temporaryPassword.length < 8) throw new Error("Temporary password must be at least 8 characters.");

  const metadata = displayName ? { display_name: displayName } : undefined;
  const existingUser = await findUserByEmail(serviceClient, email);
  let authAction: "created" | "reset";
  let userId: string;

  if (existingUser) {
    const { data, error } = await serviceClient.auth.admin.updateUserById(existingUser.id, {
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: metadata
    });
    if (error) throw error;
    userId = data.user.id;
    authAction = "reset";
  } else {
    const { data, error } = await serviceClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: metadata
    });
    if (error) throw error;
    userId = data.user.id;
    authAction = "created";
  }

  let rolesUpdated = false;
  if (updateRoles) {
    const upserts: Array<Record<string, unknown>> = [];
    const deactivateKeys: string[] = [];
    for (const [appKey, rawRole] of Object.entries(roles)) {
      if (!VALID_APP_KEYS.has(appKey)) continue;
      const role = normalizeRole(rawRole);
      if (role) {
        upserts.push({ email, app_key: appKey, role, display_name: displayName || null, is_active: true });
      } else {
        deactivateKeys.push(appKey);
      }
    }
    if (upserts.length) {
      const { error } = await serviceClient
        .from(ROLE_TABLE_NAME)
        .upsert(upserts, { onConflict: "email,app_key" });
      if (error) throw error;
      rolesUpdated = true;
    }
    for (const appKey of deactivateKeys) {
      const { error } = await serviceClient
        .from(ROLE_TABLE_NAME)
        .update({ is_active: false, display_name: displayName || null })
        .ilike("email", email)
        .eq("app_key", appKey);
      if (error) throw error;
      rolesUpdated = true;
    }
  }

  return { email, userId, authAction, rolesUpdated };
}

serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, headers);

  try {
    const supabaseUrl = env("SUPABASE_URL");
    const anonKey = env("SUPABASE_ANON_KEY");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const caller = await getCaller(req, supabaseUrl, anonKey);
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    await assertHomeAdmin(serviceClient, normalizeEmail(caller.email));
    const payload = await req.json().catch(() => ({}));
    const action = String(payload.action || "");
    if (action !== "createOrResetUser") throw new Error("Unsupported action.");

    const result = await createOrResetUser(serviceClient, payload);
    return jsonResponse({ ok: true, ...result }, 200, headers);
  } catch (error) {
    console.error("wnmu-admin-user error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "User management failed." }, 400, headers);
  }
});
