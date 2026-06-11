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

async function listAllAuthUsers(serviceClient: ReturnType<typeof createClient>) {
  let page = 1;
  const perPage = 1000;
  const users: Array<any> = [];
  while (page <= 20) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = data?.users || [];
    users.push(...batch);
    if (!batch.length || batch.length < perPage) return users;
    page += 1;
  }
  throw new Error("The Auth user list is larger than this function currently searches.");
}

async function findUserByEmail(serviceClient: ReturnType<typeof createClient>, email: string) {
  const users = await listAllAuthUsers(serviceClient);
  return users.find((user) => normalizeEmail(user.email) === email) || null;
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

async function listUsersAndRoles(serviceClient: ReturnType<typeof createClient>) {
  const users = new Map<string, Record<string, unknown>>();
  const ensureUser = (email: string) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    if (!users.has(normalized)) {
      users.set(normalized, {
        email: normalized,
        displayName: "",
        hasAuthUser: false,
        emailConfirmed: false,
        createdAt: null,
        lastSignInAt: null,
        roles: {}
      });
    }
    return users.get(normalized) as Record<string, unknown>;
  };

  const authUsers = await listAllAuthUsers(serviceClient);
  for (const authUser of authUsers) {
    const email = normalizeEmail(authUser.email);
    if (!email) continue;
    const row = ensureUser(email);
    if (!row) continue;
    const metadata = authUser.user_metadata || {};
    row.hasAuthUser = true;
    row.emailConfirmed = Boolean(authUser.email_confirmed_at || authUser.confirmed_at);
    row.createdAt = authUser.created_at || null;
    row.lastSignInAt = authUser.last_sign_in_at || null;
    row.displayName = normalizeDisplayName(metadata.display_name || metadata.full_name || row.displayName || "");
  }

  const { data: roleRows, error } = await serviceClient
    .from(ROLE_TABLE_NAME)
    .select("email,app_key,role,is_active,display_name")
    .order("email", { ascending: true });
  if (error) throw error;

  for (const roleRow of roleRows || []) {
    const email = normalizeEmail(roleRow?.email);
    const appKey = String(roleRow?.app_key || "");
    if (!email || !VALID_APP_KEYS.has(appKey)) continue;
    const row = ensureUser(email);
    if (!row) continue;
    if (!row.displayName && roleRow?.display_name) row.displayName = normalizeDisplayName(roleRow.display_name);
    const role = normalizeRole(roleRow?.role);
    if (role && roleRow?.is_active !== false) {
      const roles = row.roles as Record<string, Role>;
      roles[appKey] = role;
    }
  }

  const sortedUsers = Array.from(users.values()).sort((a, b) => {
    const aName = normalizeDisplayName(a.displayName || a.email);
    const bName = normalizeDisplayName(b.displayName || b.email);
    return aName.localeCompare(bName, "en", { sensitivity: "base" });
  });
  return { users: sortedUsers };
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
    if (action === "listUsersAndRoles") {
      const result = await listUsersAndRoles(serviceClient);
      return jsonResponse({ ok: true, ...result }, 200, headers);
    }
    if (action === "createOrResetUser") {
      const result = await createOrResetUser(serviceClient, payload);
      return jsonResponse({ ok: true, ...result }, 200, headers);
    }
    throw new Error("Unsupported action.");
  } catch (error) {
    console.error("wnmu-admin-user error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "User management failed." }, 400, headers);
  }
});
