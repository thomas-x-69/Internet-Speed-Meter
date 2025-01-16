import { useEffect, useState } from "react";

// Types for component
interface TrafficData {
  bytesReceived: number;
  bytesSent: number;
  timestamp: number;
  tabId: number;
}

interface TabTrafficInfo {
  tabId: number;
  url: string;
  title: string;
  currentSpeed: number;
  totalBytes: number;
  lastUpdate: number;
  trafficData: TrafficData[];
}

function App() {
  const [tabTraffic, setTabTraffic] = useState<TabTrafficInfo[]>([]);

  // Utility functions
  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  function formatUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  useEffect(() => {
    // Function to fetch traffic data
    const fetchTrafficData = async () => {
      const data = await chrome.runtime.sendMessage({
        type: "GET_TAB_TRAFFIC",
      });
      setTabTraffic(data);
    };

    // Fetch initial data and set up polling
    fetchTrafficData();
    const interval = setInterval(fetchTrafficData, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-center mb-6">
          Internet Speed Meter
        </h1>

        <div className="bg-white rounded-lg shadow">
          <div className="divide-y divide-gray-200">
            {tabTraffic.map((tab) => (
              <div key={tab.tabId} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-medium text-gray-900 truncate">
                      {tab.title || "Unnamed Tab"}
                    </h2>
                    <p className="text-sm text-gray-500 truncate">
                      {formatUrl(tab.url)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      {formatBytes(tab.currentSpeed)}/s
                    </p>
                    <p className="text-sm text-gray-500">
                      Total: {formatBytes(tab.totalBytes)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {tabTraffic.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No active tabs with traffic data
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
