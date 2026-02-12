function getEmbeddedData() {
  const scripts = document.querySelectorAll('script[type="application/json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      const route = data?.payload?.pullRequestsChangesRoute;
      if (route?.diffSummaries) return route.diffSummaries;
    } catch {}
  }
  return null;
}

// Per-file state: path -> { linesAdded, linesDeleted, viewed }
let fileStats = new Map();
// Lookup: pathDigest -> path (to resolve diff anchors to file paths)
let digestToPath = new Map();
let totalAdded = 0;
let totalDeleted = 0;
let totalLines = 0;
let splitColors = true;

function loadInitialState() {
  const summaries = getEmbeddedData();
  if (!summaries) return false;

  fileStats = new Map();
  digestToPath = new Map();
  totalAdded = 0;
  totalDeleted = 0;
  totalLines = 0;

  for (const file of summaries) {
    fileStats.set(file.path, {
      linesAdded: file.linesAdded,
      linesDeleted: file.linesDeleted,
      viewed: file.markedAsViewed,
    });
    digestToPath.set(file.pathDigest, file.path);
    totalAdded += file.linesAdded;
    totalDeleted += file.linesDeleted;
    totalLines += file.linesChanged;
  }

  return true;
}

function getViewedStats() {
  let viewedAdded = 0;
  let viewedDeleted = 0;
  for (const file of fileStats.values()) {
    if (file.viewed) {
      viewedAdded += file.linesAdded;
      viewedDeleted += file.linesDeleted;
    }
  }
  return { viewedAdded, viewedDeleted, viewed: viewedAdded + viewedDeleted };
}

function computeOffsets(viewedAdded, viewedDeleted) {
  const circumference = 38;

  if (!splitColors) {
    const viewed = viewedAdded + viewedDeleted;
    const greenLen = totalLines > 0 ? (viewed / totalLines) * circumference : 0;
    return { greenOffset: circumference - greenLen, redOffset: circumference };
  }

  const addShare = totalLines > 0 ? (totalAdded / totalLines) * circumference : 0;
  const delShare = totalLines > 0 ? (totalDeleted / totalLines) * circumference : 0;

  const greenLen = totalAdded > 0 ? (viewedAdded / totalAdded) * addShare : 0;
  const redLen = totalDeleted > 0 ? (viewedDeleted / totalDeleted) * delShare : 0;

  return {
    greenOffset: circumference - greenLen,
    redOffset: circumference - redLen,
  };
}

function createIndicator(container) {
  const circumference = 38;
  const { viewedAdded, viewedDeleted, viewed } = getViewedStats();
  const { greenOffset, redOffset } = computeOffsets(viewedAdded, viewedDeleted);

  if (!splitColors) {
    container.title = `Lines viewed: ${viewed} / ${totalLines}`;
    container.innerHTML = `
      <svg data-circumference="${circumference}" height="16" width="16" role="presentation" style="transform: rotate(-90deg);">
        <circle cx="50%" cy="50%" fill="transparent" r="6"
          stroke="var(--borderColor-default, var(--color-border-default))"
          stroke-width="2"></circle>
        <circle data-glv="green" cx="50%" cy="50%" fill="transparent" r="6"
          stroke="#1a7f37"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${greenOffset}"
          stroke-linecap="butt"
          stroke-width="2"
          style="transition: stroke-dashoffset 0.35s;"></circle>
      </svg>
      <span class="ml-1" style="font-size: 12px; white-space: nowrap; font-variant-numeric: tabular-nums;">
        <span data-glv="viewed" style="font-weight:600"><span data-glv="zeros" style="color:var(--fgColor-muted, var(--color-fg-muted))">${"0".repeat(Math.max(0, String(totalLines).length - String(viewed).length))}</span>${viewed}</span> /
        <span style="font-weight:600">${totalLines}</span>
        <span style="color:var(--fgColor-muted, var(--color-fg-muted))">lines</span>
      </span>
    `;
    return;
  }

  const addShare = totalLines > 0 ? (totalAdded / totalLines) * circumference : 0;
  const showMarker = totalAdded > 0 && totalDeleted > 0;
  const markerWidth = 1;
  const meetingPos = addShare - markerWidth / 2;
  const markerOffset = circumference - meetingPos;

  container.title = `Lines viewed: ${viewed} / ${totalLines}\n+${viewedAdded} / +${totalAdded} additions\n-${viewedDeleted} / -${totalDeleted} deletions`;
  container.innerHTML = `
    <svg data-circumference="${circumference}" height="16" width="16" role="presentation" style="transform: rotate(-90deg);">
      <circle cx="50%" cy="50%" fill="transparent" r="6"
        stroke="var(--borderColor-default, var(--color-border-default))"
        stroke-width="2"></circle>
      <circle data-glv="green" cx="50%" cy="50%" fill="transparent" r="6"
        stroke="#1a7f37"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${greenOffset}"
        stroke-linecap="butt"
        stroke-width="2"
        style="transition: stroke-dashoffset 0.35s;"></circle>
      <circle data-glv="red" cx="50%" cy="50%" fill="transparent" r="6"
        stroke="#cf222e"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${redOffset}"
        stroke-linecap="butt"
        stroke-width="2"
        style="transition: stroke-dashoffset 0.35s; transform: scaleY(-1); transform-origin: center;"></circle>
      ${showMarker ? `<circle cx="50%" cy="50%" fill="transparent" r="6"
        stroke="white"
        stroke-dasharray="1 ${circumference - 1}"
        stroke-dashoffset="${markerOffset}"
        stroke-width="2"></circle>` : ""}
    </svg>
    <span class="ml-1" style="font-size: 12px; white-space: nowrap; font-variant-numeric: tabular-nums;">
      <span data-glv="viewed" style="font-weight:600"><span data-glv="zeros" style="color:var(--fgColor-muted, var(--color-fg-muted))">${"0".repeat(Math.max(0, String(totalLines).length - String(viewed).length))}</span>${viewed}</span> /
      <span style="font-weight:600">${totalLines}</span>
      <span style="color:var(--fgColor-muted, var(--color-fg-muted))">lines</span>
    </span>
  `;
}

function updateIndicator(container) {
  const { viewedAdded, viewedDeleted, viewed } = getViewedStats();
  const { greenOffset, redOffset } = computeOffsets(viewedAdded, viewedDeleted);

  container.querySelector('[data-glv="green"]').setAttribute("stroke-dashoffset", greenOffset);
  const redCircle = container.querySelector('[data-glv="red"]');
  if (redCircle) redCircle.setAttribute("stroke-dashoffset", redOffset);

  // Update text
  const viewedSpan = container.querySelector('[data-glv="viewed"]');
  const zerosSpan = container.querySelector('[data-glv="zeros"]');
  zerosSpan.textContent = "0".repeat(Math.max(0, String(totalLines).length - String(viewed).length));
  viewedSpan.lastChild.textContent = viewed;

  // Update tooltip
  if (splitColors) {
    container.title = `Lines viewed: ${viewed} / ${totalLines}\n+${viewedAdded} / +${totalAdded} additions\n-${viewedDeleted} / -${totalDeleted} deletions`;
  } else {
    container.title = `Lines viewed: ${viewed} / ${totalLines}`;
  }
}

function injectLinesViewed() {
  if (document.getElementById("glv-lines-viewed")) return true;

  const fileControls = document.querySelector(
    '[class*="PullRequestFilesToolbar-module__file-controls__"]'
  );
  if (!fileControls) return false;
  if (!loadInitialState()) return false;

  const container = document.createElement("div");
  container.id = "glv-lines-viewed";
  container.className = "d-flex flex-items-center";
  container.style.cssText =
    "display: flex; align-items: center; gap: 0px; cursor: help;";

  createIndicator(container);

  const existingDivider = document.querySelector(
    '[class*="PullRequestFilesToolbar-module__file-controls-divider__"]'
  );
  const divider = document.createElement("div");
  if (existingDivider) {
    divider.className = existingDivider.className;
  }

  fileControls.after(divider, container);
  return true;
}

// When a "Viewed" button is clicked, find the file via the outer diff container id
document.addEventListener("click", (e) => {
  const viewedBtn = e.target.closest('[class*="MarkAsViewedButton-module"]');
  if (!viewedBtn) return;

  // The outer diff container has id="diff-{digest}"
  const diffContainer = viewedBtn.closest('[id^="diff-"]');
  if (!diffContainer) return;

  const digest = diffContainer.id.replace("diff-", "");
  const path = digestToPath.get(digest);
  if (!path) return;

  const file = fileStats.get(path);
  if (!file) return;

  // Toggle local state (click always flips the current state)
  file.viewed = !file.viewed;

  const container = document.getElementById("glv-lines-viewed");
  if (container) updateIndicator(container);
});

// Listen for split-colors toggle from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.splitColors !== undefined) {
    splitColors = msg.splitColors;
    const container = document.getElementById("glv-lines-viewed");
    if (container) createIndicator(container);
  }
});

// Read persisted setting before first render
chrome.storage.sync.get({ splitColors: true }, (result) => {
  splitColors = result.splitColors;

  const observer = new MutationObserver(() => {
    if (!document.getElementById("glv-lines-viewed")) {
      injectLinesViewed();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  injectLinesViewed();
});
