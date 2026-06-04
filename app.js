(() => {
  "use strict";
  const PORTAL_VERSION = "v1.0.0-r2026-06-04";
  const OWNER_PAGES_ROOT = "https://tpoirier1969.github.io";
  const apps = [
    {
      title: "Programming Library",
      description: "The main program/title library: rights, NOLA codes, topics, lengths, availability, and title reference work.",
      url: `${OWNER_PAGES_ROOT}/WNMU-Programming-library/`,
      accent: "#315f8c",
      tagBg: "#e4eef8",
      tagText: "#315f8c",
      tags: ["Programs", "Rights", "Topics"]
    },
    {
      title: "Pledge Library / Scheduler",
      description: "Fundraiser planning, pledge program scheduling, exact fundraiser placements, and pledge-drive work.",
      url: `${OWNER_PAGES_ROOT}/WNMU-Fundraising-library-and-data/`,
      accent: "#376d5c",
      tagBg: "#e4f1ed",
      tagText: "#376d5c",
      tags: ["Pledge", "Scheduler", "Fundraising"]
    },
    {
      title: "Monthly Schedules",
      description: "Monthly schedule imports, channel schedule views, title cleanup, and schedule review.",
      url: `${OWNER_PAGES_ROOT}/WNMU-monthly-schedules/`,
      accent: "#62517e",
      tagBg: "#ece7f4",
      tagText: "#62517e",
      tags: ["Monthly", "Channels", "Cleanup"]
    },
    {
      title: "Monthly Sales View",
      description: "Sales-category view built from the monthly schedule, with fundraiser slots pulled from exact pledge schedule placements.",
      url: `${OWNER_PAGES_ROOT}/WNMU-monthly-schedules/sales-export.v1.5.72.html`,
      fallbackUrl: `${OWNER_PAGES_ROOT}/WNMU-monthly-schedules/`,
      accent: "#7a612a",
      tagBg: "#f5ecd4",
      tagText: "#7a612a",
      tags: ["Sales", "Categories", "Export"]
    }
  ];

  function renderAppCard(app) {
    const card = document.createElement("article");
    card.className = "app-card";
    card.style.setProperty("--accent", app.accent);
    card.style.setProperty("--tag-bg", app.tagBg);
    card.style.setProperty("--tag-text", app.tagText);

    const heading = document.createElement("h2");
    heading.textContent = app.title;

    const description = document.createElement("p");
    description.textContent = app.description;

    const meta = document.createElement("div");
    meta.className = "app-card__meta";
    app.tags.forEach((label) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = label;
      meta.appendChild(tag);
    });

    const actions = document.createElement("div");
    actions.className = "app-actions";

    const open = document.createElement("a");
    open.className = "button";
    open.href = app.url;
    open.textContent = "Open";
    open.setAttribute("aria-label", `Open ${app.title}`);
    actions.appendChild(open);

    if (app.fallbackUrl) {
      const fallback = document.createElement("a");
      fallback.className = "button secondary";
      fallback.href = app.fallbackUrl;
      fallback.textContent = "Open app home";
      fallback.setAttribute("aria-label", `Open ${app.title} home page`);
      actions.appendChild(fallback);
    }

    card.append(heading, description, meta, actions);
    return card;
  }

  function init() {
    const grid = document.querySelector("[data-app-grid]");
    if (!grid) return;
    grid.textContent = "";
    apps.forEach((app) => grid.appendChild(renderAppCard(app)));
    document.title = `WNMU Home • ${PORTAL_VERSION}`;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
