# WNMU Home admin user function

Deploy this Supabase Edge Function as `wnmu-admin-user`.

Required secrets/environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `ALLOWED_ORIGINS` — comma-separated origins. Default includes `https://tpoirier1969.github.io`.

What it does:

- Verifies the signed-in caller.
- Confirms the caller has `home` / `admin` in `wnmu_app_user_roles`.
- Creates a Supabase Auth user if missing, or resets the password if the user already exists.
- Marks the Auth email confirmed.
- Optionally updates/deactivates module role rows in `wnmu_app_user_roles`.
- Lists existing Supabase Auth users and active module permissions for the Manage Users chart.
- Sends no email.

Allowed login IDs:

- `@nmu.edu`
- `@local.wnmu` internal usernames, such as `student@local.wnmu`
