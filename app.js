(() => {
  "use strict";

  const PORTAL_VERSION = "v1.0.6-r2026-06-10";
  const OWNER_PAGES_ROOT = "https://tpoirier1969.github.io";
  const PLEDGE_APP_ROOT = `${OWNER_PAGES_ROOT}/WNMU-Fundraising-library-and-data`;
  const NEW_TAB_ATTRS = { target: "_blank", rel: "noopener noreferrer" };

  const apps = [
    {
      title: "Programming Library",
      description: "Program titles, rights, topics, and reference data.",
      url: `${OWNER_PAGES_ROOT}/WNMU-Programming-library/`,
      accent: "#315f8c",
      tagBg: "#e4eef8",
      tagText: "#315f8c",
      tags: []
    },
    {
      title: "Pledge Library / Scheduler",
      description: "Pledge program library, scheduler, and drive tools.",
      url: `${PLEDGE_APP_ROOT}/`,
      accent: "#376d5c",
      tagBg: "#e4f1ed",
      tagText: "#376d5c",
      tags: []
    },
    {
      title: "Monthly Schedules",
      description: "Monthly imports, channel grids, and schedule review.",
      url: `${OWNER_PAGES_ROOT}/WNMU-monthly-schedules/`,
      accent: "#62517e",
      tagBg: "#ece7f4",
      tagText: "#62517e",
      tags: []
    },
    {
      title: "Monthly Sales View",
      description: "Monthly schedule grouped for sales categories.",
      url: `${OWNER_PAGES_ROOT}/WNMU-monthly-schedules/sales-export.v1.5.72.html`,
      accent: "#7a612a",
      tagBg: "#f5ecd4",
      tagText: "#7a612a",
      tags: []
    }
  ];

  function applyNewTabAttributes(link) {
    link.target = NEW_TAB_ATTRS.target;
    link.rel = NEW_TAB_ATTRS.rel;
    return link;
  }

  function renderAppCard(app) {
    const card = document.createElement("article");
    card.className = "app-card";
    card.style.setProperty("--accent", app.accent);
    card.style.setProperty("--tag-bg", app.tagBg);
    card.style.setProperty("--tag-text", app.tagText);

    const heading = document.createElement("h2");
    heading.textContent = app.title;

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
    applyNewTabAttributes(open);
    actions.appendChild(open);

    if (app.fallbackUrl) {
      const fallback = document.createElement("a");
      fallback.className = "button secondary";
      fallback.href = app.fallbackUrl;
      fallback.textContent = "Open app home";
      fallback.setAttribute("aria-label", `Open ${app.title} home page in a new tab`);
      applyNewTabAttributes(fallback);
      actions.appendChild(fallback);
    }

    bodyRow.append(description, actions);

    const meta = document.createElement("div");
    meta.className = "app-card__meta";
    (app.tags || []).forEach((label) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = label;
      meta.appendChild(tag);
    });

    card.append(heading, bodyRow);
    if (meta.children.length) card.appendChild(meta);
    return card;
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function formatMoney(value) {
    const num = Number(value || 0) || 0;
    return num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }

  function formatCount(value) {
    const num = Number(value || 0) || 0;
    return Math.round(num).toLocaleString("en-US");
  }

  function formatDate(dateKey) {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey || "—";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function dateKeyFromDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function localTodayKey() {
    return dateKeyFromDate(new Date());
  }

  function plusDays(dateKey, days) {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey || "";
    date.setDate(date.getDate() + Number(days || 0));
    return dateKeyFromDate(date);
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
    if (!window.PLEDGE_MANAGER_CONFIG) {
      await loadScript(`${PLEDGE_APP_ROOT}/config.js?portal=${encodeURIComponent(PORTAL_VERSION)}&t=${Date.now()}`);
    }
    const cfg = window.PLEDGE_MANAGER_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      throw new Error("Pledge Library config is not available yet.");
    }
    return cfg;
  }

  async function restSelect(cfg, pathAndQuery) {
    const res = await fetch(`${cfg.SUPABASE_URL}${pathAndQuery}`, {
      headers: {
        apikey: cfg.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`
      },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`Supabase read failed (${res.status})`);
    return res.json();
  }

  function normalizeSchedule(row = {}) {
    const data = row.schedule_data || {};
    return {
      id: row.id,
      title: row.title || "",
      startDate: row.start_date || "",
      endDate: row.end_date || "",
      placements: Array.isArray(data.placements) ? data.placements : [],
      onlineDollars: Number(data.onlineDollars || 0) || 0,
      mailDollars: Number(data.mailDollars || 0) || 0,
      goalDollars: Number(data.goalDollars || data.goal || 0) || 0,
      meta: data.meta || {},
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    };
  }

  function getScheduleDateSpanInfo(schedule = {}) {
    const startKey = normalizeText(schedule.startDate);
    const endKey = normalizeText(schedule.endDate);
    if (!startKey || !endKey) return { ok: false };
    const start = new Date(`${startKey}T00:00:00`);
    const end = new Date(`${endKey}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return { ok: false };
    return { ok: true };
  }

  function scheduleDriveSummaryWindow(schedule = {}) {
    const span = getScheduleDateSpanInfo(schedule);
    if (!span.ok) return { show: false, mode: "", endOfWindow: "" };
    const today = localTodayKey();
    const startKey = normalizeText(schedule.startDate);
    const endKey = normalizeText(schedule.endDate);
    const endOfWindow = plusDays(endKey, 7);
    if (today >= startKey && today <= endKey) return { show: true, mode: "Live drive", endOfWindow };
    if (today > endKey && today <= endOfWindow) return { show: true, mode: "Post-drive week", endOfWindow };
    return { show: false, mode: "", endOfWindow };
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
    return (schedule?.placements || []).reduce((sum, placement) => {
      const value = Number(placement?.importedBroadcastDollars);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
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

  function goalDifferenceTone(value = 0) {
    const num = Number(value || 0) || 0;
    if (num > 0) return "positive";
    if (num < 0) return "negative";
    return "neutral";
  }

  function renderDriveSummary(schedule) {
    const box = document.getElementById("pledgeDriveSummary");
    if (!box) return;
    if (!schedule) {
      box.classList.add("hidden");
      box.innerHTML = "";
      return;
    }

    const windowInfo = scheduleDriveSummaryWindow(schedule);
    const driveTitle = [windowInfo.mode, schedule.title || "Loaded fundraiser"].filter(Boolean).join(" — ");
    const goal = Number(schedule.goalDollars || 0) || 0;
    const totalRaised = scheduleGrandTotal(schedule);
    const goalDifference = totalRaised - goal;
    const priorityValues = [
      { label: "Goal", value: formatMoney(goal) },
      { label: "Total Raised", value: formatMoney(totalRaised), important: true },
      { label: "Difference", value: formatMoney(goalDifference), tone: goalDifferenceTone(goalDifference), important: true }
    ];
    const secondaryValues = [
      { label: "Pledges", value: formatCount(scheduleImportedPledgesTotal(schedule)) },
      { label: "Broadcast", value: formatMoney(scheduleBroadcastTotal(schedule)) },
      { label: "Non-Specific", value: formatMoney(scheduleImportedNonSpecificTotal(schedule)) },
      { label: "Online", value: formatMoney(Number(schedule.onlineDollars || 0) || 0) },
      { label: "Mail", value: formatMoney(Number(schedule.mailDollars || 0) || 0) }
    ];

    const priorityHtml = priorityValues.map((item) => `
      <div class="drive-summary-priority-card ${item.important ? "important" : ""} ${item.tone ? `goal-difference-card goal-difference-${item.tone}` : ""}">
        <div class="drive-summary-label">${escapeHtml(item.label)}</div>
        <div class="drive-summary-value ${item.tone ? `goal-difference-value goal-difference-${item.tone}` : ""}">${escapeHtml(item.value)}</div>
      </div>
    `).join("");

    const secondaryHtml = secondaryValues.map((item) => `
      <div class="drive-summary-secondary-card">
        <div class="drive-summary-label">${escapeHtml(item.label)}</div>
        <div class="drive-summary-value">${escapeHtml(item.value)}</div>
      </div>
    `).join("");

    box.innerHTML = `
      <div class="drive-summary-head drive-summary-head-priority">
        <div class="drive-summary-title-wrap">
          <div class="drive-summary-kicker">Pledge drive snapshot</div>
          <div class="drive-summary-title-line drive-summary-title-line-priority">
            <span class="drive-summary-title">${escapeHtml(driveTitle)}</span>
            <div class="drive-summary-priority-row">${priorityHtml}</div>
          </div>
        </div>
        <div class="drive-summary-date">${escapeHtml(formatDate(schedule.startDate))} – ${escapeHtml(formatDate(schedule.endDate))}</div>
      </div>
      <div class="drive-summary-secondary-grid">${secondaryHtml}</div>
    `;
    box.classList.remove("hidden");
  }

  function renderDriveSummaryStatus(message, kind = "loading") {
    const box = document.getElementById("pledgeDriveSummary");
    if (!box) return;
    box.classList.remove("hidden");
    box.innerHTML = `<div class="drive-summary-${kind}">${escapeHtml(message)}</div>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function loadPledgeDriveSummary() {
    const box = document.getElementById("pledgeDriveSummary");
    if (!box) return;
    renderDriveSummaryStatus("Checking current pledge drive totals…");
    try {
      const cfg = await loadPledgeConfig();
      const rows = await restSelect(cfg, "/rest/v1/pledge_fundraiser_schedules?select=*&order=start_date.asc&order=title.asc");
      const schedules = sortSchedulesNewestFirst((Array.isArray(rows) ? rows : []).map(normalizeSchedule));
      const current = schedules.find((schedule) => scheduleDriveSummaryWindow(schedule).show) || null;
      renderDriveSummary(current);
    } catch (error) {
      console.warn("WNMU Home pledge drive summary failed.", error);
      renderDriveSummaryStatus("Pledge drive snapshot could not load here. Open the Pledge Library / Scheduler for the full current view.", "error");
    }
  }

  function init() {
    const grid = document.querySelector("[data-app-grid]");
    if (grid) {
      grid.textContent = "";
      apps.forEach((app) => grid.appendChild(renderAppCard(app)));
    }
    document.title = `WNMU Home • ${PORTAL_VERSION}`;
    void loadPledgeDriveSummary();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
