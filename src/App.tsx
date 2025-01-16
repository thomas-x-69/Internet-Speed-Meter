import { useEffect, useState } from "react";
import { Activity, Globe, ArrowDown } from "lucide-react";

// Types
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

interface TrafficResponse {
  tabs: TabTrafficInfo[];
  dailyTotal: number;
}

function App() {
  const [tabTraffic, setTabTraffic] = useState<TabTrafficInfo[]>([]);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<number | null>(null);

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

  function getSpeedColor(speed: number): string {
    const mbps = speed / (1024 * 1024); // Convert to MB/s
    if (mbps < 0.5) return "text-green-500";
    if (mbps < 2) return "text-yellow-500";
    return "text-red-500";
  }

  useEffect(() => {
    const fetchTrafficData = async () => {
      const response = (await chrome.runtime.sendMessage({
        type: "GET_TAB_TRAFFIC",
      })) as TrafficResponse;
      setTabTraffic(response.tabs);
      setDailyTotal(response.dailyTotal);
    };

    fetchTrafficData();
    const interval = setInterval(fetchTrafficData, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto p-4">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-6 h-6 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-900">
                Internet Speed Meter
              </h1>
            </div>
            <div className="text-sm text-gray-500">
              Today's Total: {formatBytes(dailyTotal)}
            </div>
          </div>

          {/* Total Stats */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <ArrowDown className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">Current Speed</span>
              </div>
              <div className="mt-2 text-lg font-semibold text-blue-600">
                {formatBytes(
                  tabTraffic.reduce((sum, tab) => sum + tab.currentSpeed, 0)
                )}
                /s
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-600">Active Tabs</span>
              </div>
              <div className="mt-2 text-lg font-semibold text-purple-600">
                {tabTraffic.length}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs List */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700">Active Tabs</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {tabTraffic.map((tab) => (
              <div
                key={tab.tabId}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() =>
                  setActiveTab(activeTab === tab.tabId ? null : tab.tabId)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {tab.title || "Unnamed Tab"}
                    </h3>
                    <div className="flex items-center mt-1">
                      <Globe className="w-3 h-3 text-gray-400 mr-1" />
                      <p className="text-xs text-gray-500 truncate">
                        {formatUrl(tab.url)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div
                      className={`text-sm font-medium ${getSpeedColor(
                        tab.currentSpeed
                      )}`}
                    >
                      {formatBytes(tab.currentSpeed)}/s
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Total: {formatBytes(tab.totalBytes)}
                    </p>
                  </div>
                </div>

                {/* Expanded View */}
                {activeTab === tab.tabId && (
                  <div className="mt-4 pl-4 border-l-2 border-blue-200 space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500">
                          Current Speed
                        </div>
                        <div className="text-sm font-medium">
                          {formatBytes(tab.currentSpeed)}/s
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500">Total Data</div>
                        <div className="text-sm font-medium">
                          {formatBytes(tab.totalBytes)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {tabTraffic.length === 0 && (
              <div className="p-8 text-center">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  No active tabs with traffic data
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Start browsing to see internet usage
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Daily Usage Summary */}
        <div className="mt-4 bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-700">
              Daily Summary
            </h2>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString()}
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">
                  Total Data Used Today
                </div>
                <div className="text-xl font-bold text-blue-600 mt-1">
                  {formatBytes(dailyTotal)}
                </div>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
