(() => {
  "use strict";

  const PORTAL_VERSION = "v1.0.27-r2026-06-12";
  const OWNER_PAGES_ROOT = "https://tpoirier1969.github.io";
  const PLEDGE_APP_ROOT = `${OWNER_PAGES_ROOT}/WNMU-Fundraising-library-and-data`;
  const PROGRAMMING_APP_ROOT = `${OWNER_PAGES_ROOT}/WNMU-Programming-library`;
  const MONTHLY_APP_ROOT = `${OWNER_PAGES_ROOT}/WNMU-monthly-schedules`;
  const MONTHLY_CHANNEL = "13.1";
  const MONTHLY_PAGE = "index131.v1.4.1.html";
  const HOME_VERSION_URL = "version.json";
  const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
  const MODULE_VERSION_STORAGE_PREFIX = "wnmuHomeModuleOpened";
  const MODULE_RUNNING_VERSION_PREFIX = "wnmuAppRunningVersion";
  const PRIME_START = "19:00";
  const PRIME_END = "23:00";
  const PRIME_DAY_COUNT = 7;
  const MAX_HIGHLIGHTS = 999;
  const FEATURED_MONTHLY_TAGS = [
    { key: "highlight", label: "Highlight" },
    { key: "newSeries", label: "New Series" },
    { key: "holiday", label: "Holiday" },
    { key: "programmersChoice", label: "Programmer's Choice" },
    { key: "fundraiser", label: "Fundraiser" }
  ];
  const NEW_TAB_ATTRS = { target: "_blank", rel: "noopener noreferrer" };
  const SUPABASE_JS_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  const ROLE_TABLE_NAME = "wnmu_app_user_roles";
  const INTERNAL_LOGIN_DOMAIN = "local.wnmu";
  const BOOTSTRAP_ADMIN_EMAILS = ["tpoirier@nmu.edu"];
  const PLEDGE_SUMMARY_HIDDEN_EMAILS = [];
  const ROLE_PRIORITY = { none: 0, viewer: 1, editor: 2, admin: 3 };
  const ROLE_LABELS = { viewer: "Viewer", editor: "Editor", admin: "Admin" };
  const HOME_APP_KEY = "home";
  const homeState = {
    authClient: null,
    authReady: false,
    authBound: false,
    authDrawerOpen: false,
    activeAuthPanel: "sign-in",
    passwordRecovery: false,
    authError: "",
    authMessage: "",
    adminUserPanelOpen: false,
    adminUserMessage: "",
    adminUserError: "",
    rolesError: "",
    adminUsersLoading: false,
    adminUsersLoaded: false,
    adminUsersError: "",
    adminUsers: [],
    homeVersion: { checked: false, latestVersion: "", updateAvailable: false, error: "" },
    moduleVersions: new Map(),
    versionCheckTimer: null,
    session: null,
    user: null,
    roles: new Map(),
    displayName: ""
  };

  const apps = [
    { appKey: "programming_library", title: "Programming Library", description: "Program titles, rights, topics, and reference data.", url: `${OWNER_PAGES_ROOT}/WNMU-Programming-library/`, versionUrl: `${PROGRAMMING_APP_ROOT}/version.json`, accent: "#315f8c", tagBg: "#e4eef8", tagText: "#315f8c", tags: [] },
    { appKey: "pledge_library", title: "Pledge Library / Scheduler", description: "Pledge program library, scheduler, and drive tools.", url: `${PLEDGE_APP_ROOT}/`, versionUrl: `${PLEDGE_APP_ROOT}/version.json`, accent: "#376d5c", tagBg: "#e4f1ed", tagText: "#376d5c", tags: [] },
    { appKey: "monthly_schedules", title: "Monthly Schedules", description: "Monthly imports, channel grids, and schedule review.", url: `${MONTHLY_APP_ROOT}/`, versionUrl: `${MONTHLY_APP_ROOT}/version.json`, fallbackVersion: "v1.4.1", accent: "#62517e", tagBg: "#ece7f4", tagText: "#62517e", tags: [] },
    { appKey: "monthly_sales", title: "Monthly Sales View", description: "Monthly schedule grouped for sales categories.", url: `${MONTHLY_APP_ROOT}/sales-export.v1.5.88.html`, versionUrl: `${MONTHLY_APP_ROOT}/version.json`, fallbackVersion: "v1.5.88", accent: "#7a612a", tagBg: "#f5ecd4", tagText: "#7a612a", tags: [] }
  ];

  const adminUserColumns = [
    { appKey: HOME_APP_KEY, label: "Home" },
    { appKey: "programming_library", label: "Programming" },
    { appKey: "pledge_library", label: "Pledge" },
    { appKey: "monthly_schedules", label: "Schedules" },
    { appKey: "monthly_sales", label: "Sales" }
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function normalizeText(value) { return String(value ?? "").trim(); }
  function formatMoney(value) {
    return (Number(value || 0) || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  function formatCount(value) { return Math.round(Number(value || 0) || 0).toLocaleString("en-US"); }
  function toLocalDate(dateKey) { return new Date(`${dateKey}T00:00:00`); }
  function formatDate(dateKey) {
    const date = toLocalDate(dateKey);
    return Number.isNaN(date.getTime()) ? (dateKey || "—") : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function formatDateLong(dateKey) {
    const date = toLocalDate(dateKey);
    return Number.isNaN(date.getTime()) ? (dateKey || "—") : date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  function formatDateShort(dateKey) {
    const date = toLocalDate(dateKey);
    return Number.isNaN(date.getTime()) ? (dateKey || "—") : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  function formatMonthLabel(monthKey) {
    const [year, month] = String(monthKey || "").split("-").map(Number);
    return year && month ? new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : (monthKey || "Current month");
  }
  function formatTime(timeStr) {
    const [hh, mm] = String(timeStr || "").split(":").map(Number);
    return Number.isFinite(hh) && Number.isFinite(mm) ? new Date(2026, 0, 1, hh, mm).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : (timeStr || "");
  }
  function dateKeyFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function localTodayKey() { return dateKeyFromDate(new Date()); }
  function monthKeyFromDateKey(dateKey) { return String(dateKey || "").slice(0, 7); }
  function nextMonthKey(monthKey) {
    const [year, month] = String(monthKey || "").split("-").map(Number);
    if (!year || !month) return "";
    const next = new Date(year, month, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }
  function plusDays(dateKey, days) {
    const date = toLocalDate(dateKey);
    if (Number.isNaN(date.getTime())) return dateKey || "";
    date.setDate(date.getDate() + Number(days || 0));
    return dateKeyFromDate(date);
  }
  function timeToMinutes(timeStr) {
    const [hh, mm] = String(timeStr || "").split(":").map(Number);
    return Number.isFinite(hh) && Number.isFinite(mm) ? (hh * 60) + mm : 0;
  }
  function slugify(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function durationForEntry(entry = {}) {
    const direct = Number(entry.durationMin || entry.durationMinutes || entry.minutes);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const slots = Number(entry.slotCount || entry.slots);
    return Number.isFinite(slots) && slots > 0 ? slots * 30 : 30;
  }
  function buildMonthlyEntryKey(entry = {}) {
    return `${entry.date}__${entry.time}__${slugify(entry.title)}__${slugify(entry.episode || "no-episode")}`;
  }

  function normalizeEmail(value) { return normalizeText(value).toLowerCase(); }
  function normalizeLoginIdentifier(value) {
    const raw = normalizeText(value);
    if (!raw) return "";
    if (raw.includes("@")) return raw.toLowerCase();
    return `${raw.toLowerCase().replace(/\s+/g, "-")}@${INTERNAL_LOGIN_DOMAIN}`;
  }
  function normalizeRole(value) {
    const role = normalizeText(value).toLowerCase();
    return Object.prototype.hasOwnProperty.call(ROLE_PRIORITY, role) && role !== "none" ? role : "";
  }
  function roleRank(role) { return ROLE_PRIORITY[normalizeRole(role)] || 0; }
  function roleLabel(role) { return ROLE_LABELS[normalizeRole(role)] || "No access"; }
  function isSignedIn() { return Boolean(homeState.user?.email); }
  function roleForApp(appKey) { return normalizeRole(homeState.roles.get(appKey)); }
  function hasAppAccess(appKey) { return isSignedIn() && roleRank(roleForApp(appKey)) >= ROLE_PRIORITY.viewer; }
  function isHomeAdmin() { return isSignedIn() && roleRank(roleForApp(HOME_APP_KEY)) >= ROLE_PRIORITY.admin; }
  function setRole(appKey, role) {
    const normalized = normalizeRole(role);
    if (!appKey || !normalized) return;
    const existing = roleForApp(appKey);
    if (roleRank(normalized) >= roleRank(existing)) homeState.roles.set(appKey, normalized);
  }
  function applyBootstrapAdminRoles(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!BOOTSTRAP_ADMIN_EMAILS.map(normalizeEmail).includes(normalizedEmail)) return;
    setRole(HOME_APP_KEY, "admin");
    apps.forEach((app) => setRole(app.appKey, "admin"));
  }
  function applyRoleRows(rows = []) {
    (rows || []).forEach((row) => {
      if (row?.is_active === false) return;
      const appKey = normalizeText(row?.app_key || row?.app || row?.module_key || row?.module || "");
      const role = normalizeRole(row?.role || row?.access_role || "");
      setRole(appKey, role);
      if (!homeState.displayName) homeState.displayName = normalizeText(row?.display_name || row?.name || "");
    });
  }
  function displayUserName() {
    return homeState.displayName || normalizeText(homeState.user?.email) || "Signed in";
  }

  function applyNewTabAttributes(link) {
    link.target = NEW_TAB_ATTRS.target;
    link.rel = NEW_TAB_ATTRS.rel;
    return link;
  }
  function versionStorageKey(appKey) { return `${MODULE_VERSION_STORAGE_PREFIX}:${appKey}`; }
  function runningVersionStorageKey(appKey) { return `${MODULE_RUNNING_VERSION_PREFIX}:${appKey}`; }
  function versionFromManifest(manifest = {}) {
    return normalizeText(manifest.version || manifest.appVersion || manifest.APP_VERSION || manifest.currentVersion || manifest.latestVersion || manifest.buildVersion || "");
  }
  function versionParts(value) {
    const raw = normalizeText(value).replace(/^v/i, "");
    const matches = raw.match(/\d+/g) || [];
    return matches.map((part) => Number(part)).filter((part) => Number.isFinite(part));
  }
  function compareVersions(a, b) {
    const left = versionParts(a);
    const right = versionParts(b);
    const max = Math.max(left.length, right.length);
    for (let index = 0; index < max; index += 1) {
      const l = left[index] || 0;
      const r = right[index] || 0;
      if (l > r) return 1;
      if (l < r) return -1;
    }
    return 0;
  }
  function isVersionNewer(latest, current) {
    if (!normalizeText(latest) || !normalizeText(current)) return false;
    return compareVersions(latest, current) > 0;
  }
  function readJsonStorage(key) {
    try {
      const raw = window.localStorage?.getItem(key);
      if (!raw) return null;
      if (raw.trim().startsWith("{")) return JSON.parse(raw);
      return { version: raw };
    } catch (_) {
      return null;
    }
  }
  function storedModuleVersion(appKey) {
    const running = readJsonStorage(runningVersionStorageKey(appKey));
    if (running?.version) return { ...running, source: "running" };
    const opened = readJsonStorage(versionStorageKey(appKey));
    if (opened?.version) return { ...opened, source: "opened" };
    return { version: "", source: "" };
  }
  function writeModuleOpenedVersion(app) {
    const status = homeState.moduleVersions.get(app.appKey) || {};
    const version = normalizeText(status.latestVersion || status.openedVersion || "");
    if (!version) return;
    try {
      window.localStorage?.setItem(versionStorageKey(app.appKey), JSON.stringify({
        appKey: app.appKey,
        title: app.title,
        version,
        url: app.url,
        openedAt: new Date().toISOString()
      }));
      homeState.moduleVersions.set(app.appKey, { ...status, openedVersion: version, updateAvailable: false });
    } catch (_) {}
  }
  async function fetchVersionManifest(url) {
    if (!url) return null;
    const resource = new URL(url, window.location.href);
    resource.searchParams.set("_", String(Date.now()));
    const response = await fetch(resource.toString(), { cache: "no-store" });
    if (!response.ok) throw new Error(`Version file unavailable (${response.status})`);
    return response.json();
  }
  function renderHomeVersionNotice() {
    const notice = document.getElementById("homeVersionNotice");
    if (!notice) return;
    const state = homeState.homeVersion || {};
    if (!state.updateAvailable) {
      notice.classList.add("hidden");
      notice.innerHTML = "";
      return;
    }
    notice.classList.remove("hidden");
    notice.innerHTML = `
      <div>
        <strong>New WNMU Home version available.</strong>
        <span>You are running ${escapeHtml(PORTAL_VERSION)}. The current version is ${escapeHtml(state.latestVersion)}. Refresh this page to update.</span>
      </div>
      <button type="button" class="button version-refresh-button" id="homeRefreshVersionButton">Refresh now</button>`;
    notice.querySelector("#homeRefreshVersionButton")?.addEventListener("click", () => {
      const url = new URL(window.location.href.split("#")[0]);
      url.searchParams.set("refresh", String(Date.now()));
      window.location.assign(url.toString());
    });
  }
  function moduleVersionStatus(app) {
    return homeState.moduleVersions.get(app.appKey) || { checked: false, latestVersion: "", openedVersion: "", updateAvailable: false, error: "" };
  }
  async function checkHomeVersion() {
    try {
      const manifest = await fetchVersionManifest(HOME_VERSION_URL);
      const latestVersion = versionFromManifest(manifest);
      homeState.homeVersion = {
        checked: true,
        latestVersion,
        updateAvailable: isVersionNewer(latestVersion, PORTAL_VERSION),
        error: ""
      };
    } catch (error) {
      homeState.homeVersion = { checked: true, latestVersion: "", updateAvailable: false, error: error?.message || "Version check failed." };
    }
    renderHomeVersionNotice();
  }
  async function checkModuleVersions() {
    await Promise.all(apps.map(async (app) => {
      const stored = storedModuleVersion(app.appKey);
      const fallbackVersion = normalizeText(app.fallbackVersion || "");
      const nextStatus = {
        checked: true,
        latestVersion: fallbackVersion,
        openedVersion: normalizeText(stored.version || ""),
        source: stored.source || (fallbackVersion ? "configured" : ""),
        updateAvailable: false,
        fallbackOnly: Boolean(fallbackVersion),
        error: ""
      };
      try {
        const manifest = await fetchVersionManifest(app.versionUrl);
        const manifestVersion = versionFromManifest(manifest);
        if (manifestVersion) {
          nextStatus.latestVersion = manifestVersion;
          nextStatus.fallbackOnly = false;
          nextStatus.source = "manifest";
        }
        nextStatus.updateAvailable = isVersionNewer(nextStatus.latestVersion, nextStatus.openedVersion);
      } catch (error) {
        if (!fallbackVersion) nextStatus.error = error?.message || "Version check unavailable.";
      }
      homeState.moduleVersions.set(app.appKey, nextStatus);
    }));
    renderAppGrid();
  }
  async function checkVersionUpdates() {
    await Promise.all([checkHomeVersion(), checkModuleVersions()]);
  }
  function startVersionChecks() {
    void checkVersionUpdates();
    if (homeState.versionCheckTimer) window.clearInterval(homeState.versionCheckTimer);
    homeState.versionCheckTimer = window.setInterval(() => void checkVersionUpdates(), VERSION_CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) void checkVersionUpdates();
    });
  }
  function renderRoleTag(role) {
    const normalized = normalizeRole(role);
    const tag = document.createElement("span");
    tag.className = `tag access-tag access-tag--${normalized || "none"}`;
    tag.textContent = roleLabel(normalized);
    return tag;
  }
  function moduleVersionLabel(status) {
    if (status?.latestVersion && status?.fallbackOnly) return `Version ${status.latestVersion}`;
    if (status?.latestVersion) return `Published version ${status.latestVersion}`;
    if (status?.openedVersion) return `Last opened version ${status.openedVersion}`;
    if (status?.checked && status?.error) return "Version unavailable";
    return "Checking version…";
  }
  function renderModuleVersionLine(app) {
    const status = moduleVersionStatus(app);
    const line = document.createElement("div");
    line.className = `app-version-line${status?.error && !status?.latestVersion ? " app-version-line--warn" : ""}${status?.fallbackOnly ? " app-version-line--fallback" : ""}`;
    line.textContent = moduleVersionLabel(status);
    return line;
  }
  function renderAppCard(app) {
    const card = document.createElement("article");
    const signedIn = isSignedIn();
    const role = roleForApp(app.appKey);
    const canOpen = hasAppAccess(app.appKey);
    const versionStatus = moduleVersionStatus(app);
    card.className = `app-card${canOpen ? "" : " app-card--locked"}`;
    card.style.setProperty("--accent", app.accent);
    card.style.setProperty("--tag-bg", app.tagBg);
    card.style.setProperty("--tag-text", app.tagText);

    const heading = document.createElement("h2");
    heading.textContent = app.title;
    card.append(heading);

    if (!signedIn) {
      const lockedRow = document.createElement("div");
      lockedRow.className = "app-card__locked-row";
      const lockedButton = document.createElement("button");
      lockedButton.type = "button";
      lockedButton.className = "button disabled-button";
      lockedButton.disabled = true;
      lockedButton.textContent = "Locked";
      lockedRow.appendChild(lockedButton);
      card.appendChild(lockedRow);
      return card;
    }

    if (!canOpen) {
      const noAccess = document.createElement("p");
      noAccess.className = "app-card__access-note";
      noAccess.textContent = "No access assigned for this account.";
      card.append(noAccess, renderModuleVersionLine(app));
      return card;
    }

    const bodyRow = document.createElement("div");
    bodyRow.className = "app-card__body-row";
    const description = document.createElement("p");
    description.textContent = app.description;

    const actions = document.createElement("div");
    actions.className = "app-actions";
    const open = document.createElement("a");
    open.className = "button";
    open.href = app.url;
    open.textContent = "Open";
    open.setAttribute("aria-label", `Open ${app.title} in a new tab`);
    open.addEventListener("click", () => writeModuleOpenedVersion(app));
    actions.appendChild(applyNewTabAttributes(open));

    if (app.fallbackUrl) {
      const fallback = document.createElement("a");
      fallback.className = "button secondary";
      fallback.href = app.fallbackUrl;
      fallback.textContent = "Open app home";
      fallback.setAttribute("aria-label", `Open ${app.title} home page in a new tab`);
      fallback.addEventListener("click", () => writeModuleOpenedVersion(app));
      actions.appendChild(applyNewTabAttributes(fallback));
    }

    bodyRow.append(description, actions);
    card.append(bodyRow, renderModuleVersionLine(app));

    if (versionStatus.updateAvailable) {
      const warning = document.createElement("div");
      warning.className = "app-update-warning";
      warning.textContent = `The current version of this app is newer than the version this browser last opened. Use the Open button here, or refresh any open copy of ${app.title}.`;
      card.appendChild(warning);
    }

    const meta = document.createElement("div");
    meta.className = "app-card__meta";
    (app.tags || []).forEach((label) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = label;
      meta.appendChild(tag);
    });
    if (meta.children.length) card.appendChild(meta);
    return card;
  }

  function renderAppGrid() {
    const grid = document.querySelector("[data-app-grid]");
    if (!grid) return;
    grid.textContent = "";
    apps.forEach((app) => grid.appendChild(renderAppCard(app)));
  }
  function renderAccessPanel() {
    const box = document.getElementById("homeAccessPanel");
    if (!box) return;
    if (!isSignedIn()) {
      box.classList.add("hidden");
      box.innerHTML = "";
      homeState.adminUserPanelOpen = false;
      renderAdminUserPanel();
      return;
    }
    box.classList.remove("hidden");
    const warning = homeState.rolesError ? `<div class="access-warning">${escapeHtml(homeState.rolesError)}</div>` : "";
    const changePasswordAction = `<button type="button" class="button secondary access-admin-button" id="homeChangePasswordButton">Change password</button>`;
    const adminAction = isHomeAdmin() ? `<button type="button" class="button secondary access-admin-button" id="homeManageUsersButton">Manage users</button>` : "";
    box.innerHTML = `
      <div class="access-head access-head-compact">
        <div>
          <div class="access-kicker">Signed in</div>
          <div class="access-title">${escapeHtml(displayUserName())}</div>
        </div>
        <div class="access-head-actions">
          ${changePasswordAction}
          ${adminAction}
        </div>
      </div>
      ${warning}
    `;
    box.querySelector("#homeChangePasswordButton")?.addEventListener("click", () => {
      homeState.authDrawerOpen = true;
      homeState.passwordRecovery = true;
      homeState.authMessage = "Enter a new password for this account.";
      homeState.authError = "";
      setAuthPanel("update");
      renderAuthControls();
      window.setTimeout(() => document.getElementById("homeNewPassword")?.focus(), 0);
    });
    box.querySelector("#homeManageUsersButton")?.addEventListener("click", () => {
      homeState.adminUserPanelOpen = true;
      homeState.adminUserError = "";
      homeState.adminUserMessage = "";
      renderAdminUserPanel();
      void refreshAdminUsersTable();
      window.setTimeout(() => document.getElementById("homeAdminUserEmail")?.focus(), 0);
    });
    renderAdminUserPanel();
  }
  function setRoleFieldsVisible() {
    const checked = Boolean(document.getElementById("homeAdminUpdateRoles")?.checked);
    document.getElementById("homeAdminRoleFields")?.classList.toggle("hidden", !checked);
  }
  function adminUserRoleTag(role) {
    const normalized = normalizeRole(role);
    return `<span class="access-role access-role--${escapeHtml(normalized || "none")}">${escapeHtml(roleLabel(normalized))}</span>`;
  }
  function renderAdminUsersTable() {
    const box = document.getElementById("homeAdminUsersTable");
    const refreshButton = document.getElementById("homeRefreshAdminUsersButton");
    if (!box) return;
    if (refreshButton) refreshButton.disabled = homeState.adminUsersLoading;
    if (!isHomeAdmin()) {
      box.innerHTML = "";
      return;
    }
    if (homeState.adminUsersLoading) {
      box.innerHTML = `<div class="admin-users-empty">Loading users and permissions…</div>`;
      return;
    }
    if (homeState.adminUsersError) {
      box.innerHTML = `<div class="admin-users-empty warn">${escapeHtml(homeState.adminUsersError)}</div>`;
      return;
    }
    if (!homeState.adminUsersLoaded) {
      box.innerHTML = `<div class="admin-users-empty">Open this panel or refresh to load the current permission chart.</div>`;
      return;
    }
    if (!homeState.adminUsers.length) {
      box.innerHTML = `<div class="admin-users-empty">No users or role rows found yet.</div>`;
      return;
    }
    const headerCells = adminUserColumns.map((col) => `<th scope="col">${escapeHtml(col.label)}</th>`).join("");
    const rows = homeState.adminUsers.map((user) => {
      const display = normalizeText(user.displayName || "");
      const email = normalizeEmail(user.email || "");
      const roleCells = adminUserColumns.map((col) => `<td>${adminUserRoleTag(user.roles?.[col.appKey] || "")}</td>`).join("");
      const status = user.hasAuthUser ? "Login exists" : "Roles only";
      const detail = user.hasAuthUser ? (user.emailConfirmed ? "Confirmed" : "Unconfirmed") : "No Supabase Auth login yet";
      return `
        <tr>
          <th scope="row">
            <span class="admin-users-name">${escapeHtml(display || email || "Unnamed user")}</span>
            <span class="admin-users-email">${escapeHtml(email)}</span>
          </th>
          <td><span class="admin-users-status">${escapeHtml(status)}</span><span class="admin-users-status-detail">${escapeHtml(detail)}</span></td>
          ${roleCells}
        </tr>`;
    }).join("");
    box.innerHTML = `
      <div class="admin-users-table-wrap">
        <table class="admin-users-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Login</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }
  async function refreshAdminUsersTable() {
    if (!isHomeAdmin()) return;
    homeState.adminUsersLoading = true;
    homeState.adminUsersError = "";
    renderAdminUsersTable();
    try {
      const client = await ensureHomeAuthClient();
      const { data, error } = await client.functions.invoke("wnmu-admin-user", {
        body: { action: "listUsersAndRoles" }
      });
      if (error) throw error;
      homeState.adminUsers = Array.isArray(data?.users) ? data.users : [];
      homeState.adminUsersLoaded = true;
      homeState.adminUsersError = "";
    } catch (error) {
      homeState.adminUsersError = await friendlyFunctionError(error);
      homeState.adminUsersLoaded = true;
      homeState.adminUsers = [];
    } finally {
      homeState.adminUsersLoading = false;
      renderAdminUsersTable();
    }
  }
  function renderAdminUserPanel() {
    const panel = document.getElementById("homeAdminUserPanel");
    const message = document.getElementById("homeAdminUserMessage");
    if (!panel) return;
    const show = isHomeAdmin() && homeState.adminUserPanelOpen;
    panel.classList.toggle("hidden", !show);
    if (!isHomeAdmin()) homeState.adminUserPanelOpen = false;
    if (message) {
      message.textContent = homeState.adminUserError || homeState.adminUserMessage || "";
      message.classList.toggle("warn", Boolean(homeState.adminUserError));
    }
    setRoleFieldsVisible();
    renderAdminUsersTable();
  }
  function generateTempPassword(length = 16) {
    const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    const values = new Uint32Array(length);
    window.crypto?.getRandomValues?.(values);
    return Array.from(values, (value, index) => chars[(value || Math.floor(Math.random() * chars.length) + index) % chars.length]).join("");
  }
  function adminRolePayload() {
    return {
      [HOME_APP_KEY]: normalizeRole(document.getElementById("homeAdminRoleHome")?.value || ""),
      programming_library: normalizeRole(document.getElementById("homeAdminRoleProgramming")?.value || ""),
      pledge_library: normalizeRole(document.getElementById("homeAdminRolePledge")?.value || ""),
      monthly_schedules: normalizeRole(document.getElementById("homeAdminRoleSchedules")?.value || ""),
      monthly_sales: normalizeRole(document.getElementById("homeAdminRoleSales")?.value || "")
    };
  }
  async function friendlyFunctionError(error) {
    const fallback = error?.message || "User management failed.";
    const context = error?.context;
    if (!context || typeof context.json !== "function") return fallback;
    try {
      const body = await context.json();
      return body?.error || body?.message || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function renderAuthControls() {
    const chip = document.getElementById("homeAuthChip");
    const loginButton = document.getElementById("homeLoginButton");
    const logoutButton = document.getElementById("homeLogoutButton");
    const drawer = document.getElementById("homeAuthDrawer");
    const message = document.getElementById("homeAuthMessage");
    const signedIn = isSignedIn();
    if (chip) chip.textContent = signedIn ? displayUserName() : (homeState.authError ? "Login unavailable" : "Public view");
    if (loginButton) loginButton.classList.toggle("hidden", signedIn);
    if (logoutButton) logoutButton.classList.toggle("hidden", !signedIn);
    if (drawer) drawer.classList.toggle("hidden", (!homeState.authDrawerOpen) || (signedIn && !homeState.passwordRecovery));
    if (message) {
      message.textContent = homeState.authMessage || homeState.authError || "";
      message.classList.toggle("warn", Boolean(homeState.authError));
    }
    renderAccessPanel();
    renderAdminUserPanel();
  }
  function renderHomeShell() {
    renderAppGrid();
    renderAuthControls();
  }
  function hidePledgeDriveSummary() {
    const box = document.getElementById("pledgeDriveSummary");
    if (!box) return;
    box.classList.add("hidden");
    box.innerHTML = "";
  }
  function canSeePledgeSummary() {
    const email = normalizeEmail(homeState.user?.email || "");
    return isSignedIn() && !PLEDGE_SUMMARY_HIDDEN_EMAILS.map(normalizeEmail).includes(email);
  }
  function refreshPrivateHomeSections() {
    if (!canSeePledgeSummary()) {
      hidePledgeDriveSummary();
      return;
    }
    void loadPledgeDriveSummary();
  }

  function authRedirectUrl() {
    const url = new URL(window.location.href.split("#")[0]);
    url.searchParams.delete("error");
    url.searchParams.delete("error_code");
    url.searchParams.delete("error_description");
    return url.toString();
  }
  function setAuthPanel(panelName = "sign-in") {
    homeState.activeAuthPanel = panelName;
    const loginForm = document.getElementById("homeLoginForm");
    if (loginForm) loginForm.classList.toggle("hidden", panelName !== "sign-in");
    const panels = {
      "reset": document.getElementById("homePasswordResetForm"),
      "create": document.getElementById("homeCreateAccountForm"),
      "update": document.getElementById("homePasswordUpdateForm")
    };
    Object.entries(panels).forEach(([key, el]) => {
      if (el) el.classList.toggle("hidden", key !== panelName);
    });
  }
  function copyLoginEmailToField(targetId) {
    const source = document.getElementById("homeLoginEmail");
    const target = document.getElementById(targetId);
    const value = normalizeText(source?.value || "");
    if (target && value && value.includes("@")) target.value = value;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find((script) => script.src === src);
      if (existing) { resolve(); return; }
      const script = document.createElement("script");
      script.src = src;
      script.defer = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.appendChild(script);
    });
  }
  async function loadPledgeConfig() {
    if (!window.PLEDGE_MANAGER_CONFIG) await loadScript(`${PLEDGE_APP_ROOT}/config.js?portal=${encodeURIComponent(PORTAL_VERSION)}&t=${Date.now()}`);
    const cfg = window.PLEDGE_MANAGER_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) throw new Error("Pledge Library config is not available yet.");
    return cfg;
  }
  async function loadMonthlyConfig() {
    if (!window.WNMU_SHAREBOARD_SUPABASE) await loadScript(`${MONTHLY_APP_ROOT}/config.js?portal=${encodeURIComponent(PORTAL_VERSION)}&t=${Date.now()}`);
    const cfg = window.WNMU_SHAREBOARD_SUPABASE || {};
    if (!cfg.url || !cfg.anonKey) throw new Error("Monthly schedule config is not available yet.");
    return cfg;
  }
  async function restSelect(cfg, pathAndQuery) {
    const res = await fetch(`${cfg.SUPABASE_URL}${pathAndQuery}`, {
      headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}` },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`Supabase read failed (${res.status})`);
    return res.json();
  }
  async function monthlyRestSelect(cfg, pathAndQuery) {
    const res = await fetch(`${cfg.url}${pathAndQuery}`, {
      headers: { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}` },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`Monthly schedule read failed (${res.status})`);
    return res.json();
  }
  async function loadProgrammingConfig() {
    if (!window.APP_CONFIG) await loadScript(`${PROGRAMMING_APP_ROOT}/config.js?portal=${encodeURIComponent(PORTAL_VERSION)}&t=${Date.now()}`);
    const cfg = window.APP_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) throw new Error("Programming Library config is not available yet.");
    return cfg;
  }
  async function ensureSupabaseJs() {
    if (window.supabase?.createClient) return;
    await loadScript(SUPABASE_JS_URL);
    if (!window.supabase?.createClient) throw new Error("Supabase sign-in library did not load.");
  }
  async function ensureHomeAuthClient() {
    if (homeState.authClient) return homeState.authClient;
    await ensureSupabaseJs();
    const cfg = await loadProgrammingConfig();
    homeState.authClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: (input, init = {}) => fetch(input, { ...init, cache: "no-store" }) }
    });
    return homeState.authClient;
  }
  async function fetchRoleRowsForCurrentUser() {
    homeState.rolesError = "";
    homeState.roles = new Map();
    homeState.displayName = "";
    const email = normalizeEmail(homeState.user?.email || "");
    if (!email) return;
    applyBootstrapAdminRoles(email);
    try {
      const client = await ensureHomeAuthClient();
      const { data, error } = await client
        .from(ROLE_TABLE_NAME)
        .select("email,app_key,role,is_active,display_name")
        .ilike("email", email);
      if (error) throw error;
      applyRoleRows((data || []).filter((row) => row?.is_active !== false));
      applyBootstrapAdminRoles(email);
      if (!homeState.roles.size) homeState.rolesError = "This account is signed in, but no module access has been assigned yet.";
    } catch (error) {
      console.warn("WNMU Home role lookup failed.", error);
      homeState.rolesError = "Role lookup is not available yet. Only temporary bootstrap access is active.";
      applyBootstrapAdminRoles(email);
    }
  }
  async function refreshHomeAuthFromSession(session) {
    homeState.session = session || null;
    homeState.user = session?.user || null;
    homeState.authError = "";
    homeState.authMessage = "";
    if (homeState.user) await fetchRoleRowsForCurrentUser();
    else {
      homeState.roles = new Map();
      homeState.rolesError = "";
      homeState.displayName = "";
      homeState.adminUserPanelOpen = false;
      homeState.adminUserMessage = "";
      homeState.adminUserError = "";
      homeState.adminUsersLoading = false;
      homeState.adminUsersLoaded = false;
      homeState.adminUsersError = "";
      homeState.adminUsers = [];
    }
    renderHomeShell();
    refreshPrivateHomeSections();
  }
  function bindHomeAuthEvents() {
    if (homeState.authBound) return;
    homeState.authBound = true;
    const loginButton = document.getElementById("homeLoginButton");
    const logoutButton = document.getElementById("homeLogoutButton");
    const githubButton = document.getElementById("homeGithubLoginButton");
    const forgotButton = document.getElementById("homeForgotLoginButton");
    const requestButton = document.getElementById("homeRequestAccountButton");
    const form = document.getElementById("homeLoginForm");
    const resetForm = document.getElementById("homePasswordResetForm");
    const createForm = document.getElementById("homeCreateAccountForm");
    const updateForm = document.getElementById("homePasswordUpdateForm");
    const adminUserForm = document.getElementById("homeAdminUserForm");
    const adminUserCloseButton = document.getElementById("homeAdminUserCloseButton");
    const refreshAdminUsersButton = document.getElementById("homeRefreshAdminUsersButton");
    const generateTempPasswordButton = document.getElementById("homeGenerateTempPasswordButton");
    const copyTempPasswordButton = document.getElementById("homeCopyTempPasswordButton");
    const updateRolesCheckbox = document.getElementById("homeAdminUpdateRoles");

    document.querySelectorAll("[data-close-auth-panel]").forEach((button) => {
      button.addEventListener("click", () => {
        homeState.authError = "";
        homeState.authMessage = "";
        if (isSignedIn()) {
          homeState.passwordRecovery = false;
          homeState.authDrawerOpen = false;
        }
        setAuthPanel("sign-in");
        renderAuthControls();
      });
    });

    if (loginButton) loginButton.addEventListener("click", () => {
      homeState.authDrawerOpen = !homeState.authDrawerOpen;
      homeState.passwordRecovery = false;
      homeState.authMessage = "";
      homeState.authError = "";
      setAuthPanel("sign-in");
      renderAuthControls();
      if (homeState.authDrawerOpen) window.setTimeout(() => document.getElementById("homeLoginEmail")?.focus(), 0);
    });
    if (logoutButton) logoutButton.addEventListener("click", async () => {
      try {
        const client = await ensureHomeAuthClient();
        await client.auth.signOut();
        homeState.passwordRecovery = false;
        homeState.authDrawerOpen = false;
        setAuthPanel("sign-in");
        await refreshHomeAuthFromSession(null);
      } catch (error) {
        homeState.authError = error?.message || "Sign out failed.";
        renderAuthControls();
      }
    });
    if (githubButton) githubButton.addEventListener("click", async () => {
      homeState.authMessage = "Opening GitHub sign in…";
      homeState.authError = "";
      setAuthPanel("sign-in");
      renderAuthControls();
      try {
        const client = await ensureHomeAuthClient();
        const { error } = await client.auth.signInWithOAuth({ provider: "github", options: { redirectTo: authRedirectUrl() } });
        if (error) throw error;
      } catch (error) {
        homeState.authError = error?.message || "GitHub sign in failed. Password fields below do not accept GitHub credentials.";
        homeState.authMessage = "";
        renderAuthControls();
      }
    });
    if (forgotButton) forgotButton.addEventListener("click", () => {
      homeState.authDrawerOpen = true;
      homeState.authError = "";
      homeState.authMessage = "";
      copyLoginEmailToField("homeResetEmail");
      setAuthPanel("reset");
      renderAuthControls();
      window.setTimeout(() => document.getElementById("homeResetEmail")?.focus(), 0);
    });
    if (requestButton) requestButton.addEventListener("click", () => {
      homeState.authDrawerOpen = true;
      homeState.authError = "";
      homeState.authMessage = "";
      setAuthPanel("create");
      renderAuthControls();
    });
    if (form) form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const emailInput = document.getElementById("homeLoginEmail");
      const passwordInput = document.getElementById("homeLoginPassword");
      const loginId = normalizeLoginIdentifier(emailInput?.value || "");
      const password = String(passwordInput?.value || "");
      if (!loginId || !password) return;
      homeState.authMessage = "Signing in…";
      homeState.authError = "";
      setAuthPanel("sign-in");
      renderAuthControls();
      try {
        const client = await ensureHomeAuthClient();
        const { data, error } = await client.auth.signInWithPassword({ email: loginId, password });
        if (error) throw error;
        homeState.authDrawerOpen = false;
        homeState.passwordRecovery = false;
        if (passwordInput) passwordInput.value = "";
        await refreshHomeAuthFromSession(data?.session || null);
      } catch (error) {
        homeState.authError = error?.message || "Sign in failed. This password form uses a WNMU Home account, not GitHub credentials.";
        homeState.authMessage = "";
        renderAuthControls();
      }
    });
    if (resetForm) resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = normalizeEmail(document.getElementById("homeResetEmail")?.value || "");
      if (!email || !email.includes("@")) {
        homeState.authError = "Enter the NMU email address for the account.";
        homeState.authMessage = "";
        renderAuthControls();
        return;
      }
      homeState.authMessage = "Sending password reset email…";
      homeState.authError = "";
      renderAuthControls();
      try {
        const client = await ensureHomeAuthClient();
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
        if (error) throw error;
        homeState.authMessage = "If that account exists, Supabase will email a password reset link.";
        homeState.authError = "";
        setAuthPanel("sign-in");
        renderAuthControls();
      } catch (error) {
        homeState.authError = error?.message || "Password reset email failed.";
        homeState.authMessage = "";
        renderAuthControls();
      }
    });
    if (createForm) createForm.addEventListener("submit", (event) => {
      event.preventDefault();
      homeState.authMessage = "Ask the WNMU Home administrator for a temporary password, then sign in here.";
      homeState.authError = "";
      setAuthPanel("sign-in");
      renderAuthControls();
    });
    if (adminUserCloseButton) adminUserCloseButton.addEventListener("click", () => {
      homeState.adminUserPanelOpen = false;
      homeState.adminUserError = "";
      homeState.adminUserMessage = "";
      renderAdminUserPanel();
    });
    if (refreshAdminUsersButton) refreshAdminUsersButton.addEventListener("click", () => {
      void refreshAdminUsersTable();
    });
    if (generateTempPasswordButton) generateTempPasswordButton.addEventListener("click", () => {
      const field = document.getElementById("homeAdminTempPassword");
      if (field) {
        field.value = generateTempPassword();
        field.select?.();
      }
      homeState.adminUserError = "";
      homeState.adminUserMessage = "Generated a temporary password. Copy it before sending the form or closing this panel.";
      renderAdminUserPanel();
    });
    if (copyTempPasswordButton) copyTempPasswordButton.addEventListener("click", async () => {
      const field = document.getElementById("homeAdminTempPassword");
      const value = String(field?.value || "");
      if (!value) {
        homeState.adminUserError = "Generate or enter a temporary password before copying.";
        homeState.adminUserMessage = "";
        renderAdminUserPanel();
        return;
      }
      try {
        await navigator.clipboard.writeText(value);
        homeState.adminUserError = "";
        homeState.adminUserMessage = "Temporary password copied.";
      } catch (_) {
        field?.select?.();
        homeState.adminUserError = "";
        homeState.adminUserMessage = "Could not copy automatically. The password field is selected so you can copy it.";
      }
      renderAdminUserPanel();
    });
    if (updateRolesCheckbox) updateRolesCheckbox.addEventListener("change", () => {
      setRoleFieldsVisible();
    });
    if (adminUserForm) adminUserForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!isHomeAdmin()) {
        homeState.adminUserError = "Only Home admins can manage users.";
        homeState.adminUserMessage = "";
        renderAdminUserPanel();
        return;
      }
      const loginId = normalizeLoginIdentifier(document.getElementById("homeAdminUserEmail")?.value || "");
      const displayName = normalizeText(document.getElementById("homeAdminDisplayName")?.value || "");
      const temporaryPassword = String(document.getElementById("homeAdminTempPassword")?.value || "");
      const updateRoles = Boolean(document.getElementById("homeAdminUpdateRoles")?.checked);
      if (!loginId || !loginId.includes("@")) {
        homeState.adminUserError = "Enter an NMU email address or an internal username such as student.";
        homeState.adminUserMessage = "";
        renderAdminUserPanel();
        return;
      }
      if (temporaryPassword.length < 8) {
        homeState.adminUserError = "Use at least 8 characters for the temporary password.";
        homeState.adminUserMessage = "";
        renderAdminUserPanel();
        return;
      }
      homeState.adminUserMessage = "Creating or resetting the Supabase user…";
      homeState.adminUserError = "";
      renderAdminUserPanel();
      try {
        const client = await ensureHomeAuthClient();
        const { data, error } = await client.functions.invoke("wnmu-admin-user", {
          body: {
            action: "createOrResetUser",
            email: loginId,
            displayName,
            temporaryPassword,
            updateRoles,
            roles: updateRoles ? adminRolePayload() : {}
          }
        });
        if (error) throw error;
        homeState.adminUserMessage = `${data?.email || loginId} is ready. Give them the temporary password directly.${data?.rolesUpdated ? " Module permissions were updated." : " Existing module permissions were left unchanged."}`;
        homeState.adminUserError = "";
        renderAdminUserPanel();
        void refreshAdminUsersTable();
      } catch (error) {
        homeState.adminUserError = await friendlyFunctionError(error);
        homeState.adminUserMessage = "";
        renderAdminUserPanel();
      }
    });

    if (updateForm) updateForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = String(document.getElementById("homeNewPassword")?.value || "");
      const confirm = String(document.getElementById("homeNewPasswordConfirm")?.value || "");
      if (password.length < 8 || password !== confirm) {
        homeState.authError = password.length < 8 ? "Use at least 8 characters for the new password." : "The password fields do not match.";
        homeState.authMessage = "";
        renderAuthControls();
        return;
      }
      homeState.authMessage = "Saving new password…";
      homeState.authError = "";
      renderAuthControls();
      try {
        const client = await ensureHomeAuthClient();
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        homeState.passwordRecovery = false;
        homeState.authDrawerOpen = false;
        homeState.authMessage = "Password updated.";
        homeState.authError = "";
        updateForm.reset();
        setAuthPanel("sign-in");
        renderAuthControls();
      } catch (error) {
        homeState.authError = error?.message || "Password update failed.";
        homeState.authMessage = "";
        renderAuthControls();
      }
    });
  }
  async function initHomeAuth() {
    bindHomeAuthEvents();
    renderAuthControls();
    try {
      const client = await ensureHomeAuthClient();
      client.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          homeState.passwordRecovery = true;
          homeState.authDrawerOpen = true;
          homeState.authMessage = "Enter a new password for this account.";
          homeState.authError = "";
          setAuthPanel("update");
          renderAuthControls();
        }
        void refreshHomeAuthFromSession(session);
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      await refreshHomeAuthFromSession(data?.session || null);
      homeState.authReady = true;
    } catch (error) {
      console.warn("WNMU Home sign-in setup failed.", error);
      homeState.authError = "Sign in is not available yet.";
      renderAuthControls();
    }
  }

  async function externalRestSelectPaged(cfg, pathAndQuery, maxRows = 5000) {
    const urlRoot = cfg.SUPABASE_URL || cfg.url || "";
    const anonKey = cfg.SUPABASE_ANON_KEY || cfg.anonKey || "";
    if (!urlRoot || !anonKey) throw new Error("External Supabase config is not available.");
    const pageSize = 1000;
    const out = [];
    let offset = 0;
    while (offset < maxRows) {
      const sep = pathAndQuery.includes("?") ? "&" : "?";
      const res = await fetch(`${urlRoot}${pathAndQuery}${sep}limit=${pageSize}&offset=${offset}`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        cache: "no-store"
      });
      if (!res.ok) throw new Error(`External library read failed (${res.status})`);
      const rows = await res.json();
      if (!Array.isArray(rows) || !rows.length) break;
      out.push(...rows);
      if (rows.length < pageSize) break;
      offset += pageSize;
    }
    return out;
  }
  function firstField(row = {}, fields = []) {
    for (const field of fields) {
      const value = normalizeText(row?.[field]);
      if (value) return value;
    }
    return "";
  }
  function compactLibraryTitleText(value) {
    return normalizeText(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "")
      .replace(/&/g, " and ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }
  function stripLeadingArticleFromKey(key = "") {
    return String(key || "").replace(/^(the|a|an)\s+/, "").trim();
  }
  function stripLibrarySeasonSuffix(value = "") {
    const original = normalizeText(value);
    const match = original.match(/(?:^|[\s:;,.\-–—(])(?:s|season)\.?\s*(\d{1,2}|x)\)?\s*$/i);
    if (!match) return { title: original, season: "" };
    const title = original.slice(0, match.index).replace(/[\s:;,.\-–—(]+$/g, "").trim();
    return { title: title || original, season: String(match[1] || "").toLowerCase() };
  }
  function normalizeLibraryTitleKey(value) {
    return stripLeadingArticleFromKey(compactLibraryTitleText(stripLibrarySeasonSuffix(value).title));
  }
  function titleWords(key = "") {
    return String(key || "").split(/\s+/).filter(Boolean);
  }
  function libraryRecordFromRow(row = {}, source = "") {
    const title = firstField(row, ["title", "program_title", "name"]);
    const description = firstField(row, ["notes", "program_notes", "description", "summary"]);
    const rawKey = compactLibraryTitleText(title);
    const stripped = stripLibrarySeasonSuffix(title);
    const baseKeyWithArticle = compactLibraryTitleText(stripped.title);
    const baseKey = stripLeadingArticleFromKey(baseKeyWithArticle);
    if (!title || !description || !baseKey) return null;
    return {
      source,
      title,
      key: stripLeadingArticleFromKey(rawKey),
      rawKey,
      baseKey,
      baseKeyWithArticle,
      words: titleWords(baseKey),
      season: stripped.season,
      description
    };
  }
  function uniqueLibraryMatches(matches = []) {
    const seen = new Set();
    const out = [];
    matches.forEach((item) => {
      if (!item?.description) return;
      const key = `${item.source}|${item.title}|${normalizeLibraryTitleKey(item.description)}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  }
  async function loadProgrammingLibraryRecords() {
    try {
      const cfg = await loadProgrammingConfig();
      const rows = await externalRestSelectPaged(cfg, "/rest/v1/programs_enriched?select=*", 5000);
      return rows.map((row) => libraryRecordFromRow(row, "Program Library")).filter(Boolean);
    } catch (error) {
      console.warn("WNMU Home Programming Library title descriptions failed.", error);
      return [];
    }
  }
  async function loadPledgeLibraryRecordsForDescriptions() {
    try {
      const cfg = await loadPledgeConfig();
      let rows = [];
      try {
        rows = await externalRestSelectPaged(cfg, "/rest/v1/pledge_program_library_summary_v2?select=*", 5000);
      } catch (summaryError) {
        console.warn("WNMU Home Pledge summary description read failed; trying base table.", summaryError);
        rows = await externalRestSelectPaged(cfg, "/rest/v1/pledge_programs_v2?select=*", 5000);
      }
      return rows.map((row) => libraryRecordFromRow(row, "Pledge Library")).filter(Boolean);
    } catch (error) {
      console.warn("WNMU Home Pledge Library title descriptions failed.", error);
      return [];
    }
  }
  async function loadScheduleDescriptionIndex() {
    const results = await Promise.allSettled([loadProgrammingLibraryRecords(), loadPledgeLibraryRecordsForDescriptions()]);
    const records = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    const exact = new Map();
    records.forEach((record) => {
      [record.key, record.rawKey, record.baseKey, record.baseKeyWithArticle]
        .map((key) => stripLeadingArticleFromKey(compactLibraryTitleText(key)))
        .filter(Boolean)
        .forEach((key) => {
          if (!exact.has(key)) exact.set(key, []);
          exact.get(key).push(record);
        });
    });
    return { records, exact, cache: new Map() };
  }
  function seasonFromScheduleEntry(entry = {}, rawTitle = "") {
    const candidates = [
      rawTitle,
      entry.title,
      entry.episode,
      entry.episodeTitle,
      entry.season,
      entry.seasonNumber,
      entry.seasonNum,
      entry.seasonLabel,
      entry.nola,
      entry.nolaCode,
      entry.programCode
    ];
    for (const value of candidates) {
      const text = normalizeText(value);
      if (!text) continue;
      let match = text.match(/\b(?:s|season)\.?\s*(\d{1,2})\b/i);
      if (match) return String(Number(match[1]));
      match = text.match(/^#?(\d)(\d{2})(?:\D|$)/);
      if (match && match[1] !== "0") return String(Number(match[1]));
    }
    return "";
  }
  function tokenPrefixMatch(queryWords = [], recordWords = []) {
    if (!queryWords.length || !recordWords.length) return false;
    if (queryWords.length > recordWords.length) return false;
    for (let index = 0; index < queryWords.length; index += 1) {
      const queryWord = queryWords[index];
      const recordWord = recordWords[index];
      if (!queryWord || !recordWord) return false;
      if (index === queryWords.length - 1 && queryWord.length >= 3) {
        if (!recordWord.startsWith(queryWord)) return false;
      } else if (queryWord !== recordWord) {
        return false;
      }
    }
    return true;
  }
  function scoreLibraryTitleCandidate(record, query, scheduleSeason = "") {
    if (!record || !query?.key) return 0;
    const key = query.key;
    const keyWithArticle = query.keyWithArticle;
    const qWords = query.words;
    let score = 0;

    if (record.key === key || record.rawKey === key || record.baseKey === key || record.baseKeyWithArticle === keyWithArticle) score = Math.max(score, 1200);
    if (record.baseKey === key || record.baseKeyWithArticle === keyWithArticle) score = Math.max(score, 1150);
    if (record.key === key || record.rawKey === keyWithArticle) score = Math.max(score, 1120);

    if (key.length >= 8) {
      if (record.baseKey.startsWith(key) || record.key.startsWith(key)) score = Math.max(score, 930);
      if (key.startsWith(record.baseKey) && record.baseKey.length >= 8) score = Math.max(score, 880);
      if (record.baseKey.includes(` ${key} `) || record.key.includes(` ${key} `)) score = Math.max(score, 760);
    }

    if (qWords.length >= 2 && tokenPrefixMatch(qWords, record.words)) {
      const completeness = Math.min(120, Math.round((qWords.join(" ").length / Math.max(1, record.baseKey.length)) * 120));
      score = Math.max(score, 940 + completeness);
    }

    if (score <= 0) return 0;
    if (scheduleSeason && record.season && record.season !== "x") {
      score += record.season === scheduleSeason ? 160 : -180;
    } else if (record.season && record.season !== "x" && record.baseKey === key) {
      score += 35;
    }
    if (record.source === "Program Library") score += 12;
    return score;
  }
  function makeScheduleTitleQuery(rawTitle = "") {
    const stripped = stripLibrarySeasonSuffix(rawTitle);
    const keyWithArticle = compactLibraryTitleText(stripped.title);
    const key = stripLeadingArticleFromKey(keyWithArticle);
    return { key, keyWithArticle, words: titleWords(key), season: stripped.season };
  }
  function bestLibraryMatchForScheduleTitle(rawTitle = "", entry = {}, index = null) {
    if (!index?.records?.length) return null;
    const query = makeScheduleTitleQuery(rawTitle);
    if (!query.key || query.key.length < 4) return null;
    const scheduleSeason = seasonFromScheduleEntry(entry, rawTitle) || query.season;
    const cacheKey = `${query.key}|${scheduleSeason}|${normalizeText(entry?.episode)}`;
    if (index.cache.has(cacheKey)) return index.cache.get(cacheKey);

    const candidates = uniqueLibraryMatches(index.records
      .map((record) => ({ ...record, _score: scoreLibraryTitleCandidate(record, query, scheduleSeason) }))
      .filter((record) => record._score >= 900)
      .sort((a, b) => b._score - a._score || a.title.localeCompare(b.title)));

    let result = null;
    if (candidates.length) {
      const topScore = candidates[0]._score;
      const close = candidates.filter((candidate) => candidate._score >= topScore - 25);
      const closeUnique = uniqueLibraryMatches(close);
      if (closeUnique.length === 1) {
        result = candidates[0];
      } else if (scheduleSeason) {
        const seasonMatches = closeUnique.filter((candidate) => candidate.season === scheduleSeason || candidate.season === "x");
        if (seasonMatches.length === 1) result = seasonMatches[0];
      } else {
        const exactBase = closeUnique.filter((candidate) => candidate.baseKey === query.key);
        if (exactBase.length === 1) result = exactBase[0];
      }
    }

    index.cache.set(cacheKey, result);
    return result;
  }

  function normalizeSchedule(row = {}) {
    const data = row.schedule_data || {};
    return {
      id: row.id, title: row.title || "", startDate: row.start_date || "", endDate: row.end_date || "",
      placements: Array.isArray(data.placements) ? data.placements : [],
      onlineDollars: Number(data.onlineDollars || 0) || 0,
      mailDollars: Number(data.mailDollars || 0) || 0,
      goalDollars: Number(data.goalDollars || data.goal || 0) || 0,
      meta: data.meta || {}, createdAt: row.created_at || "", updatedAt: row.updated_at || ""
    };
  }
  function getScheduleDateSpanInfo(schedule = {}) {
    const startKey = normalizeText(schedule.startDate);
    const endKey = normalizeText(schedule.endDate);
    const start = toLocalDate(startKey);
    const end = toLocalDate(endKey);
    if (!startKey || !endKey || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return { ok: false };
    return { ok: true };
  }
  function scheduleDriveSummaryWindow(schedule = {}) {
    if (!getScheduleDateSpanInfo(schedule).ok) return { show: false, mode: "", endOfWindow: "" };
    const today = localTodayKey();
    const startKey = normalizeText(schedule.startDate);
    const endKey = normalizeText(schedule.endDate);
    const endOfWindow = plusDays(endKey, 7);
    if (today >= startKey && today <= endKey) return { show: true, mode: "Live drive", endOfWindow };
    if (today > endKey && today <= endOfWindow) return { show: true, mode: "Post-drive week", endOfWindow };
    return { show: false, mode: "", endOfWindow };
  }
  function scheduleStatusLabel(schedule = {}) {
    const today = localTodayKey();
    const startKey = normalizeText(schedule.startDate);
    const endKey = normalizeText(schedule.endDate);
    if (startKey && endKey && today >= startKey && today <= endKey) return "Current fundraiser";
    if (startKey && today < startKey) return "Upcoming fundraiser";
    return "Last fundraiser";
  }
  function sortSchedulesNewestFirst(items = []) {
    return [...items].sort((a, b) => {
      const aKey = `${normalizeText(a.endDate)}|${normalizeText(a.startDate)}|${normalizeText(a.updatedAt || a.createdAt)}`;
      const bKey = `${normalizeText(b.endDate)}|${normalizeText(b.startDate)}|${normalizeText(b.updatedAt || b.createdAt)}`;
      return bKey.localeCompare(aKey);
    });
  }
  function scheduleImportedProgramSpecificTotal(schedule = {}) {
    const metaTotal = Number(schedule?.meta?.importedProgramSpecificBroadcastTotalDollars);
    if (Number.isFinite(metaTotal) && metaTotal > 0) return metaTotal;
    return (schedule?.placements || []).reduce((sum, placement) => sum + (Number.isFinite(Number(placement?.importedBroadcastDollars)) ? Number(placement.importedBroadcastDollars) : 0), 0);
  }
  function scheduleImportedNonSpecificTotal(schedule = {}) {
    const metaTotal = Number(schedule?.meta?.importedNonSpecificBroadcastTotalDollars);
    return Number.isFinite(metaTotal) && metaTotal > 0 ? metaTotal : 0;
  }
  function scheduleImportedAiringTotal(schedule = {}) {
    const metaTotal = Number(schedule?.meta?.importedBroadcastTotalDollars);
    if (Number.isFinite(metaTotal) && metaTotal > 0) return metaTotal;
    const detailedTotal = scheduleImportedProgramSpecificTotal(schedule) + scheduleImportedNonSpecificTotal(schedule);
    return detailedTotal > 0 ? detailedTotal : 0;
  }
  function scheduleReportedBroadcastTotal(schedule = {}) {
    const reportTotal = Number(schedule?.meta?.reportedBroadcastTotalDollars);
    return Number.isFinite(reportTotal) && reportTotal > 0 ? reportTotal : 0;
  }
  function scheduleBroadcastTotal(schedule = {}) {
    const reported = scheduleReportedBroadcastTotal(schedule);
    return reported > 0 ? reported : scheduleImportedAiringTotal(schedule);
  }
  function scheduleImportedPledgesTotal(schedule = {}) {
    const metaTotal = Number(schedule?.meta?.importedPledgesTotal);
    return Number.isFinite(metaTotal) && metaTotal > 0 ? metaTotal : 0;
  }
  function scheduleGrandTotal(schedule = {}) {
    return scheduleBroadcastTotal(schedule) + (Number(schedule.onlineDollars || 0) || 0) + (Number(schedule.mailDollars || 0) || 0);
  }
  function scheduleYear(schedule = {}) {
    const key = normalizeText(schedule.endDate || schedule.startDate);
    const year = Number(key.slice(0, 4));
    return Number.isFinite(year) ? year : 0;
  }
  function scheduleHasStarted(schedule = {}) {
    const startKey = normalizeText(schedule.startDate);
    return Boolean(startKey) && startKey <= localTodayKey();
  }
  function summarizeSchedules(schedules = []) {
    return schedules.reduce((totals, schedule) => {
      totals.goal += Number(schedule.goalDollars || 0) || 0;
      totals.totalRaised += scheduleGrandTotal(schedule);
      totals.pledges += scheduleImportedPledgesTotal(schedule);
      totals.broadcast += scheduleBroadcastTotal(schedule);
      totals.nonSpecific += scheduleImportedNonSpecificTotal(schedule);
      totals.online += Number(schedule.onlineDollars || 0) || 0;
      totals.mail += Number(schedule.mailDollars || 0) || 0;
      return totals;
    }, { goal: 0, totalRaised: 0, pledges: 0, broadcast: 0, nonSpecific: 0, online: 0, mail: 0 });
  }
  function summaryFromSchedule(schedule = {}) {
    return summarizeSchedules(schedule ? [schedule] : []);
  }
  function goalDifferenceTone(value = 0) {
    const num = Number(value || 0) || 0;
    if (num > 0) return "positive";
    if (num < 0) return "negative";
    return "neutral";
  }
  function renderDriveSummaryStatus(message, kind = "loading") {
    const box = document.getElementById("pledgeDriveSummary");
    if (!box) return;
    box.classList.remove("hidden");
    box.innerHTML = `<div class="drive-summary-${kind}">${escapeHtml(message)}</div>`;
  }
  function driveSummaryCards(values = {}, options = {}) {
    const goal = Number(values.goal || 0) || 0;
    const totalRaised = Number(values.totalRaised || 0) || 0;
    const goalDifference = totalRaised - goal;
    const priorityValues = [
      { label: "Goal", value: formatMoney(goal) },
      { label: "Total Raised", value: formatMoney(totalRaised), important: true },
      { label: "Difference", value: formatMoney(goalDifference), tone: goalDifferenceTone(goalDifference), important: true }
    ];
    const secondaryValues = [
      { label: "Pledges", value: formatCount(values.pledges || 0) },
      { label: "Broadcast", value: formatMoney(values.broadcast || 0) },
      { label: "Non-Specific", value: formatMoney(values.nonSpecific || 0) },
      { label: "Online", value: formatMoney(values.online || 0) },
      { label: "Mail", value: formatMoney(values.mail || 0) }
    ];
    const priorityHtml = priorityValues.map((item) => `
      <div class="drive-summary-priority-card ${item.important ? "important" : ""} ${item.tone ? `goal-difference-card goal-difference-${item.tone}` : ""}">
        <div class="drive-summary-label">${escapeHtml(item.label)}</div>
        <div class="drive-summary-value ${item.tone ? `goal-difference-value goal-difference-${item.tone}` : ""}">${escapeHtml(item.value)}</div>
      </div>`).join("");
    const secondaryHtml = secondaryValues.map((item) => `
      <div class="drive-summary-secondary-card">
        <div class="drive-summary-label">${escapeHtml(item.label)}</div>
        <div class="drive-summary-value">${escapeHtml(item.value)}</div>
      </div>`).join("");
    return `
      <div class="drive-summary-priority-row drive-summary-priority-row-top">${priorityHtml}</div>
      <div class="drive-summary-secondary-grid">${secondaryHtml}</div>`;
  }
  function renderDriveSummary(lastSchedule, ytdSchedules = []) {
    const box = document.getElementById("pledgeDriveSummary");
    if (!box) return;
    if (!lastSchedule && !ytdSchedules.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }

    const year = new Date().getFullYear();
    const lastTitle = lastSchedule ? [scheduleStatusLabel(lastSchedule), lastSchedule.title || "Loaded fundraiser"].filter(Boolean).join(" — ") : "Last fundraiser";
    const lastDate = lastSchedule ? `${formatDate(lastSchedule.startDate)} – ${formatDate(lastSchedule.endDate)}` : "No fundraiser loaded";
    const lastHtml = lastSchedule ? driveSummaryCards(summaryFromSchedule(lastSchedule)) : `<div class="drive-summary-loading">No fundraiser records found.</div>`;
    const ytdTotals = summarizeSchedules(ytdSchedules);
    const ytdDate = ytdSchedules.length ? `${formatCount(ytdSchedules.length)} fundraiser${ytdSchedules.length === 1 ? "" : "s"} included` : "No current-year fundraisers yet";
    const ytdHtml = ytdSchedules.length ? driveSummaryCards(ytdTotals) : `<div class="drive-summary-loading">No current-year fundraiser totals found yet.</div>`;

    box.innerHTML = `
      <div class="drive-summary-kicker">Pledge totals</div>
      <div class="drive-summary-sections">
        <section class="drive-summary-block" aria-label="Last fundraiser totals">
          <div class="drive-summary-block-head">
            <div class="drive-summary-title">${escapeHtml(lastTitle)}</div>
            <div class="drive-summary-date">${escapeHtml(lastDate)}</div>
          </div>
          ${lastHtml}
        </section>
        <section class="drive-summary-block" aria-label="Year-to-date fundraiser totals">
          <div class="drive-summary-block-head">
            <div class="drive-summary-title">Year to date — ${escapeHtml(String(year))}</div>
            <div class="drive-summary-date">${escapeHtml(ytdDate)}</div>
          </div>
          ${ytdHtml}
        </section>
      </div>`;
    box.classList.remove("hidden");
  }
  async function loadPledgeDriveSummary() {
    const box = document.getElementById("pledgeDriveSummary");
    if (!box) return;
    if (!canSeePledgeSummary()) {
      hidePledgeDriveSummary();
      return;
    }
    renderDriveSummaryStatus("Checking pledge totals…");
    try {
      const cfg = await loadPledgeConfig();
      if (!canSeePledgeSummary()) {
        hidePledgeDriveSummary();
        return;
      }
      const rows = await restSelect(cfg, "/rest/v1/pledge_fundraiser_schedules?select=*&order=start_date.asc&order=title.asc");
      if (!canSeePledgeSummary()) {
        hidePledgeDriveSummary();
        return;
      }
      const schedules = sortSchedulesNewestFirst((Array.isArray(rows) ? rows : []).map(normalizeSchedule));
      const started = schedules.filter(scheduleHasStarted);
      const lastSchedule = started[0] || schedules[0] || null;
      const currentYear = new Date().getFullYear();
      const ytdSchedules = schedules.filter((schedule) => scheduleHasStarted(schedule) && scheduleYear(schedule) === currentYear);
      renderDriveSummary(lastSchedule, sortSchedulesNewestFirst(ytdSchedules));
    } catch (error) {
      console.warn("WNMU Home pledge totals failed.", error);
      renderDriveSummaryStatus("Pledge totals could not load here. Open the Pledge Library / Scheduler for the full current view.", "error");
    }
  }

  function normalizeMonthlySchedule(raw) {
    if (!raw || typeof raw !== "object") return { days: [], weeks: [] };
    (raw.days || []).forEach((day) => {
      const dayName = day.dayName || day.day || toLocalDate(day.date).toLocaleDateString("en-US", { weekday: "long" });
      day.dayName = dayName;
      day.day = day.day || dayName;
      (day.entries || []).forEach((entry) => {
        entry.date = entry.date || day.date;
        entry.dayName = entry.dayName || entry.day || dayName;
        entry.day = entry.day || entry.dayName;
      });
    });
    return raw;
  }
  function entriesFromSchedule(schedule = {}) {
    const out = [];
    (schedule.days || []).forEach((day) => {
      (day.entries || []).forEach((entry) => {
        if (!entry?.time || !entry?.title) return;
        const item = { ...entry, date: entry.date || day.date, dayName: entry.dayName || entry.day || day.dayName || day.day || "" };
        item.durationMin = durationForEntry(item);
        item._entryKey = buildMonthlyEntryKey(item);
        out.push(item);
      });
    });
    return out.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  }
  function entryOverlapsWindow(entry, startTime, endTime) {
    const start = timeToMinutes(entry.time);
    const end = start + durationForEntry(entry);
    return start < timeToMinutes(endTime) && end > timeToMinutes(startTime);
  }
  function isInternalEpisodeCode(value) {
    return /^#[A-Z0-9]+$/i.test(String(value || "").trim());
  }
  function entryEpisodeText(entry = {}) {
    const bits = [];
    const episode = normalizeText(entry.episode);
    if (episode && !isInternalEpisodeCode(episode)) bits.push(episode);
    const duration = durationForEntry(entry);
    if (duration) bits.push(`${duration} min`);
    return bits.join(" • ");
  }
  function schedulePageUrl(monthKey) {
    const query = monthKey ? `?month=${encodeURIComponent(monthKey)}&v=${encodeURIComponent(PORTAL_VERSION)}` : `?v=${encodeURIComponent(PORTAL_VERSION)}`;
    return `${MONTHLY_APP_ROOT}/${MONTHLY_PAGE}${query}`;
  }
  function markPayload(raw = {}) {
    return raw?.mark_json && typeof raw.mark_json === "object" ? raw.mark_json : (raw || {});
  }
  function normalizedTagKey(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }
  function tagIsActiveInPayload(raw = {}, tagKey) {
    const source = markPayload(raw);
    return source?.tags?.[tagKey] === true || source?.[tagKey] === true;
  }
  function entryHasEmbeddedTag(entry = {}, tagKey) {
    if (entry?.[tagKey] === true) return true;
    if (entry?.tags?.[tagKey] === true) return true;
    if (Array.isArray(entry.tags)) {
      const wanted = normalizedTagKey(tagKey);
      return entry.tags.some((tag) => normalizedTagKey(tag) === wanted);
    }
    return false;
  }
  function entryWeekday(entry = {}) {
    if (entry.dayName || entry.day) return normalizeText(entry.dayName || entry.day);
    const date = toLocalDate(entry.date || "");
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", { weekday: "long" });
  }
  function timeInRangeInclusive(timeStr, startTime, endTime) {
    const time = timeToMinutes(timeStr);
    return time >= timeToMinutes(startTime) && time <= timeToMinutes(endTime);
  }
  function isSuppressedNewSeriesSlot(entry = {}) {
    const weekday = entryWeekday(entry);
    if (timeInRangeInclusive(entry.time, "01:00", "07:00")) return true;
    if (["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(weekday) && timeInRangeInclusive(entry.time, "08:30", "15:00")) return true;
    return false;
  }
  function entryHasAutoFeatureTag(entry = {}, tagKey) {
    if (tagKey === "newSeries") return !!entry.seasonStart && !isSuppressedNewSeriesSlot(entry);
    if (tagKey === "programmersChoice") {
      const weekday = entryWeekday(entry);
      return (weekday === "Sunday" && entry.time === "19:00") || (weekday === "Saturday" && entry.time === "20:00");
    }
    return false;
  }
  function featuredTagLabelsForEntry(entry = {}, mark = {}) {
    return FEATURED_MONTHLY_TAGS
      .filter((tag) => tagIsActiveInPayload(mark, tag.key) || entryHasEmbeddedTag(entry, tag.key) || entryHasAutoFeatureTag(entry, tag.key))
      .map((tag) => tag.label);
  }
  function entryKeyDateTime(entryKey = "") {
    const match = String(entryKey || "").match(/^(\d{4}-\d{2}-\d{2})__(\d{2}:\d{2})__/);
    return match ? `${match[1]}__${match[2]}` : "";
  }
  function entryDateTime(entry = {}) {
    return `${entry.date || ""}__${entry.time || ""}`;
  }
  function markLooksUsefulForHome(mark = {}) {
    return !!boxNoteTextFromMark(mark) || FEATURED_MONTHLY_TAGS.some((tag) => tagIsActiveInPayload(mark, tag.key));
  }
  function findMarkForEntry(entry = {}, marksMap) {
    if (!(marksMap instanceof Map)) return {};
    const exact = marksMap.get(entry._entryKey);
    if (exact && markLooksUsefulForHome(exact)) return exact;
    const wantedDateTime = entryDateTime(entry);
    for (const [entryKey, mark] of marksMap.entries()) {
      if (entryKeyDateTime(entryKey) === wantedDateTime && markLooksUsefulForHome(mark)) return mark || {};
    }
    return exact || {};
  }
  async function getMonthlyCurrentMonth(cfg) {
    const rows = await monthlyRestSelect(cfg, `/rest/v1/wnmu_monthly_schedules_current_months?select=channel_code,month_key&channel_code=eq.${encodeURIComponent(MONTHLY_CHANNEL)}&limit=1`);
    const current = Array.isArray(rows) ? rows[0]?.month_key : "";
    if (current) return current;
    const latestRows = await monthlyRestSelect(cfg, `/rest/v1/wnmu_monthly_schedules_imported_months?select=channel_code,month_key&channel_code=eq.${encodeURIComponent(MONTHLY_CHANNEL)}&order=month_key.desc&limit=1`);
    return Array.isArray(latestRows) ? (latestRows[0]?.month_key || "") : "";
  }
  async function getMonthlyScheduleRowOrNull(cfg, monthKey) {
    if (!monthKey) return null;
    const select = "channel_code,channel_label,month_key,label,page_title,storage_key,schedule_json,updated_at,published_at";
    const rows = await monthlyRestSelect(cfg, `/rest/v1/wnmu_monthly_schedules_imported_months?select=${select}&channel_code=eq.${encodeURIComponent(MONTHLY_CHANNEL)}&month_key=eq.${encodeURIComponent(monthKey)}&limit=1`);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }
  function boxNoteTextFromMark(mark = {}) {
    const source = markPayload(mark);
    const text = normalizeText(source?.rectNote?.text || source?.note || source?.whiteout?.text || "");
    if (!text || text.startsWith("__WNMU_NOTE__")) return "";
    return text;
  }
  function displayTitleForEntry(entry = {}, mark = {}) {
    return boxNoteTextFromMark(mark) || entry.title || "";
  }
  function decorateScheduleEntry(entry, marksMap, timeLabel, descriptionIndex = null) {
    const mark = findMarkForEntry(entry, marksMap);
    const displayTitle = displayTitleForEntry(entry, mark);
    const libraryMatch = bestLibraryMatchForScheduleTitle(displayTitle, entry, descriptionIndex) || bestLibraryMatchForScheduleTitle(entry.title, entry, descriptionIndex);
    return {
      ...entry,
      title: displayTitle,
      _timeLabel: timeLabel,
      _meta: entryEpisodeText(entry),
      _tags: featuredTagLabelsForEntry(entry, mark),
      _description: libraryMatch?.description || "",
      _libraryTitle: libraryMatch?.title || "",
      _librarySource: libraryMatch?.source || ""
    };
  }
  async function getMonthlySharedMarks(cfg, monthKey) {
    try {
      const rows = await monthlyRestSelect(cfg, `/rest/v1/wnmu_monthly_schedules_shared_marks?select=entry_key,mark_json&channel_code=eq.${encodeURIComponent(MONTHLY_CHANNEL)}&month_key=eq.${encodeURIComponent(monthKey)}&limit=2000`);
      const marks = new Map();
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        if (row?.entry_key) marks.set(row.entry_key, row.mark_json || {});
      });
      return marks;
    } catch (error) {
      console.warn("WNMU Home monthly shared marks failed.", error);
      return new Map();
    }
  }
  function getMonthlyLocalMarks(row = {}) {
    const storageKey = normalizeText(row.storage_key);
    if (!storageKey) return new Map();
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      const marks = new Map();
      Object.entries(parsed && typeof parsed === "object" ? parsed : {}).forEach(([entryKey, value]) => {
        if (entryKey && value && typeof value === "object" && markLooksUsefulForHome(value)) marks.set(entryKey, value);
      });
      return marks;
    } catch (error) {
      console.warn("WNMU Home monthly local marks read failed.", error);
      return new Map();
    }
  }
  async function getMonthlyMarks(cfg, row = {}) {
    const marks = await getMonthlySharedMarks(cfg, row.month_key);
    for (const [entryKey, value] of getMonthlyLocalMarks(row).entries()) marks.set(entryKey, value);
    return marks;
  }
  function renderScheduleList(entries, className = "schedule-list") {
    const isHighlightsList = String(className || "").includes("highlights-list");
    return `<ul class="${className}">${entries.map((entry) => {
      const tooltip = entry._description ? [entry._libraryTitle || "", entry._description].filter(Boolean).join("\n\n") : "";
      const descriptionAttr = tooltip ? ` title="${escapeHtml(tooltip)}" aria-label="${escapeHtml(`${entry.title}. ${tooltip}`)}"` : "";
      const titleClass = `schedule-program-title${entry._description ? " has-library-description" : ""}`;
      const tagsHtml = entry._tags?.length ? `<span class="schedule-tag-row-inline">${entry._tags.map((tag) => `<span class="schedule-feature-tag">${escapeHtml(tag)}</span>`).join("")}</span>` : "";
      const metaHtml = entry._meta ? `<span class="schedule-program-meta-text">${escapeHtml(entry._meta)}</span>` : "";
      const combinedMeta = tagsHtml || metaHtml ? `<div class="schedule-program-meta schedule-program-meta-line">${tagsHtml}${metaHtml}</div>` : "";
      if (isHighlightsList) {
        return `
      <li class="schedule-list-item schedule-list-item--highlight">
        <div class="schedule-highlight-topline">
          <div class="schedule-time">${escapeHtml(entry._timeLabel)}</div>
          ${combinedMeta}
        </div>
        <div class="${titleClass}"${descriptionAttr}>${escapeHtml(entry.title)}</div>
      </li>`;
      }
      return `
      <li class="schedule-list-item">
        <div class="schedule-time">${escapeHtml(entry._timeLabel)}</div>
        <div>
          <div class="${titleClass}"${descriptionAttr}>${escapeHtml(entry.title)}</div>
          ${combinedMeta}
        </div>
      </li>`;
    }).join("")}</ul>`;
  }
  function renderScheduleSummaryStatus(message) {
    const box = document.getElementById("homeScheduleSummary");
    if (!box) return;
    box.classList.remove("hidden");
    box.innerHTML = `<div class="schedule-loading">${escapeHtml(message)}</div>`;
  }
  function primeDayHeading(index, dateKey) {
    const dateLabel = formatDateShort(dateKey);
    if (index === 0) return `Today • ${dateLabel}`;
    if (index === 1) return `Tomorrow • ${dateLabel}`;
    return dateLabel;
  }
  function renderPrimeDayGroup(day = {}, index = 0) {
    const label = day.label || primeDayHeading(index, day.dateKey);
    const empty = day.row
      ? `No prime time listings are scheduled for ${label}.`
      : `No 13.1 listings are available for ${label}.`;
    const listHtml = day.entries?.length ? renderScheduleList(day.entries) : `<div class="schedule-empty schedule-empty-compact">${escapeHtml(empty)}</div>`;
    return `
      <section class="schedule-prime-day">
        <h4>${escapeHtml(label)}</h4>
        ${listHtml}
      </section>`;
  }
  function renderHomeScheduleSummary(payload) {
    const box = document.getElementById("homeScheduleSummary");
    if (!box) return;
    if (!payload) { box.classList.add("hidden"); box.innerHTML = ""; return; }

    const highlightLabel = `${formatMonthLabel(payload.todayMonthKey)} and ${formatMonthLabel(payload.nextMonthKey)}`;
    const primeDays = Array.isArray(payload.primeDays) ? payload.primeDays : [];
    const primeDaysHtml = primeDays.length
      ? primeDays.map((day, index) => renderPrimeDayGroup(day, index)).join("")
      : `<div class="schedule-empty">No 13.1 listings are available for the next seven days.</div>`;
    const highlightsHtml = payload.highlights.length ? renderScheduleList(payload.highlights, "schedule-list highlights-list") : `<div class="schedule-empty">No monthly highlights are selected for this month or next month.</div>`;

    box.innerHTML = `
      <div class="schedule-panel-head">
        <div>
          <div class="schedule-kicker">WNMU 13.1 schedule</div>
          <h2 class="schedule-title">Prime time and monthly highlights</h2>
        </div>
        <a class="schedule-open-link" href="${escapeHtml(schedulePageUrl(payload.todayMonthKey))}" target="_blank" rel="noopener noreferrer">Open full schedule</a>
      </div>
      <div class="schedule-content-grid schedule-content-grid-home">
        <div class="schedule-prime-stack">
          <section class="schedule-block schedule-block-prime schedule-block-prime-week">
            <h3>Prime time next 7 days</h3>
            ${primeDaysHtml}
          </section>
        </div>
        <section class="schedule-block schedule-block-highlights">
          <h3>Monthly highlights <span class="schedule-month-range">${escapeHtml(highlightLabel)}</span></h3>
          ${highlightsHtml}
        </section>
      </div>`;
    box.classList.remove("hidden");
  }
  async function loadHomeScheduleSummary() {
    const box = document.getElementById("homeScheduleSummary");
    if (!box) return;
    renderScheduleSummaryStatus("Loading WNMU 13.1 schedule…");
    try {
      const cfg = await loadMonthlyConfig();
      const descriptionIndexPromise = loadScheduleDescriptionIndex().catch((error) => {
        console.warn("WNMU Home library description lookup skipped.", error);
        return null;
      });
      const todayKey = localTodayKey();
      const primeDayKeys = Array.from({ length: PRIME_DAY_COUNT }, (_, index) => plusDays(todayKey, index));
      const todayMonthKey = monthKeyFromDateKey(todayKey);
      const nextHighlightMonthKey = nextMonthKey(todayMonthKey);
      const neededMonthKeys = [...new Set([...primeDayKeys.map(monthKeyFromDateKey), todayMonthKey, nextHighlightMonthKey].filter(Boolean))];

      const monthRows = new Map();
      for (const monthKey of neededMonthKeys) {
        if (!monthRows.has(monthKey)) monthRows.set(monthKey, await getMonthlyScheduleRowOrNull(cfg, monthKey));
      }

      const anyScheduleRow = [...monthRows.values()].some(Boolean);
      const todayRow = monthRows.get(todayMonthKey) || null;
      const nextHighlightRow = monthRows.get(nextHighlightMonthKey) || null;
      if (!anyScheduleRow) throw new Error("No imported monthly schedule is available.");

      const entriesByMonth = new Map();
      for (const [monthKey, row] of monthRows.entries()) {
        entriesByMonth.set(monthKey, row ? entriesFromSchedule(normalizeMonthlySchedule(row.schedule_json || {})) : []);
      }

      const sharedMarksByMonth = new Map();
      for (const [monthKey, row] of monthRows.entries()) {
        if (row) sharedMarksByMonth.set(monthKey, await getMonthlyMarks(cfg, row));
      }

      const descriptionIndex = await descriptionIndexPromise;
      const primeDays = primeDayKeys.map((dateKey, index) => {
        const monthKey = monthKeyFromDateKey(dateKey);
        const row = monthRows.get(monthKey) || null;
        const entries = entriesByMonth.get(monthKey) || [];
        const marks = sharedMarksByMonth.get(monthKey) || new Map();
        const dayEntries = entries
          .filter((entry) => entry.date === dateKey && entryOverlapsWindow(entry, PRIME_START, PRIME_END))
          .map((entry) => decorateScheduleEntry(entry, marks, formatTime(entry.time), descriptionIndex));
        return { dateKey, label: primeDayHeading(index, dateKey), row, entries: dayEntries };
      });

      const highlightRows = [
        [todayMonthKey, todayRow],
        [nextHighlightMonthKey, nextHighlightRow]
      ].filter(([monthKey, row], index, arr) => monthKey && row && arr.findIndex(([seenMonth]) => seenMonth === monthKey) === index);

      const highlightGroups = await Promise.all(highlightRows.map(async ([monthKey, row]) => {
        const marks = sharedMarksByMonth.get(monthKey) || await getMonthlyMarks(cfg, row);
        const entries = entriesByMonth.get(monthKey) || entriesFromSchedule(normalizeMonthlySchedule(row.schedule_json || {}));
        return entries
          .filter((entry) => featuredTagLabelsForEntry(entry, findMarkForEntry(entry, marks)).length > 0)
          .map((entry) => decorateScheduleEntry(entry, marks, `${formatDateShort(entry.date)} • ${formatTime(entry.time)}`, descriptionIndex));
      }));
      const highlights = highlightGroups.flat()
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
        .slice(0, MAX_HIGHLIGHTS);

      renderHomeScheduleSummary({ todayRow, todayMonthKey, nextMonthKey: nextHighlightMonthKey, primeDays, highlights });
    } catch (error) {
      console.warn("WNMU Home schedule summary failed.", error);
      renderHomeScheduleSummary(null);
    }
  }

  function init() {
    document.title = `WNMU Home • ${PORTAL_VERSION}`;
    renderHomeShell();
    hidePledgeDriveSummary();
    startVersionChecks();
    void initHomeAuth();
    void loadHomeScheduleSummary();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
