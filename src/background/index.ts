// Types for our traffic monitoring
interface TrafficData {
  bytesReceived: number;
  bytesSent: number;
  timestamp: number;
  tabId: number;
}

interface TabTraffic {
  [tabId: number]: {
    currentSpeed: number; // bytes per second
    lastUpdate: number; // timestamp
    trafficData: TrafficData[];
  };
}

// Store traffic data for each tab
const tabTraffic: TabTraffic = {};

// Convert bytes to human readable format
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

// Calculate color based on speed (bytes per second)
function getColorForSpeed(bytesPerSecond: number): [number, number, number] {
  // Define thresholds in bytes per second
  const LOW_THRESHOLD = 50 * 1024; // 50KB/s
  const HIGH_THRESHOLD = 1024 * 1024; // 1MB/s

  if (bytesPerSecond <= LOW_THRESHOLD) {
    // Green to Yellow
    const ratio = bytesPerSecond / LOW_THRESHOLD;
    return [Math.floor(255 * ratio), 255, 0];
  } else if (bytesPerSecond <= HIGH_THRESHOLD) {
    // Yellow to Red
    const ratio =
      (bytesPerSecond - LOW_THRESHOLD) / (HIGH_THRESHOLD - LOW_THRESHOLD);
    return [255, Math.floor(255 * (1 - ratio)), 0];
  }
  // Red for high speeds
  return [255, 0, 0];
}

// Initialize tab monitoring
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) {
    tabTraffic[tab.id] = {
      currentSpeed: 0,
      lastUpdate: Date.now(),
      trafficData: [],
    };
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabTraffic[tabId];
});

// Monitor network requests
chrome.webRequest.onCompleted.addListener(
  (details) => {
    const { tabId, timeStamp } = details;

    if (tabId === -1) return; // Ignore non-tab requests

    // Initialize tab data if not exists
    if (!tabTraffic[tabId]) {
      tabTraffic[tabId] = {
        currentSpeed: 0,
        lastUpdate: timeStamp,
        trafficData: [],
      };
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
      bytesSent: 0, // We'll implement this later
      timestamp: timeStamp,
      tabId,
    });

    // Calculate current speed (last second)
    const now = timeStamp;
    const oneSecondAgo = now - 1000;

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
