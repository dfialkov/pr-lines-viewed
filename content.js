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

// Per-file state: path -> { linesChanged, viewed }
let fileStats = new Map();
// Lookup: pathDigest -> path (to resolve diff anchors to file paths)
let digestToPath = new Map();
let totalLines = 0;

function loadInitialState() {
  const summaries = getEmbeddedData();
  if (!summaries) return false;

  fileStats = new Map();
  digestToPath = new Map();
  totalLines = 0;

  for (const file of summaries) {
    fileStats.set(file.path, {
      linesChanged: file.linesChanged,
      viewed: file.markedAsViewed,
    });
    digestToPath.set(file.pathDigest, file.path);
    totalLines += file.linesChanged;
  }

  return true;
}

function getViewedLines() {
  let viewed = 0;
  for (const file of fileStats.values()) {
    if (file.viewed) viewed += file.linesChanged;
  }
  return viewed;
}

function renderIndicator(container) {
  const viewed = getViewedLines();
  const fraction = totalLines > 0 ? viewed / totalLines : 0;
  const circumference = 38;
  const dashoffset = circumference * (1 - fraction);

  container.title = `Lines viewed: ${viewed} / ${totalLines}`;
  container.innerHTML = `
    <svg data-circumference="${circumference}" height="16" width="16" role="presentation" style="transform: rotate(-90deg);">
      <circle cx="50%" cy="50%" fill="transparent" r="6"
        stroke="var(--borderColor-default, var(--color-border-default))"
        stroke-width="2"></circle>
      <circle cx="50%" cy="50%" fill="transparent" r="6"
        stroke="#1a7f37"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${dashoffset}"
        stroke-linecap="round"
        stroke-width="2"
        style="transition: stroke-dashoffset 0.35s;"></circle>
    </svg>
    <span class="ml-1" style="font-size: 12px; white-space: nowrap;">
      <span style="font-weight:600">${viewed}</span> /
      <span style="font-weight:600">${totalLines}</span>
      <span style="color:var(--fgColor-muted, var(--color-fg-muted))">lines</span>
    </span>
  `;
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

  renderIndicator(container);

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
  if (container) renderIndicator(container);
});

const observer = new MutationObserver(() => {
  if (!document.getElementById("glv-lines-viewed")) {
    injectLinesViewed();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
injectLinesViewed();
