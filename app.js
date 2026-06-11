(() => {
  "use strict";

  const PORTAL_VERSION = "v1.0.15-r2026-06-11";
  const OWNER_PAGES_ROOT = "https://tpoirier1969.github.io";
  const PLEDGE_APP_ROOT = `${OWNER_PAGES_ROOT}/WNMU-Fundraising-library-and-data`;
  const PROGRAMMING_APP_ROOT = `${OWNER_PAGES_ROOT}/WNMU-Programming-library`;
  const MONTHLY_APP_ROOT = `${OWNER_PAGES_ROOT}/WNMU-monthly-schedules`;
  const MONTHLY_CHANNEL = "13.1";
  const MONTHLY_PAGE = "index131.v1.4.1.html";
  const PRIME_START = "19:00";
  const PRIME_END = "23:00";
  const MAX_HIGHLIGHTS = 999;
  const FEATURED_MONTHLY_TAGS = [
    { key: "highlight", label: "Highlight" },
    { key: "newSeries", label: "New Series" },
    { key: "holiday", label: "Holiday" },
    { key: "programmersChoice", label: "Programmer's Choice" },
    { key: "fundraiser", label: "Fundraiser" }
  ];
  const NEW_TAB_ATTRS = { target: "_blank", rel: "noopener noreferrer" };

  const apps = [
    { title: "Programming Library", description: "Program titles, rights, topics, and reference data.", url: `${OWNER_PAGES_ROOT}/WNMU-Programming-library/`, accent: "#315f8c", tagBg: "#e4eef8", tagText: "#315f8c", tags: [] },
    { title: "Pledge Library / Scheduler", description: "Pledge program library, scheduler, and drive tools.", url: `${PLEDGE_APP_ROOT}/`, accent: "#376d5c", tagBg: "#e4f1ed", tagText: "#376d5c", tags: [] },
    { title: "Monthly Schedules", description: "Monthly imports, channel grids, and schedule review.", url: `${MONTHLY_APP_ROOT}/`, accent: "#62517e", tagBg: "#ece7f4", tagText: "#62517e", tags: [] },
    { title: "Monthly Sales View", description: "Monthly schedule grouped for sales categories.", url: `${MONTHLY_APP_ROOT}/sales-export.v1.5.72.html`, accent: "#7a612a", tagBg: "#f5ecd4", tagText: "#7a612a", tags: [] }
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
    actions.appendChild(applyNewTabAttributes(open));

    if (app.fallbackUrl) {
      const fallback = document.createElement("a");
      fallback.className = "button secondary";
      fallback.href = app.fallbackUrl;
      fallback.textContent = "Open app home";
      fallback.setAttribute("aria-label", `Open ${app.title} home page in a new tab`);
      actions.appendChild(applyNewTabAttributes(fallback));
    }

    bodyRow.append(description, actions);
    card.append(heading, bodyRow);

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
  function renderDriveSummary(schedule) {
    const box = document.getElementById("pledgeDriveSummary");
    if (!box) return;
    if (!schedule) { box.classList.add("hidden"); box.innerHTML = ""; return; }

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
      </div>`).join("");
    const secondaryHtml = secondaryValues.map((item) => `
      <div class="drive-summary-secondary-card">
        <div class="drive-summary-label">${escapeHtml(item.label)}</div>
        <div class="drive-summary-value">${escapeHtml(item.value)}</div>
      </div>`).join("");
    box.innerHTML = `
      <div class="drive-summary-head drive-summary-head-priority drive-summary-head-compact">
        <div class="drive-summary-title-wrap">
          <div class="drive-summary-kicker">Pledge drive snapshot</div>
          <div class="drive-summary-title-line drive-summary-title-line-priority">
            <span class="drive-summary-title">${escapeHtml(driveTitle)}</span>
          </div>
        </div>
        <div class="drive-summary-priority-row drive-summary-priority-row-top">${priorityHtml}</div>
        <div class="drive-summary-date">${escapeHtml(formatDate(schedule.startDate))} – ${escapeHtml(formatDate(schedule.endDate))}</div>
      </div>
      <div class="drive-summary-secondary-grid">${secondaryHtml}</div>`;
    box.classList.remove("hidden");
  }
  async function loadPledgeDriveSummary() {
    const box = document.getElementById("pledgeDriveSummary");
    if (!box) return;
    renderDriveSummaryStatus("Checking current pledge drive totals…");
    try {
      const cfg = await loadPledgeConfig();
      const rows = await restSelect(cfg, "/rest/v1/pledge_fundraiser_schedules?select=*&order=start_date.asc&order=title.asc");
      const schedules = sortSchedulesNewestFirst((Array.isArray(rows) ? rows : []).map(normalizeSchedule));
      renderDriveSummary(schedules.find((schedule) => scheduleDriveSummaryWindow(schedule).show) || null);
    } catch (error) {
      console.warn("WNMU Home pledge drive summary failed.", error);
      renderDriveSummaryStatus("Pledge drive snapshot could not load here. Open the Pledge Library / Scheduler for the full current view.", "error");
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
    return `<ul class="${className}">${entries.map((entry) => {
      const tooltip = entry._description ? [entry._libraryTitle || "", entry._description].filter(Boolean).join("\n\n") : "";
      const descriptionAttr = tooltip ? ` title="${escapeHtml(tooltip)}" aria-label="${escapeHtml(`${entry.title}. ${tooltip}`)}"` : "";
      const titleClass = `schedule-program-title${entry._description ? " has-library-description" : ""}`;
      const tagsHtml = entry._tags?.length ? `<span class="schedule-tag-row-inline">${entry._tags.map((tag) => `<span class="schedule-feature-tag">${escapeHtml(tag)}</span>`).join("")}</span>` : "";
      const metaHtml = entry._meta ? `<span class="schedule-program-meta-text">${escapeHtml(entry._meta)}</span>` : "";
      const combinedMeta = tagsHtml || metaHtml ? `<div class="schedule-program-meta schedule-program-meta-line">${tagsHtml}${metaHtml}</div>` : "";
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
  function renderHomeScheduleSummary(payload) {
    const box = document.getElementById("homeScheduleSummary");
    if (!box) return;
    if (!payload) { box.classList.add("hidden"); box.innerHTML = ""; return; }

    const highlightLabel = `${formatMonthLabel(payload.todayMonthKey)} and ${formatMonthLabel(payload.nextMonthKey)}`;
    const todayEmpty = payload.todayRow
      ? "No prime time listings are scheduled today."
      : "No 13.1 listings are available for today.";
    const tomorrowEmpty = payload.tomorrowRow
      ? "No prime time listings are scheduled tomorrow."
      : "No 13.1 listings are available for tomorrow.";
    const todayPrimeHtml = payload.todayPrimeTime.length ? renderScheduleList(payload.todayPrimeTime) : `<div class="schedule-empty">${escapeHtml(todayEmpty)}</div>`;
    const tomorrowPrimeHtml = payload.tomorrowPrimeTime.length ? renderScheduleList(payload.tomorrowPrimeTime) : `<div class="schedule-empty">${escapeHtml(tomorrowEmpty)}</div>`;
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
          <section class="schedule-block schedule-block-prime">
            <h3>Prime time today</h3>
            ${todayPrimeHtml}
          </section>
          <section class="schedule-block schedule-block-prime">
            <h3>Prime time tomorrow</h3>
            ${tomorrowPrimeHtml}
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
      const tomorrowKey = plusDays(todayKey, 1);
      const todayMonthKey = monthKeyFromDateKey(todayKey);
      const tomorrowMonthKey = monthKeyFromDateKey(tomorrowKey);
      const nextHighlightMonthKey = nextMonthKey(todayMonthKey);

      const monthRows = new Map();
      for (const monthKey of [todayMonthKey, tomorrowMonthKey, nextHighlightMonthKey].filter(Boolean)) {
        if (!monthRows.has(monthKey)) monthRows.set(monthKey, await getMonthlyScheduleRowOrNull(cfg, monthKey));
      }

      const todayRow = monthRows.get(todayMonthKey) || null;
      const tomorrowRow = monthRows.get(tomorrowMonthKey) || null;
      const nextHighlightRow = monthRows.get(nextHighlightMonthKey) || null;
      if (!todayRow && !tomorrowRow && !nextHighlightRow) throw new Error("No imported monthly schedule is available.");

      const entriesByMonth = new Map();
      for (const [monthKey, row] of monthRows.entries()) {
        entriesByMonth.set(monthKey, row ? entriesFromSchedule(normalizeMonthlySchedule(row.schedule_json || {})) : []);
      }

      const sharedMarksByMonth = new Map();
      for (const [monthKey, row] of monthRows.entries()) {
        if (row) sharedMarksByMonth.set(monthKey, await getMonthlyMarks(cfg, row));
      }

      const descriptionIndex = await descriptionIndexPromise;
      const todayEntries = entriesByMonth.get(todayMonthKey) || [];
      const tomorrowEntries = entriesByMonth.get(tomorrowMonthKey) || [];
      const todayMarks = sharedMarksByMonth.get(todayMonthKey) || new Map();
      const tomorrowMarks = sharedMarksByMonth.get(tomorrowMonthKey) || new Map();
      const todayPrimeTime = todayEntries
        .filter((entry) => entry.date === todayKey && entryOverlapsWindow(entry, PRIME_START, PRIME_END))
        .map((entry) => decorateScheduleEntry(entry, todayMarks, formatTime(entry.time), descriptionIndex));
      const tomorrowPrimeTime = tomorrowEntries
        .filter((entry) => entry.date === tomorrowKey && entryOverlapsWindow(entry, PRIME_START, PRIME_END))
        .map((entry) => decorateScheduleEntry(entry, tomorrowMarks, formatTime(entry.time), descriptionIndex));

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

      renderHomeScheduleSummary({ todayRow, tomorrowRow, todayMonthKey, nextMonthKey: nextHighlightMonthKey, todayKey, tomorrowKey, todayPrimeTime, tomorrowPrimeTime, highlights });
    } catch (error) {
      console.warn("WNMU Home schedule summary failed.", error);
      renderHomeScheduleSummary(null);
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
    void loadHomeScheduleSummary();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
