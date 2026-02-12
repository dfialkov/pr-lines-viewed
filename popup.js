const checkbox = document.getElementById("splitColors");

chrome.storage.sync.get({ splitColors: true }, ({ splitColors }) => {
  checkbox.checked = splitColors;
});

checkbox.addEventListener("change", () => {
  const splitColors = checkbox.checked;
  chrome.storage.sync.set({ splitColors });
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { splitColors });
  });
});
