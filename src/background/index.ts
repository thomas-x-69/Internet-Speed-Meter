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

interface DailyTraffic {
  date: string;
  totalBytes: number;
}

// Store traffic data for each tab
const tabTraffic: TabTraffic = {};

// Get today's date as YYYY-MM-DD
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Promisified storage get
function getStorageData(key: string): Promise<any> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key]);
    });
  });
}

// Promisified storage set
function setStorageData(key: string, value: any): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => {
      resolve();
    });
  });
}

// Initialize or get daily total
async function initializeDailyTotal(): Promise<DailyTraffic> {
  try {
    const today = getTodayDate();
    const dailyTraffic = (await getStorageData("dailyTraffic")) as DailyTraffic;

    if (!dailyTraffic || dailyTraffic.date !== today) {
      const newDailyTraffic = { date: today, totalBytes: 0 };
      await setStorageData("dailyTraffic", newDailyTraffic);
      return newDailyTraffic;
    }

    return dailyTraffic;
  } catch (error) {
    console.error("Error initializing daily total:", error);
    return { date: getTodayDate(), totalBytes: 0 };
  }
}

// Update daily total
async function updateDailyTotal(additionalBytes: number): Promise<void> {
  try {
    const dailyTraffic = await initializeDailyTotal();
    dailyTraffic.totalBytes += additionalBytes;
    await setStorageData("dailyTraffic", dailyTraffic);
  } catch (error) {
    console.error("Error updating daily total:", error);
  }
}

// Initialize extension data
chrome.runtime.onInstalled.addListener(() => {
  initializeDailyTotal().catch(console.error);
});

// Utility functions remain the same
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function getColorForSpeed(bytesPerSecond: number): [number, number, number] {
  const LOW_THRESHOLD = 50 * 1024;
  const HIGH_THRESHOLD = 1024 * 1024;

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

// Handle tab management
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.title) {
    updateTabInfo(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabTraffic[tabId];
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "GET_TAB_TRAFFIC") {
    getStorageData("dailyTraffic").then((dailyTraffic: DailyTraffic) => {
      const currentDailyTraffic = dailyTraffic || {
        date: getTodayDate(),
        totalBytes: 0,
      };
      const sortedTabs = Object.entries(tabTraffic)
        .map(([tabId, data]) => ({
          tabId: parseInt(tabId),
          ...data,
        }))
        .sort((a, b) => b.totalBytes - a.totalBytes);

      sendResponse({
        tabs: sortedTabs,
        dailyTotal: currentDailyTraffic.totalBytes,
      });
    });
    return true; // Required to use sendResponse asynchronously
  }
});

// Monitor network requests
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    const { tabId, timeStamp } = details;

    if (tabId === -1) return;

    if (!tabTraffic[tabId]) {
      tabTraffic[tabId] = {
        url: "",
        title: "",
        currentSpeed: 0,
        totalBytes: 0,
        lastUpdate: timeStamp,
        trafficData: [],
      };
      await updateTabInfo(tabId);
    }

    const contentLengthHeader = details.responseHeaders?.find(
      (h) => h.name.toLowerCase() === "content-length"
    );
    const bytesReceived = contentLengthHeader?.value
      ? parseInt(contentLengthHeader.value, 10)
      : 0;

    await updateDailyTotal(bytesReceived);

    tabTraffic[tabId].trafficData.push({
      bytesReceived,
      bytesSent: 0,
      timestamp: timeStamp,
      tabId,
    });

    tabTraffic[tabId].totalBytes += bytesReceived;

    const oneSecondAgo = timeStamp - 1000;
    const recentTraffic = tabTraffic[tabId].trafficData
      .filter((t) => t.timestamp > oneSecondAgo)
      .reduce((sum, t) => sum + t.bytesReceived + t.bytesSent, 0);

    tabTraffic[tabId].currentSpeed = recentTraffic;

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

    tabTraffic[tabId].trafficData = tabTraffic[tabId].trafficData.filter(
      (t) => t.timestamp > timeStamp - 60000
    );
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);
