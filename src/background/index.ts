// Internal types for traffic monitoring
interface TrafficData {
  bytesReceived: number;
  bytesSent: number;
  timestamp: number;
  tabId: number;
}

interface TabTraffic {
  [tabId: number]: {
    url: string;
    title: string;
    currentSpeed: number; // bytes per second
    totalBytes: number; // total bytes transferred
    lastUpdate: number; // timestamp
    trafficData: TrafficData[];
  };
}

// Store traffic data for each tab
const tabTraffic: TabTraffic = {};

// Utility function to convert bytes to human readable format
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

// Calculate badge color based on speed
function getColorForSpeed(bytesPerSecond: number): [number, number, number] {
  const LOW_THRESHOLD = 50 * 1024; // 50KB/s
  const HIGH_THRESHOLD = 1024 * 1024; // 1MB/s

  if (bytesPerSecond <= LOW_THRESHOLD) {
    const ratio = bytesPerSecond / LOW_THRESHOLD;
    return [Math.floor(255 * ratio), 255, 0];
  } else if (bytesPerSecond <= HIGH_THRESHOLD) {
    const ratio =
      (bytesPerSecond - LOW_THRESHOLD) / (HIGH_THRESHOLD - LOW_THRESHOLD);
    return [255, Math.floor(255 * (1 - ratio)), 0];
  }
  return [255, 0, 0];
}

// Update tab information
async function updateTabInfo(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tabTraffic[tabId]) {
      tabTraffic[tabId].url = tab.url || "";
      tabTraffic[tabId].title = tab.title || "";
    }
  } catch (error) {
    console.error("Error updating tab info:", error);
  }
}

// Initialize tab monitoring
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.id) {
    tabTraffic[tab.id] = {
      url: tab.url || "",
      title: tab.title || "",
      currentSpeed: 0,
      totalBytes: 0,
      lastUpdate: Date.now(),
      trafficData: [],
    };
  }
});

// Update tab information when URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.title) {
    updateTabInfo(tabId);
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabTraffic[tabId];
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, __sender, sendResponse) => {
  if (request.type === "GET_TAB_TRAFFIC") {
    const sortedTabs = Object.entries(tabTraffic)
      .map(([tabId, data]) => ({
        tabId: parseInt(tabId),
        ...data,
      }))
      .sort((a, b) => b.totalBytes - a.totalBytes);

    sendResponse(sortedTabs);
  }
  return true;
});

// Monitor network requests
chrome.webRequest.onCompleted.addListener(
  (details) => {
    const { tabId, timeStamp } = details;

    if (tabId === -1) return; // Ignore non-tab requests

    // Initialize tab data if not exists
    if (!tabTraffic[tabId]) {
      tabTraffic[tabId] = {
        url: "",
        title: "",
        currentSpeed: 0,
        totalBytes: 0,
        lastUpdate: timeStamp,
        trafficData: [],
      };
      updateTabInfo(tabId);
    }

    // Calculate received bytes
    const contentLengthHeader = details.responseHeaders?.find(
      (h) => h.name.toLowerCase() === "content-length"
    );
    const bytesReceived = contentLengthHeader?.value
      ? parseInt(contentLengthHeader.value, 10)
      : 0;

    // Add traffic data
    tabTraffic[tabId].trafficData.push({
      bytesReceived,
      bytesSent: 0,
      timestamp: timeStamp,
      tabId,
    });

    // Update total bytes and calculate current speed
    tabTraffic[tabId].totalBytes += bytesReceived;

    const oneSecondAgo = timeStamp - 1000;
    const recentTraffic = tabTraffic[tabId].trafficData
      .filter((t) => t.timestamp > oneSecondAgo)
      .reduce((sum, t) => sum + t.bytesReceived + t.bytesSent, 0);

    tabTraffic[tabId].currentSpeed = recentTraffic;

    // Update badge for current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id === tabId) {
        const formattedSpeed = formatBytes(recentTraffic) + "/s";
        const [r, g, b] = getColorForSpeed(recentTraffic);

        chrome.action.setBadgeText({ text: formattedSpeed });
        chrome.action.setBadgeBackgroundColor({
          color: `rgb(${r}, ${g}, ${b})`,
        });
      }
    });

    // Clean old data (keep last minute)
    tabTraffic[tabId].trafficData = tabTraffic[tabId].trafficData.filter(
      (t) => t.timestamp > timeStamp - 60000
    );
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);
